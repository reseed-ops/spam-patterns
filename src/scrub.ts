// Deterministic slot masking. This is the ONLY path from submitted text to
// stored text. It is rule-based on purpose: no model output, OCR output, or
// client-side preview is trusted. Spam text is attacker-controlled input.
//
// Order of operations (documented on the methodology page):
//   1. normalize (NFKC, strip invisible/bidi controls, cap length)
//   2. thread reduction: drop phone UI chrome, contact headers, delivery
//      markers, the recipient's own replies, and other conversations;
//      keep a single message
//   3. reporter removals (text the reporter chose to remove at review)
//   4. emails, URLs, phone numbers, then every remaining digit run
//   5. greeting-name slot, persona slot, city named in the message, places
//   6. street names (with or without a house number), then any capitalized
//      word that is not a common word: mid-sentence, sentence-initial, or
//      in capitals (all-caps names)
// The result is the stored template. It is never shown publicly.

import { ACRONYMS, COMMON_WORDS } from './commonwords.ts';

/**
 * Redaction rules version: everything in this file that turns submitted text
 * into the stored template (thread reduction, masks, common-word and acronym
 * lists). Bump it when scrubbing behavior changes (docs/rules-changelog.md).
 */
export const REDACTION_RULES_VERSION = 'v1';

export const MASK = {
  recipient: '[recipient name removed]',
  sender: '[sender name removed]',
  name: '[name removed]',
  city: '[city named in message]',
  place: '[place removed]',
  phone: '[phone number removed]',
  number: '[number removed]',
  email: '[email removed]',
  link: '[link removed]',
  reporter: '[removed by you]',
} as const;

export const MAX_MESSAGE_CHARS = 4000; // raw paste, including thread chrome
export const MAX_TEMPLATE_CHARS = 1200; // single message after reduction
export const MAX_REMOVALS = 20;
export const MAX_REMOVAL_CHARS = 200;

export type ScrubNoteKind =
  | 'thread_reduced'
  | 'chrome_removed'
  | 'header_removed'
  | 'replies_removed'
  | 'reporter_removed'
  | 'email'
  | 'link'
  | 'phone'
  | 'number'
  | 'recipient_name'
  | 'sender_name'
  | 'city'
  | 'place'
  | 'name';

export const NOTE_TEXT: Record<ScrubNoteKind, string> = {
  thread_reduced: 'We kept one message from the thread. Other messages were removed.',
  chrome_removed: 'Phone screen labels such as times and delivery status were removed.',
  header_removed: 'The conversation header (contact name or number) was removed.',
  replies_removed: 'Replies that looked like yours were removed.',
  reporter_removed: 'Text you chose to remove was removed.',
  email: 'Email addresses were removed.',
  link: 'Links were removed.',
  phone: 'Phone numbers in the message were removed.',
  number: 'Other numbers were removed.',
  recipient_name: 'The name in the greeting was removed.',
  sender_name: 'The sender’s first name was removed.',
  city: 'The city you entered was masked in the message.',
  place: 'Other place names were removed.',
  name: 'Other capitalized words that may be names were removed.',
};

// nothing_left: masking left too little real text to keep.
// unsafe_residue: real text is left, but a digit or @ survived masking (often
// a stray glyph a screenshot reader added), so the text cannot be verified.
export type ScrubError = 'empty' | 'too_long' | 'nothing_left' | 'unsafe_residue' | 'bad_removals';

export interface ScrubResult {
  template: string;
  notes: ScrubNoteKind[];
}

// ---------- 1. normalize ----------

const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F­​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

export function normalizeText(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[ \t ]+/g, ' ');
}

// ---------- 2. thread reduction ----------

const DAY = '(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|nesday|rsday|urday)?';
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const TIME = '\\d{1,2}:\\d{2}(?:\\s?[ap]\\.?m\\.?)?';

