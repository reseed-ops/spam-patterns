// Overview (home) and tile map in Spanish and Vietnamese with data: every
// data-dependent string (detail panels, table, map, unmapped note, plurals,
// recurring scripts) has a dictionary entry. Pattern data stays as filed.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { loadConfig } from '../src/config.ts';
import { MISSES, withLang } from '../src/i18n.ts';
import { overviewPage, recurringScriptsSection, type OverviewParams } from '../src/pages.ts';
import { TIER_LABEL, type AreaCount, type Pattern } from '../src/patterns.ts';
import { MASK } from '../src/scrub.ts';
import { TEST_KEY, get, previewAndFile, startServer, type TestServer } from './helpers.ts';

// Tier labels are translated with the patterns pages (another dictionary).
const TIER_KEYS = new Set<string>(Object.values(TIER_LABEL));
const misses = () => [...MISSES].filter((k) => !TIER_KEYS.has(k));

const ctx = { cfg: loadConfig({ STM_HMAC_KEY: TEST_KEY }), paused: false };
const P = (o: Partial<OverviewParams> = {}): OverviewParams => ({ range: '90', view: 'map', state: null, ac: null, sort: 'count', ...o });

const COUNTS: Record<string, AreaCount[]> = {
  many: [
    { areaCode: '312', count: 3 },
    { areaCode: '773', count: 1 },
    { areaCode: '415', count: 1 },
    { areaCode: '212', count: 25 },
    { areaCode: '202', count: 2 },
    { areaCode: '800', count: 4 },
  ],
  single: [{ areaCode: '410', count: 1 }],
  dcOnly: [{ areaCode: '202', count: 1 }],
  unmappedOne: [{ areaCode: '888', count: 1 }],
};

const pattern = (o: Partial<Pattern>): Pattern => ({
  id: 'abcd1234',
  tier: 'exact' as Pattern['tier'],
  label: Object.values(TIER_LABEL)[0]!,
  count: 3,
  firstDay: '2026-11-01',
  latestDay: '2026-11-20',
  categories: [],
  distinctAreaCodes: 2,
  skeleton: null,
  example: 'We buy houses for cash. Reply YES.',
  grammarVersion: 'v1',
  templateCount: 1,
  fingerprint: 'x',
  ...o,
});

describe('i18n home: rendered with data', () => {
  for (const lang of ['es', 'vi'] as const) {
    it(`${lang}: overview views, selections, plurals and patterns have entries`, () => {
      MISSES.clear();
      withLang(lang, '/', null, () => {
        for (const counts of Object.values(COUNTS)) {
          for (const view of ['map', 'table'] as const) {
            for (const range of ['30', '90', '365', 'all'] as const) {
              overviewPage(ctx, P({ view, range }), counts, range === 'all' ? '2026-10-01' : null);
              overviewPage(ctx, P({ view, range: 'all' }), counts, null);
            }
            overviewPage(ctx, P({ view, sort: 'code' }), counts, null);
          }
        }
        overviewPage(ctx, P({ state: 'IL' }), COUNTS.many!, null);
        overviewPage(ctx, P({ state: 'MD' }), COUNTS.single!, null);
        overviewPage(ctx, P({ ac: '312', view: 'table' }), COUNTS.many!, null);
        overviewPage(ctx, P({ ac: '999', view: 'table' }), COUNTS.many!, null);
        overviewPage(ctx, P(), COUNTS.many!, null, [pattern({}), pattern({ id: 'b', count: 1, example: null })]);
        overviewPage(ctx, P(), [], null, [pattern({})]);
      });
      assert.deepEqual(misses(), []);
    });

    it(`${lang}: pattern examples and scrub masks are not translated`, () => {
      const html = withLang(lang, '/', null, () => recurringScriptsSection([pattern({})]));
      assert.ok(html.includes('We buy houses for cash. Reply YES.'));
      const empty = withLang(lang, '/', null, () => recurringScriptsSection([]));
      for (const m of [MASK.recipient, MASK.sender, MASK.phone, MASK.link]) assert.ok(empty.includes(m), m);
      assert.ok(!empty.includes('We buy houses for cash in any condition'));
    });
  }
});

describe('i18n home: live pages with filed reports', () => {
  let s: TestServer;
  before(async () => {
    s = await startServer();
    const msgs = [
      ['(312) 555-0142', 'Your toll account has an unpaid balance of $4.15. Pay today at toll-pay-center.top to avoid a fee.'],
      ['(415) 555-0143', 'We buy houses for cash in any condition. Close in 7 days. Reply YES for a fair offer on your home.'],
      ['(212) 555-0144', 'Your package could not be delivered. Update your address at parcel-fix.top today.'],
      ['(800) 555-0145', 'You won a gift card. Claim it now at prize-claim.top before it expires.'],
    ];
    for (const [number, message] of msgs) {
      const r = await previewAndFile(s.base, { number: number!, message: message!, category: 'other', city: '', source: 'manual' });
      assert.equal(r.filed.status, 201, r.filed.text);
    }
  });
  after(async () => {
    await s?.close();
  });

  for (const lang of ['es', 'vi'] as const) {
    for (const path of ['/?view=map', '/?state=IL', '/?view=map&state=IL', '/?ac=312', '/?ac=800', '/?range=all', '/?range=all&view=map', '/?sort=code']) {
      it(`${lang} ${path}: no missing keys`, async () => {
        MISSES.clear();
        const r = await get(s.base, `${path}&lang=${lang}`.replace(/^\/&/, '/?'));
        assert.equal(r.status, 200);
        assert.match(r.text, new RegExp(`<html lang="${lang}">`));
        assert.deepEqual(misses(), []);
      });
    }
  }
});
