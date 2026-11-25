// v0.1.6: PWA (manifest, service worker; install hint removed in v0.1.8), the /junk-mail guide,
// the logo and the "How it works" diagram. The service worker's runtime
// behavior (registration, offline /report, never serving filing endpoints
// from cache) is exercised in headless Chromium (PWA-STATUS.md); here we
// check what the server sends and what the worker script declares.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { CSP, MANIFEST } from '../src/app.ts';
import { BACKGROUND_COLOR, THEME_COLOR } from '../src/html.ts';
import { DMACHOICE_FEE, FLOW_STEPS } from '../src/pages.ts';
import { get, startServer, type TestServer } from './helpers.ts';

const root = new URL('..', import.meta.url).pathname;
const read = (p: string) => readFileSync(root + p, 'utf8');
const pkg = JSON.parse(read('package.json')) as { version: string };
const SW = read('public/sw.js');
const PAGES = ['/', '/report', '/report/complete', '/patterns', '/data', '/privacy', '/methodology', '/project', '/delete', '/junk-mail', '/opt-out', '/scams', '/offline'];

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): [number, number] {
  const b = readFileSync(file);
  assert.equal(b.subarray(1, 4).toString('latin1'), 'PNG', `${file} is not a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

/** The quoted string entries of a `var NAME = [ ... ];` array in sw.js. */
function swList(name: string): string[] {
  const m = new RegExp(`var ${name} = \\[([\\s\\S]*?)\\];`).exec(SW);
  assert.ok(m, `${name} not found in sw.js`);
  return [...m[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!).concat(/OFFLINE_URL,/.test(m[1]!) ? ['/offline'] : []);
}

describe('PWA: manifest, service worker, icons', () => {
  let s: TestServer;
  before(async () => (s = await startServer()));
  after(() => s.close());

  it('serves the manifest with the right content type and fields', async () => {
    const r = await fetch(s.base + '/manifest.webmanifest');
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'application/manifest+json');
    assert.equal(r.headers.get('content-security-policy'), CSP);
    const m = (await r.json()) as typeof MANIFEST;
    assert.equal(m.name, 'Spam Patterns');
    assert.equal(m.short_name, 'Spam Patterns');
    assert.equal(m.start_url, '/');
    assert.equal(m.scope, '/');
    assert.equal(m.display, 'standalone');
    assert.equal(m.theme_color, THEME_COLOR);
    assert.equal(m.background_color, BACKGROUND_COLOR);
    // Both colors come from the existing palette in app.css.
    const css = read('public/static/css/app.css');
    assert.ok(css.includes(`--bin4: ${THEME_COLOR}`) && css.includes(`--canvas: ${BACKGROUND_COLOR}`));
    const want = [
      ['192x192', 'any'],
      ['512x512', 'any'],
      ['512x512', 'maskable'],
    ];
    assert.deepEqual(
      m.icons.map((i) => [i.sizes, i.purpose]),
      want,
    );
  });

  it('every icon exists, is served as image/png, and has its declared size', async () => {
    const icons = [
      ...MANIFEST.icons.map((i) => [i.src, Number(i.sizes.split('x')[0])] as const),
      ['/static/icons/apple-touch-icon.png', 180] as const,
      ['/static/icons/favicon-32.png', 32] as const,
    ];
    for (const [src, size] of icons) {
      assert.deepEqual(pngSize(root + 'public' + src), [size, size], src);
      const r = await fetch(s.base + src);
      assert.equal(r.status, 200, src);
      assert.equal(r.headers.get('content-type'), 'image/png', src);
    }
  });

  it('serves /sw.js at the root with a JavaScript content type and no long-lived caching', async () => {
    const r = await fetch(s.base + '/sw.js');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') ?? '', /^text\/javascript/);
    assert.equal(r.headers.get('cache-control'), 'no-cache');
    assert.equal(await r.text(), SW);
  });

  it('the cache name carries the release version', () => {
    assert.match(SW, new RegExp(`var VERSION = '${pkg.version.replace(/\./g, '\\.')}';`));
    // Plus a revision for static-file changes within a release.
    assert.match(SW, /var CACHE_REV = \d+;/);
    assert.match(SW, /var CACHE = 'stm-v' \+ VERSION \+ '-r' \+ CACHE_REV;/);
    // Older versions' caches are deleted on activate.
    assert.match(SW, /k\.indexOf\('stm-'\) === 0 && k !== CACHE\) return caches\.delete\(k\)/);
  });

  it('everything precached exists and is served 200', async () => {
    const list = swList('PRECACHE');
    for (const want of ['/offline', '/static/css/app.css', '/static/js/pwa.js', '/static/js/report.js', '/static/js/ocr-extract.js']) assert.ok(list.includes(want), want);
    for (const i of MANIFEST.icons) assert.ok(list.includes(i.src), i.src);
    for (const u of list) assert.equal((await get(s.base, u)).status, 200, u);
  });

  it('the worker never stores POSTs, API endpoints, deletion, JSON, or live-count pages', () => {
    assert.match(SW, /if \(request\.method !== 'GET'\) return;/);
    for (const p of ["'/api/'", "'/delete'", "'/flag'", "'/healthz'", '\\.json$']) assert.ok(SW.includes(p), `neverStore covers ${p}`);
    assert.match(SW, /type\.indexOf\('json'\) === -1/);
    // Only /report is kept as a navigation shell; /, /patterns etc. are not.
    assert.deepEqual(swList('SHELL_PAGES'), ['/report']);
    // The OCR assets report.js fetches sit under /static/, which is cache-first.
    const report = read('public/static/js/report.js');
    for (const p of ['/static/vendor/tesseract/tesseract.min.js', '/static/vendor/tesseract/worker.min.js', '/static/vendor/tesseract-core/', '/static/vendor/lang']) {
      assert.ok(report.includes(`'${p}'`), `report.js loads ${p}`);
    }
    assert.match(SW, /var STATIC_PREFIX = '\/static\/';/);
  });

  it('the CSP was not weakened for the service worker', () => {
    assert.equal(
      CSP,
      "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    );
  });

  it('every page links the manifest, theme color, icons, logo and registration script; no inline script', async () => {
    for (const p of PAGES) {
      const { status, text } = await get(s.base, p);
      assert.ok(status === 200, `${p} ${status}`);
      assert.ok(text.includes('<link rel="manifest" href="/manifest.webmanifest">'), p);
      assert.ok(text.includes(`<meta name="theme-color" content="${THEME_COLOR}">`), p);
      assert.ok(text.includes('<link rel="icon" href="/static/img/logo.svg" type="image/svg+xml">'), p);
      assert.ok(text.includes('<link rel="icon" href="/static/icons/favicon-32.png" type="image/png" sizes="32x32">'), p);
      assert.ok(text.includes('<link rel="apple-touch-icon" href="/static/icons/apple-touch-icon.png">'), p);
      assert.ok(text.includes('<script src="/static/js/pwa.js" defer></script>'), p);
      assert.ok(text.includes('<img class="logo" src="/static/img/logo.svg" alt="" width="32" height="32">Spam Patterns</a>'), p);
      assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(text), `inline script on ${p}`);
      // Footer: junk-mail link; no install hint or button (v0.1.8).
      assert.ok(text.includes('<a href="/junk-mail">Stop junk mail</a>'), p);
      assert.ok(text.includes('<a href="https://github.com/reseed-ops/spam-patterns">GitHub</a>'), `footer GitHub link on ${p}`);
      assert.ok(text.includes('<a href="https://github.com/reseed-ops/spam-patterns">GitHub</a><a href="https://reseed.net">More Reseed apps</a></nav>'), `footer reseed.net link (last, after GitHub) on ${p}`);
      assert.ok(!text.includes('Add Spam Patterns to your home screen'), `install hint on ${p}`);
      assert.ok(!/install-btn|install-hint|Install Spam Patterns/.test(text), `install button on ${p}`);
    }
  });

  it('footer links back to reseed.net as a plain link', async () => {
    const { text } = await get(s.base, '/');
    assert.ok(text.includes('<a href="https://reseed.net">More Reseed apps</a>'));
  });

  it('/project links the public GitHub repo', async () => {
    const { text } = await get(s.base, '/project');
    assert.ok(text.includes('<a href="https://github.com/reseed-ops/spam-patterns">The code is on GitHub.</a>'));
    assert.ok(!text.includes('will appear here once it is public'));
  });

  it('no page pushes installation: no install button, hint or prompt call (v0.1.8)', async () => {
    const { text } = await get(s.base, '/');
    assert.ok(!/<button[^>]*install/i.test(text), 'no install button');
    assert.ok(!/home screen/i.test(text), 'no install hint');
    const js = read('public/static/js/pwa.js');
    assert.match(js, /register\('\/sw\.js', \{ scope: '\/' \}\)/);
    assert.ok(!/\.prompt\(|install-btn|\.hidden/.test(js), 'never shows or triggers an install prompt');
    assert.ok(!/alert\(|confirm\(|setTimeout/.test(js), 'no popups or timed nags');
    const css = read('public/static/css/app.css');
    assert.ok(!/install-(hint|btn)/.test(css), 'no install styles left');
  });

  it('the offline fallback page renders', async () => {
    const { status, text } = await get(s.base, '/offline');
    assert.equal(status, 200);
    assert.match(text, /You’re offline/);
  });
});

describe('/junk-mail guide', () => {
  let s: TestServer;
  before(async () => (s = await startServer()));
  after(() => s.close());

  it('renders every section, with no form and no new script', async () => {
    const { status, text } = await get(s.base, '/junk-mail');
    assert.equal(status, 200);
    for (const id of ['prescreened', 'catalogs', 'one-catalog', 'limits']) assert.ok(text.includes(`id="${id}"`), id);
    assert.match(text, /no single switch at the Postal Service/);
    assert.match(text, /OptOutPrescreen\.com/);
    assert.match(text, /1-888-5-OPT-OUT<\/strong> \(<span class="nowrap">1-888-567-8688<\/span>\)/);
    assert.match(text, /Equifax, Experian, TransUnion and Innovis/);
    assert.match(text, /Type the address yourself/);
    assert.ok(text.includes(`one-time ${DMACHOICE_FEE} online`));
    assert.match(text, /10 years/);
    assert.match(text, /about 80%/);
    assert.match(text, /6 to 8 weeks/);
    assert.match(text, /Current Resident/);
    assert.match(text, /6 weeks to 3 months/);
    assert.ok(!/<form/i.test(text), 'no form');
    const scripts = [...text.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(scripts, ['/static/js/lang.js', '/static/js/pwa.js']);
  });

  it('links only to the named services (checked at build time) and internal pages that resolve', async () => {
    const { text } = await get(s.base, '/junk-mail');
    const main = text.slice(text.indexOf('<main'), text.indexOf('</main>'));
    const hrefs = [...main.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!);
    const external = hrefs.filter((h) => /^https?:/.test(h));
    assert.deepEqual(external.sort(), ['https://www.catalogchoice.org/', 'https://www.dmachoice.org/', 'https://www.paperkarma.com/']);
    // OptOutPrescreen is named, not linked (it refused automated link checks; type it yourself).
    assert.ok(!/href="[^"]*optoutprescreen/i.test(text));
    for (const h of hrefs.filter((h) => h.startsWith('/') && !h.startsWith('/#') && h !== '#main')) {
      assert.equal((await get(s.base, h.split('#')[0]!)).status, 200, h);
    }
  });

  it('is linked from the receipt step and /report/complete', async () => {
    for (const p of ['/report', '/report/complete']) {
      const { text } = await get(s.base, p);
      const path = text.slice(text.indexOf('class="reporter-path"'));
      assert.ok(path.includes('<a href="/junk-mail">How to cut down junk mail</a>'), p);
      // No install line on the receipt or anywhere else (v0.1.8).
      assert.ok(!text.includes('Add Spam Patterns to your home screen'), p);
      assert.ok(!/install-btn|Install Spam Patterns/.test(text), p);
    }
    const r = (await get(s.base, '/report')).text;
    const done = r.slice(r.indexOf('data-step="done"'));
    assert.ok(done.includes('/junk-mail') && done.indexOf('/junk-mail') < done.indexOf('</section>\n</div>'));
  });
});

describe('logo, flow diagram, privacy line', () => {
  let s: TestServer;
  before(async () => (s = await startServer()));
  after(() => s.close());

  it('the logo is a hand-built SVG in the exact palette', async () => {
    const svg = read('public/static/img/logo.svg');
    assert.ok(!/<image|base64|<text/i.test(svg));
    const colors = new Set([...svg.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0].toUpperCase()));
    assert.deepEqual([...colors].sort(), ['#204A73', '#3B6B9B', '#6D98C5', '#A9C5E2', '#FFFFFF']);
    const r = await fetch(s.base + '/static/img/logo.svg');
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/svg+xml');
  });

  it('home has How it works directly under the hero: five text steps, then a report button', async () => {
    const { text } = await get(s.base, '/');
    assert.match(text, /<h2 id="how-h">How it works<\/h2>/);
    const i = text.indexOf('id="how-h"');
    assert.ok(text.indexOf('</section>', text.indexOf('<section class="hero"')) < i, 'after the hero');
    for (const later of ['id="scripts-h"', 'id="geo-h"']) assert.ok(i < text.indexOf(later), later);
    const ol = text.slice(text.indexOf('<ol class="flow-steps" id="flow-steps">'), text.indexOf('</ol>', i));
    assert.equal(ol.split('<li class="flow-step">').length - 1, 5);
    for (const [h, t] of FLOW_STEPS) assert.ok(ol.includes(`<strong class="flow-title">${h}</strong> <span class="flow-text">${t}</span>`), h);
    assert.match(text.slice(text.indexOf('</ol>', i)), /^<\/ol>\n<p class="how-cta"><a class="btn btn-primary" href="\/report">Report a spam text<\/a><\/p>/);
    // One text list, no image diagram to duplicate it.
    assert.ok(!text.includes('flow-diagram.svg') && !text.includes('flow-scroll'));
    assert.ok(!existsSync(root + 'public/static/img/flow-diagram.svg'));
  });

  it('hero: outcome headline, separate button, purpose line, both input paths, scrubbing and deletion', async () => {
    const { text } = await get(s.base, '/');
    const hero = text.slice(text.indexOf('<section class="hero"'), text.indexOf('</section>', text.indexOf('<section class="hero"')));
    assert.match(hero, /<h1>Report a spam text to expose shared scripts, anonymously<\/h1>/);
    assert.match(hero, /<a class="btn btn-primary" href="\/report">Report a spam text<\/a>/);
    assert.match(hero, /Paste the text or use a screenshot\. Screenshots stay on your device, and names, numbers and links are scrubbed automatically before you approve\./);
    assert.match(hero, /It does not block the sender or file a complaint with your carrier or regulators\./);
    assert.match(hero, /Nothing is stored before you approve it, and you can <a href="\/delete">delete a report later<\/a>\./);
  });

  it('empty pilot: an illustrative scrubbed script, what eligible means, and that counts appear immediately', async () => {
    const { text } = await get(s.base, '/');
    const sec = text.slice(text.indexOf('id="scripts-h"'), text.indexOf('</section>', text.indexOf('id="scripts-h"')));
    assert.match(sec, /<span class="example-label">Illustrative example<\/span>[^<]*made up, not a real report/);
    for (const m of ['[recipient name removed]', '[phone number removed]', '[link removed]']) assert.ok(sec.includes(m), m);
    assert.match(sec, /A report is <strong>eligible<\/strong> if it has not been deleted and is not a repeat/);
    assert.match(sec, /Every counted report appears in the area-code counts below as soon as it is filed/);
  });

  it('the steps wrap rather than scroll sideways: stacked by default, a row of five on wide screens', () => {
    const css = read('public/static/css/app.css');
    assert.ok(!css.includes('flow-scroll') && !/min-width: 1100px/.test(css));
    assert.match(css, /\.flow-steps \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
    assert.match(css, /@media \(min-width: 960px\) \{\n  \.flow-steps \{ grid-template-columns: repeat\(5, minmax\(0, 1fr\)\); \}/);
  });

  it('/privacy says what the service worker stores', async () => {
    const { text } = await get(s.base, '/privacy');
    assert.match(text, /service worker stores copies of the app’s own files[^<]*on your device only/);
    assert.match(text, /It stores no report data\. You can remove it by clearing this site’s data/);
  });
});
