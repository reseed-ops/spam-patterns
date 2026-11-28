// Interface language preference. Loaded (not deferred) in every page's head.
//
// The server picks the language from ?lang= alone. This file only remembers
// the choice on this device, in localStorage under "stm-lang" (no cookie;
// nothing is sent anywhere):
//   - a page opened with ?lang=en|es|vi stores that language;
//   - a page opened without ?lang= while Spanish or Vietnamese is stored is
//     reopened at once with ?lang= added (location.replace, so Back still works).
// The flags in the footer are plain links to ?lang=en|es|vi, so switching
// works without this file too; it just will not be remembered.
//
// Exposed as window.STMLang.decide for test/i18n.test.ts.
(function (root) {
  'use strict';
  var KEY = 'stm-lang';
  var LANGS = { en: true, es: true, vi: true };

  function storage() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  // What to do for a page at this search string with this stored value:
  // {store: lang} or {redirect: newSearch} or {}.
  function decide(search, saved) {
    var m = /[?&]lang=([^&#]*)/.exec(search || '');
    if (m) return LANGS[m[1]] ? { store: m[1] } : {};
    if (saved === 'es' || saved === 'vi') return { redirect: (search ? search + '&' : '?') + 'lang=' + saved };
    return {};
  }

  root.STMLang = { KEY: KEY, decide: decide };

  if (!root.location) return;
  var s = storage();
  var saved = null;
  try { saved = s ? s.getItem(KEY) : null; } catch (e) { saved = null; }
  var d = decide(root.location.search, saved);
  if (d.store) {
    try { if (s && saved !== d.store) s.setItem(KEY, d.store); } catch (e) { /* not remembered; ?lang= still works */ }
  } else if (d.redirect) {
    root.location.replace(root.location.pathname + d.redirect + root.location.hash);
  }
})(typeof window !== 'undefined' ? window : globalThis);
