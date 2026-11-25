// Automated accessibility checks in headless Chromium. Not part of `npm test`
// (needs a browser and axe-core). Usage, against a running seeded instance:
//
//   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core \
//   AXE=/path/to/node_modules/axe-core/axe.min.js \
//   CHROME=/path/to/chrome BASE=http://127.0.0.1:8080 node scripts/a11y-check.cjs
//
// Checks: axe-core WCAG 2.0/2.1/2.2 A+AA rules on every page and every step
// of the report flow; 320 px reflow; 200% zoom (1280 px window at 2x);
// keyboard focus order and visible focus through the report flow; and
// forced-colors (Windows High Contrast) rendering of key controls.
// Exits 1 if any check fails. Screen-reader behavior is NOT tested here.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');

const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const AXE = fs.readFileSync(process.env.AXE || require.resolve('axe-core/axe.min.js'), 'utf8');
const OUT = process.env.OUT || path.join(os.tmpdir(), 'stm-a11y');
fs.mkdirSync(OUT, { recursive: true });

const failures = [];
const results = {};
const fail = (k, msg) => { failures.push(`${k}: ${msg}`); };

async function axe(page, label) {
  await page.evaluate(AXE);
  const r = await page.evaluate(() =>
    // eslint-disable-next-line no-undef
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] }),
  );
  const v = r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, sample: x.nodes[0] && x.nodes[0].target.join(' ') }));
  results.axe[label] = v.length ? v : 'pass';
  for (const x of v) fail(`axe ${label}`, `${x.id} (${x.impact}, ${x.nodes} nodes, e.g. ${x.sample})`);
}

