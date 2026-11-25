// Gate 7 (web hygiene), enforced on files: no third-party script, analytics
// tag, beacon, pixel or remote asset may appear in anything under public/
// or in the page templates. Runs in CI on every push (.github/workflows/ci.yml),
// so a future PR cannot quietly add one.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';

const root = new URL('..', import.meta.url).pathname;
const walk = (d: string): string[] =>
  existsSync(d) ? readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)])) : [];

// Our own shipped front-end code and page templates.
const OWN = [...walk(join(root, 'public')).filter((f) => !f.includes('/public/static/vendor/')), ...walk(join(root, 'src')).filter((f) => /\.(ts|html)$/.test(f))];

// The only third-party code we ship: self-hosted OCR, copied by `npm run vendor`.
const VENDOR_ALLOWED = /^public\/static\/vendor\/(?:tesseract\/(?:tesseract|worker)\.min\.js(?:\.LICENSE\.txt)?|tesseract-core\/(?:LICENSE|tesseract-core(?:-(?:relaxedsimd|simd))?(?:-lstm)?\.(?:js|wasm|wasm\.js))|lang\/eng\.traineddata\.gz)$/;
// Pre-compressed siblings written by `npm run vendor` (see test/static-compression.test.ts).
const stripVariant = (rel: string) => rel.replace(/\.(?:br|gz)$/, (m) => (rel.endsWith('traineddata.gz') ? m : ''));

const TRACKERS =
  /google-analytics|googletagmanager|gtag\(|\bga\(|_gaq|plausible|matomo|piwik|segment\.(?:io|com)|analytics\.js|mixpanel|hotjar|facebook\.net|fbq\(|connect\.facebook|clarity\.ms|sentry|datadog|newrelic|nr-data|cloudflareinsights|beacon\.min\.js|posthog|amplitude|heap(?:analytics)?\.|fullstory|logrocket|intercom|hubspot|doubleclick|adsbygoogle|quantserve|scorecardresearch|tiktok|snap\.licdn|bat\.bing/i;

describe('public assets: no third-party scripts or analytics', () => {
  it('found the files to check', () => {
    assert.ok(OWN.some((f) => f.endsWith('public/static/js/report.js')));
    assert.ok(OWN.some((f) => f.endsWith('public/static/css/app.css')));
  });
  it('no analytics or tracking vendor is referenced in our code or templates', () => {
    for (const f of OWN) assert.ok(!TRACKERS.test(readFileSync(f, 'utf8')), `tracking reference in ${relative(root, f)}`);
  });
  it('front-end code loads nothing from another origin and sends no beacons', () => {
    for (const f of OWN.filter((f) => f.includes('/public/'))) {
      const t = readFileSync(f, 'utf8');
      const rel = relative(root, f);
      assert.ok(!/(?:src|href|url\(|import\(|fetch\(|importScripts\()\s*["']?\s*(?:https?:)?\/\//i.test(t), `remote load in ${rel}`);
      assert.ok(!/@import/i.test(t), `CSS @import in ${rel}`);
      assert.ok(!/sendBeacon|new Image\(\)|XMLHttpRequest|WebSocket|EventSource|RTCPeerConnection/.test(t), `beacon or extra channel in ${rel}`);
    }
  });
  it('page templates only emit same-origin script tags from an explicit allow-list', () => {
    const allowed = new Set(['/static/js/ocr-extract.js', '/static/js/optout.js', '/static/js/pwa.js', '/static/js/receipts.js', '/static/js/report.js', '/static/vendor/tesseract/tesseract.min.js']);
    for (const f of OWN.filter((f) => f.includes('/src/'))) {
      const t = readFileSync(f, 'utf8');
      for (const m of t.matchAll(/['"](\/static\/[^'"]+\.js)['"]/g)) assert.ok(allowed.has(m[1]!), `unexpected script ${m[1]} in ${relative(root, f)}`);
      assert.ok(!/<script[^>]*src=["']?(?:https?:)?\/\//i.test(t), `remote script tag in ${relative(root, f)}`);
      assert.ok(!/<(?:iframe|img)[^>]*src=["']?(?:https?:)?\/\//i.test(t), `remote frame or pixel in ${relative(root, f)}`);
    }
  });
  it('vendored third-party files are exactly the self-hosted OCR bundle', () => {
    for (const f of walk(join(root, 'public/static/vendor'))) {
      const rel = relative(root, f);
      assert.match(stripVariant(rel), VENDOR_ALLOWED, `unexpected vendored file: ${rel}`);
    }
  });
  it('the OCR loader points every path at this origin (the library defaults to a CDN)', () => {
    const js = readFileSync(join(root, 'public/static/js/report.js'), 'utf8');
    assert.match(js, /workerPath: '\/static\/vendor\/tesseract\/worker\.min\.js'/);
    assert.match(js, /corePath: '\/static\/vendor\/tesseract-core\/'/);
    assert.match(js, /langPath: '\/static\/vendor\/lang'/);
  });
});
