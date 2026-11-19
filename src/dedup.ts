// Same-connection duplicate control, in memory only.
//
// A filing's code is HMAC(dedupKey, netId | sender token | template hash).
// The key is 32 random bytes made at startup, held only in this process,
// never written anywhere and not derived from STM_HMAC_KEY, so a copy of
// the disk plus the master key still cannot test candidate IP addresses
// against anything. Codes live in a Map with a 7-day expiry and are swept
// hourly. A restart or deploy wipes both the key and the map.
//
// It is applied only when the client address came through the trusted-proxy
// path (see resolveClient). Behind a proxy without that, every request looks
// like the proxy, and the code would silently widen the global 24-hour
// sender+template window to 7 days for everyone.

import { createHmac, randomBytes } from 'node:crypto';

export const DEDUP_TTL_MS = 7 * 24 * 3_600_000;

export class ConnectionDedup {
  private readonly key = randomBytes(32);
  private readonly seen = new Map<string, number>();
  private readonly ttlMs: number;
  constructor(ttlMs = DEDUP_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  private code(netId: string, senderToken: string, templateHash: string): string {
    return createHmac('sha256', this.key).update(`${netId}|${senderToken}|${templateHash}`).digest('base64url');
  }

  /**
   * Records this filing and reports whether the same code was recorded
   * within the TTL. The expiry is measured from the most recent filing,
   * like the database's 24-hour rule.
   */
  check(netId: string, senderToken: string, templateHash: string, now = Date.now()): boolean {
    const c = this.code(netId, senderToken, templateHash);
    const exp = this.seen.get(c);
    const hit = exp !== undefined && exp > now;
    this.seen.set(c, now + this.ttlMs);
    return hit;
  }

  /** Drops expired codes. Run hourly. */
  sweep(now = Date.now()): void {
    for (const [c, exp] of this.seen) if (exp <= now) this.seen.delete(c);
  }

  /** Number of codes currently held (tests only). */
  get size(): number {
    return this.seen.size;
  }
}
