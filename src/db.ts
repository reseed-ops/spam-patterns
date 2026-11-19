// SQLite storage (node:sqlite, no native dependencies).
//
// Persistence is allow-list based: insertReport() accepts ONLY the columns
// in REPORT_COLUMNS, validates each one, and builds its SQL from that list.
// Any other key (a full number, raw text, an IP, an image) is refused with
// AllowListError before anything touches the database.

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { CATEGORY_VALUES } from './categories.ts';

export type DB = DatabaseSync;

export const SCHEMA_VERSION = 1;

export const REPORT_COLUMNS = [
  'id',
  'created_at',
  'created_day',
  'area_code',
  'prefix',
  'sender_token',
  'category',
  'city',
  'template',
  'template_hash',
  'skeleton',
  'skeleton_version',
  'minhash',
  'source',
  'counted',
  'receipt_hash',
] as const;
export type ReportColumn = (typeof REPORT_COLUMNS)[number];
export type ReportRecord = Record<ReportColumn, string | number | null>;

export class AllowListError extends Error {}

const VALIDATORS: Record<ReportColumn, (v: unknown) => boolean> = {
  id: (v) => typeof v === 'string' && /^[A-Za-z0-9_-]{16,32}$/.test(v),
  created_at: (v) => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(v),
  created_day: (v) => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v),
  area_code: (v) => typeof v === 'string' && /^[2-9]\d\d$/.test(v),
  prefix: (v) => typeof v === 'string' && /^[2-9]\d\d$/.test(v),
  sender_token: (v) => v === null || (typeof v === 'string' && /^[0-9a-f]{64}$/.test(v)),
  category: (v) => typeof v === 'string' && (CATEGORY_VALUES as readonly string[]).includes(v),
  city: (v) => v === null || (typeof v === 'string' && /^[\p{L}][\p{L} .'\-]{0,38}[\p{L}.]?(?:, ?[A-Z]{2})?$/u.test(v)),
  template: (v) => typeof v === 'string' && v.length > 0 && v.length <= 1500 && !/[\d@]/.test(v.replace(/\[[^\]]+\]/g, '')),
  template_hash: (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v),
  skeleton: (v) => v === null || (typeof v === 'string' && /^[A-Z_]+(?:>[A-Z_]+)*$/.test(v)),
  skeleton_version: (v) => v === 'v1',
  minhash: (v) => typeof v === 'string' && /^\[(?:\d+,){63}\d+\]$/.test(v),
  source: (v) => v === 'manual' || v === 'screenshot',
  counted: (v) => v === 0 || v === 1,
  receipt_hash: (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v),
};

export function openDb(path: string): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;');
  migrate(db);
  return db;
}

function migrate(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reports (
      id               TEXT PRIMARY KEY,
      created_at       TEXT NOT NULL,     -- internal: duplicate window and 7-day delay only
      created_day      TEXT NOT NULL,     -- UTC day: the only time unit ever shown publicly
      area_code        TEXT NOT NULL,
      prefix           TEXT NOT NULL,     -- internal only
      sender_token     TEXT,              -- internal HMAC; NULL once expired
      category         TEXT NOT NULL,
      city             TEXT,              -- city named in the message; internal only
      template         TEXT NOT NULL,     -- slot-masked text; internal only, never exported
      template_hash    TEXT NOT NULL,
      skeleton         TEXT,
      skeleton_version TEXT NOT NULL,
      minhash          TEXT NOT NULL,
      source           TEXT NOT NULL CHECK (source IN ('manual','screenshot')),
      counted          INTEGER NOT NULL CHECK (counted IN (0,1)),
      receipt_hash     TEXT NOT NULL UNIQUE
    ) STRICT;
    CREATE INDEX IF NOT EXISTS reports_day ON reports(created_day);
    CREATE INDEX IF NOT EXISTS reports_dup ON reports(sender_token, template_hash, created_at);
    CREATE TABLE IF NOT EXISTS filings (
      idem_hash    TEXT PRIMARY KEY,      -- sha256 of the client idempotency key
      request_hash TEXT NOT NULL,         -- binds the key to one reviewed record
      report_id    TEXT NOT NULL,
      created_at   TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS deletions (
      receipt_hash TEXT PRIMARY KEY,      -- tombstone so a repeated delete is idempotent
      deleted_day  TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS flags (
      id          TEXT PRIMARY KEY,
      created_day TEXT NOT NULL,
      reason      TEXT NOT NULL,
      target      TEXT NOT NULL,
      details     TEXT NOT NULL,
      contact     TEXT,
      status      TEXT NOT NULL DEFAULT 'open'
    ) STRICT;
    -- Pattern review decisions (operator-only, never published). A pattern is
    -- public only while its row is 'published' AND the fingerprint still
    -- matches the computed group. See src/review.ts.
    CREATE TABLE IF NOT EXISTS pattern_reviews (
      pattern_id     TEXT PRIMARY KEY,
      status         TEXT NOT NULL CHECK (status IN ('pending','published','rejected')),
      fingerprint    TEXT NOT NULL,     -- sha256 of matching rules version + sorted template hashes
      template_count INTEGER NOT NULL,
      report_count   INTEGER NOT NULL,
      decided_day    TEXT NOT NULL,
      note           TEXT               -- why a decision was reset to pending, if it was
    ) STRICT;
    CREATE TABLE IF NOT EXISTS daily_counter (
      day         TEXT PRIMARY KEY,
      submissions INTEGER NOT NULL
    ) STRICT;
  `);
  db.prepare('INSERT OR IGNORE INTO meta(key, value) VALUES (?, ?)').run('schema_version', String(SCHEMA_VERSION));
}

export function validateReportRecord(rec: Record<string, unknown>): ReportRecord {
  for (const key of Object.keys(rec)) {
    if (!(REPORT_COLUMNS as readonly string[]).includes(key)) {
      throw new AllowListError(`Field "${key}" is not on the storage allow-list and cannot be persisted.`);
    }
  }
  for (const col of REPORT_COLUMNS) {
    if (!(col in rec)) throw new AllowListError(`Missing required field "${col}".`);
    if (!VALIDATORS[col](rec[col])) throw new AllowListError(`Field "${col}" failed validation.`);
  }
  return rec as ReportRecord;
}

export function insertReport(db: DB, rec: Record<string, unknown>): void {
  const valid = validateReportRecord(rec);
  const cols = REPORT_COLUMNS.join(', ');
  const qs = REPORT_COLUMNS.map(() => '?').join(', ');
  db.prepare(`INSERT INTO reports (${cols}) VALUES (${qs})`).run(...REPORT_COLUMNS.map((c) => valid[c]));
}

export function tx<T>(db: DB, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Expire internal sender tokens after the configured TTL. */
export function expireSenderTokens(db: DB, ttlDays: number, now = new Date()): number {
  const cutoff = new Date(now.getTime() - ttlDays * 86_400_000).toISOString();
  const r = db.prepare('UPDATE reports SET sender_token = NULL WHERE sender_token IS NOT NULL AND created_at < ?').run(cutoff);
  return Number(r.changes);
}

/** Idempotency keys are only needed for retries; drop them after a day. */
export function expireFilings(db: DB, now = new Date()): number {
  const cutoff = new Date(now.getTime() - 86_400_000).toISOString();
  return Number(db.prepare('DELETE FROM filings WHERE created_at < ?').run(cutoff).changes);
}
