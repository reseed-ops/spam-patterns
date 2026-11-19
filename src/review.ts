// Pattern review gate.
//
// Reaching PATTERN_THRESHOLD eligible reports is a review trigger, not
// publication. A computed pattern is PENDING until an operator publishes it
// (npm run flags -- publish <id>). Public views (home, /patterns, pattern
// detail, and any count of patterns) show only PUBLISHED patterns.
//
// A decision (published or rejected) is stored with the pattern's stable ID
// and a fingerprint of its membership: the matching rules version plus the
// sorted set of distinct template hashes in the group.
//
// "Material" membership change, precisely. A decision is reset to pending when
//   (a) the group's set of distinct template hashes differs from the reviewed
//       set (a template joined, or every report of a template left), or
//   (b) the group stops being computed at all (deletions took it below the
//       threshold, or its stable ID no longer exists), even if it later
//       returns with the same templates, or
//   (c) the matching rules version changes (it is part of the fingerprint).
// Not material: more or fewer reports of templates already in the reviewed
// set, as long as the group stays at or above the threshold throughout.
// Report counts and dates on a published pattern update live.
//
// reconcileReviews() enforces (a)-(c). It runs after every filing and
// deletion, at startup, on every public pattern read and in the CLI, so a
// group cannot drop out and come back between two checks. Individual reports
// are unaffected by any of this: totals, area-code views and the map count
// them exactly as before.

import type { DB } from './db.ts';
import type { Keys } from './crypto.ts';
import { computeClusters, flagHiddenIds, type Pattern, type PatternCluster } from './patterns.ts';

export type ReviewStatus = 'pending' | 'published' | 'rejected';

export interface ReviewRow {
  pattern_id: string;
  status: ReviewStatus;
  fingerprint: string;
  template_count: number;
  report_count: number;
  decided_day: string;
  note: string | null;
}

const today = (now = new Date()) => now.toISOString().slice(0, 10);

export function getReview(db: DB, id: string): ReviewRow | null {
  return (db.prepare('SELECT * FROM pattern_reviews WHERE pattern_id = ?').get(id) as ReviewRow | undefined) ?? null;
}

export function listReviews(db: DB): ReviewRow[] {
  return db.prepare('SELECT * FROM pattern_reviews ORDER BY decided_day, pattern_id').all() as unknown as ReviewRow[];
}

/** Current review state of a computed pattern. */
export function reviewStatus(p: Pattern, row: ReviewRow | null): ReviewStatus {
  if (!row || row.status === 'pending' || row.fingerprint !== p.fingerprint) return 'pending';
  return row.status;
}

/**
 * Reset decisions whose group changed materially. Uses every computed group,
 * flagged ones included (a private flag hides a pattern but is not a
 * membership change). Returns the number of decisions reset.
 */
export function reconcileReviews(db: DB, keys: Keys, clusters?: PatternCluster[], now = new Date()): number {
  const all = clusters ?? computeClusters(db, keys, { includeFlagged: true });
  const byId = new Map(all.map((c) => [c.pattern.id, c.pattern]));
  const decided = db.prepare("SELECT * FROM pattern_reviews WHERE status IN ('published','rejected')").all() as unknown as ReviewRow[];
  const reset = db.prepare("UPDATE pattern_reviews SET status = 'pending', decided_day = ?, note = ? WHERE pattern_id = ?");
  let n = 0;
  for (const r of decided) {
    const p = byId.get(r.pattern_id);
    const note = !p
      ? `was ${r.status}; the group fell below the threshold or no longer exists`
      : p.fingerprint !== r.fingerprint
        ? `was ${r.status}; its templates changed (${r.template_count} reviewed, ${p.templateCount} now)`
        : null;
    if (note) {
      reset.run(today(now), note, r.pattern_id);
      n++;
    }
  }
  return n;
}

/** Patterns visible to the public: computed, not hidden by a flag, published, membership unchanged. */
export function publicPatterns(db: DB, keys: Keys): Pattern[] {
  const all = computeClusters(db, keys, { includeFlagged: true });
  reconcileReviews(db, keys, all);
  const flagged = flagHiddenIds(db);
  return all
    .map((c) => c.pattern)
    .filter((p) => !flagged.has(p.id) && reviewStatus(p, getReview(db, p.id)) === 'published');
}

export interface ClusterWithStatus extends PatternCluster {
  status: ReviewStatus;
  review: ReviewRow | null;
}

/** Every computed group with its review state (operator use). */
export function reviewQueue(db: DB, keys: Keys): ClusterWithStatus[] {
  const all = computeClusters(db, keys, { includeFlagged: true });
  reconcileReviews(db, keys, all);
  return all.map((c) => {
    const review = getReview(db, c.pattern.id);
    return { ...c, review, status: reviewStatus(c.pattern, review) };
  });
}

export function decide(
  db: DB,
  keys: Keys,
  id: string,
  status: 'published' | 'rejected',
  now = new Date(),
): { ok: true; pattern: Pattern; previous: ReviewStatus } | { ok: false; error: string } {
  const c = reviewQueue(db, keys).find((x) => x.pattern.id === id);
  if (!c) return { ok: false, error: `No computed pattern with id ${id}. It may be below the threshold, deleted, or from a different key or rules version.` };
  if (c.status === status) return { ok: false, error: `Pattern ${id} is already ${status}.` };
  const p = c.pattern;
  db.prepare(
    `INSERT INTO pattern_reviews (pattern_id, status, fingerprint, template_count, report_count, decided_day, note)
     VALUES (?, ?, ?, ?, ?, ?, NULL)
     ON CONFLICT(pattern_id) DO UPDATE SET status = excluded.status, fingerprint = excluded.fingerprint,
       template_count = excluded.template_count, report_count = excluded.report_count,
       decided_day = excluded.decided_day, note = NULL`,
  ).run(id, status, p.fingerprint, p.templateCount, p.count, today(now));
  return { ok: true, pattern: p, previous: c.status };
}

/** Distinct scrubbed templates in a group with their report counts (operator CLI only). */
export function clusterTemplates(db: DB, memberIds: string[]): Array<{ template: string; count: number }> {
  if (memberIds.length === 0) return [];
  const rows = db
    .prepare(
      `SELECT MIN(template) AS template, COUNT(*) AS count FROM reports
       WHERE id IN (${memberIds.map(() => '?').join(', ')}) GROUP BY template_hash ORDER BY count DESC, template`,
    )
    .all(...memberIds) as Array<{ template: string; count: number }>;
  return rows.map((r) => ({ template: r.template, count: Number(r.count) }));
}
