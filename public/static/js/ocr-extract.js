// Screenshot text extraction (v0.1.1, v0.1.2). Pure functions, no DOM, no network:
// they take the text a reader produced on this device and split it into the
// sender number and the message. Used by report.js in the browser and loaded
// directly by test/ocr-extract.test.ts.
//
// Steps, in order:
//   1. Sender number: the header line holding the number (as in v0.1); if
//      none, a full-text scan for NANP candidates, preferring one inside a
//      "Texting with ..." line, else the most frequent. Every candidate's area
//      code must be in the NANPA table the page provides.
//   2. Message start: if a "Texting with ..." header exists, the message
//      starts after it.
//   3. Merged lines are split (v0.1.2): a line holding two or more known
//      chrome phrases (or one, with only junk around it) is cut at those
//      phrases, and a composer label ("Text message") merged with icon
//      glyphs is cut off together with everything after it.
//   4. Messaging-app chrome lines (buttons, banners, day and time stamps,
//      status bar, SMS/RCS labels, suggested-reply chips, symbol soup) are
//      dropped. The patterns match whole lines only and are deliberately
//      narrow: when in doubt, a line is kept.
//   5. Lines OCR wrapped inside one bubble are re-joined.
(function (root) {
  'use strict';

  var TIME = '\\d{1,2}:\\d{2}(?:\\s*[AaPp]\\.?\\s?[Mm]\\.?)?';
  var PHONE_TXT = '(?:\\+?1[\\s.\\-]?)?\\(?[2-9]\\d{2}\\)?[\\s.\\-]?[2-9]\\d{2}[\\s.\\-]?\\d{4}';
  // One NANP number. Digit boundaries are checked by hand (no lookbehind,
  // for older Safari).
  var PHONE_G = /(?:\+?1[\s.\-]?)?\(?([2-9]\d{2})\)?[\s.\-]?([2-9]\d{2})[\s.\-]?(\d{4})/g;

  // Whole-line chrome patterns, tested against the line with leading and
  // trailing icon junk removed. Single words are case-sensitive so that a
  // wrapped message line such as "today" survives.
  var CHROME = [
    // Action buttons; side-by-side buttons often OCR onto one line.
    /^(?:(?:add contact|report spam|report junk|block(?: number)?)[\s|•·,]*)+$/i,
    /^saving this number will add a new contact\.?$/i,
    new RegExp('^save\\s+' + PHONE_TXT + '\\s*\\??$', 'i'),
    // Standalone day names, optionally with a time ("Thursday • 9:47 AM").
    new RegExp('^(?:Today|Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|TODAY|YESTERDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)(?:\\s*[•·,\\-«»]?\\s*' + TIME + ')?$'),
    new RegExp('^' + TIME + '$'),
    // Conversation and composer labels.
    /^(?:rcs messaging|rcs message|chat message|sms\/mms|text message(?:\s*[•·\-]\s*(?:sms|mms|rcs))?)$/i,
    /^(?:SMS|MMS|RCS|iMessage)$/,
    /^(?:the )?sender is not in your contact list\.?$/i,
  ];

  function core(line) {
    return line
      .replace(/^[^A-Za-z0-9(+]+/, '')
      .replace(/[^A-Za-z0-9)?.%]+$/, '')
      .replace(/\s+/g, ' ');
  }

  // Android Messages' conversation header: "Texting with (412) 555-0142
  // (SMS/MMS)" or "Texting with Riley (RCS)". It must name a number or a
  // transport, so a message line like "Texting with you is easy" is not one.
  function isTextingWithHeader(line) {
    var c = core(String(line).trim());
    if (!/^texting with\b/i.test(c) || c.length > 80) return false;
    return candidates(c).length > 0 || /\b(?:SMS|MMS|RCS)\b/i.test(c);
  }

  // ---- Token classes (v0.1.2), shared by the symbol-soup and chip rules ----
  // A token's content is the token with edge punctuation removed.
  var L = 'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F';
  var EDGE = /^[()\[\]"'“”‘’¿¡.,!?:;…]+|[()\[\]"'“”‘’¿¡.,!?:;…]+$/g;
  var REAL_WORD = new RegExp('^[' + L + ']+(?:[\'’\\-][' + L + ']+)*$');
  var NUMERIC = /^[$€£+]?\d[\d.,:\/\-]*%?$/;
  // Real one- and two-letter words (English and Spanish). Anything else that
  // short is a stray glyph.
  var SHORT_WORDS = {};
  ('a i y o e u ok am an as at be by do go he hi if in is it me my no of oh on or so to up us we yo ' +
    'al de el en es la le lo mi ni se si sí su te tu tú un ya').split(' ').forEach(function (w) { SHORT_WORDS[w] = true; });

  function content(tok) { return tok.replace(EDGE, ''); }
  function isRealWord(tok) {
    var c = content(tok);
    return REAL_WORD.test(c) && c.replace(/['’\-]/g, '').length >= 3;
  }
  /**
   * A junk token: not a real word (3+ letters), not a known short word, and
   * not number-like: 2+ digits making up at least half of it ("$50", "20%",
   * "9:30", "(412)", and OCR look-alikes such as "555-0l99").
   */
  function isJunkToken(tok) {
    var c = content(tok);
    if (!c) return true; // punctuation only: "-", ":)"
    if (isRealWord(tok)) return false;
    if (SHORT_WORDS[c.toLowerCase()]) return false;
    var digits = c.replace(/\D/g, '').length;
    if (digits >= 2 && (NUMERIC.test(c) || digits * 2 >= c.length)) return false;
    return true;
  }

  /**
   * Symbol soup: the OCR reading of icons, avatars and other non-text UI.
   * Precisely: fewer than 2 real words (3+ letters) AND more than half of the
   * whitespace-separated tokens are junk tokens (see isJunkToken).
   */
  function isSymbolSoup(line) {
    var toks = String(line).trim().split(/\s+/).filter(Boolean);
    if (!toks.length) return false;
    var real = 0, junk = 0;
    toks.forEach(function (t) { if (isRealWord(t)) real++; if (isJunkToken(t)) junk++; });
    return real < 2 && junk * 2 > toks.length;
  }

  // Suggested-reply chips shown above the composer (Android smart replies,
  // iOS quick replies), as lower-case token sequences, longest first.
  var CHIPS = [
    'no thank you', 'who is this', 'yes please', 'of course', 'thank you', 'sounds good', 'no thanks',
    'got it', 'sure thing', 'will do', 'love it', "who's this", 'de acuerdo', 'not interested',
    'sure', 'ok', 'okay', 'yes', 'no', 'thanks', 'great', 'cool', 'nice', 'perfect', 'haha', 'lol',
    'sí', 'claro', 'gracias', 'vale',
  ].map(function (c) { return c.split(' '); }).sort(function (p, q) { return q.length - p.length; });

  /**
   * A line of suggested-reply chips ("Yes, please! Sure Of course!"). Every
   * token must belong to a chip phrase or be a junk token (OCR noise), and
   * either: 2+ chip phrases with no more noise tokens than chips, or 1 chip
   * phrase with noise tokens making up the majority of the line (counting
   * the chip phrase as one unit: "Sure ds Ae" yes, "Sure ds" no). A real word
   * outside a chip ("Yes, please send me the quote") keeps the line.
   */
  function isChipLine(line) {
    var toks = String(line).trim().split(/\s+/).filter(Boolean);
    var norm = toks.map(function (t) { return content(t).toLowerCase(); });
    var chips = 0, noise = 0, i = 0;
    while (i < toks.length) {
      var hit = 0;
      for (var k = 0; k < CHIPS.length && !hit; k++) {
        var c = CHIPS[k];
        if (i + c.length > toks.length) continue;
        var ok = true;
        for (var j = 0; j < c.length && ok; j++) ok = norm[i + j] === c[j];
        if (ok) hit = c.length;
      }
      if (hit) { chips++; i += hit; continue; }
      if (!isJunkToken(toks[i])) return false;
      noise++;
      i++;
    }
    if (chips >= 2) return noise <= chips;
    if (chips === 1) return noise * 2 > chips + noise; // a chip phrase counts as one unit
    return false;
  }

  // ---- Merged lines (v0.1.2) ----
  // Chrome phrases that OCR merges onto one line with other chrome. Exact UI
  // casing, so ordinary sentences that mention them are not cut.
  var MERGED_CHROME = new RegExp(
    '(Saving this number will add a new contact\\.?' +
      '|Save\\s+' + PHONE_TXT + '\\s*\\??(?:\\s*[X×x](?![A-Za-z]))?' +
      '|The sender is not in your contact list\\.?' +
      '|Texting with\\s+' + PHONE_TXT + '(?:\\s*\\((?:SMS\\/MMS|RCS)\\))?' +
      '|Add contact|Report spam|Report Junk|Block number|RCS messaging)',
  );
  var COMPOSER_LABEL = /(Text [Mm]essage(?:\s*[•·«»\-]\s*(?:SMS|MMS|RCS))?|RCS message|Chat message|iMessage)/;
  var ICON_GLYPH = /[^A-Za-z0-9À-ɏ\s.,!?;:'"’“”()\-]/;

  /**
   * Split one OCR line into the lines it really is. Returns an array (empty
   * when the whole line is chrome). Lines without merged chrome come back
   * unchanged.
   */
  function splitMerged(line) {
    var l = String(line);
    // Composer label merged with icon glyphs: "@® Text message © @ Ae".
    var m = COMPOSER_LABEL.exec(l);
    if (m) {
      var after = l.slice(m.index + m[0].length);
      var afterToks = after.trim().split(/\s+/).filter(Boolean);
      if (ICON_GLYPH.test(after) && !afterToks.some(isRealWord)) {
        var before = l.slice(0, m.index).trim();
        if (!new RegExp('[' + L + ']{2,}').test(before)) return [];
        l = before;
      }
    }
    var parts = l.split(MERGED_CHROME); // odd indices are the chrome phrases
    if (parts.length < 3) return [l];
    var hits = (parts.length - 1) / 2;
    var rest = [];
    for (var i = 0; i < parts.length; i += 2) {
      var p = parts[i].trim();
      if (p) rest.push(p);
    }
    if (rest.every(isChrome)) return []; // chrome with only junk around it
    if (hits >= 2) return rest; // the pieces are then tested line by line
    return [l]; // one phrase inside real text: leave the line alone
  }

  /** True when a line is messaging-app chrome rather than message text. */
  function isChrome(line) {
    var l = String(line).trim();
    if (!l) return false; // blank lines are paragraph breaks, not chrome
    if (!/[A-Za-z0-9]/.test(l)) return true; // icon glyphs only
    var c = core(l);
    for (var i = 0; i < CHROME.length; i++) if (CHROME[i].test(c)) return true;
    if (isTextingWithHeader(c)) return true; // dropped after the number is harvested
    if (/^\d{1,3}$/.test(c)) return true; // unread badge on a back button
    if (isChipLine(l)) return true; // suggested replies above the composer
    if (isSymbolSoup(l)) return true; // icons and avatars read as glyphs
    // Status bar: a clock followed only by icon glyphs, signal and battery.
    var sb = new RegExp('^' + TIME + '(?=\\s|$)(.*)$').exec(c);
    if (sb) {
      var rest = sb[1]
        .replace(/\b(?:VoLTE|LTE|VoWiFi|Wi-?Fi|[345]G\+?|5G\s?UC|5GE)\b/gi, '')
        .replace(/(^|[^A-Za-z])[lIi|!]{1,4}(?=[^A-Za-z]|$)/g, '$1'); // signal bars
      if (!/[A-Za-z]{2,}/.test(rest)) return true;
    }
    return false;
  }

  /** Every NANP-shaped number in a string: [{digits, index}], 10 digits each. */
  function candidates(text) {
    var out = [];
    var m;
    PHONE_G.lastIndex = 0;
    while ((m = PHONE_G.exec(text))) {
      var before = m.index > 0 ? text.charAt(m.index - 1) : '';
      var after = text.charAt(m.index + m[0].length);
      if (/\d/.test(before) || /\d/.test(after)) continue;
      out.push({ digits: m[1] + m[2] + m[3], index: m.index, raw: m[0] });
    }
    return out;
  }

  function validNumber(digits, isValidNpa) {
    var npa = digits.slice(0, 3);
    var nxx = digits.slice(3, 6);
    if (!/^[2-9]\d\d$/.test(npa) || !/^[2-9]\d\d$/.test(nxx)) return false;
    if (/^\d11$/.test(npa) || /^\d11$/.test(nxx)) return false;
    return isValidNpa ? !!isValidNpa(npa) : true;
  }

  // A header line: one number and almost nothing else (the app bar).
  function headerNumber(line, isValidNpa) {
    var c = candidates(line);
    if (c.length !== 1) return '';
    if (line.replace(c[0].raw, '').replace(/[^A-Za-z]/g, '').length >= 4) return '';
    return validNumber(c[0].digits, isValidNpa) ? c[0].digits : '';
  }

  /**
   * Find the sender number in OCR lines. Returns {number, via}; number is 10
   * digits or ''. via is 'header', 'texting-with', 'frequency' or ''.
   */
  function findNumber(lines, isValidNpa) {
    var i;
    for (i = 0; i < lines.length; i++) {
      var h = headerNumber(lines[i], isValidNpa);
      if (h) return { number: h, via: 'header' };
    }
    // Full-text fallback.
    for (i = 0; i < lines.length; i++) {
      if (!isTextingWithHeader(lines[i])) continue;
      var tw = candidates(lines[i]).filter(function (c) { return validNumber(c.digits, isValidNpa); });
      if (tw.length) return { number: tw[0].digits, via: 'texting-with' };
    }
    var all = candidates(lines.join('\n')).filter(function (c) { return validNumber(c.digits, isValidNpa); });
    if (!all.length) return { number: '', via: '' };
    var count = {};
    var order = [];
    all.forEach(function (c) {
      if (!count[c.digits]) { count[c.digits] = 0; order.push(c.digits); }
      count[c.digits]++;
    });
    var best = order[0];
    order.forEach(function (d) { if (count[d] > count[best]) best = d; });
    return { number: best, via: 'frequency' };
  }

  // Lines that are only the sender's number (app bar, repeated header),
  // including OCR look-alikes such as "(4l2) 555-0l42" for that same number.
  function isSenderOnlyLine(line, number) {
    if (!number) return false;
    var forms = [line, line.replace(/[lI|]/g, '1').replace(/[Oo]/g, '0')];
    for (var i = 0; i < forms.length; i++) {
      var c = candidates(forms[i]);
      if (c.length === 1 && c[0].digits === number && forms[i].replace(c[0].raw, '').replace(/[^A-Za-z]/g, '').length < 4) return true;
    }
    return false;
  }

  /**
   * Split OCR text into {number, message, numberVia}.
   * opts.isValidNpa(npa) -> boolean checks the area-code table.
   */
  function extract(text, opts) {
    var isValidNpa = opts && opts.isValidNpa;
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); });
    var found = findNumber(lines, isValidNpa);

    // Message start anchoring: the body starts after a "Texting with" header,
    // provided something is left after it.
    var anchor = -1;
    for (var a = 0; a < lines.length; a++) if (isTextingWithHeader(lines[a])) { anchor = a; break; }
    if (anchor >= 0) {
      var after = lines.slice(anchor + 1);
      if (after.some(function (l) { return l && !isChrome(l); })) lines = after;
    }

    var split = [];
    lines.forEach(function (l) { split.push.apply(split, l ? splitMerged(l) : ['']); });
    var kept = split.filter(function (l) { return !isChrome(l) && !isSenderOnlyLine(l, found.number); });

    // Re-join lines that OCR wrapped inside one message bubble, and fix the
    // common "|" for "I" misread. Short UI labels stay on their own lines.
    var out = [];
    for (var j = 0; j < kept.length; j++) {
      var line = kept[j].replace(/(^|\s)\|(?=\s|$)/g, '$1I');
      var prev = out.length ? out[out.length - 1] : '';
      var joinable = prev && line && prev.length > 20 && !/[.!?]$/.test(prev) && !/\d{1,2}:\d{2}/.test(line);
      if (joinable || (prev && /^[a-z]/.test(line))) out[out.length - 1] = prev + ' ' + line;
      else out.push(line);
    }
    return {
      number: found.number,
      numberVia: found.via,
      message: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    };
  }

  /**
   * Turn Shape Detection API results (DetectedText[]: rawValue plus
   * boundingBox) into text in reading order: rows top to bottom, items in a
   * row left to right.
   */
  function assembleDetected(results) {
    var items = [];
    (results || []).forEach(function (r) {
      var v = r && typeof r.rawValue === 'string' ? r.rawValue.trim() : '';
      if (!v) return;
      var b = r.boundingBox || { x: 0, y: 0, width: 0, height: 0 };
      items.push({ text: v, x: b.x, top: b.y, bottom: b.y + b.height, mid: b.y + b.height / 2 });
    });
    items.sort(function (p, q) { return p.mid - q.mid || p.x - q.x; });
    var rows = [];
    items.forEach(function (it) {
      var row = rows.length ? rows[rows.length - 1] : null;
      if (row && it.mid >= row.top && it.mid <= row.bottom) row.items.push(it);
      else rows.push({ top: it.top, bottom: it.bottom, items: [it] });
    });
    return rows.map(function (row) {
      return row.items.sort(function (p, q) { return p.x - q.x; }).map(function (it) { return it.text; }).join(' ');
    }).join('\n');
  }

  root.STMExtract = {
    extract: extract,
    findNumber: findNumber,
    isChrome: isChrome,
    isChipLine: isChipLine,
    isSymbolSoup: isSymbolSoup,
    splitMerged: splitMerged,
    isTextingWithHeader: isTextingWithHeader,
    candidates: candidates,
    assembleDetected: assembleDetected,
  };
})(typeof window !== 'undefined' ? window : globalThis);
