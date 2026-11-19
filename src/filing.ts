// Preview, filing, deletion, and private flags.
//
// The same pure prepare() step produces both the review preview and the
// stored record, so what the reporter reviewed is what is saved. Filing
// requires the preview hash the reporter saw; if the server's recomputed
// record differs, nothing is saved and the revised preview is returned.

import { CATEGORY_LABEL, parseCategory, type Category } from './categories.ts';
import { insertReport, tx, type DB } from './db.ts';
import { deriveReceipt, normalizeReceipt, randomId, senderToken, sha256hex, type Keys } from './crypto.ts';
import { PHONE_ERROR_TEXT, parseSenderNumber } from './phone.ts';
import { NOTE_TEXT, canonicalTemplate, normalizeText, scrubMessage, type ScrubError } from './scrub.ts';
import { SKELETON_GRAMMAR_VERSION, extractSkeleton, minhash } from './skeleton.ts';

export interface ReportInput {
  number?: unknown;
  message?: unknown;
  category?: unknown;
  city?: unknown;
  removals?: unknown;
  source?: unknown;
}

export type FieldErrors = Partial<Record<'number' | 'message' | 'category' | 'city' | 'removals' | 'source', string>>;

const SCRUB_ERROR_TEXT: Record<ScrubError, string> = {
  empty: 'Enter the message text.',
  too_long: 'This message is too long to review safely. Paste only the spam text.',
  nothing_left: 'After removing personal details, nothing safe was left to keep. Check the message text.',
  unsafe_residue:
    'Part of the message couldn’t be verified as safe to store: a stray number, @ sign or symbol survived cleaning. Check the end of the message for anything the screenshot reader added, remove it, and try again.',
  bad_removals: 'The list of text to remove is not valid.',
};

export interface Prepared {
  /** Shown to the reporter at review. Contains no token, no full number. */
  preview: PublicPreview;
  /** Persistable fields, minus id/timestamps/receipt. Internal only. */
  record: {
    area_code: string;
    prefix: string;
    sender_token: string;
    category: Category;
    city: string | null;
    template: string;
    template_hash: string;
    skeleton: string | null;
    skeleton_version: string;
    minhash: string;
    source: 'manual' | 'screenshot';
  };
}

export interface PublicPreview {
  scrubbedMessage: string;
  notes: string[];
  kept: { areaCode: string; prefix: string; referenceRegion: string; category: string; city: string | null };
  publicFields: Array<{ label: string; value: string }>;
  previewHash: string;
  grammarVersion: string;
}

