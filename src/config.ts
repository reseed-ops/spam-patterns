import { existsSync } from 'node:fs';
import { isIP } from 'node:net';

// Runtime configuration. Every variable is documented in .env.example.
// The HMAC key is required and has no working default: the service refuses
// to start without a real, deployment-specific random key.

export const PLACEHOLDER_KEY = 'REPLACE_WITH_OUTPUT_OF_openssl_rand_hex_32';

export type IntakeMode = 'demo' | 'live';

export interface Config {
  port: number;
  host: string;
  databasePath: string;
  hmacKey: Buffer;
  intakeMode: IntakeMode;
  submitPerIpPerHour: number;
  globalDailySubmissions: number;
  deletePerIpPerHour: number;
  flagPerIpPerHour: number;
  trustedProxies: string[];
  clientIpHeader: 'x-forwarded-for' | 'x-real-ip';
  duplicateWindowHours: number;
  senderTokenTtlDays: number;
  abuseContact: string;
  securityContact: string;
  privacyContact: string;
  maxScreenshotMb: number;
  maxScreenshotPixels: number;
  officialInstanceUrl: string;
}

function int(env: NodeJS.ProcessEnv, name: string, def: number, min = 0): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return def;
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a non-negative integer`);
  const n = Number(raw);
  if (n < min) throw new Error(`${name} must be at least ${min}`);
  return n;
}

function mailto(env: NodeJS.ProcessEnv, name: string, def: string): string {
  const v = (env[name] ?? '').trim() || def;
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(v)) throw new Error(`${name} must be an email address`);
  return v;
}

export function parseHmacKey(raw: string | undefined): Buffer {
  if (!raw || raw.trim() === '' || raw.trim() === PLACEHOLDER_KEY) {
    throw new Error(
      'STM_HMAC_KEY is required. Generate one with `openssl rand -hex 32` and keep it secret. ' +
        'There is no default key.',
    );
  }
  const v = raw.trim();
  if (!/^[0-9a-f]{64,}$/i.test(v)) {
    throw new Error('STM_HMAC_KEY must be at least 64 hex characters (32 random bytes).');
  }
  if (/^(.)\1+$/.test(v)) throw new Error('STM_HMAC_KEY looks non-random.');
  return Buffer.from(v, 'hex');
}

function clientIpHeader(env: NodeJS.ProcessEnv): 'x-forwarded-for' | 'x-real-ip' {
  const v = (env.STM_CLIENT_IP_HEADER ?? '').trim().toLowerCase() || 'x-forwarded-for';
  if (v !== 'x-forwarded-for' && v !== 'x-real-ip') throw new Error('STM_CLIENT_IP_HEADER must be "x-forwarded-for" or "x-real-ip"');
  return v;
}

function trustedProxyList(env: NodeJS.ProcessEnv): string[] {
  const list = (env.STM_TRUSTED_PROXIES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const a of list) {
    // Exact addresses only: no CIDR, ranges or wildcards (trust fails closed).
    if (isIP(a) === 0) throw new Error(`STM_TRUSTED_PROXIES entries must be exact IP addresses (got "${a}")`);
  }
  return list;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mode = (env.STM_INTAKE_MODE ?? 'demo').trim();
  if (mode !== 'demo' && mode !== 'live') throw new Error('STM_INTAKE_MODE must be "demo" or "live"');
  return {
    port: int(env, 'PORT', 8080, 1),
    host: env.HOST?.trim() || '0.0.0.0',
    databasePath: env.STM_DATABASE_PATH?.trim() || './var/spam-text-map.sqlite',
    hmacKey: parseHmacKey(env.STM_HMAC_KEY),
    intakeMode: mode,
    submitPerIpPerHour: int(env, 'STM_SUBMIT_PER_IP_PER_HOUR', 10, 1),
    globalDailySubmissions: int(env, 'STM_GLOBAL_DAILY_SUBMISSIONS', 500, 1),
    deletePerIpPerHour: int(env, 'STM_DELETE_PER_IP_PER_HOUR', 20, 1),
    flagPerIpPerHour: int(env, 'STM_FLAG_PER_IP_PER_HOUR', 10, 1),
    trustedProxies: trustedProxyList(env),
    clientIpHeader: clientIpHeader(env),
    duplicateWindowHours: int(env, 'STM_DUPLICATE_WINDOW_HOURS', 24, 1),
    senderTokenTtlDays: int(env, 'STM_SENDER_TOKEN_TTL_DAYS', 30, 1),
    abuseContact: mailto(env, 'STM_ABUSE_CONTACT', 'abuse@example.invalid'),
    securityContact: mailto(env, 'STM_SECURITY_CONTACT', 'security@example.invalid'),
    privacyContact: mailto(env, 'STM_PRIVACY_CONTACT', 'privacy@example.invalid'),
    maxScreenshotMb: int(env, 'STM_MAX_SCREENSHOT_MB', 8, 1),
    maxScreenshotPixels: int(env, 'STM_MAX_SCREENSHOT_PIXELS', 16_000_000, 1),
    officialInstanceUrl: env.STM_OFFICIAL_INSTANCE_URL?.trim() || '',
  };
}

/**
 * Intake pause is evaluated on every request, never cached, so it needs no
 * rebuild or deploy. Two switches, either one pauses intake:
 *   - INTAKE_PAUSED=1 in the environment (takes effect on container restart);
 *   - a file named INTAKE_PAUSED next to the database (takes effect at once:
 *     `docker compose exec app touch /data/INTAKE_PAUSED`).
 */
export function intakePaused(env: NodeJS.ProcessEnv, pauseFile: string | null): boolean {
  if (/^(1|true|yes|on)$/i.test((env.INTAKE_PAUSED ?? '').trim())) return true;
  return pauseFile !== null && existsSync(pauseFile);
}
