// Spanish and Vietnamese for the report flow, /delete and the API messages:
// the client scripts' own dictionaries (report.js, receipts.js), the delete
// form's server messages, and API errors in the language of ?lang=.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import vm from 'node:vm';
import { CATEGORIES } from '../src/categories.ts';
import { DELETE_MSG, MSG } from '../src/filing.ts';
import { DICT } from '../src/i18n/index.ts';
import { MISSES } from '../src/i18n.ts';
import { PHONE_ERROR_TEXT } from '../src/phone.ts';
import { NOTE_TEXT } from '../src/scrub.ts';
import { get, postForm, postJson, startServer, type TestServer } from './helpers.ts';

const SCRIPTS = ['report.js', 'receipts.js'] as const;
const src = (f: string) => readFileSync(new URL(`../public/static/js/${f}`, import.meta.url), 'utf8');

/** The script's L10N object, evaluated on its own. */
function l10n(code: string): Record<string, { es?: string; vi?: string }> {
  const m = /\n {2}var L10N = (\{[\s\S]*?\n {2}\});\n/.exec(code);
  assert.ok(m, 'var L10N = { ... }; at the top of the script');
  return vm.runInNewContext(`(${m[1]})`) as Record<string, { es?: string; vi?: string }>;
}

/** Every t('...') string literal in the script (single-quoted, as the scripts are written). */
function tLiterals(code: string): string[] {
  return [...code.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]!.replace(/\\'/g, "'"));
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();

describe('client script dictionaries', () => {
  for (const f of SCRIPTS) {
    it(`${f}: every t() literal has Spanish and Vietnamese, with the same placeholders`, () => {
      const code = src(f);
      const dict = l10n(code);
      const keys = tLiterals(code);
      assert.ok(keys.length > 3, 'found t() calls');
      if (f === 'report.js') {
        // The engine notes are passed to t() through ENGINE_NOTE.
        const notes = /var ENGINE_NOTE = \{([\s\S]*?)\};/.exec(code)![1]!;
        keys.push(...[...notes.matchAll(/:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]!));
      }
      const problems: string[] = [];
      for (const k of keys) {
        for (const lang of ['es', 'vi'] as const) {
          const tr = dict[k]?.[lang];
          if (typeof tr !== 'string' || !tr.trim()) problems.push(`${lang} missing for ${JSON.stringify(k)}`);
          else if (placeholders(tr) !== placeholders(k)) problems.push(`${lang} placeholders differ for ${JSON.stringify(k)}`);
        }
      }
      assert.deepEqual(problems, []);
    });
  }

  it('report.js sends ?lang= on its API calls; receipts.js on its delete form', () => {
    assert.match(src('report.js'), /fetch\(withLang\(path\)/);
    assert.match(src('report.js'), /pushState\(null, '', withLang\('\/report\/complete'\)\)/);
    assert.match(src('receipts.js'), /f\.action = '\/delete' \+ \(LANG === 'en' \? '' : '\?lang=' \+ LANG\)/);
  });
});

describe('receipts.js in Vietnamese', () => {
  // A minimal DOM: the /delete form view with the stored-receipts section.
  function el(tag: string): any {
    const e: any = {
      tagName: tag, children: [] as any[], attrs: {} as Record<string, string>, hidden: false, textContent: '',
      appendChild(c: any) { this.children.push(c); return c; },
      setAttribute(k: string, v: string) { this.attrs[k] = v; },
      getAttribute(k: string) { return this.attrs[k] ?? null; },
      handlers: {} as Record<string, () => void>,
      addEventListener(type: string, fn: () => void) { this.handlers[type] = fn; },
      focus() {},
      submit() {},
    };
    Object.defineProperty(e, 'textContent', {
      get() { return e._text ?? e.children.map((c: any) => c.textContent).join(''); },
      set(v: string) { e._text = v; if (v === '') { e._text = undefined; e.children = []; } },
    });
    return e;
  }
  function run(lang: string) {
    const ul = el('ul');
    const sec = el('section');
    sec.hidden = true;
    sec.querySelector = () => ul;
    const page = el('div');
    page.attrs['data-view'] = 'form';
    const byId: Record<string, any> = { 'delete-page': page, 'stored-receipts': sec };
    const body = el('body');
    const doc = {
      readyState: 'complete',
      documentElement: { lang },
      body,
      getElementById: (id: string) => byId[id] ?? null,
      createElement: el,
      createTextNode: (s: string) => ({ textContent: s }),
    };
    const store = new Map<string, string>();
    const now = Date.now() - 3_600_000; // filed an hour ago (the script prunes by the real clock)
    store.set('stm.receipts.v1', JSON.stringify([{ code: 'ABCD'.repeat(8), filedAt: now }]));
    const win: Record<string, unknown> = {
      document: doc,
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    };
    win.window = win;
    vm.runInNewContext(src('receipts.js'), win);
    const li = ul.children[0];
    return { sec, li, body, now };
  }

  it('lists stored codes with Vietnamese text and a vi-VN date, and posts the delete form with ?lang=vi', () => {
    const { sec, li, body, now } = run('vi');
    assert.equal(sec.hidden, false);
    const [span, , btn] = li.children;
    const when = new Date(now).toLocaleString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    assert.equal(span.textContent, `Đã gửi lúc ${when}`);
    assert.equal(btn.textContent, 'Xóa báo cáo này');
    assert.equal(btn.attrs['aria-label'], `Xóa báo cáo đã gửi lúc ${when}`);
    btn.handlers.click();
    assert.equal(body.children.length, 1);
    assert.equal(body.children[0].method, 'post');
    assert.equal(body.children[0].action, '/delete?lang=vi');
  });

  it('English is unchanged', () => {
    const { li, body, now } = run('en');
    const when = new Date(now).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    assert.equal(li.children[0].textContent, `Filed ${when}`);
    assert.equal(li.children[2].textContent, 'Delete this report');
    li.children[2].handlers.click();
    assert.equal(body.children[0].action, '/delete');
  });
});

describe('server messages in the report flow have Spanish and Vietnamese', () => {
  it('categories, scrub notes, phone errors, filing and deletion messages', () => {
    const keys = [
      ...CATEGORIES.map((c) => c[1]),
      ...Object.values(NOTE_TEXT),
      ...Object.values(PHONE_ERROR_TEXT),
      ...Object.values(MSG),
      ...Object.values(DELETE_MSG),
    ];
    const missing = keys.filter((k) => !DICT[k]?.es || !DICT[k]?.vi);
    assert.deepEqual(missing, []);
  });
});

describe('report flow and /delete over HTTP in Spanish and Vietnamese', () => {
  let s: TestServer;
  before(async () => {
    s = await startServer();
  });
  after(async () => {
    await s?.close();
  });

  it('POST /delete?lang=vi: a malformed code, then an unknown valid-looking code', async () => {
    MISSES.clear();
    const bad = await postForm(s.base, '/delete?lang=vi', { step: 'confirm', code: 'nope' });
    assert.equal(bad.status, 400);
    assert.match(bad.text, /<html lang="vi">/);
    assert.ok(bad.text.includes(DICT['Enter the 32-character receipt code you saved when you filed the report.']!.vi));
    assert.match(bad.text, /<form method="post" action="\/delete\?lang=vi"/);

    const code = 'ABCD'.repeat(8);
    const confirm = await postForm(s.base, '/delete?lang=vi', { step: 'confirm', code });
    assert.equal(confirm.status, 200);
    assert.ok(confirm.text.includes('Xóa báo cáo này?'));
    assert.match(confirm.text, /<form method="post" action="\/delete\?lang=vi" autocomplete="off" id="delete-confirm-form">/);

    const gone = await postForm(s.base, '/delete?lang=vi', { step: 'delete', code });
    assert.equal(gone.status, 404);
    assert.ok(gone.text.includes(`<h1>${DICT['No report found']!.vi}</h1>`));
    assert.ok(gone.text.includes(DICT[DELETE_MSG.notFound]!.vi));
    assert.deepEqual([...MISSES], []);
  });

  it('/api/preview?lang=es: empty, bad number, too long, bad city', async () => {
    MISSES.clear();
    const cases: Array<[Record<string, unknown>, string, string]> = [
      [{ number: '', message: '' }, 'number', PHONE_ERROR_TEXT.missing],
      [{ number: '12', message: 'We buy houses for cash.' }, 'number', PHONE_ERROR_TEXT.wrong_length],
      [{ number: '(312) 555-0142', message: 'x'.repeat(5000) }, 'message', 'This message is too long to review safely. Paste only the spam text.'],
      [{ number: '(312) 555-0142', message: 'We buy houses in Springfield for cash.', city: 'Chicago' }, 'city', 'Enter the city exactly as it appears in the message, or leave it blank.'],
      [{ number: '(312) 555-0142', message: 'We buy houses for cash.', city: 'Chi3ago' }, 'city', 'Enter only the city name as letters, or leave it blank.'],
    ];
    for (const [input, field, en] of cases) {
      const r = await postJson(s.base, '/api/preview?lang=es', input);
      assert.equal(r.status, 400, JSON.stringify(input).slice(0, 60));
      assert.equal(r.json.errors[field], DICT[en]!.es, `${field}: ${en}`);
    }
    assert.deepEqual([...MISSES], []);
  });

  it('/api/preview?lang=vi: notes, labels and category are Vietnamese; the report data is not translated', async () => {
    MISSES.clear();
    const r = await postJson(s.base, '/api/preview?lang=vi', { number: '(312) 555-0142', message: 'Hi Dana, we buy houses for cash. Visit https://x.example/a', category: 'roofing' });
    assert.equal(r.status, 200);
    const p = r.json.preview;
    assert.equal(p.kept.category, 'Lợp mái');
    assert.equal(p.kept.areaCode, '312');
    for (const n of p.notes as string[]) assert.ok(Object.values(NOTE_TEXT).some((en) => DICT[en]!.vi === n), n);
    assert.equal(p.publicFields[0].label, DICT['Sender area code (claimed origin)']!.vi);
    assert.equal(p.publicFields[0].value, '312');
    assert.deepEqual([...MISSES], []);
  });

  for (const lang of ['es', 'vi'] as const) {
    it(`/report?lang=${lang}: category options and the HowTo schema are translated`, async () => {
      MISSES.clear();
      const { text } = await get(s.base, `/report?lang=${lang}`);
      assert.ok(text.includes(`<option value="roofing">${DICT['Roofing']![lang]}</option>`));
      assert.ok(text.includes(DICT['Upload a screenshot or enter manually']![lang]));
      assert.deepEqual([...MISSES], []);
    });
  }
});
