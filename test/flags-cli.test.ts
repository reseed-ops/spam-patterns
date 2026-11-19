// Maintainer flag CLI (npm run flags): list, show with the affected pattern, resolve.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { Keys } from '../src/crypto.ts';
import { openDb } from '../src/db.ts';
import { fileFlag, fileReport, prepare } from '../src/filing.ts';
import { FORMULA_SET } from '../src/fixtures.ts';
import { runCli } from '../src/flags-cli.ts';
import { computePatterns } from '../src/patterns.ts';
import { TEST_KEY, idemKey } from './helpers.ts';

const keys = new Keys(Buffer.from(TEST_KEY, 'hex'));

function seeded(path = ':memory:') {
  const db = openDb(path);
  for (const f of FORMULA_SET) {
    const input = { number: f.number, message: f.message, category: f.category, city: f.city ?? '' };
    const p = prepare(keys, input);
    assert.ok(!('errors' in p));
    fileReport(
      { db, keys, duplicateWindowHours: 24, globalDailySubmissions: 1e9, allowNewFiling: () => true, now: new Date(Date.now() - f.daysAgo * 86_400_000) },
      { ...input, previewHash: p.preview.previewHash, idempotencyKey: idemKey() },
    );
  }
  const pid = computePatterns(db, keys)[0]!.id;
  return { db, pid };
}
const flagIds = (db: ReturnType<typeof openDb>) => (db.prepare('SELECT id FROM flags ORDER BY rowid').all() as Array<{ id: string }>).map((r) => r.id);

describe('flags CLI', () => {
  it('lists open flags (and says so when there are none)', () => {
    const { db, pid } = seeded();
    assert.match(runCli([], db, keys).out, /^No flags\./);
    fileFlag(db, { reason: 'inaccurate', target: pid, details: 'not spam' });
    const out = runCli(['list'], db, keys);
    assert.equal(out.code, 0);
    assert.match(out.out, new RegExp(`open\\s+inaccurate\\s+${pid}`));
    assert.match(out.out, /1 flag\./);
  });
  it('a URL target hides the pattern too, and show prints the affected pattern', () => {
    const { db, pid } = seeded();
    fileFlag(db, { reason: 'my_number_or_business', target: `https://example.invalid/patterns/${pid}`, details: 'my business', contact: 'owner@example.invalid' });
    assert.equal(computePatterns(db, keys).length, 0, 'open flag with a URL target must hide the pattern');
    const [id] = flagIds(db);
    const out = runCli(['show', id!], db, keys);
    assert.equal(out.code, 0);
    assert.match(out.out, new RegExp(`Affected pattern: ${pid} \\(shared script pattern\\), hidden from public views`));
    assert.match(out.out, /Reports: 4,/);
    assert.match(out.out, /Skeleton \(v1\): GREETING>PERSONA>LOCAL_CLAIM>TRADE>OFFER>CTA/);
    assert.match(out.out, /Contact: owner@example\.invalid/);
  });
  it('resolve --restore returns the pattern to public views', () => {
    const { db, pid } = seeded();
    fileFlag(db, { reason: 'inaccurate', target: pid, details: '' });
    const [id] = flagIds(db);
    assert.equal(computePatterns(db, keys).length, 0);
    const r = runCli(['resolve', id!, '--restore'], db, keys);
    assert.equal(r.code, 0, r.out);
    assert.deepEqual(computePatterns(db, keys).map((p) => p.id), [pid]);
    assert.match(runCli(['list'], db, keys).out, /No flags/);
    assert.match(runCli(['list', '--all'], db, keys).out, /resolved/);
  });
  it('resolve --uphold keeps the pattern hidden after the flag is closed', () => {
    const { db, pid } = seeded();
    fileFlag(db, { reason: 'personal_info', target: pid, details: '' });
    const [id] = flagIds(db);
    assert.equal(runCli(['resolve', id!, '--uphold'], db, keys).code, 0);
    assert.equal(computePatterns(db, keys).length, 0);
    assert.match(runCli(['show', id!], db, keys).out, /\(upheld\)[\s\S]*hidden from public views/);
  });
  it('refuses ambiguous, unknown or repeated resolutions', () => {
    const { db, pid } = seeded();
    fileFlag(db, { reason: 'other', target: pid, details: '' });
    const [id] = flagIds(db);
    assert.equal(runCli(['resolve', id!], db, keys).code, 2);
    assert.equal(runCli(['resolve', id!, '--restore', '--uphold'], db, keys).code, 2);
    assert.equal(runCli(['resolve', 'nope', '--restore'], db, keys).code, 1);
    assert.equal(runCli(['resolve', id!, '--uphold'], db, keys).code, 0);
    assert.match(runCli(['resolve', id!, '--restore'], db, keys).out, /already upheld/);
    assert.equal(runCli(['bogus'], db, keys).code, 2);
  });
  it('a flag whose target has no pattern ID is shown for manual review', () => {
    const { db } = seeded();
    fileFlag(db, { reason: 'other', target: 'the map page', details: '' });
    const [id] = flagIds(db);
    assert.match(runCli(['show', id!], db, keys).out, /does not contain a pattern ID/);
  });
  it('runs as `npm run flags` against a database file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'stm-flags-'));
    const path = join(dir, 'f.sqlite');
    const { db, pid } = seeded(path);
    fileFlag(db, { reason: 'inaccurate', target: pid, details: '' });
    db.close();
    const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', new URL('../src/flags-cli.ts', import.meta.url).pathname, 'list'], {
      env: { ...process.env, STM_HMAC_KEY: TEST_KEY, STM_DATABASE_PATH: path },
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(pid));
  });
});
