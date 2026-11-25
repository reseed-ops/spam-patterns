// Privacy, project and offline pages in Spanish and Vietnamese, including the
// variants the default test config does not render (trusted proxy, flag
// results, official instance URL), and the language-preference disclosure.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { loadConfig } from '../src/config.ts';
import { FLAG_REASONS } from '../src/filing.ts';
import { DICT } from '../src/i18n/index.ts';
import { MISSES, withLang } from '../src/i18n.ts';
import { LANGUAGE_PREF_TEXT, offlinePage, privacyPage, projectPage, type PageCtx } from '../src/pages.ts';
import { TEST_KEY, get, postForm, startServer, type TestServer } from './helpers.ts';

const base = loadConfig({ STM_HMAC_KEY: TEST_KEY });
const plain: PageCtx = { cfg: base, paused: false };
const proxied: PageCtx = { cfg: { ...base, trustedProxies: ['10.0.0.1'] }, paused: false };
const official: PageCtx = { cfg: { ...base, officialInstanceUrl: 'https://spampatterns.com' }, paused: false };

/** fileFlag's messages (src/filing.ts), all translated for the /flag form. */
const FLAG_MESSAGES = [
  'Choose a reason.',
  'Tell us which page or pattern you mean.',
  'Keep details under 2,000 characters.',
  'Contact is too long.',
  'Thank you. Your flag was saved privately for the maintainer. Flagged material is reviewed and may be removed from public views while it is reviewed. Your flag is not published.',
];

describe('i18n: privacy, project, offline variants', () => {
  for (const lang of ['es', 'vi'] as const) {
    it(`${lang}: every variant renders with no missing keys`, () => {
      MISSES.clear();
      withLang(lang, '/privacy', null, () => {
        privacyPage(plain);
        privacyPage(proxied);
        privacyPage(proxied, { ok: true, message: 'x' });
        privacyPage(plain, { ok: false, message: 'x' });
        projectPage(plain);
        projectPage(official);
        offlinePage(plain);
      });
      assert.deepEqual([...MISSES], []);
    });

    it(`${lang}: flag reasons and fileFlag messages have entries`, () => {
      for (const [, label] of FLAG_REASONS) assert.ok(DICT[label]?.[lang], label);
      for (const m of FLAG_MESSAGES) assert.ok(DICT[m]?.[lang], m);
    });
  }

  it('the trusted-proxy variant translates the connection-dedup sentences', () => {
    const html = withLang('es', '/privacy', null, () => privacyPage(proxied));
    assert.ok(html.includes('desde la misma conexión en un plazo de 7 días'));
    assert.ok(html.includes('VPN'));
  });

  it('the official instance URL stays as given', () => {
    const html = withLang('vi', '/project', null, () => projectPage(official));
    assert.ok(html.includes('<a href="https://spampatterns.com">https://spampatterns.com</a>'));
  });

  it('the privacy page discloses the stored language preference, right after the service worker paragraph', () => {
    const html = privacyPage(plain);
    const at = html.indexOf('<p id="offline-files">');
    const next = html.indexOf('<p', at + 1);
    assert.ok(at > 0);
    assert.ok(html.startsWith('<p id="language-pref">If you choose a language with', next));
    assert.ok(html.includes(`<p id="language-pref">${LANGUAGE_PREF_TEXT}</p>`));
    assert.match(LANGUAGE_PREF_TEXT, /local storage/);
    assert.match(LANGUAGE_PREF_TEXT, /stm-lang/);
    assert.match(LANGUAGE_PREF_TEXT, /never sent to the server/);
    assert.ok(html.includes('There are no accounts, cookies, analytics, tracking pixels, or third-party scripts.'));
    for (const lang of ['es', 'vi'] as const) {
      const tr = withLang(lang, '/privacy', null, () => privacyPage(plain));
      assert.ok(tr.includes(`<p id="language-pref">${DICT[LANGUAGE_PREF_TEXT]![lang]}</p>`), lang);
      assert.match(tr, /stm-lang/);
    }
  });
});

describe('i18n: POST /flag', () => {
  let s: TestServer;
  before(async () => {
    s = await startServer();
  });
  after(async () => {
    await s?.close();
  });

  it('an invalid flag shows the error in the page language', async () => {
    const es = await postForm(s.base, '/flag?lang=es', { reason: 'personal_info', target: '' });
    assert.equal(es.status, 400);
    assert.ok(es.text.includes('<html lang="es">'));
    assert.ok(es.text.includes(`<p>${DICT['Tell us which page or pattern you mean.']!.es}</p>`));
    const vi = await postForm(s.base, '/flag?lang=vi', { reason: 'nope', target: 'x' });
    assert.equal(vi.status, 400);
    assert.ok(vi.text.includes(`<p>${DICT['Choose a reason.']!.vi}</p>`));
  });

  it('a filed flag shows the thank-you in the page language', async () => {
    const r = await postForm(s.base, '/flag?lang=vi', { reason: 'other', target: '/patterns/x' });
    assert.equal(r.status, 200);
    assert.ok(r.text.includes(DICT[FLAG_MESSAGES[4]!]!.vi));
  });

  for (const path of ['/privacy', '/project', '/offline', '/no-such-page']) {
    it(`${path}: no missing keys in es and vi`, async () => {
      for (const lang of ['es', 'vi']) {
        MISSES.clear();
        await get(s.base, `${path}?lang=${lang}`);
        assert.deepEqual([...MISSES], [], `${path}?lang=${lang}`);
      }
    });
  }
});