async function overflow(page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const off = [];
    if (sw > w + 1) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width && r.right > w + 1 && getComputedStyle(el).position !== 'absolute') off.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : ''} right=${Math.round(r.right)}`);
        if (off.length >= 5) break;
      }
    }
    return { clientWidth: w, scrollWidth: sw, off };
  });
}

async function describeFocus(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || (cs.boxShadow && cs.boxShadow !== 'none');
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || el.id || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    // DOM-order index among all elements
    const all = [...document.querySelectorAll('*')];
    return { tag: el.tagName.toLowerCase(), id: el.id || null, name, visible, index: all.indexOf(el) };
  });
}

async function tabWalk(page, label, { fromPageLoad = false, max = 40 } = {}) {
  const stops = [];
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  // Start from the top of the document.
  await page.keyboard.press('Tab');
  for (let i = 0; i < max; i++) {
    const d = await describeFocus(page);
    if (!d) break;
    if (stops.length && d.index === stops[0].index) break; // wrapped
    stops.push(d);
    await page.keyboard.press('Tab');
  }
  results.focus[label] = stops.map((s) => `${s.tag}${s.id ? '#' + s.id : ''} "${s.name}"${s.visible ? '' : ' [NO VISIBLE FOCUS]'}`);
  for (let i = 1; i < stops.length; i++) {
    if (stops[i].index < stops[i - 1].index) fail(`focus ${label}`, `order goes backwards at stop ${i}: ${stops[i - 1].id || stops[i - 1].tag} -> ${stops[i].id || stops[i].tag}`);
  }
  for (const s of stops) if (!s.visible) fail(`focus ${label}`, `no visible focus indicator on ${s.tag}#${s.id || ''} "${s.name}"`);
  if (fromPageLoad && (!stops.length || !/skip/i.test(stops[0].name))) fail(`focus ${label}`, 'first Tab stop is not the skip link');
  return stops;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
  results.axe = {}; results.reflow320 = {}; results.reflow375 = {}; results.zoom200 = {}; results.focus = {}; results.forcedColors = {};

  // Discover a pattern detail URL from the patterns page.
  const ctx0 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p0 = await ctx0.newPage();
  await p0.goto(`${BASE}/patterns`);
  const patternHref = await p0.evaluate(() => { const a = document.querySelector('a[href^="/patterns/"]'); return a && a.getAttribute('href'); });
  const PAGES = ['/', '/?view=table', '/?view=map', '/?state=TX', '/?view=map&state=TX', '/?ac=410', '/?range=30', '/?range=all', '/report', '/delete', '/patterns', ...(patternHref ? [patternHref] : []), '/patterns/unknown-id', '/data', '/privacy', '/methodology', '/project', '/junk-mail', '/opt-out', '/offline', '/report/complete'];

  for (const url of PAGES) {
    await p0.goto(BASE + url);
    await axe(p0, url);
  }

  // Reflow at 320 CSS px, and 200% zoom of a 1280 px window (= 640 CSS px at 2x).
  for (const [key, vp] of [['reflow320', { width: 320, height: 640, deviceScaleFactor: 1 }], ['reflow375', { width: 375, height: 812, deviceScaleFactor: 1 }], ['zoom200', { width: 640, height: 450, deviceScaleFactor: 2 }]]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });
    const p = await ctx.newPage();
    for (const url of PAGES) {
      await p.goto(BASE + url);
      const o = await overflow(p);
      results[key][url] = o.scrollWidth > o.clientWidth + 1 ? { ...o } : 'pass';
      if (o.scrollWidth > o.clientWidth + 1) fail(`${key} ${url}`, `horizontal scroll: scrollWidth ${o.scrollWidth} > ${o.clientWidth}; ${o.off.join(', ')}`);
    }
    await p.goto(BASE + '/');
    await p.screenshot({ path: path.join(OUT, `${key}-overview.png`), fullPage: true });
    await p.goto(BASE + '/report');
    await p.screenshot({ path: path.join(OUT, `${key}-report.png`), fullPage: true });
    await ctx.close();
  }

  // Map layout (Codex map review): grid only when the map panel content is
  // >= 716 px, else the state list; tile and row target sizes; DOM order of
  // Table before Map; skip targets; focus through the map.
  results.mapLayout = {};
  for (const w of [320, 375, 768, 1024, 1280, 1440]) {
    const c = await browser.newContext({ viewport: { width: w, height: 900 } });
    const pg = await c.newPage();
    for (const url of ['/', '/?view=map', '/?state=TX']) {
      await pg.goto(BASE + url);
      const m = await pg.evaluate(() => {
        const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
        const body = document.querySelector('.map-body');
        const grid = document.querySelector('.tile-grid');
        const list = document.querySelector('.state-list');
        const tiles = [...document.querySelectorAll('.tile-grid .tile')].map((t) => t.getBoundingClientRect());
        const links = [...document.querySelectorAll(vis(grid) ? '.tile-grid a.tile' : '.state-list a')].map((t) => t.getBoundingClientRect());
        const tbl = document.querySelector('#table-view'); const map = document.querySelector('#map-view');
        const twoCol = !!(tbl && map && Math.abs(tbl.getBoundingClientRect().top - map.getBoundingClientRect().top) < 2);
        return {
          bodyWidth: body ? Math.round(body.getBoundingClientRect().width) : null,
          grid: vis(grid), list: vis(list),
          minTile: tiles.length && vis(grid) ? Math.round(Math.min(...tiles.map((r) => Math.min(r.width, r.height)))) : null,
          minTargetH: links.length ? Math.round(Math.min(...links.map((r) => r.height))) : null,
          minTargetW: links.length ? Math.round(Math.min(...links.map((r) => r.width))) : null,
          twoCol,
          overflowing: body ? [...body.querySelectorAll('a')].filter((a) => a.getBoundingClientRect().right > body.getBoundingClientRect().right + 1).length : 0,
          tableFirst: !!(tbl && map) ? (tbl.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 : null,
          dangling: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((h) => h.length > 1 && !document.getElementById(h.slice(1))),
        };
      });
      results.mapLayout[`${w} ${url}`] = m;
      if (m.bodyWidth !== null) {
        if (m.grid === m.list) fail(`map ${w} ${url}`, `grid ${m.grid} list ${m.list}`);
        if (m.grid !== (m.bodyWidth >= 716)) fail(`map ${w} ${url}`, `grid shown=${m.grid} at map content ${m.bodyWidth}px`);
        if (m.grid && m.minTile < 56) fail(`map ${w} ${url}`, `tile ${m.minTile}px < 56`);
        if (m.list && m.minTargetH !== null && m.minTargetH < 48) fail(`map ${w} ${url}`, `list row ${m.minTargetH}px < 48`);
      }
      if (m.overflowing) fail(`map ${w} ${url}`, `${m.overflowing} map links overflow the map panel`);
      if (m.dangling.length) fail(`map ${w} ${url}`, `dangling in-page links ${m.dangling.join(' ')}`);
      if (m.tableFirst === false) fail(`map ${w} ${url}`, 'map before table in DOM');
      if (m.twoCol && m.bodyWidth < 716) fail(`map ${w} ${url}`, `two columns with map content ${m.bodyWidth}px`);
    }
    for (const url of ['/', '/?view=map', '/?state=TX']) {
      await pg.goto(BASE + url);
      await pg.screenshot({ path: path.join(OUT, `map-${w}${url.replace(/[^a-z0-9]+/gi, '_')}.png`), fullPage: true });
    }
    await c.close();
  }
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pg = await c.newPage();
    await pg.goto(`${BASE}/?view=map`);
    await tabWalk(pg, 'overview:map', { fromPageLoad: true, max: 80 });
    await pg.goto(`${BASE}/`);
    await tabWalk(pg, 'overview:both', { fromPageLoad: true, max: 120 });
    await c.close();
  }

  // Keyboard focus order through the report flow (manual entry path).
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/report`);
  await tabWalk(p, 'report:start', { fromPageLoad: true });
  await p.click('[data-go="details"]');
  results.focus['report:details:focus-on-entry'] = await p.evaluate(() => document.activeElement && document.activeElement.id);
  if (results.focus['report:details:focus-on-entry'] !== 'details-h') fail('focus report:details', 'focus did not move to the step heading');
  await tabWalk(p, 'report:details');
  // Submit empty: errors must take focus (summary) and be announced.
  await p.click('#details-form button[type=submit]');
  await p.waitForTimeout(200);
  results.focus['report:details:empty-submit-focus'] = await p.evaluate(() => document.activeElement && document.activeElement.id);
  await axe(p, 'report:details (errors shown)');
  await p.fill('#f-number', '(469) 555-0121');
  await p.fill('#f-message', 'Hi Jordan, Avery here. Helping neighbors over in Fairview. Is your roof due for a look? Free estimate. Would that work for you?');
  await p.selectOption('#f-category', 'roofing');
  await p.fill('#f-city', 'Fairview');
  await p.click('#details-form button[type=submit]');
  await p.waitForSelector('[data-step="review"]:not([hidden])');
  results.focus['report:review:focus-on-entry'] = await p.evaluate(() => document.activeElement && document.activeElement.id);
  if (results.focus['report:review:focus-on-entry'] !== 'review-h') fail('focus report:review', 'focus did not move to the step heading');
  await axe(p, 'report:review');
  await tabWalk(p, 'report:review');
  await p.click('#file-btn');
  await p.waitForSelector('[data-step="done"]:not([hidden])');
  results.focus['report:done:focus-on-entry'] = await p.evaluate(() => document.activeElement && document.activeElement.id);
  if (results.focus['report:done:focus-on-entry'] !== 'done-h') fail('focus report:done', 'focus did not move to the step heading');
  await axe(p, 'report:done');
  await tabWalk(p, 'report:done');
  await ctx.close();

  // Forced colors.
  const fc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const fp = await fc.newPage();
  await fp.emulateMedia({ forcedColors: 'active' });
  await fp.goto(`${BASE}/?state=TX`);
  results.forcedColors.overview = await fp.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const cs = (s, prop) => (q(s) ? getComputedStyle(q(s))[prop] : null);
    return {
      matches: matchMedia('(forced-colors: active)').matches,
      btnBorder: cs('.btn', 'borderTopWidth') + ' ' + cs('.btn', 'borderTopStyle'),
      geoWarningBorder: cs('.geo-warning', 'borderTopWidth'),
      tileLinkBorder: cs('a.tile', 'borderTopWidth'),
      selectedTileBorder: cs('.tile.selected', 'borderTopWidth'),
      selectedTileBorderColor: cs('.tile.selected', 'borderTopColor'),
      selectedMark: cs('.sel-mark', 'color'),
      swatchBorder: cs('.swatch', 'borderTopWidth'),
    };
  });
  const f = results.forcedColors.overview;
  if (!f.matches) fail('forced-colors', 'media query did not match under emulation');
  if (!/^2px solid/.test(f.btnBorder)) fail('forced-colors', `button border not visible: ${f.btnBorder}`);
  if (f.tileLinkBorder !== '2px') fail('forced-colors', `tile link border not thickened: ${f.tileLinkBorder}`);
  if (f.selectedTileBorder !== '4px') fail('forced-colors', `selected tile border: ${f.selectedTileBorder}`);
  await fp.screenshot({ path: path.join(OUT, 'forced-colors-overview.png'), fullPage: true });
  await fp.goto(`${BASE}/report`);
  await fp.keyboard.press('Tab');
  results.forcedColors.focusOutline = await fp.evaluate(() => { const cs = getComputedStyle(document.activeElement); return `${cs.outlineWidth} ${cs.outlineStyle}`; });
  if (!/^3px solid/.test(results.forcedColors.focusOutline)) fail('forced-colors', `focus outline lost: ${results.forcedColors.focusOutline}`);
  await fp.screenshot({ path: path.join(OUT, 'forced-colors-report.png'), fullPage: true });
  await fc.close();

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'a11y-results.json'), JSON.stringify({ results, failures }, null, 2));
  console.log(JSON.stringify({ results, failures }, null, 2));
  console.log(failures.length ? `\n${failures.length} FAILURES` : '\nALL CHECKS PASSED');
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
