// Strict CIDR parsing and matching for STM_UPSTREAM_CIDRS (v0.1.8).
//
// Used for one narrow check only: whether the address a trusted proxy
// reports as its client (X-Real-IP) belongs to a configured upstream proxy
// network (Cloudflare). STM_TRUSTED_PROXIES stays exact-match.
//
// Parsing is strict so a typo fails at startup instead of trusting the
// wrong network: the address must parse, the prefix must be a plain decimal
// in 1..32 (IPv4) or 1..128 (IPv6), and the host bits must be zero. A /0
// prefix is rejected because it would match every address.

import { isIP } from 'node:net';

export interface Cidr {
  family: 4 | 6;
  /** Network address as an unsigned integer (32 or 128 bits). */
  net: bigint;
  prefix: number;
  /** The entry as configured, for messages. */
  text: string;
}

/** Expands an IPv6 address to 8 lowercase 4-digit groups (input must pass isIP === 6). */
export function expandV6(ip: string): string[] {
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

function v4ToBig(ip: string): bigint {
  return ip.split('.').reduce((acc, o) => (acc << 8n) | BigInt(Number(o)), 0n);
}

/**
 * An address as { family, value }. IPv4-mapped IPv6 (::ffff:a.b.c.d) is
 * treated as the IPv4 address. Returns null for anything that is not an
 * IP address (including zone-scoped IPv6).
 */
export function ipValue(raw: string): { family: 4 | 6; value: bigint } | null {
  const ip = raw.trim();
  if (ip.includes('%')) return null;
  const fam = isIP(ip);
  if (fam === 4) return { family: 4, value: v4ToBig(ip) };
  if (fam !== 6) return null;
  const value = expandV6(ip).reduce((acc, g) => (acc << 16n) | BigInt(parseInt(g, 16)), 0n);
  if (value >> 32n === 0xffffn) return { family: 4, value: value & 0xffffffffn };
  return { family: 6, value };
}

/** Parses one CIDR entry; throws a descriptive error on anything malformed. */
export function parseCidr(entry: string): Cidr {
  const text = entry.trim();
  const m = /^([^/\s]+)\/(\d{1,3})$/.exec(text);
  if (!m) throw new Error(`"${text}" is not in address/prefix form`);
  const addr = m[1]!;
  if (addr.includes('%')) throw new Error(`"${text}" must not carry a zone id`);
  const fam = isIP(addr);
  if (fam === 0) throw new Error(`"${text}" does not start with an IP address`);
  if (m[2]!.length > 1 && m[2]!.startsWith('0')) throw new Error(`"${text}" has a malformed prefix`);
  const prefix = Number(m[2]);
  const width = fam === 4 ? 32 : 128;
  if (prefix < 1 || prefix > width) throw new Error(`"${text}" prefix must be 1..${width} (a /0 would match every address)`);
  // Use the written family (no ::ffff: folding) so the prefix width is unambiguous.
  const net = fam === 4 ? v4ToBig(addr) : expandV6(addr).reduce((acc, g) => (acc << 16n) | BigInt(parseInt(g, 16)), 0n);
  const hostMask = (1n << BigInt(width - prefix)) - 1n;
  if ((net & hostMask) !== 0n) throw new Error(`"${text}" has host bits set; write the network address`);
  return { family: fam as 4 | 6, net, prefix, text };
}

/** Parses a comma-separated list; empty or unset means no entries. */
export function parseCidrList(raw: string | undefined): Cidr[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseCidr);
}

/** True when `ip` parses as an address inside at least one of `list`. */
export function inCidrs(ip: string, list: readonly Cidr[]): boolean {
  if (list.length === 0) return false;
  const v = ipValue(ip);
  if (!v) return false;
  for (const c of list) {
    if (c.family !== v.family) continue;
    const shift = BigInt((c.family === 4 ? 32 : 128) - c.prefix);
    if (v.value >> shift === c.net >> shift) return true;
  }
  return false;
}
