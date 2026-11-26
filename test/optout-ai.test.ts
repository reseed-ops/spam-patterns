// /opt-out: "Ask an AI assistant to do it for you". The section sits right
// after the email builder, carries a copyable prompt in a <pre> (copy button
// wired by optout.js, no inline script), and the prompt is in the page
// language, stands alone (the whole list inline) and says what the assistant
// must not do. Its email format is exactly what the builder writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import vm from 'node:vm';
import { DICT } from '../src/i18n/index.ts';
import { withLang } from '../src/i18n.ts';
import { AI_EMAIL_FIELDS, AI_EMAIL_TEMPLATE, GOOGLE_OPT_OUTS, MORE_OPT_OUTS, OPT_OUT_SITES, OTHER_OPT_OUTS, aiOptOutPrompt } from '../src/pages.ts';
import { get, startServer, type TestServer } from './helpers.ts';

const SRC = readFileSync(new URL('../public/static/js/optout.js', import.meta.url), 'utf8');

const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** The section from its heading to the next <h2>. */
function aiSection(html: string): string {
  const start = html.indexOf('<h2 id="ai">');
  assert.ok(start > 0, 'section #ai');
  return html.slice(start, html.indexOf('<h2 ', start + 1));
}

/** The prompt text as the visitor would copy it. */
function promptText(html: string): string {
  const m = /<pre class="scrubbed panel ai-prompt" id="ai-prompt" tabindex="0" aria-label="[^"]+">([\s\S]*?)<\/pre>/.exec(html);
  assert.ok(m, 'prompt <pre>');
  return unesc(m[1]!);
}

const tr = (lang: 'es' | 'vi', en: string) => {
  const v = DICT[en]?.[lang];
  assert.ok(v, `${lang} entry for ${JSON.stringify(en)}`);
  return v;
};

