// Server-rendered pages. No framework, no third-party assets.

import { AREA_CODE_SOURCE, AREA_CODE_VERSION, allAreaCodes, lookupAreaCode } from './areacodes.ts';
import { CATEGORIES } from './categories.ts';
import type { Config } from './config.ts';
import { FLAG_REASONS } from './filing.ts';
import { CLAIMED_ORIGIN_WARNING, ICON, esc, fmtDay, layout, textOf, type SchemaNode } from './html.ts';
import { STATE_NAMES, groupByState, renderLegend, renderMap, renderStateList, reportsWord, stateSummary } from './map.ts';
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

/** Correction channel, shown on /patterns and every pattern page. */
export function correctionLine(c: Config): string {
  return `<p class="notice notice-info correction">If a published pattern is wrong or identifies you or your business, contact <a href="mailto:${esc(c.abuseContact)}">${esc(c.abuseContact)}</a> for review or removal.</p>`;
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

export function recurringScriptsSection(patterns: Pattern[]): string {
  if (patterns.length) {
    return `<section class="scripts" aria-labelledby="scripts-h">
<p class="eyebrow">Reviewed before publication</p>
<h2 id="scripts-h">Recurring scripts</h2>
<p class="meta">Texts whose wording or script repeats across reports, such as lead-generation pitches. A shared script can be used by many unrelated senders and does not establish a common sender.</p>
<ul class="script-list">${patterns
      .map(
        (x) =>
          `<li><a href="/patterns/${esc(x.id)}">${esc(x.example ?? `Template match (${x.label})`)}</a> <span class="meta">${esc(x.label)} · <span class="num">${x.count}</span> ${x.count === 1 ? 'report' : 'reports'}</span></li>`,
      )
      .join('')}</ul>
<p><a href="/patterns">All published patterns</a> · <a href="/methodology#review">How review works</a></p>
</section>`;
  }
  // Empty pilot: invite a contribution instead of a click into an empty index.
  return `<section class="scripts" aria-labelledby="scripts-h">
<p class="eyebrow">Reviewed before publication</p>
<h2 id="scripts-h">Recurring scripts</h2>
<p class="meta">Texts whose wording or script repeats across reports, such as lead-generation pitches. A shared script can be used by many unrelated senders and does not establish a common sender.</p>
<div class="empty-box"><img src="/static/img/pattern-illustration.svg" alt="" width="560" height="240"><div>
<p class="status-mark">Pilot in progress</p>
<p class="empty-cta"><strong>No patterns published yet.</strong> File a spam text to help surface the first one.</p>
<p><a class="btn btn-primary" href="/report">Report a spam text</a></p>
</div></div>
<figure class="example-script">
<figcaption><span class="example-label">Illustrative example</span> What a published script looks like after scrubbing. This is made up, not a real report.</figcaption>
<p class="scrubbed panel">${esc(ILLUSTRATIVE_SCRIPT)}</p>
</figure>
<p class="meta">${esc(REVIEW_TRIGGER_TEXT)} A report is <strong>eligible</strong> if it has not been deleted and is not a repeat of the same text from the same sender within a short window. Every counted report appears in the area-code counts below as soon as it is filed, before any pattern is published. <a href="/methodology#review">How review works</a>.</p>
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
<p class="eyebrow">Simple by design</p>
<h2 id="how-h">How it works</h2>
<ol class="flow-steps" id="flow-steps">${FLOW_STEPS.map(
    ([h, t], i) => `<li class="flow-step"><span class="flow-num" aria-hidden="true">${i + 1}</span><strong class="flow-title">${esc(h)}</strong> <span class="flow-text">${esc(t)}</span></li>`,
  ).join('')}</ol>
<p class="how-cta"><a class="btn btn-primary" href="/report">Report a spam text</a></p>
<p class="meta">Each step is described in full in the <a href="/methodology">methodology</a> (scrubbing, matching and review) and on the <a href="/privacy">privacy page</a> (what is stored).</p>
</section>`;
}

export function overviewPage(ctx: PageCtx, p: OverviewParams, counts: AreaCount[], earliestDay: string | null, patterns: Pattern[] = []): string {
  const { from, to } = rangeDays(p.range);
  const total = counts.reduce((a, c) => a + c.count, 0);
  const rangeLabel =
    p.range === 'all'
      ? earliestDay
        ? `${fmtDay(earliestDay)} to ${fmtDay(to)}`
        : `through ${fmtDay(to)}`
      : `${fmtDay(from)} to ${fmtDay(to)}`;
  const q = (o: Partial<OverviewParams>) => {
    const m = { ...p, ...o };
    const sp = new URLSearchParams();
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
  const clear = `<p><a href="${esc(q({ ac: null, state: null }))}#geo-h">Clear selection</a></p>`;

  const detail = (() => {
    if (p.ac) {
      const c = counts.find((x) => x.areaCode === p.ac);
      const info = lookupAreaCode(p.ac);
      return `<section class="detail panel" aria-labelledby="detail-h">
<h3 id="detail-h" tabindex="-1">Area code ${esc(p.ac)}</h3>
<dl class="dl">
<dt>Area code state / region</dt><dd>${esc(info?.region ?? 'Unknown')}</dd>
<dt>Reports</dt><dd class="num">${c?.count ?? 0}</dd>
<dt>Timeframe</dt><dd>${esc(rangeLabel)}</dd>
</dl>
<p class="meta">The reference region is where this area code is assigned, not where the sender is.</p>
${clear}
</section>`;
    }
    if (p.state) {
      const g = states.get(p.state);
      if (!g) return '';
      const n = g.areaCodes.length;
      return `<section class="detail panel" aria-labelledby="detail-h">
<h3 id="detail-h" tabindex="-1">${esc(g.name)}</h3>
<p class="count-block"><span class="num big">${g.count}</span> ${reportsWord(g.count)} across <span class="num">${n}</span> area ${n === 1 ? 'code' : 'codes'} · ${esc(rangeLabel)}</p>
<ul class="code-list">${g.areaCodes
        .map((a) => `<li><a href="${esc(sel({ ac: a.areaCode, state: null }))}">Area code ${esc(a.areaCode)}</a> <span class="num">${a.count}</span></li>`)
        .join('')}</ul>
${clear}
</section>`;
    }
    return '';
  })();

  const empty = `<p class="empty">No reports were filed in this date range.</p>`;

  const table = `<div class="panel view-table" id="table-view" tabindex="-1">
<h3 class="visually-hidden">Table</h3>
${
  counts.length === 0
    ? empty
    : `<table class="data-table">
<caption>Reports by sender area code, ${esc(rangeLabel)}</caption>
<thead><tr>
<th scope="col" aria-sort="${p.sort === 'code' ? 'ascending' : 'none'}"><a href="${esc(q({ sort: 'code' }))}">Area code${p.sort === 'code' ? ' <span aria-hidden="true">▲</span>' : ''}</a></th>
<th scope="col" class="col-region"><a href="/methodology">Area code state / region</a></th>
<th scope="col" class="num" aria-sort="${p.sort === 'count' ? 'descending' : 'none'}"><a href="${esc(q({ sort: 'count' }))}">Reports${p.sort === 'count' ? ' <span aria-hidden="true">▼</span>' : ''}</a></th>
</tr></thead>
<tbody>${sorted
        .map((c) => {
          const info = lookupAreaCode(c.areaCode);
          const isSel = p.ac === c.areaCode;
          return `<tr${isSel ? ' class="selected" aria-current="true"' : ''}><td><a href="${esc(sel({ ac: c.areaCode, state: null }))}">${esc(c.areaCode)}</a><span class="stack-region">${esc(info?.region ?? 'Unknown')}</span></td><td class="col-region">${esc(info?.region ?? 'Unknown')}</td><td class="num">${c.count}</td></tr>`;
        })
        .join('')}</tbody>
</table>`
}
</div>`;

  const mapOpts = { rangeLabel, selectedState: p.state, hrefForState: (st: string) => sel({ state: st, ac: null }) };
  const unmappedNote = unmapped.length
    ? `<p class="meta">${((n) => `${n} ${n === 1 ? 'report uses' : 'reports use'}`)(unmapped.reduce((a, c) => a + c.count, 0))} area codes without a map position (toll-free or territories): ${unmapped
        .map((u) => `<a href="${esc(sel({ ac: u.areaCode, state: null }))}">${esc(u.areaCode)}</a>`)
        .join(', ')}. They are included in the table.</p>`
    : '';
  // Skip past the map's many tile links to the next section; the table is one link away.
  const toTable = `<p class="map-links"><a class="skip-map" href="#sources-h">Skip map to next section</a> · <a href="${esc(q({ view: 'table' }))}">View results table</a></p>`;
  const graphic =
    counts.length === 0
      ? empty
      : !summary
        ? `<p class="empty">No reports in this range are assigned to a state or DC.</p>`
        : `<p class="map-summary"><strong class="num">${esc(summary.text)}</strong></p>
<p class="meta map-key">Tiles group reports by the state assigned to the displayed sender’s area code.</p>
<div class="map-body">
${renderMap(counts, mapOpts)}
${renderStateList(counts, mapOpts)}
</div>
${renderLegend()}`;

  const map = `<div class="panel view-map" id="map-view">
<h3 id="map-h">Reports by state</h3>
${toTable}
${graphic}
${unmappedNote}
</div>`;

  const tabs = `<nav class="tabs" aria-label="Choose a view">
<a href="${esc(q({ view: 'table' }))}"${p.view === 'table' ? ' aria-current="page"' : ''}>Table</a>
<a href="${esc(q({ view: 'map' }))}"${p.view === 'map' ? ' aria-current="page"' : ''}>Map</a>
</nav>`;

  // Live figures for the selected range (never a hardcoded snapshot).
  const places = summary?.places ?? 0;
  const metrics = `<div class="metrics" role="group" aria-label="Pilot figures, ${esc(rangeLabel)}">
<div class="metric"><strong class="num">${total}</strong><small>${total === 1 ? 'Report' : 'Reports'} filed</small></div>
<div class="metric"><strong class="num">${places}</strong><small>${places === 1 ? 'State or DC' : 'States and DC'} with reports</small></div>
<div class="metric"><strong class="num">${patterns.length}</strong><small>${patterns.length === 1 ? 'Pattern' : 'Patterns'} published</small></div>
</div>
<p class="metrics-note meta">${esc(rangeLabel)} · counted live from filed reports · patterns appear only after review</p>`;

  const body = `
<section class="hero">
<div class="wrap hero-grid">
<div class="hero-copy">
<p class="tagline">A pilot tracking recurring spam texts.</p>
<h1>Report a spam text to expose shared scripts, anonymously</h1>
<p class="lead">Paste the text or use a screenshot. Screenshots stay on your device, and names, numbers and links are scrubbed automatically before you approve. Nothing is stored before you approve it, and you can <a href="/delete">delete a report later</a>.</p>
<p class="hero-purpose">Filing adds to a public record of recurring spam scripts. It does not block the sender or file a complaint with your carrier or regulators.</p>
<p class="hero-actions"><a class="btn btn-primary" href="/report">Report a spam text</a> <a href="/privacy">How your report is protected</a></p>
<ul class="hero-trust"><li>No account</li><li>Review before filing</li><li>Screenshots read on your device</li><li>Delete a report later</li></ul>
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
<p class="eyebrow">Claimed origin only</p>
<h2 id="geo-h">Reported sender area codes</h2>
${CLAIMED_ORIGIN_WARNING}
<form class="filters" method="get" action="/">
<label for="range">Date range</label>
<select id="range" name="range">${RANGES.map(([k, l]) => `<option value="${k}"${p.range === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
${p.view !== 'table' ? `<input type="hidden" name="view" value="${esc(p.view)}">` : ''}
<button class="btn btn-secondary" type="submit">Apply</button>
</form>
<p class="count-block" aria-live="polite"><span class="num big">${total}</span> ${total === 1 ? 'report' : 'reports'} filed · ${esc(rangeLabel)}</p>
${tabs}
${detail}
<div class="views-wrap">
<div class="views views-${p.view}">
${p.view === 'map' ? map : table}
</div>
</div>
<p class="meta">Counts are voluntary reports and do not measure how much spam is sent. <a href="/methodology">How counts work</a>.</p>
</section>
</div></div>
<div class="band band-tint"><div class="wrap">
<section class="sources" aria-labelledby="sources-h">
<h2 id="sources-h">Sources</h2>
<ul class="meta">
<li>Figures on this page: <span class="num">${total}</span> ${total === 1 ? 'report' : 'reports'} filed, <span class="num">${places}</span> ${places === 1 ? 'state or DC' : 'states and DC'} with reports, and <span class="num">${patterns.length}</span> ${patterns.length === 1 ? 'pattern' : 'patterns'} published, ${esc(RANGES.find((r) => r[0] === p.range)![1].toLowerCase())} (${esc(rangeLabel)}). Counted live from reports filed on this site.</li>
<li>Counts are voluntary reports and do not measure how much spam is sent. Area codes are the sender’s claimed origin, not a location. <a href="/methodology">How counts work</a>.</li>
<li>Patterns are published only after maintainer review: <a href="/patterns">published patterns</a> · <a href="/methodology#review">how review works</a>.</li>
</ul>
</section>
</div></div>`;
  return layout({
    title: 'Spam text reports and recurring scripts',
    path: '/',
    body,
    demo: ctx.cfg.intakeMode === 'demo',
    fullBleed: true,
    description: 'See which sender area codes and recurring scripts people report in spam texts, and file your own anonymously. Screenshots are read on your device.',
  });
}

// ---------------- Report flow ----------------

// In-service area codes for the browser's sender-number fallback (public NANPA facts).
const REPORT_NPAS = allAreaCodes().map((a) => a.code).sort().join(' ');

export function reportPage(ctx: PageCtx): string {
  const c = ctx.cfg;
  const cats = CATEGORIES.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('');
  const paused = ctx.paused
    ? `<div class="notice notice-error" role="alert"><p><strong>Reporting is paused on this site right now.</strong> Nothing you enter will be saved. You can still forward the original text to <strong>7726 (SPAM)</strong>, and everything else on this site still works.</p></div>`
    : '';
  const body = `
<div class="narrow" id="report-app" data-max-mb="${c.maxScreenshotMb}" data-max-pixels="${c.maxScreenshotPixels}" data-paused="${ctx.paused ? '1' : '0'}" data-npas="${REPORT_NPAS}">
${paused}
<noscript><div class="notice notice-error"><p>The report form needs JavaScript to prepare your review screen. Screenshot reading happens on your device, which also needs JavaScript. You can forward the original text to <strong>7726 (SPAM)</strong> instead.</p></div></noscript>

<section data-step="start" aria-labelledby="start-h">
<h1 id="start-h" tabindex="-1">Report a spam text</h1>
<p>Both ways lead to a privacy review. Nothing is saved until you select <strong>File this report</strong>. No account needed.</p>
<div class="choice">
<div class="choice-item">
<span class="icon-box">${ICON.image}</span>
<h2>Upload a screenshot.</h2>
<p>We read it once to find the sender number and message. We don’t store the image. You’ll review the scrubbed report before filing.</p>
<p class="meta">The screenshot is read by software running in your browser. The image never leaves your device. Supported: PNG, JPEG, WebP, up to ${c.maxScreenshotMb} MB. <a href="/privacy#screenshots">How screenshot reading works</a></p>
<p class="meta" id="share-hint">On Android, once the app is installed you can also share a screenshot to Spam Patterns straight from your photos or messages app.</p>
<label class="btn btn-primary file-btn" for="shot">Upload a screenshot</label>
<input class="visually-hidden" type="file" id="shot" accept="image/png,image/jpeg,image/webp">
<p class="field-error" id="shot-error" role="alert" hidden></p>
</div>
<div class="choice-item">
<span class="icon-box teal">${ICON.type}</span>
<h2>Enter manually.</h2>
<p>Type or paste the sender number and the message.</p>
<button class="btn btn-secondary" type="button" data-go="details">Enter manually</button>
</div>
</div>
</section>

<section data-step="reading" hidden aria-labelledby="reading-h">
<h1 id="reading-h" tabindex="-1">Reading screenshot…</h1>
<p aria-live="polite" id="reading-status">Reading on your device. This can take a few seconds.</p>
<button class="btn btn-secondary" type="button" id="cancel-read">Cancel</button>
</section>

<section data-step="details" hidden aria-labelledby="details-h">
<h1 id="details-h" tabindex="-1">Enter report details</h1>
<div class="notice notice-error" id="details-summary" role="alert" tabindex="-1" hidden></div>
<p class="notice notice-info" id="details-info" hidden></p>
<p class="meta" id="d-engine" hidden></p>
<form id="details-form" novalidate>
<div class="field">
<label for="f-number">Sender number</label>
<p class="help" id="h-number">The number the text came from. Spaces, dashes and +1 are fine. US numbers only.</p>
<input id="f-number" name="number" type="tel" inputmode="tel" autocomplete="off" aria-describedby="h-number e-number" required>
<p class="field-error" id="e-number" hidden></p>
</div>
<div class="field">
<label for="f-message">Message</label>
<p class="help" id="h-message">Paste the spam text. Names, numbers, links and emails are removed in the next step.</p>
<textarea id="f-message" name="message" rows="7" autocomplete="off" aria-describedby="h-message e-message" required></textarea>
<p class="field-error" id="e-message" hidden></p>
</div>
<div class="field">
<label for="f-category">Category <span class="optional">(optional)</span></label>
<select id="f-category" name="category" aria-describedby="e-category">${cats}</select>
<p class="field-error" id="e-category" hidden></p>
</div>
<div class="field">
<label for="f-city">City named in the message <span class="optional">(optional)</span></label>
<p class="help" id="h-city">Only if the message itself names a city. Leave blank otherwise. This is kept separately from the sender’s area code.</p>
<input id="f-city" name="city" type="text" autocomplete="off" aria-describedby="h-city e-city">
<p class="field-error" id="e-city" hidden></p>
</div>
<button class="btn btn-primary" type="submit">Review report</button>
<button class="btn btn-link" type="button" data-go="start">Back</button>
</form>
</section>

<section data-step="review" hidden aria-labelledby="review-h">
<h1 id="review-h" tabindex="-1">Review before filing.</h1>
<p>Check the scrubbed message below and remove any personal details still visible. We keep the sender’s area code, prefix, and a keyed hash of the number. We don’t store the full number. The public fields are listed below. We save the report only when you select <strong>File this report</strong>.</p>
<div class="notice notice-info" id="review-changed" role="alert" tabindex="-1" hidden></div>
<h2>Scrubbed message</h2>
<div class="scrubbed panel" id="r-message"></div>
<ul class="meta" id="r-notes"></ul>
<p class="meta" id="r-engine" hidden></p>
<details class="remove-more">
<summary>Remove more text</summary>
<div class="field">
<label for="f-remove">Text to remove</label>
<p class="help" id="h-remove">Copy any words from the scrubbed message that are still private, such as a name or street. They will be replaced with ${esc(MASK.reporter)}.</p>
<input id="f-remove" type="text" autocomplete="off" aria-describedby="h-remove">
</div>
<button class="btn btn-secondary" type="button" id="add-removal">Remove this text</button>
</details>
<h2>Sender information we keep</h2>
<dl class="dl" id="r-kept"></dl>
<p class="meta">The keyed hash is a scrambled code made from the full number with a secret key held only by this site. It lets the site notice the same sender sending the same text twice in a short time. It is never shown or exported, and it expires after ${c.senderTokenTtlDays} days.</p>
<h2>What may appear publicly</h2>
<dl class="dl" id="r-public"></dl>
<p class="meta">Message text, the prefix, the city and the keyed hash are never shown publicly or exported.</p>
<p class="terms">By filing, you dedicate your scrubbed report to the public domain (CC0) to the extent you hold rights in it. Deleting removes it from this site and future data releases; copies already downloaded cannot be recalled.</p>
<div class="notice notice-error" id="file-error" role="alert" tabindex="-1" hidden></div>
<button class="btn btn-primary" type="button" id="file-btn">File this report</button>
<button class="btn btn-secondary" type="button" data-go="details">Edit details</button>
</section>

<section data-step="done" hidden aria-labelledby="done-h">
<div class="notice notice-success"><h1 id="done-h" tabindex="-1">Report filed.</h1>
<p id="done-message">Save your deletion receipt code to remove this report later. Anyone with the code can request deletion. You can also forward the original text to <strong>7726 (SPAM)</strong>.</p></div>
<h2>Deletion receipt code</h2>
<p class="receipt" id="receipt"></p>
<button class="btn btn-secondary" type="button" id="copy-receipt">Copy code</button>
<p class="meta" id="copy-status" aria-live="polite"></p>
<p class="meta">This code is shown only once. We store only a scrambled version of it, so we cannot show it again or recover it for you.</p>
<p class="meta" id="receipt-saved" hidden>The code is also saved in this browser on this device, so you can delete the report later from the <a href="/delete">delete page</a>. It is still worth keeping a copy somewhere else.</p>
<section class="reporter-path" aria-label="What to do with your original">
<h2>Keep your original</h2>
<p>Your original is yours to keep. Leave the text on your phone, and if you used a screenshot, it stays in your photos; this site never had it. Save your deletion receipt code too.</p>
<h2>If you want action taken on the message</h2>
<p>Forward the original text to <strong>7726</strong> (it spells SPAM), and you can file a complaint with the <a href="https://consumercomplaints.fcc.gov/">FCC</a> or the <a href="https://reportfraud.ftc.gov/">FTC</a>. Carriers and regulators can act on the original message. This site publishes only scrubbed patterns.</p>
<h2>Junk mail too?</h2>
<p>Paper junk mail has its own opt-outs. <a href="/junk-mail">How to cut down junk mail</a> lists the routes that work and what each one covers.</p>
</section>
<p><a href="/delete">Delete a report</a> · <a href="/">Back to overview</a></p>
</section>
</div>`;
  return layout({
    title: 'Report a spam text',
    path: '/report',
    body,
    demo: c.intakeMode === 'demo',
    scripts: ['/static/js/ocr-extract.js', '/static/js/receipts.js', '/static/js/report.js'],
    description: 'File a spam text anonymously in under a minute. Screenshots are read on your device, and you review the scrubbed report before anything is saved.',
    schema: reportHowTo(c),
  });
}

/** HowTo structured data for /report. Each step restates text the report page shows. */
export function reportHowTo(c: Config): SchemaNode {
  return {
    '@type': 'HowTo',
    name: 'Report a spam text',
    description: 'Both ways lead to a privacy review. Nothing is saved until you select File this report. No account needed.',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Upload a screenshot or enter manually',
        text: `Upload a screenshot (PNG, JPEG, WebP, up to ${c.maxScreenshotMb} MB), or enter manually: type or paste the sender number and the message.`,
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'The screenshot is read on your device',
        text: 'The screenshot is read by software running in your browser. The image never leaves your device. We read it once to find the sender number and message. We don’t store the image.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Review before filing',
        text: 'Check the scrubbed message and remove any personal details still visible. We save the report only when you select File this report.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Save your deletion receipt code',
        text: 'Save your deletion receipt code to remove this report later. Anyone with the code can request deletion. This code is shown only once.',
      },
    ],
  };
}

export function reportCompletePage(ctx: PageCtx): string {
  const body = `<div class="narrow"><h1>Report filed</h1>
<p>The deletion receipt code is shown only once, right after filing, and is never put in a web address. If you did not copy it, we cannot show it again.</p>
<section class="reporter-path" aria-label="What to do with your original">
<h2>Keep your original</h2>
<p>Your original is yours to keep. Leave the text on your phone, and if you used a screenshot, it stays in your photos; this site never had it. Save your deletion receipt code too.</p>
<h2>If you want action taken on the message</h2>
<p>Forward the original text to <strong>7726</strong> (it spells SPAM), and you can file a complaint with the <a href="https://consumercomplaints.fcc.gov/">FCC</a> or the <a href="https://reportfraud.ftc.gov/">FTC</a>. Carriers and regulators can act on the original message. This site publishes only scrubbed patterns.</p>
<h2>Junk mail too?</h2>
<p>Paper junk mail has its own opt-outs. <a href="/junk-mail">How to cut down junk mail</a> lists the routes that work and what each one covers.</p>
</section>
<p><a href="/delete">Delete a report</a> · <a href="/">Back to overview</a></p></div>`;
  return layout({ title: 'Report filed', path: '/report/complete', body, demo: ctx.cfg.intakeMode === 'demo' });
}

// ---------------- Delete ----------------

export type DeleteView =
  | { kind: 'form'; error?: string }
  | { kind: 'confirm'; code: string }
  | { kind: 'result'; status: 'deleted' | 'already_deleted' | 'not_found'; message: string };

export function deletePage(ctx: PageCtx, v: DeleteView): string {
  let inner = '';
  if (v.kind === 'form') {
    inner = `<h1>Delete a report</h1>
<p>Enter the receipt code you saved when you filed. Anyone with the code can delete the report, so keep it private.</p>
${v.error ? `<div class="notice notice-error" role="alert"><p>${esc(v.error)}</p></div>` : ''}
${storedReceiptsSection(ctx)}
<form method="post" action="/delete" autocomplete="off">
<input type="hidden" name="step" value="confirm">
<div class="field"><label for="code">Receipt code</label>
<p class="help" id="h-code">32 letters and numbers, dashes optional.</p>
<input id="code" name="code" class="mono" type="text" spellcheck="false" autocapitalize="characters" aria-describedby="h-code" required></div>
<button class="btn btn-primary" type="submit">Continue</button>
</form>
<p class="meta">Deleting removes the report from counts and patterns on this site and from all future data releases. Copies that other people already downloaded cannot be recalled. <a href="/privacy#deletion">Deletion details</a></p>
<p class="meta">Lost your code? We cannot look a report up without it. If a published page harms you, use the <a href="/privacy#contest">private flag form</a> instead.</p>`;
  } else if (v.kind === 'confirm') {
    inner = `<h1>Delete this report?</h1>
<p>This permanently removes the report linked to the code you entered. It cannot be undone.</p>
<form method="post" action="/delete" autocomplete="off" id="delete-confirm-form">
<input type="hidden" name="step" value="delete">
<input type="hidden" name="code" value="${esc(v.code)}">
<button class="btn btn-danger" type="submit">Delete report</button>
<a class="btn btn-link" href="/delete">Cancel</a>
</form>`;
  } else {
    const ok = v.status !== 'not_found';
    inner = `<div class="notice ${ok ? 'notice-success' : 'notice-error'}" role="status"><h1>${
      v.status === 'deleted' ? 'Report deleted' : v.status === 'already_deleted' ? 'Already deleted' : 'No report found'
    }</h1><p>${esc(v.message)}</p></div>
${ok ? `<p>Copies already downloaded cannot be recalled. Deleted reports do not return when the site restores a backup; see <a href="/privacy#deletion">deletion details</a>.</p>` : `<p><a href="/delete">Try another code</a></p>`}
<p><a href="/">Back to overview</a></p>`;
  }
  const status = v.kind === 'result' ? ` data-status="${esc(v.status)}"` : '';
  return layout({
    title: 'Delete a report',
    path: '/delete',
    body: `<div class="narrow" id="delete-page" data-view="${esc(v.kind)}"${status}>${inner}</div>`,
    demo: ctx.cfg.intakeMode === 'demo',
    scripts: ['/static/js/receipts.js'],
    description: 'Delete a spam text report you filed, using the receipt code you saved when you filed it.',
  });
}

/**
 * Codes saved in this browser (receipts.js fills the list and unhides the
 * section; without stored codes or localStorage it stays hidden). Entries
 * show the filing date only: a code is submitted by its button, never shown.
 */
function storedReceiptsSection(ctx: PageCtx): string {
  return `<section id="stored-receipts" class="stored-receipts" aria-labelledby="stored-receipts-h" hidden>
<h2 id="stored-receipts-h">Reports filed from this browser</h2>
<p>This browser saved the receipt codes of these reports on this device. Choose one to delete that report.</p>
<ul class="stored-receipts-list"></ul>
<div class="stored-receipts-forget">
<button class="btn btn-secondary" type="button" id="forget-receipts">Remove these codes from this device</button>
<p class="meta">This does <strong>not</strong> delete any report. It only erases the saved codes from this browser. Afterwards, deleting one of these reports needs its receipt code, or an email to <a href="mailto:${esc(ctx.cfg.abuseContact)}">${esc(ctx.cfg.abuseContact)}</a>.</p>
</div>
</section>
<p class="notice notice-info" id="forget-status" role="status" tabindex="-1" hidden></p>`;
}

// ---------------- Patterns ----------------

function patternCard(p: Pattern): string {
  return `<li class="pattern panel">
<h2><a href="/patterns/${esc(p.id)}">Template match · ${p.count} reports</a></h2>
<p class="badge tier-${p.tier}">${esc(p.label)}</p>
<dl class="dl compact">
<dt>Pattern ID</dt><dd class="mono">${esc(p.id)}</dd>
<dt>Reports</dt><dd class="num">${p.count}</dd>
<dt>Dates</dt><dd>${esc(fmtDay(p.firstDay))} to ${esc(fmtDay(p.latestDay))}</dd>
<dt>Category</dt><dd>${esc(p.categories.map((c) => `${c.label} (${c.count})`).join(', '))}</dd>
</dl>
</li>`;
}

const TIER_EXPLAIN = `<ul class="meta">
<li><strong>${TIER_LABEL.exact}</strong>: the masked text is the same.</li>
<li><strong>${TIER_LABEL.near}</strong>: the masked text is nearly the same.</li>
<li><strong>${TIER_LABEL.formula}</strong>: different wording following the same sequence of moves. This alone never means the texts came from the same sender.</li>
</ul>`;

export function patternsPage(ctx: PageCtx, patterns: Pattern[]): string {
  const hero = {
    kicker: 'Understanding the signal',
    title: 'Patterns',
    html: `<p class="lead">Recurring messages and scripts, published after review. A pattern shows repetition in the reports. It does not show who sent the texts, or that they share a sender.</p>`,
  };
  const body = `<div class="prose">
<p>${esc(REVIEW_TRIGGER_TEXT)} A published pattern goes back to review if its matching templates change, and leaves this page if deletions take it below ${PATTERN_THRESHOLD} reports.</p>
${correctionLine(ctx.cfg)}
${TIER_EXPLAIN}
${
  patterns.length === 0
    ? `<div class="empty-box"><img src="/static/img/pattern-illustration.svg" alt="" width="560" height="240"><div>
<p class="status-mark">Pilot in progress</p>
<p class="empty">No pattern has been published yet.</p>
</div></div>`
    : `<ul class="pattern-list">${patterns.map(patternCard).join('')}</ul>`
}
<p class="meta">${esc(RULES_VERSIONS_TEXT)} · Skeleton grammar ${esc(SKELETON_GRAMMAR_VERSION)}. <a href="/methodology#clustering">How patterns are matched</a> · <a href="/methodology#review">How review works</a>. To contest a pattern privately, use the <a href="/privacy#contest">private flag form</a>.</p>
<section class="sources" aria-labelledby="sources-h">
<h2 id="sources-h">Sources</h2>
<ul class="meta">
<li>Published patterns: <span class="num">${patterns.length}</span>, from reports filed on this site. Each has at least ${PATTERN_THRESHOLD} eligible matching reports and was published after maintainer review.</li>
<li>Matching rules: ${esc(RULES_VERSIONS_TEXT)} · Skeleton grammar ${esc(SKELETON_GRAMMAR_VERSION)}. <a href="/methodology#versions">Rules versions</a>.</li>
<li>Method: <a href="/methodology#clustering">How patterns are matched</a> · <a href="/methodology#review">How review works</a>.</li>
</ul>
</section>
</div>`;
  return layout({
    title: 'Published spam text patterns',
    path: '/patterns',
    body,
    hero,
    demo: ctx.cfg.intakeMode === 'demo',
    description: 'Recurring spam text messages and scripts, published only after maintainer review. A pattern shows repetition, not who sent the texts.',
  });
}

export function patternDetailPage(ctx: PageCtx, p: Pattern | null): string {
  if (!p) {
    return layout({
      title: 'Pattern unavailable',
      path: '/patterns',
      demo: ctx.cfg.intakeMode === 'demo',
      body: `<h1>This pattern is not available</h1>
<p>It may not be published yet, it may be back under review, it may have dropped below ${PATTERN_THRESHOLD} eligible reports after a deletion, or the link may be wrong.</p>
${correctionLine(ctx.cfg)}
<p><a href="/patterns">All patterns</a> · <a href="/methodology#review">How review works</a></p>`,
    });
  }
  const body = `<h1>Template match · ${p.count} reports</h1>
<p class="badge tier-${p.tier}">${esc(p.label)}</p>
${correctionLine(ctx.cfg)}
<dl class="dl">
<dt>Pattern ID</dt><dd class="mono">${esc(p.id)}</dd>
<dt>Reports</dt><dd class="num">${p.count}</dd>
<dt>First report</dt><dd>${esc(fmtDay(p.firstDay))}</dd>
<dt>Latest report</dt><dd>${esc(fmtDay(p.latestDay))}</dd>
<dt>Categories</dt><dd>${esc(p.categories.map((c) => `${c.label} (${c.count})`).join(', '))}</dd>
<dt>Sender area codes</dt><dd>${p.distinctAreaCodes} different area ${p.distinctAreaCodes === 1 ? 'code' : 'codes'}</dd>
<dt>Skeleton grammar</dt><dd>${esc(p.grammarVersion)}</dd>
</dl>
${CLAIMED_ORIGIN_WARNING}
${
  p.skeleton
    ? `<h2>Script skeleton</h2>
<p class="mono skeleton">${esc(p.skeleton.split('>').join(' → '))}</p>
<h2>Fully masked example</h2>
<p class="scrubbed panel">${esc(p.example)}</p>
<p class="meta">This example is built from the skeleton’s slots, not from any report’s text.</p>`
    : `<p class="meta">These messages do not follow a recognizable script skeleton in grammar ${esc(p.grammarVersion)}.</p>`
}
<p>${
    p.tier === 'formula'
      ? 'These reports follow the same script pattern with different wording. A shared script can be used by many unrelated senders, for example businesses using the same texting template. It does not establish a common sender or coordination.'
      : 'Matching text shows the message was repeated. It does not establish who sent it, or that the reports came from different people.'
  }</p>
<p class="meta">Published after review. ${esc(RULES_VERSIONS_TEXT)}. We publish the pattern, not its members: no numbers, prefixes, businesses or message text. <a href="/methodology#clustering">Clustering rules</a> · <a href="/privacy#contest">Flag this pattern privately</a></p>`;
  return layout({ title: `Pattern ${p.id}`, path: '/patterns', body, demo: ctx.cfg.intakeMode === 'demo' });
}

// ---------------- Data (aggregate-only; Decision C not taken) ----------------

export const DATA_NOTICE =
  'No warranty of accuracy. Area codes are claimed origin. A listing is not an allegation against any person or business. Reports are voluntary submissions and counts do not measure spam prevalence.';

export function dataPage(ctx: PageCtx): string {
  const hero = { kicker: 'Public data, carefully', title: 'Data' };
  const body = `<div class="prose">
<section class="notice notice-info" aria-labelledby="scope-h">
<h2 id="scope-h">No data release yet</h2>
<p>This site has not released any data. There is no feed and no download, and there are no report-level records of any kind. When a release is approved, it will contain only the aggregate counts described below, and this page will show its date and version.</p>
</section>
<h2>What a release will contain</h2>
<p>Separate marginal counts, never joined together:</p>
<ul>
<li>reports by sender area code</li>
<li>reports by category</li>
<li>reports by pattern skeleton (grammar version included)</li>
<li>reports by UTC day</li>
</ul>
<p>Never included: message text, sender numbers, prefixes, keyed hashes, fingerprints tied to reports, cities, hours, or any combination of these.</p>
<h2>Suppression and delay rules</h2>
<ul>
<li>A count appears only if it covers at least <strong>10 reports</strong>. Smaller counts are suppressed.</li>
<li>A report becomes eligible only <strong>7 days</strong> after it is filed.</li>
<li>Time is day or coarser. Never hour.</li>
<li>Before each release, successive releases are compared so a suppressed count cannot be worked out by subtracting one release from another.</li>
<li>Deleted reports are removed from all future releases. Copies already downloaded cannot be recalled.</li>
</ul>
<h2>Freshness</h2>
<dl class="dl"><dt>Latest release</dt><dd>None</dd><dt>Release cadence</dt><dd>Not scheduled</dd></dl>
<h2>Schema</h2>
<p>The planned release format is published as a JSON Schema: <a href="/data/schema.json">/data/schema.json</a>. Field definitions are in the data dictionary in the project repository (<span class="mono">docs/data-dictionary.md</span>).</p>
<h2>Notice</h2>
<p class="notice notice-warning">${esc(DATA_NOTICE)}</p>
<h2>License</h2>
<p>Approved aggregate releases will be dedicated to the public domain (CC0), only to the extent Reseed and submitters hold rights. Spam senders’ own wording is not ours to dedicate and is never released.</p>
<p class="meta">Questions or corrections: <a href="mailto:${esc(ctx.cfg.abuseContact)}">${esc(ctx.cfg.abuseContact)}</a>. Please do not include original message text or phone numbers in routine inquiries.</p>
</div>`;
  return layout({
    title: 'Data',
    path: '/data',
    body,
    hero,
    demo: ctx.cfg.intakeMode === 'demo',
    description: 'What a Spam Patterns data release will contain: aggregate counts only, with suppression and delay rules. No data has been released yet.',
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

export function privacyPage(ctx: PageCtx, flagResult?: { ok: boolean; message: string }): string {
  const c = ctx.cfg;
  const dedupOn = connectionDedupEnabled(c);
  const hero = {
    kicker: 'Your data, your choice',
    title: 'Privacy & threat model',
    html: `<p class="lead">What this site keeps, what it publishes, and what it cannot protect you from.</p>`,
  };
  const body = `<div class="prose">
<img class="process-graphic" src="/static/img/privacy-illustration.svg" alt="" width="660" height="350">

<h2 id="screenshots">Screenshots</h2>
<p>Screenshots are read on your device. If your browser has built-in text detection (the Shape Detection API), that is used first; otherwise open-source text-recognition software (Tesseract) runs inside your browser. The review screen says which one read your screenshot. Either way, the image is not uploaded. Only the text you review is sent, and only when you ask for the review screen. The image is not kept in a draft, a thumbnail, or any error report. Files are limited to ${c.maxScreenshotMb} MB and ${(c.maxScreenshotPixels / 1_000_000).toFixed(0)} megapixels.</p>
<p id="shared-screenshots">A screenshot you share to Spam Patterns from another app is handled on your device the same way as one you pick: the installed app keeps it in your browser only until the report page opens it, then deletes it, and it is not sent to the server.</p>
<p>Because the image is processed on your device, there is no photo metadata (such as location data) for us to receive or remove.</p>

<h2 id="scrubbing">Scrubbing</h2>
<p>Before you file, fixed rules remove the greeting name, the sender’s first name, phone numbers, every other number, emails, links, places and other capitalized words that may be names. Rules also drop phone screen labels, the contact name at the top of a conversation, your own replies, and other conversations visible in a screenshot. The rules are the same for every report. Nothing in the message can change them, including text written to look like instructions.</p>
<p>Rules make mistakes. That is why you review the scrubbed message and can remove more text before filing.</p>

<h2 id="storage">What is stored</h2>
<table class="data-table"><thead><tr><th scope="col">Field</th><th scope="col">Stored</th><th scope="col">Public</th></tr></thead><tbody>
<tr><td>Screenshot</td><td>No (never uploaded)</td><td>No</td></tr>
<tr><td>Full sender number</td><td>No (used once, then discarded)</td><td>No</td></tr>
<tr><td>Sender area code</td><td>Yes</td><td>Yes, as a count</td></tr>
<tr><td>Sender prefix (next 3 digits)</td><td>Yes</td><td>No</td></tr>
<tr><td>Keyed hash of the number</td><td>Yes, expires after ${c.senderTokenTtlDays} days</td><td>No</td></tr>
<tr><td>Scrubbed message</td><td>Yes</td><td>No, only pattern counts</td></tr>
<tr><td>Category</td><td>Yes</td><td>Yes, as a count</td></tr>
<tr><td>City named in the message</td><td>Yes</td><td>No</td></tr>
<tr><td>Filing time</td><td>Yes</td><td>Day only</td></tr>
<tr><td>Your IP address</td><td>${
    dedupOn
      ? 'No. Held in memory only, as keyed codes: up to an hour for rate limits, and up to 7 days (reset when the server restarts) to spot the same report filed again from the same connection. The key for that check is created when the server starts and is never saved.'
      : 'No (held in memory as a keyed code for up to an hour for rate limits)'
  }</td><td>No</td></tr>
<tr><td>Deletion receipt</td><td>Only a scrambled version</td><td>No</td></tr>
</tbody></table>
<p>There are no accounts, cookies, analytics, tracking pixels, or third-party scripts.</p>
<p id="visit-count">The server keeps one running total of views for each page (which page, nothing about you) and the number of counted reports on file, published at <a href="/stats">/stats</a>. It stores no IP address, browser details, query string, visit time or identifier, and no script on the page is involved.</p>
<p id="offline-files">The site’s service worker stores copies of the app’s own files (styles, scripts, icons, the report page and the on-device text-recognition files) on your device only, so repeat visits load faster. It stores no report data. You can remove it by clearing this site’s data in your browser settings.</p>
<p>This table describes what this app keeps. The hosting provider runs its own network and HTTP logging, separately from the app. The official instance is hosted on Railway, whose HTTP logs record the IP address each request came from (<a href="https://docs.railway.com/observability/logs">Railway’s log documentation</a>). How long Railway keeps them is set by Railway, not by this site: see <a href="https://railway.com/legal/privacy">Railway’s privacy policy</a>.</p>

<h2 id="hash">The keyed hash, honestly</h2>
<p>The keyed hash is pseudonymous, not anonymous. Its protection is the secrecy of one key on this server. Anyone who obtained that key and the stored area code and prefix could recover a sender number by trying at most 10,000 candidates. The hash is used only inside this site, to spot the same sender sending the same text twice within ${c.duplicateWindowHours} hours${dedupOn ? ', and, in memory only, the same report filed again from the same connection within 7 days' : ''}. It expires after ${c.senderTokenTtlDays} days and is never shown or exported. If the key is rotated, old hashes no longer match new ones.</p>

<h2 id="residual">Residual risks</h2>
<ul>
<li>In a small dataset, a combination of prefix, city named in the message, category and time could point to one business. That is why those fields are never published together, or at all.</li>
<li>Reports can be spoofed or fabricated. Three matching reports show repetition, not three independent witnesses.</li>
<li>Your browser and phone keep their own history. This site cannot clear it.</li>
<li>The hosting provider can see network traffic metadata such as IP addresses, and keeps its own logs (see above).</li>
${
  dedupOn
    ? `<li>Reports from different connections cannot be linked. Someone using several networks or a VPN can still file the same report more than once.</li>
<li>People sharing a mobile carrier’s connection may occasionally have a genuine report not counted.</li>
<li>When a report is not counted because the same connection filed it recently, that flag is stored with the report. It implies the two reports came from the same connection, though not which one.</li>`
    : ''
}
</ul>

<h2 id="deletion">Deletion</h2>
<p>Your receipt code is the only way to delete a report. We store only a scrambled version of it, so we cannot recover it. Deleting removes the report at once from counts and patterns, and from every future data release. A pattern that falls below ${PATTERN_THRESHOLD} reports disappears. Copies already downloaded cannot be recalled. Backups are kept for at most 7 days, and a restore re-applies the deletion list so a deleted report does not come back.</p>
<p id="device-codes">Deletion codes are kept only in your browser’s local storage on your own device (at most 5, for up to 90 days). The server never receives or stores these saved copies, except at the moment you use one to delete a report. To erase them, use <strong>Remove these codes from this device</strong> on the <a href="/delete">delete page</a>, or clear this site’s data in your browser.</p>

<h2 id="contest">Contest or takedown</h2>
<p>If something on this site harms you, for example a pattern that points at your business or number, tell us privately. Flagged patterns are removed from public views while they are reviewed. The maintainer aims to respond within 7 days; security and takedown requests come before other work. You can also email <a href="mailto:${esc(c.abuseContact)}">${esc(c.abuseContact)}</a>.</p>
${flagResult ? `<div class="notice ${flagResult.ok ? 'notice-success' : 'notice-error'}" role="status"><p>${esc(flagResult.message)}</p></div>` : ''}
<form method="post" action="/flag" class="narrow" autocomplete="off">
<div class="field"><label for="fl-reason">Reason</label>
<select id="fl-reason" name="reason">${FLAG_REASONS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></div>
<div class="field"><label for="fl-target">Which page or pattern?</label>
<p class="help" id="h-target">For a pattern, paste its pattern ID or web address.</p>
<input id="fl-target" name="target" type="text" aria-describedby="h-target" required></div>
<div class="field"><label for="fl-details">Details <span class="optional">(optional)</span></label>
<textarea id="fl-details" name="details" rows="4"></textarea></div>
<div class="field"><label for="fl-contact">How to reach you <span class="optional">(optional)</span></label>
<input id="fl-contact" name="contact" type="text"></div>
<p class="meta">Your flag is stored privately for the maintainer and is never published.</p>
<button class="btn btn-primary" type="submit">Send flag privately</button>
</form>

<h2>Contacts</h2>
<p>Privacy: <a href="mailto:${esc(c.privacyContact)}">${esc(c.privacyContact)}</a> · Security: <a href="mailto:${esc(c.securityContact)}">${esc(c.securityContact)}</a> · Abuse and takedown: <a href="mailto:${esc(c.abuseContact)}">${esc(c.abuseContact)}</a></p>
<p class="meta">Effective ${esc(fmtDay(EFFECTIVE_DATE))}. Operated by Reseed LLC.</p>
</div>`;
  return layout({
    title: 'Privacy & threat model',
    path: '/privacy',
    body,
    hero,
    demo: c.intakeMode === 'demo',
    description: 'What Spam Patterns stores and publishes, how screenshots are read on your device, and the risks this site cannot protect you from.',
  });
}

// ---------------- Methodology ----------------

const WORKED_EXAMPLE =
  'Hi Robin, Theo here! I do pressure washing for a few homes around Brookfield this month. Happy to give you a free estimate, text 555-201-0147. Want one?';

export function methodologyPage(ctx: PageCtx): string {
  const scrubbed = scrubMessage(WORKED_EXAMPLE, { city: 'Brookfield' });
  const template = 'template' in scrubbed ? scrubbed.template : '';
  const skel = extractSkeleton(template) ?? '(none)';
  const hero = {
    kicker: 'Open methodology',
    title: 'Methodology',
    html: `<p class="meta">Effective ${esc(fmtDay(EFFECTIVE_DATE))}, revised ${esc(fmtDay(REVIEW_GATE_DATE))}.</p>
<p class="rules-version"><strong>${esc(RULES_VERSIONS_TEXT)}</strong> · Skeleton grammar ${esc(SKELETON_GRAMMAR_VERSION)} · Area-code data ${esc(AREA_CODE_VERSION)}</p>`,
  };
  // The sections the FAQ structured data answers from: one string each, used
  // both in the page and (as plain text) in the schema, so the two cannot drift.
  const whoHtml = `<p>Reports are voluntary submissions from people who chose to file them. They are not a sample of all spam, and counts do not measure how much spam is sent. Early data may come from very few reporters.</p>`;
  const geoMainHtml = `<p>Every geographic view uses the sender’s displayed area code. Sender numbers can be spoofed, so this is the claimed origin, not a location. The area code’s <strong>numbering-plan reference region</strong> is the state or territory it is assigned to. It is kept separate from any <strong>city named in the message</strong>, which is never shown publicly.</p>`;
  const geoScopeHtml = `<p>Area codes outside the US (Canada and the Caribbean) are not accepted in this version. Toll-free codes and US territories are counted in the table but have no map tile.</p>`;
  const geoHtml = `${geoMainHtml}
<p>Area-code data: ${esc(AREA_CODE_SOURCE)}</p>
${geoScopeHtml}`;
  const matchHtml = `<p>Every report is reduced by fixed rules to a masked template: names, numbers, links, emails and places are replaced with labels. Matching runs only on that template, in three separate tiers. Each tier has its own label and they are never merged.</p>
<ol>
<li><strong>${TIER_LABEL.exact}</strong>: the masked templates are the same after lowercasing and spacing are normalized.</li>
<li><strong>${TIER_LABEL.near}</strong>: the templates share most of their ${SHINGLE_SIZE}-word sequences (estimated with ${MINHASH_PERMUTATIONS}-way MinHash; similarity at least ${NEAR_THRESHOLD} to the group’s first report). Each report is compared to the group’s first report only, so a chain of small edits cannot pull unrelated texts together.</li>
<li><strong>${TIER_LABEL.formula}</strong>: the templates follow the same script skeleton, described below. This tier alone never implies a shared sender.</li>
</ol>
<p><strong>${PATTERN_THRESHOLD} eligible reports</strong> that match are a review trigger, not automatic publication (see <a href="#review">Review before publication</a>). A report is eligible while it exists and is not a short-window duplicate (the same sender hash and the same template within ${ctx.cfg.duplicateWindowHours} hours${
    connectionDedupEnabled(ctx.cfg)
      ? ', or the same sender hash, template and connection within 7 days, while the server has been running'
      : ''
  }). Three reports do not establish three independent reporters, three senders, or common control. If deletions take a pattern below ${PATTERN_THRESHOLD}, it disappears from every public view at once. A group that matches the same reports as a higher tier is listed once, under the higher tier.</p>`;
  const reviewHtml = `<p>A group that reaches ${PATTERN_THRESHOLD} eligible reports is held for review and is not shown anywhere, or counted, until a maintainer publishes it. The review checks ${esc(REVIEW_CHECKS)}. The maintainer can publish it or reject it.</p>
<p>A decision covers the exact set of distinct masked templates that was reviewed. If a template joins or leaves the group, or deletions take it below ${PATTERN_THRESHOLD} at any point, the decision lapses and the group goes back to review. More reports of templates already reviewed do not; the report count on a published pattern updates as reports are filed or deleted.</p>
<p>Review affects only whether a pattern is published. Every report still counts in the totals, the area-code table and the map from the moment it is filed.</p>`;
  const limitsHtml = `<ul>
<li>Selection bias: people who report are not a random sample.</li>
<li>Spoofing: area codes can be faked.</li>
<li>Extraction errors: screenshot reading and the masking rules can miss or over-remove text.</li>
<li>Template splits and collisions: small edits can split one script into several groups, and short generic texts can collide.</li>
<li>Coordinated submissions: a few people can file matching reports on purpose. The threshold and review stop accidents and obvious cases, not determined abuse.</li>
<li>Whether a given script is distinctive cannot be known from a handful of reports.</li>
</ul>`;
  const faq: Array<[string, string]> = [
    ['Who do the reports come from?', whoHtml],
    // The data-provenance paragraph stays on the page (and in Sources), not in the answer.
    ['What does the geographic proxy show?', geoMainHtml + geoScopeHtml],
    ['How are patterns matched?', matchHtml],
    ['Are patterns reviewed before publication?', reviewHtml],
    ['What are the known limitations?', limitsHtml],
  ];
  const schema: SchemaNode = {
    '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: textOf(a) } })),
  };
  const body = `<div class="prose">

<h2>Who the reports come from</h2>
${whoHtml}

<h2>The geographic proxy</h2>
${geoHtml}

<h2 id="clustering">How patterns are matched</h2>
${matchHtml}

<h3 id="review">Review before publication</h3>
${reviewHtml}

<h3>Skeleton grammar ${esc(SKELETON_GRAMMAR_VERSION)}</h3>
<p>The skeleton is the order in which these slots first appear in the masked template:</p>
<table class="data-table"><thead><tr><th scope="col">Slot</th><th scope="col">Rule</th></tr></thead><tbody>
${SLOTS.map((s) => `<tr><td class="mono">${s}</td><td>${esc(s === 'CTA' ? CTA_DESCRIBE : SLOT_RULES[s].describe)}</td></tr>`).join('')}
</tbody></table>
<p>Fewer than 3 slots: no skeleton. Skeletons with fewer than ${MIN_PATTERN_SLOTS} slots, and these generic skeletons that ordinary texts also produce (appointment reminders, realtor check-ins, contractor quote follow-ups, opt-in local ads), are never shown as patterns:</p>
<ul class="mono">${STOP_SKELETONS_V1.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
<p>Pattern IDs are stable within a grammar version on this site. When the grammar changes, its version changes, and patterns may regroup.</p>

<h3 id="versions">Rules versions</h3>
<p>The redaction rules (how a message becomes a masked template) and the matching rules (the tiers, the threshold and eligibility, and skeleton grammar ${esc(SKELETON_GRAMMAR_VERSION)}) each carry a version: <strong>${esc(RULES_VERSIONS_TEXT)}</strong>. A version changes whenever that behavior changes. A change to the matching rules sends every published pattern back to review. The changelog is in the project repository (<span class="mono">docs/rules-changelog.md</span>).</p>

<h3>Worked example (synthetic)</h3>
<dl class="dl">
<dt>Message as filed</dt><dd>${esc(WORKED_EXAMPLE)}</dd>
<dt>City named in the message</dt><dd>Brookfield</dd>
<dt>Masked template (stored, never published)</dt><dd class="mono">${esc(template)}</dd>
<dt>Skeleton</dt><dd class="mono">${esc(skel)}</dd>
<dt>Published example for this skeleton</dt><dd>${esc(skel === '(none)' ? '' : renderSkeletonExample(skel))}</dd>
</dl>

<h2>Known limitations</h2>
${limitsHtml}

<h2 id="history">Revision history</h2>
<ul>
<li>${esc(fmtDay(REVIEW_GATE_DATE))}: patterns are published only after review; ${PATTERN_THRESHOLD} matching reports now trigger a review. Redaction rules v1 and matching rules v1 named as the rules already in use. The review step changes publication only, not redaction or matching.</li>
<li>${esc(fmtDay(EFFECTIVE_DATE))}: grammar v1 and this page first published.</li>
</ul>

<h2 id="sources">Sources</h2>
<ul>
<li>Rules versions: ${esc(RULES_VERSIONS_TEXT)}. The changelog is in the project repository (<span class="mono">docs/rules-changelog.md</span>). <a href="#versions">Rules versions</a>.</li>
<li>Skeleton grammar: ${esc(SKELETON_GRAMMAR_VERSION)}. <a href="#clustering">How patterns are matched</a>.</li>
<li>Area-code data: the <a href="https://www.nanpa.com/reports/npa-reports">NANPA NPA database</a>, version ${esc(AREA_CODE_VERSION)}, as described under the geographic proxy above.</li>
<li>Revision history: effective ${esc(fmtDay(EFFECTIVE_DATE))}, revised ${esc(fmtDay(REVIEW_GATE_DATE))}. <a href="#history">Revision history</a>.</li>
</ul>
</div>`;
  return layout({
    title: 'Methodology',
    path: '/methodology',
    body,
    hero,
    demo: ctx.cfg.intakeMode === 'demo',
    description: 'How Spam Patterns reports are scrubbed, matched into patterns and reviewed before publication, with rules versions and known limitations.',
    schema,
  });
}

// ---------------- Self-host & contribute ----------------

export function projectPage(ctx: PageCtx): string {
  const c = ctx.cfg;
  const hero = {
    kicker: 'Open project',
    title: 'Self-host & contribute',
    html: `<p class="lead">Spam Patterns is a pilot tracking recurring spam texts. It is open-source software under the Apache License 2.0. The repository link will appear here once it is public.</p>`,
  };
  const body = `<div class="prose">
${c.officialInstanceUrl ? `<p>The official instance is <a href="${esc(c.officialInstanceUrl)}">${esc(c.officialInstanceUrl)}</a>. Forks are not affiliated with it.</p>` : `<p>Forks and self-hosted copies are not affiliated with the official instance.</p>`}
<h2>Install</h2>
<p>One supported path: Docker Compose behind a TLS-terminating reverse proxy. Copy <span class="mono">.env.example</span> to <span class="mono">.env</span>, set <span class="mono">STM_HMAC_KEY</span> to the output of <span class="mono">openssl rand -hex 32</span>, then run <span class="mono">docker compose up -d</span>. See <span class="mono">docs/self-hosting.md</span>.</p>
<h2>Your responsibilities as an operator</h2>
<ul>
<li>Keep the key secret. Anyone with it can recover sender numbers from stored prefixes.</li>
<li>Configure trusted proxies so rate limits see real client addresses.</li>
<li>Keep reverse-proxy request-body logging off.</li>
<li>Publish your own contacts, retention and takedown practice.</li>
<li>Do not add analytics, third-party scripts, or hosted screenshot reading without updating the privacy page first.</li>
</ul>
<h2>Contribute</h2>
<p>Good first contributions: area-code data corrections, skeleton grammar test fixtures, and accessibility fixes. Please use synthetic text only, never real messages or numbers.</p>
<h2>Security</h2>
<p>Report vulnerabilities privately to <a href="mailto:${esc(c.securityContact)}">${esc(c.securityContact)}</a>. Best effort, no bounty.</p>
<h2>Maintenance</h2>
<p>One maintainer, best effort, no service-level promise. Issues are triaged weekly; security and takedown requests come first.</p>
<h2>History</h2>
<p class="provenance">Launched November 17, 2026 as Spam Text Map; renamed Spam Patterns on November 19, 2026.</p>
</div>`;
  return layout({
    title: 'Self-host & contribute',
    path: '/project',
    body,
    hero,
    demo: c.intakeMode === 'demo',
    description: 'Spam Patterns is open-source software under the Apache License 2.0. How to self-host it, contribute, and report security issues.',
  });
}

// ---------------- Junk mail guide (static public-service page) ----------------

/** DMAchoice online fee, read from dmachoice.org/register.php on 2026-11-19. */
export const DMACHOICE_FEE = '$8';
export const JUNK_MAIL_CHECKED = '2026-11-19';

export function junkMailPage(ctx: PageCtx): string {
  const hero = {
    kicker: 'Practical next steps',
    title: 'How to cut down junk mail',
    html: `<p class="lead">There is no single switch at the Postal Service that stops junk mail. These are the routes that actually work. Each one covers a different kind of mail, so most people use more than one.</p>`,
  };
  const body = `<div class="prose">

<h2 id="prescreened">Prescreened credit and insurance offers</h2>
<p>These are the “pre-approved” or “you’ve been selected” offers. The official opt-out is <strong>OptOutPrescreen.com</strong>, or call <strong class="nowrap">1-888-5-OPT-OUT</strong> (<span class="nowrap">1-888-567-8688</span>). It is run by the consumer credit bureaus Equifax, Experian, TransUnion and Innovis under the Fair Credit Reporting Act. It is free.</p>
<ul>
<li>An online or phone opt-out lasts 5 years.</li>
<li>A permanent opt-out starts on the website and finishes when you print, sign and mail their form.</li>
<li>Requests are processed within about 5 days. Offers that were already printed can keep arriving for a few weeks.</li>
</ul>
<p class="notice notice-info"><strong>Type the address yourself.</strong> Look-alike sites exist. The real opt-out is always free; nobody legitimate will charge you for it.</p>

<h2 id="catalogs">Catalogs, magazine offers and national promotions</h2>
<p>For mail from companies you don’t buy from, use <a href="https://www.dmachoice.org/">DMAchoice</a>, run by the Association of National Advertisers (ANA).</p>
<ul>
<li>It costs a one-time ${esc(DMACHOICE_FEE)} online (checked ${esc(fmtDay(JUNK_MAIL_CHECKED))}) and lasts 10 years.</li>
<li>Allow about 90 days for it to take effect.</li>
<li>The ANA estimates it cuts this kind of prospect mail by about 80%.</li>
<li>It does not cover companies you bought from or donated to in the past two years, local businesses, or political mail.</li>
</ul>

<h2 id="one-catalog">One catalog at a time</h2>
<p><a href="https://www.catalogchoice.org/">Catalog Choice</a> is a free nonprofit service that sends opt-out requests to individual catalogs and mailers. Each request takes about 6 to 8 weeks.</p>

<h2 id="limits">The honest limits</h2>
<ul>
<li>Mail addressed to “Current Resident” or “Postal Customer” (the Postal Service’s Every Door Direct Mail) has no registry opt-out. The only route is asking each sender directly.</li>
<li>Bills, statements and political mail are not advertising, so these opt-outs do not cover them.</li>
<li>Expect 6 weeks to 3 months before your mailbox visibly thins.</li>
</ul>
<p>A paid convenience option also exists: <a href="https://www.paperkarma.com/">PaperKarma</a> lets you photograph a mail piece and files opt-out requests for you. This site has no connection to it.</p>

<p class="meta">This page collects no information and links only to the services named. Details checked ${esc(fmtDay(JUNK_MAIL_CHECKED))}; fees and timing are set by each service and can change. For spam texts, <a href="/report">file a report here</a> and forward the original to <strong>7726</strong>.</p>
</div>`;
  return layout({
    title: 'How to cut down junk mail',
    path: '/junk-mail',
    body,
    hero,
    demo: ctx.cfg.intakeMode === 'demo',
    description: 'The opt-outs that actually reduce paper junk mail, what each one covers, and their limits.',
  });
}

// ---------------- Offline fallback (served by the service worker) ----------------

export function offlinePage(ctx: PageCtx): string {
  const body = `<div class="narrow">
<h1>You’re offline</h1>
<p>This page needs a connection, and it isn’t stored on your device. Reports can be reviewed and filed only while you’re online; nothing you type is saved on your device.</p>
<p>When you’re back online, <a href="/">reload the overview</a> or <a href="/report">report a spam text</a>.</p>
</div>`;
  return layout({ title: 'Offline', path: '/offline', body, demo: ctx.cfg.intakeMode === 'demo' });
}

export function simplePage(ctx: PageCtx, title: string, html: string, status = ''): string {
  return layout({ title, path: status, body: `<div class="narrow">${html}</div>`, demo: ctx.cfg.intakeMode === 'demo' });
}

export { STATE_NAMES };
