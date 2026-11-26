// Server-rendered pages. No framework, no third-party assets.

import { AREA_CODE_SOURCE, AREA_CODE_VERSION, allAreaCodes, lookupAreaCode } from './areacodes.ts';
import { CATEGORIES } from './categories.ts';
import type { Config } from './config.ts';
import { FLAG_REASONS } from './filing.ts';
import { currentLang, t } from './i18n.ts';
import { ICON, claimedOriginWarning, esc, fmtDay, layout, textOf, type SchemaNode } from './html.ts';
import { STATE_NAMES, groupByState, renderLegend, renderMap, renderStateList, reportsCount, stateSummary } from './map.ts';
import { MATCHING_RULES_VERSION, PATTERN_THRESHOLD, TIER_LABEL, type AreaCount, type Pattern } from './patterns.ts';
import { MASK, REDACTION_RULES_VERSION, scrubMessage } from './scrub.ts';
import {
  CTA_DESCRIBE,
  MIN_PATTERN_SLOTS,
  NEAR_THRESHOLD,
  SHINGLE_SIZE,
  MINHASH_PERMUTATIONS,
  SKELETON_GRAMMAR_VERSION,
  SLOTS,
  SLOT_RULES,
  STOP_SKELETONS_V1,
  extractSkeleton,
  renderSkeletonExample,
} from './skeleton.ts';

export interface PageCtx {
  cfg: Config;
  paused: boolean;
}

const EFFECTIVE_DATE = '2026-11-17';
const REVIEW_GATE_DATE = '2026-11-19';

/** "Redaction rules v1 · Matching rules v1" */
export const RULES_VERSIONS_TEXT = `Redaction rules ${REDACTION_RULES_VERSION} · Matching rules ${MATCHING_RULES_VERSION}`;

/** What a review checks, in one sentence (shared by every page that explains review). */
export const REVIEW_CHECKS =
  'that the match is real, that no personal detail survived scrubbing, and that the pattern does not read as identifying a person or a single business';

/** The review-trigger rule, in one sentence. */
export const REVIEW_TRIGGER_TEXT = `When ${PATTERN_THRESHOLD} eligible reports match, the pattern goes to a maintainer for review; it is published only after review. The review checks ${REVIEW_CHECKS}.`;

/** REVIEW_CHECKS in the current language. */
export function reviewChecksText(): string {
  return t(REVIEW_CHECKS);
}

/** REVIEW_TRIGGER_TEXT in the current language. */
export function reviewTriggerText(): string {
  return t('When {n} eligible reports match, the pattern goes to a maintainer for review; it is published only after review. The review checks {checks}.', {
    n: PATTERN_THRESHOLD,
    checks: reviewChecksText(),
  });
}

/** RULES_VERSIONS_TEXT in the current language. */
export function rulesVersionsText(): string {
  return t('Redaction rules {r} · Matching rules {m}', { r: REDACTION_RULES_VERSION, m: MATCHING_RULES_VERSION });
}

/** Correction channel, shown on /patterns and every pattern page. */
export function correctionLine(c: Config): string {
  return `<p class="notice notice-info correction">${t('If a published pattern is wrong or identifies you or your business, contact <a href="mailto:{email}">{email}</a> for review or removal.', { email: esc(c.abuseContact) })}</p>`;
}

// ---------------- Overview ----------------

export const RANGES = [
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
  ['365', 'Last 12 months'],
  ['all', 'All time'],
] as const;
export type RangeKey = (typeof RANGES)[number][0];

export function rangeDays(range: RangeKey, now = new Date()): { from: string; to: string } {
  const to = now.toISOString().slice(0, 10);
  if (range === 'all') return { from: '0000-01-01', to };
  const from = new Date(now.getTime() - (Number(range) - 1) * 86_400_000).toISOString().slice(0, 10);
  return { from, to };
}

export interface OverviewParams {
  range: RangeKey;
  view: 'map' | 'table';
  state: string | null;
  ac: string | null;
  sort: 'count' | 'code';
}

/** A made-up scrubbed script shown on the empty home page (never a real report). */
export const ILLUSTRATIVE_SCRIPT = `Hi ${MASK.recipient}, this is ${MASK.sender} with a quick question about your property. We buy houses for cash in any condition. Reply YES or call ${MASK.phone}. Details: ${MASK.link}`;

/** ILLUSTRATIVE_SCRIPT in the current language (the scrub masks stay as stored). */
export function illustrativeScriptText(): string {
  return t('Hi {recipient}, this is {sender} with a quick question about your property. We buy houses for cash in any condition. Reply YES or call {phone}. Details: {link}', {
    recipient: MASK.recipient,
    sender: MASK.sender,
    phone: MASK.phone,
    link: MASK.link,
  });
}

export function recurringScriptsSection(patterns: Pattern[]): string {
  const head = `<p class="eyebrow">${t('Reviewed before publication')}</p>
<h2 id="scripts-h">${t('Recurring scripts')}</h2>
<p class="meta">${t('Texts whose wording or script repeats across reports, such as lead-generation pitches. A shared script can be used by many unrelated senders and does not establish a common sender.')}</p>`;
  if (patterns.length) {
    return `<section class="scripts" aria-labelledby="scripts-h">
${head}
<ul class="script-list">${patterns
      .map(
        (x) =>
          `<li><a href="/patterns/${esc(x.id)}">${x.example != null ? esc(x.example) : t('Template match ({label})', { label: esc(t(x.label)) })}</a> <span class="meta">${esc(t(x.label))} · ${reportsCount(x.count, `<span class="num">${x.count}</span>`)}</span></li>`,
      )
      .join('')}</ul>
<p>${t('<a href="/patterns">All published patterns</a> · <a href="/methodology#review">How review works</a>')}</p>
</section>`;
  }
  // Empty pilot: invite a contribution instead of a click into an empty index.
  return `<section class="scripts" aria-labelledby="scripts-h">
${head}
<div class="empty-box"><img src="/static/img/pattern-illustration.svg" alt="" width="560" height="240"><div>
<p class="status-mark">${t('Pilot in progress')}</p>
<p class="empty-cta">${t('<strong>No patterns published yet.</strong> File a spam text to help surface the first one.')}</p>
<p><a class="btn btn-primary" href="/report">${t('Report a spam text')}</a></p>
</div></div>
<figure class="example-script">
<figcaption>${t('<span class="example-label">Illustrative example</span> What a published script looks like after scrubbing. This is made up, not a real report.')}</figcaption>
<p class="scrubbed panel">${esc(illustrativeScriptText())}</p>
</figure>
<p class="meta">${esc(reviewTriggerText())} ${t('A report is <strong>eligible</strong> if it has not been deleted and is not a repeat of the same text from the same sender within a short window. Every counted report appears in the area-code counts below as soon as it is filed, before any pattern is published. <a href="/methodology#review">How review works</a>.')}</p>
</section>`;
}

/** The five How it works steps (rendered as one responsive list on the home page). */
export const FLOW_STEPS: Array<[string, string]> = [
  ['You get a spam text', 'Screenshot it or paste the text.'],
  ['Read on your device', 'The image never leaves your phone.'],
  ['Details scrubbed', 'Names, numbers and links removed automatically.'],
  ['You review, then file', 'Nothing is stored before you approve it.'],
  ['Patterns emerge', 'Matching scripts are reviewed, then published.'],
];

export function howItWorksSection(): string {
  return `<section class="how" aria-labelledby="how-h">
<p class="eyebrow">${t('Simple by design')}</p>
<h2 id="how-h">${t('How it works')}</h2>
<ol class="flow-steps" id="flow-steps">${FLOW_STEPS.map(
    ([h, d], i) => `<li class="flow-step"><span class="flow-num" aria-hidden="true">${i + 1}</span><strong class="flow-title">${esc(t(h))}</strong> <span class="flow-text">${esc(t(d))}</span></li>`,
  ).join('')}</ol>
<p class="how-cta"><a class="btn btn-primary" href="/report">${t('Report a spam text')}</a></p>
<p class="meta">${t('Each step is described in full in the <a href="/methodology">methodology</a> (scrubbing, matching and review) and on the <a href="/privacy">privacy page</a> (what is stored).')}</p>
</section>`;
}

