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

export interface LayoutOptions {
  title: string;
  path: string;
  body: string;
  demo: boolean;
  scripts?: string[];
  description?: string;
}

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
<div class="wrap">
${o.body}
</div>
</main>
<footer class="site-footer">
  <div class="wrap">
    <nav aria-label="Footer">${FOOT.map((f) => `<a href="${f[0]}">${esc(f[1])}</a>`).join('')}</nav>
    <p class="meta">Spam Patterns is a project of Reseed LLC. Reports are voluntary submissions. A listing is not an allegation against any person or business.</p>
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
