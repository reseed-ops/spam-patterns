// /scams: static guide to common scams, grouped by medium. Linked from the
// footer only (not the main navigation tabs), in the sitemap and counted.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { SITEMAP_PATHS, SITEMAP_XML } from '../src/app.ts';
import { SCAM_MEDIUMS } from '../src/pages.ts';
import { get, startServer, type TestServer } from './helpers.ts';

const FOOTER_LINK = '<a href="/scams">Scams</a>';

function footerOf(html: string): string {
  return html.slice(html.indexOf('<nav aria-label="Footer">'), html.indexOf('</footer>'));
}
function mainNavsOf(html: string): string {
  // The header minus any language switcher (now in the footer), whose flags link to this page.
  return html.slice(html.indexOf('<header'), html.indexOf('</header>')).replace(/<nav class="lang-switch"[\s\S]*?<\/nav>/, '');
}

describe('/scams guide', () => {
  let s: TestServer;
  before(async () => (s = await startServer()));
  after(() => s.close());

  it('renders with a heading, each medium section and the report link', async () => {
    const { status, text } = await get(s.base, '/scams');
    assert.equal(status, 200);
    assert.match(text, /<title>Common scams, by medium · Spam Patterns<\/title>/);
    assert.match(text, /<h1>Common scams, by medium<\/h1>/);
    const main = text.slice(text.indexOf('<main'), text.indexOf('</main>'));
    const headings: Record<(typeof SCAM_MEDIUMS)[number], string> = {
      text: 'Text messages',
      email: 'Email',
      phone: 'Phone calls',
      social: 'Social media and messaging apps',
      mail: 'Paper mail',
      qr: 'QR codes and links',
    };
    for (const id of SCAM_MEDIUMS) {
      assert.ok(main.includes(`<h2 id="${id}">${headings[id]}</h2>`), id);
      // Each medium: 2 to 4 scam types, then a "What to do" line.
      const start = main.indexOf(`<h2 id="${id}">`);
      const end = main.indexOf('<h2 ', start + 1);
      const section = main.slice(start, end === -1 ? undefined : end);
      const items = section.match(/<li>/g)?.length ?? 0;
      assert.ok(items >= 2 && items <= 4, `${id}: ${items} items`);
      assert.match(section, /<strong>What to do:<\/strong>/, id);
    }
    for (const t of ['Package or delivery', 'Unpaid toll', 'Phishing', 'Robocall', 'Family emergency', 'Fake marketplace listing', 'Fake check', 'Sweepstakes', 'Government impersonation', 'Parking meters']) {
      assert.ok(main.includes(t), t);
    }
    assert.ok(main.includes('<a href="/report">file a report here</a>'));
    assert.match(main, /<strong>7726<\/strong>/);
    assert.ok(main.includes('<a href="/junk-mail">'));
    assert.ok(main.includes('<a href="/opt-out">'));
    assert.ok(!/<form/i.test(main), 'no form');
  });

  it('internal links resolve and the only external link is the FTC', async () => {
    const { text } = await get(s.base, '/scams');
    const main = text.slice(text.indexOf('<main'), text.indexOf('</main>'));
    const hrefs = [...main.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!);
    assert.deepEqual(hrefs.filter((h) => /^https?:/.test(h)), ['https://reportfraud.ftc.gov/']);
    for (const h of hrefs.filter((h) => h.startsWith('/'))) assert.equal((await get(s.base, h.split('#')[0]!)).status, 200, h);
  });

  it('has no inline script and loads no page script beyond pwa.js', async () => {
    const { text } = await get(s.base, '/scams');
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(text), 'inline script');
    assert.deepEqual([...text.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]), ['/static/js/lang.js', '/static/js/pwa.js']);
  });

  it('sets no cookie', async () => {
    const r = await fetch(s.base + '/scams');
    assert.equal(r.headers.get('set-cookie'), null);
  });

  it('the footer has a "Scams" link on every page tried; the main navigation does not', async () => {
    for (const p of ['/', '/scams', '/patterns', '/junk-mail', '/opt-out']) {
      const { text } = await get(s.base, p);
      assert.equal(footerOf(text).split(FOOTER_LINK).length - 1, 1, `footer on ${p}`);
      assert.ok(!mainNavsOf(text).includes('/scams'), `main nav on ${p}`);
    }
  });

  it('is in the sitemap and in SITEMAP_PATHS, so /stats counts it', async () => {
    assert.ok((SITEMAP_PATHS as readonly string[]).includes('/scams'));
    assert.ok(SITEMAP_XML.includes('<loc>https://spampatterns.com/scams</loc>'));
    assert.ok((await get(s.base, '/sitemap.xml')).text.includes('<loc>https://spampatterns.com/scams</loc>'));
    const n0 = (JSON.parse((await get(s.base, '/stats')).text) as { pages: Record<string, number> }).pages['/scams'] ?? 0;
    await get(s.base, '/scams');
    const after = JSON.parse((await get(s.base, '/stats')).text) as { pages: Record<string, number> };
    assert.equal(after.pages['/scams'], n0 + 1);
  });
});
