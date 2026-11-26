// People-search opt-out email builder (/opt-out). Runs entirely in this
// browser: it reads the form, builds a mailto: link and lets the visitor's
// own email app open it. Nothing here makes a network request, stores
// anything, or sends what the visitor types to this site.
//
// The pure functions (buildEmail, mailtoHref, validate) are exposed as
// window.STMOptOut so test/optout.test.ts can load this file directly.
//
// It also wires the copy button of the AI assistant prompt on the same page.
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

  root.STMOptOut = { SUBJECT: SUBJECT, buildEmail: buildEmail, mailtoHref: mailtoHref, validate: validate };

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
