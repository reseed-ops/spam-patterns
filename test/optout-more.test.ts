// /opt-out: the Google and "More places to opt out" sections. Information
// only: every entry renders with its exact checked URL in all three
// languages, routes that failed checking are not linked, and nothing here
// reaches the email builder.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { DICT } from '../src/i18n/index.ts';
import { GOOGLE_OPT_OUTS, MORE_OPT_OUTS, OPT_OUT_SITES, type GuideEntry } from '../src/pages.ts';
import { get, startServer, type TestServer } from './helpers.ts';

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** The HTML between <h2 id="{id}"> and the next <h2> (or the end of the prose). */
function section(html: string, id: string): string {
  const start = html.indexOf(`<h2 id="${id}">`);
  assert.ok(start > 0, `section #${id}`);
  const rest = html.slice(start + 1);
  const end = rest.search(/<h2 |<\/div>\s*<\/main>|This page collects no information|Esta página no recopila|Trang này không thu thập/);
  return end > 0 ? rest.slice(0, end) : rest;
}

const SECTIONS: [string, string, GuideEntry[]][] = [
  ['google', 'google', GOOGLE_OPT_OUTS],
  ['more', 'more', MORE_OPT_OUTS],
];

describe('/opt-out: Google and More places to opt out', () => {
  let s: TestServer;
  before(async () => {
    s = await startServer();
  });
  after(async () => {
    await s?.close();
  });

  it('the data lists the checked URLs exactly', () => {
    assert.deepEqual(
      GOOGLE_OPT_OUTS.flatMap((e) => e.links.map((l) => l.url)),
      [
        'https://support.google.com/maps/answer/15439776',
        'https://myactivity.google.com/results-about-you',
        'https://support.google.com/websearch/answer/9673730',
        'https://myadcenter.google.com/',
        'https://myaccount.google.com/activitycontrols',
        'https://myactivity.google.com/product/youtube',
        'https://myaccount.google.com/activitycontrols/location',
      ],
    );
    assert.deepEqual(
      MORE_OPT_OUTS.flatMap((e) => e.links.map((l) => l.url)),
      [
        'https://www.equifax.com/personal/credit-report-services/credit-freeze/',
        'https://www.experian.com/help/credit-freeze/',
        'https://www.innovis.com/personal/securityFreeze',
        'https://consumer.ftc.gov/articles/credit-freezes-and-fraud-alerts',
        'https://www.verizon.com/support/verizon-custom-experience-programs-faqs/',
        'https://att.com/PrivacyChoices',
        'https://www.t-mobile.com/privacy-center/dashboard',
        'https://www.samsung.com/us/support/answer/ANS10010616/',
        'https://account.microsoft.com/privacy/ad-settings',
        'https://maps.apple.com/imagecollection',
        'https://help.venmo.com/cs/articles/changing-payment-privacy-hiding-past-payments-vhel191',
        'https://support.strava.com/en-us/articles/15402012-how-do-i-edit-my-map-visibility-on-strava',
      ],
    );
    for (const e of [...GOOGLE_OPT_OUTS, ...MORE_OPT_OUTS]) {
      assert.ok(e.text.length < 400, `${e.id}: short`);
      for (const l of e.links) assert.match(l.url, /^https:\/\//, e.id);
    }
  });

  it('both sections render below Other opt-outs, with each entry, its text and its exact links (English)', async () => {
    const { text } = await get(s.base, '/opt-out');
    const other = text.indexOf('<h2 id="other">');
    const google = text.indexOf('<h2 id="google">Google</h2>');
    const more = text.indexOf('<h2 id="more">More places to opt out</h2>');
    assert.ok(other > 0 && google > other && more > google, 'order: other, google, more');
    for (const [id, prefix, list] of SECTIONS) {
      const html = section(text, id);
      assert.equal(html.match(/<li id=/g)?.length, list.length, `${id}: one item per entry`);
      for (const e of list) {
        assert.ok(html.includes(`<li id="${prefix}-${e.id}"><h3>${escHtml(e.name)}</h3><p>${escHtml(e.text)}</p>`), e.id);
        for (const l of e.links) assert.ok(html.includes(`<a href="${escHtml(l.url)}">${escHtml(l.label)}</a>`), `${e.id}: ${l.url}`);
      }
    }
    const apple = section(text, 'more');
    assert.ok(apple.includes('<a href="mailto:MapsImageCollection@apple.com">MapsImageCollection@apple.com</a>'));
    assert.match(section(text, 'more'), /A freeze is not an opt-out, it is a lock/);
    assert.match(section(text, 'more'), /until you lift it yourself/);
  });

  for (const [lang, heading, name] of [
    ['es', 'Más lugares donde darse de baja', 'Difuminar su casa en Google Maps (Street View)'],
    ['vi', 'Những nơi khác để từ chối chia sẻ dữ liệu', 'Làm mờ nhà bạn trên Google Maps (Street View)'],
  ] as const) {
    it(`both sections render translated with the same links (?lang=${lang})`, async () => {
      const { text } = await get(s.base, `/opt-out?lang=${lang}`);
      assert.ok(text.includes(`<h2 id="more">${heading}</h2>`), heading);
      assert.ok(text.includes(`<li id="google-street-view"><h3>${name}</h3>`), name);
      for (const [id, prefix, list] of SECTIONS) {
        const html = section(text, id);
        for (const e of list) {
          const tr = DICT[e.text]?.[lang];
          assert.ok(tr, `${e.id}: ${lang} text`);
          assert.ok(html.includes(`<li id="${prefix}-${e.id}"><h3>${escHtml(DICT[e.name]![lang]!)}</h3><p>${escHtml(tr)}</p>`), `${lang} ${e.id}`);
          for (const l of e.links) {
            const label = DICT[l.label]?.[lang];
            assert.ok(label, `${lang} label ${l.label}`);
            assert.ok(html.includes(`<a href="${escHtml(l.url)}">${escHtml(label)}</a>`), `${lang} ${e.id}: ${l.url}`);
          }
        }
      }
    });
  }

  it('services left out for failing verification are not linked, in any language', async () => {
    for (const lang of ['', '?lang=es', '?lang=vi']) {
      const { text } = await get(s.base, `/opt-out${lang}`);
      assert.ok(!/href="[^"]*(transunion\.com|facebook\.com|meta\.com|lg\.com|roku\.com|bing\.com)/i.test(text), lang || 'en');
    }
    const { text } = await get(s.base, '/opt-out');
    assert.match(text, /LG and Roku TV settings, Meta \(Facebook\) ad settings and Bing’s removal request could not be checked automatically/);
  });

  it('none of the entries is in the email builder, and the page has no inline script', async () => {
    const { text } = await get(s.base, '/opt-out');
    assert.equal(text.match(/<option value=/g)?.length, OPT_OUT_SITES.length);
    for (const e of [...GOOGLE_OPT_OUTS, ...MORE_OPT_OUTS]) assert.ok(!text.includes(`<option value="${e.id}"`), e.id);
    assert.doesNotMatch(text, /<script(?![^>]*\ssrc=)[^>]*>/i);
    assert.doesNotMatch(text, /\son[a-z]+="/i);
  });
});
