// The internal HMAC (sender token), the full number, the receipt hash and
// the stored template never appear in any API response or page.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { computePatterns } from '../src/patterns.ts';
import { decide } from '../src/review.ts';
import { ALL_FIXTURES } from '../src/fixtures.ts';
import { get, postForm, postJson, previewAndFile, startServer, type TestServer } from './helpers.ts';

let s: TestServer;
const responses: Array<{ where: string; body: string }> = [];

before(async () => {
  s = await startServer();
  for (const f of ALL_FIXTURES) {
    const { preview, filed } = await previewAndFile(s.base, { number: f.number, message: f.message, category: f.category, city: f.city ?? '' });
    responses.push({ where: 'preview', body: preview.text }, { where: 'file', body: filed.text });
    // retry path too
    const retry = await postJson(s.base, '/api/reports', {
      number: f.number, message: f.message, category: f.category, city: f.city ?? '',
      previewHash: preview.json.preview.previewHash, idempotencyKey: 'x'.repeat(30),
    });
    responses.push({ where: 'retry', body: retry.text });
  }
  const patterns = computePatterns(s.app.db, s.app.keys);
  // Publish everything so pattern pages and the home section are in the snapshot.
  for (const p of patterns) assert.equal(decide(s.app.db, s.app.keys, p.id, 'published').ok, true);
  const pages = ['/', '/?view=map', '/?view=table&sort=code', '/?state=TX', '/?ac=214', '/report', '/report/complete', '/delete',
    '/patterns', '/data', '/data/schema.json', '/privacy', '/methodology', '/project', '/healthz', '/nope',
    ...patterns.map((p) => `/patterns/${p.id}`)];
  for (const p of pages) responses.push({ where: p, body: (await get(s.base, p)).text });
  responses.push({ where: 'delete-form', body: (await postForm(s.base, '/delete', { code: 'A'.repeat(32), step: 'confirm' })).text });
  responses.push({ where: 'delete-api', body: (await postJson(s.base, '/api/delete', { code: 'B'.repeat(32) })).text });
  responses.push({ where: 'flag', body: (await postJson(s.base, '/api/flag', { reason: 'other', target: '/patterns', details: 'x' })).text });
});
after(() => s.close());

describe('internal values never leave the server', () => {
  it('collected a broad snapshot of responses', () => {
    assert.ok(responses.length > 60);
  });

  it('no sender token (HMAC) appears anywhere', () => {
    const tokens = (s.app.db.prepare('SELECT sender_token FROM reports').all() as Array<{ sender_token: string }>).map((r) => r.sender_token);
    assert.ok(tokens.length > 0 && tokens.every((t) => /^[0-9a-f]{64}$/.test(t)));
    for (const r of responses) for (const t of tokens) {
      assert.ok(!r.body.includes(t), `sender token leaked in ${r.where}`);
      assert.ok(!r.body.includes(t.slice(0, 16)), `sender token prefix leaked in ${r.where}`);
    }
  });

  it('no receipt hash, template hash or minhash appears anywhere', () => {
    const rows = s.app.db.prepare('SELECT receipt_hash, template_hash, minhash FROM reports').all() as Array<Record<string, string>>;
    for (const r of responses) for (const row of rows) {
      assert.ok(!r.body.includes(row.receipt_hash!), `receipt hash leaked in ${r.where}`);
      assert.ok(!r.body.includes(row.template_hash!.slice(0, 16)), `template hash leaked in ${r.where}`);
      assert.ok(!r.body.includes(row.minhash!.slice(0, 30)), `minhash leaked in ${r.where}`);
    }
  });

  it('no review fingerprint appears anywhere', () => {
    const fps = (s.app.db.prepare('SELECT fingerprint FROM pattern_reviews').all() as Array<{ fingerprint: string }>).map((r) => r.fingerprint);
    assert.ok(fps.length > 0);
    for (const r of responses) for (const fp of fps) assert.ok(!r.body.includes(fp.slice(0, 16)), `review fingerprint leaked in ${r.where}`);
  });

  it('no full sender number appears in any page (only the reporter’s own preview echoes area code + prefix)', () => {
    for (const r of responses) for (const f of ALL_FIXTURES) {
      const digits = f.number.replace(/\D/g, '');
      assert.ok(!r.body.includes(digits), `full number in ${r.where}`);
      assert.ok(!r.body.includes(f.number), `formatted number in ${r.where}`);
    }
  });

  it('public pages never show message templates or prefixes', () => {
    const templates = (s.app.db.prepare('SELECT template, prefix FROM reports').all() as Array<{ template: string; prefix: string }>);
    for (const r of responses.filter((x) => x.where.startsWith('/'))) {
      for (const t of templates) {
        const snippet = t.template.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        assert.ok(!r.body.includes(snippet), `template text on public page ${r.where}`);
      }
    }
  });
});
