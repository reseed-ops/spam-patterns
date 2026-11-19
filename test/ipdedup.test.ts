// v0.1.3: trusted-proxy client address, same-connection in-memory dedup,
// and scheduled rate-limit cleanup. Synthetic data only (555-01XX numbers,
// documentation address ranges).
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { createApp, type App } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { Keys } from '../src/crypto.ts';
import { openDb } from '../src/db.ts';
import { ConnectionDedup, DEDUP_TTL_MS } from '../src/dedup.ts';
import { fileReport, MSG } from '../src/filing.ts';
import { WindowLimiter, clientIp, netId, resolveClient } from '../src/ratelimit.ts';
import { TEST_KEY, get, idemKey, previewHashFor } from './helpers.ts';

// Exactly the production values set in v0.1.3 (see IPDEDUP-STATUS.md).
const PROD_PROXIES = Array.from({ length: 21 }, (_, i) => `100.64.0.${i + 1}`).join(',');
const PROD_ENV = { STM_TRUSTED_PROXIES: PROD_PROXIES, STM_CLIENT_IP_HEADER: 'x-real-ip' };

const INPUT = { number: '(214) 555-0101', message: 'Free roof quote for your home this week?', category: 'roofing' };

function fakeReq(remoteAddress: string, headers: Record<string, string | string[]> = {}): IncomingMessage {
  return { socket: { remoteAddress }, headers } as unknown as IncomingMessage;
}

// ---------------- clientIp / resolveClient ----------------

describe('clientIp: untrusted config behaves exactly as before', () => {
  it('returns the socket peer whatever the headers say', () => {
    const r = fakeReq('::ffff:198.51.100.4', { 'x-forwarded-for': '203.0.113.9', 'x-real-ip': '203.0.113.9' });
    assert.deepEqual(resolveClient(r, []), { ip: '198.51.100.4', trusted: false });
    assert.deepEqual(resolveClient(r, [], 'x-real-ip'), { ip: '198.51.100.4', trusted: false });
    assert.equal(clientIp(r, []), '198.51.100.4');
  });
  it('a peer that is not listed is the client, even when proxies are configured', () => {
    const r = fakeReq('198.51.100.4', { 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '203.0.113.9' });
    assert.deepEqual(resolveClient(r, ['100.64.0.1'], 'x-real-ip'), { ip: '198.51.100.4', trusted: false });
    assert.deepEqual(resolveClient(r, ['100.64.0.1']), { ip: '198.51.100.4', trusted: false });
  });
});

describe('clientIp: X-Forwarded-For walk from a trusted proxy', () => {
  const T = ['10.0.0.1', '10.0.0.2'];
  it('skips forged entries on the left', () => {
    const r = fakeReq('10.0.0.1', { 'x-forwarded-for': '6.6.6.6, 7.7.7.7, 203.0.113.9' });
    assert.deepEqual(resolveClient(r, T), { ip: '203.0.113.9', trusted: true });
  });
  it('skips other trusted proxies on the right, and joins repeated header lines', () => {
    const r = fakeReq('10.0.0.1', { 'x-forwarded-for': ['6.6.6.6', '203.0.113.9, 10.0.0.2'] });
    assert.deepEqual(resolveClient(r, T), { ip: '203.0.113.9', trusted: true });
  });
  it('rejects an unparseable selected value to the socket peer (no further walking left)', () => {
    const r = fakeReq('10.0.0.1', { 'x-forwarded-for': '203.0.113.9, not-an-ip' });
    assert.deepEqual(resolveClient(r, T), { ip: '10.0.0.1', trusted: false });
  });
  it('missing header, or only trusted entries, gives the untrusted peer', () => {
    assert.deepEqual(resolveClient(fakeReq('10.0.0.1'), T), { ip: '10.0.0.1', trusted: false });
    assert.deepEqual(resolveClient(fakeReq('10.0.0.1', { 'x-forwarded-for': '10.0.0.2' }), T), { ip: '10.0.0.1', trusted: false });
  });
});

