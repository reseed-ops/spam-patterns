// Interface languages (English, Spanish, Vietnamese): the switcher, ?lang=,
// the stored preference (public/static/js/lang.js), hreflang, dictionary
// integrity and coverage, and that submitted text is never translated.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import vm from 'node:vm';
import { DICTS, DICT, KEEP_ENGLISH } from '../src/i18n/index.ts';
import { MISSES, localizeLinks, t, withLang } from '../src/i18n.ts';
import { textOf } from '../src/html.ts';
import { get, postJson, startServer, type TestServer } from './helpers.ts';

/** Every public HTML page (plus the 404 page). */
export const PAGES = [
  '/',
  '/?view=map',
  '/patterns',
  '/patterns/zzzz-not-a-pattern',
  '/data',
  '/report',
  '/report/complete',
  '/delete',
  '/privacy',
  '/methodology',
  '/project',
  '/junk-mail',
  '/opt-out',
  '/scams',
  '/offline',
  '/no-such-page',
] as const;

/**
 * English that may stay on a translated page: the site's name and owner,
 * plus each section's own list (KEEP_* in src/i18n/*.ts: names of
 * organizations, products, laws and programs, and sample messages).
 */
export const ALLOWED_ENGLISH = ['Spam Patterns', 'Reseed LLC', ...KEEP_ENGLISH].sort((a, b) => b.length - a.length);

/** Common English function words that are not Spanish or Vietnamese words. */
// Letter-aware boundaries: \b would split Vietnamese "toàn" into "to" + "àn".
const ENGLISH_WORDS = /(?<!\p{L})(the|and|your|you|with|this|that|are|for|from|not|is|of|to|or|we|our|it|be|was|will|can|has|have)(?!\p{L})/giu;

/** Visible text and labelling attributes of a page, minus allowed English. */
function translatableText(html: string): string {
  const head = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
  const body = html
    .slice(html.indexOf('<body'))
    .replace(/<svg\b[\s\S]*?<\/svg>/g, '')
    .replace(/<div hidden><div[\s\S]*?<\/main>/, '</main>');
  const attrs = [...body.matchAll(/\s(?:aria-label|title|placeholder|alt)="([^"]*)"/g)].map((m) => m[1]);
  let text = textOf([title, head, ...attrs, body].join(' \n '));
  text = text.replace(/\[[^\]]+\]/g, ' '); // scrub masks stay as stored
  text = text.replace(/\S+@\S+|https?:\/\/\S+|\b[\w.-]+\.(?:com|org|gov|net|info|us|md|json)\b/g, ' ');
  for (const a of ALLOWED_ENGLISH) text = text.split(a).join(' ');
  // The switcher names each language in itself.
  return text.replace(/\bEnglish\b/g, ' ');
}

function englishLeaks(html: string): string[] {
  const text = translatableText(html);
  const out: string[] = [];
  for (const m of text.matchAll(ENGLISH_WORDS)) {
    out.push(text.slice(Math.max(0, m.index - 40), m.index + 40));
  }
  return out;
}

