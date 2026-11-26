// /opt-out: "More data brokers" and "Stop it coming back" (doing what the
// paid removal services do, for free). Information only: every entry renders
// with its exact checked URL in all three languages, routes that failed
// checking are not linked, nothing reaches the email builder, and the
// re-check reminder is a calendar file built in the browser (optout.js).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import vm from 'node:vm';
import { DICT } from '../src/i18n/index.ts';
import { KEEP_OFF, MORE_BROKERS, OPT_OUT_SITES, RECHECK_FILENAME, WORK_BROKERS, type GuideEntry } from '../src/pages.ts';
import { get, startServer, type TestServer } from './helpers.ts';

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** The HTML between <h2 id="{id}"> and the next <h2> (or the end of the prose). */
function section(html: string, id: string): string {
  const start = html.indexOf(`<h2 id="${id}">`);
  assert.ok(start > 0, `section #${id}`);
  const rest = html.slice(start + 1);
  const end = rest.search(/<h2 |This page collects no information|Esta página no recopila|Trang này không thu thập/);
  return end > 0 ? rest.slice(0, end) : rest;
}

const SECTIONS: [string, string, GuideEntry[]][] = [
  ['brokers', 'broker', [...MORE_BROKERS, ...WORK_BROKERS]],
  ['keep-off', 'keep', KEEP_OFF],
];

/** Sites left out because they failed verification; never linked, in any language. */
const LEFT_OUT = /href="https?:\/\/(?:[a-z0-9-]+\.)*(truepeoplesearch|fastpeoplesearch|familytreenow|usphonebook|zabasearch|radaris|nuwber|peoplefinders|peekyou|facebook|instagram|x|twitter)\.com/i;