export function overviewPage(ctx: PageCtx, p: OverviewParams, counts: AreaCount[], earliestDay: string | null, patterns: Pattern[] = []): string {
  const { from, to } = rangeDays(p.range);
  const total = counts.reduce((a, c) => a + c.count, 0);
  const rangeLabel =
    p.range === 'all'
      ? earliestDay
        ? t('{rangeStart} to {rangeEnd}', { rangeStart: fmtDay(earliestDay), rangeEnd: fmtDay(to) })
        : t('through {rangeEnd}', { rangeEnd: fmtDay(to) })
      : t('{rangeStart} to {rangeEnd}', { rangeStart: fmtDay(from), rangeEnd: fmtDay(to) });
  const q = (o: Partial<OverviewParams>) => {
    const m = { ...p, ...o };
    const sp = new URLSearchParams();
    // The language first, so localizeLinks() leaves these links as they are.
    const lang = currentLang();
    if (lang !== 'en') sp.set('lang', lang);
    if (m.range !== '90') sp.set('range', m.range);
    if (m.view !== 'table') sp.set('view', m.view);
    if (m.state) sp.set('state', m.state);
    if (m.ac) sp.set('ac', m.ac);
    if (m.sort !== 'count') sp.set('sort', m.sort);
    const s = sp.toString();
    return s ? `/?${s}` : '/';
  };
  const { states, unmapped } = groupByState(counts);
  const summary = stateSummary(counts);
  const sorted = [...counts].sort((a, b) =>
    p.sort === 'code' ? a.areaCode.localeCompare(b.areaCode) : b.count - a.count || a.areaCode.localeCompare(b.areaCode),
  );
  // Selections land on the detail heading; clearing returns to the section.
  const sel = (o: Partial<OverviewParams>) => `${q(o)}#detail-h`;
  const clear = `<p><a href="${esc(q({ ac: null, state: null }))}#geo-h">${t('Clear selection')}</a></p>`;
  const unknown = () => t('Unknown');

  const detail = (() => {
    if (p.ac) {
      const c = counts.find((x) => x.areaCode === p.ac);
      const info = lookupAreaCode(p.ac);
      return `<section class="detail panel" aria-labelledby="detail-h">
<h3 id="detail-h" tabindex="-1">${t('Area code {code}', { code: esc(p.ac) })}</h3>
<dl class="dl">
<dt>${t('Area code state / region')}</dt><dd>${esc(info?.region ?? unknown())}</dd>
<dt>${t('Reports')}</dt><dd class="num">${c?.count ?? 0}</dd>
<dt>${t('Timeframe')}</dt><dd>${esc(rangeLabel)}</dd>
</dl>
<p class="meta">${t('The reference region is where this area code is assigned, not where the sender is.')}</p>
${clear}
</section>`;
    }
    if (p.state) {
      const g = states.get(p.state);
      if (!g) return '';
      const n = g.areaCodes.length;
      return `<section class="detail panel" aria-labelledby="detail-h">
<h3 id="detail-h" tabindex="-1">${esc(g.name)}</h3>
<p class="count-block">${t(
        g.count === 1
          ? n === 1
            ? '{count} report across {codes} area code · {range}'
            : '{count} report across {codes} area codes · {range}'
          : n === 1
            ? '{count} reports across {codes} area code · {range}'
            : '{count} reports across {codes} area codes · {range}',
        { count: `<span class="num big">${g.count}</span>`, codes: `<span class="num">${n}</span>`, range: esc(rangeLabel) },
      )}</p>
<ul class="code-list">${g.areaCodes
        .map((a) => `<li><a href="${esc(sel({ ac: a.areaCode, state: null }))}">${t('Area code {code}', { code: esc(a.areaCode) })}</a> <span class="num">${a.count}</span></li>`)
        .join('')}</ul>
${clear}
</section>`;
    }
    return '';
  })();

  const empty = `<p class="empty">${t('No reports were filed in this date range.')}</p>`;

  const table = `<div class="panel view-table" id="table-view" tabindex="-1">
<h3 class="visually-hidden">${t('Table')}</h3>
${
  counts.length === 0
    ? empty
    : `<table class="data-table">
<caption>${t('Reports by sender area code, {range}', { range: esc(rangeLabel) })}</caption>
<thead><tr>
<th scope="col" aria-sort="${p.sort === 'code' ? 'ascending' : 'none'}"><a href="${esc(q({ sort: 'code' }))}">${t('Area code')}${p.sort === 'code' ? ' <span aria-hidden="true">▲</span>' : ''}</a></th>
<th scope="col" class="col-region"><a href="/methodology">${t('Area code state / region')}</a></th>
<th scope="col" class="num" aria-sort="${p.sort === 'count' ? 'descending' : 'none'}"><a href="${esc(q({ sort: 'count' }))}">${t('Reports')}${p.sort === 'count' ? ' <span aria-hidden="true">▼</span>' : ''}</a></th>
</tr></thead>
<tbody>${sorted
        .map((c) => {
          const info = lookupAreaCode(c.areaCode);
          const isSel = p.ac === c.areaCode;
          return `<tr${isSel ? ' class="selected" aria-current="true"' : ''}><td><a href="${esc(sel({ ac: c.areaCode, state: null }))}">${esc(c.areaCode)}</a><span class="stack-region">${esc(info?.region ?? unknown())}</span></td><td class="col-region">${esc(info?.region ?? unknown())}</td><td class="num">${c.count}</td></tr>`;
        })
        .join('')}</tbody>
</table>`
}
</div>`;

  const mapOpts = { rangeLabel, selectedState: p.state, hrefForState: (st: string) => sel({ state: st, ac: null }) };
  const unmappedN = unmapped.reduce((a, c) => a + c.count, 0);
  const unmappedNote = unmapped.length
    ? `<p class="meta">${t(
        unmappedN === 1
          ? '{n} report uses area codes without a map position (toll-free or territories): {codes}. They are included in the table.'
          : '{n} reports use area codes without a map position (toll-free or territories): {codes}. They are included in the table.',
        { n: unmappedN, codes: unmapped.map((u) => `<a href="${esc(sel({ ac: u.areaCode, state: null }))}">${esc(u.areaCode)}</a>`).join(', ') },
      )}</p>`
    : '';
  // Skip past the map's many tile links to the next section; the table is one link away.
  const toTable = `<p class="map-links"><a class="skip-map" href="#sources-h">${t('Skip map to next section')}</a> · <a href="${esc(q({ view: 'table' }))}">${t('View results table')}</a></p>`;
  const graphic =
    counts.length === 0
      ? empty
      : !summary
        ? `<p class="empty">${t('No reports in this range are assigned to a state or DC.')}</p>`
        : `<p class="map-summary"><strong class="num">${esc(summary.text)}</strong></p>
<p class="meta map-key">${t('Tiles group reports by the state assigned to the displayed sender’s area code.')}</p>
<div class="map-body">
${renderMap(counts, mapOpts)}
${renderStateList(counts, mapOpts)}
</div>
${renderLegend()}`;

  const map = `<div class="panel view-map" id="map-view">
<h3 id="map-h">${t('Reports by state')}</h3>
${toTable}
${graphic}
${unmappedNote}
</div>`;

  const tabs = `<nav class="tabs" aria-label="${esc(t('Choose a view'))}">
<a href="${esc(q({ view: 'table' }))}"${p.view === 'table' ? ' aria-current="page"' : ''}>${t('Table')}</a>
<a href="${esc(q({ view: 'map' }))}"${p.view === 'map' ? ' aria-current="page"' : ''}>${t('Map')}</a>
</nav>`;

  // Live figures for the selected range (never a hardcoded snapshot).
  const places = summary?.places ?? 0;
  const metrics = `<div class="metrics" role="group" aria-label="${t('Pilot figures, {range}', { range: esc(rangeLabel) })}">
<div class="metric"><strong class="num">${total}</strong><small>${t(total === 1 ? 'Report filed' : 'Reports filed')}</small></div>
<div class="metric"><strong class="num">${places}</strong><small>${t(places === 1 ? 'State or DC with reports' : 'States and DC with reports')}</small></div>
<div class="metric"><strong class="num">${patterns.length}</strong><small>${t(patterns.length === 1 ? 'Pattern published' : 'Patterns published')}</small></div>
</div>
<p class="metrics-note meta">${esc(rangeLabel)} · ${t('counted live from filed reports · patterns appear only after review')}</p>`;

  const body = `
<section class="hero">
<div class="wrap hero-grid">
<div class="hero-copy">
<p class="tagline">${t('A pilot tracking recurring spam texts.')}</p>
<h1>${t('Report a spam text to expose shared scripts, anonymously')}</h1>
<p class="lead">${t('Paste the text or use a screenshot. Screenshots stay on your device, and names, numbers and links are scrubbed automatically before you approve. Nothing is stored before you approve it, and you can <a href="/delete">delete a report later</a>.')}</p>
<p class="hero-purpose">${t('Filing adds to a public record of recurring spam scripts. It does not block the sender or file a complaint with your carrier or regulators.')}</p>
<p class="hero-actions"><a class="btn btn-primary" href="/report">${t('Report a spam text')}</a> <a href="/privacy">${t('How your report is protected')}</a></p>
<ul class="hero-trust"><li>${t('No account')}</li><li>${t('Review before filing')}</li><li>${t('Screenshots read on your device')}</li><li>${t('Delete a report later')}</li></ul>
</div>
<div class="hero-art"><img src="/static/img/hero-illustration.svg" alt="" width="685" height="580"></div>
</div>
</section>
<div class="band band-tint band-how"><div class="wrap">
${howItWorksSection()}
</div></div>
<div class="wrap metrics-wrap">
${metrics}
</div>
<div class="band band-tint"><div class="wrap">
${recurringScriptsSection(patterns)}
</div></div>
<div class="band"><div class="wrap">
<section class="geo" aria-labelledby="geo-h">
<p class="eyebrow">${t('Claimed origin only')}</p>
<h2 id="geo-h">${t('Reported sender area codes')}</h2>
${claimedOriginWarning()}
<form class="filters" method="get" action="/">
<label for="range">${t('Date range')}</label>
<select id="range" name="range">${RANGES.map(([k, l]) => `<option value="${k}"${p.range === k ? ' selected' : ''}>${esc(t(l))}</option>`).join('')}</select>
${p.view !== 'table' ? `<input type="hidden" name="view" value="${esc(p.view)}">` : ''}
<button class="btn btn-secondary" type="submit">${t('Apply')}</button>
</form>
<p class="count-block" aria-live="polite">${t(total === 1 ? '{count} report filed · {range}' : '{count} reports filed · {range}', { count: `<span class="num big">${total}</span>`, range: esc(rangeLabel) })}</p>
${tabs}
${detail}
<div class="views-wrap">
<div class="views views-${p.view}">
${p.view === 'map' ? map : table}
</div>
</div>
<p class="meta">${t('Counts are voluntary reports and do not measure how much spam is sent. <a href="/methodology">How counts work</a>.')}</p>
</section>
</div></div>
<div class="band band-tint"><div class="wrap">
<section class="sources" aria-labelledby="sources-h">
<h2 id="sources-h">${t('Sources')}</h2>
<ul class="meta">
<li>${t('Figures on this page: {reports}, {places}, and {patterns}, {rangeName} ({range}). Counted live from reports filed on this site.', {
    reports: t(total === 1 ? '{count} report filed' : '{count} reports filed', { count: `<span class="num">${total}</span>` }),
    places: t(places === 1 ? '{count} state or DC with reports' : '{count} states and DC with reports', { count: `<span class="num">${places}</span>` }),
    patterns: t(patterns.length === 1 ? '{count} pattern published' : '{count} patterns published', { count: `<span class="num">${patterns.length}</span>` }),
    rangeName: esc(t(RANGES.find((r) => r[0] === p.range)![1]).toLowerCase()),
    range: esc(rangeLabel),
  })}</li>
<li>${t('Counts are voluntary reports and do not measure how much spam is sent. Area codes are the sender’s claimed origin, not a location. <a href="/methodology">How counts work</a>.')}</li>
<li>${t('Patterns are published only after maintainer review: <a href="/patterns">published patterns</a> · <a href="/methodology#review">how review works</a>.')}</li>
</ul>
</section>
</div></div>`;
  return layout({
    title: t('Spam text reports and recurring scripts'),
    path: '/',
    body,
    demo: ctx.cfg.intakeMode === 'demo',
    fullBleed: true,
    description: t('See which sender area codes and recurring scripts people report in spam texts, and file your own anonymously. Screenshots are read on your device.'),
  });
}

// ---------------- Report flow ----------------

// In-service area codes for the browser's sender-number fallback (public NANPA facts).
const REPORT_NPAS = allAreaCodes().map((a) => a.code).sort().join(' ');

export function reportPage(ctx: PageCtx): string {
  const c = ctx.cfg;
  const cats = CATEGORIES.map(([v, l]) => `<option value="${v}">${esc(t(l))}</option>`).join('');
  const paused = ctx.paused
    ? `<div class="notice notice-error" role="alert"><p>${t('<strong>Reporting is paused on this site right now.</strong> Nothing you enter will be saved. You can still forward the original text to <strong>7726 (SPAM)</strong>, and everything else on this site still works.')}</p></div>`
    : '';
  const body = `
<div class="narrow" id="report-app" data-max-mb="${c.maxScreenshotMb}" data-max-pixels="${c.maxScreenshotPixels}" data-paused="${ctx.paused ? '1' : '0'}" data-npas="${REPORT_NPAS}">
${paused}
<noscript><div class="notice notice-error"><p>${t('The report form needs JavaScript to prepare your review screen. Screenshot reading happens on your device, which also needs JavaScript. You can forward the original text to <strong>7726 (SPAM)</strong> instead.')}</p></div></noscript>

<section data-step="start" aria-labelledby="start-h">
<h1 id="start-h" tabindex="-1">${esc(t('Report a spam text'))}</h1>
<p>${t('Both ways lead to a privacy review. Nothing is saved until you select <strong>File this report</strong>. No account needed.')}</p>
<div class="choice">
<div class="choice-item">
<span class="icon-box">${ICON.image}</span>
<h2>${esc(t('Upload a screenshot.'))}</h2>
<p>${esc(t('We read it once to find the sender number and message. We don’t store the image. You’ll review the scrubbed report before filing.'))}</p>
<p class="meta">${t('The screenshot is read by software running in your browser. The image never leaves your device. Supported: PNG, JPEG, WebP, up to {mb} MB. <a href="/privacy#screenshots">How screenshot reading works</a>', { mb: c.maxScreenshotMb })}</p>
<p class="meta" id="share-hint">${esc(t('On Android, once the app is installed you can also share a screenshot to Spam Patterns straight from your photos or messages app.'))}</p>
<label class="btn btn-primary file-btn" for="shot">${esc(t('Upload a screenshot'))}</label>
<input class="visually-hidden" type="file" id="shot" accept="image/png,image/jpeg,image/webp">
<p class="field-error" id="shot-error" role="alert" hidden></p>
</div>
<div class="choice-item">
<span class="icon-box teal">${ICON.type}</span>
<h2>${esc(t('Enter manually.'))}</h2>
<p>${esc(t('Type or paste the sender number and the message.'))}</p>
<button class="btn btn-secondary" type="button" data-go="details">${esc(t('Enter manually'))}</button>
</div>
</div>
</section>

<section data-step="reading" hidden aria-labelledby="reading-h">
<h1 id="reading-h" tabindex="-1">${esc(t('Reading screenshot…'))}</h1>
<p aria-live="polite" id="reading-status">${esc(t('Reading on your device. This can take a few seconds.'))}</p>
<button class="btn btn-secondary" type="button" id="cancel-read">${esc(t('Cancel'))}</button>
</section>

<section data-step="details" hidden aria-labelledby="details-h">
<h1 id="details-h" tabindex="-1">${esc(t('Enter report details'))}</h1>
<div class="notice notice-error" id="details-summary" role="alert" tabindex="-1" hidden></div>
<p class="notice notice-info" id="details-info" hidden></p>
<p class="meta" id="d-engine" hidden></p>
<form id="details-form" novalidate>
<div class="field">
<label for="f-number">${esc(t('Sender number'))}</label>
<p class="help" id="h-number">${esc(t('The number the text came from. Spaces, dashes and +1 are fine. US numbers only.'))}</p>
<input id="f-number" name="number" type="tel" inputmode="tel" autocomplete="off" aria-describedby="h-number e-number" required>
<p class="field-error" id="e-number" hidden></p>
</div>
<div class="field">
<label for="f-message">${esc(t('Message'))}</label>
<p class="help" id="h-message">${esc(t('Paste the spam text. Names, numbers, links and emails are removed in the next step.'))}</p>
<textarea id="f-message" name="message" rows="7" autocomplete="off" aria-describedby="h-message e-message" required></textarea>
<p class="field-error" id="e-message" hidden></p>
</div>
<div class="field">
<label for="f-category">${t('Category <span class="optional">(optional)</span>')}</label>
<select id="f-category" name="category" aria-describedby="e-category">${cats}</select>
<p class="field-error" id="e-category" hidden></p>
</div>
<div class="field">
<label for="f-city">${t('City named in the message <span class="optional">(optional)</span>')}</label>
<p class="help" id="h-city">${esc(t('Only if the message itself names a city. Leave blank otherwise. This is kept separately from the sender’s area code.'))}</p>
<input id="f-city" name="city" type="text" autocomplete="off" aria-describedby="h-city e-city">
<p class="field-error" id="e-city" hidden></p>
</div>
<button class="btn btn-primary" type="submit">${esc(t('Review report'))}</button>
<button class="btn btn-link" type="button" data-go="start">${esc(t('Back'))}</button>
</form>
</section>

<section data-step="review" hidden aria-labelledby="review-h">
<h1 id="review-h" tabindex="-1">${esc(t('Review before filing.'))}</h1>
<p>${t('Check the scrubbed message below and remove any personal details still visible. We keep the sender’s area code, prefix, and a keyed hash of the number. We don’t store the full number. The public fields are listed below. We save the report only when you select <strong>File this report</strong>.')}</p>
<div class="notice notice-info" id="review-changed" role="alert" tabindex="-1" hidden></div>
<h2>${esc(t('Scrubbed message'))}</h2>
<div class="scrubbed panel" id="r-message"></div>
<ul class="meta" id="r-notes"></ul>
<p class="meta" id="r-engine" hidden></p>
<details class="remove-more">
<summary>${esc(t('Remove more text'))}</summary>
<div class="field">
<label for="f-remove">${esc(t('Text to remove'))}</label>
<p class="help" id="h-remove">${t('Copy any words from the scrubbed message that are still private, such as a name or street. They will be replaced with {mask}.', { mask: esc(MASK.reporter) })}</p>
<input id="f-remove" type="text" autocomplete="off" aria-describedby="h-remove">
</div>
<button class="btn btn-secondary" type="button" id="add-removal">${esc(t('Remove this text'))}</button>
</details>
<h2>${esc(t('Sender information we keep'))}</h2>
<dl class="dl" id="r-kept"></dl>
<p class="meta">${t('The keyed hash is a scrambled code made from the full number with a secret key held only by this site. It lets the site notice the same sender sending the same text twice in a short time. It is never shown or exported, and it expires after {days} days.', { days: c.senderTokenTtlDays })}</p>
<h2>${esc(t('What may appear publicly'))}</h2>
<dl class="dl" id="r-public"></dl>
<p class="meta">${esc(t('Message text, the prefix, the city and the keyed hash are never shown publicly or exported.'))}</p>
<p class="terms">${esc(t('By filing, you dedicate your scrubbed report to the public domain (CC0) to the extent you hold rights in it. Deleting removes it from this site and future data releases; copies already downloaded cannot be recalled.'))}</p>
<div class="notice notice-error" id="file-error" role="alert" tabindex="-1" hidden></div>
<button class="btn btn-primary" type="button" id="file-btn">${esc(t('File this report'))}</button>
<button class="btn btn-secondary" type="button" data-go="details">${esc(t('Edit details'))}</button>
</section>

<section data-step="done" hidden aria-labelledby="done-h">
<div class="notice notice-success"><h1 id="done-h" tabindex="-1">${esc(t('Report filed.'))}</h1>
<p id="done-message">${t('Save your deletion receipt code to remove this report later. Anyone with the code can request deletion. You can also forward the original text to <strong>7726 (SPAM)</strong>.')}</p></div>
<h2>${esc(t('Deletion receipt code'))}</h2>
<p class="receipt" id="receipt"></p>
<button class="btn btn-secondary" type="button" id="copy-receipt">${esc(t('Copy code'))}</button>
<p class="meta" id="copy-status" aria-live="polite"></p>
<p class="meta">${esc(t('This code is shown only once. We store only a scrambled version of it, so we cannot show it again or recover it for you.'))}</p>
<p class="meta" id="receipt-saved" hidden>${t('The code is also saved in this browser on this device, so you can delete the report later from the <a href="/delete">delete page</a>. It is still worth keeping a copy somewhere else.')}</p>
${reporterPathSection()}
<p><a href="/delete">${esc(t('Delete a report'))}</a> · <a href="/">${esc(t('Back to overview'))}</a></p>
</section>
</div>`;
  return layout({
    title: t('Report a spam text'),
    path: '/report',
    body,
    demo: c.intakeMode === 'demo',
    scripts: ['/static/js/ocr-extract.js', '/static/js/receipts.js', '/static/js/report.js'],
    description: t('File a spam text anonymously in under a minute. Screenshots are read on your device, and you review the scrubbed report before anything is saved.'),
    schema: reportHowTo(c),
  });
}