const tags = (s: string) => [...s.matchAll(/<\/?([a-z0-9]+)[^>]*>/gi)].map((m) => m[0].replace(/"[^"]*"/g, '""').replace(/\s+/g, ' ').replace(/^<(\/?[a-z0-9]+).*$/i, '$1'));
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const hrefs = (s: string) => [...s.matchAll(/\shref="([^"]*)"/g)].map((m) => m[1]).sort();

describe('i18n dictionaries', () => {
  it('every entry has Spanish and Vietnamese text with the same placeholders, tags and links as the English', () => {
    const problems: string[] = [];
    for (const [file, dict] of Object.entries(DICTS)) {
      for (const [en, e] of Object.entries(dict)) {
        for (const lang of ['es', 'vi'] as const) {
          const tr = e[lang];
          if (typeof tr !== 'string' || !tr.trim()) problems.push(`${file}: ${lang} missing for ${JSON.stringify(en)}`);
          else {
            if (placeholders(tr).join() !== placeholders(en).join()) problems.push(`${file}: ${lang} placeholders differ for ${JSON.stringify(en)}`);
            if (tags(tr).slice().sort().join() !== tags(en).slice().sort().join()) problems.push(`${file}: ${lang} tags differ for ${JSON.stringify(en)}`);
            if (hrefs(tr).join() !== hrefs(en).join()) problems.push(`${file}: ${lang} links differ for ${JSON.stringify(en)}`);
          }
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  it('no key is defined in more than one dictionary file', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [file, dict] of Object.entries(DICTS)) {
      for (const k of Object.keys(dict)) {
        if (seen.has(k)) dupes.push(`${JSON.stringify(k)} in ${seen.get(k)} and ${file}`);
        else seen.set(k, file);
      }
    }
    assert.deepEqual(dupes, []);
  });

  it('Vietnamese entries use Vietnamese letters (diacritics), not unaccented ASCII', () => {
    const plain: string[] = [];
    for (const [en, e] of Object.entries(DICT)) {
      const words = textOf(e.vi).replace(/\{\w+\}|\[[^\]]+\]/g, '');
      // Any sentence of four or more words needs at least one Vietnamese diacritic.
      if (words.split(/\s+/).length >= 4 && !/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(words)) {
        plain.push(en);
      }
    }
    assert.deepEqual(plain, []);
  });

  it('t() falls back to English, fills placeholders, and records misses', () => {
    MISSES.clear();
    assert.equal(withLang('es', '/', null, () => t('Overview')), 'Resumen');
    assert.equal(withLang('vi', '/', null, () => t('Overview')), 'Tổng quan');
    assert.equal(t('Overview'), 'Overview');
    assert.equal(withLang('es', '/', null, () => t('No such key {n}', { n: 3 })), 'No such key 3');
    assert.ok(MISSES.has('No such key {n}'));
    MISSES.clear();
  });

  it('localizeLinks adds ?lang= to same-site page links and GET forms only', () => {
    const html = '<a href="/">a</a><a href="/patterns#x">b</a><a href="/?range=30&amp;view=map">c</a><a href="https://x.org/">d</a><a href="/static/css/app.css">e</a><a href="mailto:a@b.c">f</a><a href="/?lang=en">g</a><form method="get" action="/"></form><form method="post" action="/delete">';
    const out = localizeLinks(html, 'vi');
    assert.match(out, /<a href="\/\?lang=vi">a<\/a>/);
    assert.match(out, /<a href="\/patterns\?lang=vi#x">b<\/a>/);
    assert.match(out, /<a href="\/\?range=30&amp;view=map&amp;lang=vi">c<\/a>/);
    assert.match(out, /<a href="https:\/\/x\.org\/">d<\/a>/);
    assert.match(out, /<a href="\/static\/css\/app\.css">e<\/a>/);
    assert.match(out, /<a href="\/\?lang=en">g<\/a>/);
    assert.match(out, /<form method="get" action="\/\?lang=vi"><input type="hidden" name="lang" value="vi"><\/form>/);
    assert.match(out, /<form method="post" action="\/delete\?lang=vi">/);
    assert.equal(localizeLinks(html, 'en'), html);
  });
});

describe('i18n pages', () => {
  let s: TestServer;
  before(async () => {
    s = await startServer();
  });
  after(async () => {
    await s?.close();
  });

  for (const path of PAGES) {
    it(`${path}: the switcher has the three flags with labels; hreflang en, es, vi; no inline script; in every language`, async () => {
      for (const lang of ['', 'en', 'es', 'vi']) {
        const url = lang ? `${path}${path.includes('?') ? '&' : '?'}lang=${lang}` : path;
        const { text } = await get(s.base, url);
        const header = text.slice(text.indexOf('<header'), text.indexOf('</header>'));
        assert.ok(!header.includes('lang-switch') && !header.includes('hreflang='), `${url}: no flags in the header`);
        const footer = text.slice(text.indexOf('<footer'), text.indexOf('</footer>'));
        const sw = /<nav class="lang-switch" aria-label="[^"]+">(.*?)<\/nav>/.exec(footer);
        assert.ok(sw, `${url}: switcher in the footer`);
        assert.equal(text.split('class="lang-switch"').length - 1, 1, `${url}: one switcher`);
        const flags = [...sw[1]!.matchAll(/<a href="([^"]*)" hreflang="(\w+)" lang="\w+" aria-label="([^"]+)"[^>]*>(<svg[\s\S]*?<\/svg>)<\/a>/g)];
        assert.deepEqual(flags.map((f) => [f[2], f[3]]), [['en', 'English'], ['es', 'Español'], ['vi', 'Tiếng Việt']], url);
        for (const f of flags) assert.match(f[1]!, new RegExp(`(?:\\?|&amp;)lang=${f[2]}$`), `${url}: flag link carries ?lang=`);
        const current = [...sw[1]!.matchAll(/hreflang="(\w+)"[^>]*aria-current="true"/g)].map((m) => m[1]);
        assert.deepEqual(current, [lang || 'en'], `${url}: one current flag`);
        assert.match(text, new RegExp(`<html lang="${lang || 'en'}">`));
        const p = path.split('?')[0];
        for (const hl of ['en', 'es', 'vi', 'x-default']) {
          const href = `https://spampatterns.com${p}${hl === 'es' || hl === 'vi' ? `?lang=${hl}` : ''}`;
          assert.ok(text.includes(`<link rel="alternate" hreflang="${hl}" href="${href}">`), `${url}: hreflang ${hl}`);
        }
        assert.doesNotMatch(text, /<script(?![^>]*\ssrc=)[^>]*>/i, `${url}: no inline <script>`);
        assert.doesNotMatch(text, /\son[a-z]+="/i, `${url}: no inline event handlers`);
      }
    });
  }

  for (const lang of ['es', 'vi'] as const) {
    for (const path of PAGES) {
      it(`${lang} ${path}: every string is translated`, async () => {
        MISSES.clear();
        const url = `${path}${path.includes('?') ? '&' : '?'}lang=${lang}`;
        const { text } = await get(s.base, url);
        assert.deepEqual([...MISSES], [], `${url}: t() keys with no ${lang} entry`);
        assert.deepEqual(englishLeaks(text), [], `${url}: English left on the page`);
        // Same-site links keep the language.
        const bare = [...text.matchAll(/\s(?:href|action)="(\/(?!static\/|sw\.js|manifest|stats|data\/schema)[^"]*)"/g)].map((m) => m[1]).filter((h) => !/[?&;]lang=/.test(h!)); // ";" for an escaped "&amp;lang="
        assert.deepEqual(bare, [], `${url}: same-site links without ?lang=`);
      });
    }
  }

  it('?lang=es renders Spanish on the home page and on /opt-out', async () => {
    const home = (await get(s.base, '/?lang=es')).text;
    assert.match(home, /<html lang="es">/);
    assert.ok(home.includes('<h1>Reporte un mensaje de spam para sacar a la luz los guiones compartidos, de forma anónima</h1>'));
    assert.ok(home.includes('>Reportar un mensaje de spam</a>'), 'header button');
    assert.ok(home.includes('<a href="/patterns?lang=es">Patrones</a>'), 'nav keeps ?lang=es');
    const opt = (await get(s.base, '/opt-out?lang=es')).text;
    assert.ok(opt.includes('<h1>Darse de baja de los sitios de búsqueda de personas</h1>'));
    assert.ok(opt.includes('>Redactar el correo</h2>'), 'email builder heading');
    assert.ok(opt.includes('id="o-build">Redactar mi correo</button>'), 'email builder button');
    assert.ok(!opt.includes('<h1>Opt out of people-search sites</h1>'));
  });

  it('?lang=vi renders Vietnamese on the home page and on /scams', async () => {
    const home = (await get(s.base, '/?lang=vi')).text;
    assert.match(home, /<html lang="vi">/);
    assert.ok(home.includes('<h1>Báo cáo tin nhắn rác để vạch trần các kịch bản dùng chung, một cách ẩn danh</h1>'));
    const scams = (await get(s.base, '/scams?lang=vi')).text;
    assert.ok(scams.includes('<h1>Các kiểu lừa đảo phổ biến, theo kênh</h1>'));
    assert.ok(scams.includes('Vẫn chỉ vài mánh khóe xuất hiện lặp đi lặp lại'));
  });

  it('default (no ?lang=, nothing stored) is English', async () => {
    const { text } = await get(s.base, '/');
    assert.match(text, /<html lang="en">/);
    assert.match(text, /<a class="btn btn-primary btn-report" href="\/report">Report a spam text<\/a>/);
    assert.match(text, /hreflang="en" lang="en" aria-label="English" title="English" aria-current="true"/);
    assert.ok(text.includes('<a href="/patterns">Patterns</a>'), 'nav links have no ?lang=');
  });

  it('an unknown ?lang= falls back to English', async () => {
    const { text } = await get(s.base, '/?lang=fr');
    assert.match(text, /<html lang="en">/);
  });

  it('API messages follow ?lang=; the scrubbed message (submitted text) is never translated', async () => {
    const input = { number: '(312) 555-0142', message: 'Overview Patterns Data. We buy houses for cash, reply YES.', category: 'home_buying_offer' };
    const en = await postJson(s.base, '/api/preview', input);
    const es = await postJson(s.base, '/api/preview?lang=es', input);
    const vi = await postJson(s.base, '/api/preview?lang=vi', input);
    assert.equal(en.status, 200);
    assert.equal(es.json.preview.scrubbedMessage, en.json.preview.scrubbedMessage);
    assert.equal(vi.json.preview.scrubbedMessage, en.json.preview.scrubbedMessage);
    assert.equal(es.json.preview.kept.areaCode, '312');
    assert.notEqual(es.json.preview.kept.category, en.json.preview.kept.category, 'category label translated');
    const badEn = await postJson(s.base, '/api/preview', { number: '', message: '' });
    const badVi = await postJson(s.base, '/api/preview?lang=vi', { number: '', message: '' });
    assert.equal(badVi.status, 400);
    const enErr = badEn.json.errors as Record<string, string>;
    const viErr = badVi.json.errors as Record<string, string>;
    assert.deepEqual(Object.keys(viErr), Object.keys(enErr));
    for (const k of Object.keys(enErr)) assert.equal(viErr[k], DICT[enErr[k]!]?.vi, `errors.${k} in Vietnamese`);
  });
});

describe('lang.js (stored preference)', () => {
  const src = readFileSync(new URL('../public/static/js/lang.js', import.meta.url), 'utf8');

  function run(search: string, stored: string | null) {
    const store = new Map<string, string>(stored === null ? [] : [['stm-lang', stored]]);
    const replaced: string[] = [];
    const win: Record<string, unknown> = {
      location: { pathname: '/opt-out', search, hash: '#builder', replace: (u: string) => replaced.push(u) },
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
    };
    win.window = win;
    vm.runInNewContext(src, win);
    return { stored: store.get('stm-lang') ?? null, replaced };
  }

  it('nothing stored and no ?lang=: stays English, stores nothing', () => {
    assert.deepEqual(run('', null), { stored: null, replaced: [] });
  });
  it('a stored Spanish or Vietnamese preference reopens the page with ?lang=', () => {
    assert.deepEqual(run('', 'es').replaced, ['/opt-out?lang=es#builder']);
    assert.deepEqual(run('?range=30', 'vi').replaced, ['/opt-out?range=30&lang=vi#builder']);
  });
  it('a stored English preference does nothing', () => {
    assert.deepEqual(run('', 'en'), { stored: 'en', replaced: [] });
  });
  it('?lang= wins and is stored, including a switch back to English', () => {
    assert.deepEqual(run('?lang=vi', 'es'), { stored: 'vi', replaced: [] });
    assert.deepEqual(run('?lang=en', 'vi'), { stored: 'en', replaced: [] });
  });
  it('an unknown ?lang= or stored value is ignored', () => {
    assert.deepEqual(run('?lang=fr', null), { stored: null, replaced: [] });
    assert.deepEqual(run('', 'fr'), { stored: 'fr', replaced: [] });
  });
  it('works without localStorage', () => {
    const win: Record<string, unknown> = { location: { pathname: '/', search: '', hash: '', replace: () => assert.fail('no redirect') } };
    Object.defineProperty(win, 'localStorage', { get: () => { throw new Error('denied'); } });
    win.window = win;
    vm.runInNewContext(src, win);
  });
});
