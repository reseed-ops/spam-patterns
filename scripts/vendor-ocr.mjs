// Copies the in-browser OCR assets (Tesseract.js worker, WASM core, English
// language data) from node_modules into public/static/vendor so they are
// served from this origin. No CDN is ever used.
//
// It also writes pre-compressed siblings (`<file>.br`, `<file>.gz`) for the
// compressible assets, so the static server can send them with
// Content-Encoding instead of the ~3.9 MB uncompressed core. A variant is
// kept only when it saves at least 10%; already-compressed files such as
// eng.traineddata.gz therefore get none.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { brotliCompress, constants as zc, gzip } from 'node:zlib';

// The libuv pool starts lazily on first async zlib call, so this still applies.
process.env.UV_THREADPOOL_SIZE ??= String(Math.min(16, availableParallelism()));
const brotliP = promisify(brotliCompress);
const gzipP = promisify(gzip);
import { availableParallelism } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const out = join(root, 'public', 'static', 'vendor');
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'tesseract'), { recursive: true });
mkdirSync(join(out, 'tesseract-core'), { recursive: true });
mkdirSync(join(out, 'lang'), { recursive: true });

for (const f of ['tesseract.min.js', 'worker.min.js', 'tesseract.min.js.LICENSE.txt', 'worker.min.js.LICENSE.txt']) {
  cpSync(join(nm, 'tesseract.js', 'dist', f), join(out, 'tesseract', f));
}
for (const f of readdirSync(join(nm, 'tesseract.js-core'))) {
  if (/^tesseract-core.*\.(js|wasm)$/.test(f) || f === 'LICENSE') cpSync(join(nm, 'tesseract.js-core', f), join(out, 'tesseract-core', f));
}
cpSync(join(nm, '@tesseract.js-data', 'eng', '4.0.0_best_int', 'eng.traineddata.gz'), join(out, 'lang', 'eng.traineddata.gz'));

// Keep in sync with COMPRESSIBLE in src/app.ts.
const COMPRESSIBLE = /\.(?:js|wasm|css|txt|svg)$/;
const MIN_BYTES = 1024;
let raw = 0, br = 0;
function walk(d) {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
}
// Async zlib runs on the libuv thread pool, so files compress in parallel.
await Promise.all(
  walk(out)
    .filter((f) => COMPRESSIBLE.test(f) && statSync(f).size >= MIN_BYTES)
    .map(async (f) => {
      const buf = readFileSync(f);
      const [b, g] = await Promise.all([
        brotliP(buf, { params: { [zc.BROTLI_PARAM_QUALITY]: 11, [zc.BROTLI_PARAM_SIZE_HINT]: buf.length } }),
        gzipP(buf, { level: 9 }),
      ]);
      for (const [ext, z] of [['br', b], ['gz', g]]) if (z.length <= buf.length * 0.9) writeFileSync(`${f}.${ext}`, z);
      raw += buf.length;
      br += b.length;
    }),
);
console.log(`OCR assets copied to public/static/vendor (compressible ${(raw / 1e6).toFixed(2)} MB -> ${(br / 1e6).toFixed(2)} MB brotli)`);
