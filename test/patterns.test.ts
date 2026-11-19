// Pattern tiers: exact vs near vs formula-only, and stop-skeletons.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Keys } from '../src/crypto.ts';
import { openDb } from '../src/db.ts';
import { fileReport, prepare } from '../src/filing.ts';
import { EXACT_SET, FORMULA_SET, NEAR_SET, SINGLES, STOP_SET, type Fixture } from '../src/fixtures.ts';
import { PATTERN_THRESHOLD, TIER_LABEL, computePatterns } from '../src/patterns.ts';
import { canonicalTemplate, scrubMessage } from '../src/scrub.ts';
import { SKELETON_GRAMMAR_VERSION, extractSkeleton, isStopSkeleton, minhash, similarity } from '../src/skeleton.ts';
import { TEST_KEY, idemKey } from './helpers.ts';
import { NEGATIVE_CONTROLS } from './negative-controls.ts';

const keys = new Keys(Buffer.from(TEST_KEY, 'hex'));

function load(fixtures: Fixture[]) {
  const db = openDb(':memory:');
  for (const f of fixtures) {
    const input = { number: f.number, message: f.message, category: f.category, city: f.city ?? '' };
    const p = prepare(keys, input);
    assert.ok(!('errors' in p), JSON.stringify(p));
    const out = fileReport(
      { db, keys, duplicateWindowHours: 24, globalDailySubmissions: 1e9, allowNewFiling: () => true, now: new Date(Date.now() - f.daysAgo * 86_400_000) },
      { ...input, previewHash: p.preview.previewHash, idempotencyKey: idemKey() },
    );
    assert.equal(out.http, 201);
  }
  return db;
}

const tpl = (f: Fixture) => {
  const r = scrubMessage(f.message, { city: f.city ?? null });
  assert.ok('template' in r);
  return r.template;
};

describe('exact tier', () => {
  it('3 identical messages from different numbers -> "identical message"', () => {
    const ps = computePatterns(load(EXACT_SET), keys);
    assert.equal(ps.length, 1);
    assert.equal(ps[0]!.tier, 'exact');
    assert.equal(ps[0]!.label, 'identical message');
    assert.equal(ps[0]!.count, 3);
  });
  it('2 identical messages are below the threshold', () => {
    assert.equal(computePatterns(load(EXACT_SET.slice(0, 2)), keys).length, 0);
  });
});

describe('near tier', () => {
  it('lightly edited copies -> "same message, lightly edited", not exact', () => {
    const t = NEAR_SET.map(tpl);
    assert.equal(new Set(t.map(canonicalTemplate)).size, 3, 'fixtures must not be identical');
    const ps = computePatterns(load(NEAR_SET), keys);
    assert.equal(ps.length, 1);
    assert.equal(ps[0]!.tier, 'near');
    assert.equal(ps[0]!.label, 'same message, lightly edited');
  });
  it('does not chain: A~B and B~C does not pull in C when C is far from A', () => {
    const base = 'Alert: unusual sign in on your bank account. Verify your identity now to avoid a hold on your funds today.';
    const b = 'Alert: unusual sign in on your bank account. Verify your identity now to avoid a hold on your card this week.';
    const c = 'Notice: we saw a sign in on your card this week. Confirm your details soon to avoid a hold on your card this week.';
    const [sa, sb, sc] = [base, b, c].map((x) => minhash(x));
    assert.ok(similarity(sa!, sc!) < 0.6, 'C must be far from A for this test');
    const ps = computePatterns(
      load([base, b, c].map((m, i) => ({ number: `(214) 555-01${50 + i}`, message: m, category: 'account_alert', daysAgo: 3 - i }))),
      keys,
    );
    assert.ok(ps.every((p) => p.tier !== 'near'), 'no near cluster of 3 via chaining');
  });
});

describe('formula tier', () => {
  it('fixture set has NO identical and NO near-identical templates', () => {
    const t = FORMULA_SET.map(tpl);
    assert.equal(new Set(t.map(canonicalTemplate)).size, FORMULA_SET.length);
    const sigs = t.map(minhash);
    for (let i = 0; i < sigs.length; i++) for (let j = i + 1; j < sigs.length; j++) {
      assert.ok(similarity(sigs[i]!, sigs[j]!) < 0.6, `templates ${i} and ${j} are near-identical`);
    }
    for (const x of t) assert.equal(extractSkeleton(x), 'GREETING>PERSONA>LOCAL_CLAIM>TRADE>OFFER>CTA');
  });
  it('different wording, same script -> "shared script pattern" only', () => {
    const ps = computePatterns(load(FORMULA_SET), keys);
    assert.equal(ps.length, 1);
    const p = ps[0]!;
    assert.equal(p.tier, 'formula');
    assert.equal(p.label, 'shared script pattern');
    assert.equal(p.count, 4);
    assert.equal(p.skeleton, 'GREETING>PERSONA>LOCAL_CLAIM>TRADE>OFFER>CTA');
    assert.equal(p.grammarVersion, SKELETON_GRAMMAR_VERSION);
    assert.equal(p.categories.length, 4);
    // The published example is built from slots, never from member text.
    assert.ok(p.example && !/Fairview|Avery|Rowan|Quinn|Emery|roof|lawn|trees|painting/i.test(p.example), p.example ?? '');
  });
  it('never merges tiers: mixed data yields one entry per tier with its own label', () => {
    const ps = computePatterns(load([...EXACT_SET, ...NEAR_SET, ...FORMULA_SET, ...STOP_SET, ...SINGLES]), keys);
    assert.deepEqual(ps.map((p) => p.tier), ['exact', 'near', 'formula']);
    assert.deepEqual(ps.map((p) => p.label), [TIER_LABEL.exact, TIER_LABEL.near, TIER_LABEL.formula]);
  });
  it('pattern IDs are opaque and stable within a grammar version', () => {
    const a = computePatterns(load(FORMULA_SET), keys)[0]!.id;
    const b = computePatterns(load([...FORMULA_SET].reverse()), keys)[0]!.id;
    assert.equal(a, b);
    assert.match(a, /^fv1-[0-9a-f]{12}$/);
  });
});

