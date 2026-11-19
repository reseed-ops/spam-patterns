// v0.1.8: CIDR matching and the Cloudflare proxy-trust chain
// (STM_CLIENT_IP_HEADER=cf-connecting-ip + STM_UPSTREAM_CIDRS). Synthetic
// data only: 555-01XX numbers; client addresses from documentation ranges
// (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24, 2001:db8::/32). The
// Cloudflare addresses used are inside Cloudflare's published ranges.
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { createApp, type App } from '../src/app.ts';
import { inCidrs, ipValue, parseCidr, parseCidrList } from '../src/cidr.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { resolveClient } from '../src/ratelimit.ts';
import { TEST_KEY, idemKey } from './helpers.ts';

// Cloudflare's published ranges (https://www.cloudflare.com/ips/, fetched 2026-11-19).
const CF_V4 =
  '173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22';
const CF_V6 = '2400:cb00::/32,2606:4700::/32,2803:f800::/32,2405:b500::/32,2405:8100::/32,2a06:98c0::/29,2c0f:f248::/32';
const CF_LIST = `${CF_V4},${CF_V6}`;
const CF = parseCidrList(CF_LIST);

// The production peers (v0.1.3) and the v0.1.8 Cloudflare configuration.
const PROD_PROXIES = Array.from({ length: 21 }, (_, i) => `100.64.0.${i + 1}`).join(',');
const T = PROD_PROXIES.split(',');
const OLD_ENV = { STM_TRUSTED_PROXIES: PROD_PROXIES, STM_CLIENT_IP_HEADER: 'x-real-ip' };
const CF_ENV = { STM_TRUSTED_PROXIES: PROD_PROXIES, STM_CLIENT_IP_HEADER: 'cf-connecting-ip', STM_UPSTREAM_CIDRS: CF_LIST };

const CF_EGRESS_A = '162.158.10.1';
const CF_EGRESS_B = '172.70.1.2';
const CF_EGRESS_V6 = '2a06:98c0:3600::103';

function fakeReq(remoteAddress: string, headers: Record<string, string | string[]> = {}): IncomingMessage {
  return { socket: { remoteAddress }, headers } as unknown as IncomingMessage;
}

// ---------------- CIDR parsing and matching ----------------

describe('cidr: IPv4 matching', () => {
  it('includes both edges of a range and excludes the addresses just outside', () => {
    const l = [parseCidr('162.158.0.0/15')];
    assert.equal(inCidrs('162.158.0.0', l), true);
    assert.equal(inCidrs('162.159.255.255', l), true);
    assert.equal(inCidrs('162.157.255.255', l), false);
    assert.equal(inCidrs('162.160.0.0', l), false);
    const s = [parseCidr('173.245.48.0/20')];
    assert.equal(inCidrs('173.245.63.255', s), true);
    assert.equal(inCidrs('173.245.64.0', s), false);
  });
  it('/32 matches exactly one address; /1 matches half the space', () => {
    const one = [parseCidr('203.0.113.9/32')];
    assert.equal(inCidrs('203.0.113.9', one), true);
    assert.equal(inCidrs('203.0.113.8', one), false);
    assert.equal(inCidrs('203.0.113.10', one), false);
    const half = [parseCidr('128.0.0.0/1')];
    assert.equal(inCidrs('128.0.0.0', half), true);
    assert.equal(inCidrs('255.255.255.255', half), true);
    assert.equal(inCidrs('127.255.255.255', half), false);
  });
  it('IPv4-mapped IPv6 input is matched as IPv4', () => {
    assert.equal(inCidrs('::ffff:104.16.0.1', CF), true);
    assert.equal(inCidrs('::FFFF:104.16.0.1', CF), true);
    assert.deepEqual(ipValue('::ffff:1.2.3.4'), ipValue('1.2.3.4'));
  });
});

