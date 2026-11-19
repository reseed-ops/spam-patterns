// Screenshot text extraction (v0.1.1 OCR fix). The fixtures are SYNTHETIC
// OCR output in the shape of real phone screenshots: messaging-app chrome,
// a header holding the sender number, and one message. Numbers use the
// fictional 555-01XX range; names and places are invented.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';
import { allAreaCodes } from '../src/areacodes.ts';
import { scrubMessage } from '../src/scrub.ts';

interface Extracted { number: string; numberVia: string; message: string }
interface Api {
  extract(text: string, opts?: { isValidNpa?: (npa: string) => boolean }): Extracted;
  isChrome(line: string): boolean;
  isChipLine(line: string): boolean;
  isSymbolSoup(line: string): boolean;
  splitMerged(line: string): string[];
  isTextingWithHeader(line: string): boolean;
  assembleDetected(r: Array<{ rawValue: string; boundingBox: { x: number; y: number; width: number; height: number } }>): string;
}

const sandbox: { window: { STMExtract?: Api } } = { window: {} };
vm.runInNewContext(readFileSync(new URL('../public/static/js/ocr-extract.js', import.meta.url), 'utf8'), sandbox);
const X = sandbox.window.STMExtract!;
const NPAS = new Set(allAreaCodes().map((a) => a.code));
const isValidNpa = (npa: string) => NPAS.has(npa);
const extract = (t: string) => X.extract(t, { isValidNpa });
const split = (l: string): string[] => Array.from(X.splitMerged(l)); // copy out of the vm realm

