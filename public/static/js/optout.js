// People-search opt-out email builder (/opt-out). Runs entirely in this
// browser: it reads the form, builds a mailto: link and lets the visitor's
// own email app open it. Nothing here makes a network request, stores
// anything, or sends what the visitor types to this site.
//
// The pure functions (buildEmail, mailtoHref, validate) are exposed as
// window.STMOptOut so test/optout.test.ts can load this file directly.
//
// It also wires the copy button of the AI assistant prompt on the same page,
// and the "Check again in three months" link, which builds a calendar (.ics)
// file in the browser from today's date (buildReminderIcs).
//
// Messages shown on the page follow the page language (<html lang>). The
// email itself (SUBJECT and buildEmail) stays in English on purpose: it goes
// to US companies that process these requests in English.
(function (root) {
  'use strict';

  var L10N = {
    'Enter your full name.': { es: 'Escriba su nombre completo.', vi: 'Hãy nhập họ và tên đầy đủ của bạn.' },
    'Keep your name under 100 characters.': { es: 'Su nombre debe tener menos de 100 caracteres.', vi: 'Tên của bạn phải ít hơn 100 ký tự.' },
    'Paste the full address of your listing, starting with https://, or leave this blank.': {
      es: 'Pegue la dirección completa de su ficha, que empiece con https://, o deje este campo en blanco.',
      vi: 'Hãy dán địa chỉ đầy đủ của trang hồ sơ, bắt đầu bằng https://, hoặc để trống ô này.',
    },
    'Enter the email address you want the reply sent to.': {
      es: 'Escriba la dirección de correo electrónico a la que quiere recibir la respuesta.',
      vi: 'Hãy nhập địa chỉ email bạn muốn nhận thư trả lời.',
    },
    'Enter an email address like name@example.com.': {
      es: 'Escriba una dirección de correo electrónico como name@example.com.',
      vi: 'Hãy nhập địa chỉ email có dạng name@example.com.',
    },
    'Prefer a web form? ': { es: '¿Prefiere un formulario web? ', vi: 'Bạn muốn dùng biểu mẫu web? ' },
    'Prompt copied. Paste it into a chat with your assistant.': {
      es: 'Instrucciones copiadas. Péguelas en un chat con su asistente.',
      vi: 'Đã sao chép lời nhắc. Hãy dán vào một cuộc trò chuyện với trợ lý của bạn.',
    },
    'Copy failed. The prompt is selected; copy it by hand.': {
      es: 'No se pudo copiar. Las instrucciones quedaron seleccionadas; cópielas a mano.',
      vi: 'Không sao chép được. Lời nhắc đã được chọn sẵn; hãy tự sao chép.',
    },
    'The prompt is selected; copy it by hand.': {
      es: 'Las instrucciones quedaron seleccionadas; cópielas a mano.',
      vi: 'Lời nhắc đã được chọn sẵn; hãy tự sao chép.',
    },
    'Check people-search sites again': {
      es: 'Revisar otra vez los sitios de búsqueda de personas',
      vi: 'Kiểm tra lại các trang tra cứu thông tin cá nhân',
    },
    'Listings come back when new data arrives. Go through the opt-out list again: ': {
      es: 'Las fichas vuelven a aparecer cuando llegan datos nuevos. Repase otra vez la lista para darse de baja: ',
      vi: 'Hồ sơ sẽ xuất hiện lại khi có dữ liệu mới. Hãy làm lại danh sách gỡ tên: ',
    },
  };
  var LANG = (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || 'en';

  function t(s) {
    var e = L10N[s];
    return (e && e[LANG]) || s;
  }

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
    if (!name) e.name = t('Enter your full name.');
    else if (name.length > 100) e.name = t('Keep your name under 100 characters.');
    if (url && !isListingUrl(url)) e.url = t('Paste the full address of your listing, starting with https://, or leave this blank.');
    if (!reply) e.reply = t('Enter the email address you want the reply sent to.');
    else if (!isEmail(reply)) e.reply = t('Enter an email address like name@example.com.');
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

  // ---- Re-check reminder: an all-day calendar event three months out ----
  // Built here from the visitor's own clock; nothing is sent or stored.

  // Same day three months later, clamped to the end of a shorter month
  // (Nov 30 -> Feb 28 or 29).
  function addMonths(d, n) {
    var y = d.getFullYear();
    var m = d.getMonth() + n;
    var last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(d.getDate(), last));
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
  function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  // RFC 5545 folds lines longer than 75 octets (UTF-8), continuing with a space.
  function fold(line) {
    var out = '';
    var bytes = 0;
    for (var i = 0; i < line.length; i++) {
      var c = line.charCodeAt(i);
      var ch = line[i];
      var len = c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c < 0xdc00) ? 4 : 3;
      if (len === 4) { ch += line[i + 1]; i++; }
      if (bytes + len > 75) { out += '\r\n '; bytes = 1; }
      out += ch;
      bytes += len;
    }
    return out;
  }
  var RECHECK_URL = 'https://spampatterns.com/opt-out';

  // {date: 'YYYYMMDD', ics: text} for a reminder three months after `now`.
  function buildReminderIcs(now) {
    var start = addMonths(now, 3);
    var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    var stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var url = RECHECK_URL + (LANG === 'es' || LANG === 'vi' ? '?lang=' + LANG : '');
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Spam Patterns//Opt-out reminder//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + stamp + '-' + ymd(start) + '-recheck@spampatterns.com',
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + ymd(start),
      'DTEND;VALUE=DATE:' + ymd(end),
      'SUMMARY:' + icsText(t('Check people-search sites again')),
      'DESCRIPTION:' + icsText(t('Listings come back when new data arrives. Go through the opt-out list again: ') + url),
      'URL:' + url,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return { date: ymd(start), ics: lines.map(fold).join('\r\n') + '\r\n' };
  }

  root.STMOptOut = { SUBJECT: SUBJECT, buildEmail: buildEmail, mailtoHref: mailtoHref, validate: validate, buildReminderIcs: buildReminderIcs };

  if (typeof document === 'undefined') return;

  // ---- Copy button for the AI assistant prompt (only where it exists) ----
  // Copies the text of the <pre> as it is; without the Clipboard API it
  // selects the text so the visitor can copy it by hand.
  var copyBtn = document.getElementById('ai-copy');
  var copyIcon = document.getElementById('ai-copy-icon');
  var promptEl = document.getElementById('ai-prompt');
  var copyStatus = document.getElementById('ai-copy-status');
  if (copyBtn && promptEl && copyStatus) {
    copyBtn.hidden = false;
    if (copyIcon) copyIcon.hidden = false;
    var selectPrompt = function () {
      try {
        var range = document.createRange();
        range.selectNodeContents(promptEl);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) { /* ignore */ }
    };
    var doCopy = function () {
      var text = promptEl.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          copyStatus.textContent = t('Prompt copied. Paste it into a chat with your assistant.');
        }, function () {
          selectPrompt();
          copyStatus.textContent = t('Copy failed. The prompt is selected; copy it by hand.');
        });
      } else {
        selectPrompt();
        copyStatus.textContent = t('The prompt is selected; copy it by hand.');
      }
    };
    copyBtn.addEventListener('click', doCopy);
    if (copyIcon) copyIcon.addEventListener('click', doCopy);
  }

  // ---- Re-check reminder download (only where the link exists) ----
  // The file is built on click from today's date and handed to the
  // browser as a blob: URL on the link itself (a download, no request).
  var recheck = document.getElementById('recheck-ics');
  if (recheck && typeof Blob !== 'undefined' && window.URL && URL.createObjectURL) {
    recheck.hidden = false;
    var recheckNote = document.getElementById('recheck-note');
    if (recheckNote) recheckNote.hidden = false;
    var lastUrl = null;
    recheck.addEventListener('click', function () {
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      var r = buildReminderIcs(new Date());
      lastUrl = URL.createObjectURL(new Blob([r.ics], { type: 'text/calendar;charset=utf-8' }));
      recheck.href = lastUrl;
    });
  }

  // ---- Email builder wiring (only where the builder exists) ----
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
      also.appendChild(document.createTextNode(t('Prefer a web form? ')));
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
