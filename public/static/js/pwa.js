// Registers the service worker (see /sw.js for exactly what it stores) and,
// only if the browser offers it, reveals a plain "Install" button. No
// popups or banners. Self-hosted for the CSP (script-src 'self').
(function () {
  'use strict';
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () { /* the site works without it */ });
    });
  }
  var deferred = null;
  function buttons() { return document.querySelectorAll('.install-btn'); }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); // keep the browser's own mini-infobar from appearing; the button below is the only prompt
    deferred = e;
    buttons().forEach(function (b) { b.hidden = false; });
  });
  window.addEventListener('appinstalled', function () {
    deferred = null;
    buttons().forEach(function (b) { b.hidden = true; });
  });
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.install-btn') : null;
    if (!b || !deferred) return;
    var ev = deferred; deferred = null;
    ev.prompt();
    ev.userChoice.then(function () { buttons().forEach(function (x) { x.hidden = true; }); }, function () {});
  });
})();
