// Illustrations with text labels have Spanish and Vietnamese copies, kept
// current by scripts/localize-illustrations.mjs, and translated pages use them.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
// @ts-expect-error plain .mjs script, no type declarations
import { LABELS, localize } from '../scripts/localize-illustrations.mjs';
import { get, startServer, type TestServer } from './helpers.ts';

const NAMES = Object.keys(LABELS as Record<string, unknown>);

describe('localized illustrations', () => {
  let s: TestServer;
  before(async () => {
    s = await startServer();
  });
  after(async () => {
    await s?.close();
  });

  for (const name of NAMES) {
    for (const lang of ['es', 'vi']) {
      it(`${name}.${lang}.svg is current and has no English label left`, () => {
        const file = readFileSync(new URL(`../public/static/img/${name}.${lang}.svg`, import.meta.url), 'utf8');
        assert.equal(file, localize(name, lang), 'run node scripts/localize-illustrations.mjs');
        for (const en of Object.keys((LABELS as Record<string, Record<string, unknown>>)[name]!)) assert.ok(!file.includes(`>${en}<`), en);
      });
    }
  }

  it('translated pages load the translated copy; English pages the original', async () => {
    for (const [path, name] of [['/', 'hero-illustration'], ['/privacy', 'privacy-illustration'], ['/patterns', 'pattern-illustration']] as const) {
      assert.ok((await get(s.base, path)).text.includes(`src="/static/img/${name}.svg"`), path);
      for (const lang of ['es', 'vi']) {
        const { text } = await get(s.base, `${path}?lang=${lang}`);
        assert.ok(text.includes(`src="/static/img/${name}.${lang}.svg"`), `${path} ${lang}`);
        assert.equal((await get(s.base, `/static/img/${name}.${lang}.svg`)).status, 200);
      }
    }
  });
});
