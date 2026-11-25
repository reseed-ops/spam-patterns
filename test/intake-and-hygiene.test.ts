// Intake pause, abuse caps, config, CSP and web hygiene, no real data.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { CSP } from '../src/app.ts';
import { PLACEHOLDER_KEY, loadConfig } from '../src/config.ts';
import { countReports, get, postJson, previewAndFile, startServer, type TestServer } from './helpers.ts';

const INPUT = { number: '(214) 555-0101', message: 'Free roof quote for your home this week?', category: 'roofing' };
const PAGES = ['/', '/report', '/report/complete', '/delete', '/patterns', '/data', '/privacy', '/methodology', '/project', '/junk-mail', '/opt-out'];

describe('intake pause / read-only mode', () => {
  let s: TestServer;
  before(async () => (s = await startServer({ INTAKE_PAUSED: '1' })));
  after(() => s.close());

  it('refuses previews and filings with the read-only notice', async () => {
    const pv = await postJson(s.base, '/api/preview', INPUT);
    assert.equal(pv.status, 503);
    assert.equal(pv.json.status, 'paused');
    assert.match(pv.json.message, /Reporting is paused/);
    const f = await postJson(s.base, '/api/reports', { ...INPUT, previewHash: 'x', idempotencyKey: 'k'.repeat(30) });
    assert.equal(f.status, 503);
    assert.equal(countReports(s.app), 0);
  });

  it('still serves every page, and the report page shows the notice', async () => {
    for (const p of PAGES) assert.equal((await get(s.base, p)).status, 200, p);
    assert.match((await get(s.base, '/report')).text, /Reporting is paused on this site right now/);
    assert.equal((await get(s.base, '/healthz')).text.includes('"intake":"paused"'), true);
  });

  it('deletion keeps working while intake is paused', async () => {
    const d = await postJson(s.base, '/api/delete', { code: 'Z'.repeat(32) });
    assert.equal(d.status, 404);
  });

  it('flips at runtime with no deploy or restart (pause file)', async () => {
    const s2 = await startServer();
    try {
      assert.equal((await postJson(s2.base, '/api/preview', INPUT)).status, 200);
      const f = join(s2.dataDir, 'INTAKE_PAUSED');
      writeFileSync(f, '');
      assert.equal((await postJson(s2.base, '/api/preview', INPUT)).status, 503);
      unlinkSync(f);
      assert.equal((await postJson(s2.base, '/api/preview', INPUT)).status, 200);
      // env var is read per request as well
      s2.env.INTAKE_PAUSED = 'true';
      assert.equal((await postJson(s2.base, '/api/preview', INPUT)).status, 503);
    } finally {
      await s2.close();
    }
  });
});

describe('abuse and cost caps', () => {
  it('per-IP submission cap', async () => {
    const s = await startServer({ STM_SUBMIT_PER_IP_PER_HOUR: '2' });
    try {
      assert.equal((await previewAndFile(s.base, INPUT)).filed.status, 201);
      assert.equal((await previewAndFile(s.base, { ...INPUT, number: '(305) 555-0102' })).filed.status, 201);
      const third = await previewAndFile(s.base, { ...INPUT, number: '(602) 555-0103' });
      assert.equal(third.filed.status, 429);
      assert.equal(countReports(s.app), 2);
    } finally {
      await s.close();
    }
  });
  it('global daily cap', async () => {
    const s = await startServer({ STM_GLOBAL_DAILY_SUBMISSIONS: '1' });
    try {
      assert.equal((await previewAndFile(s.base, INPUT)).filed.status, 201);
      const second = await previewAndFile(s.base, { ...INPUT, number: '(305) 555-0102' });
      assert.equal(second.filed.status, 503);
      assert.equal(second.filed.json.status, 'daily_cap');
      assert.equal(countReports(s.app), 1);
    } finally {
      await s.close();
    }
  });
  it('rejects oversized bodies and image/multipart uploads everywhere', async () => {
    const s = await startServer();
    try {
      const big = await fetch(s.base + '/api/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'x'.repeat(40_000) }) });
      assert.equal(big.status, 413);
      for (const path of ['/api/preview', '/api/reports', '/report', '/delete', '/upload']) {
        const img = await fetch(s.base + path, { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: Buffer.from([0xff, 0xd8, 0xff, 0xe1]) });
        assert.equal(img.status, 415, path);
        const fd = new FormData();
        fd.append('file', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), 'shot.png');
        const mp = await fetch(s.base + path, { method: 'POST', body: fd });
        assert.equal(mp.status, 415, path);
      }
    } finally {
      await s.close();
    }
  });
});

