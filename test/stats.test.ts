// Aggregate page counter at GET /stats (same shape as the other Reseed
// sites). Totals only: the page_views table holds a path and a count, and
// nothing about any visitor.
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { SITEMAP_PATHS } from '../src/app.ts';
import { FORMULA_SET } from '../src/fixtures.ts';
import { runCli } from '../src/flags-cli.ts';
import { computePatterns } from '../src/patterns.ts';
import { get, previewAndFile, startServer, type TestServer } from './helpers.ts';

type Stats = { views: number; completes: number; pages: Record<string, number> };

async function stats(s: TestServer): Promise<Stats> {
  const r = await fetch(s.base + '/stats');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type') ?? '', /^application\/json/);
  return (await r.json()) as Stats;
}

describe('GET /stats: aggregate page counter', () => {
  let s: TestServer;
  before(async () => (s = await startServer()));
  after(() => s.close());
  beforeEach(() => s.app.db.exec('DELETE FROM page_views'));

  it('returns {views, completes, pages} and nothing else', async () => {
    const body = await stats(s);
    assert.deepEqual(Object.keys(body).sort(), ['completes', 'pages', 'views']);
    assert.equal(typeof body.views, 'number');
    assert.equal(typeof body.completes, 'number');
    assert.equal(typeof body.pages, 'object');
    assert.deepEqual(body, { views: 0, completes: 0, pages: {} });
  });

  it('a page load increments views and that page count', async () => {
    assert.equal((await get(s.base, '/')).status, 200);
    assert.equal((await get(s.base, '/')).status, 200);
    assert.equal((await get(s.base, '/patterns')).status, 200);
    const body = await stats(s);
    assert.equal(body.views, 3);
    assert.deepEqual(body.pages, { '/': 2, '/patterns': 1 });
  });

  it('counts every sitemap page under its path', async () => {
    for (const p of SITEMAP_PATHS) assert.equal((await get(s.base, p)).status, 200, p);
    const body = await stats(s);
    assert.equal(body.views, SITEMAP_PATHS.length);
    for (const p of SITEMAP_PATHS) assert.equal(body.pages[p], 1, p);
  });

  it('keys by path only: a query string or trailing slash is not stored', async () => {
    await get(s.base, '/?range=30&view=map&ac=212');
    await get(s.base, '/patterns/');
    const body = await stats(s);
    assert.deepEqual(body.pages, { '/': 1, '/patterns': 1 });
  });

  it('/stats does not count itself on repeated reads', async () => {
    await stats(s);
    await stats(s);
    await stats(s);
    assert.deepEqual(await stats(s), { views: 0, completes: 0, pages: {} });
  });

  it('does not count static assets, APIs, non-page routes, HEAD, POST or 404s', async () => {
    for (const p of [
      '/static/css/app.css',
      '/static/js/report.js',
      '/static/img/logo.svg',
      '/manifest.webmanifest',
      '/sw.js',
      '/robots.txt',
      '/sitemap.xml',
      '/favicon.ico',
      '/healthz',
      '/data/schema.json',
      '/delete',
      '/report/complete',
      '/offline',
      '/patterns/not-a-real-pattern',
      '/nope',
    ]) {
      await get(s.base, p);
    }
    await fetch(s.base + '/', { method: 'HEAD' });
    await fetch(s.base + '/api/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    await fetch(s.base + '/patterns', { method: 'POST' });
    assert.deepEqual(await stats(s), { views: 0, completes: 0, pages: {} });
  });

  it('stores only path and count: no IP, user agent or query string anywhere in the counter', async () => {
    await fetch(s.base + '/report?utm_source=secretquery', {
      headers: { 'user-agent': 'UniqueAgent/9.9', 'x-forwarded-for': '203.0.113.77' },
    });
    const cols = (s.app.db.prepare('PRAGMA table_info(page_views)').all() as Array<{ name: string }>).map((c) => c.name);
    assert.deepEqual(cols, ['path', 'views']);
    const rows = s.app.db.prepare('SELECT * FROM page_views').all();
    assert.deepEqual(JSON.parse(JSON.stringify(rows)), [{ path: '/report', views: 1 }]);
    // Nothing from the request made it into any table.
    const tables = (s.app.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((t) => t.name);
    for (const t of tables) {
      const dump = JSON.stringify(s.app.db.prepare(`SELECT * FROM "${t}"`).all());
      for (const needle of ['UniqueAgent', '203.0.113.77', '127.0.0.1', 'secretquery', 'utm_source']) {
        assert.ok(!dump.includes(needle), `${needle} found in ${t}`);
      }
    }
    assert.deepEqual(await stats(s), { views: 1, completes: 0, pages: { '/report': 1 } });
  });

  it('completes = counted reports on file; filing is not a page view', async () => {
    const input = { number: '(214) 555-0101', message: 'Hi Lane, Arlo here. Free gutter cleaning quote for homes in your area?', category: 'gutters' };
    const before = (await stats(s)).completes;
    const { filed } = await previewAndFile(s.base, input);
    assert.equal(filed.status, 201);
    const body = await stats(s);
    assert.equal(body.completes, before + 1);
    assert.equal(body.views, 0);
  });

  it('counts a published pattern detail page under its own path, not pending or unknown ones', async () => {
    for (const f of FORMULA_SET.slice(0, 3)) {
      const { filed } = await previewAndFile(s.base, { number: f.number, message: f.message, category: f.category, city: f.city ?? '' });
      assert.equal(filed.status, 201, filed.text);
    }
    const id = computePatterns(s.app.db, s.app.keys)[0]!.id;
    assert.equal((await get(s.base, `/patterns/${id}`)).status, 404); // pending: not public, not counted
    assert.equal(runCli(['publish', id], s.app.db, s.app.keys).code, 0);
    assert.equal((await get(s.base, `/patterns/${id}`)).status, 200);
    const body = await stats(s);
    assert.deepEqual(body.pages, { [`/patterns/${id}`]: 1 });
    assert.equal(body.views, 1);
  });

  it('discloses the counter in the footer and on the privacy page, with no script', async () => {
    const home = (await get(s.base, '/')).text;
    assert.match(home, /Counts visits and filed reports in total, nothing about you\./);
    const privacy = (await get(s.base, '/privacy')).text;
    assert.match(privacy, /id="visit-count"/);
    assert.match(privacy, /It stores no IP address, browser details, query string, visit time or identifier/);
    assert.ok(!/stats\.js|\/collect/.test(home + privacy));
  });
});
