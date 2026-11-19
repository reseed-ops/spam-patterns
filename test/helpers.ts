import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp, type App } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { prepare, type ReportInput } from '../src/filing.ts';

export const TEST_KEY = 'a3f1'.repeat(16);

export interface TestServer {
  app: App;
  base: string;
  server: Server;
  env: NodeJS.ProcessEnv;
  dataDir: string;
  close: () => Promise<void>;
}

export async function startServer(envOverrides: Record<string, string> = {}): Promise<TestServer> {
  const dataDir = mkdtempSync(join(tmpdir(), 'stm-test-'));
  const env: NodeJS.ProcessEnv = {
    STM_HMAC_KEY: TEST_KEY,
    STM_DATABASE_PATH: join(dataDir, 'test.sqlite'),
    STM_SUBMIT_PER_IP_PER_HOUR: '1000',
    STM_GLOBAL_DAILY_SUBMISSIONS: '1000',
    ...envOverrides,
  };
  const cfg = loadConfig(env);
  const app = createApp(cfg, { env, db: openDb(cfg.databasePath), dataDir });
  const server = createServer(app.handle);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no address');
  return {
    app,
    env,
    dataDir,
    server,
    base: `http://127.0.0.1:${addr.port}`,
    close: () => new Promise((r) => server.close(() => r())),
  };
}

export async function postJson(base: string, path: string, body: unknown) {
  const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const text = await r.text();
  return { status: r.status, text, json: JSON.parse(text) as Record<string, any>, headers: r.headers };
}

export async function postForm(base: string, path: string, body: Record<string, string>) {
  const r = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  return { status: r.status, text: await r.text(), headers: r.headers };
}

export async function get(base: string, path: string) {
  const r = await fetch(base + path);
  return { status: r.status, text: await r.text(), headers: r.headers };
}

export function idemKey(): string {
  return randomBytes(18).toString('base64url');
}

/** Preview then file, the way the browser does. Returns the filing response. */
export async function previewAndFile(base: string, input: ReportInput, key = idemKey()) {
  const pv = await postJson(base, '/api/preview', input);
  if (pv.status !== 200) throw new Error(`preview failed: ${pv.text}`);
  const filed = await postJson(base, '/api/reports', { ...input, previewHash: pv.json.preview.previewHash, idempotencyKey: key });
  return { preview: pv, filed, key };
}

export function previewHashFor(keys: App['keys'], input: ReportInput): string {
  const p = prepare(keys, input);
  if ('errors' in p) throw new Error(JSON.stringify(p.errors));
  return p.preview.previewHash;
}

export function countReports(app: App): number {
  return Number((app.db.prepare('SELECT COUNT(*) AS n FROM reports').get() as { n: number }).n);
}
