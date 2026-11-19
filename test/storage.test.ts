// Allow-list storage: a field not on the list cannot be persisted.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Keys } from '../src/crypto.ts';
import { AllowListError, REPORT_COLUMNS, insertReport, openDb } from '../src/db.ts';
import { prepare } from '../src/filing.ts';
import { TEST_KEY } from './helpers.ts';

const keys = new Keys(Buffer.from(TEST_KEY, 'hex'));

function validRecord(): Record<string, unknown> {
  const p = prepare(keys, { number: '(214) 555-0101', message: 'Hi Lane, free roof quote this week?', category: 'roofing' });
  assert.ok(!('errors' in p));
  return {
    id: 'AAAAAAAAAAAAAAAAAAAAAA',
    created_at: '2026-11-17T12:00:00.000Z',
    created_day: '2026-11-17',
    ...p.record,
    counted: 1,
    receipt_hash: 'b'.repeat(64),
  };
}

describe('allow-list storage', () => {
  it('persists a valid record', () => {
    const db = openDb(':memory:');
    insertReport(db, validRecord());
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM reports').get() as { n: number }).n, 1);
  });

  for (const [field, value] of [
    ['full_number', '2145550101'],
    ['raw_message', 'Hi Lane, free roof quote this week?'],
    ['ip', '203.0.113.9'],
    ['screenshot', 'data:image/png;base64,AAAA'],
    ['user_agent', 'Mozilla/5.0'],
    ['recipient_name', 'Lane'],
  ] as const) {
    it(`refuses to persist "${field}"`, () => {
      const db = openDb(':memory:');
      assert.throws(() => insertReport(db, { ...validRecord(), [field]: value }), AllowListError);
      assert.equal((db.prepare('SELECT COUNT(*) AS n FROM reports').get() as { n: number }).n, 0);
    });
  }

  it('refuses a full number smuggled into an allowed column', () => {
    const db = openDb(':memory:');
    assert.throws(() => insertReport(db, { ...validRecord(), prefix: '5550101' }), AllowListError);
    assert.throws(() => insertReport(db, { ...validRecord(), template: 'call 2145550101' }), AllowListError);
    assert.throws(() => insertReport(db, { ...validRecord(), category: 'political; city=x' }), AllowListError);
    assert.throws(() => insertReport(db, { ...validRecord(), city: 'Dallas 75201' }), AllowListError);
  });

  it('the table has exactly the allow-listed columns, and none for numbers, raw text or IPs', () => {
    const db = openDb(':memory:');
    const cols = (db.prepare('PRAGMA table_info(reports)').all() as Array<{ name: string }>).map((c) => c.name);
    assert.deepEqual([...cols].sort(), [...REPORT_COLUMNS].sort());
    for (const c of cols) assert.ok(!/number|phone|raw|(^|_)ip(_|$)|image|screenshot|agent/i.test(c), c);
  });

  it('the database file never contains the full number or the raw names', () => {
    const db = openDb(':memory:');
    insertReport(db, validRecord());
    const dump = JSON.stringify(db.prepare('SELECT * FROM reports').all());
    assert.ok(!dump.includes('2145550101'));
    assert.ok(!dump.includes('555-0101'));
    assert.ok(!dump.includes('Lane'));
  });
});
