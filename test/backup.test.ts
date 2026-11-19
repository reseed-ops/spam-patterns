// Backup and restore (npm run backup): a restore can never bring back a
// deleted report, whether the deletion happened after the backup (live
// journal) or before it (backup's journal, even if the live journal is lost).
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { createBackup, journalPathFor, restoreBackup } from '../src/backup.ts';
import { openDb } from '../src/db.ts';
import { FORMULA_SET } from '../src/fixtures.ts';
import { postJson, previewAndFile, startServer, type TestServer } from './helpers.ts';

async function fileAll(s: TestServer): Promise<string[]> {
  const receipts: string[] = [];
  for (const f of FORMULA_SET) {
    const r = await previewAndFile(s.base, { number: f.number, message: f.message, category: f.category, city: f.city ?? '' });
    assert.equal(r.filed.status, 201, r.filed.text);
    receipts.push(r.filed.json.receipt);
  }
  return receipts;
}
const reportCount = (path: string) => {
  const db = openDb(path);
  const n = Number((db.prepare('SELECT COUNT(*) AS n FROM reports').get() as { n: number }).n);
  db.close();
  return n;
};
async function stop(s: TestServer) {
  await s.close();
  s.app.db.close();
}

describe('backup and restore drill', () => {
  it('a report deleted AFTER the backup does not return after restore', async () => {
    const s = await startServer();
    const dbPath = s.env.STM_DATABASE_PATH!;
    const backups = mkdtempSync(join(tmpdir(), 'stm-bk-'));
    const receipts = await fileAll(s);
    const b = await createBackup(dbPath, backups);
    assert.equal(reportCount(b.db), 4);
    assert.equal((await postJson(s.base, '/api/delete', { code: receipts[0] })).json.status, 'deleted');
    await stop(s);
    const r = restoreBackup(b.db, dbPath);
    assert.equal(r.reportsRemoved, 1, 'the restored copy still had the deleted report; the journal removed it');
    assert.equal(r.reportsAfter, 3);
    // and again when the app starts on the restored DB
    const s2 = await startServer({ STM_DATABASE_PATH: dbPath });
    assert.equal((await postJson(s2.base, '/api/delete', { code: receipts[0] })).json.status, 'already_deleted');
    assert.equal((await postJson(s2.base, '/api/delete', { code: receipts[1] })).json.status, 'deleted');
    await stop(s2);
  });

  it('a report deleted BEFORE the backup stays gone even if the live journal is lost', async () => {
    const s = await startServer();
    const dbPath = s.env.STM_DATABASE_PATH!;
    const backups = mkdtempSync(join(tmpdir(), 'stm-bk-'));
    const receipts = await fileAll(s);
    await postJson(s.base, '/api/delete', { code: receipts[2] });
    const b = await createBackup(dbPath, backups);
    assert.equal(b.journalEntries, 1);
    await stop(s);
    rmSync(journalPathFor(dbPath)); // volume damage: live journal gone
    const r = restoreBackup(b.db, dbPath);
    assert.equal(r.fromBackup, 1);
    assert.equal(r.reportsAfter, 3);
    assert.ok(existsSync(journalPathFor(dbPath)), 'merged journal is written back to the live volume');
  });

  it('the restore merges journals and never replaces the live one with an older copy', async () => {
    const s = await startServer();
    const dbPath = s.env.STM_DATABASE_PATH!;
    const backups = mkdtempSync(join(tmpdir(), 'stm-bk-'));
    const receipts = await fileAll(s);
    await postJson(s.base, '/api/delete', { code: receipts[0] });
    const b = await createBackup(dbPath, backups);
    await postJson(s.base, '/api/delete', { code: receipts[1] });
    await postJson(s.base, '/api/delete', { code: receipts[2] });
    await stop(s);
    const r = restoreBackup(b.db, dbPath);
    assert.equal(r.fromLive, 3);
    assert.equal(r.fromBackup, 1);
    assert.equal(r.journalEntries, 3);
    assert.equal(r.reportsAfter, 1);
    assert.ok(existsSync(`${dbPath}.pre-restore`), 'the replaced DB is moved aside, not destroyed');
  });

  it('keeps backups for at most 7 days', async () => {
    const s = await startServer();
    const dbPath = s.env.STM_DATABASE_PATH!;
    await stop(s);
    const backups = mkdtempSync(join(tmpdir(), 'stm-bk-'));
    writeFileSync(join(backups, 'stm-20000101T000000Z.sqlite'), '');
    writeFileSync(join(backups, 'stm-20000101T000000Z.deletions.journal'), '');
    writeFileSync(join(backups, 'unrelated.txt'), '');
    const b = await createBackup(dbPath, backups);
    assert.deepEqual(b.pruned.sort(), ['stm-20000101T000000Z.deletions.journal', 'stm-20000101T000000Z.sqlite']);
    assert.equal(readdirSync(backups).length, 3);
  });
});
