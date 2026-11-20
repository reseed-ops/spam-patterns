// Deletion receipt codes kept on the filer's device (v0.1.9). Three layers:
//   1. the store/prune/expire/forget logic in public/static/js/receipts.js,
//      loaded directly with an in-memory storage stub;
//   2. the server-rendered markup (/delete, /report, /privacy);
//   3. a real browser (playwright-core + Chromium, skipped without them, as
//      in test/browser-textdetector.test.ts): filing saves the code, /delete
//      lists dates only, deleting removes the code, "remove from this device"
//      deletes nothing, and a browser without localStorage works as before.
// All numbers are in the fictional 555-01XX range.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import vm from 'node:vm';
import { countReports, get, postForm, postJson, previewAndFile, startServer, type TestServer } from './helpers.ts';

interface Entry { code: string; filedAt: number; deleting?: number }
interface Api {
  KEY: string; MAX: number; TTL_MS: number;
  normalize(c: unknown): string | null;
  prune(list: unknown, now: number): Entry[];
  read(now: number, store?: Store): Entry[];
  save(code: string, now: number, store?: Store): boolean;
  remove(code: string, now: number, store?: Store): void;
  markDeleting(code: string, now: number, store?: Store): boolean;
  settle(status: string, now: number, store?: Store): void;
  forget(store?: Store): boolean;
}
interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

const SRC = readFileSync(new URL('../public/static/js/receipts.js', import.meta.url), 'utf8');
function load(window: Record<string, unknown> = {}): Api {
  const sandbox = { window };
  vm.runInNewContext(SRC, sandbox);
  return sandbox.window.STMReceipts as Api;
}
const R = load();

class MemStore implements Store {
  m = new Map<string, string>();
  writes = 0;
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.writes++; this.m.set(k, String(v)); }
  removeItem(k: string) { this.writes++; this.m.delete(k); }
}
const THROWS: Store = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); },
  removeItem() { throw new Error('SecurityError'); },
};

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 20, 15, 0, 0);
const B32 = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789';
function code(n: number): string {
  let s = '';
  for (let i = 0; i < 32; i++) s += B32[(n * 7 + i * 3) % 32];
  return s.match(/.{4}/g)!.join('-');
}
const plain = (x: unknown) => JSON.parse(JSON.stringify(x)); // copy out of the vm realm
const codes = (l: Entry[]) => plain(l).map((e: Entry) => e.code);

