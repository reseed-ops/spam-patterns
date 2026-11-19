// Accessibility: WCAG 2.2 contrast computed from the palette tokens in
// app.css (and the map bin colors in map.ts), so a palette edit that breaks
// AA fails the build. Text pairs need 4.5:1 (1.4.3); UI component and
// graphical-object boundaries need 3:1 (1.4.11).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { BINS, BIN_ZERO } from '../src/map.ts';

const css = readFileSync(new URL('../public/static/css/app.css', import.meta.url), 'utf8');
const root = /:root\s*{([^}]*)}/.exec(css)![1]!;
const T: Record<string, string> = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1]!, m[2]!]));
T.white = '#FFFFFF';
T['selected-row'] = /tr\.selected td \{ background: (#[0-9A-Fa-f]{6})/.exec(css)![1]!;

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}
const tok = (n: string) => {
  assert.ok(T[n], `missing token --${n}`);
  return T[n]!;
};

// [foreground, background, where it is used]
const TEXT: Array<[string, string, string]> = [
  ['text', 'canvas', 'body text'], ['text', 'surface', 'panels, tables'], ['text', 'map-bg', 'map area'], ['text', 'selected-row', 'selected table row'],
  ['text-2', 'canvas', 'meta/help text'], ['text-2', 'surface', 'meta text in panels, tile abbreviations'], ['text-2', 'map-bg', 'map captions'],
  ['action', 'canvas', 'links'], ['action', 'surface', 'links, secondary buttons'], ['action-hover', 'surface', 'hovered links'], ['action', 'selected-row', 'link in selected row'],
  ['white', 'action', 'primary button'], ['white', 'action-hover', 'hovered primary button'], ['white', 'err', 'danger button'],
  ['err', 'err-bg', 'error notice'], ['err', 'surface', 'field errors'], ['ok', 'ok-bg', 'success notice'],
  ['warn', 'warn-bg', 'claimed-origin warning, demo banner'],
  ['bin0-text', 'bin0', 'state abbreviation on a zero-report tile'],
  ['bin-text-light', 'bin1', 'tile text, 1 report'], ['bin-text-light', 'bin2', 'tile text, 2–4 reports'],
  ['bin-text-dark', 'bin3', 'tile text, 5–19 reports'], ['bin-text-dark', 'bin4', 'tile text, 20+ reports'],
];
const NON_TEXT: Array<[string, string, string]> = [
  ['outline', 'surface', 'input borders'], ['outline', 'canvas', 'input borders on canvas'],
  ['focus', 'surface', 'focus ring'], ['focus', 'canvas', 'focus ring on canvas'],
  ['action', 'surface', 'secondary button border'], ['err', 'surface', 'invalid field border'], ['warn', 'warn-bg', 'warning border'],
  ['outline', 'white', 'outline of a tile with reports, legend swatch border'],
  ['text', 'bin1', 'selected-tile inset border, light bin'], ['text', 'bin2', 'selected-tile inset border, light bin'],
  ['white', 'bin3', 'selected-tile inner ring, dark bin'], ['white', 'bin4', 'selected-tile inner ring, dark bin'],
];

describe('contrast from palette tokens (WCAG 2.2 AA)', () => {
  for (const [fg, bg, where] of TEXT) {
    it(`text ${fg} on ${bg} >= 4.5:1 (${where})`, () => {
      const r = contrast(tok(fg), tok(bg));
      assert.ok(r >= 4.5, `${fg} ${tok(fg)} on ${bg} ${tok(bg)} = ${r.toFixed(2)}:1`);
    });
  }
  for (const [fg, bg, where] of NON_TEXT) {
    it(`non-text ${fg} against ${bg} >= 3:1 (${where})`, () => {
      const r = contrast(tok(fg), tok(bg));
      assert.ok(r >= 3, `${fg} ${tok(fg)} vs ${bg} ${tok(bg)} = ${r.toFixed(2)}:1`);
    });
  }
  it('the focus ring is separated from filled buttons by a white gap, so it only ever sits on white or canvas', () => {
    assert.match(css, /:focus-visible \{ outline: 3px solid var\(--focus\); outline-offset: 2px; box-shadow: 0 0 0 2px #fff; \}/);
  });
  it('map bins: CSS tokens match map.ts (fill and text), darken monotonically, and are not the only cue', () => {
    BINS.forEach((b, i) => {
      assert.equal(b.color.toUpperCase(), tok(`bin${i + 1}`).toUpperCase());
      assert.equal(b.text.toUpperCase(), tok(i < 2 ? 'bin-text-light' : 'bin-text-dark').toUpperCase());
    });
    assert.equal(BIN_ZERO.color, tok('bin0'));
    assert.equal(BIN_ZERO.text, tok('bin0-text'));
    for (let i = 1; i < BINS.length; i++) assert.ok(lum(BINS[i]!.color) < lum(BINS[i - 1]!.color));
    // Tiles and swatches share the .binN classes, so fill and legend cannot drift.
    for (let i = 0; i <= 4; i++) assert.match(css, new RegExp(`\\.bin${i} \\{ background: var\\(--bin${i}\\)`));
    // Every populated tile and list row prints its exact count as text, so
    // bin color is never the sole cue (1.4.1).
    const src = readFileSync(new URL('../src/map.ts', import.meta.url), 'utf8');
    assert.match(src, /class="tile-count">\$\{g\.count\}/);
    assert.match(src, /class="sl-count num">\$\{g\.count\} /);
  });
  it('Codex spec: populated tile text pairs are at least 5.24:1', () => {
    for (const b of BINS) assert.ok(contrast(b.text, b.color) >= 5.24, `${b.text} on ${b.color} = ${contrast(b.text, b.color).toFixed(2)}:1`);
  });
});
