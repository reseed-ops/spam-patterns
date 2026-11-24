// v0.1.5 pattern review gate: 3 matching reports are a review trigger, not
// publication. Pending patterns are invisible publicly; operator publishes
// or rejects through the flags CLI; material membership changes send a
// decision back to review.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, afterEach, beforeEach, describe, it } from 'node:test';
import { Keys } from '../src/crypto.ts';
import { openDb } from '../src/db.ts';
import { fileFlag, fileReport, prepare } from '../src/filing.ts';
import { FORMULA_SET, type Fixture } from '../src/fixtures.ts';
import { runCli } from '../src/flags-cli.ts';
import { MATCHING_RULES_VERSION, computePatterns, membershipFingerprint } from '../src/patterns.ts';
import { RULES_VERSIONS_TEXT } from '../src/pages.ts';
import { decide, getReview, publicPatterns, reconcileReviews, reviewQueue } from '../src/review.ts';
import { REDACTION_RULES_VERSION } from '../src/scrub.ts';
import { TEST_KEY, get, idemKey, postJson, previewAndFile, startServer, type TestServer } from './helpers.ts';

const keys = new Keys(Buffer.from(TEST_KEY, 'hex'));
const input = (f: Fixture) => ({ number: f.number, message: f.message, category: f.category, city: f.city ?? '' });
/** Same wording as FORMULA_SET[0] from a different (fictional) number: same template. */
const SAME_TEMPLATE_AGAIN: Fixture = { ...FORMULA_SET[0]!, number: '(214) 555-0161' };

const fileHttp = async (s: TestServer, f: Fixture) => {
  const { filed } = await previewAndFile(s.base, input(f));
  assert.equal(filed.status, 201, filed.text);
  return filed.json.receipt as string;
};
const pendingId = (s: TestServer) => {
  const ps = computePatterns(s.app.db, s.app.keys);
  assert.equal(ps.length, 1, 'exactly one computed pattern');
  return ps[0]!.id;
};
const cli = (s: TestServer, ...argv: string[]) => runCli(argv, s.app.db, s.app.keys);
async function publicViews(s: TestServer, id: string) {
  const [home, list, detail] = await Promise.all([get(s.base, '/'), get(s.base, '/patterns'), get(s.base, `/patterns/${id}`)]);
  return { home: home.text, list: list.text, detail, onHome: home.text.includes(id), onList: list.text.includes(id), detailOk: detail.status === 200 };
}
const hidden = (v: Awaited<ReturnType<typeof publicViews>>) => !v.onHome && !v.onList && v.detail.status === 404;

