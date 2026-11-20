// Deletion receipt codes kept on this device (v0.1.9). The list lives only in
// this browser's localStorage, under one key, as {code, filedAt} entries:
// at most the 5 most recent, none older than 90 days (pruned on every read
// and write). Nothing here makes a network call, sets a cookie, or puts a
// code in a web address. A code leaves the device only when the visitor
// chooses to delete that report, through the ordinary /delete form.
//
// If localStorage is unavailable (private mode, disabled, quota), every call
// fails quietly and the site behaves as before: the code is shown once.
//
// The pure list functions take an explicit `now` and a storage object, so
// test/receipts.test.ts loads this file directly. In the browser it also
// wires up the /delete page (#stored-receipts) when that section exists.
(function (root) {
  'use strict';

  var KEY = 'stm.receipts.v1';
  var MAX = 5;
  var TTL_MS = 90 * 24 * 60 * 60 * 1000;
  var MARK_MS = 10 * 60 * 1000; // a deletion in flight is forgotten after 10 minutes
  var B32 = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789';

  // Same normalization as the server's normalizeReceipt (src/crypto.ts).
  function normalize(input) {
    if (typeof input !== 'string' || input.length > 80) return null;
    var s = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
    if (!/^[A-Z0-9]{32}$/.test(s)) return null;
    for (var i = 0; i < s.length; i++) if (B32.indexOf(s[i]) === -1) return null;
    return s.match(/.{4}/g).join('-');
  }

  // Valid, unexpired, unique entries, newest first, capped at MAX.
  function prune(list, now) {
    if (!Array.isArray(list)) return [];
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e || typeof e !== 'object') continue;
      var code = normalize(e.code);
      var t = e.filedAt;
      if (!code || typeof t !== 'number' || !isFinite(t)) continue;
      if (t <= now - TTL_MS || t > now + TTL_MS) continue;
      if (seen[code]) continue;
      seen[code] = true;
      var entry = { code: code, filedAt: t };
      if (typeof e.deleting === 'number' && e.deleting > now - MARK_MS && e.deleting <= now) entry.deleting = e.deleting;
      out.push(entry);
    }
    out.sort(function (a, b) { return b.filedAt - a.filedAt; });
    return out.slice(0, MAX);
  }

  function storage(store) {
    if (store) return store;
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  function write(list, store) {
    var s = storage(store);
    if (!s) return false;
    try {
      if (list.length) s.setItem(KEY, JSON.stringify(list));
      else s.removeItem(KEY);
      return true;
    } catch (e) { return false; }
  }

  // Read, prune, and write back the pruned list. Returns [] when unavailable.
  function read(now, store) {
    var s = storage(store);
    if (!s) return [];
    var raw = null;
    try { raw = s.getItem(KEY); } catch (e) { return []; }
    if (raw === null) return [];
    var parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    var list = prune(parsed, now);
    if (JSON.stringify(list) !== raw) write(list, s);
    return list;
  }

  // Store a freshly filed code. Returns true only if it was really saved.
  function save(code, now, store) {
    var c = normalize(code);
    if (!c || !storage(store)) return false;
    var list = read(now, store).filter(function (e) { return e.code !== c; });
    list.unshift({ code: c, filedAt: now });
    list = prune(list, now);
    if (!write(list, store)) return false;
    return read(now, store).some(function (e) { return e.code === c; });
  }

  function remove(code, now, store) {
    var c = normalize(code);
    var list = read(now, store);
    var next = list.filter(function (e) { return e.code !== c; });
    if (next.length !== list.length) write(next, store);
  }

  // Mark the code whose final delete form was just submitted (only one at a
  // time, for 10 minutes); the result page then removes it if the deletion
  // succeeded or the report was already deleted.
  function markDeleting(code, now, store) {
    var c = normalize(code);
    var list = read(now, store);
    var hit = false;
    list.forEach(function (e) {
      delete e.deleting;
      if (e.code === c) { e.deleting = now; hit = true; }
    });
    write(list, store);
    return hit;
  }

  // On the deletion result page: drop marked codes on success, unmark them otherwise.
  function settle(status, now, store) {
    var list = read(now, store);
    if (!list.some(function (e) { return e.deleting; })) return;
    var ok = status === 'deleted' || status === 'already_deleted';
    var next = [];
    list.forEach(function (e) {
      if (!e.deleting) next.push(e);
      else if (!ok) next.push({ code: e.code, filedAt: e.filedAt });
    });
    write(next, store);
  }

  // "Remove these codes from this device": clears the list, deletes nothing.
  function forget(store) {
    var s = storage(store);
    if (!s) return false;
    try { s.removeItem(KEY); return true; } catch (e) { return false; }
  }

  function fmt(t) {
    try {
      return new Date(t).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch (e) { return new Date(t).toISOString().slice(0, 10); }
  }

  // ---------- /delete page ----------
  function submitDelete(doc, step, code) {
    var f = doc.createElement('form');
    f.method = 'post';
    f.action = '/delete';
    f.setAttribute('autocomplete', 'off');
    f.hidden = true;
    [['step', step], ['code', code]].forEach(function (p) {
      var i = doc.createElement('input');
      i.type = 'hidden'; i.name = p[0]; i.value = p[1];
      f.appendChild(i);
    });
    doc.body.appendChild(f);
    f.submit();
  }

  function render(doc, sec, now) {
    var list = read(now);
    var ul = sec.querySelector('ul');
    ul.textContent = '';
    if (!list.length) { sec.hidden = true; return; }
    list.forEach(function (e) {
      var li = doc.createElement('li');
      var when = fmt(e.filedAt);
      var span = doc.createElement('span');
      span.textContent = 'Filed ' + when;
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-secondary';
      btn.textContent = 'Delete this report';
      btn.setAttribute('aria-label', 'Delete the report filed ' + when);
      // The code is read from storage at click time and never put in the page.
      var filedAt = e.filedAt;
      btn.addEventListener('click', function () {
        var hit = read(Date.now()).filter(function (x) { return x.filedAt === filedAt; })[0];
        if (hit) submitDelete(doc, 'confirm', hit.code); else render(doc, sec, Date.now());
      });
      li.appendChild(span); li.appendChild(doc.createTextNode(' ')); li.appendChild(btn);
      ul.appendChild(li);
    });
    sec.hidden = false;
  }

  function initDeletePage(doc) {
    var page = doc.getElementById('delete-page');
    if (!page) return;
    var view = page.getAttribute('data-view');
    if (view === 'result') settle(page.getAttribute('data-status'), Date.now());
    if (view === 'confirm') {
      var form = doc.getElementById('delete-confirm-form');
      if (form) form.addEventListener('submit', function () { markDeleting(form.elements.code.value, Date.now()); });
    }
    var sec = doc.getElementById('stored-receipts');
    if (!sec) return;
    render(doc, sec, Date.now());
    var forgetBtn = doc.getElementById('forget-receipts');
    if (forgetBtn) {
      forgetBtn.addEventListener('click', function () {
        forget();
        render(doc, sec, Date.now());
        var st = doc.getElementById('forget-status');
        if (st) { st.textContent = 'The codes were removed from this device. No report was deleted.'; st.hidden = false; st.focus(); }
      });
    }
  }

  root.STMReceipts = {
    KEY: KEY, MAX: MAX, TTL_MS: TTL_MS,
    normalize: normalize, prune: prune, read: read, save: save, remove: remove,
    markDeleting: markDeleting, settle: settle, forget: forget,
  };

  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { initDeletePage(root.document); });
    else initDeletePage(root.document);
  }
})(typeof window !== 'undefined' ? window : globalThis);