/** What to do with the original after filing (the report page's last step and /report/complete). */
function reporterPathSection(): string {
  return `<section class="reporter-path" aria-label="${esc(t('What to do with your original'))}">
<h2>${esc(t('Keep your original'))}</h2>
<p>${esc(t('Your original is yours to keep. Leave the text on your phone, and if you used a screenshot, it stays in your photos; this site never had it. Save your deletion receipt code too.'))}</p>
<h2>${esc(t('If you want action taken on the message'))}</h2>
<p>${t('Forward the original text to <strong>7726</strong> (it spells SPAM), and you can file a complaint with the <a href="https://consumercomplaints.fcc.gov/">FCC</a> or the <a href="https://reportfraud.ftc.gov/">FTC</a>. Carriers and regulators can act on the original message. This site publishes only scrubbed patterns.')}</p>
<h2>${esc(t('Junk mail too?'))}</h2>
<p>${t('Paper junk mail has its own opt-outs. <a href="/junk-mail">How to cut down junk mail</a> lists the routes that work and what each one covers.')}</p>
</section>`;
}

/** HowTo structured data for /report. Each step restates text the report page shows. */
export function reportHowTo(c: Config): SchemaNode {
  return {
    '@type': 'HowTo',
    name: t('Report a spam text'),
    description: t('Both ways lead to a privacy review. Nothing is saved until you select File this report. No account needed.'),
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: t('Upload a screenshot or enter manually'),
        text: t('Upload a screenshot (PNG, JPEG, WebP, up to {mb} MB), or enter manually: type or paste the sender number and the message.', { mb: c.maxScreenshotMb }),
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: t('The screenshot is read on your device'),
        text: t('The screenshot is read by software running in your browser. The image never leaves your device. We read it once to find the sender number and message. We don’t store the image.'),
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: t('Review before filing'),
        text: t('Check the scrubbed message and remove any personal details still visible. We save the report only when you select File this report.'),
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: t('Save your deletion receipt code'),
        text: t('Save your deletion receipt code to remove this report later. Anyone with the code can request deletion. This code is shown only once.'),
      },
    ],
  };
}

export function reportCompletePage(ctx: PageCtx): string {
  const body = `<div class="narrow"><h1>${esc(t('Report filed'))}</h1>
<p>${esc(t('The deletion receipt code is shown only once, right after filing, and is never put in a web address. If you did not copy it, we cannot show it again.'))}</p>
${reporterPathSection()}
<p><a href="/delete">${esc(t('Delete a report'))}</a> · <a href="/">${esc(t('Back to overview'))}</a></p></div>`;
  return layout({ title: t('Report filed'), path: '/report/complete', body, demo: ctx.cfg.intakeMode === 'demo' });
}

// ---------------- Delete ----------------

export type DeleteView =
  | { kind: 'form'; error?: string }
  | { kind: 'confirm'; code: string }
  | { kind: 'result'; status: 'deleted' | 'already_deleted' | 'not_found'; message: string };

/** v.error and v.message arrive already translated (src/app.ts). */
export function deletePage(ctx: PageCtx, v: DeleteView): string {
  let inner = '';
  if (v.kind === 'form') {
    inner = `<h1>${esc(t('Delete a report'))}</h1>
<p>${esc(t('Enter the receipt code you saved when you filed. Anyone with the code can delete the report, so keep it private.'))}</p>
${v.error ? `<div class="notice notice-error" role="alert"><p>${esc(v.error)}</p></div>` : ''}
${storedReceiptsSection(ctx)}
<form method="post" action="/delete" autocomplete="off">
<input type="hidden" name="step" value="confirm">
<div class="field"><label for="code">${esc(t('Receipt code'))}</label>
<p class="help" id="h-code">${esc(t('32 letters and numbers, dashes optional.'))}</p>
<input id="code" name="code" class="mono" type="text" spellcheck="false" autocapitalize="characters" aria-describedby="h-code" required></div>
<button class="btn btn-primary" type="submit">${esc(t('Continue'))}</button>
</form>
<p class="meta">${t('Deleting removes the report from counts and patterns on this site and from all future data releases. Copies that other people already downloaded cannot be recalled. <a href="/privacy#deletion">Deletion details</a>')}</p>
<p class="meta">${t('Lost your code? We cannot look a report up without it. If a published page harms you, use the <a href="/privacy#contest">private flag form</a> instead.')}</p>`;
  } else if (v.kind === 'confirm') {
    inner = `<h1>${esc(t('Delete this report?'))}</h1>
<p>${esc(t('This permanently removes the report linked to the code you entered. It cannot be undone.'))}</p>
<form method="post" action="/delete" autocomplete="off" id="delete-confirm-form">
<input type="hidden" name="step" value="delete">
<input type="hidden" name="code" value="${esc(v.code)}">
<button class="btn btn-danger" type="submit">${esc(t('Delete report'))}</button>
<a class="btn btn-link" href="/delete">${esc(t('Cancel'))}</a>
</form>`;
  } else {
    const ok = v.status !== 'not_found';
    inner = `<div class="notice ${ok ? 'notice-success' : 'notice-error'}" role="status"><h1>${esc(
      v.status === 'deleted' ? t('Report deleted') : v.status === 'already_deleted' ? t('Already deleted') : t('No report found'),
    )}</h1><p>${esc(v.message)}</p></div>
${ok ? `<p>${t('Copies already downloaded cannot be recalled. Deleted reports do not return when the site restores a backup; see <a href="/privacy#deletion">deletion details</a>.')}</p>` : `<p><a href="/delete">${esc(t('Try another code'))}</a></p>`}
<p><a href="/">${esc(t('Back to overview'))}</a></p>`;
  }
  const status = v.kind === 'result' ? ` data-status="${esc(v.status)}"` : '';
  return layout({
    title: t('Delete a report'),
    path: '/delete',
    body: `<div class="narrow" id="delete-page" data-view="${esc(v.kind)}"${status}>${inner}</div>`,
    demo: ctx.cfg.intakeMode === 'demo',
    scripts: ['/static/js/receipts.js'],
    description: t('Delete a spam text report you filed, using the receipt code you saved when you filed it.'),
  });
}

/**
 * Codes saved in this browser (receipts.js fills the list and unhides the
 * section; without stored codes or localStorage it stays hidden). Entries
 * show the filing date only: a code is submitted by its button, never shown.
 */
function storedReceiptsSection(ctx: PageCtx): string {
  return `<section id="stored-receipts" class="stored-receipts" aria-labelledby="stored-receipts-h" hidden>
<h2 id="stored-receipts-h">${esc(t('Reports filed from this browser'))}</h2>
<p>${esc(t('This browser saved the receipt codes of these reports on this device. Choose one to delete that report.'))}</p>
<ul class="stored-receipts-list"></ul>
<div class="stored-receipts-forget">
<button class="btn btn-secondary" type="button" id="forget-receipts">${esc(t('Remove these codes from this device'))}</button>
<p class="meta">${t('This does <strong>not</strong> delete any report. It only erases the saved codes from this browser. Afterwards, deleting one of these reports needs its receipt code, or an email to <a href="mailto:{email}">{email}</a>.', { email: esc(ctx.cfg.abuseContact) })}</p>
</div>
</section>
<p class="notice notice-info" id="forget-status" role="status" tabindex="-1" hidden></p>`;
}

// ---------------- Patterns ----------------


/** A pattern's categories, "Label (n), Label (n)", escaped. Category labels are translated by the report dictionary. */
function categoryList(p: Pattern): string {
  return esc(p.categories.map((c) => `${t(c.label)} (${c.count})`).join(', '));
}

function patternCard(p: Pattern): string {
  return `<li class="pattern panel">
<h2><a href="/patterns/${esc(p.id)}">${t('Template match · {n} reports', { n: p.count })}</a></h2>
<p class="badge tier-${p.tier}">${esc(t(p.label))}</p>
<dl class="dl compact">
${t('<dt>Pattern ID</dt><dd class="mono">{id}</dd>\n<dt>Reports</dt><dd class="num">{count}</dd>\n<dt>Dates</dt><dd>{from} to {to}</dd>\n<dt>Category</dt><dd>{categories}</dd>', {
  id: esc(p.id),
  count: p.count,
  from: esc(fmtDay(p.firstDay)),
  to: esc(fmtDay(p.latestDay)),
  categories: categoryList(p),
})}
</dl>
</li>`;
}

function tierExplain(): string {
  return `<ul class="meta">
<li>${t('<strong>{label}</strong>: the masked text is the same.', { label: t(TIER_LABEL.exact) })}</li>
<li>${t('<strong>{label}</strong>: the masked text is nearly the same.', { label: t(TIER_LABEL.near) })}</li>
<li>${t('<strong>{label}</strong>: different wording following the same sequence of moves. This alone never means the texts came from the same sender.', { label: t(TIER_LABEL.formula) })}</li>
</ul>`;
}

export function patternsPage(ctx: PageCtx, patterns: Pattern[]): string {
  const hero = {
    kicker: t('Understanding the signal'),
    title: t('Patterns'),
    html: `<p class="lead">${t('Recurring messages and scripts, published after review. A pattern shows repetition in the reports. It does not show who sent the texts, or that they share a sender.')}</p>`,
  };
  const rules = esc(rulesVersionsText());
  const grammar = esc(SKELETON_GRAMMAR_VERSION);
  const body = `<div class="prose">
<p>${esc(reviewTriggerText())} ${t('A published pattern goes back to review if its matching templates change, and leaves this page if deletions take it below {n} reports.', { n: PATTERN_THRESHOLD })}</p>
${correctionLine(ctx.cfg)}
${tierExplain()}
${
  patterns.length === 0
    ? `<div class="empty-box"><img src="/static/img/pattern-illustration.svg" alt="" width="560" height="240"><div>
${t('<p class="status-mark">Pilot in progress</p>\n<p class="empty">No pattern has been published yet.</p>')}
</div></div>`
    : `<ul class="pattern-list">${patterns.map(patternCard).join('')}</ul>`
}
<p class="meta">${t('{rules} · Skeleton grammar {grammar}. <a href="/methodology#clustering">How patterns are matched</a> · <a href="/methodology#review">How review works</a>. To contest a pattern privately, use the <a href="/privacy#contest">private flag form</a>.', { rules, grammar })}</p>
<section class="sources" aria-labelledby="sources-h">
${t('<h2 id="sources-h">Sources</h2>\n<ul class="meta">\n<li>Published patterns: <span class="num">{count}</span>, from reports filed on this site. Each has at least {n} eligible matching reports and was published after maintainer review.</li>\n<li>Matching rules: {rules} · Skeleton grammar {grammar}. <a href="/methodology#versions">Rules versions</a>.</li>\n<li>Method: <a href="/methodology#clustering">How patterns are matched</a> · <a href="/methodology#review">How review works</a>.</li>\n</ul>', {
  count: patterns.length,
  n: PATTERN_THRESHOLD,
  rules,
  grammar,
})}
</section>
</div>`;
  return layout({
    title: t('Published spam text patterns'),
    path: '/patterns',
    body,
    hero,
    demo: ctx.cfg.intakeMode === 'demo',
    description: t('Recurring spam text messages and scripts, published only after maintainer review. A pattern shows repetition, not who sent the texts.'),
  });
}