describe('/opt-out: More data brokers and Stop it coming back', () => {
  let s: TestServer;
  before(async () => {
    s = await startServer();
  });
  after(async () => {
    await s?.close();
  });

  it('the data lists the checked URLs exactly', () => {
    const urls = (l: GuideEntry[]) => l.flatMap((e) => e.links.map((x) => x.url));
    assert.deepEqual(urls(MORE_BROKERS), [
      'https://checkpeople.com/opt-out',
      'https://thatsthem.com/optout',
      'https://pipl.com/personal-information-removal-request',
      'https://www.acxiom.com/optout/',
      'https://consumer.risk.lexisnexis.com/opt',
    ]);
    assert.deepEqual(urls(WORK_BROKERS), [
      'https://www.zoominfo.com/trust-center/your-privacy',
      'https://www.lusha.com/privacy-center/request-removal/',
      'https://www.apollo.io/privacy-policy/remove',
    ]);
    assert.deepEqual(urls(KEEP_OFF), [
      'https://duckduckgo.com/duckduckgo-help-pages/email-protection/what-is-duckduckgo-email-protection',
      'https://relay.firefox.com/',
      'https://simplelogin.io/pricing/',
      'https://support.google.com/voice/answer/115061',
      'https://www.privacy.com/pricing',
      'https://justdeleteme.xyz/',
      'https://haveibeenpwned.com/',
      'https://www.linkedin.com/help/linkedin/answer/a1337839',
      'https://support.tiktok.com/en/account-and-privacy/account-privacy-settings',
      'https://joindeleteme.com/permission-slip/',
      'https://www.techsafety.org/address-confidentiality-programs',
    ]);
    for (const e of [...MORE_BROKERS, ...WORK_BROKERS, ...KEEP_OFF]) {
      assert.ok(e.text.length < 400, `${e.id}: short`);
      for (const l of e.links) assert.match(l.url, /^https:\/\//, e.id);
    }
  });

  it('brokers sit right after the people-search list; Stop it coming back comes near the end (English)', async () => {
    const { text } = await get(s.base, '/opt-out');
    const at = (needle: string) => {
      const i = text.indexOf(needle);
      assert.ok(i > 0, needle);
      return i;
    };
    assert.ok(at('id="site-list"') < at('<h2 id="brokers">More data brokers</h2>'));
    assert.ok(at('<h2 id="brokers">') < at('<h2 id="other">'), 'brokers before Other opt-outs');
    assert.ok(at('<h2 id="more">') < at('<h2 id="keep-off">Stop it coming back</h2>'), 'keep-off after More places');
    assert.ok(at('<h2 id="keep-off">') < at('This page collects no information'), 'keep-off before the closing line');
  });

  it('each entry renders with its text and exact links (English)', async () => {
    const { text } = await get(s.base, '/opt-out');
    for (const [id, prefix, list] of SECTIONS) {
      const html = section(text, id);
      assert.equal(html.match(/<li id=/g)?.length, list.length, `${id}: one item per entry`);
      for (const e of list) {
        assert.ok(html.includes(`<li id="${prefix}-${e.id}"><h3>${escHtml(e.name)}</h3><p>${escHtml(e.text)}</p>`), e.id);
        for (const l of e.links) assert.ok(html.includes(`<a href="${escHtml(l.url)}">${escHtml(l.label)}</a>`), `${e.id}: ${l.url}`);
      }
    }
    const brokers = section(text, 'brokers');
    assert.ok(brokers.includes('id="broker-list"') && brokers.includes('id="work-broker-list"'));
    assert.match(brokers, /work-contact databases/);
    assert.match(brokers, /TruePeopleSearch, FastPeopleSearch, FamilyTreeNow, USPhoneBook, ZabaSearch, Radaris, Nuwber and PeopleFinders blocked our automated checks/);
    const keep = section(text, 'keep-off');
    assert.match(keep, /Paid services cannot delete public records, court records or property records either, and neither can this page\. Suppression hides a listing; it does not delete the record\./);
    assert.match(keep, /Facebook, Instagram and X blocked our automated checks/);
    // The reminder: plain advice for everyone, a download link that the script reveals.
    assert.match(keep, /<h3 id="recheck">Check again in three months<\/h3>/);
    assert.match(keep, /Come back to this page in three months/);
    assert.ok(keep.includes(`<a class="btn btn-secondary" id="recheck-ics" href="#recheck" download="${RECHECK_FILENAME}" hidden>Add a reminder to my calendar</a>`));
  });

  for (const [lang, brokers, keep] of [
    ['es', 'Más corredores de datos', 'Evite que vuelva a aparecer'],
    ['vi', 'Thêm các công ty môi giới dữ liệu', 'Ngăn thông tin quay lại'],
  ] as const) {
    it(`both sections render translated with the same links (?lang=${lang})`, async () => {
      const { text } = await get(s.base, `/opt-out?lang=${lang}`);
      assert.ok(text.includes(`<h2 id="brokers">${brokers}</h2>`), brokers);
      assert.ok(text.includes(`<h2 id="keep-off">${keep}</h2>`), keep);
      for (const [id, prefix, list] of SECTIONS) {
        const html = section(text, id);
        for (const e of list) {
          const name = DICT[e.name]?.[lang];
          const tr = DICT[e.text]?.[lang];
          assert.ok(name && tr, `${e.id}: ${lang} name and text`);
          assert.ok(html.includes(`<li id="${prefix}-${e.id}"><h3>${escHtml(name)}</h3><p>${escHtml(tr)}</p>`), `${lang} ${e.id}`);
          for (const l of e.links) {
            const label = DICT[l.label]?.[lang];
            assert.ok(label, `${lang} label ${l.label}`);
            assert.ok(html.includes(`<a href="${escHtml(l.url)}">${escHtml(label)}</a>`), `${lang} ${e.id}: ${l.url}`);
          }
        }
      }
      const honest = DICT['Paid services cannot delete public records, court records or property records either, and neither can this page. Suppression hides a listing; it does not delete the record.']![lang]!;
      assert.ok(section(text, 'keep-off').includes(escHtml(honest)));
      assert.ok(text.includes(`>${DICT['Add a reminder to my calendar']![lang]}</a>`));
    });
  }

  it('services left out for failing verification are not linked, in any language', async () => {
    for (const lang of ['', '?lang=es', '?lang=vi']) {
      const { text } = await get(s.base, `/opt-out${lang}`);
      assert.ok(!LEFT_OUT.test(text), lang || 'en');
    }
  });

  it('none of the new entries reach the email builder, and the page has no inline script', async () => {
    const { text } = await get(s.base, '/opt-out');
    const select = text.slice(text.indexOf('<select id="o-site">'), text.indexOf('</select>'));
    assert.equal(select.match(/<option /g)?.length, OPT_OUT_SITES.length);
    for (const e of [...MORE_BROKERS, ...WORK_BROKERS, ...KEEP_OFF]) {
      assert.ok(!select.includes(`value="${e.id}"`), e.id);
      for (const l of e.links) assert.ok(!select.includes(l.url), l.url);
    }
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(text), 'no inline script');
  });
});