describe('receipts.js: store, prune, expire, forget', () => {
  it('saves a filed code as {code, filedAt} under one key', () => {
    const st = new MemStore();
    assert.equal(R.save(code(1), NOW, st), true);
    assert.deepEqual([...st.m.keys()], [R.KEY]);
    assert.deepEqual(JSON.parse(st.getItem(R.KEY)!), [{ code: code(1), filedAt: NOW }]);
    assert.deepEqual(codes(R.read(NOW, st)), [code(1)]);
  });

  it('normalizes like the server and refuses garbage', () => {
    const st = new MemStore();
    assert.equal(R.save(code(2).replace(/-/g, '').toLowerCase(), NOW, st), true);
    assert.deepEqual(codes(R.read(NOW, st)), [code(2)]);
    for (const bad of ['', 'not a code', 'U'.repeat(32), code(3) + 'X', null, 42]) {
      assert.equal(R.save(bad as string, NOW, st), false);
    }
    assert.equal(R.read(NOW, st).length, 1);
  });

  it('keeps the 5 most recent, newest first, without duplicates', () => {
    const st = new MemStore();
    for (let i = 1; i <= 7; i++) R.save(code(i), NOW + i * 1000, st);
    R.save(code(5), NOW + 9000, st); // re-saving moves it to the front, not a second entry
    const l = R.read(NOW + 10_000, st);
    assert.equal(R.MAX, 5);
    assert.deepEqual(codes(l), [code(5), code(7), code(6), code(4), code(3)]);
    assert.equal(JSON.parse(st.getItem(R.KEY)!).length, 5);
  });

  it('prunes entries older than 90 days on read, and writes the pruned list back', () => {
    const st = new MemStore();
    st.setItem(R.KEY, JSON.stringify([
      { code: code(1), filedAt: NOW - 10 * DAY },
      { code: code(2), filedAt: NOW - 90 * DAY },
      { code: code(3), filedAt: NOW - 89 * DAY },
      { code: code(4), filedAt: NOW - 400 * DAY },
    ]));
    assert.deepEqual(codes(R.read(NOW, st)), [code(1), code(3)]);
    assert.deepEqual(JSON.parse(st.getItem(R.KEY)!).map((e: Entry) => e.code), [code(1), code(3)]);
    // Ninety days after the newest, nothing is left and the key is gone.
    assert.deepEqual(codes(R.read(NOW + 81 * DAY, st)), []);
    assert.equal(st.getItem(R.KEY), null);
  });

  it('prunes on write too: saving drops expired entries', () => {
    const st = new MemStore();
    st.setItem(R.KEY, JSON.stringify([{ code: code(1), filedAt: NOW - 100 * DAY }, { code: code(2), filedAt: NOW - DAY }]));
    R.save(code(3), NOW, st);
    assert.deepEqual(JSON.parse(st.getItem(R.KEY)!).map((e: Entry) => e.code), [code(3), code(2)]);
  });

  it('drops malformed or tampered entries and survives corrupt JSON', () => {
    const st = new MemStore();
    st.setItem(R.KEY, JSON.stringify([null, 'x', { code: 'nope', filedAt: NOW }, { code: code(1) }, { code: code(2), filedAt: 'today' },
      { code: code(3), filedAt: NOW + 365 * DAY }, { code: code(4), filedAt: NOW - DAY, extra: 'dropped' }]));
    assert.deepEqual(plain(R.read(NOW, st)), [{ code: code(4), filedAt: NOW - DAY }]);
    st.setItem(R.KEY, '{not json');
    assert.deepEqual(plain(R.read(NOW, st)), []);
    st.setItem(R.KEY, JSON.stringify({ code: code(1), filedAt: NOW }));
    assert.deepEqual(plain(R.read(NOW, st)), []);
  });

  it('remove() takes one code out; forget() clears the list', () => {
    const st = new MemStore();
    R.save(code(1), NOW, st); R.save(code(2), NOW + 1, st);
    R.remove(code(1).toLowerCase(), NOW + 2, st);
    assert.deepEqual(codes(R.read(NOW + 2, st)), [code(2)]);
    assert.equal(R.forget(st), true);
    assert.equal(st.getItem(R.KEY), null);
    assert.deepEqual(plain(R.read(NOW + 3, st)), []);
  });

  it('a successful deletion removes the marked code; a failed one keeps it', () => {
    const st = new MemStore();
    R.save(code(1), NOW, st); R.save(code(2), NOW + 1, st);
    assert.equal(R.markDeleting(code(1), NOW + 5, st), true);
    R.settle('not_found', NOW + 6, st);
    assert.deepEqual(codes(R.read(NOW + 6, st)), [code(2), code(1)]);
    assert.ok(plain(R.read(NOW + 6, st)).every((e: Entry) => e.deleting === undefined), 'mark cleared');
    for (const status of ['deleted', 'already_deleted']) {
      R.save(code(3), NOW + 7, st);
      R.markDeleting(code(3), NOW + 8, st);
      R.settle(status, NOW + 9, st);
      assert.deepEqual(codes(R.read(NOW + 9, st)), [code(2), code(1)], status);
    }
  });

  it('only the last submitted code is marked, and a stale mark expires', () => {
    const st = new MemStore();
    R.save(code(1), NOW, st); R.save(code(2), NOW, st);
    R.markDeleting(code(1), NOW, st);
    R.markDeleting(code(2), NOW, st);
    R.settle('deleted', NOW + 1000, st);
    assert.deepEqual(codes(R.read(NOW + 1000, st)), [code(1)]);
    // A mark left by an abandoned attempt never removes a code later.
    R.markDeleting(code(1), NOW, st);
    R.settle('deleted', NOW + 11 * 60_000, st);
    assert.deepEqual(codes(R.read(NOW + 11 * 60_000, st)), [code(1)]);
    // A code typed by hand that is not in the list marks nothing.
    assert.equal(R.markDeleting(code(9), NOW, st), false);
  });

  it('without localStorage every call is a quiet no-op', () => {
    for (const win of [{}, { localStorage: null }, { localStorage: THROWS }]) {
      const X = load(win);
      assert.equal(X.save(code(1), NOW), false);
      assert.deepEqual(plain(X.read(NOW)), []);
      assert.doesNotThrow(() => { X.remove(code(1), NOW); X.markDeleting(code(1), NOW); X.settle('deleted', NOW); X.forget(); });
    }
    // A getter that throws (cookies blocked in some browsers).
    const win = {};
    Object.defineProperty(win, 'localStorage', { get() { throw new Error('SecurityError'); } });
    const X = load(win);
    assert.equal(X.save(code(1), NOW), false);
    assert.deepEqual(plain(X.read(NOW)), []);
  });

  it('a storage that accepts nothing reports the code as not saved', () => {
    const st = new MemStore();
    st.setItem = () => { throw new Error('QuotaExceededError'); };
    assert.equal(R.save(code(1), NOW, st), false);
  });

  it('makes no network calls, sets no cookies, builds no URLs with a code', () => {
    assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|document\.cookie|sessionStorage|indexedDB|location\.|\?code=|code=/.test(SRC.replace(/^\s*\/\/.*$/gm, '')));
    assert.match(SRC, /f\.action = '\/delete'/);
    assert.match(SRC, /f\.method = 'post'/);
    const report = readFileSync(new URL('../public/static/js/report.js', import.meta.url), 'utf8');
    assert.match(report, /STMReceipts\.save\(body\.receipt, Date\.now\(\)\)/);
  });
});

