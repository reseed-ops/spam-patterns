# Accessibility

Target: WCAG 2.2 AA (ux-codex.md, plan v2). This file records what has been **tested**, how, and what has **not** been tested. Nothing on the untested list should be read as done.

## Automated, in `npm test` (runs in CI)

- **Contrast from the palette tokens** (`test/a11y-contrast.test.ts`). The test reads the `:root` tokens in `app.css` and computes WCAG contrast for 23 text pairs (needing 4.5:1) and 12 non-text pairs (needing 3:1). It also checks that the map bin fills and tile text colors match the CSS, that they darken monotonically, that every populated tile text pair reaches 5.24:1, and that color is never the only cue: each tile and list row prints its exact count.

Measured values (2026-11-17):

| Pair | Ratio |
|---|---|
| text on canvas | 15.15:1 |
| text-2 on surface / on map background | 7.58:1 / 6.92:1 |
| action (links, secondary buttons) on surface | 8.63:1 |
| white on action (primary button) | 8.63:1 |
| warn on warn-bg (claimed-origin warning) | 8.11:1 |
| err on err-bg / ok on ok-bg | 7.07:1 / 8.11:1 |
| outline (input borders) on surface | 4.76:1 |
| focus ring on surface | 5.41:1 |
| tile text #172333 on bin1 / bin2 | 8.89:1 / 5.25:1 |
| white tile text on bin3 / bin4 | 5.58:1 / 9.18:1 |
| zero-tile abbreviation #475569 on #F1F5F9 | 6.92:1 |
| adjacent bins (1/2, 2/3, 3/4) | 1.69 / 1.85 / 1.64:1 |

Bin fills are not a conveying channel on their own. The exact count is printed as text on every populated tile, in the phone state list and in the table. Adjacent bins are therefore not required to contrast with each other, and they do not.

## Automated, in headless Chromium (`scripts/a11y-check.cjs`, manual run)

This needs playwright-core, axe-core and a Chromium. The usage line is at the top of the script. Run 2026-11-17 against a seeded instance with Chromium from Playwright 1.57 and axe-core 4.x. The run covered 13 URLs, plus every report-flow step (start, details with errors shown, review, done).

| Check | First run | After fixes |
|---|---|---|
| axe-core, WCAG 2.0/2.1/2.2 A and AA rules | 3 pages failed `label-content-name-mismatch` (9 map tiles each) | **0 violations** |
| Reflow at 320 CSS px (no horizontal scroll) | 4 pages failed: Overview (map panel 372 px), table view (355 px), state view, Methodology (414 px) | **pass, all 13** |
| 200% zoom (1280 px window at 2x = 640 CSS px) | pass | **pass, all 13** |
| Keyboard focus order through the report flow | The order matched the DOM order, with a visible indicator on every stop. Focus moves to each step's heading. An empty submit moves focus to the error summary | **pass** |
| Forced colors (emulated `forced-colors: active`) | Buttons get a 2 px border, tiles with reports get a 2 px CanvasText stroke, the selected tile ring uses Highlight, and the focus outline stays 3 px | **pass** |

Fixes made in evening 2:

- **Map tiles (2.5.3 Label in Name).** The accessible name now starts with the tile's visible text, for example "TX 7 6 codes. Texas: 7 reports across 6 area codes, …".
- **Table at narrow widths.** The "Numbering-plan reference region" header was not hidden at 600 px or below while its cells were, which left a misaligned, overflowing table. Fixed. Cell padding is also tighter at 400 px or below.
- **Grid overflow.** The map and table grid items now have `min-width: 0`, so the map scales down instead of overflowing.
- **Long tokens.** Long URLs and skeleton strings in prose wrap (`overflow-wrap: break-word` on `main`).

## Map v2 (v0.1.4, 2026-11-19)

The SVG map was replaced by server-rendered HTML on a CSS Grid (Codex map review, items 1-4). The tile grid is shown only when the map panel's content is at least 716 px wide (12 tiles of at least 56 px plus 4 px gaps). Narrower panels get a list of states with reports: full state name, exact count, rows of at least 48 px, the same detail links and bin swatches. This closes the earlier limitation where the 320 px map scaled to about 40% with unreadable tile text. In the Both view the table comes before the map in the DOM and the layout, and the two sit side by side only when the map keeps its 716 px minimum.

`scripts/a11y-check.cjs` now also checks, at 320, 375, 768, 1024, 1280 and 1440 px, that the grid shows exactly when the map content is 716 px or wider, that tiles are at least 56 px and list rows at least 48 px, that no map link overflows the panel, that the table comes before the map, and that no in-page link points to a missing id. It also walks keyboard focus through the Map and Both views. Run 2026-11-19 against a sparse local instance (2 reports: 410, 979) and a dense synthetic one (1,034 reports across every state, DC and toll-free): **all checks passed** on both, axe 0 violations on 19-20 URLs.

## NOT tested (do not treat as done)

- **Screen readers.** VoiceOver (macOS and iOS), NVDA, JAWS and TalkBack have not been run. That includes the live-region announcements (overview count, OCR progress, copy status), the review screen reading order, and the map's link labels. This needs a person with the tools.
- **Real forced-colors rendering.** The check above emulates the media query in Chromium. Windows High Contrast themes on a real Windows machine have not been looked at.
- **Real browser zoom and text-only zoom.** Zoom was approximated with viewport and device-scale emulation. Firefox text-only zoom and iOS Dynamic Type have not been tried.
- **Speech input** (Voice Control, Dragon), switch access, and touch target sizes on a real phone.
- **Cognitive and plain-language review.** This is part of the Phase 1 stranger-read.
