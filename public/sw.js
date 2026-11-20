// Spam Patterns service worker. Served at /sw.js (root scope).
//
// Scope, on purpose: only the app's own static files and the on-device OCR
// assets are stored, plus the /report page shell and an offline page.
// Never stored: POST responses, /api/* (preview, filing, deletion, flags),
// the /delete and /flag forms, any JSON, and pages with live counts
// (/, /patterns, pattern pages), which are network-only with an offline
// fallback. Nothing a visitor types is ever stored here.
//
// VERSION must equal package.json "version" (test/pwa.test.ts checks it), so
// every release gets a fresh cache and old caches are deleted on activate.
'use strict';

var VERSION = '0.1.9';
var CACHE = 'stm-v' + VERSION;
var OFFLINE_URL = '/offline';

// Installed up front: the app CSS/JS, the icons and logo, and the offline page.
var PRECACHE = [
  OFFLINE_URL,
  '/static/css/app.css',
  '/static/js/pwa.js',
  '/static/js/report.js',
  '/static/js/ocr-extract.js',
  '/static/js/receipts.js',
  '/static/img/logo.svg',
  '/static/img/flow-diagram.svg',
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

function navigate(request, url) {
  var shell = SHELL_PAGES.indexOf(url.pathname) !== -1 && !url.search;
  return fetch(request).then(function (response) {
    if (shell && storable(response)) {
      var copy = response.clone();
      caches.open(CACHE).then(function (cache) { return cache.put(url.pathname, copy); });
    }
    return response;
  }, function () {
    return caches.open(CACHE).then(function (cache) {
      return (shell ? cache.match(url.pathname) : Promise.resolve(null)).then(function (hit) {
        return hit || cache.match(OFFLINE_URL);
      });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return; // POSTs always go straight to the network, never stored.
  var url = new URL(request.url);
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