describe('stop-skeletons', () => {
  it('appointment-reminder style texts share a generic skeleton that must NOT surface', () => {
    const skels = STOP_SET.map(tpl).map(extractSkeleton);
    assert.equal(new Set(skels).size, 1, `fixtures should share one skeleton: ${skels.join(' | ')}`);
    assert.ok(isStopSkeleton(skels[0]!));
    assert.ok(STOP_SET.length >= PATTERN_THRESHOLD);
    assert.equal(computePatterns(load(STOP_SET), keys).length, 0);
  });
  it('short skeletons are suppressed too', () => {
    assert.ok(isStopSkeleton('GREETING>OFFER>CTA'));
    assert.ok(isStopSkeleton(null));
    assert.ok(!isStopSkeleton('GREETING>PERSONA>LOCAL_CLAIM>TRADE>OFFER>CTA'));
  });
});

describe('eligibility', () => {
  it('short-window duplicates (same sender + same template) do not make a pattern', () => {
    const same = EXACT_SET.map((f) => ({ ...f, number: '(214) 555-0101', daysAgo: 0 }));
    assert.equal(computePatterns(load(same), keys).length, 0);
  });
  it('an open private flag removes a pattern from public views pending review', () => {
    const db = load(FORMULA_SET);
    const id = computePatterns(db, keys)[0]!.id;
    db.prepare("INSERT INTO flags(id, created_day, reason, target, details, contact) VALUES ('f1', '2026-11-17', 'inaccurate', ?, '', NULL)").run(id);
    assert.equal(computePatterns(db, keys).length, 0);
  });
});

describe('negative controls (legitimate texts must not cluster with the spam formula)', () => {
  const FORMULA = 'GREETING>PERSONA>LOCAL_CLAIM>TRADE>OFFER>CTA';
  const classes = Object.entries(NEGATIVE_CONTROLS) as Array<[string, string[]]>;
  const all = classes.flatMap(([cls, ms]) => ms.map((m) => ({ cls, m })));
  const skel = (m: string) => {
    const r = scrubMessage(m, {});
    assert.ok('template' in r, `scrub failed for: ${m}`);
    return extractSkeleton(r.template);
  };
  const asFixtures = (ms: string[], from: number): Fixture[] =>
    ms.map((m, i) => ({ number: `(214) 555-01${String(from + i).padStart(2, '0')}`, message: m, category: 'other_home_service', daysAgo: 1 + (i % 5) }));

  it('the corpus covers every required class with enough texts to cross the threshold', () => {
    for (const c of ['quote_followup', 'appointment_reminder', 'delivery_notice', 'home_service_ad']) {
      assert.ok((NEGATIVE_CONTROLS as Record<string, string[]>)[c]!.length >= PATTERN_THRESHOLD, c);
    }
    assert.ok(all.length >= 35);
  });
  it('no negative control produces the spam formula skeleton', () => {
    const hits = all.filter(({ m }) => skel(m) === FORMULA);
    assert.deepEqual(hits, []);
  });
  it('every skeleton that negative controls from two or more classes share is a stop-skeleton', () => {
    const byClass = new Map<string, Set<string>>();
    for (const { cls, m } of all) {
      const s = skel(m);
      if (!s) continue;
      byClass.set(s, (byClass.get(s) ?? new Set()).add(cls));
    }
    const leaking = [...byClass].filter(([s, cs]) => cs.size >= 2 && !isStopSkeleton(s)).map(([s]) => s);
    assert.deepEqual(leaking, []);
  });
  it('the whole corpus surfaces no pattern at all', () => {
    // 37 texts, numbered 0..36 within the 555-01xx fiction range.
    assert.deepEqual(computePatterns(load(asFixtures(all.map((x) => x.m), 0)), keys), []);
  });
  it('mixed with the spam formula set, the formula pattern keeps exactly its 4 members', () => {
    const ps = computePatterns(load([...FORMULA_SET, ...asFixtures(all.map((x) => x.m), 50)]), keys);
    assert.equal(ps.length, 1);
    assert.equal(ps[0]!.tier, 'formula');
    assert.equal(ps[0]!.skeleton, FORMULA);
    assert.equal(ps[0]!.count, FORMULA_SET.length);
  });
  it('false-positive budget: at most 3 of the controls keep a non-stop skeleton, each a different one', () => {
    const live = all.map(({ m }) => skel(m)).filter((s) => !isStopSkeleton(s));
    assert.ok(live.length <= 3, `non-stop skeletons: ${live.join(' | ')}`);
    assert.equal(new Set(live).size, live.length);
  });
});
