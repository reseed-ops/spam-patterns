// Idempotent filing, review binding, deletion, receipts.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, beforeEach, describe, it } from 'node:test';
import { RECEIPT_BITS, deriveReceipt, normalizeReceipt, sha256hex } from '../src/crypto.ts';
import { openDb } from '../src/db.ts';
import { journalReapply } from '../src/journal.ts';
import { computePatterns } from '../src/patterns.ts';
import { decide } from '../src/review.ts';
import { FORMULA_SET } from '../src/fixtures.ts';
import { countReports, get, idemKey, postForm, postJson, previewAndFile, startServer, type TestServer } from './helpers.ts';

const INPUT = { number: '(214) 555-0101', message: 'Hi Lane, Arlo here. Free gutter cleaning quote for homes in your area?', category: 'gutters' };

let s: TestServer;
beforeEach(async () => {
  if (s) await s.close();
  s = await startServer();
});
after(() => s.close());

describe('idempotent filing', () => {
  it('a double submit yields one report and one receipt', async () => {
    const key = idemKey();
    const { preview, filed } = await previewAndFile(s.base, INPUT, key);
    assert.equal(filed.status, 201);
    const again = await postJson(s.base, '/api/reports', { ...INPUT, previewHash: preview.json.preview.previewHash, idempotencyKey: key });
    assert.equal(again.status, 200);
    assert.equal(again.json.status, 'already_filed');
    assert.equal(again.json.message, 'This report was already filed. No additional report was counted.');
    assert.equal(again.json.receipt, filed.json.receipt);
    assert.equal(countReports(s.app), 1);
  });

  it('concurrent duplicate submits still count once', async () => {
    const key = idemKey();
    const pv = await postJson(s.base, '/api/preview', INPUT);
    const body = { ...INPUT, previewHash: pv.json.preview.previewHash, idempotencyKey: key };
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() => postJson(s.base, '/api/reports', body)));
    assert.equal(rs.filter((r) => r.status === 201).length, 1);
    assert.equal(new Set(rs.map((r) => r.json.receipt)).size, 1);
    assert.equal(countReports(s.app), 1);
  });

  it('reusing a key for a different report is refused', async () => {
    const key = idemKey();
    await previewAndFile(s.base, INPUT, key);
    const other = { ...INPUT, message: 'Totally different text about solar panels. Interested?' };
    const pv = await postJson(s.base, '/api/preview', other);
    const r = await postJson(s.base, '/api/reports', { ...other, previewHash: pv.json.preview.previewHash, idempotencyKey: key });
    assert.equal(r.status, 409);
    assert.equal(r.json.status, 'idempotency_conflict');
    assert.equal(countReports(s.app), 1);
  });

  it('saves only the reviewed version: a changed draft is sent back for review', async () => {
    const pv = await postJson(s.base, '/api/preview', INPUT);
    const r = await postJson(s.base, '/api/reports', {
      ...INPUT,
      message: INPUT.message + ' My neighbor Bob at 12 Elm St got one too.',
      previewHash: pv.json.preview.previewHash,
      idempotencyKey: idemKey(),
    });
    assert.equal(r.status, 409);
    assert.equal(r.json.status, 'preview_changed');
    assert.ok(r.json.preview.scrubbedMessage);
    assert.equal(countReports(s.app), 0);
  });

  it('identical text from independent reports is not blocked', async () => {
    const a = await previewAndFile(s.base, INPUT);
    const b = await previewAndFile(s.base, { ...INPUT, number: '(305) 555-0102' });
    assert.equal(a.filed.status, 201);
    assert.equal(b.filed.status, 201);
    assert.equal(countReports(s.app), 2);
  });

  it('same sender + same text within the window is filed but not counted again', async () => {
    await previewAndFile(s.base, INPUT);
    const b = await previewAndFile(s.base, INPUT); // new key, same sender and text
    assert.equal(b.filed.status, 201, 'reporter is not told about the other report');
    const counted = s.app.db.prepare('SELECT counted FROM reports ORDER BY created_at').all() as Array<{ counted: number }>;
    assert.deepEqual(counted.map((c) => c.counted), [1, 0]);
  });
});