describe('clientIp: X-Real-IP from a trusted proxy (production mode)', () => {
  const T = PROD_PROXIES.split(',');
  it('uses the proxy-set value and ignores X-Forwarded-For entirely', () => {
    const r = fakeReq('100.64.0.7', { 'x-real-ip': '203.0.113.9', 'x-forwarded-for': '6.6.6.6, 203.0.113.9' });
    assert.deepEqual(resolveClient(r, T, 'x-real-ip'), { ip: '203.0.113.9', trusted: true });
  });
  it('accepts IPv6 client addresses', () => {
    const r = fakeReq('100.64.0.7', { 'x-real-ip': '2001:db8:1:2::abcd' });
    assert.deepEqual(resolveClient(r, T, 'x-real-ip'), { ip: '2001:db8:1:2::abcd', trusted: true });
  });
  it('rejects unparseable, repeated or proxy-valued headers to the socket peer', () => {
    for (const v of ['not-an-ip', '', '203.0.113.9, 6.6.6.6', '203.0.113.9 x', '100.64.0.3']) {
      assert.deepEqual(resolveClient(fakeReq('100.64.0.7', { 'x-real-ip': v }), T, 'x-real-ip'), { ip: '100.64.0.7', trusted: false }, v);
    }
    assert.deepEqual(resolveClient(fakeReq('100.64.0.7'), T, 'x-real-ip'), { ip: '100.64.0.7', trusted: false });
  });
  it('a peer just outside the observed pool is not trusted (exact match, fails closed)', () => {
    const r = fakeReq('100.64.0.22', { 'x-real-ip': '203.0.113.9' });
    assert.deepEqual(resolveClient(r, T, 'x-real-ip'), { ip: '100.64.0.22', trusted: false });
  });
});

describe('config: trusted proxies are exact addresses', () => {
  it('rejects CIDR, ranges and wildcards; validates the header name', () => {
    for (const v of ['100.64.0.0/10', '100.64.0.*', '100.64.0.1-21', 'proxy.internal']) {
      assert.throws(() => loadConfig({ STM_HMAC_KEY: TEST_KEY, STM_TRUSTED_PROXIES: v }), /exact IP addresses/, v);
    }
    assert.throws(() => loadConfig({ STM_HMAC_KEY: TEST_KEY, STM_CLIENT_IP_HEADER: 'forwarded' }), /STM_CLIENT_IP_HEADER/);
    const c = loadConfig({ STM_HMAC_KEY: TEST_KEY, ...PROD_ENV });
    assert.equal(c.trustedProxies.length, 21);
    assert.equal(c.clientIpHeader, 'x-real-ip');
    assert.equal(loadConfig({ STM_HMAC_KEY: TEST_KEY }).clientIpHeader, 'x-forwarded-for');
  });
});

describe('netId', () => {
  it('IPv4 is the address; IPv6 is the /64, whatever the notation', () => {
    assert.equal(netId('203.0.113.9'), '4:203.0.113.9');
    assert.equal(netId('::ffff:203.0.113.9'), '4:203.0.113.9');
    assert.equal(netId('2001:db8:1:2::abcd'), netId('2001:0DB8:0001:0002:ffff:1:2:3'));
    assert.equal(netId('2001:db8:1:2::abcd'), '6:2001:0db8:0001:0002::/64');
    assert.notEqual(netId('2001:db8:1:2::1'), netId('2001:db8:1:3::1'));
    assert.equal(netId('::1'), '6:0000:0000:0000:0000::/64');
    assert.notEqual(netId('203.0.113.9'), netId('203.0.113.10'));
  });
});

// ---------------- ConnectionDedup ----------------

