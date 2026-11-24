// Map v2 (Codex map review, items 1-4): HTML tile grid + phone state list,
// summary line, empty and unmapped-only ranges, legend copy, skip links,
// state detail. Rendering is checked on the server output; layout widths are
// checked in headless Chromium (MAPV2-STATUS.md), not here.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { allAreaCodes } from '../src/areacodes.ts';
import { loadConfig } from '../src/config.ts';
import { CLAIMED_ORIGIN_WARNING } from '../src/html.ts';
import { GRID, binClass, groupByState, renderLegend, renderMap, renderStateList, sortedStates, stateSummary } from '../src/map.ts';
import { overviewPage, type OverviewParams } from '../src/pages.ts';
import type { AreaCount } from '../src/patterns.ts';
import { TEST_KEY, get, previewAndFile, startServer } from './helpers.ts';

const ctx = { cfg: loadConfig({ STM_HMAC_KEY: TEST_KEY }), paused: false };
const P = (o: Partial<OverviewParams> = {}): OverviewParams => ({ range: '90', view: 'map', state: null, ac: null, sort: 'count', ...o });
const page = (counts: AreaCount[], o: Partial<OverviewParams> = {}) => overviewPage(ctx, P(o), counts, '2026-11-01');
const css = readFileSync(new URL('../public/static/css/app.css', import.meta.url), 'utf8');

/** The production shape: one report each from Maryland (410) and Texas (979). */
const SPARSE: AreaCount[] = [
  { areaCode: '410', count: 1 },
  { areaCode: '979', count: 1 },
];
/** Synthetic dense fixture: one area code in every state and DC, counts spread across all bins. */
const DENSE: AreaCount[] = GRID.map(([st], i) => {
  const code = allAreaCodes().find((a) => a.kind === 'geographic' && a.state === st)!.code;
  return { areaCode: code, count: [1, 3, 7, 25, 120, 2, 19, 20, 4, 5][i % 10]! };
});
const UNMAPPED_ONLY: AreaCount[] = [
  { areaCode: '800', count: 2 },
  { areaCode: '787', count: 1 },
];

const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const ids = (html: string) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!));

describe('map v2: summary line (derived from groupByState)', () => {
  it('sparse: 2 reports across 2 states', () => {
    assert.equal(stateSummary(SPARSE)!.text, '2 reports across 2 states');
    assert.match(page(SPARSE), /<p class="map-summary"><strong class="num">2 reports across 2 states<\/strong><\/p>/);
  });
  it('dense: sums every mapped state and names DC separately', () => {
    const s = stateSummary(DENSE)!;
    const total = DENSE.reduce((a, c) => a + c.count, 0);
    assert.equal(s.reports, total);
    assert.equal(s.places, 51);
    assert.equal(s.text, `${total} reports across 50 states and DC`);
  });
  it('singular wording, DC only, and mapped-only totals beside unmapped codes', () => {
    assert.equal(stateSummary([{ areaCode: '410', count: 1 }])!.text, '1 report across 1 state');
    assert.equal(stateSummary([{ areaCode: '202', count: 3 }])!.text, '3 reports across DC');
    assert.equal(stateSummary([{ areaCode: '202', count: 1 }, { areaCode: '410', count: 1 }])!.text, '2 reports across 1 state and DC');
    assert.equal(stateSummary([...SPARSE, { areaCode: '800', count: 4 }])!.text, '2 reports across 2 states');
  });
  it('the separate total filed count is kept, and the summary sits above the graphic', () => {
    const html = page([...SPARSE, { areaCode: '800', count: 4 }]);
    assert.match(html, /<span class="num big">6<\/span> reports filed/);
    const i = html.indexOf('map-summary');
    assert.ok(i > 0 && i < html.indexOf('class="tile-grid"') && i < html.indexOf('class="state-list"'));
    assert.ok(html.indexOf('id="map-h">Reports by state</h3>') < i);
    assert.ok(html.indexOf('Tiles group reports by the state assigned to the displayed sender’s area code.') < html.indexOf('class="tile-grid"'));
  });
  it('unmapped-only: no summary, the specified message, breakdown and Table link kept, no grid or legend', () => {
    assert.equal(stateSummary(UNMAPPED_ONLY), null);
    for (const view of ['map'] as const) {
      const html = page(UNMAPPED_ONLY, { view });
      assert.match(html, /No reports in this range are assigned to a state or DC\./);
      assert.match(html, /3 reports use area codes without a map position \(toll-free or territories\): <a href="[^"]*ac=800#detail-h">800<\/a>, <a href="[^"]*ac=787#detail-h">787<\/a>/);
      assert.ok(!html.includes('class="tile-grid"') && !html.includes('class="legend"') && !html.includes('map-summary'));
      assert.match(html, /href="#sources-h">Skip map to next section<\/a> · <a href="\/">View results table/);
    }
  });
});

