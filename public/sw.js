// Spam Patterns service worker. Served at /sw.js (root scope).
//
// Scope, on purpose: only the app's own static files and the on-device OCR
// assets are stored, plus the /report page shell and an offline page.
// Never stored: POST responses, /api/* (preview, filing, deletion, flags),
// the /delete and /flag forms, any JSON, and pages with live counts
// (/, /patterns, pattern pages), which are network-only with an offline
// fallback. Nothing a visitor types is ever stored here.
//
// One exception, on the device only (v0.1.10): a screenshot shared to the
// installed app from Android's share sheet arrives as a POST to
// /share-target. This worker answers that POST itself, without any network
// request, keeps the image in its own cache (SHARE_CACHE) just long enough
// for /report to pick it up, and /report deletes it as soon as it reads it.
//
// VERSION must equal package.json "version" (test/pwa.test.ts checks it), so
// every release gets a fresh cache and old caches are deleted on activate.
// CACHE_REV is bumped when cached static files (e.g. app.css) change between
// releases, so returning visitors still get the new files; reset it to 1 on
// the next version bump.
'use strict';

var VERSION = '0.1.10';
var CACHE_REV = 6; // 2: main nav restyled as tabs; 3: Menu removed, tabs always shown; 4: language switcher, translated scripts; 5: AI assistant prompt on /opt-out; 6: AI prompt box compact
var CACHE = 'stm-v' + VERSION + '-r' + CACHE_REV;
var OFFLINE_URL = '/offline';
// Not 'stm-'-prefixed, so a release's activate step leaves a pending share alone.
var SHARE_CACHE = 'sp-shared-image';
var SHARE_KEY = '/shared-image';

// Installed up front: the app CSS/JS, the icons and logo, and the offline page.
var PRECACHE = [
  OFFLINE_URL,
  '/static/css/app.css',
  '/static/js/lang.js',
  '/static/js/pwa.js',
  '/static/js/report.js',
  '/static/js/ocr-extract.js',
  '/static/js/receipts.js',
  '/static/img/logo.svg',
  '/static/icons/favicon-32.png',
  '/static/icons/apple-touch-icon.png',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/icons/icon-maskable-512.png',
];

// Pages with no live data whose last good copy may be shown offline.
var SHELL_PAGES = ['/report'];

// Cache-first at runtime: everything under /static/ that a page loads. On the
// report flow that includes the on-device OCR assets report.js fetches only
// when a screenshot needs Tesseract:
//   /static/vendor/tesseract/tesseract.min.js      (script tag, report.js)
//   /static/vendor/tesseract/worker.min.js         (workerPath)
//   /static/vendor/tesseract-core/tesseract-core-*.wasm.js  (corePath; the
//       variant the browser supports, with the wasm core embedded)
//   /static/vendor/lang/eng.traineddata.gz         (langPath)
var STATIC_PREFIX = '/static/';

function neverStore(url) {
  return (
    url.pathname.indexOf('/api/') === 0 ||
    url.pathname === '/delete' ||
    url.pathname === '/flag' ||
    url.pathname === '/healthz' ||
    url.pathname === '/sw.js' ||
    /\.json$/i.test(url.pathname)
  );
}

function storable(response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return false;
  var type = (response.headers.get('Content-Type') || '').toLowerCase();
  return type.indexOf('json') === -1;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE.map(function (u) { return new Request(u, { cache: 'reload', credentials: 'omit' }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf('stm-') === 0 && k !== CACHE) return caches.delete(k);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function cacheFirst(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request, { ignoreVary: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (response) {
        if (storable(response)) cache.put(request, response.clone());
        return response;
      });
    });
  });
}

// Android share target. Never calls fetch(): the image stays on the device.
// Stores the shared file under SHARE_KEY with its own content type, then
// sends the browser to /report?shared=1. Anything unreadable, or no file:
// nothing stored, plain /report.
function receiveShare(request) {
  var plain = function () { return Response.redirect(new URL('/report', self.location.origin).href, 303); };
  return request.formData().then(function (form) {
    var file = form.get('image');
    if (!file || typeof file === 'string' || !file.size) return plain();
    var stored = new Response(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } });
    return caches.open(SHARE_CACHE).then(function (cache) {
      return cache.put(SHARE_KEY, stored);
    }).then(function () {
      return Response.redirect(new URL('/report?shared=1', self.location.origin).href, 303);
    });
  }).catch(plain);
}

function navigate(request, url) {
  var shell = SHELL_PAGES.indexOf(url.pathname) !== -1 && !url.search;
  // /report?shared=1 may use the stored /report shell offline (its image is
  // read on the device), but is never itself stored.
  var shellFallback = shell || (url.pathname === '/report' && url.search === '?shared=1');
  return fetch(request).then(function (response) {
    if (shell && storable(response)) {
      var copy = response.clone();
      caches.open(CACHE).then(function (cache) { return cache.put(url.pathname, copy); });
    }
    return response;
  }, function () {
    return caches.open(CACHE).then(function (cache) {
      return (shellFallback ? cache.match(url.pathname) : Promise.resolve(null)).then(function (hit) {
        return hit || cache.match(OFFLINE_URL);
      });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);
  if (request.method === 'POST' && url.origin === self.location.origin && url.pathname === '/share-target') {
    event.respondWith(receiveShare(request));
    return;
  }
  if (request.method !== 'GET') return; // Other POSTs always go straight to the network, never stored.
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // Network-first; only SHELL_PAGES are ever stored, everything else just
    // falls back to the offline page when the network fails.
    event.respondWith(navigate(request, url));
    return;
  }
  if (neverStore(url)) return;
  if (url.pathname.indexOf(STATIC_PREFIX) === 0 && !request.headers.has('range')) {
    event.respondWith(cacheFirst(request));
  }
  // Anything else (the manifest, robots.txt): default network handling.
});