describe('ConnectionDedup', () => {
  it('same code inside the TTL is a hit; a different netId, sender or template is not', () => {
    const d = new ConnectionDedup();
    const t0 = 1_000_000;
    assert.equal(d.check('4:203.0.113.9', 'tok', 'hash', t0), false);
    assert.equal(d.check('4:203.0.113.9', 'tok', 'hash', t0 + 6 * 86_400_000), true);
    assert.equal(d.check('4:203.0.113.10', 'tok', 'hash', t0 + 1000), false);
    assert.equal(d.check('4:203.0.113.9', 'tok2', 'hash', t0 + 1000), false);
    assert.equal(d.check('4:203.0.113.9', 'tok', 'hash2', t0 + 1000), false);
  });
  it('an expired entry counts again, and sweep() drops it without a lookup', () => {
    const d = new ConnectionDedup();
    assert.equal(d.check('n', 't', 'h', 0), false);
    assert.equal(d.check('n', 't', 'h', DEDUP_TTL_MS), false); // expiresAt <= now: expired
    d.sweep(2 * DEDUP_TTL_MS);
    assert.equal(d.size, 0);
  });
  it('codes are keyed per process: two instances never agree', () => {
    const a = new ConnectionDedup();
    const b = new ConnectionDedup();
    a.check('n', 't', 'h', 0);
    assert.equal(b.check('n', 't', 'h', 1), false);
  });
});

describe('fileReport: same-connection hook', () => {
  it('a hit stores counted = 0 and returns the normal filed response', () => {
    const db = openDb(':memory:');
    const keys = new Keys(Buffer.from(TEST_KEY, 'hex'));
    const ctx = (seen: boolean | undefined, now: Date) => ({
      db,
      keys,
      duplicateWindowHours: 24,
      globalDailySubmissions: 1000,
      allowNewFiling: () => true,
      seenFromConnection: seen === undefined ? undefined : () => seen,
      now,
    });
    const body = () => ({ ...INPUT, previewHash: previewHashFor(keys, INPUT), idempotencyKey: idemKey() });
    const a = fileReport(ctx(false, new Date('2026-11-01T12:00:00Z')), body());
    const b = fileReport(ctx(true, new Date('2026-11-03T12:00:00Z')), body());
    const c = fileReport(ctx(undefined, new Date('2026-11-05T12:00:00Z')), body());
    for (const o of [a, b, c]) {
      assert.equal(o.http, 201);
      assert.equal(o.body.status, 'filed');
      assert.equal((o.body as { message: string }).message, MSG.filed);
    }
    const rows = db.prepare('SELECT counted FROM reports ORDER BY created_at').all() as Array<{ counted: number }>;
    assert.deepEqual(rows.map((r) => r.counted), [1, 0, 1]);
  });
});

// ---------------- through the HTTP app ----------------

interface PeerServer {
  app: App;
  base: string;
  close: () => Promise<void>;
}

/** Starts the app with a fixed socket peer (simulating Railway's edge), config as given. */
async function startWithPeer(env: Record<string, string>, peer: string | null): Promise<PeerServer> {
  const dataDir = mkdtempSync(join(tmpdir(), 'stm-ipd-'));
  const full: NodeJS.ProcessEnv = {
    STM_HMAC_KEY: TEST_KEY,
    STM_DATABASE_PATH: join(dataDir, 'test.sqlite'),
    STM_SUBMIT_PER_IP_PER_HOUR: '1000',
    STM_GLOBAL_DAILY_SUBMISSIONS: '1000',
    ...env,
  };
  const cfg = loadConfig(full);
  const app = createApp(cfg, { env: full, db: openDb(cfg.databasePath), dataDir });
  const server = createServer(app.handle);
  if (peer) server.on('connection', (s) => Object.defineProperty(s, 'remoteAddress', { value: peer }));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no address');
  return {
    app,
    base: `http://127.0.0.1:${addr.port}`,
    close: () =>
      new Promise((r) => {
        app.close();
        server.closeAllConnections();
        server.close(() => r());
      }),
  };
}