export const CITY_RE = /^[\p{L}][\p{L} .'\-]{0,38}[\p{L}.]?(?:, ?[A-Z]{2})?$/u;

function parseCity(v: unknown, message: string): string | null | { error: string } {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return { error: 'Enter a city name, or leave it blank.' };
  const city = normalizeText(v).trim().replace(/\s+/g, ' ');
  if (city === '') return null;
  if (!CITY_RE.test(city)) return { error: 'Enter only the city name as letters, or leave it blank.' };
  const bare = city.replace(/, ?[A-Z]{2}$/, '');
  const re = new RegExp(`(?<![\\p{L}])${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}(?![\\p{L}])`, 'iu');
  if (!re.test(normalizeText(message))) {
    return { error: 'Enter the city exactly as it appears in the message, or leave it blank.' };
  }
  return bare;
}

export function prepare(keys: Keys, input: ReportInput): Prepared | { errors: FieldErrors } {
  const errors: FieldErrors = {};
  const num = parseSenderNumber(input.number);
  if ('error' in num) errors.number = PHONE_ERROR_TEXT[num.error];
  const category = parseCategory(input.category);
  if (category === null) errors.category = 'Choose a category from the list.';
  const message = typeof input.message === 'string' ? input.message : '';
  const city = parseCity(input.city, message);
  if (city && typeof city === 'object') errors.city = city.error;
  const source = input.source === undefined ? 'manual' : input.source;
  if (source !== 'manual' && source !== 'screenshot') errors.source = 'Unknown source.';
  const removals = input.removals === undefined ? [] : input.removals;
  const cityValue = typeof city === 'string' ? city : null;
  const scrub = scrubMessage(input.message, { city: cityValue, removals: removals as string[] });
  if ('error' in scrub) {
    if (scrub.error === 'bad_removals') errors.removals = SCRUB_ERROR_TEXT.bad_removals;
    else errors.message = SCRUB_ERROR_TEXT[scrub.error];
  }
  if (Object.keys(errors).length > 0 || 'error' in num || 'error' in scrub || category === null) {
    return { errors };
  }

  const template = scrub.template;
  const skeleton = extractSkeleton(template);
  const record = {
    area_code: num.areaCode,
    prefix: num.prefix,
    sender_token: senderToken(keys, num.digits), // the full number's last use
    category,
    city: cityValue,
    template,
    template_hash: sha256hex(canonicalTemplate(template)),
    skeleton,
    skeleton_version: SKELETON_GRAMMAR_VERSION,
    minhash: JSON.stringify(minhash(template)),
    source: source as 'manual' | 'screenshot',
  };
  const previewHash = sha256hex(
    JSON.stringify([template, record.area_code, record.prefix, category, cityValue, record.source, SKELETON_GRAMMAR_VERSION]),
  );
  const preview: PublicPreview = {
    scrubbedMessage: template,
    notes: scrub.notes.map((n) => NOTE_TEXT[n]),
    kept: {
      areaCode: num.areaCode,
      prefix: num.prefix,
      referenceRegion: num.areaInfo.region,
      category: CATEGORY_LABEL[category] ?? 'Unknown',
      city: cityValue,
    },
    publicFields: [
      { label: 'Sender area code (claimed origin)', value: num.areaCode },
      { label: 'Numbering-plan reference region', value: num.areaInfo.region },
      { label: 'Category', value: CATEGORY_LABEL[category] ?? 'Unknown' },
      { label: 'Filing date (UTC day)', value: 'The day you file' },
      {
        label: 'Template match counts',
        value: 'Counted toward a public pattern only when 3 or more reports match. The message text itself is never published.',
      },
    ],
    previewHash,
    grammarVersion: SKELETON_GRAMMAR_VERSION,
  };
  return { preview, record };
}

// ---------------- filing ----------------

export interface FileContext {
  db: DB;
  keys: Keys;
  duplicateWindowHours: number;
  globalDailySubmissions: number;
  /** Called only for a NEW filing (not a retry); return false to refuse. */
  allowNewFiling: () => boolean;
  /**
   * Same-connection duplicate check, called once per NEW filing that will be
   * stored. Returns true when the same connection filed the same sender and
   * template recently. Absent when the client address is not trusted-derived.
   * A hit only changes the stored `counted` flag; the response is identical.
   */
  seenFromConnection?: (senderToken: string, templateHash: string) => boolean;
  now?: Date;
}

export type FileOutcome =
  | { http: 201; body: { status: 'filed'; receipt: string; message: string } }
  | { http: 200; body: { status: 'already_filed'; receipt: string; message: string } }
  | { http: 400; body: { status: 'invalid'; errors: FieldErrors } }
  | { http: 409; body: { status: 'preview_changed'; preview: PublicPreview; message: string } }
  | { http: 409; body: { status: 'idempotency_conflict'; message: string } }
  | { http: 429; body: { status: 'rate_limited'; message: string } }
  | { http: 503; body: { status: 'daily_cap'; message: string } };

export const MSG = {
  filed: 'Report filed. Save your deletion receipt code to remove this report later. Anyone with the code can request deletion. You can also forward the original text to 7726 (SPAM).',
  alreadyFiled: 'This report was already filed. No additional report was counted.',
  previewChanged: 'The saved version would differ from what you reviewed. Check the revised preview and confirm again.',
  idemConflict: 'This filing request was already used for a different report. Start a new report.',
  rateLimited: 'Too many reports from this connection in the last hour. Try again later.',
  dailyCap: 'This site has reached its daily report limit. Intake reopens at midnight UTC. Nothing was saved.',
  paused:
    'Reporting is paused on this site right now. Nothing was saved. You can still forward the original text to 7726 (SPAM), and everything else on this site still works.',
} as const;

const IDEM_RE = /^[A-Za-z0-9_-]{22,64}$/;

export function fileReport(ctx: FileContext, body: ReportInput & { previewHash?: unknown; idempotencyKey?: unknown }): FileOutcome {
  const now = ctx.now ?? new Date();
  if (typeof body.idempotencyKey !== 'string' || !IDEM_RE.test(body.idempotencyKey)) {
    return { http: 400, body: { status: 'invalid', errors: { message: 'Missing or malformed request key. Reload and review again.' } } };
  }
  const idemKey = body.idempotencyKey;
  const prepared = prepare(ctx.keys, body);
  if ('errors' in prepared) return { http: 400, body: { status: 'invalid', errors: prepared.errors } };
  if (body.previewHash !== prepared.preview.previewHash) {
    return { http: 409, body: { status: 'preview_changed', preview: prepared.preview, message: MSG.previewChanged } };
  }
  const idemHash = sha256hex(`idem:${idemKey}`);
  const receipt = deriveReceipt(ctx.keys, idemKey);

  return tx(ctx.db, (): FileOutcome => {
    const prior = ctx.db.prepare('SELECT request_hash FROM filings WHERE idem_hash = ?').get(idemHash) as
      | { request_hash: string }
      | undefined;
    if (prior) {
      if (prior.request_hash !== prepared.preview.previewHash) {
        return { http: 409, body: { status: 'idempotency_conflict', message: MSG.idemConflict } };
      }
      return { http: 200, body: { status: 'already_filed', receipt, message: MSG.alreadyFiled } };
    }
    const day = now.toISOString().slice(0, 10);
    const counter = ctx.db.prepare('SELECT submissions FROM daily_counter WHERE day = ?').get(day) as
      | { submissions: number }
      | undefined;
    if ((counter?.submissions ?? 0) >= ctx.globalDailySubmissions) {
      return { http: 503, body: { status: 'daily_cap', message: MSG.dailyCap } };
    }
    if (!ctx.allowNewFiling()) return { http: 429, body: { status: 'rate_limited', message: MSG.rateLimited } };

    const r = prepared.record;
    const windowStart = new Date(now.getTime() - ctx.duplicateWindowHours * 3_600_000).toISOString();
    const dup = ctx.db
      .prepare('SELECT 1 FROM reports WHERE sender_token = ? AND template_hash = ? AND created_at >= ? LIMIT 1')
      .get(r.sender_token, r.template_hash, windowStart);
    // Always consulted (not short-circuited) so the entry is refreshed.
    const seen = ctx.seenFromConnection ? ctx.seenFromConnection(r.sender_token, r.template_hash) : false;
    const id = randomId(16);
    insertReport(ctx.db, {
      id,
      created_at: now.toISOString(),
      created_day: day,
      ...r,
      counted: dup || seen ? 0 : 1,
      receipt_hash: sha256hex(receipt),
    });
    ctx.db
      .prepare('INSERT INTO filings(idem_hash, request_hash, report_id, created_at) VALUES (?, ?, ?, ?)')
      .run(idemHash, prepared.preview.previewHash, id, now.toISOString());
    ctx.db
      .prepare('INSERT INTO daily_counter(day, submissions) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET submissions = submissions + 1')
      .run(day);
    return { http: 201, body: { status: 'filed', receipt, message: MSG.filed } };
  });
}

// ---------------- deletion ----------------

export type DeleteOutcome =
  | { http: 200; body: { status: 'deleted' | 'already_deleted'; message: string } }
  | { http: 404; body: { status: 'not_found'; message: string } }
  | { http: 400; body: { status: 'invalid'; message: string } };

export const DELETE_MSG = {
  deleted:
    'Report deleted. It no longer appears in counts or patterns on this site and will not be part of any future data release. Copies that other people already downloaded cannot be recalled.',
  already: 'This report was already deleted. Nothing else needs to be done.',
  notFound: 'We could not find a report for this code. Check the code and try again.',
  invalid: 'Enter the 32-character receipt code you saved when you filed the report.',
} as const;

export function deleteReport(db: DB, code: unknown, now = new Date()): DeleteOutcome {
  const receipt = normalizeReceipt(code);
  if (!receipt) return { http: 400, body: { status: 'invalid', message: DELETE_MSG.invalid } };
  const h = sha256hex(receipt);
  return tx(db, (): DeleteOutcome => {
    const row = db.prepare('SELECT id FROM reports WHERE receipt_hash = ?').get(h) as { id: string } | undefined;
    if (row) {
      db.prepare('DELETE FROM reports WHERE id = ?').run(row.id);
      db.prepare('DELETE FROM filings WHERE report_id = ?').run(row.id);
      db.prepare('INSERT OR IGNORE INTO deletions(receipt_hash, deleted_day) VALUES (?, ?)').run(h, now.toISOString().slice(0, 10));
      return { http: 200, body: { status: 'deleted', message: DELETE_MSG.deleted } };
    }
    const tomb = db.prepare('SELECT 1 FROM deletions WHERE receipt_hash = ?').get(h);
    if (tomb) return { http: 200, body: { status: 'already_deleted', message: DELETE_MSG.already } };
    return { http: 404, body: { status: 'not_found', message: DELETE_MSG.notFound } };
  });
}

// ---------------- private flags (contest / takedown without a receipt) ----------------

export const FLAG_REASONS = [
  ['personal_info', 'It shows personal information'],
  ['my_number_or_business', 'It concerns my phone number or my business'],
  ['inaccurate', 'It is inaccurate or misleading'],
  ['other', 'Other'],
] as const;

export function fileFlag(db: DB, body: Record<string, unknown>, now = new Date()): { http: 200 | 400; body: Record<string, unknown> } {
  const reason = body.reason;
  if (typeof reason !== 'string' || !FLAG_REASONS.some((r) => r[0] === reason)) {
    return { http: 400, body: { status: 'invalid', errors: { reason: 'Choose a reason.' } } };
  }
  const target = typeof body.target === 'string' ? body.target.trim().slice(0, 200) : '';
  const details = typeof body.details === 'string' ? body.details.trim() : '';
  if (target === '') return { http: 400, body: { status: 'invalid', errors: { target: 'Tell us which page or pattern you mean.' } } };
  if (details.length > 2000) return { http: 400, body: { status: 'invalid', errors: { details: 'Keep details under 2,000 characters.' } } };
  const contactRaw = typeof body.contact === 'string' ? body.contact.trim() : '';
  if (contactRaw.length > 200) return { http: 400, body: { status: 'invalid', errors: { contact: 'Contact is too long.' } } };
  db.prepare('INSERT INTO flags(id, created_day, reason, target, details, contact) VALUES (?, ?, ?, ?, ?, ?)').run(
    randomId(12),
    now.toISOString().slice(0, 10),
    reason,
    target,
    details,
    contactRaw || null,
  );
  return {
    http: 200,
    body: {
      status: 'received',
      message:
        'Thank you. Your flag was saved privately for the maintainer. Flagged material is reviewed and may be removed from public views while it is reviewed. Your flag is not published.',
    },
  };
}
