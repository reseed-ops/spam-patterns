// Per-IP caps are noise control, not abuse proof (carrier NAT, VPNs and
// residential proxies defeat them). Client IPs are keyed through an HMAC
// before they are held in memory, are never logged or persisted, and the
// whole table is dropped when a window ends: a scheduled timer clears it
// at the end of each window even if no further request arrives.

import type { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';
import type { Keys } from './crypto.ts';

export class WindowLimiter {
  private hits = new Map<string, number>();
  private windowStart = Date.now();
  private timer: NodeJS.Timeout | null = null;
  private readonly keys: Keys;
  private readonly limit: number;
  private readonly windowMs: number;
  constructor(keys: Keys, limit: number, windowMs: number, opts: { schedule?: boolean } = {}) {
    this.keys = keys;
    this.limit = limit;
    this.windowMs = windowMs;
    if (opts.schedule !== false) this.schedule();
  }

  private roll(now: number) {
    if (now - this.windowStart >= this.windowMs) {
      this.hits.clear();
      this.windowStart = now;
    }
  }

  /** Arms a timer for the end of the current window, so expired buckets are cleared without a request. */
  private schedule() {
    const due = Math.max(1, this.windowStart + this.windowMs - Date.now());
    this.timer = setTimeout(() => {
      this.roll(Date.now());
      this.schedule();
    }, due);
    this.timer.unref();
  }

  /** Records one hit; returns false when the caller is over the limit. */
  take(ip: string, now = Date.now()): boolean {
    this.roll(now);
    const k = this.keys.mac('ip-v1', ip).toString('base64url');
    const n = (this.hits.get(k) ?? 0) + 1;
    this.hits.set(k, n);
    return n <= this.limit;
  }

  /** Number of buckets currently held (tests only). */
  get size(): number {
    return this.hits.size;
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

function norm(ip: string): string {
  return ip.replace(/^::ffff:/, '').trim();
}

export type ClientIpHeader = 'x-forwarded-for' | 'x-real-ip';

export interface ClientAddress {
  /** The address used for rate limits: the real client, or the socket peer. */
  ip: string;
  /**
   * True only when `ip` was taken from a forwarding header sent by a
   * configured trusted proxy and parsed as an IP address. False means `ip`
   * is the raw socket peer, which behind a proxy is the proxy itself.
   */
  trusted: boolean;
}

/**
 * The socket address is used unless it exactly matches a configured trusted
 * proxy. Only then is a forwarding header read:
 *   - `x-forwarded-for` (default): read right to left, skipping other
 *     trusted proxies, so entries a client forges on the left are ignored;
 *   - `x-real-ip`: a single address set by the proxy (Railway overwrites it).
 * The selected value must parse as an IP address; anything else falls back
 * to the socket peer, untrusted. Without STM_TRUSTED_PROXIES every request
 * behind a proxy looks like the proxy (documented in docs/self-hosting.md).
 */
export function resolveClient(req: IncomingMessage, trusted: string[], header: ClientIpHeader = 'x-forwarded-for'): ClientAddress {
  const remote = norm(req.socket.remoteAddress ?? 'unknown');
  const peer: ClientAddress = { ip: remote, trusted: false };
  if (!trusted.includes(remote)) return peer;
  const raw = req.headers[header];
  if (header === 'x-real-ip') {
    // Node joins repeated unknown headers with ", ", which then fails isIP.
    const v = norm(Array.isArray(raw) ? raw.join(',') : (raw ?? ''));
    if (isIP(v) === 0 || trusted.includes(v)) return peer;
    return { ip: v, trusted: true };
  }
  const chain = (Array.isArray(raw) ? raw.join(',') : (raw ?? ''))
    .split(',')
    .map(norm)
    .filter(Boolean);
  for (let i = chain.length - 1; i >= 0; i--) {
    const v = chain[i]!;
    if (trusted.includes(v)) continue;
    // The first untrusted entry from the right is the only candidate. If it
    // is not an address, do not keep walking into client-controlled entries.
    return isIP(v) === 0 ? peer : { ip: v, trusted: true };
  }
  return peer;
}

/** Back-compatible form: the address only. */
export function clientIp(req: IncomingMessage, trusted: string[], header: ClientIpHeader = 'x-forwarded-for'): string {
  return resolveClient(req, trusted, header).ip;
}

/** Expands an IPv6 address to 8 lowercase 4-digit groups (input must pass isIP === 6). */
function expandV6(ip: string): string[] {
  let s = ip.toLowerCase().replace(/%.*$/, '');
  const m = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (m) {
    const o = m[1]!.split('.').map(Number);
    s = s.slice(0, -m[1]!.length) + ((o[0]! << 8) | o[1]!).toString(16) + ':' + ((o[2]! << 8) | o[3]!).toString(16);
  }
  const [head, tail] = s.includes('::') ? s.split('::') : [s, undefined];
  const h = head ? head.split(':') : [];
  const t = tail === undefined ? [] : tail ? tail.split(':') : [];
  const fill = tail === undefined ? [] : Array<string>(8 - h.length - t.length).fill('0');
  return [...h, ...fill, ...t].map((g) => g.padStart(4, '0'));
}

/**
 * The connection identity used for duplicate control: the IPv4 address, or
 * the IPv6 /64 (mobile privacy addresses rotate the low 64 bits).
 */
export function netId(ip: string): string {
  const v = norm(ip);
  if (isIP(v) === 4) return `4:${v}`;
  if (isIP(v) === 6) return `6:${expandV6(v).slice(0, 4).join(':')}::/64`;
  return `?:${v}`;
}
