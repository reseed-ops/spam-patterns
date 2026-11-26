// /opt-out: people-search opt-out guide with an in-browser email builder.
// Three layers, as in test/receipts.test.ts:
//   1. the builder logic in public/static/js/optout.js, loaded directly;
//   2. the server-rendered page, navigation, sitemap and counter wiring;
//   3. a real browser (playwright-core + Chromium, skipped without them):
//      the form builds the email and mailto, a form-only site shows its
//      link, and nothing the visitor types reaches the server.
// Names and addresses are fictional (example.com).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import vm from 'node:vm';
import { SITEMAP_PATHS, SITEMAP_XML } from '../src/app.ts';
import { DROP_URL, GOOGLE_OPT_OUTS, MORE_OPT_OUTS, OPT_OUT_PRIVACY_LINE, OPT_OUT_SITES, OTHER_OPT_OUTS } from '../src/pages.ts';
import { get, startServer, type TestServer } from './helpers.ts';

interface Email { to: string; subject: string; body: string }
interface Api {
  SUBJECT: string;
  buildEmail(i: { to: string; siteName: string; name: string; url?: string; reply: string }): Email;
  mailtoHref(e: Email): string;
  validate(i: { name: string; url?: string; reply: string }): Record<string, string>;
}
const SRC = readFileSync(new URL('../public/static/js/optout.js', import.meta.url), 'utf8');
function load(): Api {
  const sandbox: { window: Record<string, unknown> } = { window: {} };
  vm.runInNewContext(SRC, sandbox);
  return sandbox.window.STMOptOut as Api;
}
const O = load();

/** Parse a mailto: href back into its parts. */
function parseMailto(href: string): Email {
  assert.ok(href.startsWith('mailto:'), href);
  const [to, query] = href.slice('mailto:'.length).split('?') as [string, string];
  const q: Record<string, string> = {};
  for (const part of query.split('&')) {
    const [k, v] = part.split('=') as [string, string];
    q[k] = decodeURIComponent(v);
  }
  return { to, subject: q.subject!, body: q.body! };
}

const withEmail = OPT_OUT_SITES.find((s) => s.id === 'spokeo')!;
const formOnly = OPT_OUT_SITES.find((s) => !s.email)!;

