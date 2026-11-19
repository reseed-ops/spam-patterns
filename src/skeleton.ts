// Slot skeleton grammar, version 1. Runs ONLY on the masked template, so
// it never sees a name, number, link, or the city as typed.
//
// A skeleton is the ordered list of slots found in the message:
//   GREETING -> PERSONA -> LOCAL_CLAIM -> TRADE -> OFFER -> CTA
// Each slot is placed at its first match; CTA is placed at the end of the
// sentence that carries it. The skeleton string is the formula identity
// within a grammar version. Fewer than 3 slots: the grammar abstains.

import { createHash } from 'node:crypto';
import { MASK } from './scrub.ts';

export const SKELETON_GRAMMAR_VERSION = 'v1';

export const SLOTS = ['GREETING', 'PERSONA', 'LOCAL_CLAIM', 'TRADE', 'OFFER', 'CTA'] as const;
export type Slot = (typeof SLOTS)[number];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const SLOT_RULES: Record<Exclude<Slot, 'CTA'>, { describe: string; patterns: RegExp[] }> = {
  GREETING: {
    describe: 'Opens with a greeting word or addresses the recipient by name.',
    patterns: [
      /^\s*(?:hi|hey|hello|hiya|howdy|greetings|good (?:morning|afternoon|evening|day)|dear)\b/i,
      new RegExp(`^\\s*(?:\\S+\\s+){0,2}${esc(MASK.recipient)}`, 'i'),
    ],
  },
  PERSONA: {
    describe: 'The sender introduces themselves by first name.',
    patterns: [new RegExp(esc(MASK.sender), 'i')],
  },
  LOCAL_CLAIM: {
    describe: 'Claims to be local, or names a city or neighborhood.',
    patterns: [
      new RegExp(`${esc(MASK.city)}|${esc(MASK.place)}`, 'i'),
      /\b(?:in|around) (?:your|the) (?:area|neighbou?rhood|community|subdivision|street)\b/i,
      /\b(?:local|nearby|neighbou?rs?|down the street|in town)\b/i,
    ],
  },
  TRADE: {
    describe: 'Names a home-service trade (roofing, lawn, tree, painting, and so on).',
    patterns: [
      /\b(?:roof(?:s|ing)?|shingles?|gutters?|lawns?|mow(?:ing)?|landscap\w*|yard|trees?|trimming|stumps?|paint(?:ing|er)?|pressure[- ]?wash\w*|power[- ]?wash\w*|windows?|siding|hvac|a\/c|air condition\w*|furnace|plumb\w*|fenc(?:e|es|ing)|solar|pest|termites?|concrete|driveways?|pools?|cleaning|junk removal|remodel\w*|foundation|insulation|garage doors?|deck|patio|handyman|irrigation|sprinklers?)\b/i,
    ],
  },
  OFFER: {
    describe: 'Offers a quote, estimate, discount, or something free.',
    patterns: [
      /\b(?:free|quotes?|estimates?|discount\w*|specials?|deals?|offers?|pric(?:e|es|ing)|inspections?|bids?|no obligation|cash offer)\b|% off/i,
    ],
  },
};

export const CTA_DESCRIBE = 'Asks a question or asks for a reply or call. Placed at the last such sentence.';
const CTA_SIGNAL = /\?|\b(?:reply|text (?:me |us )?back|call (?:me|us)|let me know|interested|give (?:me|us) a (?:call|shout))\b/i;

/**
 * Generic skeletons that ordinary, legitimate texts also produce (realtor
 * check-ins, appointment reminders, "are you still interested?"). They are
 * suppressed from public patterns like stop-words. Any skeleton with fewer
 * than 4 slots is also suppressed.
 */
export const STOP_SKELETONS_V1: readonly string[] = [
  'GREETING>PERSONA>TRADE>CTA', // appointment reminders: "Hi X, this is Y confirming your cleaning. Reply C"
  'GREETING>PERSONA>OFFER>CTA', // sales follow-ups: "Hi X, it's Y, still want that quote?"
  'GREETING>PERSONA>LOCAL_CLAIM>CTA', // realtor check-ins: "Hi X, Y here, a local agent. Thinking of selling?"
  'GREETING>OFFER>TRADE>CTA',
  'PERSONA>TRADE>OFFER>CTA',
  // Added evening 2 from the negative-control corpus (test/negative-controls.ts):
  // each is produced by legitimate texts in two or more control classes.
  'GREETING>PERSONA>TRADE>OFFER>CTA', // contractor quote follow-ups: "Hi X, this is Y with Z Roofing following up on the estimate"
  'GREETING>TRADE>OFFER>CTA', // brand reminders and opt-in ads: "Your free in-home measurement is tomorrow. Reply 1"
  'GREETING>LOCAL_CLAIM>TRADE>OFFER>CTA', // opt-in local ads and HOA/neighbor requests for quotes
];
export const MIN_PATTERN_SLOTS = 4;