describe('review gate over HTTP', () => {
  let s: TestServer;
  beforeEach(async () => (s = await startServer()));
  afterEach(() => s.close());

  it('a cluster crossing the threshold is pending and invisible on home, /patterns and its detail page', async () => {
    for (const f of FORMULA_SET.slice(0, 3)) await fileHttp(s, f);
    const id = pendingId(s);
    const v = await publicViews(s, id);
    assert.ok(hidden(v));
    assert.match(v.home, /<h2 id="scripts-h">Recurring scripts<\/h2>/);
    assert.match(v.home, /<strong>No patterns published yet\.<\/strong> File a spam text to help surface the first one\./);
    assert.match(v.home, /When 3 eligible reports match, the pattern goes to a maintainer for review/);
    // The empty state invites a report rather than a click into the empty index.
    const scripts = v.home.slice(v.home.indexOf('id="scripts-h"'), v.home.indexOf('</section>', v.home.indexOf('id="scripts-h"')));
    assert.ok(!scripts.includes('href="/patterns"'));
    assert.match(scripts, /<a class="btn btn-primary" href="\/report">Report a spam text<\/a>/);
    assert.match(v.list, /No pattern has been published yet\./);
    assert.ok(!v.list.includes('Template match ·'), 'no pattern card, so no count of patterns either');
    assert.match(cli(s, 'pending').out, new RegExp(`${id}  PENDING`));
  });

  it('reports still count in totals and the map while their pattern is pending', async () => {
    for (const f of FORMULA_SET.slice(0, 3)) await fileHttp(s, f);
    const home = (await get(s.base, '/?range=all')).text;
    assert.match(home, /<span class="num big">3<\/span> reports filed/);
    assert.match(home, /<td class="num">1<\/td>/); // the default Table view
    const map = (await get(s.base, '/?range=all&view=map')).text;
    assert.match(map, /3 reports across 1 state/); // 469, 817, 972 are all Texas
  });

  it('after CLI publish it appears on home and /patterns with its count; after reject it is hidden again', async () => {
    for (const f of FORMULA_SET.slice(0, 3)) await fileHttp(s, f);
    const id = pendingId(s);
    const pub = cli(s, 'publish', id);
    assert.equal(pub.code, 0, pub.out);
    assert.match(pub.out, /published \(was pending; 3 reports, 3 templates\)/);
    let v = await publicViews(s, id);
    assert.ok(v.onHome && v.onList && v.detailOk);
    assert.match(v.home, new RegExp(`<a href="/patterns/${id}">[^<]+</a> <span class="meta">shared script pattern · <span class="num">3</span> reports</span>`));
    assert.match(v.home, /<a href="\/patterns">All published patterns<\/a>/);
    assert.ok(!v.home.includes('No patterns published yet'));
    assert.ok(!v.home.includes('Illustrative example'));
    assert.match(v.list, /Template match · 3 reports/);

    const rej = cli(s, 'reject', id);
    assert.equal(rej.code, 0, rej.out);
    v = await publicViews(s, id);
    assert.ok(hidden(v));
    // Stays hidden while rejected and unchanged, including more reports of a reviewed template.
    await fileHttp(s, SAME_TEMPLATE_AGAIN);
    v = await publicViews(s, id);
    assert.ok(hidden(v));
    assert.equal(getReview(s.app.db, id)!.status, 'rejected');
    assert.match(cli(s, 'patterns').out, new RegExp(`${id}  REJECTED`));
  });

  it('more reports of an already reviewed template are not material: it stays published and the count updates', async () => {
    for (const f of FORMULA_SET.slice(0, 3)) await fileHttp(s, f);
    const id = pendingId(s);
    assert.equal(cli(s, 'publish', id).code, 0);
    await fileHttp(s, SAME_TEMPLATE_AGAIN);
    const v = await publicViews(s, id);
    assert.ok(v.onHome && v.onList && v.detailOk);
    assert.match(v.detail.text, /Template match · 4 reports/);
    assert.equal(getReview(s.app.db, id)!.status, 'published');
  });

  it('a new template joining a published pattern returns it to pending', async () => {
    for (const f of FORMULA_SET.slice(0, 3)) await fileHttp(s, f);
    const id = pendingId(s);
    assert.equal(cli(s, 'publish', id).code, 0);
    await fileHttp(s, FORMULA_SET[3]!);
    assert.equal(pendingId(s), id, 'same stable id');
    assert.ok(hidden(await publicViews(s, id)));
    const row = getReview(s.app.db, id)!;
    assert.equal(row.status, 'pending');
    assert.match(row.note!, /was published; its templates changed \(3 reviewed, 4 now\)/);
    assert.match(cli(s, 'pending').out, /Returned to review .*templates changed/);
    // Re-publishing records the new membership.
    assert.equal(cli(s, 'publish', id).code, 0);
    assert.ok((await publicViews(s, id)).onList);
  });

  it('a template leaving (all its reports deleted) returns it to pending, even with 3 reports left', async () => {
    const receipts = [];
    for (const f of FORMULA_SET) receipts.push(await fileHttp(s, f));
    const id = pendingId(s);
    assert.equal(cli(s, 'publish', id).code, 0);
    assert.equal((await postJson(s.base, '/api/delete', { code: receipts[3] })).json.status, 'deleted');
    assert.equal(computePatterns(s.app.db, s.app.keys)[0]!.count, 3);
    assert.ok(hidden(await publicViews(s, id)));
    assert.equal(getReview(s.app.db, id)!.status, 'pending');
  });

  it('deleting a duplicate of a reviewed template (template still present) keeps it published', async () => {
    for (const f of FORMULA_SET.slice(0, 3)) await fileHttp(s, f);
    const dup = await fileHttp(s, SAME_TEMPLATE_AGAIN);
    const id = pendingId(s);
    assert.equal(cli(s, 'publish', id).code, 0);
    assert.equal((await postJson(s.base, '/api/delete', { code: dup })).json.status, 'deleted');
    assert.ok((await publicViews(s, id)).onList);
  });

  it('deletions below threshold remove it everywhere, and if it comes back with the same templates it is pending again', async () => {
    const receipts = [];
    for (const f of FORMULA_SET.slice(0, 3)) receipts.push(await fileHttp(s, f));
    const id = pendingId(s);
    assert.equal(cli(s, 'publish', id).code, 0);
    assert.ok((await publicViews(s, id)).onHome);

    assert.equal((await postJson(s.base, '/api/delete', { code: receipts[0] })).json.status, 'deleted');
    assert.equal(computePatterns(s.app.db, s.app.keys).length, 0);
    const v = await publicViews(s, id);
    assert.ok(hidden(v));
    assert.match(v.home, /No patterns published yet/);
    assert.match(v.detail.text, /This pattern is not available/);
    assert.match(getReview(s.app.db, id)!.note!, /fell below the threshold/);
    assert.match(cli(s, 'pending').out, /^No pending patterns\./);

    // The same template returns from another number: same membership, but the decision lapsed.
    await fileHttp(s, SAME_TEMPLATE_AGAIN);
    assert.equal(pendingId(s), id);
    assert.ok(hidden(await publicViews(s, id)));
    assert.match(cli(s, 'pending').out, new RegExp(`${id}  PENDING`));
  });

  it('a published pattern with an open flag stays hidden; restoring the flag shows it again', async () => {
    for (const f of FORMULA_SET.slice(0, 3)) await fileHttp(s, f);
    const id = pendingId(s);
    assert.equal(cli(s, 'publish', id).code, 0);
    fileFlag(s.app.db, { reason: 'inaccurate', target: id, details: '' });
    assert.ok(hidden(await publicViews(s, id)));
    assert.equal(getReview(s.app.db, id)!.status, 'published', 'a flag is not a membership change');
    const flagId = (s.app.db.prepare('SELECT id FROM flags').get() as { id: string }).id;
    assert.match(cli(s, 'show', flagId).out, /hidden from public views \(review: published\)/);
    assert.equal(cli(s, 'resolve', flagId, '--restore').code, 0);
    assert.ok((await publicViews(s, id)).onList);
  });
});

