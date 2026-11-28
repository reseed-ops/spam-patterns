// Tiny HTML helpers. Everything interpolated goes through esc().

import { LANGS, LANG_LOCALE, LANG_NAME, currentLang, currentRequest, localizeLinks, t, type Lang } from './i18n.ts';

export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Browser UI color (site palette: the logo's darkest blue, --bin4). */
export const THEME_COLOR = '#204A73';
/** Page background for the installed app's splash screen (--canvas). */
export const BACKGROUND_COLOR = '#F8FAFC';

/** Optional page-hero band shown above the content (presentation only). */
export interface PageHero {
  /** Short uppercase kicker above the title. */
  kicker: string;
  /** Page title (becomes the page's h1). */
  title: string;
  /** Already-escaped HTML placed under the title (lead paragraph, dates). */
  html?: string;
}

/** Canonical origin of the official instance (sitemap.xml and robots.txt). */
export const SITE_ORIGIN = 'https://spampatterns.com';

/**
 * A schema.org node, written in the same shape as JSON-LD ("@type" plus
 * properties). It is rendered as microdata, not as a JSON-LD script block,
 * because pages must carry no inline <script> (see the CSP and the hygiene
 * tests). Every value must restate content the page visibly shows.
 */
export interface SchemaNode {
  '@type': string;
  [prop: string]: string | number | SchemaNode | Array<string | SchemaNode>;
}

/** Visible text of an HTML fragment built with esc(): tags dropped, entities decoded, spacing collapsed. */
export function textOf(html: string): string {
  return html
    .replace(/<\/?(?:p|li|ul|ol|h[1-6]|div|dt|dd|dl|br|table|tr|td|th)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Render a schema.org node as microdata: nested itemscopes and <meta itemprop> values. */
export function microdata(node: SchemaNode, itemprop?: string): string {
  const props = Object.entries(node)
    .filter(([k]) => k !== '@type')
    .flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x] as const) : [[k, v] as const]))
    .map(([k, v]) => (typeof v === 'object' ? microdata(v, k) : `<meta itemprop="${esc(k)}" content="${esc(v)}">`))
    .join('');
  const prop = itemprop ? ` itemprop="${esc(itemprop)}"` : '';
  return `<div${prop} itemscope itemtype="https://schema.org/${esc(node['@type'])}">${props}</div>`;
}

export interface LayoutOptions {
  title: string;
  path: string;
  body: string;
  demo: boolean;
  scripts?: string[];
  description?: string;
  hero?: PageHero;
  /** The body brings its own full-width sections and .wrap containers. */
  fullBleed?: boolean;
  /** Structured data for this page (rendered as hidden microdata at the end of <main>). */
  schema?: SchemaNode;
}

/** Original line-art icons for cards (decorative; aria-hidden). */
export const ICON = {
  image: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><rect x="3.5" y="4.5" width="17" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.8" fill="currentColor"/><path d="m5 18 5-5 3 3 2.5-2.5L19.5 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  type: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4.5 3v-3H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7.5 10h9M7.5 13.5h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
} as const;

const NAV: Array<[string, string]> = [
  ['/', 'Overview'],
  ['/patterns', 'Patterns'],
  ['/opt-out', 'Opt out'],
  ['/data', 'Data'],
];

const FOOT: Array<[string, string]> = [
  ['/privacy', 'Privacy & threat model'],
  ['/junk-mail', 'Stop junk mail'],
  ['/scams', 'Scams'],
  ['/methodology', 'Methodology'],
  ['/delete', 'Delete a report'],
  ['/project', 'Self-host & contribute'],
  ['https://github.com/reseed-ops/spam-patterns', 'GitHub'],
  ['https://reseed.net', 'More Reseed apps'],
];

