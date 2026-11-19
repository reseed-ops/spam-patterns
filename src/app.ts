// HTTP application. Plain node:http, no framework.
//
// Logging policy: no request logging. Bodies, receipt codes, IPs and query
// strings are never written anywhere. Only startup lines and the class
// name of unexpected errors go to stderr.

import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { intakePaused, type Config } from './config.ts';
import { Keys, normalizeReceipt, sha256hex } from './crypto.ts';
import { expireFilings, expireSenderTokens, openDb, type DB } from './db.ts';
import { MSG, deleteReport, fileFlag, fileReport, prepare } from './filing.ts';
import { BACKGROUND_COLOR, THEME_COLOR, esc } from './html.ts';
import { journalAppend, journalReapply } from './journal.ts';
import {
  AGGREGATE_SCHEMA,
  RANGES,
  dataPage,
  deletePage,
  junkMailPage,
  methodologyPage,
  offlinePage,
  overviewPage,
  patternDetailPage,
  patternsPage,
  privacyPage,
  projectPage,
  rangeDays,
  reportCompletePage,
  reportPage,
  simplePage,
  type OverviewParams,
  type PageCtx,
  type RangeKey,
} from './pages.ts';
import { areaCodeCounts } from './patterns.ts';
import { publicPatterns, reconcileReviews } from './review.ts';
import { ConnectionDedup } from './dedup.ts';
import { WindowLimiter, netId, resolveClient } from './ratelimit.ts';

export const CSP = [
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "form-action 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()',
};

const MAX_BODY = 16 * 1024;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
// Read once at startup: the service worker script is part of the release.
const SW_SOURCE = readFileSync(join(PUBLIC, 'sw.js'));

const TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.gz': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/** Web app manifest (served at /manifest.webmanifest). Icons are rendered from /static/img/logo.svg. */
export const MANIFEST = {
  name: 'Spam Patterns',
  short_name: 'Spam Patterns',
  description: 'Report spam texts anonymously and see shared script patterns, with privacy built in.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  theme_color: THEME_COLOR,
  background_color: BACKGROUND_COLOR,
  icons: [
    { src: '/static/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/static/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/static/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

export interface App {
  handle: (req: IncomingMessage, res: ServerResponse) => void;
  db: DB;
  keys: Keys;
  dedup: ConnectionDedup;
  /** Stops the app's timers (tests). */
  close: () => void;
}

export interface AppOptions {
  env?: NodeJS.ProcessEnv;
  db?: DB;
  /** Where the INTAKE_PAUSED file and deletion journal live. */
  dataDir?: string | null;
}

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const len = Number(req.headers['content-length'] ?? '0');
    if (len > MAX_BODY) {
      reject(new HttpError(413, 'Request too large.'));
      req.resume();
      return;
    }
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Request too large.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function contentType(req: IncomingMessage): string {
  return String(req.headers['content-type'] ?? '')
    .split(';')[0]!
    .trim()
    .toLowerCase();
}

async function jsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (contentType(req) !== 'application/json') throw new HttpError(415, 'Send JSON.');
  const raw = await readBody(req);
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'Malformed JSON.');
  }
}

async function formBody(req: IncomingMessage): Promise<Record<string, string>> {
  if (contentType(req) !== 'application/x-www-form-urlencoded') throw new HttpError(415, 'Unsupported form encoding.');
  const raw = await readBody(req);
  return Object.fromEntries(new URLSearchParams(raw));
}

function send(res: ServerResponse, status: number, type: string, body: string | Buffer, extra: Record<string, string> = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(body);
}
const html = (res: ServerResponse, status: number, body: string) => send(res, status, 'text/html; charset=utf-8', body);
const json = (res: ServerResponse, status: number, body: unknown) =>
  send(res, status, 'application/json; charset=utf-8', JSON.stringify(body));

// Pre-compressed siblings (`<file>.br`, `<file>.gz`) are written by
// `npm run vendor`. Keep COMPRESSIBLE in sync with scripts/vendor-ocr.mjs.
export const COMPRESSIBLE = /\.(?:js|wasm|css|txt|svg)$/;
const ENCODINGS = [
  ['br', '.br'],
  ['gzip', '.gz'],
] as const;