describe('review decisions, unit level', () => {
  function seeded(fixtures: Fixture[]) {
    const db = openDb(':memory:');
    for (const f of fixtures) {
      const p = prepare(keys, input(f));
      assert.ok(!('errors' in p));
      fileReport(
        { db, keys, duplicateWindowHours: 24, globalDailySubmissions: 1e9, allowNewFiling: () => true },
        { ...input(f), previewHash: p.preview.previewHash, idempotencyKey: idemKey() },
      );
    }
    return db;
  }
  it('fingerprint is the set of distinct template hashes plus the matching rules version (order and repeats ignored)', () => {
    assert.equal(membershipFingerprint(['b', 'a', 'a']), membershipFingerprint(['a', 'b']));
    assert.notEqual(membershipFingerprint(['a', 'b']), membershipFingerprint(['a', 'b', 'c']));
    assert.equal(MATCHING_RULES_VERSION, 'v1');
  });
  it('publish and reject refuse unknown ids and repeated decisions', () => {
    const db = seeded(FORMULA_SET.slice(0, 3));
    const id = computePatterns(db, keys)[0]!.id;
    assert.equal(runCli(['publish'], db, keys).code, 2);
    assert.equal(runCli(['publish', 'fv1-000000000000'], db, keys).code, 1);
    assert.equal(runCli(['publish', id], db, keys).code, 0);
    assert.match(runCli(['publish', id], db, keys).out, /already published/);
    assert.equal(runCli(['reject', id], db, keys).code, 0);
    assert.equal(publicPatterns(db, keys).length, 0);
    assert.equal(runCli(['publish', id], db, keys).code, 0, 'a rejected pattern can be published later');
    assert.equal(publicPatterns(db, keys).length, 1);
  });
  it('a stale fingerprint is never public even before reconciliation runs', () => {
    const db = seeded(FORMULA_SET.slice(0, 3));
    const id = computePatterns(db, keys)[0]!.id;
    assert.ok(decide(db, keys, id, 'published').ok);
    db.prepare("UPDATE pattern_reviews SET fingerprint = 'x'").run();
    assert.equal(reviewQueue(db, keys)[0]!.status, 'pending');
    assert.equal(publicPatterns(db, keys).length, 0);
    assert.equal(reconcileReviews(db, keys), 0, 'already reset by the read above');
  });
});

