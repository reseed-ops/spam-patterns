// Spanish and Vietnamese for the patterns, pattern, data and methodology
// pages, including the data-dependent strings an empty test database never
// renders (published patterns of each tier, with and without a skeleton).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AREA_CODE_SOURCE } from '../src/areacodes.ts';
import { CATEGORY_LABEL } from '../src/categories.ts';
import { loadConfig } from '../src/config.ts';
import { esc, textOf } from '../src/html.ts';
import { DICT } from '../src/i18n/index.ts';
import { DICT_CONTENT } from '../src/i18n/content.ts';
import { MISSES, withLang, type Lang } from '../src/i18n.ts';
import { methodologyPage, patternDetailPage, patternsPage, type PageCtx } from '../src/pages.ts';
import { TIER_LABEL, type Pattern, type Tier } from '../src/patterns.ts';
import { CTA_DESCRIBE, SLOT_RULES, renderSkeletonExample } from '../src/skeleton.ts';
import { TEST_KEY } from './helpers.ts';

const ctx = (env: Record<string, string> = {}): PageCtx => ({ cfg: loadConfig({ STM_HMAC_KEY: TEST_KEY, ...env }), paused: false });

function fakePattern(tier: Tier, skeleton: string | null, areaCodes: number, n: number): Pattern {
  return {
    id: `p${tier}${n}abcd`,
    tier,
    label: TIER_LABEL[tier],
    count: 3 + n,
    firstDay: '2026-11-02',
    latestDay: '2026-11-20',
    categories: [
      { label: CATEGORY_LABEL.roofing!, count: 2 },
      { label: CATEGORY_LABEL.unknown!, count: 1 + n },
    ],
    distinctAreaCodes: areaCodes,
    skeleton,
    example: skeleton ? renderSkeletonExample(skeleton) : null,
    grammarVersion: 'v1',
    templateCount: 2,
    fingerprint: 'f'.repeat(64),
  };
}

const PATTERNS: Pattern[] = [
  fakePattern('exact', null, 1, 0),
  fakePattern('exact', 'GREETING>PERSONA>LOCAL_CLAIM>TRADE>OFFER>CTA', 4, 1),
  fakePattern('near', null, 2, 2),
  fakePattern('near', 'PERSONA>LOCAL_CLAIM>TRADE>OFFER>CTA', 1, 3),
  fakePattern('formula', 'GREETING>LOCAL_CLAIM>TRADE>OFFER>CTA', 1, 4),
  fakePattern('formula', 'GREETING>PERSONA>LOCAL_CLAIM>TRADE>OFFER', 7, 5),
];

/** Category labels belong to the report dictionary (src/i18n/report.ts), not this one. */
const CATEGORY_LABELS = new Set(Object.values(CATEGORY_LABEL));
const ownMisses = () => [...MISSES].filter((k) => !CATEGORY_LABELS.has(k));

function render(lang: Lang, fn: () => string): string {
  MISSES.clear();
  const html = withLang(lang, '/patterns', null, fn);
  assert.deepEqual(ownMisses(), [], `${lang}: t() keys with no entry`);
  return html;
}

describe('i18n content: patterns and pattern pages with data', () => {
  for (const lang of ['es', 'vi'] as const) {
    it(`${lang}: /patterns with published patterns of every tier`, () => {
      const html = render(lang, () => patternsPage(ctx(), PATTERNS));
      for (const tier of ['exact', 'near', 'formula'] as const) assert.ok(html.includes(esc(DICT[TIER_LABEL[tier]]![lang])), `${tier} label translated`);
      for (const p of PATTERNS) assert.ok(html.includes(`href="/patterns/${p.id}`), 'pattern id unchanged');
    });

    for (const p of PATTERNS) {
      it(`${lang}: pattern page, ${p.tier}, ${p.skeleton ? 'skeleton' : 'no skeleton'}, ${p.distinctAreaCodes} area code(s)`, () => {
        const html = render(lang, () => patternDetailPage(ctx(), p));
        assert.ok(html.includes(esc(p.id)));
        if (p.skeleton) {
          assert.ok(html.includes(`<p class="scrubbed panel">${esc(p.example)}</p>`), 'example unchanged');
          assert.ok(html.includes(esc(p.skeleton.split('>').join(' → '))), 'skeleton unchanged');
        }
        assert.ok(html.includes(esc(DICT[TIER_LABEL[p.tier]]![lang])));
      });
    }

    it(`${lang}: pattern not found`, () => {
      render(lang, () => patternDetailPage(ctx(), null));
    });

    it(`${lang}: methodology with same-connection duplicate control on`, () => {
      const html = render(lang, () => methodologyPage(ctx({ STM_TRUSTED_PROXIES: '127.0.0.1' })));
      assert.match(html, /<p class="meta">[^<]+<\/p>\n<dl class="dl">/, 'note on the English worked example');
    });
  }

  it('English output keeps the pattern pages as they were (no note on the worked example)', () => {
    const html = methodologyPage(ctx());
    assert.ok(!html.includes('The example is in English'));
    assert.ok(html.includes('<h3>Worked example (synthetic)</h3>\n<dl class="dl">'));
    const page = patternDetailPage(ctx(), PATTERNS[0]!);
    assert.ok(page.includes('<dt>Sender area codes</dt><dd>1 different area code</dd>'));
    assert.ok(patternDetailPage(ctx(), PATTERNS[1]!).includes('<dd>4 different area codes</dd>'));
    assert.ok(page.includes('<dt>Dates</dt>') === false);
    assert.ok(patternsPage(ctx(), PATTERNS).includes('<dt>Dates</dt><dd>'));
  });

  it('helper text from other modules has entries (slot rules, area-code data note)', () => {
    for (const s of [...Object.values(SLOT_RULES).map((r) => r.describe), CTA_DESCRIBE, AREA_CODE_SOURCE]) {
      assert.ok(DICT_CONTENT[s], `entry for ${JSON.stringify(s)}`);
    }
    for (const l of Object.values(TIER_LABEL)) assert.ok(DICT_CONTENT[l], `entry for tier label ${l}`);
  });

  it('no translation reads as English to the page check (function words)', () => {
    const english = /\b(the|and|your|you|with|this|that|are|for|from|not|is|of|to|or|we|our|it|be|was|will|can|has|have)\b/gi;
    const bad: string[] = [];
    for (const [en, e] of Object.entries(DICT_CONTENT)) {
      for (const lang of ['es', 'vi'] as const) {
        const text = textOf(e[lang]).replace(/\{\w+\}/g, ' ').replace(/\S+@\S+|https?:\/\/\S+|\b[\w.-]+\.(?:md|json|mjs|csv)\b/g, ' ');
        for (const m of text.matchAll(english)) bad.push(`${lang} ${JSON.stringify(en.slice(0, 40))}: …${text.slice(Math.max(0, m.index - 20), m.index + 20)}…`);
      }
    }
    assert.deepEqual(bad, []);
  });
});