const CHROME_LINE: RegExp[] = [
  new RegExp(`^${TIME}$`, 'i'), // status-bar clock
  /^(?:[|.il1!]{1,4}\s*)?(?:lte|5g|4g|3g|5ge|wi-?fi|e|h\+?|sos|no service)(?:\s+\d{1,3}\s?%)?$/i,
  /^\d{1,3}\s?%$/,
  /^(?:text message|imessage|sms|mms|rcs(?: message)?|chat|rcs chat|text message\s*·\s*sms)$/i,
  /^(?:sms|rcs|text message|imessage)\b.*\b(?:today|yesterday|\d{1,2}:\d{2})/i,
  new RegExp(`^(?:today|yesterday|${DAY})\\b[ ,]*(?:at\\s+)?${TIME}$`, 'i'),
  new RegExp(`^(?:${DAY},?\\s+)?${MONTH}\\s+\\d{1,2}(?:,?\\s+\\d{4})?(?:,?\\s+(?:at\\s+)?${TIME})?$`, 'i'),
  /^\d{1,2}\/\d{1,2}\/\d{2,4}(?:,?\s+\S+)?$/,
  /^(?:delivered|read|sent|seen|not delivered|sending\.*)(?:\s+.*)?$/i,
  /^(?:<\s*)?(?:back|messages|details|info|edit|done|cancel)$/i,
  /^(?:<\s*)?\d{1,4}$/, // unread badge next to a back arrow
  /^(?:report junk|delete and report junk|report spam|block(?: number| this caller)?|add to contacts?|not junk|mark as not spam|block & report spam)$/i,
  /^(?:this|the) sender is not in your contact list\.?(?:\s*report junk)?$/i,
  /^(?:if you did not expect this message.*|tap to load preview|this message has links? .*)$/i,
  /^(?:to|from)\s*:?\s*$/i,
  /^(?:text|imessage|message|rcs message|type a message|text message)\.{0,3}$/i,
];

// A line that ends with a clock time is a conversation-list row (another
// conversation visible in the screenshot) or a timestamp: a boundary.
const ENDS_WITH_TIME = new RegExp(`\\s${TIME}$|\\s(?:yesterday|${DAY})$`, 'i');

const REPLY_PREFIX = /^(?:me|you|i said|my reply|reply)\s*[:>-]/i;
const REPLY_LINE = /^(?:stop(?:\s*all)?|unsubscribe|end|quit|cancel|remove me|wrong number\.?|who is this\??|who's this\??|not interested\.?|no thanks?\.?|no thank you\.?|nope\.?|leave me alone\.?|how did you get (?:this|my) number\??|do not text me\.?|don't text me\.?)$/i;

function isChrome(line: string): boolean {
  return CHROME_LINE.some((r) => r.test(line));
}

