// v0.1.7: the product is displayed as "Spam Patterns". The old name may appear
// in user-facing copy only in /project's provenance line.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { MANIFEST } from '../src/app.ts';
import { startServer, type TestServer } from './helpers.ts';

const OLD = 'Spam Text Map';
const PROVENANCE = 'Launched November 17, 2026 as Spam Text Map; renamed Spam Patterns on November 19, 2026.';
const TAGLINE = 'A pilot tracking recurring spam texts.';

const PAGES = [
  '/', '/?view=table', '/?view=map', '/report', '/report/complete', '/delete', '/patterns', '/patterns/zzz-missing',
  '/data', '/data/schema.json', '/privacy', '/methodology', '/project', '/junk-mail', '/offline',
  '/manifest.webmanifest', '/sw.js', '/robots.txt', '/healthz', '/no-such-page',
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? (f === 'vendor' ? [] : walk(p)) : [p];
  });
}

describe('rename to Spam Patterns', () => {
  let s: TestServer;
  before(async () => (s = await startServer()));
  after(() => s.close());

  it('the manifest name and short_name are "Spam Patterns"', async () => {
    assert.equal(MANIFEST.name, 'Spam Patterns');
    assert.equal(MANIFEST.short_name, 'Spam Patterns');
    const m = (await (await fetch(s.base + '/manifest.webmanifest')).json()) as typeof MANIFEST;
    assert.equal(m.name, 'Spam Patterns');
    assert.equal(m.short_name, 'Spam Patterns');
  });

  it('no public page contains the old name except the /project provenance line', async () => {
    for (const p of PAGES) {
      const text = await (await fetch(s.base + p)).text();
      const rest = p === '/project' ? text.replace(PROVENANCE, '') : text;
      assert.ok(!rest.includes(OLD), `${p} still says "${OLD}"`);
    }
  });

  it('no public static file contains the old name', () => {
    for (const f of walk('public')) {
      if (/\.(png|ico)$/.test(f)) continue;
      assert.ok(!readFileSync(f, 'utf8').includes(OLD), f);
    }
  });

  it('/project carries the provenance line exactly once, and the tagline', async () => {
    const text = await (await fetch(s.base + '/project')).text();
    assert.equal(text.split(PROVENANCE).length - 1, 1);
    assert.equal(text.split(OLD).length - 1, 1);
    assert.ok(text.includes(TAGLINE.replace('A pilot', 'a pilot')));
  });

  it('home page title, wordmark and tagline', async () => {
    const text = await (await fetch(s.base + '/')).text();
    assert.match(text, /<title>[^<]*· Spam Patterns<\/title>/);
    assert.ok(text.includes('alt="" width="32" height="32">Spam Patterns</a>'));
    assert.ok(text.includes(`<p class="tagline">${TAGLINE}</p>`));
  });
});
