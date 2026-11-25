// People-search opt-out email builder (/opt-out). Runs entirely in this
// browser: it reads the form, builds a mailto: link and lets the visitor's
// own email app open it. Nothing here makes a network request, stores
// anything, or sends what the visitor types to this site.
//
// The pure functions (buildEmail, mailtoHref, validate) are exposed as
// window.STMOptOut so test/optout.test.ts can load this file directly.
(function (root) {
  'use strict';

  var SUBJECT = 'Request to suppress/remove my personal information';

  function clean(v) {
    return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Simple shape checks only; the email app does the real work.
  function isEmail(v) {
    return /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[A-Za-z]{2,}$/.test(v) && v.length <= 120;
  }
  function isListingUrl(v) {
    return /^https?:\/\/[^\s/]+\.[^\s/]+(\/\S*)?$/i.test(v) && v.length <= 300;
  }

  // Returns {} when valid, or {field: message}.
  function validate(input) {
    var e = {};
    var name = clean(input.name);
    var url = clean(input.url);
    var reply = clean(input.reply);
    if (!name) e.name = 'Enter your full name.';
    else if (name.length > 100) e.name = 'Keep your name under 100 characters.';
    if (url && !isListingUrl(url)) e.url = 'Paste the full address of your listing, starting with https://, or leave this blank.';
    if (!reply) e.reply = 'Enter the email address you want the reply sent to.';
    else if (!isEmail(reply)) e.reply = 'Enter an email address like name@example.com.';
    return e;
  }

  // {to, subject, body} for a site with a published privacy address.
  function buildEmail(input) {
    var name = clean(input.name);
    var url = clean(input.url);
    var reply = clean(input.reply);
    var site = clean(input.siteName);
    var lines = [
      'Hello,',
      '',
      'My name is ' + name + '. Please suppress or remove my personal information from name search on ' + site + '.',
    ];
    if (url) lines.push('', 'My listing: ' + url);
    lines.push('', 'Please confirm when this is done by replying to ' + reply + '.', '', 'Thank you,', name);
    return { to: clean(input.to), subject: SUBJECT, body: lines.join('\r\n') };
  }

  function mailtoHref(email) {
    return 'mailto:' + email.to + '?subject=' + encodeURIComponent(email.subject) + '&body=' + encodeURIComponent(email.body);
  }

  root.STMOptOut = { SUBJECT: SUBJECT, buildEmail: buildEmail, mailtoHref: mailtoHref, validate: validate };

  // ---- Page wiring (only where the builder exists) ----
  if (typeof document === 'undefined') return;
  var app = document.getElementById('optout-app');
  if (!app) return;
  app.hidden = false;

  var $ = function (id) { return document.getElementById(id); };
  var fields = { name: $('o-name'), url: $('o-url'), reply: $('o-reply') };
  var site = $('o-site');
  var built = false;

  function selected() {
    var o = site.options[site.selectedIndex];
    return {
      name: o.getAttribute('data-name'),
      email: o.getAttribute('data-email'),
      form: o.getAttribute('data-form'),
      formLabel: o.getAttribute('data-form-label'),
      note: o.getAttribute('data-note'),
    };
  }

  function showErrors(errs) {
    var first = null;
    ['name', 'url', 'reply'].forEach(function (k) {
      var el = $('e-o-' + k);
      if (errs[k]) {
        el.textContent = errs[k];
        el.hidden = false;
        fields[k].setAttribute('aria-invalid', 'true');
        if (!first) first = fields[k];
      } else {
        el.textContent = '';
        el.hidden = true;
        fields[k].removeAttribute('aria-invalid');
      }
    });
    return first;
  }

  // Form-only sites never get a mailto; show their form instead.
  function render(focusErrors) {
    var s = selected();
    var formOnly = !s.email;
    $('o-formonly').hidden = !formOnly;
    $('o-build-wrap').hidden = formOnly;
    if (formOnly) {
      $('o-email').hidden = true;
      $('o-fo-name').textContent = s.name;
      var a = $('o-fo-link');
      a.href = s.form;
      a.textContent = s.formLabel;
      $('o-fo-note').textContent = s.note;
      showErrors({});
      return;
    }
    if (!built) return;
    var errs = validate({ name: fields.name.value, url: fields.url.value, reply: fields.reply.value });
    var first = showErrors(errs);
    if (first) {
      $('o-email').hidden = true;
      if (focusErrors) first.focus();
      return;
    }
    var email = buildEmail({ to: s.email, siteName: s.name, name: fields.name.value, url: fields.url.value, reply: fields.reply.value });
    $('o-to').textContent = email.to;
    $('o-subject').textContent = email.subject;
    $('o-body').textContent = email.body.replace(/\r\n/g, '\n');
    $('o-open').href = mailtoHref(email);
    var also = $('o-also');
    also.hidden = !s.form;
    also.textContent = '';
    if (s.form) {
      also.appendChild(document.createTextNode('Prefer a web form? '));
      var l = document.createElement('a');
      l.href = s.form;
      l.textContent = s.formLabel;
      also.appendChild(l);
    }
    $('o-email').hidden = false;
  }

  $('o-build').addEventListener('click', function () {
    built = true;
    render(true);
  });
  site.addEventListener('change', function () { render(false); });
  ['name', 'url', 'reply'].forEach(function (k) {
    fields[k].addEventListener('input', function () { render(false); });
  });
  render(false);
})(typeof window !== 'undefined' ? window : globalThis);