export function patternDetailPage(ctx: PageCtx, p: Pattern | null): string {
  if (!p) {
    return layout({
      title: t('Pattern unavailable'),
      path: '/patterns',
      demo: ctx.cfg.intakeMode === 'demo',
      body: `<h1>${t('This pattern is not available')}</h1>
<p>${t('It may not be published yet, it may be back under review, it may have dropped below {n} eligible reports after a deletion, or the link may be wrong.', { n: PATTERN_THRESHOLD })}</p>
${correctionLine(ctx.cfg)}
<p>${t('<a href="/patterns">All patterns</a> · <a href="/methodology#review">How review works</a>')}</p>`,
    });
  }
  const grammar = esc(p.grammarVersion);
  const body = `<h1>${t('Template match · {n} reports', { n: p.count })}</h1>
<p class="badge tier-${p.tier}">${esc(t(p.label))}</p>
${correctionLine(ctx.cfg)}
<dl class="dl">
${t('<dt>Pattern ID</dt><dd class="mono">{id}</dd>\n<dt>Reports</dt><dd class="num">{count}</dd>\n<dt>First report</dt><dd>{first}</dd>\n<dt>Latest report</dt><dd>{latest}</dd>\n<dt>Categories</dt><dd>{categories}</dd>\n<dt>Sender area codes</dt><dd>{areaCodes}</dd>\n<dt>Skeleton grammar</dt><dd>{grammar}</dd>', {
  id: esc(p.id),
  count: p.count,
  first: esc(fmtDay(p.firstDay)),
  latest: esc(fmtDay(p.latestDay)),
  categories: categoryList(p),
  areaCodes: t(p.distinctAreaCodes === 1 ? '{n} different area code' : '{n} different area codes', { n: p.distinctAreaCodes }),
  grammar,
})}
</dl>
${claimedOriginWarning()}
${
  p.skeleton
    ? `<h2>${t('Script skeleton')}</h2>
<p class="mono skeleton">${esc(p.skeleton.split('>').join(' → '))}</p>
<h2>${t('Fully masked example')}</h2>
<p class="scrubbed panel">${esc(p.example)}</p>
<p class="meta">${t('This example is built from the skeleton’s slots, not from any report’s text.')}</p>`
    : `<p class="meta">${t('These messages do not follow a recognizable script skeleton in grammar {grammar}.', { grammar })}</p>`
}
<p>${
    p.tier === 'formula'
      ? t('These reports follow the same script pattern with different wording. A shared script can be used by many unrelated senders, for example businesses using the same texting template. It does not establish a common sender or coordination.')
      : t('Matching text shows the message was repeated. It does not establish who sent it, or that the reports came from different people.')
  }</p>
<p class="meta">${t('Published after review. {rules}. We publish the pattern, not its members: no numbers, prefixes, businesses or message text. <a href="/methodology#clustering">Clustering rules</a> · <a href="/privacy#contest">Flag this pattern privately</a>', { rules: esc(rulesVersionsText()) })}</p>`;
  return layout({ title: t('Pattern {id}', { id: p.id }), path: '/patterns', body, demo: ctx.cfg.intakeMode === 'demo' });
}

// ---------------- Data (aggregate-only; Decision C not taken) ----------------

export const DATA_NOTICE =
  'No warranty of accuracy. Area codes are claimed origin. A listing is not an allegation against any person or business. Reports are voluntary submissions and counts do not measure spam prevalence.';

export function dataPage(ctx: PageCtx): string {
  const hero = { kicker: t('Public data, carefully'), title: t('Data') };
  const body = `<div class="prose">
<section class="notice notice-info" aria-labelledby="scope-h">
<h2 id="scope-h">${t('No data release yet')}</h2>
<p>${t('This site has not released any data. There is no feed and no download, and there are no report-level records of any kind. When a release is approved, it will contain only the aggregate counts described below, and this page will show its date and version.')}</p>
</section>
<h2>${t('What a release will contain')}</h2>
<p>${t('Separate marginal counts, never joined together:')}</p>
<ul>
<li>${t('reports by sender area code')}</li>
<li>${t('reports by category')}</li>
<li>${t('reports by pattern skeleton (grammar version included)')}</li>
<li>${t('reports by UTC day')}</li>
</ul>
<p>${t('Never included: message text, sender numbers, prefixes, keyed hashes, fingerprints tied to reports, cities, hours, or any combination of these.')}</p>
<h2>${t('Suppression and delay rules')}</h2>
<ul>
<li>${t('A count appears only if it covers at least <strong>10 reports</strong>. Smaller counts are suppressed.')}</li>
<li>${t('A report becomes eligible only <strong>7 days</strong> after it is filed.')}</li>
<li>${t('Time is day or coarser. Never hour.')}</li>
<li>${t('Before each release, successive releases are compared so a suppressed count cannot be worked out by subtracting one release from another.')}</li>
<li>${t('Deleted reports are removed from all future releases. Copies already downloaded cannot be recalled.')}</li>
</ul>
<h2>${t('Freshness')}</h2>
<dl class="dl">${t('<dt>Latest release</dt><dd>None</dd><dt>Release cadence</dt><dd>Not scheduled</dd>')}</dl>
<h2>${t('Schema')}</h2>
<p>${t('The planned release format is published as a JSON Schema: <a href="/data/schema.json">/data/schema.json</a>. Field definitions are in the data dictionary in the project repository (<span class="mono">docs/data-dictionary.md</span>).')}</p>
<h2>${t('Notice')}</h2>
<p class="notice notice-warning">${esc(t(DATA_NOTICE))}</p>
<h2>${t('License')}</h2>
<p>${t('Approved aggregate releases will be dedicated to the public domain (CC0), only to the extent Reseed and submitters hold rights. Spam senders’ own wording is not ours to dedicate and is never released.')}</p>
<p class="meta">${t('Questions or corrections: <a href="mailto:{email}">{email}</a>. Please do not include original message text or phone numbers in routine inquiries.', { email: esc(ctx.cfg.abuseContact) })}</p>
</div>`;
  return layout({
    title: t('Data'),
    path: '/data',
    body,
    hero,
    demo: ctx.cfg.intakeMode === 'demo',
    description: t('What a Spam Patterns data release will contain: aggregate counts only, with suppression and delay rules. No data has been released yet.'),
  });
}

export const AGGREGATE_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'spam-text-map/aggregate-release/v1',
  title: 'Spam Patterns aggregate release (v1, not yet released)',
  type: 'object',
  required: ['schema_version', 'generated_day', 'latest_included_day', 'grammar_version', 'notice', 'min_bucket', 'delay_days', 'marginals'],
  additionalProperties: false,
  properties: {
    schema_version: { const: 1 },
    generated_day: { type: 'string', format: 'date', description: 'UTC day the release was generated.' },
    latest_included_day: { type: 'string', format: 'date', description: 'Latest UTC filing day included (at least 7 days before generated_day).' },
    grammar_version: { type: 'string', description: 'Skeleton grammar version, e.g. "v1".' },
    notice: { const: DATA_NOTICE },
    min_bucket: { const: 10 },
    delay_days: { const: 7 },
    marginals: {
      type: 'object',
      additionalProperties: false,
      required: ['by_area_code', 'by_category', 'by_skeleton', 'by_day'],
      properties: {
        by_area_code: { $ref: '#/$defs/buckets', description: 'Counts by sender area code (claimed origin).' },
        by_category: { $ref: '#/$defs/buckets' },
        by_skeleton: { $ref: '#/$defs/buckets', description: 'Keys are skeleton strings such as GREETING>PERSONA>OFFER>CTA.' },
        by_day: { $ref: '#/$defs/buckets', description: 'Keys are UTC days (YYYY-MM-DD).' },
      },
    },
  },
  $defs: {
    buckets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'count'],
        properties: { key: { type: 'string' }, count: { type: 'integer', minimum: 10 } },
      },
    },
  },
} as const;

// ---------------- Privacy & threat model ----------------

/**
 * Same-connection duplicate control runs only when a trusted proxy supplies
 * the client address. Without one, the copy must not claim it.
 */
export function connectionDedupEnabled(c: PageCtx['cfg']): boolean {
  return c.trustedProxies.length > 0;
}

/** The language-preference disclosure on the privacy page (id="language-pref"). */
export const LANGUAGE_PREF_TEXT =
  'If you choose a language with the flags at the top of the page, your browser remembers it in its local storage on this device (one setting, “stm-lang”), so the site opens in that language next time. It is never sent to the server, except as the ?lang= in the page address.';