describe('deletion receipts', () => {
  it('have at least 128 bits of entropy and only their hash is stored', async () => {
    assert.ok(RECEIPT_BITS >= 128);
    const { filed } = await previewAndFile(s.base, INPUT);
    const code: string = filed.json.receipt;
    assert.match(code, /^([A-Z0-9]{4}-){7}[A-Z0-9]{4}$/);
    const dump = JSON.stringify(s.app.db.prepare('SELECT * FROM reports').all()) + JSON.stringify(s.app.db.prepare('SELECT * FROM filings').all());
    assert.ok(!dump.includes(code));
    assert.ok(!dump.includes(code.replace(/-/g, '')));
    assert.ok(dump.includes(sha256hex(code)));
  });

  it('are single-purpose: a receipt is not an idempotency key, a pattern ID, or a sender token', async () => {
    const key = idemKey();
    const { filed } = await previewAndFile(s.base, INPUT, key);
    assert.notEqual(filed.json.receipt, key);
    // Using the receipt as a request key does not replay or reveal anything.
    const pv = await postJson(s.base, '/api/preview', INPUT);
    const r = await postJson(s.base, '/api/reports', { ...INPUT, previewHash: pv.json.preview.previewHash, idempotencyKey: filed.json.receipt.replace(/-/g, '') });
    assert.notEqual(r.json.receipt, filed.json.receipt);
    // Different derivation per purpose.
    assert.notEqual(deriveReceipt(s.app.keys, key), s.app.keys.mac('sender-token-v1', key).toString('hex'));
  });

  it('never appear in a URL: the delete form posts the code in the body', async () => {
    const page = await get(s.base, '/delete');
    assert.match(page.text, /<form method="post" action="\/delete"/);
    const report = readFileSync(new URL('../public/static/js/report.js', import.meta.url), 'utf8');
    assert.ok(!/complete\?|receipt=|code=/.test(report));
  });

  it('normalize forgivingly but reject garbage', () => {
    assert.equal(normalizeReceipt('abcd efgh jkmn pqrs tvwx yz01 2345 6789'), 'ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-2345-6789');
    assert.equal(normalizeReceipt('short'), null);
    assert.equal(normalizeReceipt('UUUU'.repeat(8)), null);
  });
});

describe('deletion', () => {
  async function fileFormula() {
    const receipts: string[] = [];
    for (const f of FORMULA_SET) {
      const { filed } = await previewAndFile(s.base, { number: f.number, message: f.message, category: f.category, city: f.city ?? '' });
      receipts.push(filed.json.receipt);
    }
    return receipts;
  }

  it('removes the report from counts and recomputes pattern eligibility everywhere', async () => {
    const receipts = await fileFormula(); // 4 reports, one formula pattern
    let patterns = computePatterns(s.app.db, s.app.keys);
    assert.equal(patterns.length, 1);
    const id = patterns[0]!.id;
    assert.equal((await get(s.base, `/patterns/${id}`)).status, 404, 'pending until reviewed');
    assert.equal(decide(s.app.db, s.app.keys, id, 'published').ok, true);
    assert.equal((await get(s.base, `/patterns/${id}`)).status, 200);

    // 4 -> 3: still a pattern, count updates
    let del = await postJson(s.base, '/api/delete', { code: receipts[0] });
    assert.equal(del.json.status, 'deleted');
    assert.match(del.json.message, /cannot be recalled/);
    patterns = computePatterns(s.app.db, s.app.keys);
    assert.equal(patterns[0]!.count, 3);

    // 3 -> 2: below threshold, pattern withdrawn on every page
    del = await postJson(s.base, '/api/delete', { code: receipts[1] });
    assert.equal(del.json.status, 'deleted');
    assert.equal(computePatterns(s.app.db, s.app.keys).length, 0);
    const detail = await get(s.base, `/patterns/${id}`);
    assert.equal(detail.status, 404);
    assert.match(detail.text, /This pattern is not available/);
    assert.ok(!(await get(s.base, '/patterns')).text.includes(id));
    assert.equal(countReports(s.app), 2);
    const overview = await get(s.base, '/?range=all');
    assert.match(overview.text, /<span class="num big">2<\/span> reports filed/);
  });

  it('is idempotent and the success page says downloaded copies cannot be recalled', async () => {
    const [code] = await fileFormula();
    const confirm = await postForm(s.base, '/delete', { code: code!, step: 'confirm' });
    assert.match(confirm.text, /Delete this report\?/);
    assert.equal(countReports(s.app), 4, 'confirmation step deletes nothing');
    const done = await postForm(s.base, '/delete', { code: code!, step: 'delete' });
    assert.equal(done.status, 200);
    assert.match(done.text, /Report deleted/);
    assert.match(done.text, /cannot be recalled/);
    const again = await postForm(s.base, '/delete', { code: code!, step: 'delete' });
    assert.match(again.text, /Already deleted/);
    assert.equal(countReports(s.app), 3);
    const wrong = await postJson(s.base, '/api/delete', { code: 'Z'.repeat(32) });
    assert.equal(wrong.status, 404);
  });

  it('a restored backup cannot republish a deleted report (deletion journal)', async () => {
    const [code] = await fileFormula();
    // Simulate a backup taken before the deletion.
    const backupPath = join(s.dataDir, 'backup.sqlite');
    s.app.db.exec(`VACUUM INTO '${backupPath}'`);
    await postJson(s.base, '/api/delete', { code });
    const journal = join(s.dataDir, 'deletions.journal');
    assert.ok(existsSync(journal));
    assert.ok(!readFileSync(journal, 'utf8').includes(code!), 'journal holds hashes, not codes');
    const restored = openDb(backupPath);
    assert.equal((restored.prepare('SELECT COUNT(*) AS n FROM reports').get() as { n: number }).n, 4);
    assert.equal(journalReapply(restored, journal), 1);
    assert.equal((restored.prepare('SELECT COUNT(*) AS n FROM reports').get() as { n: number }).n, 3);
  });
});