describe('opt-out email builder (optout.js)', () => {
  const input = { to: withEmail.email!, siteName: withEmail.name, name: 'Avery Q. Example', reply: 'avery+optout@example.com' };

  it('builds to, subject and body for a site with a published email', () => {
    const e = O.buildEmail({ ...input, url: 'https://www.spokeo.com/Avery-Example/Springfield/IL/p123' });
    assert.equal(e.to, 'privacy@spokeo.com');
    assert.equal(e.subject, 'Request to suppress/remove my personal information');
    assert.match(e.body, /^Hello,\r\n\r\nMy name is Avery Q\. Example\. Please suppress or remove my personal information from name search on Spokeo\./);
    assert.match(e.body, /My listing: https:\/\/www\.spokeo\.com\/Avery-Example\/Springfield\/IL\/p123/);
    assert.match(e.body, /replying to avery\+optout@example\.com\./);
    assert.match(e.body, /Thank you,\r\nAvery Q\. Example$/);
    // No legal claims, citations or deadlines.
    assert.ok(!/\b(law|act|CCPA|CPRA|days|statute|section|§)\b/i.test(e.body + e.subject), e.body);
  });

  it('leaves the listing line out when no URL is given', () => {
    for (const url of [undefined, '', '   ']) {
      const e = O.buildEmail({ ...input, url });
      assert.ok(!/listing/i.test(e.body), String(url));
      assert.ok(!/\r\n\r\n\r\n/.test(e.body));
    }
  });

  it('URL-encodes subject and body in the mailto link, and round-trips exactly', () => {
    const e = O.buildEmail({ ...input, name: 'Zoë O’Example & Co', url: 'https://example.com/p?a=1&b=2#x' });
    const href = O.mailtoHref(e);
    assert.ok(href.startsWith('mailto:privacy@spokeo.com?subject='), href);
    const query = href.split('?').slice(1).join('?');
    // Only the two parameters; every reserved character inside them is percent-encoded.
    assert.deepEqual(query.split('&').map((p) => p.split('=')[0]), ['subject', 'body']);
    assert.ok(!/[ \r\n#?]/.test(query), 'no raw spaces, newlines, # or ? in the query');
    assert.ok(query.includes('Request%20to%20suppress%2Fremove%20my%20personal%20information'));
    assert.ok(query.includes('%0D%0A'), 'CRLF line breaks, encoded');
    assert.ok(query.includes('Zo%C3%AB%20O%E2%80%99Example%20%26%20Co'));
    assert.ok(query.includes('https%3A%2F%2Fexample.com%2Fp%3Fa%3D1%26b%3D2%23x'));
    assert.deepEqual(parseMailto(href), { ...e }); // spread: e comes from the vm realm
  });

  it('keeps the mailto link short (well under 2,000 characters at the field limits)', () => {
    const e = O.buildEmail({ ...input, name: 'N'.repeat(100), url: 'https://example.com/' + 'p'.repeat(280), reply: 'r'.repeat(100) + '@example.com' });
    assert.ok(O.mailtoHref(e).length < 2000, String(O.mailtoHref(e).length));
  });

  it('strips line breaks from fields so nothing can inject extra lines or headers', () => {
    const e = O.buildEmail({ ...input, name: 'Avery\r\nBcc: x@example.com' });
    assert.match(e.body, /My name is Avery Bcc: x@example\.com\./);
    assert.ok(!O.mailtoHref(e).slice(0, O.mailtoHref(e).indexOf('?')).includes('Bcc'));
  });

  it('validates name, reply address and an optional listing URL', () => {
    assert.deepEqual(Object.keys(O.validate({ name: 'Avery', reply: 'a@example.com' })), []);
    assert.deepEqual(Object.keys(O.validate({ name: 'Avery', reply: 'a@example.com', url: 'https://example.com/x' })), []);
    const e = O.validate({ name: ' ', reply: 'not-an-email', url: 'example' });
    assert.deepEqual(Object.keys(e).sort(), ['name', 'reply', 'url']);
    assert.ok(O.validate({ name: 'Avery', reply: '' }).reply);
    assert.ok(O.validate({ name: 'Avery', reply: 'a@example.com', url: 'javascript:alert(1)' }).url);
  });

  it('makes no network calls and stores nothing', () => {
    assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|document\.cookie|\.submit\(|new Image/.test(SRC));
  });
});

describe('/opt-out page', () => {
  let s: TestServer;
  before(async () => (s = await startServer()));
  after(() => s.close());

  it('renders the explainer, the builder form, the site list and the privacy line', async () => {
    const { status, text } = await get(s.base, '/opt-out');
    assert.equal(status, 200);
    assert.match(text, /<h1>Opt out of people-search sites<\/h1>/);
    for (const id of ['what', 'limits', 'builder', 'sites', 'optout-app', 'site-list']) assert.ok(text.includes(`id="${id}"`), id);
    assert.match(text, /does not delete the public records underneath/);
    assert.match(text, /Check again every few months/);
    assert.match(text, /That is their process, not ours/);
    assert.match(text, /Use a secondary email address/);
    assert.ok(text.includes(`<a href="${DROP_URL}">Delete Request and Opt-out Platform (DROP)</a>`));
    assert.ok(text.includes(OPT_OUT_PRIVACY_LINE.replace('’', '’')));
    for (const id of ['o-name', 'o-site', 'o-url', 'o-reply', 'o-build', 'o-open']) assert.ok(text.includes(`id="${id}"`), id);
    assert.ok(text.includes('<label for="o-name">Your full name</label>'));
    assert.ok(text.includes('<label for="o-reply">The email address you want the reply sent to</label>'));
    for (const site of OPT_OUT_SITES) {
      assert.ok(text.includes(`<li id="site-${site.id}"><h3>${site.name}</h3>`), site.id);
      assert.ok(text.includes(`<option value="${site.id}"`), site.id);
    }
    assert.match(text, /Also covers TruthFinder, Instant Checkmate, Intelius, USSearch\./);
  });

  it('never posts what the visitor types: no <form>, no form fields with names, no inline script', async () => {
    const { text, headers } = await get(s.base, '/opt-out');
    const main = text.slice(text.indexOf('<main'), text.indexOf('</main>'));
    assert.ok(!/<form\b/i.test(main), 'no form element, so nothing can be submitted');
    assert.ok(!/<(input|select|textarea)\b[^>]*\bname=/i.test(main), 'no named fields');
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(text), 'no inline script');
    assert.deepEqual([...text.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]), ['/static/js/lang.js', '/static/js/pwa.js', '/static/js/optout.js']);
    assert.equal(headers.get('set-cookie'), null);
    const js = await get(s.base, '/static/js/optout.js');
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type') ?? '', /text\/javascript/);
  });

  it('a site with a published email gets a mailto option; a form-only site gets its form link and no mailto', async () => {
    const { text } = await get(s.base, '/opt-out');
    const opt = (id: string) => new RegExp(`<option value="${id}"[^>]*>`).exec(text)![0];
    assert.match(opt(withEmail.id), new RegExp(`data-email="${withEmail.email}"`));
    assert.ok(!/data-email=/.test(opt(formOnly.id)), 'form-only option has no email');
    assert.ok(opt(formOnly.id).includes(`data-form="${formOnly.form}"`));
    const item = text.slice(text.indexOf(`<li id="site-${formOnly.id}">`), text.indexOf('</li>', text.indexOf(`<li id="site-${formOnly.id}">`)));
    assert.ok(item.includes(`<a href="${formOnly.form}">`), item);
    assert.ok(!/mailto:/.test(item), 'no mailto for a form-only site');
    assert.ok(!text.includes('privacy@whitepages.com'), 'unverified address is not published');
  });

  it('every listed site has a verified route, and only those external links appear', async () => {
    for (const site of OPT_OUT_SITES) {
      assert.ok(site.email || site.form, site.id);
      if (site.form) assert.match(site.form, /^https:\/\//);
      if (site.email) assert.match(site.email, /^[a-z]+@[a-z.]+$/);
      assert.ok(site.note.length < 200, site.id);
    }
    const { text } = await get(s.base, '/opt-out');
    const main = text.slice(text.indexOf('<main'), text.indexOf('</main>'));
    const external = [...main.matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]!);
    const allowed = new Set([DROP_URL, ...OPT_OUT_SITES.flatMap((x) => (x.form ? [x.form] : [])), ...OTHER_OPT_OUTS.map((o) => o.url), ...[...GOOGLE_OPT_OUTS, ...MORE_OPT_OUTS].flatMap((e) => e.links.map((l) => l.url))]);
    for (const h of external) assert.ok(allowed.has(h), h);
    // Not listed as live routes: sites whose opt-out pages could not be checked.
    assert.ok(!/href="[^"]*(radaris|veripages|truepeoplesearch|fastpeoplesearch)/i.test(main));
  });

  it('heading reads "The limits of opting out"; the "honest limits" wording is gone (page and description)', async () => {
    const { text } = await get(s.base, '/opt-out');
    assert.ok(text.includes('<h2 id="limits">The limits of opting out</h2>'));
    assert.ok(!/honest limits/i.test(text), 'no "honest limits" anywhere on the page, including the meta description');
    assert.match(text, /<meta name="description" content="[^"]*and the limits of opting out\."/);
    const junk = (await get(s.base, '/junk-mail')).text;
    assert.ok(junk.includes('<h2 id="limits">The limits of opting out</h2>'));
    assert.ok(!/honest limits/i.test(junk));
  });

  it('renders "Other opt-outs" below the site list with each verified entry and its exact link', async () => {
    const { text } = await get(s.base, '/opt-out');
    const at = text.indexOf('<h2 id="other">Other opt-outs</h2>');
    assert.ok(at > text.indexOf('id="site-list"') && at > text.indexOf('id="builder"'), 'after the builder and the site list');
    const section = text.slice(at, text.indexOf('</ul>', at));
    assert.deepEqual(OTHER_OPT_OUTS.map((o) => o.id), ['donotcall', 'dmachoice', 'valpak', 'nai']);
    // The exact URLs that answered 200 to curl when checked; changing one means re-checking it.
    assert.deepEqual(OTHER_OPT_OUTS.map((o) => o.url), [
      'https://www.donotcall.gov/register.html',
      'https://www.dmachoice.org/register.php',
      'https://www.valpak.com/remove-address',
      'https://thenai.org/how-to-opt-out/',
    ]);
    for (const o of OTHER_OPT_OUTS) {
      assert.ok(section.includes(`<li id="other-${o.id}"><h3>${o.name}</h3>`), o.id);
      assert.ok(section.includes(`<a href="${o.url}">${o.urlLabel}</a>`), o.id);
      assert.ok(o.note.length < 260 && o.stops.length < 80, o.id);
    }
    assert.ok(section.includes('<a href="tel:18883821222" class="nowrap">1-888-382-1222</a>'));
    assert.match(section, /charities, political groups, debt collectors and surveys may still call/);
    assert.match(section, /\$8 fee online \(\$9 by mail\) for a 10-year registration/);
    // Unverified routes are not linked anywhere on the page.
    assert.ok(!/href="[^"]*(optoutprescreen|aboutads\.info|youradchoices|moneymailer|valassis|redplum)/i.test(text));
    // Not email routes: the builder dropdown is unchanged.
    for (const o of OTHER_OPT_OUTS) assert.ok(!text.includes(`<option value="${o.id}"`), o.id);
    assert.equal(text.match(/<option value=/g)?.length, OPT_OUT_SITES.length);
  });

  it('is in the sitemap, in SITEMAP_PATHS (so /stats counts it) and in the main navigation', async () => {
    assert.ok((SITEMAP_PATHS as readonly string[]).includes('/opt-out'));
    assert.ok(SITEMAP_XML.includes('<loc>https://spampatterns.com/opt-out</loc>'));
    assert.ok((await get(s.base, '/sitemap.xml')).text.includes('<loc>https://spampatterns.com/opt-out</loc>'));
    for (const p of ['/', '/patterns', '/junk-mail']) {
      const { text } = await get(s.base, p);
      assert.ok(text.includes('<a href="/opt-out">Opt out</a><a href="/data">Data</a></nav>'), p);
    }
    const { text } = await get(s.base, '/opt-out');
    assert.equal(text.match(/<a href="\/opt-out" aria-current="page">Opt out<\/a>/g)?.length, 2, 'desktop and mobile nav');
    const before = (await get(s.base, '/stats')).text;
    const n0 = (JSON.parse(before) as { pages: Record<string, number> }).pages['/opt-out'] ?? 0;
    await get(s.base, '/opt-out');
    const after = JSON.parse((await get(s.base, '/stats')).text) as { pages: Record<string, number> };
    assert.equal(after.pages['/opt-out'], n0 + 1);
  });
});

