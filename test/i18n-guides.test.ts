// Translation of the junk mail, opt-out and scams guides: the email builder's
// client-side messages (public/static/js/optout.js), the English-only email,
// and data notes that embed a value.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import vm from 'node:vm';
import { DMACHOICE_FEE, OTHER_OPT_OUTS, otherOptOutNote } from '../src/pages.ts';
import { withLang } from '../src/i18n.ts';
import { get, startServer, type TestServer } from './helpers.ts';

const SRC = readFileSync(new URL('../public/static/js/optout.js', import.meta.url), 'utf8');

interface OptOutApi {
  SUBJECT: string;
  validate: (i: Record<string, string>) => Record<string, string>;
  buildEmail: (i: Record<string, string>) => { to: string; subject: string; body: string };
}

/** Run optout.js with a fake document whose <html lang> is lang (no builder on the page). */
function load(lang: string | null): OptOutApi {
  const sandbox: Record<string, unknown> = {};
  if (lang !== null) sandbox.document = { documentElement: { lang }, getElementById: () => null };
  sandbox.window = sandbox;
  vm.runInNewContext(SRC, sandbox);
  const o = sandbox.STMOptOut as OptOutApi;
  // Copy results out of the vm realm so deepEqual compares plain objects.
  return { SUBJECT: o.SUBJECT, validate: (i) => ({ ...o.validate(i) }), buildEmail: (i) => ({ ...o.buildEmail(i) }) };
}

const L10N = (() => {
  const sandbox: Record<string, unknown> = {};
  // Pull the L10N object literal out of the script and evaluate it alone.
  const m = /var L10N = (\{[\s\S]*?\n {2}\});/.exec(SRC);
  assert.ok(m, 'optout.js has a var L10N = {...} dictionary');
  return vm.runInNewContext(`(${m[1]})`, sandbox) as Record<string, { es?: string; vi?: string }>;
})();

describe('optout.js translations', () => {
  it('every t() literal has Spanish and Vietnamese text', () => {
    const keys = [...SRC.matchAll(/\bt\('((?:[^'\\]|\\.)*)'\)/g)].map((m) => m[1]!.replace(/\\'/g, "'"));
    assert.ok(keys.length >= 6, 'found the t() calls');
    for (const k of keys) {
      assert.ok(L10N[k], `L10N entry for ${JSON.stringify(k)}`);
      assert.ok(L10N[k]!.es?.trim(), `es for ${JSON.stringify(k)}`);
      assert.ok(L10N[k]!.vi?.trim(), `vi for ${JSON.stringify(k)}`);
    }
  });

  it('validate() speaks the page language; English without a document or with lang=en', () => {
    const bad = { name: '', url: 'not a url', reply: '' };
    const en = load(null).validate(bad);
    assert.equal(en.name, 'Enter your full name.');
    assert.deepEqual(load('en').validate(bad), en);
    const es = load('es').validate(bad);
    const vi = load('vi').validate(bad);
    assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
    for (const k of Object.keys(en)) {
      assert.equal(es[k], L10N[en[k]!]!.es, `es ${k}`);
      assert.equal(vi[k], L10N[en[k]!]!.vi, `vi ${k}`);
    }
    assert.equal(load('es').validate({ name: 'A', reply: 'x' }).reply, L10N['Enter an email address like name@example.com.']!.es);
    assert.equal(load('fr').validate(bad).name, 'Enter your full name.', 'unknown language falls back to English');
  });

  it('the generated email stays in English in every language', () => {
    const input = { to: 'privacy@spokeo.com', siteName: 'Spokeo', name: 'Avery Example', url: '', reply: 'a@example.com' };
    const en = load(null);
    for (const lang of ['es', 'vi']) {
      const o = load(lang);
      assert.equal(o.SUBJECT, en.SUBJECT);
      assert.deepEqual(o.buildEmail(input), en.buildEmail(input));
    }
  });
});

describe('guides: data notes with embedded values', () => {
  it('the DMAchoice note renders exactly as the English data in English, and with the fee in es/vi', () => {
    for (const o of OTHER_OPT_OUTS) assert.equal(otherOptOutNote(o), o.note, o.id);
    const dma = OTHER_OPT_OUTS.find((o) => o.id === 'dmachoice')!;
    for (const lang of ['es', 'vi'] as const) {
      const s = withLang(lang, '/opt-out', null, () => otherOptOutNote(dma));
      assert.notEqual(s, dma.note);
      assert.ok(s.includes(DMACHOICE_FEE), `${lang} note has the fee`);
    }
  });
});

describe('/opt-out: English-email note', () => {
  let s: TestServer;
  before(async () => {
    s = await startServer();
  });
  after(async () => {
    await s?.close();
  });

  const NOTE_EN = 'The email is written in English because these companies handle requests in English.';

  it('appears only on translated pages', async () => {
    const en = await get(s.base, '/opt-out');
    assert.ok(!en.text.includes(NOTE_EN));
    assert.ok(!/inglés|tiếng Anh/.test(en.text));
    const es = await get(s.base, '/opt-out?lang=es');
    assert.match(es.text, /El correo se redacta en inglés/);
    const vi = await get(s.base, '/opt-out?lang=vi');
    assert.match(vi.text, /Email được viết bằng tiếng Anh/);
  });

  it('the builder options carry translated notes and form labels for the client script', async () => {
    const es = await get(s.base, '/opt-out?lang=es');
    assert.match(es.text, /data-form-label="Formulario de baja de Spokeo"/);
    assert.match(es.text, />Whitepages \(solo formulario web\)<\/option>/);
    const en = await get(s.base, '/opt-out');
    assert.match(en.text, />Whitepages \(web form only\)<\/option>/);
  });
});
