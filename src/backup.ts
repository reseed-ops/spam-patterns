// Backup and restore for the one supported deployment (SQLite + deletion journal).
//
//   npm run backup -- create <backup-dir>          online backup of the DB + a copy of the journal,
//                                                  then prune backups older than 7 days in <backup-dir>
//   npm run backup -- restore <backup.sqlite>      restore a DB backup (APP MUST BE STOPPED), then
//                                                  merge journals and re-apply every deletion
//
// In Docker: docker compose exec app node src/backup.ts create /backup
//            docker compose stop app && docker compose run --rm app node src/backup.ts restore /backup/<file>.sqlite
//
// Rules this enforces (docs/self-hosting.md, "Backups and restore"):
//   - A restore NEVER replaces the live journal with an older copy. The live
//     journal and the backup's journal are merged (set union), so every
//     deletion either copy knows about is re-applied before the app serves.
//   - Backups are kept for at most 7 days (the privacy page states this).
//
// Env: STM_DATABASE_PATH (the live DB). The journal lives next to it.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { backup as sqliteBackup, DatabaseSync } from 'node:sqlite';
import { openDb } from './db.ts';
import { journalReapply } from './journal.ts';

export const BACKUP_KEEP_DAYS = 7;

export const journalPathFor = (dbPath: string) => join(dirname(dbPath), 'deletions.journal');

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

function readJournal(path: string): string[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[0-9a-f]{64}$/.test(l));
}

export interface CreateResult {
  db: string;
  journal: string;
  journalEntries: number;
  pruned: string[];
}

export async function createBackup(dbPath: string, backupDir: string, now = new Date(), keepDays = BACKUP_KEEP_DAYS): Promise<CreateResult> {
  if (!existsSync(dbPath)) throw new Error(`No database at ${dbPath}`);
  mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const s = stamp(now);
  const out = join(backupDir, `stm-${s}.sqlite`);
  const src = new DatabaseSync(dbPath, { readOnly: true });
  try {
    await sqliteBackup(src, out); // consistent online copy; the app may keep running
  } finally {
    src.close();
  }
  const entries = readJournal(journalPathFor(dbPath));
  const jOut = join(backupDir, `stm-${s}.deletions.journal`);
  writeFileSync(jOut, entries.map((e) => `${e}\n`).join(''), { mode: 0o600 });

  // Retention: at most keepDays.
  const cutoff = now.getTime() - keepDays * 86_400_000;
  const pruned: string[] = [];
  for (const f of readdirSync(backupDir)) {
    const m = /^stm-(\d{8}T\d{6}Z)\.(?:sqlite|deletions\.journal)$/.exec(f);
    if (!m) continue;
    const t = Date.parse(`${m[1]!.slice(0, 4)}-${m[1]!.slice(4, 6)}-${m[1]!.slice(6, 8)}T${m[1]!.slice(9, 11)}:${m[1]!.slice(11, 13)}:${m[1]!.slice(13, 15)}Z`);
    if (t < cutoff) {
      rmSync(join(backupDir, f));
      pruned.push(f);
    }
  }
  return { db: out, journal: jOut, journalEntries: entries.length, pruned };
}

export interface RestoreResult {
  journalEntries: number;
  fromLive: number;
  fromBackup: number;
  reportsRemoved: number;
  reportsAfter: number;
}

/** Restore a DB backup into dbPath. The app must be stopped. */
export function restoreBackup(backupDb: string, dbPath: string): RestoreResult {
  if (!backupDb.endsWith('.sqlite')) throw new Error('Not a .sqlite backup file');
  if (!existsSync(backupDb)) throw new Error(`No backup at ${backupDb}`);
  const backupJournal = backupDb.replace(/\.sqlite$/, '.deletions.journal');
  const liveJournal = journalPathFor(dbPath);

  // 1. Merge journals FIRST (union), so nothing below can lose a deletion.
  const live = readJournal(liveJournal);
  const fromBackup = readJournal(backupJournal);
  const merged = [...new Set([...live, ...fromBackup])];
  mkdirSync(dirname(dbPath), { recursive: true });
  writeFileSync(`${liveJournal}.tmp`, merged.map((e) => `${e}\n`).join(''), { mode: 0o600 });
  renameSync(`${liveJournal}.tmp`, liveJournal);

  // 2. Put the DB backup in place (old live DB and its WAL files moved aside, not deleted).
  for (const suffix of ['', '-wal', '-shm']) {
    if (existsSync(dbPath + suffix)) renameSync(dbPath + suffix, `${dbPath}${suffix}.pre-restore`);
  }
  copyFileSync(backupDb, dbPath);

  // 3. Re-apply every journaled deletion now (the app also does this at startup).
  const db = openDb(dbPath);
  const removed = journalReapply(db, liveJournal);
  const after = Number((db.prepare('SELECT COUNT(*) AS n FROM reports').get() as { n: number }).n);
  db.close();
  return { journalEntries: merged.length, fromLive: live.length, fromBackup: fromBackup.length, reportsRemoved: removed, reportsAfter: after };
}

if (import.meta.main) {
  const [cmd, arg] = process.argv.slice(2);
  const dbPath = process.env.STM_DATABASE_PATH?.trim() || './var/spam-text-map.sqlite';
  try {
    if (cmd === 'create' && arg) {
      const r = await createBackup(dbPath, arg);
      process.stdout.write(
        `Backed up ${dbPath}\n  -> ${r.db}\n  -> ${r.journal} (${r.journalEntries} deletion${r.journalEntries === 1 ? '' : 's'})\n` +
          (r.pruned.length ? `Pruned (older than ${BACKUP_KEEP_DAYS} days): ${r.pruned.join(', ')}\n` : ''),
      );
    } else if (cmd === 'restore' && arg) {
      const r = restoreBackup(arg, dbPath);
      process.stdout.write(
        `Restored ${arg} -> ${dbPath} (previous files kept as *.pre-restore)\n` +
          `Journal: ${r.journalEntries} deletions after merge (live ${r.fromLive}, backup ${r.fromBackup}).\n` +
          `Re-applied: ${r.reportsRemoved} report${r.reportsRemoved === 1 ? '' : 's'} removed. Reports now: ${r.reportsAfter}.\n`,
      );
    } else {
      process.stderr.write('usage: npm run backup -- create <backup-dir> | restore <backup.sqlite>\n');
      process.exit(2);
    }
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`);
    process.exit(1);
  }
}