describe('cidr: IPv6 matching', () => {
  it('edges of a /29 and a /32', () => {
    const l = [parseCidr('2a06:98c0::/29')];
    assert.equal(inCidrs('2a06:98c0::', l), true);
    assert.equal(inCidrs('2a06:98c7:ffff:ffff:ffff:ffff:ffff:ffff', l), true);
    assert.equal(inCidrs('2a06:98bf:ffff:ffff:ffff:ffff:ffff:ffff', l), false);
    assert.equal(inCidrs('2a06:98c8::', l), false);
    const m = [parseCidr('2606:4700::/32')];
    assert.equal(inCidrs('2606:4700:ffff::1', m), true);
    assert.equal(inCidrs('2606:4701::', m), false);
  });
  it('notation does not matter (case, zero padding, compression)', () => {
    const l = [parseCidr('2400:CB00::/32')];
    assert.equal(inCidrs('2400:cb00:0000:0000:0000:0000:0000:0001', l), true);
    assert.equal(inCidrs('2400:CB00::1', l), true);
  });
  it('/128 matches exactly one address', () => {
    const l = [parseCidr('2001:db8::1/128')];
    assert.equal(inCidrs('2001:db8::1', l), true);
    assert.equal(inCidrs('2001:db8::2', l), false);
  });
  it('families never cross-match', () => {
    assert.equal(inCidrs('::a29e:a01', [parseCidr('162.158.0.0/15')]), false);
    assert.equal(inCidrs('36.0.203.0', [parseCidr('2400:cb00::/32')]), false);
  });
});

describe('cidr: the Cloudflare list', () => {
  it('parses all 22 published entries', () => {
    assert.equal(CF.length, 22);
    assert.equal(CF.filter((c) => c.family === 4).length, 15);
    assert.equal(CF.filter((c) => c.family === 6).length, 7);
  });
  it('matches Cloudflare egress addresses and not clients, Railway peers or documentation ranges', () => {
    for (const ip of [CF_EGRESS_A, CF_EGRESS_B, CF_EGRESS_V6, '104.23.255.255', '131.0.75.255']) assert.equal(inCidrs(ip, CF), true, ip);
    for (const ip of ['203.0.113.9', '198.51.100.23', '100.64.0.7', '2001:db8::1', '10.0.0.1', '104.15.255.255', '131.0.76.0']) {
      assert.equal(inCidrs(ip, CF), false, ip);
    }
  });
  it('anything that is not an address never matches; an empty list matches nothing', () => {
    for (const v of ['', 'garbage', '162.158.0.1, 162.158.0.2', '162.158.0.1 x', 'fe80::1%eth0', '162.158.0.256', '162.158.0.1/32']) {
      assert.equal(inCidrs(v, CF), false, JSON.stringify(v));
    }
    assert.equal(inCidrs('162.158.0.1', []), false);
  });
});

describe('cidr: strict parsing', () => {
  it('rejects /0, out-of-range and malformed prefixes', () => {
    for (const v of ['0.0.0.0/0', '::/0', '1.2.3.0/33', '2001:db8::/129', '1.2.3.0/024', '1.2.3.0/', '1.2.3.0/-1', '1.2.3.0/8.0']) {
      assert.throws(() => parseCidr(v), Error, v);
    }
  });
  it('rejects host bits, bare addresses, names, wildcards, ranges and zone ids', () => {
    for (const v of ['162.158.0.1/15', '2400:cb00::1/32', '162.158.0.0', 'cloudflare.com/16', '162.158.*.*/16', '162.158.0.0-162.159.255.255', 'fe80::%eth0/64', '1.2.3/24']) {
      assert.throws(() => parseCidr(v), Error, v);
    }
  });
  it('a list tolerates whitespace and empty items; one bad entry fails the whole list', () => {
    assert.equal(parseCidrList(' 162.158.0.0/15 , ,2400:cb00::/32 ').length, 2);
    assert.deepEqual(parseCidrList(''), []);
    assert.deepEqual(parseCidrList(undefined), []);
    assert.throws(() => parseCidrList('162.158.0.0/15,162.158.0.1/32x'));
  });
});