export function isStopSkeleton(skeleton: string | null): boolean {
  if (!skeleton) return true;
  if (skeleton.split('>').length < MIN_PATTERN_SLOTS) return true;
  return STOP_SKELETONS_V1.includes(skeleton);
}

export function extractSkeleton(template: string): string | null {
  const found: Array<{ slot: Slot; at: number }> = [];
  for (const slot of ['GREETING', 'PERSONA', 'LOCAL_CLAIM', 'TRADE', 'OFFER'] as const) {
    let best = Infinity;
    for (const re of SLOT_RULES[slot].patterns) {
      const m = re.exec(template);
      if (m && m.index < best) best = m.index;
    }
    if (best !== Infinity) found.push({ slot, at: best });
  }
  // CTA: position = end of the LAST sentence that carries a CTA signal
  // (the closing ask), so a rhetorical question mid-message does not move it.
  const sentences = template.split(/(?<=[.!?\n])\s*/);
  let pos = 0;
  let cta = -1;
  for (const sen of sentences) {
    const idx = template.indexOf(sen, pos);
    if (CTA_SIGNAL.test(sen)) cta = idx + sen.length - 0.5;
    pos = idx + sen.length;
  }
  if (cta >= 0) found.push({ slot: 'CTA', at: cta });
  if (found.length < 3) return null;
  found.sort((a, b) => a.at - b.at || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
  return found.map((f) => f.slot).join('>');
}

export function formulaKey(skeleton: string): string {
  return createHash('sha256').update(`${SKELETON_GRAMMAR_VERSION}:${skeleton}`).digest('hex').slice(0, 16);
}

/** Fully slot-masked example for public display. Built from slot names only, never from member text. */
export const SLOT_EXAMPLE: Record<Slot, string> = {
  GREETING: 'Hi [recipient name],',
  PERSONA: '[sender first name] here.',
  LOCAL_CLAIM: 'I’m working near you in [city].',
  TRADE: 'Do you need any [trade] work done?',
  OFFER: 'I can give you a [free quote / estimate].',
  CTA: '[Question asking for a reply]?',
};

export function renderSkeletonExample(skeleton: string): string {
  return skeleton
    .split('>')
    .map((s) => SLOT_EXAMPLE[s as Slot] ?? '')
    .join(' ');
}

// ---------- near-template similarity (MinHash over masked-token shingles) ----------

export const MINHASH_PERMUTATIONS = 64;
export const SHINGLE_SIZE = 3;
export const NEAR_THRESHOLD = 0.6;

export function maskedTokens(template: string): string[] {
  return template
    .toLowerCase()
    .replace(/\[([^\]]+)\]/g, (_m, inner: string) => ` <${inner.replace(/\W+/g, '_')}> `)
    .replace(/[^\p{L}\p{N}<>_\s']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function shingles(template: string): Set<string> {
  const t = maskedTokens(template);
  const out = new Set<string>();
  if (t.length < SHINGLE_SIZE) {
    if (t.length) out.add(t.join(' '));
    return out;
  }
  for (let i = 0; i + SHINGLE_SIZE <= t.length; i++) out.add(t.slice(i, i + SHINGLE_SIZE).join(' '));
  return out;
}

function fnv1a(s: string, seed: number): number {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // final avalanche (murmur3 fmix32)
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

export function minhash(template: string): number[] {
  const sh = [...shingles(template)];
  const sig: number[] = [];
  for (let p = 0; p < MINHASH_PERMUTATIONS; p++) {
    let min = 0xffffffff;
    for (const s of sh) {
      const h = fnv1a(s, Math.imul(p + 1, 0x9e3779b1) >>> 0);
      if (h < min) min = h;
    }
    sig.push(min);
  }
  return sig;
}

export function similarity(a: number[], b: number[]): number {
  let eq = 0;
  for (let i = 0; i < MINHASH_PERMUTATIONS; i++) if (a[i] === b[i]) eq++;
  return eq / MINHASH_PERMUTATIONS;
}