describe('/opt-out: Ask an AI assistant to do it for you', () => {
  let s: TestServer;
  before(async () => {
    s = await startServer();
  });
  after(async () => {
    await s?.close();
  });

  it('renders right after the email builder and before the site list, with explainer, button and prompt (English)', async () => {
    const { text } = await get(s.base, '/opt-out');
    const builder = text.indexOf('<div id="optout-app"');
    const ai = text.indexOf('<h2 id="ai">Ask an AI assistant to do it for you</h2>');
    const sites = text.indexOf('<h2 id="sites">');
    assert.ok(builder > 0 && ai > builder && sites > ai, 'order: builder, ai, sites');
    assert.ok(!text.slice(builder, ai).includes('<h2'), 'nothing between the builder and the AI section');
    const sec = aiSection(text);
    assert.match(sec, /Opting out by hand takes a while\./);
    assert.match(sec, /Muse, ChatGPT, Claude or another one/);
    assert.match(sec, /your own click, an email confirmation, a phone verification, a CAPTCHA or a password/);
    // Button starts hidden; optout.js reveals it, so without JS nobody sees a dead button.
    assert.ok(sec.includes('<button class="btn btn-secondary" type="button" id="ai-copy" hidden>Copy the prompt</button>'));
    // A clipboard icon sits on the prompt box itself and copies the whole prompt.
    assert.ok(sec.includes('<div class="ai-prompt-wrap">'));
    assert.ok(sec.includes('id="ai-copy-icon" hidden aria-label="Copy the prompt"'));
    assert.ok(sec.includes('<svg width="18" height="18" viewBox="0 0 24 24"'));
    assert.ok(sec.includes('<span class="meta" id="ai-copy-status" role="status"></span>'));
    assert.equal(promptText(sec), aiOptOutPrompt());
    assert.match(text, /<script src="\/static\/js\/optout\.js"/);
    assert.doesNotMatch(text, /<script(?![^>]*\ssrc=)[^>]*>/i);
    assert.doesNotMatch(text, /\son[a-z]+="/i);
  });

  it('the prompt stands alone: every route on the page is inline, in page order, with the page link', () => {
    const p = aiOptOutPrompt();
    assert.ok(p.includes('https://spampatterns.com/opt-out'));
    let at = -1;
    for (const site of OPT_OUT_SITES) {
      const i = p.indexOf(`. ${site.name}\n`);
      assert.ok(i > at, `${site.name} in order`);
      at = i;
      if (site.email) assert.ok(p.includes(`Email: ${site.email}`), site.email);
      if (site.form) assert.ok(p.includes(`Web form: ${site.form}`), site.form);
      for (const c of site.covers) assert.ok(p.includes(c), c);
    }
    for (const o of OTHER_OPT_OUTS) {
      const i = p.indexOf(`. ${o.name}: ${o.stops}`);
      assert.ok(i > at, `${o.name} in order`);
      at = i;
      assert.ok(p.includes(o.url), o.url);
      if (o.phone) assert.ok(p.includes(`Phone: ${o.phone}`));
    }
    for (const e of [...GOOGLE_OPT_OUTS, ...MORE_OPT_OUTS]) {
      const i = p.indexOf(`. ${e.name}\n`);
      assert.ok(i > at, `${e.id} in order`);
      at = i;
      for (const l of e.links) assert.ok(p.includes(l.url), l.url);
      if (e.email) assert.ok(p.includes(`Email: ${e.email}`), e.email);
    }
    // Every URL in the prompt is one the page lists (or the page itself): nothing guessed.
    const known = new Set([
      'https://spampatterns.com/opt-out',
      ...OPT_OUT_SITES.flatMap((x) => (x.form ? [x.form] : [])),
      ...OTHER_OPT_OUTS.map((o) => o.url),
      ...[...GOOGLE_OPT_OUTS, ...MORE_OPT_OUTS].flatMap((e) => e.links.map((l) => l.url)),
    ]);
    for (const u of p.match(/https?:\/\/\S+/g) ?? []) assert.ok(known.has(u.replace(/[).,]+$/, '')), u);
  });

  it('the prompt asks first, reports status per item, and forbids inventing, guessing, paying, deleting and overclaiming', () => {
    const p = aiOptOutPrompt();
    assert.match(p, /Ask me for my full legal name and for the email address replies should go to\./);
    assert.match(p, /Ask whether I already know the URL of my listing .* or offer to search for it\./);
    assert.match(p, /Never invent personal details\. Never guess an email address or a listing URL/);
    assert.match(p, /Never pay for anything/);
    assert.match(p, /never delete an account/);
    assert.match(p, /keep the email itself in English\. Show me each email before you send it/);
    assert.match(p, /done; sent and waiting; needs me \(with the exact step and link\); could not be done \(with the reason\)/);
    assert.match(p, /a CAPTCHA or a password stay with me/);
    assert.match(p, /Never tell me an opt-out worked when the request is only sent and waiting\./);
    assert.match(p, /At the end, give me a short checklist: what is done, what is waiting, and what I still have to do myself\./);
    assert.ok(p.length < 9000, `focused (${p.length} chars)`);
  });

  it('the email format in the prompt is exactly what the builder (optout.js) writes', () => {
    const sandbox: Record<string, unknown> = {};
    sandbox.window = sandbox;
    vm.runInNewContext(SRC, sandbox);
    const O = sandbox.STMOptOut as { SUBJECT: string; buildEmail: (i: Record<string, string>) => { subject: string; body: string } };
    const e = O.buildEmail({ to: 'x@example.com', ...AI_EMAIL_FIELDS });
    assert.deepEqual(AI_EMAIL_TEMPLATE, [`Subject: ${e.subject}`, '', ...e.body.split('\r\n')]);
    assert.ok(aiOptOutPrompt().includes(AI_EMAIL_TEMPLATE.join('\n')));
  });

  for (const [lang, heading, button] of [
    ['es', 'Pídale a un asistente de IA que lo haga por usted', 'Copiar las instrucciones'],
    ['vi', 'Nhờ trợ lý AI làm thay bạn', 'Sao chép lời nhắc'],
  ] as const) {
    it(`renders translated, with the prompt in the page language (?lang=${lang})`, async () => {
      const { text } = await get(s.base, `/opt-out?lang=${lang}`);
      const sec = aiSection(text);
      assert.ok(sec.startsWith(`<h2 id="ai">${heading}</h2>`), heading);
      assert.ok(sec.includes(`id="ai-copy" hidden>${button}</button>`), button);
      assert.ok(sec.includes(tr(lang, 'Opting out by hand takes a while. You can copy the prompt below, paste it into a chat with your AI assistant (Muse, ChatGPT, Claude or another one), answer its questions, and let it work through the list.')));
      const p = promptText(sec);
      assert.equal(p, withLang(lang, '/opt-out', null, () => aiOptOutPrompt()));
      for (const en of [
        'Ask me for my full legal name and for the email address replies should go to.',
        'Never invent personal details. Never guess an email address or a listing URL: use only the addresses and links in this list, or ones I give you.',
        'Never pay for anything, never start a trial or a subscription, and never delete an account. If a route asks for money, stop and tell me.',
        'Never tell me an opt-out worked when the request is only sent and waiting.',
        'At the end, give me a short checklist: what is done, what is waiting, and what I still have to do myself.',
      ]) {
        assert.ok(p.includes(tr(lang, en)), `${lang}: ${en}`);
        assert.ok(!p.includes(en), `${lang}: no English for ${en}`);
      }
      // Data rows are translated too; names, addresses and links stay as they are.
      for (const site of OPT_OUT_SITES) {
        assert.ok(p.includes(`. ${site.name}\n`), site.name);
        assert.ok(p.includes(tr(lang, site.note)), `${lang} note ${site.id}`);
      }
      for (const e of GOOGLE_OPT_OUTS) assert.ok(p.includes(`. ${tr(lang, e.name)}\n`), `${lang} ${e.id}`);
      // The email itself stays in English.
      assert.ok(p.includes(AI_EMAIL_TEMPLATE.join('\n')), 'English email format');
    });
  }
});