const PW = process.env.PLAYWRIGHT_CORE || '/tmp/stm-e2e/node_modules/playwright-core';
const CHROME = process.env.CHROME || join(homedir(), '.cache/ms-playwright/chromium-1254/chrome-linux64/chrome');
const skip = existsSync(PW) && existsSync(CHROME) ? false : 'needs playwright-core and a Chromium (set PLAYWRIGHT_CORE and CHROME)';

describe('browser: /opt-out builder', { skip }, () => {
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

  for (const [label, viewport] of [
    ['desktop', { width: 1280, height: 900 }],
    ['phone', { width: 375, height: 740 }],
  ] as const) {
    it(`builds the email, sets the mailto and shows form-only links (${label})`, async () => {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
      const page = await context.newPage();
      const problems: string[] = [];
      // The worker is blocked so it cannot add its own requests to `seen`; that block's own notice is expected.
      page.on('console', (m: any) => {
        if ((m.type() === 'error' || m.type() === 'warning') && !/Service Worker registration blocked by Playwright/.test(m.text())) problems.push(m.text());
      });
      page.on('pageerror', (e: Error) => problems.push(e.message));
      await page.goto(s.base + '/opt-out');
      await page.waitForSelector('#optout-app:not([hidden])');
      seen.length = 0;

      // Validation first.
      await page.click('#o-build');
      assert.equal(await page.isVisible('#e-o-name'), true);
      assert.equal(await page.isVisible('#o-email'), false);

      await page.selectOption('#o-site', withEmail.id);
      await page.fill('#o-name', 'Avery Example');
      await page.fill('#o-url', 'https://www.spokeo.com/Avery-Example/p1');
      await page.fill('#o-reply', 'avery@example.com');
      await page.click('#o-build');
      assert.equal(await page.isVisible('#o-email'), true);
      assert.equal(await page.textContent('#o-to'), withEmail.email);
      assert.equal(await page.textContent('#o-subject'), 'Request to suppress/remove my personal information');
      assert.match((await page.textContent('#o-body'))!, /My listing: https:\/\/www\.spokeo\.com\/Avery-Example\/p1/);
      const href: string = await page.getAttribute('#o-open', 'href');
      const parsed = parseMailto(href);
      assert.equal(parsed.to, withEmail.email);
      assert.match(parsed.body, /Avery Example/);
      assert.equal(await page.textContent('#o-open'), 'Open in my email');

      // Clearing the URL drops the listing line live.
      await page.fill('#o-url', '');
      assert.ok(!/listing/i.test((await page.textContent('#o-body'))!));

      // The button hands the mailto: link to the OS; the page itself stays put.
      await page.click('#o-open');
      await page.waitForTimeout(300);
      assert.ok(page.url().endsWith('/opt-out'), page.url());

      // A form-only site: its form link, no mailto, no build button.
      await page.selectOption('#o-site', formOnly.id);
      assert.equal(await page.isVisible('#o-formonly'), true);
      assert.equal(await page.isVisible('#o-email'), false);
      assert.equal(await page.isVisible('#o-build'), false);
      assert.equal(await page.getAttribute('#o-fo-link', 'href'), formOnly.form);

      // The "Other opt-outs" section renders and every entry is visible.
      await page.locator('#other').scrollIntoViewIfNeeded();
      assert.equal(await page.isVisible('#other'), true);
      for (const o of OTHER_OPT_OUTS) assert.equal(await page.isVisible(`#other-${o.id} a[href="${o.url}"]`), true, o.id);

      // The Google and More sections render and every link is visible.
      for (const [prefix, list] of [['google', GOOGLE_OPT_OUTS], ['more', MORE_OPT_OUTS]] as const) {
        await page.locator(`#${prefix}`).scrollIntoViewIfNeeded();
        assert.equal(await page.isVisible(`#${prefix}`), true, prefix);
        for (const e of list) for (const l of e.links) assert.equal(await page.isVisible(`#${prefix}-${e.id} a[href="${l.url}"]`), true, `${e.id} ${l.url}`);
      }

      // No horizontal overflow at this width.
      const overflow = await page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth');
      assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`);

      assert.deepEqual(seen, [], 'typing and building made no request to the server');
      assert.deepEqual(problems, [], 'no console errors or warnings');
      await context.close();
    });
  }
});
