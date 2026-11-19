// Guards the OCR payload fix (evening 3): the large vendored assets must have
// pre-compressed variants on disk, and the static server must negotiate them
// with Content-Encoding while keeping the original Content-Type, and fall
// back to the uncompressed file when the client accepts no encoding.
// Requires `npm run vendor` first (CI runs it before `npm test`).
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { request } from 'node:http';
import { join, relative } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { COMPRESSIBLE, negotiateEncoding } from '../src/app.ts';
import { startServer, type TestServer } from './helpers.ts';

const root = join(import.meta.dirname, '..');
const vendor = join(root, 'public/static/vendor');
const CORE = 'tesseract-core/tesseract-core-relaxedsimd-lstm.wasm.js';
const LARGE = 100 * 1024;

function walk(d: string): string[] {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
}

function raw(base: string, path: string, headers: Record<string, string>, method = 'GET') {
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }>((res, rej) => {
    const req = request(base + path, { method, headers, agent: false }, (r) => {
      const chunks: Buffer[] = [];
      r.on('data', (c: Buffer) => chunks.push(c));
      r.on('end', () => res({ status: r.statusCode!, headers: r.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', rej);
    req.end();
  });
}

describe('static compression: large assets always have an encoded variant', () => {
  it('the vendored OCR bundle is present (run `npm run vendor`)', () => {
    assert.ok(existsSync(join(vendor, CORE)), `missing ${CORE}; run npm run vendor`);
  });
  it('every compressible vendored file over 100 KB has smaller .br and .gz siblings', () => {
    const large = walk(vendor).filter((f) => COMPRESSIBLE.test(f) && statSync(f).size >= LARGE);
    assert.ok(large.length >= 10, `expected the tesseract cores, found ${large.length}`);
    for (const f of large) {
      const size = statSync(f).size;
      for (const ext of ['.br', '.gz']) {
        const v = f + ext;
        assert.ok(existsSync(v), `no ${ext} variant for ${relative(root, f)}: it would ship uncompressed`);
        assert.ok(statSync(v).size < size * 0.9, `${relative(root, v)} saves under 10%`);
      }
    }
  });
  it('the variants decode to exactly the original bytes', () => {
    const orig = readFileSync(join(vendor, CORE));
    assert.ok(brotliDecompressSync(readFileSync(join(vendor, CORE + '.br'))).equals(orig));
    assert.ok(gunzipSync(readFileSync(join(vendor, CORE + '.gz'))).equals(orig));
  });
});

describe('static compression: Accept-Encoding negotiation', () => {
  let s: TestServer;
  before(async () => (s = await startServer()));
  after(() => s.close());
  const url = '/static/vendor/' + CORE;
  const orig = () => readFileSync(join(vendor, CORE));

  it('brotli when offered, original Content-Type kept, body decodes to the file', async () => {
    const r = await raw(s.base, url, { 'accept-encoding': 'gzip, deflate, br, zstd' });
    assert.equal(r.status, 200);
    assert.equal(r.headers['content-encoding'], 'br');
    assert.equal(r.headers['content-type'], 'text/javascript; charset=utf-8');
    assert.equal(r.headers['vary'], 'Accept-Encoding');
    assert.equal(Number(r.headers['content-length']), r.body.length);
    assert.ok(r.body.length < orig().length * 0.4, `br body is ${r.body.length} bytes`);
    assert.ok(brotliDecompressSync(r.body).equals(orig()));
    assert.ok(r.headers['content-security-policy'], 'security headers still sent');
  });
  it('gzip when brotli is not offered or refused', async () => {
    for (const ae of ['gzip', 'br;q=0, gzip;q=0.8', 'x-gzip']) {
      const r = await raw(s.base, url, { 'accept-encoding': ae });
      assert.equal(r.headers['content-encoding'], 'gzip', ae);
      assert.equal(r.headers['content-type'], 'text/javascript; charset=utf-8');
      assert.ok(gunzipSync(r.body).equals(orig()), ae);
    }
  });
  it('falls back to the uncompressed file when no encoding is accepted', async () => {
    for (const ae of [undefined, 'identity', 'br;q=0, gzip;q=0', '*;q=0', 'deflate']) {
      const r = await raw(s.base, url, ae === undefined ? {} : { 'accept-encoding': ae });
      assert.equal(r.status, 200);
      assert.equal(r.headers['content-encoding'], undefined, String(ae));
      assert.equal(r.headers['content-type'], 'text/javascript; charset=utf-8');
      assert.ok(r.body.equals(orig()), String(ae));
    }
  });
  it('HEAD reports the negotiated encoding and length with no body', async () => {
    const r = await raw(s.base, url, { 'accept-encoding': 'br' }, 'HEAD');
    assert.equal(r.headers['content-encoding'], 'br');
    assert.equal(Number(r.headers['content-length']), statSync(join(vendor, CORE + '.br')).size);
    assert.equal(r.body.length, 0);
  });
  it('the .wasm core keeps application/wasm under encoding', async () => {
    const r = await raw(s.base, '/static/vendor/tesseract-core/tesseract-core-relaxedsimd-lstm.wasm', { 'accept-encoding': 'br' });
    assert.equal(r.headers['content-encoding'], 'br');
    assert.equal(r.headers['content-type'], 'application/wasm');
  });
  it('already-compressed language data is sent as-is, never double-encoded', async () => {
    const r = await raw(s.base, '/static/vendor/lang/eng.traineddata.gz', { 'accept-encoding': 'gzip, br' });
    assert.equal(r.headers['content-encoding'], undefined);
    assert.equal(r.headers['content-type'], 'application/octet-stream');
    assert.ok(r.body.equals(readFileSync(join(vendor, 'lang/eng.traineddata.gz'))));
  });
  it('negotiateEncoding: unit cases', () => {
    const f = join(vendor, CORE);
    assert.equal(negotiateEncoding('*', f)?.coding, 'br');
    assert.equal(negotiateEncoding('BR;Q=1', f)?.coding, 'br');
    assert.equal(negotiateEncoding('br;q=0, *', f)?.coding, 'gzip');
    assert.equal(negotiateEncoding('', f), null);
    assert.equal(negotiateEncoding('br', join(vendor, 'tesseract-core/LICENSE')), null);
  });
});
