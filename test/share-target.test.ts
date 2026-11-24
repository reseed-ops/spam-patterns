// Android share target (v0.1.10). Three layers:
//   - the manifest declares the share_target, and the server's POST
//     /share-target fallback discards the body and writes nothing;
//   - the worker script answers the share itself (static checks);
//   - in headless Chromium (same harness and skip rule as
//     browser-textdetector.test.ts): an installed-style page with the worker
//     active shares a screenshot, the worker stores it and redirects without
//     the server ever seeing the POST, and /report?shared=1 feeds it into the
//     picker path and deletes it.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { MANIFEST } from '../src/app.ts';
import { countReports, get, previewAndFile, startServer, type TestServer } from './helpers.ts';

const root = new URL('..', import.meta.url).pathname;
const read = (p: string) => readFileSync(root + p, 'utf8');
const SW = read('public/sw.js');
const REPORT_JS = read('public/static/js/report.js');
const ICON = join(root, 'public/static/icons/icon-192.png');

describe('share target: manifest and server fallback', () => {
  let s: TestServer;
  before(async () => (s = await startServer()));
  after(() => s.close());

  it('the manifest declares the share target with the exact shape', async () => {
    const m = (await (await fetch(s.base + '/manifest.webmanifest')).json()) as Record<string, unknown>;
    assert.deepEqual(m.share_target, {
      action: '/share-target',
      method: 'POST',
      enctype: 'multipart/form-data',
      params: { files: [{ name: 'image', accept: ['image/*'] }] },
    });
    // Every earlier field is still there, unchanged.
    const { share_target: _st, ...rest } = MANIFEST;
    const { share_target: _st2, ...served } = m;
    assert.deepEqual(served, JSON.parse(JSON.stringify(rest)));
    assert.deepEqual(Object.keys(served).sort(), ['background_color', 'description', 'display', 'icons', 'name', 'scope', 'short_name', 'start_url', 'theme_color']);
  });

  it('POST /share-target on the server: 303 to /report, body discarded, nothing written', async () => {
    await previewAndFile(s.base, { number: '(214) 555-0101', message: 'Hi Lane, Arlo here. Free gutter cleaning quote for homes in your area?', category: 'gutters', city: '' });
    const before = countReports(s.app);
    assert.equal(before, 1);
    const tables = (s.app.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name);
    const rows = () => tables.map((t) => [t, (s.app.db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get() as { n: number }).n]);
    const rowsBefore = rows();
    const fd = new FormData();
    fd.append('image', new Blob([readFileSync(ICON)], { type: 'image/png' }), 'shot.png');
    for (let i = 0; i < 3; i++) {
      const r = await fetch(s.base + '/share-target', { method: 'POST', body: fd, redirect: 'manual' });
      assert.equal(r.status, 303);
      assert.equal(r.headers.get('location'), '/report');
      assert.equal(r.headers.get('cache-control'), 'no-store');
      assert.equal(await r.text(), '');
    }
    // Any body, any type: same answer, nothing parsed.
    const odd = await fetch(s.base + '/share-target', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"number":"4125550142"}', redirect: 'manual' });
    assert.equal(odd.status, 303);
    assert.equal(countReports(s.app), before);
    assert.deepEqual(rows(), rowsBefore, 'a table changed');
    // Other multipart POSTs are still refused, and GET /share-target is not a page.
    const mp = new FormData();
    mp.append('image', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'x.png');
    assert.equal((await fetch(s.base + '/report', { method: 'POST', body: mp })).status, 415);
    assert.equal((await get(s.base, '/share-target')).status, 404);
  });

  it('the fallback route never reads the body', () => {
    const src = read('src/app.ts');
    const m = /if \(method === 'POST' && path === '\/share-target'\) \{([\s\S]*?)\n    \}/.exec(src);
    assert.ok(m, 'share-target route not found');
    assert.ok(!/readBody|formBody|jsonBody|Limiter|db\.|journal|stderr|console/.test(m[1]!));
    // It sits before the multipart refusal and before any limiter.
    assert.ok(src.indexOf("path === '/share-target'") < src.indexOf("ct.startsWith('multipart/')"));
  });
});