describe('configuration', () => {
  it('refuses to start without a real HMAC key', () => {
    assert.throws(() => loadConfig({}), /STM_HMAC_KEY is required/);
    assert.throws(() => loadConfig({ STM_HMAC_KEY: PLACEHOLDER_KEY }), /STM_HMAC_KEY is required/);
    assert.throws(() => loadConfig({ STM_HMAC_KEY: 'abc123' }), /at least 64 hex/);
    assert.throws(() => loadConfig({ STM_HMAC_KEY: '0'.repeat(64) }), /non-random/);
  });
  it('.env.example documents every variable the code reads', () => {
    const root = new URL('..', import.meta.url).pathname;
    const example = readFileSync(join(root, '.env.example'), 'utf8');
    const src = readFileSync(join(root, 'src/config.ts'), 'utf8');
    const read = new Set([...src.matchAll(/env(?:\.|\[')([A-Z_]+)/g)].map((m) => m[1]!).concat([...src.matchAll(/int\(env, '([A-Z_]+)'/g)].map((m) => m[1]!)).concat([...src.matchAll(/mailto\(env, '([A-Z_]+)'/g)].map((m) => m[1]!)));
    assert.ok(read.size >= 15, [...read].join(','));
    for (const v of read) assert.match(example, new RegExp(`^${v}=`, 'm'), `${v} missing from .env.example`);
  });
});

describe('web hygiene', () => {
  let s: TestServer;
  before(async () => (s = await startServer()));
  after(() => s.close());

  it('every response carries the strict CSP and privacy headers', async () => {
    for (const p of [...PAGES, '/static/css/app.css', '/nope']) {
      const r = await get(s.base, p);
      assert.equal(r.headers.get('content-security-policy'), CSP, p);
      assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(r.headers.get('set-cookie'), null, 'no cookies');
    }
    assert.ok(!/unsafe-inline|unsafe-eval'|\*|https?:/.test(CSP.replace("'wasm-unsafe-eval'", '')), CSP);
  });

  it('pages load no third-party scripts, styles, images, fonts or frames, and no inline script', async () => {
    for (const p of PAGES) {
      const html = (await get(s.base, p)).text;
      for (const m of html.matchAll(/<(script|link|img|iframe|source|embed|object)\b[^>]*>/gi)) {
        const tag = m[0];
        const url = /(?:src|href)="([^"]*)"/.exec(tag)?.[1] ?? '';
        if (m[1]!.toLowerCase() === 'script') assert.ok(url.startsWith('/static/'), `${p}: ${tag}`);
        if (url) assert.ok(url.startsWith('/') && !url.startsWith('//'), `${p}: external ${tag}`);
      }
      assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), `${p}: inline script`);
      assert.ok(!/\sstyle="/i.test(html), `${p}: inline style blocked by CSP`);
      assert.ok(!/\son[a-z]+="/i.test(html), `${p}: inline event handler`);
    }
  });

  it('no analytics or tracking code anywhere in the shipped source', () => {
    const root = new URL('..', import.meta.url).pathname;
    const files = walk(join(root, 'src')).concat(walk(join(root, 'public/static/js')), walk(join(root, 'public/static/css')));
    const banned = /google-analytics|googletagmanager|gtag\(|plausible|matomo|segment\.(io|com)|mixpanel|hotjar|facebook\.net|fbq\(|clarity\.ms|sentry|datadog|newrelic|cloudflareinsights|posthog|amplitude/i;
    for (const f of files) assert.ok(!banned.test(readFileSync(f, 'utf8')), `tracking reference in ${relative(root, f)}`);
  });

  it('the report script never uploads or stores the screenshot', () => {
    const js = readFileSync(new URL('../public/static/js/report.js', import.meta.url), 'utf8');
    assert.ok(!/FormData|localStorage|sessionStorage|indexedDB|createObjectURL|FileReader|toDataURL/.test(js));
    assert.match(js, /workerBlobURL: false/);
    assert.match(js, /cacheMethod: 'none'/);
    // The only network calls send JSON text, built from the draft fields.
    const posts = [...js.matchAll(/post\('([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(posts)].sort(), ['/api/preview', '/api/reports']);
    assert.ok(!/body:\s*file|send\(file|JSON\.stringify\(file/.test(js));
  });
});

describe('no real report data in the codebase', () => {
  it('the real pilot town never appears in any tracked file', () => {
    const root = new URL('..', import.meta.url).pathname;
    const needle = Buffer.from('Q2Fycm9sbHRvbg==', 'base64').toString(); // kept encoded so this file does not contain it
    const files = walk(root).filter((f) => !f.includes('node_modules') && !f.includes('/.git/') && !f.includes('/public/static/vendor/'));
    assert.ok(files.length > 20);
    for (const f of files) {
      if (statSync(f).size > 2_000_000) continue;
      assert.ok(!readFileSync(f, 'utf8').toLowerCase().includes(needle.toLowerCase()), `found in ${relative(root, f)}`);
    }
  });
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'var') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