/** Parse Accept-Encoding (RFC 9110 §12.5.3) into coding -> q. */
function acceptedCodings(header: string | string[] | undefined): Map<string, number> {
  const out = new Map<string, number>();
  for (const part of String(header ?? '').split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    if (!name) continue;
    let q = 1;
    for (const p of params) {
      const m = /^\s*q\s*=\s*([0-9.]+)\s*$/.exec(p);
      if (m) q = Number(m[1]);
    }
    out.set(name.trim(), Number.isFinite(q) ? q : 0);
  }
  return out;
}

/** Pick the best pre-compressed variant on disk the client accepts, or null for identity. */
export function negotiateEncoding(header: string | string[] | undefined, file: string): { coding: string; path: string } | null {
  const acc = acceptedCodings(header);
  const star = acc.get('*');
  for (const [coding, ext] of ENCODINGS) {
    const q = acc.get(coding) ?? (coding === 'gzip' ? acc.get('x-gzip') : undefined) ?? star ?? 0;
    if (q <= 0) continue;
    const path = file + ext;
    if (existsSync(path) && statSync(path).isFile()) return { coding, path };
  }
  return null;
}

function serveStatic(req: IncomingMessage, res: ServerResponse, urlPath: string): boolean {
  const rel = normalize(decodeURIComponent(urlPath.replace(/^\/static\//, ''))).replace(/^([/\\])+/, '');
  const file = join(PUBLIC, 'static', rel);
  if (!file.startsWith(join(PUBLIC, 'static') + sep)) return false;
  if (!existsSync(file) || !statSync(file).isFile()) return false;
  // Content-Type always comes from the original file, never the .br/.gz sibling.
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  const compressible = COMPRESSIBLE.test(file);
  const variant = compressible ? negotiateEncoding(req.headers['accept-encoding'], file) : null;
  const body = variant?.path ?? file;
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': type,
    'Content-Length': String(statSync(body).size),
    'Cache-Control': rel.startsWith('vendor/') ? 'public, max-age=86400' : 'no-cache',
    ...(compressible ? { Vary: 'Accept-Encoding' } : {}),
    ...(variant ? { 'Content-Encoding': variant.coding } : {}),
  });
  if (req.method === 'HEAD') res.end();
  else createReadStream(body).pipe(res);
  return true;
}

export function createApp(cfg: Config, opts: AppOptions = {}): App {
  const env = opts.env ?? process.env;
  const db = opts.db ?? openDb(cfg.databasePath);
  const dataDir = opts.dataDir === undefined ? (cfg.databasePath === ':memory:' ? null : dirname(cfg.databasePath)) : opts.dataDir;
  const pauseFile = dataDir ? join(dataDir, 'INTAKE_PAUSED') : null;
  const journal = dataDir ? join(dataDir, 'deletions.journal') : null;
  const keys = new Keys(cfg.hmacKey);

  journalReapply(db, journal);
  // Deletions re-applied above (or a restored backup) can change membership.
  reconcileReviews(db, keys);
  const dedup = new ConnectionDedup();
  const maintenance = () => {
    expireSenderTokens(db, cfg.senderTokenTtlDays);
    expireFilings(db);
    dedup.sweep();
  };
  maintenance();
  const timer = setInterval(maintenance, 3_600_000);
  timer.unref();

  const submitLimiter = new WindowLimiter(keys, cfg.submitPerIpPerHour, 3_600_000);
  const previewLimiter = new WindowLimiter(keys, cfg.submitPerIpPerHour * 10, 3_600_000);
  const deleteLimiter = new WindowLimiter(keys, cfg.deletePerIpPerHour, 3_600_000);
  const flagLimiter = new WindowLimiter(keys, cfg.flagPerIpPerHour, 3_600_000);

  const ctx = (): PageCtx => ({ cfg, paused: intakePaused(env, pauseFile) });

  const doDelete = (code: unknown) => {
    const out = deleteReport(db, code);
    if (out.body.status === 'deleted') {
      const r = normalizeReceipt(code);
      if (r) journalAppend(journal, sha256hex(r));
      // A deletion that changes a reviewed pattern's membership sends it back to review.
      reconcileReviews(db, keys);
    }
    return out;
  };

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = req.method ?? 'GET';
    const client = resolveClient(req, cfg.trustedProxies, cfg.clientIpHeader);
    const ip = client.ip;

    // Image or multipart bodies are never accepted anywhere: the screenshot
    // is processed in the browser and must not reach this server.
    const ct = contentType(req);
    if (method !== 'GET' && method !== 'HEAD' && (ct.startsWith('image/') || ct.startsWith('multipart/'))) {
      req.resume();
      throw new HttpError(415, 'Images and file uploads are not accepted. Screenshots are read on your device.');
    }

    if ((method === 'GET' || method === 'HEAD') && path.startsWith('/static/')) {
      if (serveStatic(req, res, path)) return;
      throw new HttpError(404, 'Not found.');
    }

    if (method === 'GET' || method === 'HEAD') {
      switch (path) {
        case '/': {
          const rangeQ = url.searchParams.get('range') ?? '90';
          const range: RangeKey = (RANGES.map((r) => r[0]) as string[]).includes(rangeQ) ? (rangeQ as RangeKey) : '90';
          const viewQ = url.searchParams.get('view');
          const view: OverviewParams['view'] = viewQ === 'map' || viewQ === 'table' ? viewQ : 'both';
          const st = url.searchParams.get('state');
          const ac = url.searchParams.get('ac');
          const p: OverviewParams = {
            range,
            view,
            state: st && /^[A-Z]{2}$/.test(st) ? st : null,
            ac: ac && /^\d{3}$/.test(ac) ? ac : null,
            sort: url.searchParams.get('sort') === 'code' ? 'code' : 'count',
          };
          const { from, to } = rangeDays(range);
          const counts = areaCodeCounts(db, from, to);
          const earliest = (db.prepare('SELECT MIN(created_day) AS d FROM reports WHERE counted = 1').get() as { d: string | null }).d;
          return html(res, 200, overviewPage(ctx(), p, counts, earliest, publicPatterns(db, keys)));
        }
        case '/report':
          return html(res, 200, reportPage(ctx()));
        case '/report/complete':
          return html(res, 200, reportCompletePage(ctx()));
        case '/delete':
          return html(res, 200, deletePage(ctx(), { kind: 'form' }));
        case '/patterns':
          return html(res, 200, patternsPage(ctx(), publicPatterns(db, keys)));
        case '/data':
          return html(res, 200, dataPage(ctx()));
        case '/data/schema.json':
          return json(res, 200, AGGREGATE_SCHEMA);
        case '/privacy':
          return html(res, 200, privacyPage(ctx()));
        case '/methodology':
          return html(res, 200, methodologyPage(ctx()));
        case '/project':
          return html(res, 200, projectPage(ctx()));
        case '/junk-mail':
          return html(res, 200, junkMailPage(ctx()));
        case '/offline':
          return html(res, 200, offlinePage(ctx()));
        case '/manifest.webmanifest':
          return send(res, 200, 'application/manifest+json', JSON.stringify(MANIFEST), { 'Cache-Control': 'no-cache' });
        case '/sw.js':
          // Root path so the worker's scope is the whole site. no-cache so a
          // new release's worker is picked up on the next visit.
          return send(res, 200, 'text/javascript; charset=utf-8', SW_SOURCE, { 'Cache-Control': 'no-cache' });
        case '/favicon.ico':
          res.writeHead(204, { ...SECURITY_HEADERS, 'Cache-Control': 'public, max-age=86400' });
          return void res.end();
        case '/robots.txt':
          return send(res, 200, 'text/plain; charset=utf-8', 'User-agent: *\nDisallow: /api/\nDisallow: /delete\n');
        case '/healthz':
          return json(res, 200, { ok: true, intake: intakePaused(env, pauseFile) ? 'paused' : 'open', mode: cfg.intakeMode });
      }
      const m = /^\/patterns\/([a-z0-9-]{4,40})$/.exec(path);
      if (m) {
        const p = publicPatterns(db, keys).find((x) => x.id === m[1]) ?? null;
        return html(res, p ? 200 : 404, patternDetailPage(ctx(), p));
      }
      throw new HttpError(404, 'Not found.');
    }

    if (method !== 'POST') throw new HttpError(405, 'Method not allowed.');

    switch (path) {
      case '/api/preview': {
        if (intakePaused(env, pauseFile)) return json(res, 503, { status: 'paused', message: MSG.paused });
        if (!previewLimiter.take(ip)) return json(res, 429, { status: 'rate_limited', message: MSG.rateLimited });
        const body = await jsonBody(req);
        const r = prepare(keys, body);
        if ('errors' in r) return json(res, 400, { status: 'invalid', errors: r.errors });
        return json(res, 200, { status: 'ok', preview: r.preview });
      }
      case '/api/reports': {
        if (intakePaused(env, pauseFile)) return json(res, 503, { status: 'paused', message: MSG.paused });
        const body = await jsonBody(req);
        const out = fileReport(
          {
            db,
            keys,
            duplicateWindowHours: cfg.duplicateWindowHours,
            globalDailySubmissions: cfg.globalDailySubmissions,
            allowNewFiling: () => submitLimiter.take(ip),
            // Guard: only a real (trusted-derived) client address may feed the
            // same-connection check; the raw proxy peer would be one global key.
            seenFromConnection: client.trusted ? (token, hash) => dedup.check(netId(ip), token, hash) : undefined,
          },
          body,
        );
        // A new report can change a reviewed pattern's templates: back to review.
        if (out.http === 201) reconcileReviews(db, keys);
        return json(res, out.http, out.body);
      }
      case '/api/delete': {
        if (!deleteLimiter.take(ip)) return json(res, 429, { status: 'rate_limited', message: 'Too many attempts. Try again later.' });
        const body = await jsonBody(req);
        const out = doDelete(body.code);
        return json(res, out.http, out.body);
      }
      case '/api/flag': {
        if (!flagLimiter.take(ip)) return json(res, 429, { status: 'rate_limited', message: 'Too many flags. Try again later.' });
        const out = fileFlag(db, await jsonBody(req));
        return json(res, out.http, out.body);
      }
      case '/delete': {
        const f = await formBody(req);
        if (!deleteLimiter.take(ip)) {
          return html(res, 429, deletePage(ctx(), { kind: 'form', error: 'Too many attempts. Try again later.' }));
        }
        const code = normalizeReceipt(f.code);
        if (!code) {
          return html(res, 400, deletePage(ctx(), { kind: 'form', error: 'Enter the 32-character receipt code you saved when you filed the report.' }));
        }
        if (f.step !== 'delete') return html(res, 200, deletePage(ctx(), { kind: 'confirm', code }));
        const out = doDelete(code);
        if (out.body.status === 'invalid') return html(res, 400, deletePage(ctx(), { kind: 'form', error: out.body.message }));
        return html(res, out.http, deletePage(ctx(), { kind: 'result', status: out.body.status, message: out.body.message }));
      }
      case '/flag': {
        const f = await formBody(req);
        if (!flagLimiter.take(ip)) return html(res, 429, privacyPage(ctx(), { ok: false, message: 'Too many flags. Try again later.' }));
        const out = fileFlag(db, f);
        const message =
          out.http === 200
            ? String(out.body.message)
            : Object.values((out.body.errors as Record<string, string>) ?? {}).join(' ') || 'Check the form.';
        return html(res, out.http, privacyPage(ctx(), { ok: out.http === 200, message }));
      }
    }
    throw new HttpError(404, 'Not found.');
  }

  function handle(req: IncomingMessage, res: ServerResponse): void {
    route(req, res).catch((e: unknown) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (e instanceof HttpError) {
        const wantsJson = (req.url ?? '').startsWith('/api/');
        if (wantsJson) return json(res, e.status, { status: 'error', message: e.message });
        return html(res, e.status, simplePage(ctx(), 'Error', `<h1>${esc(e.status === 404 ? 'Page not found' : 'Request not accepted')}</h1><p>${esc(e.message)}</p><p><a href="/">Back to overview</a></p>`));
      }
      process.stderr.write(`internal error: ${e instanceof Error ? e.name : 'unknown'}\n`);
      return json(res, 500, { status: 'error', message: 'Something went wrong. Nothing was changed. Try again.' });
    });
  }

  const close = () => {
    clearInterval(timer);
    for (const l of [submitLimiter, previewLimiter, deleteLimiter, flagLimiter]) l.stop();
  };

  return { handle, db, keys, dedup, close };
}
