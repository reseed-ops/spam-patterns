// Registers the service worker (see /sw.js for exactly what it stores).
// The site never prompts for installation: no button, banner or popup. It
// stays installable from the browser's own menu. Self-hosted for the CSP
// (script-src 'self').
(function () {
  'use strict';
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () { /* the site works without it */ });
    });
  }
  // Suppress the browser's automatic install mini-infobar. Installing from
  // the browser menu still works; the deferred event is never shown.
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); });
})();