// ---------------- The chain (unit) ----------------

describe('chain: cf-connecting-ip honored only when every link holds', () => {
  it('trusted peer + X-Real-IP inside Cloudflare + valid CF-Connecting-IP: the CF value', () => {
    const r = fakeReq('100.64.0.7', { 'x-real-ip': CF_EGRESS_A, 'cf-connecting-ip': '203.0.113.9' });
    assert.deepEqual(resolveClient(r, T, 'cf-connecting-ip', CF), { ip: '203.0.113.9', trusted: true });
  });
  it('IPv6 on either hop', () => {
    const a = fakeReq('100.64.0.3', { 'x-real-ip': CF_EGRESS_V6, 'cf-connecting-ip': '2001:db8:1:2::abcd' });
    assert.deepEqual(resolveClient(a, T, 'cf-connecting-ip', CF), { ip: '2001:db8:1:2::abcd', trusted: true });
    const b = fakeReq('100.64.0.3', { 'x-real-ip': `::ffff:${CF_EGRESS_B}`, 'cf-connecting-ip': '::ffff:203.0.113.9' });
    assert.deepEqual(resolveClient(b, T, 'cf-connecting-ip', CF), { ip: '203.0.113.9', trusted: true });
  });
  it('link 1 fails (peer not a listed proxy): the socket peer, untrusted, whatever the headers say', () => {
    for (const peer of ['100.64.0.22', '203.0.113.50', CF_EGRESS_A]) {
      const r = fakeReq(peer, { 'x-real-ip': CF_EGRESS_A, 'cf-connecting-ip': '203.0.113.9' });
      assert.deepEqual(resolveClient(r, T, 'cf-connecting-ip', CF), { ip: peer, trusted: false }, peer);
    }
  });
  it('link 2 fails (X-Real-IP not in Cloudflare): the X-Real-IP value, never the CF header', () => {
    const r = fakeReq('100.64.0.7', { 'x-real-ip': '198.51.100.77', 'cf-connecting-ip': '203.0.113.9' });
    assert.deepEqual(resolveClient(r, T, 'cf-connecting-ip', CF), { ip: '198.51.100.77', trusted: true });
  });
  it('link 2 cannot be satisfied without upstream ranges (direct call with an empty list)', () => {
    const r = fakeReq('100.64.0.7', { 'x-real-ip': CF_EGRESS_A, 'cf-connecting-ip': '203.0.113.9' });
    assert.deepEqual(resolveClient(r, T, 'cf-connecting-ip', []), { ip: CF_EGRESS_A, trusted: true });
  });
  it('link 3 fails (CF header missing, empty, garbage, repeated, joined or a proxy address): the X-Real-IP value', () => {
    const cases: Array<string | string[] | undefined> = [undefined, '', 'garbage', ['203.0.113.9', '203.0.113.10'], '203.0.113.9, 203.0.113.10', '203.0.113.9 x', '100.64.0.3', 'fe80::1%eth0'];
    for (const v of cases) {
      const h: Record<string, string | string[]> = { 'x-real-ip': CF_EGRESS_A };
      if (v !== undefined) h['cf-connecting-ip'] = v;
      assert.deepEqual(resolveClient(fakeReq('100.64.0.7', h), T, 'cf-connecting-ip', CF), { ip: CF_EGRESS_A, trusted: true }, JSON.stringify(v));
    }
  });
  it('X-Real-IP itself unusable (missing, garbage, repeated, a proxy address): the socket peer, untrusted', () => {
    for (const v of [undefined, 'garbage', `${CF_EGRESS_A}, ${CF_EGRESS_B}`, '100.64.0.3']) {
      const h: Record<string, string> = { 'cf-connecting-ip': '203.0.113.9' };
      if (v !== undefined) h['x-real-ip'] = v;
      assert.deepEqual(resolveClient(fakeReq('100.64.0.7', h), T, 'cf-connecting-ip', CF), { ip: '100.64.0.7', trusted: false }, String(v));
    }
  });
  it('forged CF-Connecting-IP sent straight to the origin is useless (Railway writes the forger into X-Real-IP)', () => {
    for (const forged of ['203.0.113.9', '192.0.2.1', CF_EGRESS_A, '2001:db8::1']) {
      const r = fakeReq('100.64.0.12', { 'x-real-ip': '198.51.100.23', 'cf-connecting-ip': forged, 'x-forwarded-for': `${forged}, 198.51.100.23` });
      assert.deepEqual(resolveClient(r, T, 'cf-connecting-ip', CF), { ip: '198.51.100.23', trusted: true }, forged);
    }
  });
  it('old modes never read the CF header, even when X-Real-IP is a Cloudflare address', () => {
    const r = fakeReq('100.64.0.7', { 'x-real-ip': CF_EGRESS_A, 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '203.0.113.9' });
    assert.deepEqual(resolveClient(r, T, 'x-real-ip', CF), { ip: CF_EGRESS_A, trusted: true });
    assert.deepEqual(resolveClient(r, T, 'x-real-ip'), { ip: CF_EGRESS_A, trusted: true });
    assert.deepEqual(resolveClient(fakeReq('100.64.0.7', { 'cf-connecting-ip': '203.0.113.9' }), T, 'x-forwarded-for', CF), { ip: '100.64.0.7', trusted: false });
  });
});