export function privacyPage(ctx: PageCtx, flagResult?: { ok: boolean; message: string }): string {
  const c = ctx.cfg;
  const dedupOn = connectionDedupEnabled(c);
  const hero = {
    kicker: t('Your data, your choice'),
    title: t('Privacy & threat model'),
    html: `<p class="lead">${t('What this site keeps, what it publishes, and what it cannot protect you from.')}</p>`,
  };
  const days = c.senderTokenTtlDays;
  const hours = c.duplicateWindowHours;
  const body = `<div class="prose">
<img class="process-graphic" src="/static/img/privacy-illustration.svg" alt="" width="660" height="350">

<h2 id="screenshots">${t('Screenshots')}</h2>
<p>${t(
    'Screenshots are read on your device. If your browser has built-in text detection (the Shape Detection API), that is used first; otherwise open-source text-recognition software (Tesseract) runs inside your browser. The review screen says which one read your screenshot. Either way, the image is not uploaded. Only the text you review is sent, and only when you ask for the review screen. The image is not kept in a draft, a thumbnail, or any error report. Files are limited to {mb} MB and {mp} megapixels.',
    { mb: c.maxScreenshotMb, mp: (c.maxScreenshotPixels / 1_000_000).toFixed(0) },
  )}</p>
<p id="shared-screenshots">${t('A screenshot you share to Spam Patterns from another app is handled on your device the same way as one you pick: the installed app keeps it in your browser only until the report page opens it, then deletes it, and it is not sent to the server.')}</p>
<p>${t('Because the image is processed on your device, there is no photo metadata (such as location data) for us to receive or remove.')}</p>

<h2 id="scrubbing">${t('Scrubbing')}</h2>
<p>${t('Before you file, fixed rules remove the greeting name, the sender’s first name, phone numbers, every other number, emails, links, places and other capitalized words that may be names. Rules also drop phone screen labels, the contact name at the top of a conversation, your own replies, and other conversations visible in a screenshot. The rules are the same for every report. Nothing in the message can change them, including text written to look like instructions.')}</p>
<p>${t('Rules make mistakes. That is why you review the scrubbed message and can remove more text before filing.')}</p>

<h2 id="storage">${t('What is stored')}</h2>
<table class="data-table"><thead>${t('<tr><th scope="col">Field</th><th scope="col">Stored</th><th scope="col">Public</th></tr>')}</thead><tbody>
${t('<tr><td>Screenshot</td><td>No (never uploaded)</td><td>No</td></tr>')}
${t('<tr><td>Full sender number</td><td>No (used once, then discarded)</td><td>No</td></tr>')}
${t('<tr><td>Sender area code</td><td>Yes</td><td>Yes, as a count</td></tr>')}
${t('<tr><td>Sender prefix (next 3 digits)</td><td>Yes</td><td>No</td></tr>')}
${t('<tr><td>Keyed hash of the number</td><td>Yes, expires after {days} days</td><td>No</td></tr>', { days })}
${t('<tr><td>Scrubbed message</td><td>Yes</td><td>No, only pattern counts</td></tr>')}
${t('<tr><td>Category</td><td>Yes</td><td>Yes, as a count</td></tr>')}
${t('<tr><td>City named in the message</td><td>Yes</td><td>No</td></tr>')}
${t('<tr><td>Filing time</td><td>Yes</td><td>Day only</td></tr>')}
${
    dedupOn
      ? t('<tr><td>Your IP address</td><td>No. Held in memory only, as keyed codes: up to an hour for rate limits, and up to 7 days (reset when the server restarts) to spot the same report filed again from the same connection. The key for that check is created when the server starts and is never saved.</td><td>No</td></tr>')
      : t('<tr><td>Your IP address</td><td>No (held in memory as a keyed code for up to an hour for rate limits)</td><td>No</td></tr>')
  }
${t('<tr><td>Deletion receipt</td><td>Only a scrambled version</td><td>No</td></tr>')}
</tbody></table>
<p>${t('There are no accounts, cookies, analytics, tracking pixels, or third-party scripts.')}</p>
<p id="visit-count">${t('The server keeps one running total of views for each page (which page, nothing about you) and the number of counted reports on file, published at <a href="/stats">/stats</a>. It stores no IP address, browser details, query string, visit time or identifier, and no script on the page is involved.')}</p>
<p id="offline-files">${t('The site’s service worker stores copies of the app’s own files (styles, scripts, icons, the report page and the on-device text-recognition files) on your device only, so repeat visits load faster. It stores no report data. You can remove it by clearing this site’s data in your browser settings.')}</p>
<p id="language-pref">${t(LANGUAGE_PREF_TEXT)}</p>
<p>${t('This table describes what this app keeps. The hosting provider runs its own network and HTTP logging, separately from the app. The official instance is hosted on Railway, whose HTTP logs record the IP address each request came from (<a href="https://docs.railway.com/observability/logs">Railway’s log documentation</a>). How long Railway keeps them is set by Railway, not by this site: see <a href="https://railway.com/legal/privacy">Railway’s privacy policy</a>.')}</p>

<h2 id="hash">${t('The keyed hash, honestly')}</h2>
<p>${
    dedupOn
      ? t(
          'The keyed hash is pseudonymous, not anonymous. Its protection is the secrecy of one key on this server. Anyone who obtained that key and the stored area code and prefix could recover a sender number by trying at most 10,000 candidates. The hash is used only inside this site, to spot the same sender sending the same text twice within {hours} hours, and, in memory only, the same report filed again from the same connection within 7 days. It expires after {days} days and is never shown or exported. If the key is rotated, old hashes no longer match new ones.',
          { hours, days },
        )
      : t(
          'The keyed hash is pseudonymous, not anonymous. Its protection is the secrecy of one key on this server. Anyone who obtained that key and the stored area code and prefix could recover a sender number by trying at most 10,000 candidates. The hash is used only inside this site, to spot the same sender sending the same text twice within {hours} hours. It expires after {days} days and is never shown or exported. If the key is rotated, old hashes no longer match new ones.',
          { hours, days },
        )
  }</p>

<h2 id="residual">${t('Residual risks')}</h2>
<ul>
<li>${t('In a small dataset, a combination of prefix, city named in the message, category and time could point to one business. That is why those fields are never published together, or at all.')}</li>
<li>${t('Reports can be spoofed or fabricated. Three matching reports show repetition, not three independent witnesses.')}</li>
<li>${t('Your browser and phone keep their own history. This site cannot clear it.')}</li>
<li>${t('The hosting provider can see network traffic metadata such as IP addresses, and keeps its own logs (see above).')}</li>
${
  dedupOn
    ? `<li>${t('Reports from different connections cannot be linked. Someone using several networks or a VPN can still file the same report more than once.')}</li>
<li>${t('People sharing a mobile carrier’s connection may occasionally have a genuine report not counted.')}</li>
<li>${t('When a report is not counted because the same connection filed it recently, that flag is stored with the report. It implies the two reports came from the same connection, though not which one.')}</li>`
    : ''
}
</ul>

<h2 id="deletion">${t('Deletion')}</h2>
<p>${t(
    'Your receipt code is the only way to delete a report. We store only a scrambled version of it, so we cannot recover it. Deleting removes the report at once from counts and patterns, and from every future data release. A pattern that falls below {n} reports disappears. Copies already downloaded cannot be recalled. Backups are kept for at most 7 days, and a restore re-applies the deletion list so a deleted report does not come back.',
    { n: PATTERN_THRESHOLD },
  )}</p>
<p id="device-codes">${t('Deletion codes are kept only in your browser’s local storage on your own device (at most 5, for up to 90 days). The server never receives or stores these saved copies, except at the moment you use one to delete a report. To erase them, use <strong>Remove these codes from this device</strong> on the <a href="/delete">delete page</a>, or clear this site’s data in your browser.')}</p>

<h2 id="contest">${t('Contest or takedown')}</h2>
<p>${t(
    'If something on this site harms you, for example a pattern that points at your business or number, tell us privately. Flagged patterns are removed from public views while they are reviewed. The maintainer aims to respond within 7 days; security and takedown requests come before other work. You can also email <a href="mailto:{email}">{email}</a>.',
    { email: esc(c.abuseContact) },
  )}</p>
${flagResult ? `<div class="notice ${flagResult.ok ? 'notice-success' : 'notice-error'}" role="status"><p>${esc(flagResult.message)}</p></div>` : ''}
<form method="post" action="/flag" class="narrow" autocomplete="off">
<div class="field"><label for="fl-reason">${t('Reason')}</label>
<select id="fl-reason" name="reason">${FLAG_REASONS.map(([v, l]) => `<option value="${v}">${esc(t(l))}</option>`).join('')}</select></div>
<div class="field"><label for="fl-target">${t('Which page or pattern?')}</label>
<p class="help" id="h-target">${t('For a pattern, paste its pattern ID or web address.')}</p>
<input id="fl-target" name="target" type="text" aria-describedby="h-target" required></div>
<div class="field"><label for="fl-details">${t('Details <span class="optional">(optional)</span>')}</label>
<textarea id="fl-details" name="details" rows="4"></textarea></div>
<div class="field"><label for="fl-contact">${t('How to reach you <span class="optional">(optional)</span>')}</label>
<input id="fl-contact" name="contact" type="text"></div>
<p class="meta">${t('Your flag is stored privately for the maintainer and is never published.')}</p>
<button class="btn btn-primary" type="submit">${t('Send flag privately')}</button>
</form>

<h2>${t('Contacts')}</h2>
<p>${t(
    'Privacy: <a href="mailto:{privacy}">{privacy}</a> · Security: <a href="mailto:{security}">{security}</a> · Abuse and takedown: <a href="mailto:{abuse}">{abuse}</a>',
    { privacy: esc(c.privacyContact), security: esc(c.securityContact), abuse: esc(c.abuseContact) },
  )}</p>
<p class="meta">${t('Effective {date}. Operated by Reseed LLC.', { date: esc(fmtDay(EFFECTIVE_DATE)) })}</p>
</div>`;
  return layout({
    title: t('Privacy & threat model'),
    path: '/privacy',
    body,
    hero,
    demo: c.intakeMode === 'demo',
    description: t('What Spam Patterns stores and publishes, how screenshots are read on your device, and the risks this site cannot protect you from.'),
  });
}

// ---------------- Methodology ----------------

const WORKED_EXAMPLE =
  'Hi Robin, Theo here! I do pressure washing for a few homes around Brookfield this month. Happy to give you a free estimate, text 555-201-0147. Want one?';

export function methodologyPage(ctx: PageCtx): string {
  const scrubbed = scrubMessage(WORKED_EXAMPLE, { city: 'Brookfield' });
  const template = 'template' in scrubbed ? scrubbed.template : '';
  const skel = extractSkeleton(template) ?? '(none)';
  const rules = esc(rulesVersionsText());
  const grammar = esc(SKELETON_GRAMMAR_VERSION);
  const effective = esc(fmtDay(EFFECTIVE_DATE));
  const revised = esc(fmtDay(REVIEW_GATE_DATE));
  const hero = {
    kicker: t('Open methodology'),
    title: t('Methodology'),
    html: `<p class="meta">${t('Effective {effective}, revised {revised}.', { effective, revised })}</p>
<p class="rules-version">${t('<strong>{rules}</strong> · Skeleton grammar {grammar} · Area-code data {areaVersion}', { rules, grammar, areaVersion: esc(AREA_CODE_VERSION) })}</p>`,
  };
  // The sections the FAQ structured data answers from: one string each, used
  // both in the page and (as plain text) in the schema, so the two cannot drift.
  const whoHtml = `<p>${t('Reports are voluntary submissions from people who chose to file them. They are not a sample of all spam, and counts do not measure how much spam is sent. Early data may come from very few reporters.')}</p>`;
  const geoMainHtml = `<p>${t('Every geographic view uses the sender’s displayed area code. Sender numbers can be spoofed, so this is the claimed origin, not a location. The area code’s <strong>numbering-plan reference region</strong> is the state or territory it is assigned to. It is kept separate from any <strong>city named in the message</strong>, which is never shown publicly.')}</p>`;
  const geoScopeHtml = `<p>${t('Area codes outside the US (Canada and the Caribbean) are not accepted in this version. Toll-free codes and US territories are counted in the table but have no map tile.')}</p>`;
  const geoHtml = `${geoMainHtml}
<p>${t('Area-code data: {source}', { source: esc(t(AREA_CODE_SOURCE)) })}</p>
${geoScopeHtml}`;
  const matchHtml = `<p>${t('Every report is reduced by fixed rules to a masked template: names, numbers, links, emails and places are replaced with labels. Matching runs only on that template, in three separate tiers. Each tier has its own label and they are never merged.')}</p>
<ol>
<li>${t('<strong>{label}</strong>: the masked templates are the same after lowercasing and spacing are normalized.', { label: t(TIER_LABEL.exact) })}</li>
<li>${t('<strong>{label}</strong>: the templates share most of their {size}-word sequences (estimated with {perms}-way MinHash; similarity at least {threshold} to the group’s first report). Each report is compared to the group’s first report only, so a chain of small edits cannot pull unrelated texts together.', {
    label: t(TIER_LABEL.near),
    size: SHINGLE_SIZE,
    perms: MINHASH_PERMUTATIONS,
    threshold: NEAR_THRESHOLD,
  })}</li>
<li>${t('<strong>{label}</strong>: the templates follow the same script skeleton, described below. This tier alone never implies a shared sender.', { label: t(TIER_LABEL.formula) })}</li>
</ol>
<p>${t(
    connectionDedupEnabled(ctx.cfg)
      ? '<strong>{n} eligible reports</strong> that match are a review trigger, not automatic publication (see <a href="#review">Review before publication</a>). A report is eligible while it exists and is not a short-window duplicate (the same sender hash and the same template within {hours} hours, or the same sender hash, template and connection within 7 days, while the server has been running). Three reports do not establish three independent reporters, three senders, or common control. If deletions take a pattern below {n}, it disappears from every public view at once. A group that matches the same reports as a higher tier is listed once, under the higher tier.'
      : '<strong>{n} eligible reports</strong> that match are a review trigger, not automatic publication (see <a href="#review">Review before publication</a>). A report is eligible while it exists and is not a short-window duplicate (the same sender hash and the same template within {hours} hours). Three reports do not establish three independent reporters, three senders, or common control. If deletions take a pattern below {n}, it disappears from every public view at once. A group that matches the same reports as a higher tier is listed once, under the higher tier.',
    { n: PATTERN_THRESHOLD, hours: ctx.cfg.duplicateWindowHours },
  )}</p>`;
  const reviewHtml = `<p>${t('A group that reaches {n} eligible reports is held for review and is not shown anywhere, or counted, until a maintainer publishes it. The review checks {checks}. The maintainer can publish it or reject it.', { n: PATTERN_THRESHOLD, checks: esc(reviewChecksText()) })}</p>
<p>${t('A decision covers the exact set of distinct masked templates that was reviewed. If a template joins or leaves the group, or deletions take it below {n} at any point, the decision lapses and the group goes back to review. More reports of templates already reviewed do not; the report count on a published pattern updates as reports are filed or deleted.', { n: PATTERN_THRESHOLD })}</p>
<p>${t('Review affects only whether a pattern is published. Every report still counts in the totals, the area-code table and the map from the moment it is filed.')}</p>`;
  const limitsHtml = `<ul>
<li>${t('Selection bias: people who report are not a random sample.')}</li>
<li>${t('Spoofing: area codes can be faked.')}</li>
<li>${t('Extraction errors: screenshot reading and the masking rules can miss or over-remove text.')}</li>
<li>${t('Template splits and collisions: small edits can split one script into several groups, and short generic texts can collide.')}</li>
<li>${t('Coordinated submissions: a few people can file matching reports on purpose. The threshold and review stop accidents and obvious cases, not determined abuse.')}</li>
<li>${t('Whether a given script is distinctive cannot be known from a handful of reports.')}</li>
</ul>`;
  const faq: Array<[string, string]> = [
    [t('Who do the reports come from?'), whoHtml],
    // The data-provenance paragraph stays on the page (and in Sources), not in the answer.
    [t('What does the geographic proxy show?'), geoMainHtml + geoScopeHtml],
    [t('How are patterns matched?'), matchHtml],
    [t('Are patterns reviewed before publication?'), reviewHtml],
    [t('What are the known limitations?'), limitsHtml],
  ];
  const schema: SchemaNode = {
    '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: textOf(a) } })),
  };
  const body = `<div class="prose">

<h2>${t('Who the reports come from')}</h2>
${whoHtml}

<h2>${t('The geographic proxy')}</h2>
${geoHtml}

<h2 id="clustering">${t('How patterns are matched')}</h2>
${matchHtml}

<h3 id="review">${t('Review before publication')}</h3>
${reviewHtml}

<h3>${t('Skeleton grammar {grammar}', { grammar })}</h3>
<p>${t('The skeleton is the order in which these slots first appear in the masked template:')}</p>
<table class="data-table"><thead><tr>${t('<th scope="col">Slot</th><th scope="col">Rule</th>')}</tr></thead><tbody>
${SLOTS.map((s) => `<tr><td class="mono">${s}</td><td>${esc(t(s === 'CTA' ? CTA_DESCRIBE : SLOT_RULES[s].describe))}</td></tr>`).join('')}
</tbody></table>
<p>${t('Fewer than 3 slots: no skeleton. Skeletons with fewer than {n} slots, and these generic skeletons that ordinary texts also produce (appointment reminders, realtor check-ins, contractor quote follow-ups, opt-in local ads), are never shown as patterns:', { n: MIN_PATTERN_SLOTS })}</p>
<ul class="mono">${STOP_SKELETONS_V1.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
<p>${t('Pattern IDs are stable within a grammar version on this site. When the grammar changes, its version changes, and patterns may regroup.')}</p>

<h3 id="versions">${t('Rules versions')}</h3>
<p>${t('The redaction rules (how a message becomes a masked template) and the matching rules (the tiers, the threshold and eligibility, and skeleton grammar {grammar}) each carry a version: <strong>{rules}</strong>. A version changes whenever that behavior changes. A change to the matching rules sends every published pattern back to review. The changelog is in the project repository (<span class="mono">docs/rules-changelog.md</span>).', { grammar, rules })}</p>

<h3>${t('Worked example (synthetic)')}</h3>
${currentLang() === 'en' ? '' : `<p class="meta">${t('The example is in English, the language the scrubbing rules are written for.')}</p>\n`}<dl class="dl">
<dt>${t('Message as filed')}</dt><dd>${esc(WORKED_EXAMPLE)}</dd>
<dt>${t('City named in the message')}</dt><dd>Brookfield</dd>
<dt>${t('Masked template (stored, never published)')}</dt><dd class="mono">${esc(template)}</dd>
<dt>${t('Skeleton')}</dt><dd class="mono">${esc(skel)}</dd>
<dt>${t('Published example for this skeleton')}</dt><dd>${esc(skel === '(none)' ? '' : renderSkeletonExample(skel))}</dd>
</dl>

<h2>${t('Known limitations')}</h2>
${limitsHtml}

<h2 id="history">${t('Revision history')}</h2>
<ul>
<li>${t('{date}: patterns are published only after review; {n} matching reports now trigger a review. Redaction rules v1 and matching rules v1 named as the rules already in use. The review step changes publication only, not redaction or matching.', { date: revised, n: PATTERN_THRESHOLD })}</li>
<li>${t('{date}: grammar v1 and this page first published.', { date: effective })}</li>
</ul>

${t('<h2 id="sources">Sources</h2>')}
<ul>
<li>${t('Rules versions: {rules}. The changelog is in the project repository (<span class="mono">docs/rules-changelog.md</span>). <a href="#versions">Rules versions</a>.', { rules })}</li>
<li>${t('Skeleton grammar: {grammar}. <a href="#clustering">How patterns are matched</a>.', { grammar })}</li>
<li>${t('Area-code data: the <a href="https://www.nanpa.com/reports/npa-reports">NANPA NPA database</a>, version {version}, as described under the geographic proxy above.', { version: esc(AREA_CODE_VERSION) })}</li>
<li>${t('Revision history: effective {effective}, revised {revised}. <a href="#history">Revision history</a>.', { effective, revised })}</li>
</ul>
</div>`;
  return layout({
    title: t('Methodology'),
    path: '/methodology',
    body,
    hero,
    demo: ctx.cfg.intakeMode === 'demo',
    description: t('How Spam Patterns reports are scrubbed, matched into patterns and reviewed before publication, with rules versions and known limitations.'),
    schema,
  });
}