describe('review CLI end to end against a throwaway database file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stm-review-'));
  const path = join(dir, 'r.sqlite');
  const run = (...argv: string[]) =>
    spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', new URL('../src/flags-cli.ts', import.meta.url).pathname, ...argv], {
      env: { ...process.env, STM_HMAC_KEY: TEST_KEY, STM_DATABASE_PATH: path },
      encoding: 'utf8',
    });
  let s: TestServer;
  after(() => s?.close());

  it('lists pending with scrubbed templates and counts, publishes, and the running app shows the result', async () => {
    s = await startServer({ STM_DATABASE_PATH: path });
    for (const f of [...FORMULA_SET.slice(0, 3), SAME_TEMPLATE_AGAIN]) await fileHttp(s, f);
    const id = pendingId(s);

    let r = run('pending');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`^${id}  PENDING  shared script pattern`, 'm'));
    assert.match(r.stdout, /Reports: 4 \(3 distinct templates\)/);
    assert.match(r.stdout, /Skeleton \(v1\): GREETING>PERSONA>LOCAL_CLAIM>TRADE>OFFER>CTA/);
    assert.match(r.stdout, /\[2 reports\] Hi \[recipient name removed\], \[sender name removed\] here\./);
    assert.equal((r.stdout.match(/^ {4}\[\d+ reports?\] /gm) ?? []).length, 3, 'one line per distinct template');
    assert.ok(!/555|0121|0161/.test(r.stdout), 'no sender digits in the listing');
    assert.match(r.stdout, /1 pending pattern\./);

    r = run('publish', id);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /It now appears on the home page and \/patterns\./);
    assert.ok((await get(s.base, '/')).text.includes(`/patterns/${id}`));
    assert.match(run('pending').stdout, /^No pending patterns\./);
    assert.match(run('patterns').stdout, new RegExp(`${id}  PUBLISHED`));

    r = run('reject', id);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!(await get(s.base, '/patterns')).text.includes(id));
    assert.equal(run('publish', 'fv1-ffffffffffff').status, 1);
  });
});

describe('v0.1.5 copy', () => {
  let s: TestServer;
  beforeEach(async () => (s = await startServer({ STM_ABUSE_CONTACT: 'support@example.invalid' })));
  afterEach(() => s.close());

  it('the receipt step and /report/complete give the reporter path', async () => {
    for (const path of ['/report', '/report/complete']) {
      const t = (await get(s.base, path)).text;
      assert.match(t, /Your original is yours to keep\./, path);
      assert.match(t, /it stays in your photos/, path);
      assert.match(t, /Save your deletion receipt code too\./, path);
      assert.match(t, /Forward the original text to <strong>7726<\/strong> \(it spells SPAM\)/, path);
      assert.match(t, /<a href="https:\/\/consumercomplaints\.fcc\.gov\/">FCC<\/a>/, path);
      assert.match(t, /<a href="https:\/\/reportfraud\.ftc\.gov\/">FTC<\/a>/, path);
      assert.match(t, /This site publishes only scrubbed patterns\./, path);
    }
    // In the report flow it sits in the "done" step, after a successful filing.
    const t = (await get(s.base, '/report')).text;
    assert.ok(t.indexOf('data-step="done"') < t.indexOf('Your original is yours to keep'));
  });

  it('/patterns and each pattern page carry the correction line', async () => {
    const line = /If a published pattern is wrong or identifies you or your business, contact <a href="mailto:support@example\.invalid">support@example\.invalid<\/a> for review or removal\./;
    assert.match((await get(s.base, '/patterns')).text, line);
    assert.match((await get(s.base, '/patterns/fv1-000000000000')).text, line);
    for (const f of FORMULA_SET.slice(0, 3)) await fileHttp(s, f);
    const id = pendingId(s);
    assert.equal(cli(s, 'publish', id).code, 0);
    const detail = await get(s.base, `/patterns/${id}`);
    assert.equal(detail.status, 200);
    assert.match(detail.text, line);
  });

  it('methodology shows the rules versions and the review step', async () => {
    const t = (await get(s.base, '/methodology')).text;
    assert.equal(RULES_VERSIONS_TEXT, `Redaction rules ${REDACTION_RULES_VERSION} · Matching rules ${MATCHING_RULES_VERSION}`);
    assert.ok(t.includes('Redaction rules v1 · Matching rules v1'));
    assert.match(t, /<h3 id="review">Review before publication<\/h3>/);
    assert.match(t, /The review checks that the match is real, that no personal detail survived scrubbing, and that the pattern does not read as identifying a person or a single business\./);
    assert.match(t, /review trigger, not automatic publication/);
  });

  it('no public page claims patterns appear automatically at 3 reports', async () => {
    for (const path of ['/', '/patterns', '/methodology', '/privacy', '/data', '/report']) {
      const t = (await get(s.base, path)).text;
      assert.ok(!/appear(?:s)? (?:here )?once \d|is shown once|shown once \d|reached \d eligible/i.test(t), path);
    }
  });
});
