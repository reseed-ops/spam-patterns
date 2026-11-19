// Pattern tiers, computed from the live table on every request, so a
// deletion recomputes counts and eligibility immediately.
//
// Eligible report: still present (not deleted) and counted (not a
// short-window duplicate of the same sender token + same template).
//
// Three tiers, three public labels, never merged:
//   exact   -> "identical message"               same canonical masked template
//   near    -> "same message, lightly edited"    MinHash similarity >= NEAR_THRESHOLD
//                                                to the cluster's first report (no chaining)
//   formula -> "shared script pattern"           same slot skeleton (grammar v1),
//                                                skeleton not on the stop list
// A group is computed only with PATTERN_THRESHOLD or more eligible reports.
// A group whose membership is identical to a higher tier's group is not
// listed twice. Membership is never published, only aggregate counts.
//
// Computing a group does NOT publish it. Reaching the threshold is a review
// trigger: a computed group stays pending until an operator publishes it
// (src/review.ts). computePatterns() returns every computed group and is for
// internal and operator use; public views go through publicPatterns().

import { CATEGORY_LABEL } from './categories.ts';
import type { DB } from './db.ts';
import { sha256hex, type Keys } from './crypto.ts';
import {
  NEAR_THRESHOLD,
  SKELETON_GRAMMAR_VERSION,
  isStopSkeleton,
  renderSkeletonExample,
  similarity,
} from './skeleton.ts';

export const PATTERN_THRESHOLD = 3;

/**
 * Matching rules version: the three tiers, the eligibility rule, the
 * threshold, the near-duplicate settings and skeleton grammar v1. Bump it
 * when matching behavior changes (docs/rules-changelog.md). Review
 * fingerprints include it, so a bump returns every pattern to review.
 */
export const MATCHING_RULES_VERSION = 'v1';

export type Tier = 'exact' | 'near' | 'formula';
export const TIER_LABEL: Record<Tier, string> = {
  exact: 'identical message',
  near: 'same message, lightly edited',
  formula: 'shared script pattern',
};
export const TIER_ORDER: Tier[] = ['exact', 'near', 'formula'];

export interface Pattern {
  id: string;
  tier: Tier;
  label: string;
  count: number;
  firstDay: string;
  latestDay: string;
  categories: Array<{ label: string; count: number }>;
  distinctAreaCodes: number;
  skeleton: string | null;
  example: string | null;
  grammarVersion: string;
  /** Internal: number of distinct masked templates in the group. Never rendered. */
  templateCount: number;
  /** Internal: hash of the matching rules version and the set of template hashes. Never rendered. */
  fingerprint: string;
}

export interface PatternCluster {
  pattern: Pattern;
  /** Internal report IDs, for the operator CLI only. Never rendered. */
  memberIds: string[];
}

/** Membership fingerprint: the matching rules version plus the sorted set of distinct template hashes. */
export function membershipFingerprint(templateHashes: Iterable<string>): string {
  return sha256hex(`membership-v1:${MATCHING_RULES_VERSION}:${[...new Set(templateHashes)].sort().join(',')}`);
}

interface Row {
  id: string;
  created_at: string;
  created_day: string;
  area_code: string;
  category: string;
  template_hash: string;
  skeleton: string | null;
  minhash: string;
}

function eligibleRows(db: DB): Row[] {
  return db
    .prepare(
      `SELECT id, created_at, created_day, area_code, category, template_hash, skeleton, minhash
       FROM reports WHERE counted = 1 AND skeleton_version = ? ORDER BY created_at, id`,
    )
    .all(SKELETON_GRAMMAR_VERSION) as unknown as Row[];
}

function patternId(keys: Keys, tier: Tier, groupKey: string): string {
  // Opaque and deployment-specific: reveals nothing about the template.
  return `${tier[0]}${SKELETON_GRAMMAR_VERSION}-${keys.mac('pattern-id-v1', `${tier}:${groupKey}`).toString('hex').slice(0, 12)}`;
}