// Chrome that must never reach the message.
const CHROME_BITS = /Report spam|Add contact|Saving this number|Save \(|Texting with|SMS\/MMS|RCS messaging|Thursday|Wednesday|9:47|2:15|10:03|Text Message|Report Junk|contact list|87%/i;

describe('OCR extraction: Android Messages screenshot (number in the "Texting with" header)', () => {
  const ocr = [
    '9:47 © M @ ¥ 87%',
    '€  (4l2) 555-0l42  &  :', // app bar, number garbled by OCR
    'Save (412) 555-0142?',
    'Saving this number will add a new contact',
    'Add contact  Report spam',
    'Texting with (412) 555-0142 (SMS/MMS)',
    'Thursday',
    '9:47 AM',
    "Hi Jordan, Riley here with a local gutter team! We're in",
    'Fairview helping neighbors with gutter cleaning and',
    'repairs. Want a free quote?',
    '9:47 AM',
    'RCS messaging',
    '© Text message ©',
  ].join('\n');
  const r = extract(ocr);
  it('finds the sender number by the full-text fallback, normalized to 10 digits', () => {
    assert.equal(r.number, '4125550142');
    assert.equal(r.numberVia, 'texting-with');
  });
  it('keeps the message intact', () => {
    assert.equal(r.message, "Hi Jordan, Riley here with a local gutter team! We're in Fairview helping neighbors with gutter cleaning and repairs. Want a free quote?");
  });
  it('drops every chrome line', () => assert.doesNotMatch(r.message, CHROME_BITS));
  it('without a usable header the full-text scan still finds the number', () => {
    const noHeader = ocr.replace('Texting with (412) 555-0142 (SMS/MMS)', '');
    const r2 = extract(noHeader);
    assert.equal(r2.number, '4125550142');
    assert.equal(r2.numberVia, 'frequency');
    assert.doesNotMatch(r2.message, CHROME_BITS);
    assert.match(r2.message, /^Hi Jordan, Riley here .* Want a free quote\?$/);
  });
});

describe('OCR extraction: number only in the message body', () => {
  const ocr = [
    'Wednesday • 2:15 PM',
    'Hello, this is Sam with Hometown Roofing. Storm season is',
    'here. Text us back at 469-555-0177 for a free inspection.',
    'Reply STOP to opt out',
    '2:15 PM',
    'Text message',
  ].join('\n');
  const r = extract(ocr);
  it('finds the number in the body', () => {
    assert.equal(r.number, '4695550177');
    assert.equal(r.numberVia, 'frequency');
  });
  it('keeps the message, including the body number (the scrubber masks it later)', () => {
    assert.equal(r.message, 'Hello, this is Sam with Hometown Roofing. Storm season is here. Text us back at 469-555-0177 for a free inspection.\nReply STOP to opt out');
  });
  it('drops the chrome', () => assert.doesNotMatch(r.message, CHROME_BITS));
});

describe('OCR extraction: iOS Messages screenshot', () => {
  const ocr = [
    '9:41 ..ll 5G ■',
    '< 3',
    '(214) 555-0109 >',
    'Text Message • SMS',
    'Today 10:03 AM',
    'Hi there, Avery here. I have been helping a few',
    'neighbors over in Fairview lately. Is your roof due',
    'for a look?',
    'The sender is not in your contact list.',
    'Report Junk',
    'Text Message',
  ].join('\n');
  const r = extract(ocr);
  it('finds the header number', () => {
    assert.equal(r.number, '2145550109');
    assert.equal(r.numberVia, 'header');
  });
  it('keeps the message intact and drops the chrome', () => {
    assert.equal(r.message, 'Hi there, Avery here. I have been helping a few neighbors over in Fairview lately. Is your roof due for a look?');
    assert.doesNotMatch(r.message, CHROME_BITS);
  });
});

describe('OCR extraction: number selection rules', () => {
  it('prefers the "Texting with" number over a more frequent body number', () => {
    const r = extract(['Texting with (512) 555-0101 (SMS/MMS)', 'Call 737-555-0188 now, again 737-555-0188, or 737-555-0188 today'].join('\n'));
    assert.equal(r.number, '5125550101');
  });
  it('picks the most frequent valid candidate', () => {
    const r = extract(['Save (512) 555-0101?', 'Our office: 737-555-0188. Call (512) 555-0101 to book a cleaning visit'].join('\n'));
    assert.equal(r.number, '5125550101');
  });
  it('rejects candidates whose area code is not in the NANPA table', () => {
    assert.ok(!NPAS.has('999'));
    const r = extract(['(999) 555-0101 (999) 555-0101 (999) 555-0101', 'We clean ducts. Reach us at 737-555-0188 for pricing.'].join('\n'));
    assert.equal(r.number, '7375550188');
    assert.equal(extract('Text 999-555-0101 for your free gutter quote today').number, '');
  });
  it('rejects N11 area codes and prefixes, and digits embedded in longer runs', () => {
    assert.equal(extract('Order 4125550142999 ships soon. Track it online today.').number, '');
    assert.equal(extract('Reach us at 512-411-0101 for your free estimate today').number, '');
  });
  it('accepts the common formats', () => {
    for (const f of ['(412) 555-0142', '412-555-0142', '412.555.0142', '412 555 0142', '4125550142', '+1 (412) 555-0142', '1-412-555-0142']) {
      assert.equal(extract(`Call ${f} today for a free roof estimate`).number, '4125550142', f);
    }
  });
  it('a garbled header with an invalid area code falls through to the fallback', () => {
    const r = extract(['(999) 555-0142', 'Texting with (412) 555-0142 (SMS/MMS)', 'Hi, we are offering free roof inspections this week.'].join('\n'));
    assert.equal(r.number, '4125550142');
  });
});

describe('OCR extraction: message start anchoring', () => {
  it('the message starts after the "Texting with" header', () => {
    const r = extract(['Riley Gutters', 'Some banner text the reader saw', 'Texting with (412) 555-0142 (SMS/MMS)', 'Hi, we are offering free gutter cleaning this week.'].join('\n'));
    assert.equal(r.message, 'Hi, we are offering free gutter cleaning this week.');
  });
  it('does not anchor when nothing but chrome follows the header', () => {
    const r = extract(['Hi, we are offering free gutter cleaning this week.', 'Texting with (412) 555-0142 (SMS/MMS)', '9:47 AM'].join('\n'));
    assert.equal(r.message, 'Hi, we are offering free gutter cleaning this week.');
  });
  it('a message line that merely starts with "Texting with" is not a header', () => {
    assert.equal(X.isTextingWithHeader('Texting with you is easier than calling, right?'), false);
    const r = extract(['Hi neighbor, quick note about your yard.', 'Texting with you is easier than calling, right?'].join('\n'));
    assert.equal(r.message, 'Hi neighbor, quick note about your yard.\nTexting with you is easier than calling, right?');
  });
});

describe('OCR extraction: chrome-line patterns', () => {
  const chrome = [
    'Report spam', 'Add contact', 'Block', 'Block number', 'Add contact Report spam', 'Add contact | Block | Report spam', 'Report Junk',
    'Saving this number will add a new contact', 'Saving this number will add a new contact.',
    'Save (412) 555-0142?', 'Save 412-555-0142?', 'Save +1 412 555 0142 ?',
    'Thursday', 'Monday', 'Today', 'Yesterday', 'SUNDAY', 'Thursday • 9:47 AM', 'Today 10:03 AM',
    '9:47 AM', '9:47', '12:05 pm', '9:47 a.m.',
    'Texting with (412) 555-0142 (SMS/MMS)', 'Texting with Riley (RCS)', '© Texting with (412) 555-0142 (SMS/MMS) ©',
    'RCS messaging', 'SMS/MMS', 'SMS', 'Text message', 'Text Message • SMS', 'RCS message', 'iMessage',
    'The sender is not in your contact list.',
    '9:47 © M @ ¥ 87%', '9:41 ..ll 5G ■', '10:15 LTE 54%', '© ® ©', '< 3',
  ];
  for (const l of chrome) it(`drops ${JSON.stringify(l)}`, () => assert.equal(X.isChrome(l), true));

  const keep = [
    'Block party this Saturday at the park!', 'Report spam texts to 7726', 'Add contact info to your profile today',
    'Save 20% on your first cleaning?', 'Save now', 'Saving this number for later?',
    'today', 'Thursday works for us?', 'See you Thursday!', 'Today only: half off gutter guards',
    '10:00 ok', '9:30 tomorrow works?', 'Call 9:30 to 5', 'Texting with you is easier than calling, right?',
    'SMS alerts are available', 'text message us anytime for a quote', 'Hi Jordan, this is Riley.', '',
  ];
  for (const l of keep) it(`keeps ${JSON.stringify(l)}`, () => assert.equal(X.isChrome(l), false));
});

describe('OCR extraction: TextDetector output assembly', () => {
  const box = (x: number, y: number, w = 100, h = 20) => ({ x, y, width: w, height: h });
  it('orders detections top to bottom, then left to right within a row', () => {
    const text = X.assembleDetected([
      { rawValue: 'Report spam', boundingBox: box(220, 300) },
      { rawValue: 'Texting with (412) 555-0142 (SMS/MMS)', boundingBox: box(40, 400, 340) },
      { rawValue: 'Add contact', boundingBox: box(20, 302) },
      { rawValue: 'Hi, we are offering free gutter cleaning', boundingBox: box(30, 500, 300) },
      { rawValue: 'this week.', boundingBox: box(30, 525) },
      { rawValue: '', boundingBox: box(0, 0) },
    ]);
    assert.equal(text, 'Add contact Report spam\nTexting with (412) 555-0142 (SMS/MMS)\nHi, we are offering free gutter cleaning\nthis week.');
    const r = extract(text);
    assert.equal(r.number, '4125550142');
    assert.equal(r.message, 'Hi, we are offering free gutter cleaning this week.');
  });
  it('handles empty or missing results', () => {
    assert.equal(X.assembleDetected([]), '');
    assert.equal(X.assembleDetected(undefined as never), '');
  });
});

describe('OCR extraction: sender-only lines', () => {
  it('drops an app-bar line that is the sender number misread with look-alikes', () => {
    const r = extract(['(4l2) 555-0l42', 'Save (412) 555-0142?', 'Hi, we are offering free gutter cleaning this week.'].join('\n'));
    assert.equal(r.number, '4125550142');
    assert.equal(r.message, 'Hi, we are offering free gutter cleaning this week.');
  });
  it('keeps a look-alike line that is a different number', () => {
    const r = extract(['Save (412) 555-0142?', 'Hi, we are offering free gutter cleaning this week.', '(5l2) 555-0l99'].join('\n'));
    assert.match(r.message, /\(5l2\) 555-0l99$/);
  });
});

// ---------- v0.1.2: the 2026-11-18 phone failure and its junk classes ----------

describe('OCR extraction: suggested-reply chips and composer tail (2026-11-18 failure shape)', () => {
  // SYNTHETIC text shaped on the real failure: a Messages screenshot whose
  // message OCR'd cleanly, followed by the suggested-reply chips and the
  // composer box read as junk lines.
  const MSG =
    "Hi there, this is Mia with Brightline Home Solar. We're offering free solar consultations to homeowners in your neighborhood this month. Would you like me to send over some details?";
  const ocr = [
    '9:47 © M @ ¥ 87%',
    '€  (412) 555-0142  &  :',
    'Texting with (412) 555-0142 (SMS/MMS)',
    'Thursday « 9:47 AM',
    "Hi there, this is Mia with Brightline Home Solar. We're",
    'offering free solar consultations to homeowners in your',
    'neighborhood this month. Would you like me to send over',
    'some details?',
    'Yes, please! Sure Yes ds Of course!',
    '@® Text message © @ Ae',
  ].join('\n');
  const r = extract(ocr);
  it('finds the number', () => assert.equal(r.number, '4125550142'));
  it('returns the message intact with the junk tail gone', () => assert.equal(r.message, MSG));
  it('the extracted text then passes scrubMessage end to end', () => {
    const sc = scrubMessage(r.message, {});
    assert.ok('template' in sc, JSON.stringify(sc));
    assert.match(sc.template, /free solar consultations to homeowners/);
    assert.doesNotMatch(sc.template, /Mia|[\d@©®]/);
  });
  it('without the extraction fix the same text is refused as unsafe_residue (not nothing_left)', () => {
    assert.deepEqual(scrubMessage(MSG + '\nYes, please! Sure Yes ds Of course!\n@® Text message © @ Ae', {}), { error: 'unsafe_residue' });
  });
  it('a real reply-like line in the message survives', () => {
    const r2 = extract(ocr.replace('some details?', 'some details? Yes, please send me the quote'));
    assert.match(r2.message, /some details\? Yes, please send me the quote$/);
  });
});

describe('OCR extraction: suggested-reply chip lines', () => {
  const chips = [
    'Yes, please! Sure Yes ds Of course!', 'Yes, please! Sure', 'Thank you! Sounds good', 'Ok Yes No',
    'Sure ds Ae', 'Of course! © ds', 'Who is this? No thanks', 'Gracias Claro',
  ];
  for (const l of chips) it(`drops ${JSON.stringify(l)}`, () => {
    assert.equal(X.isChipLine(l), true);
    assert.equal(X.isChrome(l), true);
  });
  const keep = [
    'Yes, please send me the quote', 'Sure! Of course we can help', 'Thank you for your business', 'Yes it is',
    'Thanks!', 'Sure thing', 'Yes ©', 'Of course! ©', 'Sure ds', 'Reply Yes or No', 'Ok, sounds good to me', 'yes or no?', 'No, thank you, we are all set',
  ];
  for (const l of keep) it(`keeps ${JSON.stringify(l)}`, () => {
    assert.equal(X.isChipLine(l), false);
    assert.equal(X.isChrome(l), false);
  });
});

describe('OCR extraction: symbol soup (fewer than 2 real words AND junk tokens > half)', () => {
  const soup = [
    '@® © @ Ae', 'ds', 'Ae ©', '« ® Q ¥', 'TN®E 6 8 - © NW sue 45 @54% pa © (412) 555-0148 no (2)', '© @ ® ok',
  ];
  for (const l of soup) it(`drops ${JSON.stringify(l)}`, () => {
    assert.equal(X.isSymbolSoup(l), true);
    assert.equal(X.isChrome(l), true);
  });
  const keep = [
    'Hi :)', 'Ok 👍', 'STOP', 'Reply Y to confirm', '$50 off!', 'Call 9:30 to 5', '10:00 ok', 'is it ok?',
    'us.', 'Call (214) 555-0199', '214-555-0199', 'Free quote - no obligation - today', 'Lr 5 . AY AA BRA E LAR IRR TSE i 4',
  ];
  for (const l of keep) it(`keeps ${JSON.stringify(l)}`, () => assert.equal(X.isSymbolSoup(l), false));
});

describe('OCR extraction: composer label merged with glyphs', () => {
  it('drops the whole line when nothing letter-like precedes the label', () => {
    assert.deepEqual(split('@® Text message © @ Ae'), []);
    assert.deepEqual(split('Text message © @'), []);
    assert.deepEqual(split('® iMessage © Ae'), []);
    assert.deepEqual(split('@ RCS message ©'), []);
    assert.deepEqual(split('© Chat message @ ®'), []);
    assert.deepEqual(split('+ Text Message • SMS ® @'), []);
  });
  it('truncates at the label when real text precedes it', () => {
    assert.deepEqual(split('some details? @ Text message © @ Ae'), ['some details? @']);
  });
  const keep = [
    'Reply to this Text message to opt out', 'Send us a text message!', 'Text message us anytime ©', 'Text message', 'iMessage',
  ];
  for (const l of keep) it(`leaves ${JSON.stringify(l)} unsplit`, () => assert.deepEqual(split(l), [l]));
});

describe('OCR extraction: merged chrome lines are split at known phrases', () => {
  it('splits a line holding several chrome phrases and keeps only the non-chrome pieces', () => {
    assert.deepEqual(split('Save (412) 555-0142? X Saving this number will add a new contact Report spam Add contact'), []);
    assert.deepEqual(split('Add contact Block number Report Junk'), []);
    assert.deepEqual(
      split('© (412) 555-0142 Save (412) 555-0142? X Saving this number will add a new contact Report spam'),
      ['© (412) 555-0142'],
    );
  });
  it('splits a single phrase only when the rest is junk', () => {
    assert.deepEqual(split('@® Report spam ©'), []);
    assert.deepEqual(split('The sender is not in your contact list. ® Ae'), []);
  });
  const keep = [
    'Report spam texts to 7726', 'Add contact info to your profile today', 'Block number one on our list: gutters',
    'Please add contact details below', 'Saving this number for later?',
  ];
  for (const l of keep) it(`leaves ${JSON.stringify(l)} unsplit`, () => assert.deepEqual(split(l), [l]));
  it('end to end: a merged chrome line does not reach the message', () => {
    const r = extract([
      'TN®E 6 8 - © NW sue 45 @54% pa © (412) 555-0142 no (2) Save (412) 555-0142? X Saving this number will add a new contact Report spam Add contact',
      'Thursday « 9:47 AM',
      'Hi there, this is Mia with Brightline Home Solar. Want a free estimate?',
    ].join('\n'));
    assert.equal(r.number, '4125550142');
    assert.equal(r.message, 'Hi there, this is Mia with Brightline Home Solar. Want a free estimate?');
  });
});

describe('OCR extraction: « and » as day-plus-time separators', () => {
  for (const l of ['Thursday « 9:47 AM', 'Today » 10:03 AM', 'Monday «9:47 AM']) it(`drops ${JSON.stringify(l)}`, () => assert.equal(X.isChrome(l), true));
  for (const l of ['Thursday « see you then', 'See you Thursday « 9:47 AM']) it(`keeps ${JSON.stringify(l)}`, () => assert.equal(X.isChrome(l), false));
});