// ---------------- Self-host & contribute ----------------

export function projectPage(ctx: PageCtx): string {
  const c = ctx.cfg;
  const hero = {
    kicker: t('Open project'),
    title: t('Self-host & contribute'),
    html: `<p class="lead">${t('Spam Patterns is a pilot tracking recurring spam texts. It is open-source software under the Apache License 2.0. <a href="https://github.com/reseed-ops/spam-patterns">The code is on GitHub.</a>')}</p>`,
  };
  const body = `<div class="prose">
${
  c.officialInstanceUrl
    ? `<p>${t('The official instance is <a href="{url}">{url}</a>. Forks are not affiliated with it.', { url: esc(c.officialInstanceUrl) })}</p>`
    : `<p>${t('Forks and self-hosted copies are not affiliated with the official instance.')}</p>`
}
<h2>${t('Install')}</h2>
<p>${t('One supported path: Docker Compose behind a TLS-terminating reverse proxy. Copy <span class="mono">.env.example</span> to <span class="mono">.env</span>, set <span class="mono">STM_HMAC_KEY</span> to the output of <span class="mono">openssl rand -hex 32</span>, then run <span class="mono">docker compose up -d</span>. See <span class="mono">docs/self-hosting.md</span>.')}</p>
<h2>${t('Your responsibilities as an operator')}</h2>
<ul>
<li>${t('Keep the key secret. Anyone with it can recover sender numbers from stored prefixes.')}</li>
<li>${t('Configure trusted proxies so rate limits see real client addresses.')}</li>
<li>${t('Keep reverse-proxy request-body logging off.')}</li>
<li>${t('Publish your own contacts, retention and takedown practice.')}</li>
<li>${t('Do not add analytics, third-party scripts, or hosted screenshot reading without updating the privacy page first.')}</li>
</ul>
<h2>${t('Contribute')}</h2>
<p>${t('Good first contributions: area-code data corrections, skeleton grammar test fixtures, and accessibility fixes. Please use synthetic text only, never real messages or numbers.')}</p>
<h2>${t('Security')}</h2>
<p>${t('Report vulnerabilities privately to <a href="mailto:{email}">{email}</a>. Best effort, no bounty.', { email: esc(c.securityContact) })}</p>
<h2>${t('Maintenance')}</h2>
<p>${t('One maintainer, best effort, no service-level promise. Issues are triaged weekly; security and takedown requests come first.')}</p>
<h2>${t('History')}</h2>
<p class="provenance">${t('Launched November 17, 2026 as Spam Text Map; renamed Spam Patterns on November 19, 2026.')}</p>
</div>`;
  return layout({
    title: t('Self-host & contribute'),
    path: '/project',
    body,
    hero,
    demo: c.intakeMode === 'demo',
    description: t('Spam Patterns is open-source software under the Apache License 2.0. How to self-host it, contribute, and report security issues.'),
  });
}

// ---------------- Junk mail guide (static public-service page) ----------------


/** DMAchoice online fee, read from dmachoice.org/register.php on 2026-11-19. */
export const DMACHOICE_FEE = '$8';
export const JUNK_MAIL_CHECKED = '2026-11-19';

export function junkMailPage(ctx: PageCtx): string {
  const hero = {
    kicker: t('Practical next steps'),
    title: t('How to cut down junk mail'),
    html: `<p class="lead">${t('There is no single switch at the Postal Service that stops junk mail. These are the routes that actually work. Each one covers a different kind of mail, so most people use more than one.')}</p>`,
  };
  const checked = esc(fmtDay(JUNK_MAIL_CHECKED));
  const body = `<div class="prose">

<h2 id="prescreened">${t('Prescreened credit and insurance offers')}</h2>
<p>${t('These are the “pre-approved” or “you’ve been selected” offers. The official opt-out is <strong>OptOutPrescreen.com</strong>, or call <strong class="nowrap">1-888-5-OPT-OUT</strong> (<span class="nowrap">1-888-567-8688</span>). It is run by the consumer credit bureaus Equifax, Experian, TransUnion and Innovis under the Fair Credit Reporting Act. It is free.')}</p>
<ul>
<li>${t('An online or phone opt-out lasts 5 years.')}</li>
<li>${t('A permanent opt-out starts on the website and finishes when you print, sign and mail their form.')}</li>
<li>${t('Requests are processed within about 5 days. Offers that were already printed can keep arriving for a few weeks.')}</li>
</ul>
<p class="notice notice-info">${t('<strong>Type the address yourself.</strong> Look-alike sites exist. The real opt-out is always free; nobody legitimate will charge you for it.')}</p>

<h2 id="catalogs">${t('Catalogs, magazine offers and national promotions')}</h2>
<p>${t('For mail from companies you don’t buy from, use <a href="https://www.dmachoice.org/">DMAchoice</a>, run by the Association of National Advertisers (ANA).')}</p>
<ul>
<li>${t('It costs a one-time {fee} online (checked {date}) and lasts 10 years.', { fee: esc(DMACHOICE_FEE), date: checked })}</li>
<li>${t('Allow about 90 days for it to take effect.')}</li>
<li>${t('The ANA estimates it cuts this kind of prospect mail by about 80%.')}</li>
<li>${t('It does not cover companies you bought from or donated to in the past two years, local businesses, or political mail.')}</li>
</ul>

<h2 id="one-catalog">${t('One catalog at a time')}</h2>
<p>${t('<a href="https://www.catalogchoice.org/">Catalog Choice</a> is a free nonprofit service that sends opt-out requests to individual catalogs and mailers. Each request takes about 6 to 8 weeks.')}</p>

<h2 id="limits">${t('The limits of opting out')}</h2>
<ul>
<li>${t('Mail addressed to “Current Resident” or “Postal Customer” (the Postal Service’s Every Door Direct Mail) has no registry opt-out. The only route is asking each sender directly.')}</li>
<li>${t('Bills, statements and political mail are not advertising, so these opt-outs do not cover them.')}</li>
<li>${t('Expect 6 weeks to 3 months before your mailbox visibly thins.')}</li>
</ul>
<p>${t('A paid convenience option also exists: <a href="https://www.paperkarma.com/">PaperKarma</a> lets you photograph a mail piece and files opt-out requests for you. This site has no connection to it.')}</p>

<p class="meta">${t('This page collects no information and links only to the services named. Details checked {date}; fees and timing are set by each service and can change. For spam texts, <a href="/report">file a report here</a> and forward the original to <strong>7726</strong>.', { date: checked })}</p>
</div>`;
  return layout({
    title: t('How to cut down junk mail'),
    path: '/junk-mail',
    body,
    hero,
    demo: ctx.cfg.intakeMode === 'demo',
    description: t('The opt-outs that actually reduce paper junk mail, what each one covers, and their limits.'),
  });
}

// ---------------- People-search opt-out (static page + in-browser email builder) ----------------

/** Date the opt-out routes below were checked against each site and the CA data broker registry. */
export const OPT_OUT_CHECKED = '2026-11-25';

/** California DROP page, linked from cppa.ca.gov; checked on OPT_OUT_CHECKED. */
export const DROP_URL = 'https://privacy.ca.gov/drop/';

export interface OptOutSite {
  id: string;
  name: string;
  /** Other brands the same request covers, as the site or its registry filing lists them. */
  covers: string[];
  /** Privacy address published on the site's own page or in its CA registry filing. */
  email?: string;
  /** Where the email address was found. */
  emailSource?: string;
  /** Opt-out page (answered 200 when checked). */
  form?: string;
  formLabel?: string;
  /** One short line on what the site asks for. */
  note: string;
}

/**
 * Every URL here answered 200 to curl on OPT_OUT_CHECKED, and every email
 * address was read on the site's own page or in the California data broker
 * registry (cppa.ca.gov/data_broker_registry/registry.csv). Routes that
 * could not be checked are left out on purpose; do not add guessed ones.
 */
export const OPT_OUT_SITES: OptOutSite[] = [
  {
    id: 'peopleconnect',
    name: 'PeopleConnect',
    covers: ['TruthFinder', 'Instant Checkmate', 'Intelius', 'USSearch'],
    email: 'privacy@peopleconnect.us',
    emailSource: 'listed on its Suppression Center page',
    form: 'https://suppression.peopleconnect.us/',
    formLabel: 'PeopleConnect Suppression Center',
    note: 'The form starts with your email address and sends a verification link; one suppression covers all four sites.',
  },
  {
    id: 'beenverified',
    name: 'BeenVerified',
    covers: ['PeopleLooker', 'PeopleSmart', 'NeighborWho', 'Ownerly'],
    email: 'privacy@beenverified.com',
    emailSource: 'listed in its privacy policy and its California registry filing',
    form: 'https://www.beenverified.com/faq/privacy/',
    formLabel: 'BeenVerified privacy policy (links to its opt-out form)',
    note: 'BeenVerified verifies your identity before it acts on a request.',
  },
  {
    id: 'spokeo',
    name: 'Spokeo',
    covers: [],
    email: 'privacy@spokeo.com',
    emailSource: 'listed on its opt-out page',
    form: 'https://www.spokeo.com/optout',
    formLabel: 'Spokeo opt-out',
    note: 'The form asks for the URL of your listing and an email address, then sends a confirmation link. Each listing is opted out separately.',
  },
  {
    id: 'whitepages',
    name: 'Whitepages',
    covers: [],
    form: 'https://www.whitepages.com/suppression-requests',
    formLabel: 'Whitepages opt-out',
    note: 'The form asks for the URL of your listing, then verifies you with an automated phone call and a 4-digit code.',
  },
  {
    id: 'mylife',
    name: 'MyLife',
    covers: [],
    email: 'membersupport@mylife.com',
    emailSource: 'listed in its privacy policy and its California registry filing',
    note: 'MyLife verifies your identity before it acts, for example by confirming your email or home address.',
  },
];

export const OPT_OUT_PRIVACY_LINE = 'Nothing you type here is sent to this site: your browser builds the email and hands it to your own email app.';

function optOutSiteItem(s: OptOutSite): string {
  const covers = s.covers.length ? `<p class="meta">${t('Also covers {list}.', { list: esc(s.covers.join(', ')) })}</p>` : '';
  const rows = [
    s.email
      ? t('<dt>Email</dt><dd>{link} <span class="meta">({source})</span></dd>', {
          link: `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`,
          source: esc(t(s.emailSource ?? '')),
        })
      : '',
    s.form ? t('<dt>Web form</dt><dd>{link}</dd>', { link: `<a href="${esc(s.form)}">${esc(t(s.formLabel ?? ''))}</a>` }) : '',
  ].join('');
  return `<li id="site-${esc(s.id)}"><h3>${esc(s.name)}</h3>${covers}<dl class="dl">${rows}</dl><p class="meta">${esc(t(s.note))}</p></li>`;
}