describe('share target: worker and report page source', () => {
  it('the worker answers the share POST itself, before any network fetch', () => {
    assert.match(SW, /var VERSION = '0\.1\.10';/);
    const fetchHandler = SW.slice(SW.indexOf("self.addEventListener('fetch'"));
    assert.ok(fetchHandler.indexOf('receiveShare(request)') < fetchHandler.indexOf("request.method !== 'GET'"));
    const fn = /function receiveShare\(request\) \{([\s\S]*?)\n\}/.exec(SW);
    assert.ok(fn);
    assert.ok(!/fetch\(/.test(fn[1]!), 'receiveShare must not call fetch()');
    assert.match(fn[1]!, /Response\.redirect\(new URL\('\/report\?shared=1', self\.location\.origin\)\.href, 303\)/);
    assert.match(fn[1]!, /Response\.redirect\(new URL\('\/report', self\.location\.origin\)\.href, 303\)/);
    assert.match(SW, /var SHARE_CACHE = 'sp-shared-image';/);
  });

  it('the report page reads the shared image once, deletes it, and uses the picker path', () => {
    assert.match(REPORT_JS, /shot\.addEventListener\('change', function \(\) \{ takeImage\(shot\.files && shot\.files\[0\]\); \}\);/);
    assert.match(REPORT_JS, /var SHARE_CACHE = 'sp-shared-image';/);
    assert.match(REPORT_JS, /cache\.delete\(SHARE_KEY\)/);
    assert.match(REPORT_JS, /if \(blob\) takeImage\(blob\)/);
  });

  it('copy: one line on /report, one on /privacy', async () => {
    const s = await startServer();
    try {
      const r = (await get(s.base, '/report')).text;
      assert.match(r, /<p class="meta" id="share-hint">On Android, once the app is installed you can also share a screenshot to Spam Patterns straight from your photos or messages app\.<\/p>/);
      const p = (await get(s.base, '/privacy')).text;
      assert.match(p, /<p id="shared-screenshots">A screenshot you share to Spam Patterns from another app is handled on your device the same way as one you pick[^<]*it is not sent to the server\.<\/p>/);
    } finally {
      await s.close();
    }
  });
});

const PW = process.env.PLAYWRIGHT_CORE || '/tmp/stm-e2e/node_modules/playwright-core';
const CHROME = process.env.CHROME || join(homedir(), '.cache/ms-playwright/chromium-1254/chrome-linux64/chrome');
const available = existsSync(PW) && existsSync(CHROME);
const skip = available ? false : 'needs playwright-core and a Chromium (set PLAYWRIGHT_CORE and CHROME)';

// Stubbed built-in reader (synthetic, fictional number range), so the picker
// path runs to the review screen without Tesseract.
const DETECTIONS = [
  ['Texting with (412) 555-0142 (SMS/MMS)', 40, 260],
  ['Hi Jordan, Riley here with a local gutter team! Want a', 30, 360],
  ['free quote this week?', 30, 385],
];
const STUB = `window.__td = 0; window.TextDetector = class { detect() { window.__td++; return Promise.resolve(${JSON.stringify(
  DETECTIONS.map(([t, x, y]) => ({ rawValue: t, boundingBox: { x, y, width: 300, height: 20 } })),
)}); } };`;

const VISIBLE_STEP = "document.querySelector('[data-step]:not([hidden])').getAttribute('data-step')";
const STASHED = "caches.open('sp-shared-image').then(c => c.match('/shared-image')).then(r => r ? r.blob().then(b => ({ type: b.type, size: b.size })) : null)";

describe('browser: Android share target handled on the device', { skip }, () => {
  let s: TestServer;
  let browser: any;
  const seen: string[] = [];
  before(async () => {
    s = await startServer();
    s.server.on('request', (req) => seen.push(`${req.method} ${req.url}`));
    const { chromium } = createRequire(import.meta.url)(PW);
    browser = await chromium.launch({ executablePath: CHROME, headless: true });
  });
  after(async () => {
    await browser?.close();
    await s?.close();
  });

  async function controlledPage() {
    const context = await browser.newContext();
    await context.addInitScript(STUB);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(e.message));
    await page.goto(s.base + '/report');
    // Polled with evaluate: waitForFunction(string) needs eval, which the CSP blocks.
    for (let i = 0; !(await page.evaluate('navigator.serviceWorker.controller !== null')); i++) {
      if (i > 300) throw new Error('service worker never took control');
      await page.waitForTimeout(100);
    }
    return { context, page, errors };
  }

  /** Submit the share the way Android does: a multipart POST navigation to /share-target. */
  async function share(page: any, withFile: boolean) {
    // Start from another page, so arriving at /report is the redirect.
    await page.goto(s.base + '/junk-mail');
    await page.evaluate(`(() => {
      const f = document.createElement('form');
      f.method = 'post';
      f.enctype = 'multipart/form-data';
      f.action = '/share-target';
      const i = document.createElement('input');
      i.type = ${withFile} ? 'file' : 'text';
      i.name = ${withFile} ? 'image' : 'title';
      i.id = 'share-input';
      if (!${withFile}) i.value = 'no image here';
      f.appendChild(i);
      document.body.appendChild(f);
    })()`);
    if (withFile) await page.setInputFiles('#share-input', ICON);
    await Promise.all([page.waitForURL(/\/report(\?|$)/, { waitUntil: 'load' }), page.evaluate("document.querySelector('form[action=\"/share-target\"]').submit()")]);
  }

  it('the worker stores the shared image, redirects 303 to /report?shared=1, and never hits the network', async () => {
    const { context, page, errors } = await controlledPage();
    seen.length = 0;
    // The report page consumes the stash at once; record what it finds there
    // (the worker's stored entry) as it reads it.
    await context.addInitScript(`(() => {
      const match = Cache.prototype.match;
      Cache.prototype.match = function (key) {
        return match.apply(this, arguments).then((r) => {
          if (r && key === '/shared-image') r.clone().blob().then((b) => { window.__stash = { type: b.type, size: b.size }; });
          return r;
        });
      };
    })()`);
    // Playwright does not report the intermediate POST of a navigation; the
    // DevTools protocol does, with the redirect response attached.
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    let redirect: any = null;
    const posts: string[] = [];
    cdp.on('Network.requestWillBeSent', (e: any) => {
      if (e.request.method === 'POST') posts.push(e.request.url);
      if (e.redirectResponse && e.redirectResponse.url.endsWith('/share-target')) {
        redirect = { status: e.redirectResponse.status, location: e.redirectResponse.headers.Location ?? e.redirectResponse.headers.location, fromSW: e.redirectResponse.fromServiceWorker, next: e.request.url, method: e.request.method };
      }
    });
    await share(page, true);
    assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, '/report?shared=1');
    assert.ok(redirect, 'no response seen for /share-target');
    assert.equal(redirect.status, 303);
    assert.match(redirect.location, /\/report\?shared=1$/);
    assert.equal(redirect.fromSW, true);
    assert.equal(redirect.method, 'GET');
    assert.deepEqual(posts.map((u) => new URL(u).pathname), ['/share-target']);
    assert.deepEqual(seen.filter((x) => x.includes('share-target')), [], 'the server received the share');
    assert.ok(!seen.some((x) => x.startsWith('POST')), 'no POST reached the server');
    await page.waitForSelector('[data-step="review"]:not([hidden])', { timeout: 30000 });
    assert.deepEqual(await page.evaluate('window.__stash'), { type: 'image/png', size: readFileSync(ICON).length });
    assert.equal(await page.evaluate(STASHED), null, 'consumed and deleted');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('a share with no image stores nothing and lands on plain /report', async () => {
    const { context, page } = await controlledPage();
    seen.length = 0;
    await share(page, false);
    assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, '/report');
    assert.ok(!seen.some((x) => x.startsWith('POST')), 'no POST reached the server');
    assert.equal(await page.evaluate(STASHED), null);
    assert.equal(await page.evaluate(VISIBLE_STEP), 'start');
    await context.close();
  });

  it('end to end: shared screenshot goes through the picker path to review, and the stash is deleted', async () => {
    const { context, page, errors } = await controlledPage();
    seen.length = 0;
    await share(page, true);
    await page.waitForSelector('[data-step="review"]:not([hidden])', { timeout: 30000 });
    assert.equal(await page.evaluate('window.__td'), 1);
    assert.match((await page.textContent('#r-kept')) ?? '', /Area code\s*412/);
    assert.match((await page.textContent('#r-engine')) ?? '', /TextDetector/);
    assert.equal(await page.evaluate(STASHED), null, 'shared image still stored');
    assert.ok(!seen.some((x) => x.includes('share-target')));
    assert.equal(countReports(s.app), 0, 'nothing filed');
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('report page with a stashed image loads it into the picker path and clears the entry', async () => {
    const { context, page, errors } = await controlledPage();
    await page.evaluate("fetch('/static/icons/icon-192.png').then(r => r.blob()).then(b => caches.open('sp-shared-image').then(c => c.put('/shared-image', new Response(b, { headers: { 'Content-Type': 'image/png' } }))))");
    await page.goto(s.base + '/report?shared=1');
    await page.waitForSelector('[data-step="review"]:not([hidden])', { timeout: 30000 });
    assert.equal(await page.evaluate('window.__td'), 1);
    assert.equal(await page.evaluate(STASHED), null);
    assert.deepEqual(errors, []);
    await context.close();
  });

  it('same validation as the picker: an unsupported stashed type shows the picker error and is cleared', async () => {
    const { context, page } = await controlledPage();
    await page.evaluate("caches.open('sp-shared-image').then(c => c.put('/shared-image', new Response('not an image', { headers: { 'Content-Type': 'text/plain' } })))");
    await page.goto(s.base + '/report?shared=1');
    await page.waitForSelector('#shot-error:not([hidden])', { timeout: 10000 });
    assert.match((await page.textContent('#shot-error')) ?? '', /This file type is not supported/);
    assert.equal(await page.evaluate(VISIBLE_STEP), 'start');
    assert.equal(await page.evaluate('window.__td'), 0);
    assert.equal(await page.evaluate(STASHED), null);
    await context.close();
  });

  it('/report?shared=1 with nothing stashed behaves exactly like /report', async () => {
    const { context, page, errors } = await controlledPage();
    await page.goto(s.base + '/report?shared=1');
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(VISIBLE_STEP), 'start');
    assert.equal(await page.evaluate("document.getElementById('shot-error').hidden"), true);
    assert.equal(await page.evaluate('window.__td'), 0);
    assert.deepEqual(errors, []);
    await context.close();
  });
});
