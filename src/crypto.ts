// Keyed derivations. One deployment secret (STM_HMAC_KEY) is split into
// purpose-bound subkeys so that no derived value can stand in for another:
// a receipt is never a sender token, a pattern ID is never a receipt.

import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

export type KeyPurpose = 'sender-token-v1' | 'receipt-v1' | 'pattern-id-v1' | 'ip-v1';

export class Keys {
  private readonly sub: Map<KeyPurpose, Buffer>;
  constructor(master: Buffer) {
    this.sub = new Map();
    for (const p of ['sender-token-v1', 'receipt-v1', 'pattern-id-v1', 'ip-v1'] as const) {
      this.sub.set(p, Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), `spam-text-map:${p}`, 32)));
    }
  }
  mac(purpose: KeyPurpose, data: string): Buffer {
    return createHmac('sha256', this.sub.get(purpose)!).update(data).digest();
  }
}

/** Internal-only pseudonymous sender token. Never leaves the database. */
export function senderToken(keys: Keys, digits10: string): string {
  return keys.mac('sender-token-v1', digits10).toString('hex');
}

const B32 = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789'; // Crockford-style, no I L O U
function base32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export const RECEIPT_BITS = 160;

/**
 * The deletion receipt is derived from the client's idempotency key under a
 * secret subkey, so a retry of the same filing can re-issue the same receipt
 * while the server stores only sha256(receipt). 160 bits, shown as 8 groups.
 */
export function deriveReceipt(keys: Keys, idempotencyKey: string): string {
  const raw = keys.mac('receipt-v1', idempotencyKey).subarray(0, RECEIPT_BITS / 8);
  return base32(raw).match(/.{4}/g)!.join('-');
}

export function normalizeReceipt(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 80) return null;
  const s = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (!/^[A-Z0-9]{32}$/.test(s)) return null;
  for (const ch of s) if (!B32.includes(ch)) return null;
  return s.match(/.{4}/g)!.join('-');
}

export function sha256hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function randomId(bytes = 12): string {
  return randomBytes(bytes).toString('base64url');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