function looksLikeHeader(line: string): boolean {
  // Contact name or number at the top of a thread: short, no sentence
  // punctuation. Saved contact names are personal data; so is the number.
  if (/^(?:maybe:|to:|from:|~)/i.test(line)) return true;
  if (/^[+\d\s().\-]{7,}$/.test(line)) return true;
  if (line.length > 40) return false;
  if (/[.!?,:;]$/.test(line)) return false;
  const words = line.split(/\s+/);
  return words.length <= 4 && words.every((w) => /^[\p{L}'’.\-&()]+$/u.test(w));
}

interface ThreadResult {
  text: string;
  notes: ScrubNoteKind[];
}

export function reduceThread(input: string): ThreadResult {
  const notes = new Set<ScrubNoteKind>();
  const lines = input.split('\n').map((l) => l.trim());
  type Seg = { lines: string[] };
  const segs: Seg[] = [{ lines: [] }];
  let seenBody = false;
  let leadingHeaderZone = true;

  const cur = (): Seg => segs[segs.length - 1]!;
  const boundary = () => {
    if (cur().lines.length > 0) segs.push({ lines: [] });
  };

  for (const line of lines) {
    if (line === '') {
      if (cur().lines.length > 0) cur().lines.push('');
      continue;
    }
    if (isChrome(line)) {
      notes.add('chrome_removed');
      boundary();
      continue;
    }
    if (REPLY_PREFIX.test(line) || REPLY_LINE.test(line)) {
      notes.add('replies_removed');
      boundary();
      continue;
    }
    if (ENDS_WITH_TIME.test(line) && line.split(/\s+/).length <= 8) {
      // "Mom 9:12 AM" (conversation list) or "Jake  Yesterday": boundary.
      notes.add('chrome_removed');
      boundary();
      leadingHeaderZone = true;
      continue;
    }
    if (/…$|\.\.\.$/.test(line) && line.length < 80 && !seenBody) {
      // Truncated preview from a conversation list: belongs to another thread.
      notes.add('thread_reduced');
      boundary();
      continue;
    }
    if (leadingHeaderZone && cur().lines.length === 0 && looksLikeHeader(line)) {
      notes.add('header_removed');
      continue;
    }
    leadingHeaderZone = false;
    seenBody = true;
    cur().lines.push(line);
  }

  const texts = segs
    .map((s) => s.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim())
    .filter((t) => t.length > 0);
  if (texts.length === 0) return { text: '', notes: [...notes] };
  // Keep the single longest segment: the spam is the substantive inbound
  // message; replies and other conversations are short. Ties keep the first.
  let best = texts[0]!;
  for (const t of texts) if (t.length > best.length) best = t;
  if (texts.length > 1) notes.add('thread_reduced');
  return { text: best, notes: [...notes] };
}

// ---------- 4. contact data and digits ----------

const DOT = '(?:\\.|\\[\\.\\]|\\(\\.\\)|\\s?\\(dot\\)\\s?|\\s?\\[dot\\]\\s?|\\s+dot\\s+)';
const EMAIL = new RegExp(`[\\p{L}\\p{N}._%+\\-]+(?:@|\\s?\\(at\\)\\s?|\\s?\\[at\\]\\s?|\\s+at\\s+(?=(?:gmail|yahoo|outlook|hotmail|icloud|aol|proton|protonmail|live|msn|comcast)${DOT}))[\\p{L}\\p{N}\\-]+(?:${DOT}[\\p{L}\\p{N}\\-]+)+`, 'giu');
const URL_SCHEME = /\b(?:https?:\/\/|hxxps?:\/\/|www\.)[^\s<>"]+/gi;
const TLD = '(?:com|net|org|io|co|us|biz|info|me|ly|app|xyz|site|online|link|top|club|live|shop|store|page|ai|gl|gg|to|cc|tv|ws|sh|in|vip|pro|cloud|click|services|homes|house|work|email|tech|tk|ml|ga|cf|ru|cn)';
const URL_BARE = new RegExp(`\\b[\\p{L}\\p{N}](?:[\\p{L}\\p{N}\\-]*[\\p{L}\\p{N}])?(?:${DOT}[\\p{L}\\p{N}\\-]+)*${DOT}${TLD}\\b(?:\\/[^\\s<>"]*)?`, 'giu');
const PHONE = /(?:\+?1[\s.\-]?)?\(?\b\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g;
const DIGITS = /[$€£]?\d(?:[\d,.:/\-]*\d)?(?:\s?%)?/g;
const SPELLED = '(?:zero|one|two|three|four|five|six|seven|eight|nine|oh|cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)';
const SPELLED_DIGITS = new RegExp(`\\b(?:${SPELLED}[\\s\\-,]+){6,}${SPELLED}\\b`, 'gi');

function maskAll(s: string, re: RegExp, mask: string, onHit: () => void): string {
  return s.replace(re, () => {
    onHit();
    return mask;
  });
}

// ---------- 5. names, places ----------

const GREETING = /^(?:hi|hey|hello|hiya|howdy|yo|greetings|good\s+(?:morning|afternoon|evening|day)|dear|attn:?|attention:?|hola|buen[oa]s\s+(?:d[ií]as|tardes|noches)|buenas|estimad[oa]|querid[oa]|saludos)(?![\p{L}])/iu;
// Greeting addressees that are never names ("Hi there,", "Hola vecino,").
const ADDRESSEE = new Set(
  (
    'there neighbor neighbour neighbors neighbours friend friends homeowner homeowners all everyone folks sir madam maam ma\'am team again ' +
    'vecino vecina vecinos vecinas amigo amiga amigos amigas todos todas'
  ).split(/\s+/),
);
// Ordinary words that end the greeting-name scan, unless the word is
// directly followed by a comma or "!" ("Hi Hope," / "Hi Will!" are names).
const NOT_A_NAME = new Set(
  (
    'how are you hope just is this it its it\'s we i i\'m im quick my our a an the and so me there\'s happy sorry from with ' +
    'good great am was me soy le les mi su que como cómo'
  ).split(/\s+/),
);
const TITLES = /^(?:mr|mrs|ms|miss|dr|mx|sr|sra|srta|señor|señora|señorita|don|doña)\.?$/i;
const PERSONA = /(?<![\p{L}])([Tt]his is|[Ii]t's|[Ii]t is|[Mm]y name is|[Mm]y name's|[Nn]ame's|I'm|I am|[Ii]m|[Ss]oy|[Mm]e llamo|[Mm]i nombre es|[Ll]es? habla)\s+(?:your\s+(?:neighbor|neighbour|local)\s+)?(\p{Lu}[\p{L}'\-]+)(?![\p{L}])/gu;
const PERSONA_HERE = /(^|[.!?,;:\]]\s*|\n)([A-Z][\p{L}'\-]+)\s+(here)\b/gu;
const PERSONA_WITH = /(^|[.!?,;:\]]\s*|\n)([A-Z][\p{L}'\-]+)\s+((?:from|with)\s+(?:the\s+)?[A-Z\[])/gu;

// Words allowed to keep their capital letter mid-sentence.
const ALLOWED_CAPS = new Set(
  (
    'I I\'m I\'ll I\'d I\'ve OK Ok Okay US USA U.S. AC A/C HVAC LLC Inc Co FREE Free STOP Stop Reply YES Yes NO No ' +
    'Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August ' +
    'September October November December Mon Tue Wed Thu Fri Sat Sun Jan Feb Mar Apr Jun Jul Aug Sep Sept Oct Nov Dec ' +
    'Spring Summer Fall Autumn Winter Christmas Thanksgiving Memorial Labor Independence Day Black Friday Holiday Holidays ' +
    'Roofing Roof Lawn Landscaping Tree Trees Gutter Gutters Painting Paint Pressure Washing Window Windows Siding Plumbing ' +
    'Fence Fencing Solar Pest Control Cleaning Concrete Driveway Pool Remodeling Foundation Insulation Garage Door Doors ' +
    'Service Services Quote Estimate Estimates Inspection Repair Repairs Home Homes House Real Estate Cash Offer Offers ' +
    'Text Call Msg Txt SMS Thanks Thank Please Hi Hey Hello Dear Sincerely Best Regards'
  ).split(/\s+/),
);
const ALLOWED_CAPS_LOWER = new Set([...ALLOWED_CAPS].map((w) => w.toLowerCase()));
const SENTENCE_START_VOCATIVE_OK = new Set(
  'Yes No Hey Hi Hello Thanks Also However Well Sorry Again Please Ok Okay Now So Plus Today Tomorrow Tonight Reminder Note Attention Congrats Congratulations Great Good Quick Just Hola Saludos Gracias Buenas Buenos Estimado Estimada'.split(
    ' ',
  ),
);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskGreetingName(s: string, hit: () => void): string {
  const m = GREETING.exec(s);
  if (!m) return s;
  let i = m[0].length;
  // separators after the greeting word
  const rest = s.slice(i);
  const sep = /^[\s,!.:\-]*/.exec(rest)![0];
  i += sep.length;
  const tail = s.slice(i);
  const tokRe = /^([\p{L}][\p{L}'’\-.]*)(\s+)?/u;
  let consumed = 0;
  let count = 0;
  let pos = 0;
  while (count < 3) {
    const t = tokRe.exec(tail.slice(pos));
    if (!t) break;
    const word = t[1]!.replace(/[.]$/, '');
    const lw = word.toLowerCase();
    if (ADDRESSEE.has(lw)) break;
    const directlyAfter = tail.slice(pos + t[1]!.length);
    if (NOT_A_NAME.has(lw) && !TITLES.test(word) && !/^[,!]/.test(directlyAfter)) break;
    count++;
    pos += t[0].length;
    consumed = pos - (t[2]?.length ?? 0);
    const after = tail.slice(consumed);
    if (/^\s*[,!.:;\-—]/.test(after) || after.trim() === '' || /^\s*\n/.test(after)) break;
    if (!t[2]) break;
  }
  if (count === 0) return s;
  const after = tail.slice(consumed);
  const endsOk =
    /^\s*[,!.:;\-—\n]/.test(after) ||
    after.trim() === '' ||
    /^\s+(?:this|it'?s|it|my|i'?m|i|im|we|hope|just|from)\b/i.test(after);
  if (!endsOk) return s;
  hit();
  return s.slice(0, i) + MASK.recipient + after;
}

function maskVocative(s: string, hit: () => void): string {
  // "Sarah, your roof ..." at the start of any sentence.
  return s.replace(/(^|[.!?]\s+|\n)([A-Z][\p{L}'\-]+)(?=\s*,)/gu, (all, pre: string, word: string) => {
    if (SENTENCE_START_VOCATIVE_OK.has(word) || ALLOWED_CAPS.has(word)) return all;
    hit();
    return pre + MASK.recipient;
  });
}

function maskPersona(s: string, hit: () => void): string {
  let out = s.replace(PERSONA, (all, lead: string, name: string) => {
    if (ALLOWED_CAPS.has(name) || NOT_A_NAME.has(name.toLowerCase())) return all;
    hit();
    return all.slice(0, all.length - name.length) + MASK.sender;
  });
  out = out.replace(PERSONA_HERE, (all, pre: string, name: string, here: string) => {
    if (ALLOWED_CAPS.has(name) || NOT_A_NAME.has(name.toLowerCase())) return all;
    hit();
    return `${pre}${MASK.sender} ${here}`;
  });
  // "Jake with Lone Star Roofing" / "Jake from the Ridge Crew" at a sentence start.
  out = out.replace(PERSONA_WITH, (all, pre: string, name: string, rest: string) => {
    if (ALLOWED_CAPS.has(name) || SENTENCE_START_VOCATIVE_OK.has(name) || NOT_A_NAME.has(name.toLowerCase())) return all;
    hit();
    return `${pre}${MASK.sender} ${rest}`;
  });
  return out;
}

function maskCity(s: string, city: string | null, hit: () => void): string {
  if (!city) return s;
  const re = new RegExp(`(?<![\\p{L}])${escapeRe(city).replace(/\s+/g, '\\s+')}(?![\\p{L}])`, 'giu');
  return s.replace(re, () => {
    hit();
    return MASK.city;
  });
}

const PLACE = /\b(in|around|near|serving|throughout|across|outside|by|over in|out in|out by|near by|nearby)\s+((?:[A-Z][\p{L}'\-]+)(?:\s+[A-Z][\p{L}'\-]+){0,2})(?:,?\s+(?:[A-Z]{2})\b)?/gu;

function maskPlaces(s: string, hit: () => void): string {
  return s.replace(PLACE, (all, prep: string, place: string) => {
    const words = place.split(/\s+/);
    if (words.every((w) => ALLOWED_CAPS.has(w))) return all;
    hit();
    return `${prep} ${MASK.place}`;
  });
}

// Street names, with or without a house number: "on Larkspur Lane",
// "on larkspur ln", "[number removed] Oak Ct", "la calle Robles".
const STREET_SUFFIX =
  '(?:street|st|lane|ln|drive|dr|road|rd|avenue|ave|av|boulevard|blvd|court|ct|circle|cir|way|trail|trl|place|pl|parkway|pkwy|terrace|ter|highway|hwy|loop|pike|crossing|xing|row|path|hollow|bend|cove|run)';
const STREET_AFTER = new RegExp(
  `(\\b(?:on|at|off|along|near|by|down|up|from|to|onto|past|in)\\s+|\\[number removed\\]\\s+)((?:[\\p{L}'’\\-]+\\s+){1,3}?)${STREET_SUFFIX}(?![\\p{L}])`,
  'giu',
);
const STREET_BEFORE = /\b(calle|avenida|camino|carretera)\s+(?:de\s+(?:la\s+|los\s+|las\s+)?)?([\p{L}'’\-]+)(?:\s+(\p{Lu}[\p{L}'’\-]+))?/giu;

function maskStreets(s: string, hit: () => void): string {
  let out = s.replace(STREET_AFTER, (all, lead: string, words: string) => {
    const ws = words.trim().split(/\s+/);
    if (ws.every((w) => COMMON_WORDS.has(w.toLowerCase()))) return all; // "on the way", "down the road"
    hit();
    return `${lead}${MASK.place}`;
  });
  out = out.replace(STREET_BEFORE, (all, kind: string) => {
    hit();
    return `${kind} ${MASK.place}`;
  });
  return out;
}

function isKnownWord(word: string): boolean {
  const lw = word.toLowerCase().replace(/['’]s$/, '');
  if (COMMON_WORDS.has(lw) || ALLOWED_CAPS_LOWER.has(lw)) return true;
  // hyphenated words ("Sign-in", "No-obligation") are known if every part is
  return lw.includes('-') && lw.split('-').every((p) => p === '' || COMMON_WORDS.has(p) || ALLOWED_CAPS_LOWER.has(p));
}

function maskRemainingCaps(s: string, hit: () => void): string {
  // Any capitalized word that may be a name is masked:
  //   - mid-sentence: unless on the ALLOWED_CAPS list;
  //   - at a sentence start: unless it is a common word ("Marisol your roof"
  //     is masked, "Your roof" is not);
  //   - in capitals ("CALL DMITRI"): unless a common word or a known acronym.
  // Over-masking is the intended failure direction.
  return s.replace(
    /(\[[^\]]*\])|(?<![\p{L}'’\-])(\p{Lu}[\p{L}'’\-]*)(?![\p{L}])/gu,
    (all, mask: string | undefined, word: string | undefined, offset: number) => {
      if (mask || !word) return all; // existing masks stay intact
      const letters = word.replace(/[^\p{L}]/gu, '');
      if (letters.length < 2) return all; // "I", "A", "Reply C"
      if (letters === letters.toUpperCase()) {
        if (ACRONYMS.has(letters) || ALLOWED_CAPS.has(word) || isKnownWord(word)) return all;
        hit();
        return MASK.name;
      }
      const before = s.slice(0, offset);
      const sentenceStart = before.trim() === '' || /(?:[.!?]\s*|:\s+|\n\s*)["'(¿¡]?\s*$/.test(before) || /[¿¡]$/.test(before);
      if (sentenceStart) {
        if (SENTENCE_START_VOCATIVE_OK.has(word) || isKnownWord(word)) return all;
        hit();
        return MASK.name;
      }
      if (ALLOWED_CAPS.has(word)) return all;
      hit();
      return MASK.name;
    },
  );
}

function collapseMasks(s: string): string {
  let prev = '';
  let out = s;
  while (prev !== out) {
    prev = out;
    for (const m of Object.values(MASK)) {
      const re = new RegExp(`${escapeRe(m)}(?:[\\s,&'’\\-]+(?:and\\s+)?${escapeRe(m)})+`, 'g');
      out = out.replace(re, m);
    }
  }
  return out;
}

// ---------- entry point ----------

export interface ScrubOptions {
  city?: string | null;
  removals?: string[];
}

export function scrubMessage(raw: unknown, opts: ScrubOptions = {}): ScrubResult | { error: ScrubError } {
  if (typeof raw !== 'string' || raw.trim() === '') return { error: 'empty' };
  if (raw.length > MAX_MESSAGE_CHARS) return { error: 'too_long' };
  const removals = opts.removals ?? [];
  if (
    !Array.isArray(removals) ||
    removals.length > MAX_REMOVALS ||
    removals.some((r) => typeof r !== 'string' || r.length > MAX_REMOVAL_CHARS)
  ) {
    return { error: 'bad_removals' };
  }

  const notes = new Set<ScrubNoteKind>();
  const thread = reduceThread(normalizeText(raw));
  thread.notes.forEach((n) => notes.add(n));
  let s = thread.text;
  if (s.length > MAX_TEMPLATE_CHARS) return { error: 'too_long' };

  // 3. reporter removals (applied to the reduced message)
  for (const r of removals) {
    const needle = normalizeText(r).trim();
    if (needle.length < 2) continue;
    const re = new RegExp(escapeRe(needle).replace(/\s+/g, '\\s+'), 'gi');
    s = maskAll(s, re, MASK.reporter, () => notes.add('reporter_removed'));
  }

  // 4. contact data and digits
  s = maskAll(s, EMAIL, MASK.email, () => notes.add('email'));
  s = maskAll(s, URL_SCHEME, MASK.link, () => notes.add('link'));
  s = maskAll(s, URL_BARE, MASK.link, () => notes.add('link'));
  s = maskAll(s, PHONE, MASK.phone, () => notes.add('phone'));
  s = maskAll(s, SPELLED_DIGITS, MASK.phone, () => notes.add('phone'));
  s = maskAll(s, DIGITS, MASK.number, () => notes.add('number'));

  // 5. slots
  const city = opts.city ? normalizeText(opts.city).trim() : null;
  s = maskCity(s, city, () => notes.add('city'));
  s = maskGreetingName(s, () => notes.add('recipient_name'));
  s = maskVocative(s, () => notes.add('recipient_name'));
  s = maskPersona(s, () => notes.add('sender_name'));
  s = maskPlaces(s, () => notes.add('place'));

  s = s.replace(/\b(?:Mr|Mrs|Ms|Miss|Dr|Mx|Sr|Sra|Srta|Señor|Señora|Señorita|Don|Doña)\.?\s+\p{Lu}[\p{L}'\-]+/gu, () => {
    notes.add('name');
    return MASK.name;
  });

  // 6. street names, then anything else that looks like a proper name
  s = maskStreets(s, () => notes.add('place'));
  s = maskRemainingCaps(s, () => notes.add('name'));

  s = collapseMasks(s)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();

  // Fail closed: nothing left but masks and punctuation means nothing safe to keep.
  const residue = s.replace(/\[[^\]]+\]/g, '').replace(/[\s\p{P}\p{S}]/gu, '');
  if (residue.length < 3) return { error: 'nothing_left' };
  // Defense in depth: no digit or @ may survive into storage. This is a
  // separate error: there is text worth keeping, but part of it is unverified.
  if (/[\d@]/.test(s.replace(/\[[^\]]+\]/g, ''))) return { error: 'unsafe_residue' };

  return { template: s, notes: [...notes] };
}

/** Canonical form used for the exact-template tier. */
export function canonicalTemplate(template: string): string {
  return template.toLowerCase().replace(/\s+/g, ' ').replace(/\s*([,.!?;:])\s*/g, '$1 ').trim();
}
