// Tiny HTML helpers. Everything interpolated goes through esc().

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
  ['/data', 'Data'],
];

const FOOT: Array<[string, string]> = [
  ['/privacy', 'Privacy & threat model'],
  ['/junk-mail', 'Stop junk mail'],
  ['/methodology', 'Methodology'],
  ['/delete', 'Delete a report'],
  ['/project', 'Self-host & contribute'],
  ['https://github.com/reseed-ops/spam-patterns', 'GitHub'],
];

function navLink([href, label]: [string, string], path: string): string {
  const current = href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
  return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
}

export function layout(o: LayoutOptions): string {
  const nav = NAV.map((n) => navLink(n, o.path)).join('');
  const scripts = (o.scripts ?? []).map((s) => `<script src="${esc(s)}" defer></script>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${esc(o.title)} · Spam Patterns</title>
<meta name="description" content="${esc(o.description ?? 'Report spam texts anonymously and see shared script patterns, with privacy built in.')}">
<meta name="theme-color" content="${THEME_COLOR}">
<link rel="stylesheet" href="/static/css/app.css">
<link rel="icon" href="/static/img/logo.svg" type="image/svg+xml">
<link rel="icon" href="/static/icons/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/static/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<script src="/static/js/pwa.js" defer></script>
${scripts}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-row">
    <a class="wordmark" href="/"><img class="logo" src="/static/img/logo.svg" alt="" width="32" height="32">Spam Patterns</a>
    <nav class="nav-desktop" aria-label="Main">${nav}</nav>
    <a class="btn btn-primary btn-report" href="/report">Report a spam text</a>
    <details class="nav-mobile"><summary>Menu</summary><nav aria-label="Main (mobile)">${nav}</nav></details>
  </div>
</header>
${
  o.demo
    ? `<div class="demo-banner" role="note"><div class="wrap"><strong>Demo instance.</strong> This site is not collecting public reports yet. Data shown here is synthetic or test data and may be reset at any time.</div></div>`
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
      <nav aria-label="Footer">${FOOT.map((f) => `<a href="${f[0]}">${esc(f[1])}</a>`).join('')}</nav>
    </div>
    <p class="meta footer-legal">Spam Patterns is a project of Reseed LLC. Reports are voluntary submissions. A listing is not an allegation against any person or business. Counts visits and filed reports in total, nothing about you.</p>
  </div>
</footer>
</body>
</html>`;
}

export const CLAIMED_ORIGIN_WARNING = `<aside class="geo-warning" role="note" aria-label="Claimed origin"><p><strong>Claimed origin, not evidence of location.</strong> This view groups reports by the displayed sender’s area code. Sender numbers can be spoofed. A city named in a message is recorded separately.</p></aside>`;

export function fmtDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