// ---- The re-check reminder (.ics) built by optout.js ----

interface Reminder { date: string; ics: string }
const SRC = readFileSync(new URL('../public/static/js/optout.js', import.meta.url), 'utf8');
/** Load optout.js with a page language (a bare document stub with no page elements). */
function load(lang = 'en'): (now: Date) => Reminder {
  const document = { documentElement: { lang }, getElementById: () => null };
  const sandbox: { window: Record<string, any>; document: unknown } = { window: {}, document };
  vm.runInNewContext(SRC, sandbox);
  return sandbox.window.STMOptOut.buildReminderIcs;
}

/** Parse an .ics: unfold, split lines, map property name -> value. */
function parseIcs(ics: string): { lines: string[]; props: Record<string, string> } {
  const lines = ics.replace(/\r\n /g, '').split('\r\n');
  const props: Record<string, string> = {};
  for (const l of lines) {
    const i = l.indexOf(':');
    if (i > 0) props[l.slice(0, i)] = l.slice(i + 1);
  }
  return { lines, props };
}

describe('re-check reminder (optout.js buildReminderIcs)', () => {
  const build = load();

  it('is a valid all-day calendar event three months from the day it is made', () => {
    const now = new Date(2026, 10, 25, 15, 30); // 25 Nov 2026, local time
    const r = build(now);
    assert.equal(r.date, '20270225');
    assert.ok(r.ics.endsWith('\r\n'));
    assert.ok(!/[^\r]\n/.test(r.ics), 'CRLF line endings only');
    const { lines, props } = parseIcs(r.ics);
    assert.equal(lines[0], 'BEGIN:VCALENDAR');
    assert.equal(lines.at(-2), 'END:VCALENDAR');
    assert.equal(props.VERSION, '2.0');
    assert.ok(props.PRODID);
    assert.equal(lines.filter((l) => l === 'BEGIN:VEVENT').length, 1);
    assert.equal(lines.filter((l) => l === 'END:VEVENT').length, 1);
    assert.equal(props['DTSTART;VALUE=DATE'], '20270225');
    assert.equal(props['DTEND;VALUE=DATE'], '20270226');
    assert.match(props.DTSTAMP!, /^\d{8}T\d{6}Z$/);
    assert.match(props.UID!, /@spampatterns\.com$/);
    assert.equal(props.SUMMARY, 'Check people-search sites again');
    assert.match(props.DESCRIPTION!, /https:\/\/spampatterns\.com\/opt-out$/);
    assert.equal(props.URL, 'https://spampatterns.com/opt-out');
    for (const l of r.ics.split('\r\n')) assert.ok(Buffer.byteLength(l) <= 75, `line too long: ${l}`);
  });

  it('clamps to the end of a shorter month and crosses years', () => {
    assert.equal(build(new Date(2026, 10, 30)).date, '20270228'); // 30 Nov -> 28 Feb
    assert.equal(build(new Date(2027, 10, 30)).date, '20280229'); // leap year
    assert.equal(build(new Date(2027, 11, 31)).date, '20280331');
    assert.equal(build(new Date(2026, 0, 1)).date, '20260401');
    const end = parseIcs(build(new Date(2026, 10, 30)).ics).props['DTEND;VALUE=DATE'];
    assert.equal(end, '20270301');
  });

  for (const [lang, summary] of [
    ['es', 'Revisar otra vez los sitios de búsqueda de personas'],
    ['vi', 'Kiểm tra lại các trang tra cứu thông tin cá nhân'],
  ] as const) {
    it(`follows the page language and folds long UTF-8 lines (${lang})`, () => {
      const r = load(lang)(new Date(2026, 10, 25));
      for (const l of r.ics.split('\r\n')) assert.ok(Buffer.byteLength(l) <= 75, `line too long: ${l}`);
      const { props } = parseIcs(r.ics);
      assert.equal(props.SUMMARY, summary);
      assert.equal(props.URL, `https://spampatterns.com/opt-out?lang=${lang}`);
    });
  }
});