describe('map v2: empty range', () => {
  it('renders the neutral empty message instead of the grid and legend', () => {
    for (const view of ['map'] as const) {
      const html = page([], { view });
      assert.match(html, /No reports were filed in this date range\./);
      for (const absent of ['class="tile-grid"', 'class="state-list"', 'class="legend"', 'map-summary', 'map-key', 'Legend.']) assert.ok(!html.includes(absent), `${view}: ${absent}`);
      assert.match(html, /Reports by state/);
    }
  });
});

describe('map v2: tile grid', () => {
  it('uses the existing GRID coordinates as CSS Grid classes; zero tiles stay visible and inert', () => {
    const html = renderMap(SPARSE, { rangeLabel: 'R', selectedState: null, hrefForState: (s) => `/?state=${s}` });
    assert.equal(count(html, /class="tile /g), 51);
    assert.equal(count(html, /<a class="tile /g), 2);
    assert.match(html, /<div class="tile bin0 gc5 gr7" aria-hidden="true"><span class="tile-abbr">OK<\/span><\/div>/);
    assert.match(html, /<a class="tile bin1 gc10 gr5" href="\/\?state=MD" aria-label="MD 1\. Maryland: 1 report, R"><span class="tile-abbr">MD<\/span> <span class="tile-count">1<\/span><\/a>/);
    assert.match(html, /<a class="tile bin1 gc5 gr8" href="\/\?state=TX"/);
    assert.ok(!/<svg|<circle|area-code reference|codes?<\/text>/.test(html), 'no SVG, no dots, no area-code tally on tiles');
    assert.ok(!html.includes('style='), 'no inline styles (CSP style-src self)');
  });
  it('fills by fixed bins 1 / 2-4 / 5-19 / 20+', () => {
    assert.deepEqual([0, 1, 2, 4, 5, 19, 20, 500].map(binClass), ['bin0', 'bin1', 'bin2', 'bin2', 'bin3', 'bin3', 'bin4', 'bin4']);
    const html = renderMap(DENSE, { rangeLabel: 'R', selectedState: null, hrefForState: (s) => `/?state=${s}` });
    assert.equal(count(html, /<a class="tile /g), 51);
    // GRID order: AK 1, ME 3, VT 7, NH 25, WA 120 ...
    assert.match(html, /<a class="tile bin1 gc1 gr1" href="\/\?state=AK" aria-label="AK 1\. Alaska: 1 report, R">/);
    assert.match(html, /<a class="tile bin2 gc12 gr1" href="\/\?state=ME" aria-label="ME 3\./);
    assert.match(html, /<a class="tile bin3 gc11 gr2" href="\/\?state=VT" aria-label="VT 7\./);
    assert.match(html, /<a class="tile bin4 gc12 gr2" href="\/\?state=NH" aria-label="NH 25\./);
    assert.match(html, /<a class="tile bin4 gc2 gr3" href="\/\?state=WA" aria-label="WA 120\. Washington: 120 reports, R"><span class="tile-abbr">WA<\/span> <span class="tile-count">120<\/span><\/a>/);
  });
  it('selected tile: aria-current, a check mark, and "selected" in the name', () => {
    const html = renderMap(SPARSE, { rangeLabel: 'R', selectedState: 'TX', hrefForState: (s) => `/?state=${s}` });
    assert.match(html, /<a class="tile bin1 gc5 gr8 selected" href="\/\?state=TX" aria-label="TX 1\. Texas: 1 report, R, selected" aria-current="true"><span class="tile-abbr">TX<\/span> <span class="tile-count">1<\/span><span class="sel-mark" aria-hidden="true">✓<\/span><\/a>/);
    assert.equal(count(html, /aria-current/g), 1);
  });
  // The grid is fluid in three container-width steps; each step's tiles and gaps fit its threshold.
  const step = (w: number) => {
    const at = css.indexOf(`@container mapbody (min-width: ${w}px) {`);
    assert.ok(at > 0, `step ${w}px exists`);
    return css.slice(at, css.indexOf('\n}', at));
  };
  it('CSS: phone step at 286 px: 22 px minimum tiles, 2 px gaps, 10 px tile type, a 24 px pitch', () => {
    const s = step(286);
    assert.match(s, /\.tile-grid \{ display: grid; grid-template-columns: repeat\(12, minmax\(22px, 1fr\)\); grid-template-rows: repeat\(8, minmax\(30px, auto\)\); gap: 2px;/);
    assert.match(s, /\.tile \{ min-width: 22px; min-height: 30px;/);
    assert.match(s, /\.tile-abbr \{ font: 600 10px/);
    assert.match(s, /\.tile-count \{ font: 700 10px[^}]*tabular-nums/);
    assert.equal(12 * 22 + 11 * 2, 286);
    assert.ok(22 + 2 >= 24, 'tile pitch meets the WCAG 2.5.8 24 px spacing rule');
    // A 360 px phone: 2 x 20 px page padding, 2 x 12 px panel padding (<= 400 px), 2 x 1 px border.
    assert.match(css, /\.wrap \{ max-width: 1180px; margin: 0 auto; padding: 0 20px; \}/);
    assert.match(css, /@media \(max-width: 400px\) \{[^\n]*\.panel \{ padding: 12px; \}/);
    assert.ok(360 - 2 * 20 - 2 * 12 - 2 * 1 >= 286, 'a 360 px phone shows the grid');
  });
  it('CSS: middle step at 480 px: 36 px minimum tiles, 3 px gaps, 12/13 px tile type', () => {
    const s = step(480);
    assert.match(s, /\.tile-grid \{ grid-template-columns: repeat\(12, minmax\(36px, 1fr\)\); grid-template-rows: repeat\(8, minmax\(40px, auto\)\); gap: 3px; \}/);
    assert.match(s, /\.tile \{ min-width: 36px; min-height: 40px;/);
    assert.match(s, /\.tile-abbr \{ font: 600 12px/);
    assert.match(s, /\.tile-count \{ font: 700 13px[^}]*tabular-nums/);
    assert.ok(12 * 36 + 11 * 3 <= 480);
  });
  it('CSS: desktop step at 716 px keeps 56 px minimum tiles, 4 px gaps, 14/16 px tile type', () => {
    const s = step(716);
    assert.match(s, /\.tile-grid \{ grid-template-columns: repeat\(12, minmax\(56px, 1fr\)\); grid-template-rows: repeat\(8, minmax\(56px, auto\)\); gap: 4px; \}/);
    assert.match(s, /\.tile \{ min-width: 56px; min-height: 56px; padding: 4px 6px;/);
    assert.match(s, /\.tile-abbr \{ font: 600 14px/);
    assert.match(s, /\.tile-count \{ font: 700 16px[^}]*tabular-nums/);
    assert.match(s, /\.tile\.selected \{ box-shadow: inset 0 0 0 3px var\(--text\), inset 0 0 0 5px #fff; \}/);
    assert.match(css, /\.state-row \{[^}]*min-height: 48px;/);
    assert.equal(12 * 56 + 11 * 4, 716);
  });
  it('CSS: no fixed tile minimum outside the steps, and the steps come after the base tile rules', () => {
    assert.match(css, /\.tile \{ position: relative; display: flex; flex-direction: column; justify-content: center; min-width: 0;/);
    // Container queries add no specificity, so the steps must come later in the file to win.
    const base = Math.max(css.indexOf('.tile { position: relative;'), css.indexOf('.tile.selected, .state-row.selected {'), css.indexOf('.sel-mark { position: absolute;'));
    assert.ok(base > 0 && base < css.indexOf('@container mapbody (min-width: 286px)'));
    assert.ok(css.indexOf('(min-width: 286px)') < css.indexOf('(min-width: 480px)') && css.indexOf('(min-width: 480px)') < css.indexOf('(min-width: 716px)'));
  });
});

describe('map v2: phone state list', () => {
  it('reads "Maryland · 1 report" / "Texas · 1 report" with full names, exact counts and the same detail links', () => {
    const html = renderStateList(SPARSE, { rangeLabel: 'R', selectedState: null, hrefForState: (s) => `/?state=${s}#detail-h` });
    const text = html.replace(/<span class="visually-hidden">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '');
    assert.equal(text, 'Maryland · 1 reportTexas · 1 report');
    assert.match(html, /<li><a class="state-row" href="\/\?state=MD#detail-h"><span class="swatch bin1" aria-hidden="true"><\/span><span class="sl-name">Maryland<\/span><span class="sl-sep" aria-hidden="true"> · <\/span><span class="sl-count num">1 report<\/span><span class="visually-hidden">, R<\/span><\/a><\/li>/);
  });
  it('orders by count descending, then state name ascending', () => {
    const counts: AreaCount[] = [
      { areaCode: '979', count: 2 }, // Texas
      { areaCode: '410', count: 2 }, // Maryland
      { areaCode: '208', count: 9 }, // Idaho
      { areaCode: '207', count: 1 }, // Maine
      { areaCode: '202', count: 2 }, // DC
      { areaCode: '713', count: 1 }, // Texas again: TX = 3
    ];
    const names = [...renderStateList(counts, { rangeLabel: 'R', selectedState: null, hrefForState: (s) => s }).matchAll(/class="sl-name">([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(names, ['Idaho', 'Texas', 'District of Columbia', 'Maryland', 'Maine']);
    assert.deepEqual(sortedStates(groupByState(counts).states).map((g) => g.state), ['ID', 'TX', 'DC', 'MD', 'ME']);
  });
  it('uses the same bin swatches as tiles and legend; marks the selected row', () => {
    const html = renderStateList(DENSE, { rangeLabel: 'R', selectedState: 'MD', hrefForState: (s) => s });
    assert.equal(count(html, /<li>/g), 51);
    for (const b of ['bin1', 'bin2', 'bin3', 'bin4']) assert.ok(html.includes(`swatch ${b}`));
    assert.match(html, /class="state-row selected" href="MD" aria-current="true">.*?<span class="visually-hidden">, R, selected<\/span><span class="sel-mark" aria-hidden="true">✓<\/span>/);
  });
  it('the page carries both the grid and the list; CSS shows the list only below a 286 px panel', () => {
    const html = page(SPARSE);
    assert.ok(html.includes('class="tile-grid"') && html.includes('class="state-list"'));
    assert.match(css, /\.tile-grid \{ display: none; \}/);
    assert.match(css, /@container mapbody \(min-width: 286px\) \{[^@]*\.state-list \{ display: none; \}/);
  });
});

describe('map v2: legend', () => {
  it('describes tile color as state total reports, labels the neutral swatch, no reference-marker wording', () => {
    const html = renderLegend();
    assert.ok(!/reference marker|Circles|codes”/.test(html));
    assert.match(html, /Color shows the state’s total reports in this range, and the number is the exact count\./);
    assert.deepEqual([...html.matchAll(/<li><span class="swatch (bin\d)" aria-hidden="true"><\/span>([^<]+)<\/li>/g)].map((m) => `${m[1]} ${m[2]}`), [
      'bin0 0 reports in this range',
      'bin1 1 report',
      'bin2 2–4 reports',
      'bin3 5–19 reports',
      'bin4 20+ reports',
    ]);
  });
});

describe('map v2: view modes, order and skip links', () => {
  it('Table is the default view; Map is the only other tab and there is no Both view', () => {
    const html = overviewPage(ctx, { ...P(), view: 'table' }, SPARSE, '2026-11-01');
    assert.ok(html.includes('id="table-view"') && !html.includes('id="map-view"'));
    assert.match(html, /<a href="\/"[^>]*aria-current="page">Table<\/a>/);
    assert.match(html, /<a href="\/\?view=map">Map<\/a>/);
    assert.ok(!/>Both<\/a>/.test(html) && !html.includes('view=both'));
  });
  it('Map: the visible skip link jumps forward past the map to the next section', () => {
    const html = page(SPARSE);
    assert.match(html, /<p class="map-links"><a class="skip-map" href="#sources-h">Skip map to next section<\/a>/);
    assert.ok(html.indexOf('id="map-view"') < html.indexOf('id="sources-h"'));
    assert.ok(!html.includes('href="#table-view"'));
    assert.ok(!/\.skip-map[^{]*\{[^}]*-9999px/.test(css), 'skip-map is not hidden off-screen');
    assert.ok(!/order: -1/.test(css), 'visual order matches DOM order');
  });
  it('every in-page link target exists in every view mode, data state, and selection', () => {
    for (const counts of [SPARSE, DENSE, UNMAPPED_ONLY, []]) {
      for (const view of ['map', 'table'] as const) {
        for (const sel of [{}, { state: 'MD' }, { ac: '410' }, { ac: '800' }]) {
          const html = page(counts, { view, ...sel });
          const have = ids(html);
          for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(have.has(m[1]!), `${view} ${JSON.stringify(sel)}: #${m[1]} missing`);
          for (const m of html.matchAll(/href="\/(?:\?[^"#]*)?#([^"]+)"/g)) {
            // Same-page selections land on the detail heading, which exists once something is selected.
            assert.ok(['detail-h', 'geo-h'].includes(m[1]!), m[1]);
          }
          assert.ok(have.has('geo-h'));
        }
      }
    }
  });
  it('Map only: a visible "View results table" link keeps the range; no dangling #table-view', () => {
    const html = page(SPARSE, { view: 'map', range: '365' });
    assert.match(html, /<a href="\/\?range=365">View results table<\/a><\/p>/);
    assert.ok(!html.includes('href="#table-view"'));
    assert.match(html, /<a href="\/\?range=365">Table<\/a>/);
    assert.match(html, /<a href="\/\?range=365&amp;view=map" aria-current="page">Map<\/a>/);
  });
  it('Table only: no map panel', () => {
    const html = page(SPARSE, { view: 'table' });
    assert.ok(!html.includes('id="map-view"') && html.includes('id="table-view"'));
  });
  it('one view at a time: no side-by-side Both layout remains in the CSS', () => {
    assert.ok(!css.includes('views-both'));
    assert.ok(!/3fr 2fr/.test(css));
  });
  it('the claimed-origin caveat appears once, at the top of the section, in every view and selection', () => {
    for (const view of ['map', 'table'] as const) {
      for (const sel of [{}, { state: 'MD' }, { ac: '410' }]) {
        const html = page(SPARSE, { view, ...sel });
        assert.equal(html.split(CLAIMED_ORIGIN_WARNING).length - 1, 1, `${view} ${JSON.stringify(sel)}`);
        assert.match(html, /<h2 id="geo-h">Reported sender area codes<\/h2>\n<aside class="geo-warning"/);
      }
    }
  });
  it('the region column is "Area code state / region" and links to the methodology', () => {
    const html = page(SPARSE, { view: 'table' });
    assert.match(html, /<th scope="col" class="col-region"><a href="\/methodology">Area code state \/ region<\/a><\/th>/);
    assert.ok(!html.includes('Numbering-plan reference region'));
  });
  it('selection links (tiles, list rows, table, unmapped codes) land on the detail heading and keep the range', () => {
    const html = page([...SPARSE, { areaCode: '800', count: 1 }], { range: '30' });
    assert.match(html, /href="\/\?range=30&amp;view=map&amp;state=MD#detail-h"/);
    assert.match(html, /href="\/\?range=30&amp;view=map&amp;ac=800#detail-h"/);
    const t = page([...SPARSE, { areaCode: '800', count: 1 }], { range: '30', view: 'table' });
    assert.match(t, /href="\/\?range=30&amp;ac=410#detail-h"/);
    assert.match(t, /href="\/\?range=30&amp;ac=800#detail-h"/);
  });
});

describe('map v2: state detail', () => {
  it('carries the area-code tally and the claimed-origin warning, keeps range and clear-selection', () => {
    const counts: AreaCount[] = [{ areaCode: '979', count: 2 }, { areaCode: '713', count: 1 }, ...SPARSE.slice(0, 1)];
    const html = page(counts, { state: 'TX', range: '30' });
    const d = html.slice(html.indexOf('<section class="detail panel"'), html.indexOf('</section>', html.indexOf('<section class="detail panel"')));
    assert.match(d, /<h3 id="detail-h" tabindex="-1">Texas<\/h3>/);
    assert.ok(html.indexOf(CLAIMED_ORIGIN_WARNING) < html.indexOf('id="detail-h"'), 'caveat sits above the detail');
    assert.match(d, /<span class="num big">3<\/span> reports across <span class="num">2<\/span> area codes · /);
    assert.match(d, /href="\/\?range=30&amp;view=map&amp;ac=979#detail-h">Area code 979<\/a> <span class="num">2<\/span>/);
    assert.match(d, /<a href="\/\?range=30&amp;view=map#geo-h">Clear selection<\/a>/);
    // Detail comes before the views, and the selected tile and row are marked.
    assert.ok(html.indexOf('id="detail-h"') < html.indexOf('id="map-view"'));
    assert.match(html, /<a class="tile bin2 gc5 gr8 selected"/);
    assert.match(html, /<a class="state-row selected"/);
  });
  it('the area-code detail keeps its own claimed-origin note under the renamed label', () => {
    const html = page(SPARSE, { ac: '410' });
    const d = html.slice(html.indexOf('<section class="detail panel"'));
    assert.match(d, /<dt>Area code state \/ region<\/dt>/);
    assert.ok(d.indexOf('not where the sender is') < d.indexOf('</section>'));
  });
});

describe('map v2: forced colors', () => {
  it('tiles, rows, selection, check mark and focus use system colors', () => {
    const fc = css.slice(css.indexOf('@media (forced-colors: active)'));
    for (const re of [/a\.tile, \.state-row \{ border: 2px solid LinkText/, /\.tile\.selected, \.state-row\.selected \{ border: 4px solid Highlight/, /\.sel-mark \{ color: Highlight/, /:focus-visible \{ outline: 3px solid CanvasText/, /\.tile \{ border: 1px solid GrayText/]) assert.match(fc, re);
  });
});

describe('map v2: over HTTP', () => {
  it('the live overview shows the summary and both layouts for real filings', async () => {
    const s = await startServer();
    try {
      await previewAndFile(s.base, { number: '(410) 555-0150', message: 'Your toll account has an unpaid balance of $4.15. Pay today at toll-pay-center.top to avoid a fee.', category: 'other', city: '', source: 'manual' });
      await previewAndFile(s.base, { number: '(979) 555-0151', message: 'We buy houses for cash in any condition. Close in 7 days. Reply YES for a fair offer on your home.', category: 'home_buying_offer', city: '', source: 'manual' });
      const r = await get(s.base, '/?view=map');
      assert.equal(r.status, 200);
      assert.match(r.text, /2 reports across 2 states/);
      assert.match(r.text, /<span class="sl-name">Maryland<\/span><span class="sl-sep" aria-hidden="true"> · <\/span><span class="sl-count num">1 report<\/span>/);
      assert.match(r.text, /<span class="sl-name">Texas<\/span>/);
      assert.ok(r.text.indexOf('>Maryland<') < r.text.indexOf('>Texas<'), 'tie broken by name');
      const home = await get(s.base, '/');
      assert.match(home.text, /id="table-view"/);
      assert.ok(!home.text.includes('id="map-view"'), 'Table is the default view');
      const st = await get(s.base, '/?view=map&state=MD');
      assert.match(st.text, /<h3 id="detail-h" tabindex="-1">Maryland<\/h3>\n<p class="count-block">/);
      assert.match(st.text, /1<\/span> report across <span class="num">1<\/span> area code/);
    } finally {
      await s.close();
    }
  });
});