function navLink([href, label]: [string, string], path: string): string {
  const current = href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
  return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${esc(t(label))}</a>`;
}

/**
 * Original, simplified flag drawings. Each sits alone inside a link whose
 * aria-label names the language, so the drawing itself is never announced.
 */
export const FLAG_SVG: Record<Lang, string> = {
  // United States: 13 stripes and a blue canton with rows of stars (dots at this size).
  en: `<svg viewBox="0 0 30 20" width="30" height="20" focusable="false"><rect width="30" height="20" fill="#FFFFFF"/>${[0, 2, 4, 6, 8, 10, 12]
    .map((i) => `<rect y="${((i * 20) / 13).toFixed(2)}" width="30" height="${(20 / 13).toFixed(2)}" fill="#B22234"/>`)
    .join('')}<rect width="13" height="${((7 * 20) / 13).toFixed(2)}" fill="#3C3B6E"/><g fill="#FFFFFF">${[1.8, 4.6, 7.4, 10.2]
    .flatMap((y, r) => (r % 2 ? [3.2, 6.4, 9.6] : [1.6, 4.8, 8, 11.2]).map((x) => `<circle cx="${x}" cy="${y}" r=".7"/>`))
    .join('')}</g></svg>`,
  // Spain: red, yellow (double height), red; the coat of arms is left out at this size.
  es: `<svg viewBox="0 0 30 20" width="30" height="20" focusable="false"><rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/></svg>`,
  // Vietnam: red field, centered yellow five-pointed star.
  vi: `<svg viewBox="0 0 30 20" width="30" height="20" focusable="false"><rect width="30" height="20" fill="#DA251D"/><polygon fill="#FFCD00" points="15,4 16.35,8.14 20.71,8.15 17.19,10.71 18.53,14.85 15,12.3 11.47,14.85 12.81,10.71 9.29,8.15 13.65,8.14"/></svg>`,
};

/** This page's URL (request path and query, lang replaced). */
function pageUrl(lang: Lang | null, path: string): string {
  const req = currentRequest();
  const q = new URLSearchParams(req?.query ?? undefined);
  if (lang) q.set('lang', lang);
  const s = q.toString();
  return `${req?.path ?? path}${s ? `?${s}` : ''}`;
}

/**
 * The language switcher: three flag links to this page with ?lang=, the
 * current one marked aria-current. English links carry ?lang=en too, so the
 * choice overrides a stored Spanish or Vietnamese preference (lang.js).
 */
export function langSwitcher(path: string): string {
  const cur = currentLang();
  const links = LANGS.map(
    (l) =>
      `<a href="${esc(pageUrl(l, path))}" hreflang="${l}" lang="${l}" aria-label="${esc(LANG_NAME[l])}" title="${esc(LANG_NAME[l])}"${l === cur ? ' aria-current="true"' : ''}>${FLAG_SVG[l]}</a>`,
  ).join('');
  return `<nav class="lang-switch" aria-label="${esc(t('Language'))}">${links}</nav>`;
}

/** hreflang alternates for this page (English has no parameter) plus x-default. */
export function hreflangLinks(path: string): string {
  const base = SITE_ORIGIN + (currentRequest()?.path ?? path);
  const alt = (hl: string, l: Lang) => `<link rel="alternate" hreflang="${hl}" href="${esc(l === 'en' ? base : `${base}?lang=${l}`)}">`;
  return [...LANGS.map((l) => alt(l, l)), alt('x-default', 'en')].join('\n');
}

export function layout(o: LayoutOptions): string {
  const nav = NAV.map((n) => navLink(n, o.path)).join('');
  const scripts = (o.scripts ?? []).map((s) => `<script src="${esc(s)}" defer></script>`).join('');
  const lang = currentLang();
  // localizeLinks: in Spanish or Vietnamese, every same-site link keeps ?lang=.
  return localizeLinks(`<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${esc(o.title)} · Spam Patterns</title>
<meta name="description" content="${esc(o.description ?? t('Report spam texts anonymously and see shared script patterns, with privacy built in.'))}">
${hreflangLinks(o.path)}
<meta name="theme-color" content="${THEME_COLOR}">
<link rel="stylesheet" href="/static/css/app.css">
<link rel="icon" href="/static/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/static/icons/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/static/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<script src="/static/js/lang.js"></script>
<script src="/static/js/pwa.js" defer></script>
${scripts}
</head>
<body>
<a class="skip" href="#main">${esc(t('Skip to content'))}</a>
<header class="site-header">
  <div class="wrap header-row">
    <a class="wordmark" href="/"><img class="logo" src="/static/img/logo.svg" alt="" width="32" height="32">Spam Patterns</a>
    <nav class="nav-desktop nav-tabs" aria-label="${esc(t('Main'))}">${nav}</nav>
    <a class="btn btn-primary btn-report" href="/report">${esc(t('Report a spam text'))}</a>
    <nav class="nav-mobile nav-tabs" aria-label="${esc(t('Main (mobile)'))}">${nav}</nav>
  </div>
</header>
${
  o.demo
    ? `<div class="demo-banner" role="note"><div class="wrap">${t('<strong>Demo instance.</strong> This site is not collecting public reports yet. Data shown here is synthetic or test data and may be reset at any time.')}</div></div>`
    : ''
}
<main id="main" tabindex="-1">
${
  o.hero
    ? `<div class="page-hero"><div class="wrap"><div class="page-hero-inner">
<p class="eyebrow">${esc(o.hero.kicker)}</p>
<h1>${esc(o.hero.title)}</h1>
${o.hero.html ?? ''}
</div></div></div>
`
    : ''
}${o.fullBleed ? o.body : `<div class="wrap main-content">
${o.body}
</div>`}${o.schema ? `\n<div hidden>${microdata(o.schema)}</div>` : ''}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <a class="footer-brand" href="/"><img src="/static/img/logo.svg" alt="" width="28" height="28">Spam Patterns</a>
      <nav aria-label="${esc(t('Footer'))}">${FOOT.map((f) => `<a href="${f[0]}">${esc(t(f[1]))}</a>`).join('')}</nav>
    </div>
    ${langSwitcher(o.path)}
    <p class="meta footer-legal">${esc(t('Spam Patterns is a project of Reseed LLC. Reports are voluntary submissions. A listing is not an allegation against any person or business. Counts visits and filed reports in total, nothing about you.'))}</p>
  </div>
</footer>
</body>
</html>`, lang);
}

const CLAIMED_ORIGIN_TEXT =
  '<strong>Claimed origin, not evidence of location.</strong> This view groups reports by the displayed sender’s area code. Sender numbers can be spoofed. A city named in a message is recorded separately.';

/** The claimed-origin caveat, in the current language. */
export function claimedOriginWarning(): string {
  return `<aside class="geo-warning" role="note" aria-label="${esc(t('Claimed origin'))}"><p>${t(CLAIMED_ORIGIN_TEXT)}</p></aside>`;
}

/** The caveat as it renders in English. */
export const CLAIMED_ORIGIN_WARNING = `<aside class="geo-warning" role="note" aria-label="Claimed origin"><p>${CLAIMED_ORIGIN_TEXT}</p></aside>`;

/** A UTC day ("2026-11-25") as a short date in the current language. */
export function fmtDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return dt.toLocaleDateString(LANG_LOCALE[currentLang()], { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