describe('optout.js: copy button for the AI prompt', () => {
  /** Run optout.js against a tiny fake page with the prompt, the button and an optional clipboard. */
  function page(lang: string, clipboard: 'ok' | 'fail' | 'none') {
    const els: Record<string, { hidden?: boolean; textContent: string; listeners: Record<string, () => void>; addEventListener: (t: string, f: () => void) => void }> = {};
    for (const id of ['ai-copy', 'ai-copy-icon', 'ai-prompt', 'ai-copy-status']) {
      const el = { hidden: id === 'ai-copy' || id === 'ai-copy-icon', textContent: '', listeners: {} as Record<string, () => void>, addEventListener(t: string, f: () => void) { el.listeners[t] = f; } };
      els[id] = el;
    }
    els['ai-prompt']!.textContent = 'PROMPT TEXT';
    const copied: string[] = [];
    let selected = false;
    const sandbox: Record<string, unknown> = {
      document: {
        documentElement: { lang },
        getElementById: (id: string) => els[id] ?? null,
        createRange: () => ({ selectNodeContents: () => {} }),
      },
      navigator: clipboard === 'none' ? {} : { clipboard: { writeText: (s: string) => (clipboard === 'ok' ? (copied.push(s), Promise.resolve()) : Promise.reject(new Error('denied'))) } },
      getSelection: () => ({ removeAllRanges: () => {}, addRange: () => { selected = true; } }),
    };
    sandbox.window = sandbox;
    vm.runInNewContext(SRC, sandbox);
    return { els, copied, isSelected: () => selected };
  }
  const tick = () => new Promise((r) => setImmediate(r));

  it('reveals the button and copies the prompt text', async () => {
    const p = page('en', 'ok');
    assert.equal(p.els['ai-copy']!.hidden, false);
    p.els['ai-copy']!.listeners.click!();
    await tick();
    assert.deepEqual(p.copied, ['PROMPT TEXT']);
    assert.equal(p.els['ai-copy-status']!.textContent, 'Prompt copied. Paste it into a chat with your assistant.');
  });

  it('reveals the copy icon and copies the whole prompt when it is clicked', async () => {
    const p = page('en', 'ok');
    assert.equal(p.els['ai-copy-icon']!.hidden, false);
    p.els['ai-copy-icon']!.listeners.click!();
    await tick();
    assert.deepEqual(p.copied, ['PROMPT TEXT']);
    assert.equal(p.els['ai-copy-status']!.textContent, 'Prompt copied. Paste it into a chat with your assistant.');
  });

  it('selects the prompt for copying by hand when the clipboard fails or is missing, in the page language', async () => {
    const fail = page('es', 'fail');
    fail.els['ai-copy']!.listeners.click!();
    await tick();
    assert.ok(fail.isSelected());
    assert.equal(fail.els['ai-copy-status']!.textContent, 'No se pudo copiar. Las instrucciones quedaron seleccionadas; cópielas a mano.');
    const none = page('vi', 'none');
    none.els['ai-copy']!.listeners.click!();
    assert.ok(none.isSelected());
    assert.equal(none.els['ai-copy-status']!.textContent, 'Lời nhắc đã được chọn sẵn; hãy tự sao chép.');
  });
});