export interface OtherOptOut {
  id: string;
  name: string;
  /** What the opt-out stops, in a few words. */
  stops: string;
  /** Opt-out page (answered 200 to curl when checked). */
  url: string;
  urlLabel: string;
  /** Phone route, only where the service's own site publishes it. */
  phone?: string;
  /** One short note: what it does and does not do, any time limit or fee, as the service's own site states it. */
  note: string;
}

/**
 * Opt-outs beyond people-search sites. Not email routes, so they stay out of
 * the email builder. Every URL answered 200 to curl on OPT_OUT_CHECKED and
 * every fact in a note was read on the service's own site that day. Left out
 * because they could not be checked: OptOutPrescreen.com and the DAA's
 * optout.aboutads.info / youradchoices.com (both refuse automated requests),
 * Money Mailer and Valassis/RedPlum (no consumer mail opt-out page found).
 */
export const OTHER_OPT_OUTS: OtherOptOut[] = [
  {
    id: 'donotcall',
    name: 'National Do Not Call Registry',
    stops: 'Telemarketing calls',
    url: 'https://www.donotcall.gov/register.html',
    urlLabel: 'Register a number at donotcall.gov',
    phone: '1-888-382-1222',
    note: 'Free, for home or mobile numbers. Most telemarketers should stop calling 31 days after you register; charities, political groups, debt collectors and surveys may still call.',
  },
  {
    id: 'dmachoice',
    name: 'DMAchoice',
    stops: 'Unsolicited marketing mail',
    url: 'https://www.dmachoice.org/register.php',
    urlLabel: 'DMAchoice registration',
    note: `Run by the ANA. A ${DMACHOICE_FEE} fee online ($9 by mail) for a 10-year registration. The site says it will not eliminate all promotional mail.`,
  },
  {
    id: 'valpak',
    name: 'Valpak',
    stops: 'Valpak’s blue-envelope coupon mailings',
    url: 'https://www.valpak.com/remove-address',
    urlLabel: 'Valpak address removal',
    note: 'Covers Valpak mailings only. Valpak says it can take several weeks for them to stop, because mailings are prepared weeks in advance.',
  },
  {
    id: 'nai',
    name: 'Network Advertising Initiative (NAI)',
    stops: 'Some targeted online ads, one setting at a time',
    url: 'https://thenai.org/how-to-opt-out/',
    urlLabel: 'NAI: How to opt out',
    note: 'There is no single switch: its old opt-out tool now redirects to this guide to the ad privacy settings in your browser, phone and TV, plus a Chrome extension that sends a Global Privacy Control signal.',
  },
];

function otherOptOutItem(o: OtherOptOut): string {
  const phone = o.phone
    ? t('<dt>Phone</dt><dd>{link}</dd>', { link: `<a href="tel:${esc(o.phone.replace(/-/g, ''))}" class="nowrap">${esc(o.phone)}</a>` })
    : '';
  const rows = t('<dt>Stops</dt><dd>{stops}</dd><dt>Route</dt><dd>{link}</dd>', {
    stops: esc(t(o.stops)),
    link: `<a href="${esc(o.url)}">${esc(t(o.urlLabel))}</a>`,
  });
  return `<li id="other-${esc(o.id)}"><h3>${esc(o.name)}</h3><dl class="dl">${rows}${phone}</dl><p class="meta">${esc(otherOptOutNote(o))}</p></li>`;
}

/** An OTHER_OPT_OUTS note in the current language (the DMAchoice note embeds the fee). */
export function otherOptOutNote(o: OtherOptOut): string {
  if (o.id === 'dmachoice') {
    return t('Run by the ANA. A {fee} fee online ($9 by mail) for a 10-year registration. The site says it will not eliminate all promotional mail.', { fee: DMACHOICE_FEE });
  }
  return t(o.note);
}

export interface GuideLink {
  url: string;
  label: string;
}

/** A privacy setting or request at one company: information only, never in the email builder. */
export interface GuideEntry {
  id: string;
  name: string;
  /** One or two short sentences: what it does and how to do it, as the company's own page says. */
  text: string;
  /** The company's own pages (or, for credit freezes, the FTC's). */
  links: GuideLink[];
  /** Address the company's own page gives for the request. */
  email?: string;
}

/**
 * Google privacy settings and removal requests. Every URL answered 200 on
 * OPT_OUT_CHECKED (account pages answer with Google's sign-in, as they do in
 * a browser) and is the one Google's own help article links to; every step
 * was read in that article the same day:
 *   support.google.com/maps/answer/15439776 (Street View blur),
 *   websearch/answer/12719076 and 9673730 (Results about you, removals),
 *   My-Ad-Center-Help/answer/12155656 (personalized ads),
 *   accounts/answer/54068 and 465 (Web & App Activity, auto-delete),
 *   youtube/answer/95725 (YouTube History), accounts/answer/3118687 (Timeline).
 * Location History is now Timeline, so the two are one entry.
 */
export const GOOGLE_OPT_OUTS: GuideEntry[] = [
  {
    id: 'street-view',
    name: 'Blur your house on Google Maps (Street View)',
    text: 'Open Street View of your home in Google Maps, click “Report a Problem” in the bottom right and choose your home. Google asks for proof of address, such as a utility bill with your name blacked out, reviews the request, and the blur is permanent.',
    links: [{ url: 'https://support.google.com/maps/answer/15439776', label: 'Google Maps Help: Blur Street View imagery' }],
  },
  {
    id: 'results-about-you',
    name: 'Find your address or phone number in Search',
    text: 'Google’s Results about you tool finds Search results that show your home address, phone number or email address, and lets you ask for each one to be removed. It can also alert you when new ones appear.',
    links: [{ url: 'https://myactivity.google.com/results-about-you', label: 'Results about you' }],
  },
  {
    id: 'search-removal',
    name: 'Remove other personal information from Search',
    text: 'For ID numbers, bank or card numbers, images of your signature or ID, private records or doxxing, send Google a removal request with the URL of each page. Google can only remove the result from Search; the page stays on the website.',
    links: [{ url: 'https://support.google.com/websearch/answer/9673730', label: 'Google Search Help: Remove my private info' }],
  },
  {
    id: 'ad-center',
    name: 'Turn off personalized ads',
    text: 'Sign in, open My Ad Center and select Off next to Personalized ads. Google still shows ads, but they are no longer based on your saved info and activity.',
    links: [{ url: 'https://myadcenter.google.com/', label: 'My Ad Center' }],
  },
  {
    id: 'activity',
    name: 'Turn off Web & App Activity, or auto-delete it',
    text: 'In your Google Account’s activity controls, turn off Web & App Activity, and choose to delete past activity at the same time if you want. Or keep it on and set Auto-delete, so Google only keeps activity for the period you pick.',
    links: [{ url: 'https://myaccount.google.com/activitycontrols', label: 'Google activity controls' }],
  },
  {
    id: 'youtube',
    name: 'Pause YouTube watch and search history',
    text: 'In My Activity, open YouTube History, go to the Controls tab and turn it off. Videos you watch and your YouTube searches stop being saved; past history can be deleted on the same page.',
    links: [{ url: 'https://myactivity.google.com/product/youtube', label: 'YouTube History in My Activity' }],
  },
  {
    id: 'timeline',
    name: 'Turn off Google Maps Timeline',
    text: 'Timeline saves the places you go and the routes you take. Turn it off in the Timeline section of your Google Account, and delete past visits in the Google Maps app on each phone, because the data is kept on the phone.',
    links: [{ url: 'https://myaccount.google.com/activitycontrols/location', label: 'Timeline settings in your Google Account' }],
  },
];

/**
 * Other companies' privacy settings. Every URL answered 200 on OPT_OUT_CHECKED
 * (AT&T's pages refuse curl but answered a browser-style request) and every
 * step was read on the company's own page that day. Left out because they
 * could not be checked: TransUnion (its site blocks automated requests; named
 * but not linked), LG Live Plus and Roku (no readable current help page),
 * Meta / Facebook (every page refuses automated requests) and Bing's removal
 * request (the page only renders in a browser).
 */
export const MORE_OPT_OUTS: GuideEntry[] = [
  {
    id: 'credit-freeze',
    name: 'Credit freeze',
    text: 'A freeze is not an opt-out, it is a lock: nobody, you included, can open new credit in your name until you lift it yourself, which you do before you apply for credit. The FTC says it costs nothing to place or lift; freeze at each bureau separately, including TransUnion at transunion.com (its site blocked our automated checks, so we do not link it).',
    links: [
      { url: 'https://www.equifax.com/personal/credit-report-services/credit-freeze/', label: 'Equifax security freeze' },
      { url: 'https://www.experian.com/help/credit-freeze/', label: 'Experian security freeze' },
      { url: 'https://www.innovis.com/personal/securityFreeze', label: 'Innovis security freeze' },
      { url: 'https://consumer.ftc.gov/articles/credit-freezes-and-fraud-alerts', label: 'FTC: Credit freezes and fraud alerts' },
    ],
  },
  {
    id: 'carriers',
    name: 'Phone carriers',
    text: 'Verizon’s Custom Experience (based on the websites and apps you use) and AT&T’s Personalized ad program are on unless you opt out in your account’s privacy settings; Verizon also takes opt-outs at 866-211-0874 (press 2). T-Mobile’s Privacy Dashboard lets you tell it to stop using your data for advertising.',
    links: [
      { url: 'https://www.verizon.com/support/verizon-custom-experience-programs-faqs/', label: 'Verizon Custom Experience FAQ (how to opt out)' },
      { url: 'https://att.com/PrivacyChoices', label: 'AT&T privacy choices (sign in)' },
      { url: 'https://www.t-mobile.com/privacy-center/dashboard', label: 'T-Mobile Privacy Dashboard' },
    ],
  },
  {
    id: 'samsung-tv',
    name: 'Samsung smart TVs',
    text: 'If you agreed to Viewing Information Services when you set up the TV, it uses Automatic Content Recognition to record what you watch. You can turn it off at any time in the TV’s Settings menu.',
    links: [{ url: 'https://www.samsung.com/us/support/answer/ANS10010616/', label: 'Samsung: Automatic Content Recognition' }],
  },
  {
    id: 'microsoft',
    name: 'Microsoft and Bing ads',
    text: 'Sign in to your Microsoft account’s ad settings and turn off personalized ads. Microsoft still shows ads, but not ones based on the searches, purchases and other activity it has collected.',
    links: [{ url: 'https://account.microsoft.com/privacy/ad-settings', label: 'Microsoft ad settings' }],
  },
  {
    id: 'apple-maps',
    name: 'Blur your house in Apple Maps (Look Around)',
    text: 'Apple blurs faces and license plates in Look Around. To ask Apple to blur your house too, email the address on its image collection page.',
    links: [{ url: 'https://maps.apple.com/imagecollection', label: 'Apple Maps Image Collection' }],
    email: 'MapsImageCollection@apple.com',
  },
  {
    id: 'venmo',
    name: 'Venmo',
    text: 'Payments set to Public or Friends show the names and the note. In the app, go to the Me tab, tap the Settings gear, then Privacy, and choose Private; the same menu can hide all your past payments.',
    links: [{ url: 'https://help.venmo.com/cs/articles/changing-payment-privacy-hiding-past-payments-vhel191', label: 'Venmo Help: Changing payment privacy' }],
  },
  {
    id: 'strava',
    name: 'Strava',
    text: 'In Settings, Privacy Controls, Map Visibility, enter your home address to hide the part of any activity that starts or ends near it, or hide the start and end of every activity. Strava warns this does not make a hidden place impossible to work out.',
    links: [{ url: 'https://support.strava.com/en-us/articles/15402012-how-do-i-edit-my-map-visibility-on-strava', label: 'Strava Support: Edit your map visibility' }],
  },
];

function guideEntryItem(prefix: string, e: GuideEntry): string {
  const links = e.links.map((l) => `<a href="${esc(l.url)}">${esc(t(l.label))}</a>`).join('<br>');
  const email = e.email ? t('<dt>Email</dt><dd>{link}</dd>', { link: `<a href="mailto:${esc(e.email)}">${esc(e.email)}</a>` }) : '';
  return `<li id="${prefix}-${esc(e.id)}"><h3>${esc(t(e.name))}</h3><p>${esc(t(e.text))}</p><dl class="dl">${t('<dt>Go to</dt><dd>{links}</dd>', { links })}${email}</dl></li>`;
}