function summarize(keys: Keys, tier: Tier, key: string, rows: Row[]): PatternCluster {
  const days = rows.map((r) => r.created_day).sort();
  const cats = new Map<string, number>();
  for (const r of rows) cats.set(r.category, (cats.get(r.category) ?? 0) + 1);
  const skels = new Set(rows.map((r) => r.skeleton));
  const skeleton = skels.size === 1 ? (rows[0]!.skeleton ?? null) : null;
  const pattern: Pattern = {
    id: patternId(keys, tier, key),
    tier,
    label: TIER_LABEL[tier],
    count: rows.length,
    firstDay: days[0]!,
    latestDay: days[days.length - 1]!,
    categories: [...cats.entries()]
      .map(([c, n]) => ({ label: CATEGORY_LABEL[c] ?? c, count: n }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    distinctAreaCodes: new Set(rows.map((r) => r.area_code)).size,
    skeleton,
    example: skeleton ? renderSkeletonExample(skeleton) : null,
    grammarVersion: SKELETON_GRAMMAR_VERSION,
    templateCount: new Set(rows.map((r) => r.template_hash)).size,
    fingerprint: membershipFingerprint(rows.map((r) => r.template_hash)),
  };
  return { pattern, memberIds: rows.map((r) => r.id) };
}

/** Statuses that keep a pattern out of public views: under review, or takedown upheld. */
export const HIDING_FLAG_STATUSES = ['open', 'upheld'] as const;

/** Pattern ID inside a flag target (a bare ID or any URL that contains one). */
export function flagTargetPatternId(target: string): string | null {
  return /\b([enf]v\d+-[0-9a-f]{12})\b/.exec(target)?.[1] ?? null;
}

/** Pattern IDs (or raw targets) kept out of public views by an open or upheld flag. */
export function flagHiddenIds(db: DB): Set<string> {
  return new Set(
    (db.prepare(`SELECT target FROM flags WHERE status IN (${HIDING_FLAG_STATUSES.map(() => '?').join(', ')})`).all(...HIDING_FLAG_STATUSES) as Array<{ target: string }>)
      .map((f) => flagTargetPatternId(f.target) ?? f.target.trim()),
  );
}

/** Every computed group (pending, published or rejected). Not for public views: use publicPatterns(). */
export function computePatterns(db: DB, keys: Keys, opts: { includeFlagged?: boolean } = {}): Pattern[] {
  return computeClusters(db, keys, opts).map((c) => c.pattern);
}

export function computeClusters(db: DB, keys: Keys, opts: { includeFlagged?: boolean } = {}): PatternCluster[] {
  const rows = eligibleRows(db);
  const out: PatternCluster[] = [];
  const listedSets = new Set<string>();
  const setKey = (rs: Row[]) => rs.map((r) => r.id).sort().join(',');

  // exact
  const exact = new Map<string, Row[]>();
  for (const r of rows) exact.set(r.template_hash, [...(exact.get(r.template_hash) ?? []), r]);
  for (const [k, rs] of exact) {
    if (rs.length >= PATTERN_THRESHOLD) {
      out.push(summarize(keys, 'exact', k, rs));
      listedSets.add(setKey(rs));
    }
  }

  // near: leader clustering in filing order, compared to the leader only
  const sigs = new Map(rows.map((r) => [r.id, JSON.parse(r.minhash) as number[]]));
  const leaders: Array<{ leader: Row; members: Row[] }> = [];
  for (const r of rows) {
    const sig = sigs.get(r.id)!;
    const home = leaders.find(
      (l) => l.leader.template_hash === r.template_hash || similarity(sigs.get(l.leader.id)!, sig) >= NEAR_THRESHOLD,
    );
    if (home) home.members.push(r);
    else leaders.push({ leader: r, members: [r] });
  }
  for (const l of leaders) {
    if (l.members.length < PATTERN_THRESHOLD) continue;
    if (new Set(l.members.map((m) => m.template_hash)).size < 2) continue; // that's the exact tier
    const k = setKey(l.members);
    if (listedSets.has(k)) continue;
    out.push(summarize(keys, 'near', l.leader.id, l.members));
    listedSets.add(k);
  }

  // formula
  const formula = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.skeleton || isStopSkeleton(r.skeleton)) continue;
    formula.set(r.skeleton, [...(formula.get(r.skeleton) ?? []), r]);
  }
  for (const [k, rs] of formula) {
    if (rs.length < PATTERN_THRESHOLD) continue;
    const sk = setKey(rs);
    if (listedSets.has(sk)) continue;
    out.push(summarize(keys, 'formula', k, rs));
    listedSets.add(sk);
  }

  // Contested material leaves public views while a flag is open.
  const flagged = opts.includeFlagged ? new Set<string>() : flagHiddenIds(db);
  return out
    .filter((c) => opts.includeFlagged || !flagged.has(c.pattern.id))
    .sort(
      ({ pattern: a }, { pattern: b }) =>
        TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || b.count - a.count || a.id.localeCompare(b.id),
    );
}

// ---------------- area-code counts (Overview) ----------------

export interface AreaCount {
  areaCode: string;
  count: number;
}

export function areaCodeCounts(db: DB, fromDay: string, toDay: string): AreaCount[] {
  return (
    db
      .prepare(
        `SELECT area_code AS areaCode, COUNT(*) AS count FROM reports
         WHERE counted = 1 AND created_day >= ? AND created_day <= ?
         GROUP BY area_code ORDER BY count DESC, area_code ASC`,
      )
      .all(fromDay, toDay) as Array<{ areaCode: string; count: number }>
  ).map((r) => ({ areaCode: r.areaCode, count: Number(r.count) }));
}