// ---------------- Config validation ----------------

describe('config: STM_CLIENT_IP_HEADER and STM_UPSTREAM_CIDRS', () => {
  const base = { STM_HMAC_KEY: TEST_KEY };
  it('accepts the full Cloudflare configuration', () => {
    const c = loadConfig({ ...base, ...CF_ENV });
    assert.equal(c.clientIpHeader, 'cf-connecting-ip');
    assert.equal(c.upstreamCidrs.length, 22);
    assert.equal(c.trustedProxies.length, 21);
    assert.equal(loadConfig({ ...base, ...CF_ENV, STM_CLIENT_IP_HEADER: ' CF-Connecting-IP ' }).clientIpHeader, 'cf-connecting-ip');
  });
  it('cf-connecting-ip without STM_UPSTREAM_CIDRS (unset, empty or blank) refuses to start', () => {
    for (const up of [undefined, '', ' , ']) {
      const env: NodeJS.ProcessEnv = { ...base, STM_TRUSTED_PROXIES: PROD_PROXIES, STM_CLIENT_IP_HEADER: 'cf-connecting-ip' };
      if (up !== undefined) env.STM_UPSTREAM_CIDRS = up;
      assert.throws(() => loadConfig(env), /requires STM_UPSTREAM_CIDRS/, String(up));
    }
  });
  it('cf-connecting-ip without STM_TRUSTED_PROXIES refuses to start (the chain could never begin)', () => {
    assert.throws(() => loadConfig({ ...base, STM_CLIENT_IP_HEADER: 'cf-connecting-ip', STM_UPSTREAM_CIDRS: CF_LIST }), /requires STM_TRUSTED_PROXIES/);
  });
  it('malformed CIDRs refuse to start, naming the variable', () => {
    for (const bad of ['0.0.0.0/0', '162.158.0.1/15', '162.158.0.0', 'cloudflare', `${CF_LIST},::/0`]) {
      assert.throws(() => loadConfig({ ...base, ...CF_ENV, STM_UPSTREAM_CIDRS: bad }), /STM_UPSTREAM_CIDRS/, bad);
    }
    // Validated even when the header does not use them, so a typo never waits for a later switch.
    assert.throws(() => loadConfig({ ...base, ...OLD_ENV, STM_UPSTREAM_CIDRS: '162.158.0.1/15' }), /STM_UPSTREAM_CIDRS/);
  });
  it('unknown header names still throw and the message lists all three', () => {
    for (const h of ['forwarded', 'true-client-ip', 'x-client-ip', 'cf-connecting-ipv6']) {
      assert.throws(() => loadConfig({ ...base, ...CF_ENV, STM_CLIENT_IP_HEADER: h }), /"x-forwarded-for", "x-real-ip" or "cf-connecting-ip"/, h);
    }
  });
  it('STM_TRUSTED_PROXIES stays exact-match: Cloudflare CIDRs there are still rejected', () => {
    assert.throws(() => loadConfig({ ...base, ...CF_ENV, STM_TRUSTED_PROXIES: CF_V4 }), /exact IP addresses/);
  });
  it('old configurations load exactly as before (no upstream variable)', () => {
    const a = loadConfig({ ...base, ...OLD_ENV });
    assert.equal(a.clientIpHeader, 'x-real-ip');
    assert.deepEqual(a.upstreamCidrs, []);
    const b = loadConfig(base);
    assert.equal(b.clientIpHeader, 'x-forwarded-for');
    assert.deepEqual(b.upstreamCidrs, []);
    assert.deepEqual(b.trustedProxies, []);
  });
  it('rollback by header alone also loads: a leftover STM_UPSTREAM_CIDRS is inert under x-real-ip', () => {
    const c = loadConfig({ ...base, ...OLD_ENV, STM_UPSTREAM_CIDRS: CF_LIST });
    assert.equal(c.clientIpHeader, 'x-real-ip');
    const r = fakeReq('100.64.0.7', { 'x-real-ip': CF_EGRESS_A, 'cf-connecting-ip': '203.0.113.9' });
    assert.deepEqual(resolveClient(r, c.trustedProxies, c.clientIpHeader, c.upstreamCidrs), { ip: CF_EGRESS_A, trusted: true });
  });
});

