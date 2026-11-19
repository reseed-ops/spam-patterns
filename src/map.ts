// Tile map of US states and DC, one equal-size tile per state, rendered as
// server-side HTML on a CSS Grid (no SVG, no client JS). Area codes are
// grouped by the state NANPA assigns them to, so the map never implies a
// location finer than "this area code is assigned to this state". No
// outlines, no pins, no zoom, no third-party requests.
//
// Below the width the grid needs (12 x 56 px tiles + 11 x 4 px gaps = 716 px
// of panel content), CSS shows a compact state list instead. Both are in the
// markup; a container query picks one, and the other is display:none.

import { allAreaCodes, lookupAreaCode } from './areacodes.ts';
import { esc } from './html.ts';
import type { AreaCount } from './patterns.ts';

// [state, column, row], 12 columns x 8 rows, 0-based.
export const GRID: Array<[string, number, number]> = [
  ['AK', 0, 0], ['ME', 11, 0],
  ['VT', 10, 1], ['NH', 11, 1],
  ['WA', 1, 2], ['ID', 2, 2], ['MT', 3, 2], ['ND', 4, 2], ['MN', 5, 2], ['IL', 6, 2], ['WI', 7, 2], ['MI', 8, 2], ['NY', 9, 2], ['RI', 10, 2], ['MA', 11, 2],
  ['OR', 1, 3], ['NV', 2, 3], ['WY', 3, 3], ['SD', 4, 3], ['IA', 5, 3], ['IN', 6, 3], ['OH', 7, 3], ['PA', 8, 3], ['NJ', 9, 3], ['CT', 10, 3],
  ['CA', 1, 4], ['UT', 2, 4], ['CO', 3, 4], ['NE', 4, 4], ['MO', 5, 4], ['KY', 6, 4], ['WV', 7, 4], ['VA', 8, 4], ['MD', 9, 4], ['DE', 10, 4],
  ['AZ', 2, 5], ['NM', 3, 5], ['KS', 4, 5], ['AR', 5, 5], ['TN', 6, 5], ['NC', 7, 5], ['SC', 8, 5], ['DC', 9, 5],
  ['OK', 4, 6], ['LA', 5, 6], ['MS', 6, 6], ['AL', 7, 6], ['GA', 8, 6],
  ['HI', 0, 7], ['TX', 4, 7], ['FL', 9, 7],
];

export const STATE_NAMES: Record<string, string> = Object.fromEntries(
  allAreaCodes()
    .filter((a) => a.state)
    .map((a) => [a.state!, a.region]),
);

/**
 * Fixed report bins. Tile fills and legend swatches both use the CSS
 * classes `bin1`..`bin4` (and `bin0` for zero), so they share one palette;
 * `color` and `text` mirror the CSS tokens and are checked against them.
 */
export const BIN_ZERO = { color: '#F1F5F9', text: '#475569', label: '0 reports in this range' } as const;
export const BINS: Array<{ min: number; max: number; color: string; text: string; label: string }> = [
  { min: 1, max: 1, color: '#A9C5E2', text: '#172333', label: '1 report' },
  { min: 2, max: 4, color: '#6D98C5', text: '#172333', label: '2–4 reports' },
  { min: 5, max: 19, color: '#3B6B9B', text: '#FFFFFF', label: '5–19 reports' },
  { min: 20, max: Infinity, color: '#204A73', text: '#FFFFFF', label: '20+ reports' },
];

export function binFor(n: number) {
  return BINS.find((b) => n >= b.min && n <= b.max) ?? BINS[0]!;
}
/** CSS class for a count: bin0 for zero, bin1..bin4 otherwise. */
export function binClass(n: number): string {
  return n <= 0 ? 'bin0' : `bin${BINS.indexOf(binFor(n)) + 1}`;
}

export const reportsWord = (n: number) => (n === 1 ? 'report' : 'reports');

export interface StateGroup {
  state: string;
  name: string;
  count: number;
  areaCodes: AreaCount[];
}

export function groupByState(counts: AreaCount[]): { states: Map<string, StateGroup>; unmapped: AreaCount[] } {
  const states = new Map<string, StateGroup>();
  const unmapped: AreaCount[] = [];
  for (const c of counts) {
    const info = lookupAreaCode(c.areaCode);
    const st = info?.kind === 'geographic' ? info.state : null;
    if (!st || !GRID.some((g) => g[0] === st)) {
      unmapped.push(c);
      continue;
    }
    const g = states.get(st) ?? { state: st, name: STATE_NAMES[st] ?? st, count: 0, areaCodes: [] };
    g.count += c.count;
    g.areaCodes.push(c);
    states.set(st, g);
  }
  return { states, unmapped };
}

