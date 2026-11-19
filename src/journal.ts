// Deletion journal: an append-only file of deleted receipt hashes kept
// next to (not inside) the database. Backups copy the database; the
// journal stays with the deployment. On startup every journaled hash is
// re-applied, so restoring an older backup cannot silently republish a
// report that was deleted after that backup was taken.

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import type { DB } from './db.ts';

export function journalAppend(path: string | null, receiptHash: string): void {
  if (!path) return;
  appendFileSync(path, `${receiptHash}\n`, { mode: 0o600 });
}

export function journalReapply(db: DB, path: string | null, now = new Date()): number {
  if (!path || !existsSync(path)) return 0;
  const hashes = readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[0-9a-f]{64}$/.test(l));
  let removed = 0;
  const day = now.toISOString().slice(0, 10);
  for (const h of hashes) {
    const row = db.prepare('SELECT id FROM reports WHERE receipt_hash = ?').get(h) as { id: string } | undefined;
    if (row) {
      db.prepare('DELETE FROM reports WHERE id = ?').run(row.id);
      removed++;
    }
    db.prepare('INSERT OR IGNORE INTO deletions(receipt_hash, deleted_day) VALUES (?, ?)').run(h, day);
  }
  return removed;
}