async function post(base: string, path: string, body: unknown, headers: Record<string, string> = {}) {
  const r = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  return { status: r.status, text, json: JSON.parse(text) as Record<string, any>, headers: r.headers };
}

async function file(s: PeerServer, headers: Record<string, string>, input = INPUT) {
  const pv = await post(s.base, '/api/preview', input, headers);
  assert.equal(pv.status, 200, pv.text);
  return post(s.base, '/api/reports', { ...input, previewHash: pv.json.preview.previewHash, idempotencyKey: idemKey() }, headers);
}

/** Moves every stored report back two days, past the 24-hour database window. */
function ageAll(app: App) {
  const old = new Date(Date.now() - 2 * 86_400_000).toISOString();
  app.db.prepare('UPDATE reports SET created_at = ?').run(old);
}

function counted(app: App): number[] {
  return (app.db.prepare('SELECT counted FROM reports ORDER BY rowid').all() as Array<{ counted: number }>).map((r) => r.counted);
}

describe('app, configured exactly as production, behind a simulated Railway edge', () => {
  let s: PeerServer;
  before(async () => (s = await startWithPeer(PROD_ENV, '100.64.0.7')));
  after(() => s.close());

  it('same connection, same report, after the 24-hour window: stored, not counted, normal response', async () => {
    const a = await file(s, { 'x-real-ip': '203.0.113.20' });
    ageAll(s.app);
    const b = await file(s, { 'x-real-ip': '203.0.113.20' });
    assert.deepEqual(counted(s.app), [1, 0]);
    // Indistinguishable: same status, same body except the per-filing receipt, same headers.
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    const strip = (j: Record<string, any>) => ({ ...j, receipt: typeof j.receipt === 'string' && j.receipt.length });
    assert.deepEqual(strip(b.json), strip(a.json));
    const hdrs = (h: Headers) => [...h.entries()].filter(([k]) => k !== 'date');
    assert.deepEqual(hdrs(b.headers), hdrs(a.headers));
  });

  it('a different connection (IPv4 address) counts', async () => {
    ageAll(s.app);
    await file(s, { 'x-real-ip': '203.0.113.21' });
    assert.equal(counted(s.app).at(-1), 1);
  });

  it('IPv6 addresses in the same /64 are one connection; another /64 counts', async () => {
    const inp = { ...INPUT, number: '(305) 555-0102' };
    ageAll(s.app);
    await file(s, { 'x-real-ip': '2001:db8:aa:1::1' }, inp);
    ageAll(s.app);
    await file(s, { 'x-real-ip': '2001:db8:aa:1:ffff::2' }, inp);
    ageAll(s.app);
    await file(s, { 'x-real-ip': '2001:db8:aa:2::1' }, inp);
    assert.deepEqual(counted(s.app).slice(-3), [1, 0, 1]);
  });

  it('a forged left-side X-Forwarded-For cannot choose the rate-limit bucket', async () => {
    const t = await startWithPeer({ ...PROD_ENV, STM_SUBMIT_PER_IP_PER_HOUR: '1' }, '100.64.0.7');
    try {
      // Railway sets X-Real-IP; the client controls only the left of XFF.
      const real = { 'x-real-ip': '203.0.113.30' };
      assert.equal((await file(t, { ...real, 'x-forwarded-for': '6.6.6.1, 203.0.113.30' })).status, 201);
      const r2 = await file(t, { ...real, 'x-forwarded-for': '6.6.6.2, 203.0.113.30' }, { ...INPUT, number: '(305) 555-0102' });
      assert.equal(r2.status, 429);
      const r3 = await file(t, { ...real, 'x-forwarded-for': '6.6.6.3' }, { ...INPUT, number: '(602) 555-0103' });
      assert.equal(r3.status, 429);
      // A different real client still has its own bucket.
      assert.equal((await file(t, { 'x-real-ip': '203.0.113.31' }, { ...INPUT, number: '(602) 555-0103' })).status, 201);
    } finally {
      await t.close();
    }
  });

  it('pages carry the same-connection copy when trusted proxies are configured', async () => {
    const p = (await get(s.base, '/privacy')).text;
    assert.match(p, /up to 7 days \(reset when the server restarts\) to spot the same report filed again from the same connection/);
    assert.match(p, /created when the server starts and is never saved/);
    assert.match(p, /Reports from different connections cannot be linked/);
    assert.match(p, /several networks or a VPN/);
    assert.match(p, /sharing a mobile carrier’s connection may occasionally have a genuine report not counted/);
    assert.match(p, /docs\.railway\.com\/observability\/logs/);
    assert.match(p, /There are no accounts, cookies, analytics, tracking pixels, or third-party scripts\./);
    const m = (await get(s.base, '/methodology')).text;
    assert.match(m, /or the same sender hash, template and connection within 7 days, while the server has been running/);
  });
});

