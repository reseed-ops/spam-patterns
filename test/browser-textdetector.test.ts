// Browser test of the screenshot reader order (v0.1.1): with a STUBBED
// window.TextDetector, the built-in reader runs first, its output feeds the
// extraction, and no Tesseract asset is fetched; with a stub that throws,
// the Tesseract fallback engages. Needs playwright-core and a Chromium:
//   PLAYWRIGHT_CORE=/path/to/playwright-core CHROME=/path/to/chrome npm test
// (both are also looked for in their usual places on the build machine).
// Without them the suite is skipped, as in CI, and says so.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { startServer, type TestServer } from './helpers.ts';

const PW = process.env.PLAYWRIGHT_CORE || '/tmp/stm-e2e/node_modules/playwright-core';
const CHROME = process.env.CHROME || join(homedir(), '.cache/ms-playwright/chromium-1254/chrome-linux64/chrome');
const available = existsSync(PW) && existsSync(CHROME) && existsSync(join(import.meta.dirname, '../public/static/vendor/tesseract/tesseract.min.js'));
const skip = available ? false : 'needs playwright-core, a Chromium and `npm run vendor` (set PLAYWRIGHT_CORE and CHROME)';

// What a TextDetector might return for an Android Messages screenshot.
// Synthetic, fictional number range.
const DETECTIONS = [
  ['Save (412) 555-0142?', 20, 100],
  ['Saving this number will add a new contact', 20, 130],
  ['Add contact', 20, 180],
  ['Report spam', 220, 181],
  ['Texting with (412) 555-0142 (SMS/MMS)', 40, 260],
  ['Thursday • 9:47 AM', 120, 300],
  ['Hi Jordan, Riley here with a local gutter team! Want a', 30, 360],
  ['free quote this week?', 30, 385],
];

const STUB_OK = `window.__td = 0; window.TextDetector = class { detect() { window.__td++; return Promise.resolve(${JSON.stringify(
  DETECTIONS.map(([t, x, y]) => ({ rawValue: t, boundingBox: { x, y, width: 300, height: 20 } })),
)}); } };`;
const STUB_THROWS = `window.__td = 0; window.TextDetector = class { detect() { window.__td++; throw new Error('stub: not supported on this platform'); } };`;

describe('browser: TextDetector primary reader, Tesseract fallback', { skip }, () => {
  let s: TestServer;
  let browser: any;
  let shot: string;
  before(async () => {
    s = await startServer();
    const { chromium } = createRequire(import.meta.url)(PW);
    browser = await chromium.launch({ executablePath: CHROME, headless: true });
    // A synthetic screenshot, so the Tesseract fallback has something to read.
    const page = await browser.newPage({ viewport: { width: 420, height: 600 } });
    await page.setContent(`<body style="font:22px Arial;background:#fff;padding:20px;width:380px">
      <div style="text-align:center;font-weight:bold">(469) 555-0121</div>
      <div style="background:#e5e5ea;border-radius:16px;padding:12px;margin-top:12px">Hi Jordan, Avery here. Is your roof due for a look? I can give you a free estimate this week.</div></body>`);
    shot = join(mkdtempSync(join(tmpdir(), 'stm-td-')), 'shot.png');
    await page.screenshot({ path: shot });
    await page.close();
  });
  after(async () => {
    await browser?.close();
    await s?.close();
  });

  async function run(stub: string) {
    const context = await browser.newContext();
    await context.addInitScript(stub);
    const page = await context.newPage();
    const vendor: string[] = [];
    const errors: string[] = [];
    context.on('request', (r: any) => { if (r.url().includes('/static/vendor/')) vendor.push(r.url()); });
    page.on('pageerror', (e: Error) => errors.push(e.message));
    await page.goto(s.base + '/report');
    await page.setInputFiles('#shot', shot);
    await page.waitForSelector('[data-step="review"]:not([hidden]), [data-step="details"]:not([hidden]), #shot-error:not([hidden])', { timeout: 90000 });
    const out = {
      step: (await page.evaluate("document.querySelector('[data-step]:not([hidden])').getAttribute('data-step')")) as string,
      calls: (await page.evaluate('window.__td')) as number,
      message: (await page.textContent('#r-message')) ?? '',
      engine: (await page.textContent('#r-engine')) ?? '',
      engineHidden: (await page.evaluate("document.getElementById('r-engine').hidden")) as boolean,
      kept: ((await page.textContent('#r-kept')) ?? '').replace(/\s+/g, ' '),
      vendor,
      errors,
    };
    await context.close();
    return out;
  }

  it('primary path: TextDetector runs, extraction uses its output, no Tesseract asset is fetched', async () => {
    const r = await run(STUB_OK);
    assert.equal(r.calls, 1);
    assert.equal(r.step, 'review');
    assert.deepEqual(r.vendor, [], 'Tesseract assets were fetched');
    assert.match(r.kept, /Area code\s*412/);
    assert.match(r.kept, /Prefix \(next 3 digits\)\s*555/);
    assert.match(r.message, /here with a local gutter team! Want a free quote this week\?/);
    assert.doesNotMatch(r.message, /Report spam|Add contact|Texting with|Saving this number|Thursday|9:47/);
    assert.equal(r.engineHidden, false);
    assert.match(r.engine, /^Read on this device\. Reader: .*TextDetector/);
    assert.deepEqual(r.errors, []);
  });

  it('fallback: a TextDetector that throws hands over to Tesseract', async () => {
    const r = await run(STUB_THROWS);
    assert.equal(r.calls, 1);
    assert.equal(r.step, 'review');
    assert.ok(r.vendor.some((u) => u.endsWith('/tesseract.min.js')), 'tesseract.min.js not loaded');
    assert.ok(r.vendor.some((u) => u.includes('/tesseract-core/')), 'Tesseract core not loaded');
    assert.match(r.kept, /Area code\s*469/);
    assert.match(r.message, /roof due for a look/);
    assert.match(r.engine, /^Read on this device\. Reader: Tesseract/);
    assert.deepEqual(r.errors, []);
  });

  it('no TextDetector at all: Tesseract runs as before', async () => {
    const r = await run('delete window.TextDetector; window.__td = 0;');
    assert.equal(r.step, 'review');
    assert.ok(r.vendor.some((u) => u.endsWith('/tesseract.min.js')));
    assert.match(r.engine, /Tesseract/);
  });
});
