// Maintainer CLI for private flags (contest / takedown without a receipt)
// and for pattern review (the publication gate, src/review.ts).
//
//   npm run flags                         list open flags
//   npm run flags -- list --all           list every flag, any status
//   npm run flags -- show <flag-id>       one flag, plus the pattern it affects
//   npm run flags -- resolve <flag-id> --restore   not upheld: pattern returns to public views
//   npm run flags -- resolve <flag-id> --uphold    upheld: pattern stays out of public views
//   npm run flags -- pending              pending patterns, with scrubbed templates and counts
//   npm run flags -- patterns             every computed pattern and its review state
//   npm run flags -- publish <pattern-id> publish a pending (or rejected) pattern
//   npm run flags -- reject <pattern-id>  reject: stays hidden while rejected and unchanged
//
// Production (Railway): the database is on the service volume, so run it
// inside the container from the deploy directory:
//   railway ssh -- node --disable-warning=ExperimentalWarning src/flags-cli.ts pending
// (`railway run` would run it on your machine, away from the volume.)
//
// In Docker: docker compose exec app node src/flags-cli.ts list
// Reads the same env as the app (STM_DATABASE_PATH, STM_HMAC_KEY). The key is
// needed because pattern IDs are keyed. Flag contents are private: this tool
// prints them to the maintainer's terminal only and never writes them anywhere.

import { loadConfig } from './config.ts';
import { Keys } from './crypto.ts';
import { openDb, type DB } from './db.ts';
import { computePatterns, flagHiddenIds, flagTargetPatternId, HIDING_FLAG_STATUSES, TIER_LABEL, type Pattern } from './patterns.ts';
import { clusterTemplates, decide, getReview, reviewQueue, reviewStatus, type ClusterWithStatus, type ReviewStatus } from './review.ts';

export type FlagStatus = 'open' | 'resolved' | 'upheld';

export interface FlagRow {
  id: string;
  created_day: string;
  reason: string;
  target: string;
  details: string;
  contact: string | null;
  status: FlagStatus;
}

export function listFlags(db: DB, all = false): FlagRow[] {
  const sql = `SELECT id, created_day, reason, target, details, contact, status FROM flags ${all ? '' : "WHERE status = 'open'"} ORDER BY created_day, id`;
  return db.prepare(sql).all() as unknown as FlagRow[];
}

export function getFlag(db: DB, id: string): FlagRow | null {
  return (db.prepare('SELECT id, created_day, reason, target, details, contact, status FROM flags WHERE id = ?').get(id) as FlagRow | undefined) ?? null;
}

/** The pattern a flag points at, computed with flagged patterns included. */
export function affectedPattern(db: DB, keys: Keys, flag: FlagRow): Pattern | null {
  const pid = flagTargetPatternId(flag.target);
  if (!pid) return null;
  return computePatterns(db, keys, { includeFlagged: true }).find((p) => p.id === pid) ?? null;
}

export function resolveFlag(db: DB, id: string, outcome: 'restore' | 'uphold'): { ok: true; status: FlagStatus } | { ok: false; error: string } {
  const f = getFlag(db, id);
  if (!f) return { ok: false, error: `No flag with id ${id}.` };
  if (f.status !== 'open') return { ok: false, error: `Flag ${id} is already ${f.status}.` };
  const status: FlagStatus = outcome === 'restore' ? 'resolved' : 'upheld';
  db.prepare('UPDATE flags SET status = ? WHERE id = ?').run(status, id);
  return { ok: true, status };
}

const one = (s: string, n = 80) => s.replace(/\s+/g, ' ').slice(0, n);

export function formatFlagList(rows: FlagRow[]): string {
  if (rows.length === 0) return 'No flags.\n';
  return (
    rows
      .map((f) => `${f.id}  ${f.created_day}  ${f.status.padEnd(8)}  ${f.reason.padEnd(22)}  ${flagTargetPatternId(f.target) ?? one(f.target, 40)}`)
      .join('\n') + `\n${rows.length} flag${rows.length === 1 ? '' : 's'}.\n`
  );
}

export function formatFlag(f: FlagRow, p: Pattern | null, review: ReviewStatus = 'published'): string {
  const lines = [
    `Flag ${f.id} (${f.status}), filed ${f.created_day}`,
    `Reason:  ${f.reason}`,
    `Target:  ${f.target}`,
    `Details: ${f.details || '(none)'}`,
    `Contact: ${f.contact ?? '(none)'}`,
    '',
  ];
  const pid = flagTargetPatternId(f.target);
  if (!pid) lines.push('Affected pattern: the target does not contain a pattern ID. Review the target by hand.');
  else if (!p) lines.push(`Affected pattern: ${pid} is not currently computed (below threshold, deleted reports, or a different key or grammar version).`);
  else {
    const hidden = (HIDING_FLAG_STATUSES as readonly string[]).includes(f.status) || review !== 'published';
    lines.push(
      `Affected pattern: ${p.id} (${p.label}), ${hidden ? 'hidden from public views' : 'visible in public views'} (review: ${review})`,
      `  Reports: ${p.count}, ${p.firstDay} to ${p.latestDay}, ${p.distinctAreaCodes} area code${p.distinctAreaCodes === 1 ? '' : 's'}`,
      `  Categories: ${p.categories.map((c) => `${c.label} ${c.count}`).join(', ')}`,
      `  Skeleton (${p.grammarVersion}): ${p.skeleton ?? '(mixed)'}`,
      `  Public example: ${p.example ?? '(none)'}`,
    );
  }
  return lines.join('\n') + '\n';
}

