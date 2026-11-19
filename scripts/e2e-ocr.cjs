// Optional manual end-to-end check of the screenshot path in a real browser.
// Not part of `npm test` (needs a browser). Usage:
//   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core CHROME=/path/to/chrome \
//   BASE=http://127.0.0.1:8080 node scripts/e2e-ocr.cjs
// Renders a SYNTHETIC text-message screenshot, uploads it to the local file
// input, waits for in-browser OCR and review, files it, and prints every POST
// so you can confirm only JSON text (never image bytes) left the browser.
// It also prints the bytes transferred for the cold screenshot flow (fresh
// browser context, no cache) and every response's Content-Encoding.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
(async () => {
  const exe = process.env.CHROME;
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const context = await browser.newContext({ viewport: { width: 420, height: 800 } });
  const page = await context.newPage();
  const transfers = [];
  context.on('requestfinished', async (r) => {
    const resp = await r.response();
    const sz = await r.sizes();
    const h = resp ? await resp.allHeaders() : {};
    // Playwright under-reports bodies of scripts a Worker loads itself; the
    // wire Content-Length (encoded bytes) is authoritative when larger.
    const body = Math.max(sz.responseBodySize, Number(h['content-length'] || 0));
    transfers.push({ url: r.url(), bytes: body + sz.responseHeadersSize, enc: h['content-encoding'] || 'identity' });
  });
  // 1. make a synthetic screenshot
  await page.setContent(`<body style="font:22px Arial;background:#fff;padding:20px;width:380px">
   <div style="text-align:center;font-weight:bold">+1 (469) 555-0121</div><div style="text-align:center;color:#666;font-size:16px">Text Message<br>Today 10:03 AM</div>
   <div style="background:#e5e5ea;border-radius:16px;padding:12px;margin-top:12px">Hi Jordan, Avery here. I have been helping a few neighbors over in Fairview lately. Is your roof due for a look? I can give you a free estimate. Would that work for you?</div></body>`);
  await page.screenshot({ path: require('path').join(require('os').tmpdir(), 'stm-e2e-shot.png') });
  const bodies = []; const csp = [];
  page.on('request', r => { if (r.method() === 'POST') bodies.push({ url: r.url(), len: (r.postDataBuffer()||Buffer.alloc(0)).length, ct: r.headers()['content-type'], body: r.postData() }); });
  page.on('console', m => { if (m.type()==='error') csp.push(m.text()); });
  page.on('pageerror', e => csp.push('pageerror: ' + e.message));
  page.on('worker', w => w.on('console', m => { if (m.type()==='error') csp.push('worker: ' + m.text()); }));
  await page.goto((process.env.BASE || 'http://127.0.0.1:8080') + '/report');
  await page.setInputFiles('#shot', require('path').join(require('os').tmpdir(), 'stm-e2e-shot.png'));
  await page.waitForSelector('[data-step="review"]:not([hidden]), [data-step="details"]:not([hidden]), #shot-error:not([hidden])', { timeout: 90000 });
  console.log('scrubbed:', await page.textContent('#r-message'));
  console.log('kept:', (await page.textContent('#r-kept')).replace(/\s+/g,' '));
  await page.click('#file-btn');
  await page.waitForSelector('[data-step="done"]:not([hidden])', { timeout: 15000 });
  console.log('receipt:', await page.textContent('#receipt'), 'url:', page.url());
  if (bodies.some((b) => !/application\/json/.test(b.ct || ''))) throw new Error('non-JSON POST seen');
  for (const b of bodies) console.log('POST', b.url, b.ct, b.len, (b.body||'').slice(0, 160));
  console.log('console errors:', csp);
  await page.waitForTimeout(200);
  const local = transfers.filter((t) => t.url.startsWith('http') && !t.url.startsWith('data:'));
  for (const t of local.sort((a, b) => b.bytes - a.bytes)) console.log('GET', t.bytes, t.enc, t.url.replace(/^https?:\/\/[^/]+/, ''));
  const total = local.reduce((n, t) => n + t.bytes, 0);
  console.log('transferred total:', total, `(${(total / 1e6).toFixed(2)} MB, ${local.length} responses)`);
  await browser.close();
})().catch(e => { console.error('E2E FAIL', e.message); process.exit(1); });
