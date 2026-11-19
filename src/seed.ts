// Synthetic fixture command: `npm run seed`. Loads ONLY the invented
// fixtures in src/fixtures.ts. Refuses to run against a live-mode instance.
// Receipt codes for seeded reports are discarded (they are test data).

import { randomBytes } from 'node:crypto';
import { loadConfig } from './config.ts';
import { Keys } from './crypto.ts';
import { openDb } from './db.ts';
import { fileReport, prepare } from './filing.ts';
import { ALL_FIXTURES } from './fixtures.ts';

const cfg = loadConfig();
if (cfg.intakeMode === 'live' && !process.argv.includes('--force')) {
  process.stderr.write('Refusing to seed synthetic data into a live-mode instance (STM_INTAKE_MODE=live).\n');
  process.exit(1);
}
const db = openDb(cfg.databasePath);
const keys = new Keys(cfg.hmacKey);
let filed = 0;
for (const f of ALL_FIXTURES) {
  const now = new Date(Date.now() - f.daysAgo * 86_400_000);
  const input = { number: f.number, message: f.message, category: f.category, city: f.city ?? '', source: 'manual' };
  const p = prepare(keys, input);
  if ('errors' in p) {
    process.stderr.write(`fixture rejected: ${JSON.stringify(p.errors)}\n`);
    continue;
  }
  const out = fileReport(
    { db, keys, duplicateWindowHours: cfg.duplicateWindowHours, globalDailySubmissions: Number.MAX_SAFE_INTEGER, allowNewFiling: () => true, now },
    { ...input, previewHash: p.preview.previewHash, idempotencyKey: randomBytes(18).toString('base64url') },
  );
  if (out.http === 201) filed++;
}
process.stdout.write(`Seeded ${filed} synthetic reports into ${cfg.databasePath}\n`);
