// Interface language: English (default), Spanish, Vietnamese.
//
// The language comes from the ?lang= query parameter only (no cookie, no
// server-side storage). public/static/js/lang.js mirrors the choice into
// localStorage (key stm-lang) and, on a page opened without ?lang=, sends a
// stored Spanish or Vietnamese preference back through ?lang=.
//
// Strings are keyed by their English text: t('Report a spam text') returns
// the Spanish or Vietnamese entry from the dictionaries in src/i18n/, or the
// English itself. Placeholders are {name}; values are inserted as given, so
// callers pass already-escaped HTML. Translations are the site's own copy
// and may contain the same inline HTML as the English key.
//
// Only the interface and the site's own copy are translated. Report text,
// pattern examples and anything else a visitor submitted are never passed
// through t().

import { AsyncLocalStorage } from 'node:async_hooks';
import { DICT } from './i18n/index.ts';

export const LANGS = ['en', 'es', 'vi'] as const;
export type Lang = (typeof LANGS)[number];

/** Each language's name in that language (the switcher's accessible labels). */
export const LANG_NAME: Record<Lang, string> = { en: 'English', es: 'Español', vi: 'Tiếng Việt' };

/** BCP 47 locale used for dates. */
export const LANG_LOCALE: Record<Lang, string> = { en: 'en-US', es: 'es-US', vi: 'vi-VN' };

export function parseLang(v: unknown): Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v) ? (v as Lang) : 'en';
}

interface LangCtx {
  lang: Lang;
  /** Request path (no query), for hreflang and the switcher. */
  path: string;
  /** Request query without lang, for the switcher (keeps e.g. ?range=30). */
  query: URLSearchParams;
}

const store = new AsyncLocalStorage<LangCtx>();

/** Run fn with the given interface language (pages, API messages). */
export function withLang<T>(lang: Lang, path: string, query: URLSearchParams | null, fn: () => T): T {
  const q = new URLSearchParams(query ?? undefined);
  q.delete('lang');
  return store.run({ lang, path, query: q }, fn);
}

export function currentLang(): Lang {
  return store.getStore()?.lang ?? 'en';
}

export function currentRequest(): { path: string; query: URLSearchParams } | null {
  const s = store.getStore();
  return s ? { path: s.path, query: s.query } : null;
}

/** Keys looked up in es/vi with no entry (tests read this to find gaps). */
export const MISSES = new Set<string>();

function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Translate English copy into the current language. */
export function t(en: string, vars?: Record<string, string | number>): string {
  const lang = currentLang();
  if (lang === 'en') return fill(en, vars);
  const hit = DICT[en]?.[lang];
  if (hit === undefined) MISSES.add(en);
  return fill(hit ?? en, vars);
}

/** Add ?lang= to a same-site page URL ("/x", "/x?y=1", "/x#h"); others unchanged. */
export function withLangParam(url: string, lang: Lang = currentLang()): string {
  if (lang === 'en' || !url.startsWith('/') || url.startsWith('//')) return url;
  if (/^\/(?:static\/|sw\.js|manifest\.webmanifest|stats|healthz|favicon|robots\.txt|sitemap\.xml|data\/schema\.json)/.test(url)) return url;
  if (/(?:[?&;])lang=/.test(url)) return url; // ";" for an escaped "&amp;lang="
  const hash = url.indexOf('#');
  const base = hash === -1 ? url : url.slice(0, hash);
  const frag = hash === -1 ? '' : url.slice(hash);
  return `${base}${base.includes('?') ? '&amp;' : '?'}lang=${lang}${frag}`;
}

/**
 * Carry the language through a rendered page: every same-site href and form
 * action gets ?lang=, and GET forms get a hidden lang field (a GET form's
 * own query replaces the one in its action). Illustrations with text labels
 * switch to their translated copy (scripts/localize-illustrations.mjs).
 */
export function localizeLinks(html: string, lang: Lang = currentLang()): string {
  if (lang === 'en') return html;
  return html
    .replace(/(\s(?:href|action)=")(\/[^"]*)"/g, (_m, pre: string, url: string) => `${pre}${withLangParam(url, lang)}"`)
    .replace(/(<form\b[^>]*method="get"[^>]*>)/gi, `$1<input type="hidden" name="lang" value="${lang}">`)
    .replace(/(\ssrc="\/static\/img\/(?:hero|pattern|privacy)-illustration)\.svg"/g, `$1.${lang}.svg"`);
}