describe('server-rendered markup for device-kept codes', () => {
  let s: TestServer;
  before(async () => { s = await startServer(); });
  after(() => s.close());

  it('/delete carries the hidden list section, the separate remove control and the script; the manual form is unchanged', async () => {
    const r = await get(s.base, '/delete');
    assert.match(r.text, /<script src="\/static\/js\/receipts\.js" defer><\/script>/);
    assert.match(r.text, /<section id="stored-receipts"[^>]*hidden>/);
    assert.match(r.text, /Reports filed from this browser/);
    assert.match(r.text, /<ul class="stored-receipts-list"><\/ul>/);
    assert.match(r.text, /id="forget-receipts">Remove these codes from this device<\/button>/);
    assert.match(r.text, /does <strong>not<\/strong> delete any report/);
    assert.match(r.text, /needs its receipt code, or an email to <a href="mailto:/);
    assert.match(r.text, /<form method="post" action="\/delete" autocomplete="off">\n<input type="hidden" name="step" value="confirm">/);
    assert.match(r.text, /<input id="code" name="code"/);
    assert.match(r.text, /id="delete-page" data-view="form"/);
  });

  it('the confirm and result views carry the hooks receipts.js needs, and no code in a URL', async () => {
    const { filed } = await previewAndFile(s.base, { number: '(214) 555-0150', message: 'Hi Sam, Rory here. Free window cleaning quote this week?', category: 'cleaning' });
    const c = filed.json.receipt as string;
    const confirm = await postForm(s.base, '/delete', { code: c, step: 'confirm' });
    assert.match(confirm.text, /id="delete-page" data-view="confirm"/);
    assert.match(confirm.text, /<form method="post" action="\/delete" autocomplete="off" id="delete-confirm-form">/);
    const done = await postForm(s.base, '/delete', { code: c, step: 'delete' });
    assert.match(done.text, /data-view="result" data-status="deleted"/);
    assert.ok(!done.text.includes(c), 'the result page does not echo the code');
    const again = await postForm(s.base, '/delete', { code: c, step: 'delete' });
    assert.match(again.text, /data-status="already_deleted"/);
  });

  it('/report says the code is saved on this device only when it was (hidden by default)', async () => {
    const r = await get(s.base, '/report');
    assert.match(r.text, /<p class="meta" id="receipt-saved" hidden>The code is also saved in this browser on this device, so you can delete the report later from the <a href="\/delete">delete page<\/a>\. It is still worth keeping a copy somewhere else\.<\/p>/);
    assert.match(r.text, /<p class="receipt" id="receipt"><\/p>/);
    const order = [...r.text.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(order.indexOf('/static/js/receipts.js') < order.indexOf('/static/js/report.js'));
  });

  it('/privacy says where the codes are kept and how to erase them', async () => {
    const r = await get(s.base, '/privacy');
    assert.match(r.text, /<p id="device-codes">Deletion codes are kept only in your browser’s local storage on your own device/);
    assert.match(r.text, /The server never receives or stores these saved copies, except at the moment you use one to delete a report\./);
    assert.match(r.text, /Remove these codes from this device<\/strong> on the <a href="\/delete">delete page<\/a>, or clear this site’s data/);
  });

  it('receipts.js is served and precached by the service worker', async () => {
    const r = await get(s.base, '/static/js/receipts.js');
    assert.equal(r.status, 200);
    assert.match(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), /'\/static\/js\/receipts\.js'/);
  });
});

const PW = process.env.PLAYWRIGHT_CORE || '/tmp/stm-e2e/node_modules/playwright-core';
const CHROME = process.env.CHROME || join(homedir(), '.cache/ms-playwright/chromium-1254/chrome-linux64/chrome');
const skip = existsSync(PW) && existsSync(CHROME) ? false : 'needs playwright-core and a Chromium (set PLAYWRIGHT_CORE and CHROME)';

describe('browser: deletion codes kept in localStorage', { skip }, () => {
  let s: TestServer;
  let browser: any;
  before(async () => {
    s = await startServer();
    const { chromium } = createRequire(import.meta.url)(PW);
    browser = await chromium.launch({ executablePath: CHROME, headless: true });
  });
  after(async () => {
    await browser?.close();
    await s?.close();
  });

  async function fileViaUi(page: any, n: number): Promise<string> {
    await page.goto(s.base + '/report');
    await page.click('[data-go="details"]');
    await page.fill('#f-number', `(214) 555-01${String(10 + n)}`);
    await page.fill('#f-message', `Hi Kai, Ellis here. Free fence staining quote number ${n} for homes near you?`);
    await page.click('#details-form button[type="submit"]');
    await page.waitForSelector('[data-step="review"]:not([hidden])');
    await page.click('#file-btn');
    await page.waitForSelector('[data-step="done"]:not([hidden])');
    return (await page.textContent('#receipt'))!.trim();
  }
  const stored = (page: any) => page.evaluate(`JSON.parse(localStorage.getItem('stm.receipts.v1') || '[]')`) as Promise<Entry[]>;

  it('filing saves the code; /delete lists dates only; deleting from the list removes the report and the code', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors: string[] = [];
    const urls: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(e.message));
    context.on('request', (r: any) => urls.push(r.url()));

    // Nothing stored yet: the section stays hidden.
    await page.goto(s.base + '/delete');
    assert.equal(await page.evaluate(`document.getElementById('stored-receipts').hidden`), true);

    const before = countReports(s.app);
    const c1 = await fileViaUi(page, 1);
    assert.equal(await page.isVisible('#receipt-saved'), true, 'completion copy shown');
    const c2 = await fileViaUi(page, 2);
    assert.equal(countReports(s.app), before + 2);
    assert.deepEqual((await stored(page)).map((e) => e.code), [c2, c1]);

    await page.goto(s.base + '/delete');
    assert.equal(await page.isVisible('#stored-receipts'), true);
    assert.equal(await page.locator('.stored-receipts-list li').count(), 2);
    const html = await page.content();
    for (const c of [c1, c2]) {
      assert.ok(!html.includes(c) && !html.includes(c.replace(/-/g, '')), 'a stored code is in the /delete page');
    }
    assert.match((await page.textContent('.stored-receipts-list li'))!, /Filed \w{3} \d{1,2}, \d{4}/);
    assert.equal(await page.isVisible('#code'), true, 'manual form still there');

    // Delete the older one (second row) through the existing confirm flow.
    await page.locator('.stored-receipts-list li').nth(1).locator('button').click();
    await page.waitForSelector('#delete-confirm-form');
    await page.click('#delete-confirm-form button[type="submit"]');
    await page.waitForSelector('[data-status="deleted"]');
    assert.equal(countReports(s.app), before + 1, 'the report is gone');
    assert.equal((await postJson(s.base, '/api/delete', { code: c1 })).json.status, 'already_deleted');
    assert.deepEqual((await stored(page)).map((e) => e.code), [c2]);

    await page.goto(s.base + '/delete');
    assert.equal(await page.locator('.stored-receipts-list li').count(), 1);
    assert.ok(urls.every((u) => !u.includes(c1) && !u.includes(c2) && !/code=/.test(u)), 'a code appeared in a URL');
    assert.deepEqual(await context.cookies(), []);
    assert.deepEqual(errors, []);

    // "Remove these codes from this device" clears the list and deletes nothing.
    await page.click('#forget-receipts');
    assert.equal(await page.isVisible('#stored-receipts'), false);
    assert.match((await page.textContent('#forget-status'))!, /No report was deleted/);
    assert.deepEqual(await stored(page), []);
    assert.equal((await postJson(s.base, '/api/delete', { code: c2 })).json.status, 'deleted', 'the report was still there');
    await context.close();
  });

  it('a manual deletion of a stored code also removes it from the list', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const c = await fileViaUi(page, 3);
    await page.goto(s.base + '/delete');
    await page.fill('#code', c.toLowerCase().replace(/-/g, ' '));
    await page.click('form[action="/delete"]:not([hidden]) button[type="submit"]');
    await page.waitForSelector('#delete-confirm-form');
    await page.click('#delete-confirm-form button[type="submit"]');
    await page.waitForSelector('[data-status="deleted"]');
    assert.deepEqual(await stored(page), []);
    await context.close();
  });

  it('without localStorage the site behaves as before: the code is shown once, no errors', async () => {
    const context = await browser.newContext();
    await context.addInitScript(`Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } });`);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(e.message));
    const c = await fileViaUi(page, 4);
    assert.match(c, /^[A-Z0-9]{4}(-[A-Z0-9]{4}){7}$/);
    assert.equal(await page.isVisible('#receipt-saved'), false, 'must not claim the code was saved');
    await page.goto(s.base + '/delete');
    assert.equal(await page.isVisible('#stored-receipts'), false);
    assert.equal(await page.isVisible('#code'), true);
    assert.deepEqual(errors, []);
    await context.close();
  });
});