// ---------------- HTTP app behind a simulated Cloudflare -> Railway path ----------------

interface PeerServer {
  app: App;
  base: string;
  close: () => Promise<void>;
}

async function startWithPeer(env: Record<string, string>, peer: string | null): Promise<PeerServer> {
  const dataDir = mkdtempSync(join(tmpdir(), 'stm-cf-'));
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
  const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const text = await r.text();
  return { status: r.status, text, json: JSON.parse(text) as Record<string, any> };
}

const INPUT = { number: '(214) 555-0101', message: 'Free roof quote for your home this week?', category: 'roofing' };
const INPUT2 = { ...INPUT, number: '(305) 555-0102' };
const INPUT3 = { ...INPUT, number: '(602) 555-0103' };

/** Preview then file. The preview limit is 10x the filing limit, so the filing hits 429 first. */
async function file(s: PeerServer, headers: Record<string, string>, input = INPUT) {
  const pv = await post(s.base, '/api/preview', input, headers);
  assert.equal(pv.status, 200, pv.text);
  return post(s.base, '/api/reports', { ...input, previewHash: pv.json.preview.previewHash, idempotencyKey: idemKey() }, headers);
}

function ageAll(app: App) {
  app.db.prepare('UPDATE reports SET created_at = ?').run(new Date(Date.now() - 2 * 86_400_000).toISOString());
}

function counted(app: App): number[] {
  return (app.db.prepare('SELECT counted FROM reports ORDER BY rowid').all() as Array<{ counted: number }>).map((r) => r.counted);
}

/** Headers as Railway delivers them for a visitor arriving through Cloudflare egress `egress`. */
const viaCf = (egress: string, visitor: string) => ({ 'x-real-ip': egress, 'cf-connecting-ip': visitor });