describe('guard: no trusted-derived address, no dedup effect', () => {
  it('production config but the peer is not a listed proxy (forged X-Real-IP ignored)', async () => {
    const s = await startWithPeer(PROD_ENV, null); // peer is 127.0.0.1
    try {
      await file(s, { 'x-real-ip': '203.0.113.40' });
      ageAll(s.app);
      await file(s, { 'x-real-ip': '203.0.113.40' });
      assert.deepEqual(counted(s.app), [1, 1]);
      assert.equal(s.app.dedup.size, 0);
    } finally {
      await s.close();
    }
  });
  it('no trusted proxies at all (every request is the raw proxy peer): 24-hour rule only', async () => {
    const s = await startWithPeer({}, '100.64.0.7');
    try {
      await file(s, {});
      ageAll(s.app);
      await file(s, {});
      assert.deepEqual(counted(s.app), [1, 1]);
      assert.equal(s.app.dedup.size, 0);
      // The 24-hour database rule is unchanged.
      await file(s, {});
      assert.deepEqual(counted(s.app), [1, 1, 0]);
      const p = (await get(s.base, '/privacy')).text;
      assert.doesNotMatch(p, /same connection/);
      assert.match(p, /held in memory as a keyed code for up to an hour for rate limits/);
      assert.doesNotMatch((await get(s.base, '/methodology')).text, /within 7 days, while the server/);
    } finally {
      await s.close();
    }
  });
  it('trusted peer with an unparseable X-Real-IP falls back to the peer, untrusted', async () => {
    const s = await startWithPeer(PROD_ENV, '100.64.0.7');
    try {
      await file(s, { 'x-real-ip': 'garbage' });
      ageAll(s.app);
      await file(s, { 'x-real-ip': 'garbage' });
      assert.deepEqual(counted(s.app), [1, 1]);
      assert.equal(s.app.dedup.size, 0);
    } finally {
      await s.close();
    }
  });
});

describe('rate limiter: scheduled cleanup', () => {
  it('empties expired buckets at the end of the window without a request', async () => {
    const keys = new Keys(Buffer.from(TEST_KEY, 'hex'));
    const l = new WindowLimiter(keys, 5, 60);
    try {
      l.take('203.0.113.1');
      l.take('203.0.113.2');
      assert.equal(l.size, 2);
      await new Promise((r) => setTimeout(r, 150));
      assert.equal(l.size, 0);
      // And keeps doing so for the following windows.
      l.take('203.0.113.3');
      assert.equal(l.size, 1);
      await new Promise((r) => setTimeout(r, 150));
      assert.equal(l.size, 0);
    } finally {
      l.stop();
    }
  });
  it('can be built without a timer (lazy clearing still works)', () => {
    const keys = new Keys(Buffer.from(TEST_KEY, 'hex'));
    const l = new WindowLimiter(keys, 1, 1000, { schedule: false });
    assert.equal(l.take('x', Date.now()), true);
    assert.equal(l.take('x', Date.now()), false);
    assert.equal(l.take('x', Date.now() + 1001), true);
  });
});