/** States with reports, by count descending, then full state name ascending. */
export function sortedStates(states: Map<string, StateGroup>): StateGroup[] {
  return [...states.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en'));
}

/**
 * The summary above the graphic, derived from groupByState(): mapped
 * reports and how many states (DC named separately). Null when no report
 * in the range is assigned to a state or DC.
 */
export function stateSummary(counts: AreaCount[]): { reports: number; places: number; text: string } | null {
  const { states } = groupByState(counts);
  if (states.size === 0) return null;
  const reports = [...states.values()].reduce((a, g) => a + g.count, 0);
  const n = states.size - (states.has('DC') ? 1 : 0);
  const where = states.has('DC')
    ? n === 0
      ? 'DC'
      : `${n} ${n === 1 ? 'state' : 'states'} and DC`
    : `${n} ${n === 1 ? 'state' : 'states'}`;
  return { reports, places: states.size, text: `${reports} ${reportsWord(reports)} across ${where}` };
}

const CHECK = `<span class="sel-mark" aria-hidden="true">✓</span>`;

export interface MapOpts {
  rangeLabel: string;
  selectedState: string | null;
  hrefForState: (st: string) => string;
}

/** Wide-panel tile grid: populated tiles are links, zero tiles are inert. */
export function renderMap(counts: AreaCount[], opts: MapOpts): string {
  const { states } = groupByState(counts);
  const tiles = GRID.map(([st, c, r]) => {
    const pos = `gc${c + 1} gr${r + 1}`;
    const g = states.get(st);
    if (!g) {
      return `<div class="tile bin0 ${pos}" aria-hidden="true"><span class="tile-abbr">${esc(st)}</span></div>`;
    }
    const selected = opts.selectedState === st;
    // Starts with the visible tile text (WCAG 2.5.3 label in name), then the full sentence.
    const label = `${st} ${g.count}. ${g.name}: ${g.count} ${reportsWord(g.count)}, ${opts.rangeLabel}${selected ? ', selected' : ''}`;
    return `<a class="tile ${binClass(g.count)} ${pos}${selected ? ' selected' : ''}" href="${esc(opts.hrefForState(st))}" aria-label="${esc(label)}"${selected ? ' aria-current="true"' : ''}><span class="tile-abbr">${esc(st)}</span> <span class="tile-count">${g.count}</span>${selected ? CHECK : ''}</a>`;
  }).join('\n');
  return `<div class="tile-grid" role="group" aria-label="Tile map of US states and DC, one equal-size tile per state. States with reports are links.">
${tiles}
</div>`;
}

/** Narrow-panel list: states with reports, full names and exact counts. */
export function renderStateList(counts: AreaCount[], opts: MapOpts): string {
  const { states } = groupByState(counts);
  const rows = sortedStates(states)
    .map((g) => {
      const selected = opts.selectedState === g.state;
      return `<li><a class="state-row${selected ? ' selected' : ''}" href="${esc(opts.hrefForState(g.state))}"${selected ? ' aria-current="true"' : ''}><span class="swatch ${binClass(g.count)}" aria-hidden="true"></span><span class="sl-name">${esc(g.name)}</span><span class="sl-sep" aria-hidden="true"> · </span><span class="sl-count num">${g.count} ${reportsWord(g.count)}</span><span class="visually-hidden">, ${esc(opts.rangeLabel)}${selected ? ', selected' : ''}</span>${selected ? CHECK : ''}</a></li>`;
    })
    .join('');
  return `<ul class="state-list" aria-label="States with reports, most reports first">${rows}</ul>`;
}

export function renderLegend(): string {
  const items = [
    `<li><span class="swatch bin0" aria-hidden="true"></span>${esc(BIN_ZERO.label)}</li>`,
    ...BINS.map((b, i) => `<li><span class="swatch bin${i + 1}" aria-hidden="true"></span>${esc(b.label)}</li>`),
  ].join('');
  return `<div class="legend">
<p class="meta"><strong>Legend.</strong> Each state or DC is one equal-size tile (a row in the list on narrow screens). Color shows the state’s total reports in this range, and the number is the exact count. Each state’s area codes are listed on its detail view.</p>
<ul aria-label="Color key">${items}</ul>
</div>`;
}
