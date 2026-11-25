// Main navigation as tabs: the desktop and mobile navs carry .nav-tabs, list
// the same four links in order, and mark only the current page with
// aria-current="page" (the attribute the active-tab CSS keys on). The footer
// nav stays plain links.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { get, startServer, type TestServer } from './helpers.ts';

const LINKS = [['/', 'Overview'], ['/patterns', 'Patterns'], ['/data', 'Data'], ['/opt-out', 'Opt out']] as const;
const css = readFileSync(new URL('../public/static/css/app.css', import.meta.url), 'utf8');

function navInner(html: string, label: string): string {
  const m = new RegExp(`<nav class="([^"]*)" aria-label="${label.replace(/[()]/g, '\\$&')}">(.*?)</nav>`).exec(html);
  assert.ok(m, `nav "${label}" missing`);
  assert.ok(m[1]!.split(' ').includes('nav-tabs'), `nav "${label}" has class nav-tabs (got "${m[1]}")`);
  return m[2]!;
}

describe('main nav tabs', () => {
  let s: TestServer;
  before(async () => {
    s = await startServer();
  });
  after(async () => {
    await s?.close();
  });

  for (const [current] of LINKS) {
    it(`${current}: both navs list the four links in order, only ${current} is aria-current="page"`, async () => {
      const { status, text } = await get(s.base, current);
      assert.equal(status, 200);
      for (const label of ['Main', 'Main (mobile)']) {
        const expected = LINKS.map(([h, l]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ''}>${l}</a>`).join('');
        assert.equal(navInner(text, label), expected, label);
      }
      assert.ok(text.includes('<nav class="nav-desktop nav-tabs" aria-label="Main">'));
      const header = text.slice(text.indexOf('<header'), text.indexOf('</header>'));
      assert.equal(header.match(/aria-current="page"/g)?.length, 2, 'one per nav, in the header');
    });
  }

  it('the footer nav is untouched: no class, plain links', async () => {
    const { text } = await get(s.base, '/');
    assert.match(text, /<nav aria-label="Footer"><a href="\/privacy">Privacy &amp; threat model<\/a>/);
  });

  it('CSS: the active tab is styled from aria-current, tabs scroll inside the mobile strip, footer gets no tab rules', () => {
    assert.match(css, /\.nav-tabs a\[aria-current="page"\] \{[^}]*background: var\(--tint\)/);
    assert.match(css, /\.nav-tabs a \{[^}]*border-radius: 12px 12px 0 0/);
    assert.match(css, /\.nav-tabs a:hover \{/);
    assert.match(css, /\.nav-tabs a:focus-visible \{/);
    assert.match(css, /\.nav-mobile \.nav-tabs \{[^}]*overflow-x: auto/);
    assert.ok(!/site-footer[^{]*nav-tabs|nav-tabs[^{]*site-footer/.test(css));
  });
});