// ---------------- pattern review ----------------

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function formatCluster(db: DB, c: ClusterWithStatus, flagged: boolean): string {
  const p = c.pattern;
  const lines = [
    `${p.id}  ${c.status.toUpperCase()}${flagged ? ' (also hidden by a flag)' : ''}  ${TIER_LABEL[p.tier]}`,
    `  Reports: ${p.count} (${plural(p.templateCount, 'distinct template')}), ${p.firstDay} to ${p.latestDay}, ${plural(p.distinctAreaCodes, 'area code')}`,
    `  Categories: ${p.categories.map((x) => `${x.label} ${x.count}`).join(', ')}`,
    `  Skeleton (${p.grammarVersion}): ${p.skeleton ?? '(mixed)'}`,
  ];
  if (c.review?.note && c.status === 'pending') lines.push(`  Returned to review ${c.review.decided_day}: ${c.review.note}`);
  else if (c.review && c.status !== 'pending') lines.push(`  Decided ${c.review.decided_day}`);
  lines.push('  Scrubbed templates (private; check the match is real, nothing personal survived, and it does not single out a person or one business):');
  for (const t of clusterTemplates(db, c.memberIds)) lines.push(`    [${plural(t.count, 'report')}] ${t.template.replace(/\s+/g, ' ')}`);
  return lines.join('\n') + '\n';
}

export function formatQueue(db: DB, keys: Keys, which: 'pending' | 'all'): string {
  const q = reviewQueue(db, keys).filter((c) => which === 'all' || c.status === 'pending');
  if (q.length === 0) return which === 'pending' ? 'No pending patterns.\n' : 'No computed patterns.\n';
  const flagged = flagHiddenIds(db);
  return q.map((c) => formatCluster(db, c, flagged.has(c.pattern.id))).join('\n') + `\n${plural(q.length, which === 'pending' ? 'pending pattern' : 'pattern')}.\n`;
}

const USAGE = `usage:
  npm run flags                                   list open flags
  npm run flags -- list --all                     list all flags
  npm run flags -- show <flag-id>                 show a flag and the pattern it affects
  npm run flags -- resolve <flag-id> --restore    not upheld: the pattern returns to public views
  npm run flags -- resolve <flag-id> --uphold     upheld: the pattern stays out of public views
  npm run flags -- pending                        pending patterns with scrubbed templates and counts
  npm run flags -- patterns                       every computed pattern and its review state
  npm run flags -- publish <pattern-id>           publish: the pattern appears on the home page and /patterns
  npm run flags -- reject <pattern-id>            reject: hidden while it stays rejected and unchanged
`;

export function runCli(argv: string[], db: DB, keys: Keys): { code: number; out: string } {
  const [cmd = 'list', arg, ...rest] = argv;
  const flags = new Set([arg, ...rest].filter((a): a is string => !!a && a.startsWith('--')));
  switch (cmd) {
    case 'list':
      return { code: 0, out: formatFlagList(listFlags(db, flags.has('--all'))) };
    case 'show': {
      if (!arg) return { code: 2, out: USAGE };
      const f = getFlag(db, arg);
      if (!f) return { code: 1, out: `No flag with id ${arg}.\n` };
      const p = affectedPattern(db, keys, f);
      return { code: 0, out: formatFlag(f, p, p ? reviewStatus(p, getReview(db, p.id)) : 'pending') };
    }
    case 'resolve': {
      const restore = flags.has('--restore');
      const uphold = flags.has('--uphold');
      if (!arg || arg.startsWith('--') || restore === uphold) return { code: 2, out: USAGE };
      const r = resolveFlag(db, arg, restore ? 'restore' : 'uphold');
      if (!r.ok) return { code: 1, out: `${r.error}\n` };
      return {
        code: 0,
        out: `Flag ${arg} marked ${r.status}. ${r.status === 'resolved' ? 'The pattern returns to public views (if it still meets the threshold).' : 'The pattern stays out of public views.'}\n`,
      };
    }
    case 'pending':
      return { code: 0, out: formatQueue(db, keys, 'pending') };
    case 'patterns':
      return { code: 0, out: formatQueue(db, keys, 'all') };
    case 'publish':
    case 'reject': {
      if (!arg || arg.startsWith('--')) return { code: 2, out: USAGE };
      const r = decide(db, keys, arg, cmd === 'publish' ? 'published' : 'rejected');
      if (!r.ok) return { code: 1, out: `${r.error}\n` };
      const hiddenByFlag = flagHiddenIds(db).has(arg);
      return {
        code: 0,
        out:
          cmd === 'publish'
            ? `Pattern ${arg} published (was ${r.previous}; ${plural(r.pattern.count, 'report')}, ${plural(r.pattern.templateCount, 'template')}). ${hiddenByFlag ? 'It stays hidden while a flag on it is open or upheld.' : 'It now appears on the home page and /patterns.'} If its templates change or it falls below the threshold, it returns to review.\n`
            : `Pattern ${arg} rejected (was ${r.previous}). It stays out of public views while it remains rejected and its templates are unchanged.\n`,
      };
    }
    case 'help':
    case '--help':
    case '-h':
      return { code: 0, out: USAGE };
    default:
      return { code: 2, out: USAGE };
  }
}

if (import.meta.main) {
  const cfg = loadConfig();
  const db = openDb(cfg.databasePath);
  const r = runCli(process.argv.slice(2), db, new Keys(cfg.hmacKey));
  (r.code === 0 ? process.stdout : process.stderr).write(r.out);
  process.exit(r.code);
}