describe('app with the Cloudflare chain configured: rate-limit buckets', () => {
  it('two visitors behind one Cloudflare egress get separate buckets; one visitor on two egresses shares one', async () => {
    const s = await startWithPeer({ ...CF_ENV, STM_SUBMIT_PER_IP_PER_HOUR: '1' }, '100.64.0.7');
    try {
      assert.equal((await file(s, viaCf(CF_EGRESS_A, '203.0.113.60'))).status, 201);
      assert.equal((await file(s, viaCf(CF_EGRESS_A, '203.0.113.61'), INPUT2)).status, 201);
      assert.equal((await file(s, viaCf(CF_EGRESS_B, '203.0.113.60'), INPUT3)).status, 429);
      assert.equal((await file(s, viaCf(CF_EGRESS_V6, '203.0.113.61'), INPUT3)).status, 429);
    } finally {
      await s.close();
    }
  });
  it('a forger hitting the origin directly cannot choose a bucket by varying CF-Connecting-IP', async () => {
    const s = await startWithPeer({ ...CF_ENV, STM_SUBMIT_PER_IP_PER_HOUR: '1' }, '100.64.0.9');
    try {
      const own = '198.51.100.23'; // what Railway writes into X-Real-IP for a direct request
      assert.equal((await file(s, { 'x-real-ip': own, 'cf-connecting-ip': '192.0.2.1' })).status, 201);
      assert.equal((await file(s, { 'x-real-ip': own, 'cf-connecting-ip': '192.0.2.2' }, INPUT2)).status, 429);
      assert.equal((await file(s, { 'x-real-ip': own }, INPUT3)).status, 429);
      // The forged value did not take anyone else's bucket either.
      assert.equal((await file(s, viaCf(CF_EGRESS_A, '192.0.2.1'), INPUT3)).status, 201);
    } finally {
      await s.close();
    }
  });
  it('old configuration on the same code: buckets follow X-Real-IP (the Cloudflare egress), as before', async () => {
    const s = await startWithPeer({ ...OLD_ENV, STM_SUBMIT_PER_IP_PER_HOUR: '1' }, '100.64.0.7');
    try {
      assert.equal((await file(s, viaCf(CF_EGRESS_A, '203.0.113.70'))).status, 201);
      assert.equal((await file(s, viaCf(CF_EGRESS_A, '203.0.113.71'), INPUT2)).status, 429);
    } finally {
      await s.close();
    }
  });
});

describe('app with the Cloudflare chain configured: same-connection dedup guard', () => {
  let s: PeerServer;
  before(async () => (s = await startWithPeer(CF_ENV, '100.64.0.7')));
  after(() => s.close());

  it('keys on the visitor: same visitor via different egresses is one connection; another visitor counts', async () => {
    await file(s, viaCf(CF_EGRESS_A, '203.0.113.80'));
    ageAll(s.app);
    await file(s, viaCf(CF_EGRESS_B, '203.0.113.80'));
    ageAll(s.app);
    await file(s, viaCf(CF_EGRESS_A, '203.0.113.81'));
    assert.deepEqual(counted(s.app), [1, 0, 1]);
  });
  it('an unlisted peer never reaches the dedup map, whatever the headers', async () => {
    const u = await startWithPeer(CF_ENV, null); // peer is 127.0.0.1
    try {
      await file(u, viaCf(CF_EGRESS_A, '203.0.113.90'));
      ageAll(u.app);
      await file(u, viaCf(CF_EGRESS_A, '203.0.113.90'));
      assert.deepEqual(counted(u.app), [1, 1]);
      assert.equal(u.app.dedup.size, 0);
    } finally {
      await u.close();
    }
  });
  it('a garbage X-Real-IP from a trusted peer falls back to the peer, untrusted: no dedup effect', async () => {
    const g = await startWithPeer(CF_ENV, '100.64.0.7');
    try {
      await file(g, { 'x-real-ip': 'garbage', 'cf-connecting-ip': '203.0.113.91' });
      ageAll(g.app);
      await file(g, { 'x-real-ip': 'garbage', 'cf-connecting-ip': '203.0.113.91' });
      assert.deepEqual(counted(g.app), [1, 1]);
      assert.equal(g.app.dedup.size, 0);
    } finally {
      await g.close();
    }
  });
});