// ---- Real browser: sections visible, reminder downloads, no overflow ----

const PW = process.env.PLAYWRIGHT_CORE || '/tmp/stm-e2e/node_modules/playwright-core';
const CHROME = process.env.CHROME || join(homedir(), '.cache/ms-playwright/chromium-1254/chrome-linux64/chrome');
const skip = existsSync(PW) && existsSync(CHROME) ? false : 'needs playwright-core and a Chromium (set PLAYWRIGHT_CORE and CHROME)';

describe('browser: /opt-out brokers and re-check reminder', { skip }, () => {
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
    for (const lang of ['en', 'vi'] as const) {
      it(`shows both sections and downloads a reminder three months out (${label}, ${lang})`, async () => {
        const context = await browser.newContext({ viewport, serviceWorkers: 'block', acceptDownloads: true });
        const page = await context.newPage();
        const problems: string[] = [];
        page.on('console', (m: any) => {
          if ((m.type() === 'error' || m.type() === 'warning') && !/Service Worker registration blocked by Playwright/.test(m.text())) problems.push(m.text());
        });
        page.on('pageerror', (e: Error) => problems.push(e.message));
        await page.goto(s.base + '/opt-out' + (lang === 'en' ? '' : `?lang=${lang}`));
        await page.waitForSelector('#recheck-ics:not([hidden])');
        for (const sel of ['#brokers', '#broker-list', '#work-broker-list', '#keep-off', '#keep-off-list', '#recheck-note']) {
          assert.equal(await page.isVisible(sel), true, sel);
        }
        const hrefs: string[] = await page.$$eval('#broker-list a, #work-broker-list a, #keep-off-list a', (as: any[]) => as.map((a) => a.getAttribute('href')));
        assert.deepEqual(hrefs, [...MORE_BROKERS, ...WORK_BROKERS, ...KEEP_OFF].flatMap((e) => e.links.map((l) => l.url)));

        seen.length = 0;
        const [download] = await Promise.all([page.waitForEvent('download'), page.click('#recheck-ics')]);
        assert.equal(download.suggestedFilename(), RECHECK_FILENAME);
        const ics = readFileSync(await download.path(), 'utf8');
        const { props } = parseIcs(ics);
        const now = new Date();
        const want = new Date(now.getFullYear(), now.getMonth() + 3, Math.min(now.getDate(), new Date(now.getFullYear(), now.getMonth() + 4, 0).getDate()));
        const ymd = `${want.getFullYear()}${String(want.getMonth() + 1).padStart(2, '0')}${String(want.getDate()).padStart(2, '0')}`;
        assert.equal(props['DTSTART;VALUE=DATE'], ymd);
        assert.match(props.URL!, /^https:\/\/spampatterns\.com\/opt-out/);
        assert.deepEqual(seen, [], 'the reminder makes no request to the server');

        const overflow: number = await page.evaluate('document.documentElement.scrollWidth - window.innerWidth');
        assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`);
        assert.deepEqual(problems, []);
        await context.close();
      });
    }
  }
});