export function optOutPage(ctx: PageCtx): string {
  const hero = {
    kicker: t('Practical next steps'),
    title: t('Opt out of people-search sites'),
    html: `<p class="lead">${t('A lot of spam texts start on a people-search site: someone looks up a name and gets a phone number. This page helps you ask the biggest sites to take your listing down.')}</p>`,
  };
  const options = OPT_OUT_SITES.map(
    (s) =>
      `<option value="${esc(s.id)}" data-name="${esc(s.name)}"${s.email ? ` data-email="${esc(s.email)}"` : ''}${s.form ? ` data-form="${esc(s.form)}" data-form-label="${esc(t(s.formLabel ?? ''))}"` : ''} data-note="${esc(t(s.note))}">${s.email ? esc(s.name) : t('{name} (web form only)', { name: esc(s.name) })}</option>`,
  ).join('');
  // The generated email stays in English (see optout.js); say so on translated pages only.
  const englishEmailNote =
    currentLang() === 'en' ? '' : `<p class="meta">${t('The email is written in English because these companies handle requests in English.')}</p>\n`;
  const body = `<div class="prose">

<h2 id="what">${t('What these sites are')}</h2>
<p>${t('People-search sites publish your name, past and current addresses, phone numbers, relatives and more, collected from public records and other sources. Anyone can look you up. Taking yourself off them leaves less of your information in circulation for scammers and spammers to use.')}</p>

<h2 id="limits">${t('The limits of opting out')}</h2>
<ul>
<li>${t('Suppression hides your listing from name search. It does not delete the public records underneath.')}</li>
<li>${t('Listings come back when new data arrives. Check again every few months.')}</li>
<li>${t('Some sites ask you to prove who you are, with an email link or a phone call with a code. That is their process, not ours.')}</li>
</ul>
<p class="notice notice-info">${t('<strong>Use a secondary email address.</strong> These sites send confirmation messages. A secondary address keeps them, and anything that follows, out of your main inbox.')}</p>
<p>${t('<strong>In California:</strong> the state’s <a href="{url}">Delete Request and Opt-out Platform (DROP)</a>, run by the California Privacy Protection Agency, lets you send one deletion request to every registered data broker (over 600) at once.', { url: esc(DROP_URL) })}</p>

<h2 id="builder">${t('Write the email')}</h2>
<p><strong>${esc(t(OPT_OUT_PRIVACY_LINE))}</strong></p>
${englishEmailNote}<noscript><p class="notice notice-info">${t('The email builder needs JavaScript. You can still use the addresses and forms in the list below.')}</p></noscript>
<div id="optout-app" hidden>
<div class="field">
<label for="o-name">${t('Your full name')}</label>
<input id="o-name" type="text" autocomplete="name" maxlength="100" aria-describedby="e-o-name">
<p class="field-error" id="e-o-name" hidden></p>
</div>
<div class="field">
<label for="o-site">${t('The site you want to contact')}</label>
<select id="o-site">${options}</select>
</div>
<div class="field">
<label for="o-url">${t('The URL of your listing on that site <span class="optional">(optional)</span>')}</label>
<p class="help" id="h-o-url">${t('Search for yourself on the site and copy the address of your listing page.')}</p>
<input id="o-url" type="text" inputmode="url" autocomplete="off" maxlength="300" aria-describedby="h-o-url e-o-url">
<p class="field-error" id="e-o-url" hidden></p>
</div>
<div class="field">
<label for="o-reply">${t('The email address you want the reply sent to')}</label>
<input id="o-reply" type="text" inputmode="email" autocomplete="email" maxlength="120" aria-describedby="e-o-reply">
<p class="field-error" id="e-o-reply" hidden></p>
</div>
<div id="o-build-wrap"><button class="btn btn-primary" type="button" id="o-build">${t('Write my email')}</button></div>

<div id="o-email" hidden>
<h3>${t('Your email')}</h3>
<p class="meta">${t('Read it before you send it. It opens in your email app; nothing is sent until you send it there.')}</p>
<div class="panel">
<dl class="dl">${t('<dt>To</dt><dd id="o-to"></dd><dt>Subject</dt><dd id="o-subject"></dd>')}</dl>
<div class="scrubbed" id="o-body"></div>
</div>
<a class="btn btn-primary" id="o-open" href="#builder">${t('Open in my email')}</a>
<p class="meta" id="o-also" hidden></p>
</div>

<div id="o-formonly" class="notice notice-info" hidden>
<p><strong>${t('<span id="o-fo-name"></span> takes opt-outs only through its web form.')}</strong></p>
<p><a id="o-fo-link" href="#builder"></a></p>
<p id="o-fo-note"></p>
</div>
</div>

<h2 id="sites">${t('The sites and their opt-out routes')}</h2>
<ul class="script-list" id="site-list">
${OPT_OUT_SITES.map(optOutSiteItem).join('\n')}
</ul>
<p class="meta">${t('Other sites, including TruePeopleSearch, FastPeopleSearch and Radaris, blocked our automated checks, so we could not confirm their opt-out pages and do not list them here.')}</p>

<h2 id="other">${t('Other opt-outs')}</h2>
<p>${t('These cover calls, mail and ads rather than people-search listings. Each one takes a form or a phone call, not an email.')}</p>
<ul class="script-list" id="other-list">
${OTHER_OPT_OUTS.map(otherOptOutItem).join('\n')}
</ul>
<p class="meta">${t('OptOutPrescreen.com (prescreened credit and insurance offers) and the Digital Advertising Alliance’s ad opt-out blocked our automated checks, so we do not link them here. The <a href="/junk-mail#prescreened">junk mail guide</a> describes OptOutPrescreen.')}</p>

<h2 id="google">Google</h2>
<p>${t('Settings in your Google Account that change what Google keeps about you and what it shows about you in Search and Maps. Most of them need you to be signed in.')}</p>
<ul class="script-list" id="google-list">
${GOOGLE_OPT_OUTS.map((e) => guideEntryItem('google', e)).join('\n')}
</ul>

<h2 id="more">${t('More places to opt out')}</h2>
<p>${t('Settings at other companies that collect data about you. Each link goes to the company’s own page.')}</p>
<ul class="script-list" id="more-list">
${MORE_OPT_OUTS.map((e) => guideEntryItem('more', e)).join('\n')}
</ul>
<p class="meta">${t('LG and Roku TV settings, Meta (Facebook) ad settings and Bing’s removal request could not be checked automatically, so we do not list them here.')}</p>

<p class="meta">${t('This page collects no information and links only to the sites named. Routes checked {date}; each site sets its own process and can change it. For spam texts, <a href="/report">file a report here</a> and forward the original to <strong>7726</strong>.', { date: esc(fmtDay(OPT_OUT_CHECKED)) })}</p>
</div>`;
  return layout({
    title: t('Opt out of people-search sites'),
    path: '/opt-out',
    body,
    hero,
    demo: ctx.cfg.intakeMode === 'demo',
    scripts: ['/static/js/optout.js'],
    description: t('How to get your listing off the major people-search sites, with an email builder that runs in your browser, and the limits of opting out.'),
  });
}

// ---------------- Common scams, by medium (static public-service page) ----------------

/** Section ids on /scams, one per medium (tests check each renders). */
export const SCAM_MEDIUMS = ['text', 'email', 'phone', 'social', 'mail', 'qr'] as const;

const SCAM_SELF_SERVE = 'Do not click the link or call the number in the message. Go to the official site or number yourself, typed in or taken from the back of your card or a statement.';

export function scamsPage(ctx: PageCtx): string {
  const hero = {
    kicker: t('Practical next steps'),
    title: t('Common scams, by medium'),
    html: `<p class="lead">${t('The same few tricks show up again and again: something urgent, a link or number to use right now, and a request for money, a code or a login. Here is what the common ones look like on each channel.')}</p>`,
  };
  const selfServe = esc(t(SCAM_SELF_SERVE));
  const body = `<div class="prose">

<h2 id="text">${t('Text messages')}</h2>
<ul>
<li>${t('<strong>Package or delivery.</strong> “Your parcel is held” or “we could not deliver,” with a link to pay a small fee or update your address. Check tracking on the carrier’s own site, not through the link.')}</li>
<li>${t('<strong>Bank or fraud alert.</strong> A text says there is suspicious activity and asks you to click a link or call a number. The link leads to a fake login page; the number reaches the scammer.')}</li>
<li>${t('<strong>Unpaid toll.</strong> A text claims you owe a toll-road fee and threatens penalties unless you pay through a link. Check your toll account on the agency’s own site instead.')}</li>
<li>${t('<strong>Job offer or wrong number.</strong> An unsolicited job offer with easy pay, or a friendly “wrong number” chat that turns into an investment or crypto tip. Both end with a request for money or personal details.')}</li>
</ul>
<p>${t('<strong>What to do:</strong> {selfServe} Forward the text to <strong>7726</strong> (SPAM) and <a href="/report">file a report here</a>.', { selfServe })}</p>

${t('<h2 id="email">Email</h2>')}
<ul>
<li>${t('<strong>Phishing.</strong> A fake invoice, an account warning or a password-reset email you did not ask for, with a link to a page that looks like the real login. Check the sender’s actual address and do not sign in from the link.')}</li>
<li>${t('<strong>Refund or reimbursement.</strong> An email says you are owed a refund, or were charged for something and should call to cancel. The “agent” then asks for remote access, bank details or for you to send back an “overpayment.”')}</li>
</ul>
<p>${t('<strong>What to do:</strong> {selfServe} Use your email app’s report-phishing or spam button.', { selfServe })}</p>

<h2 id="phone">${t('Phone calls')}</h2>
<ul>
<li>${t('<strong>Bank or tech-support caller.</strong> Someone claiming to be your bank, a tech company or its fraud team asks you to read back a code sent to your phone, or to install software so they can “fix” something. Those codes and that access let them into your accounts.')}</li>
<li>${t('<strong>Robocall “press 1.”</strong> A recorded message tells you to press a number to speak to someone or be removed from a list. Hang up without pressing anything; pressing a number can lead to more calls.')}</li>
<li>${t('<strong>Family emergency.</strong> A caller says a grandchild or relative is in trouble and needs money now, often asking you to keep it secret. Hang up and call that person, or another relative, on a number you already know.')}</li>
</ul>
<p>${t('<strong>What to do:</strong> Hang up. Call back on the official number, not one the caller gave you. Never share a one-time code over the phone.')}</p>

<h2 id="social">${t('Social media and messaging apps')}</h2>
<ul>
<li>${t('<strong>Romance or investment.</strong> A new online friend or match builds trust over weeks, then needs money or wants you on an investment platform they recommend. Anyone you have not met in person who asks for money or crypto is a red flag.')}</li>
<li>${t('<strong>Fake marketplace listing.</strong> A great deal on an item or rental, with pressure to pay a deposit before you see it, often by gift card, wire or payment app. Meet in person and see the item before paying.')}</li>
<li>${t('<strong>Hacked friend’s account.</strong> A message from a friend asks for money or for a code that was “sent to your phone by mistake.” Contact the friend another way before doing anything.')}</li>
<li>${t('<strong>Giveaway or celebrity endorsement.</strong> A post or ad promises a prize or uses a famous name to promote an investment, then asks for a fee, your login or crypto. Real giveaways do not ask you to pay.')}</li>
</ul>
<p>${t('<strong>What to do:</strong> {selfServe} Report the account or post in the app.', { selfServe })}</p>

<h2 id="mail">${t('Paper mail')}</h2>
<ul>
<li>${t('<strong>Fake check.</strong> A check arrives with instructions to deposit it and send part of the money back or on to someone else. The check can bounce days later, and you owe the bank the full amount.')}</li>
<li>${t('<strong>Sweepstakes or lottery win.</strong> A letter says you won but must pay a fee or taxes up front to collect. Legitimate sweepstakes do not make you pay to receive a prize.')}</li>
<li>${t('<strong>Government impersonation.</strong> A letter that looks official demands payment or personal details, sometimes by gift card, wire or crypto. Look up the agency’s number yourself and call to confirm.')}</li>
</ul>
<p>${t('<strong>What to do:</strong> Do not call the number or visit the site printed on the letter. Look up the agency or company yourself. For ordinary junk mail, see <a href="/junk-mail">how to cut down junk mail</a>.')}</p>

<h2 id="qr">${t('QR codes and links')}</h2>
<ul>
<li>${t('<strong>Parking meters and signs.</strong> A sticker with a QR code placed over the real one leads to a fake payment page. Pay through the city’s official app or the meter itself.')}</li>
<li>${t('<strong>QR codes in mail or email.</strong> A code that opens a login or payment page. A code hides the web address until you open it. Treat it like any unexpected link.')}</li>
</ul>
<p>${t('<strong>What to do:</strong> Before entering anything, check the web address your phone shows. When in doubt, close it and go to the official site yourself.')}</p>

<h2 id="after">${t('If you already responded')}</h2>
<p>${t('Contact your bank or card company using the number on your card, change any password you entered, and report it to the <a href="https://reportfraud.ftc.gov/">FTC</a>. If scammers seem to know your address or relatives’ names, people-search sites are a common source; see <a href="/opt-out">how to opt out of them</a>.')}</p>

<p class="meta">${t('This page collects no information. For spam texts, <a href="/report">file a report here</a> and forward the original to <strong>7726</strong>.')}</p>
</div>`;
  return layout({
    title: t('Common scams, by medium'),
    path: '/scams',
    body,
    hero,
    demo: ctx.cfg.intakeMode === 'demo',
    description: t('What common scams look like by text, email, phone, social media, paper mail and QR code, and what to do about each.'),
  });
}

// ---------------- Offline fallback (served by the service worker) ----------------

export function offlinePage(ctx: PageCtx): string {
  const body = `<div class="narrow">
<h1>${t('You’re offline')}</h1>
<p>${t('This page needs a connection, and it isn’t stored on your device. Reports can be reviewed and filed only while you’re online; nothing you type is saved on your device.')}</p>
<p>${t('When you’re back online, <a href="/">reload the overview</a> or <a href="/report">report a spam text</a>.')}</p>
</div>`;
  return layout({ title: t('Offline'), path: '/offline', body, demo: ctx.cfg.intakeMode === 'demo' });
}

export function simplePage(ctx: PageCtx, title: string, html: string, status = ''): string {
  return layout({ title, path: status, body: `<div class="narrow">${html}</div>`, demo: ctx.cfg.intakeMode === 'demo' });
}

export { STATE_NAMES };
