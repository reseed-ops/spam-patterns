// Report flow. No framework, no storage APIs: the draft lives in memory only
// and is cleared after filing. The one thing kept after filing is the
// deletion receipt code, saved on this device by receipts.js (browser storage,
// never sent anywhere); this file does not touch storage itself, except to
// pick up and delete a screenshot shared from Android's share sheet, which
// the service worker keeps on this device until this page reads it (see
// takeShared below). The screenshot never leaves this page: it is
// read on this device, first by the browser's built-in text reader (the
// Shape Detection API's TextDetector) where one exists, otherwise by
// Tesseract.js running locally (self-hosted worker, core and language data,
// loaded only when that fallback runs). Only the extracted text is ever
// sent, and only to build the review preview.
(function () {
  'use strict';
  var app = document.getElementById('report-app');
  if (!app) return;

  // Interface text in Spanish and Vietnamese (the page's <html lang>); the
  // English is the key. Server messages come back translated through ?lang=.
  var L10N = {
    'Read on this device. Reader: your browser’s built-in text detection (TextDetector).': {
      es: 'Leído en este dispositivo. Lector: la detección de texto integrada de su navegador (TextDetector).',
      vi: 'Đã đọc trên thiết bị này. Trình đọc: tính năng nhận dạng chữ có sẵn trong trình duyệt của bạn (TextDetector).',
    },
    'Read on this device. Reader: Tesseract (in-browser OCR).': {
      es: 'Leído en este dispositivo. Lector: Tesseract (OCR en el navegador).',
      vi: 'Đã đọc trên thiết bị này. Trình đọc: Tesseract (OCR trong trình duyệt).',
    },
    'Check the highlighted fields:': { es: 'Revise los campos marcados:', vi: 'Hãy kiểm tra các trường được đánh dấu:' },
    'We could not prepare the review. Try again.': {
      es: 'No pudimos preparar la revisión. Inténtelo de nuevo.',
      vi: 'Chúng tôi không thể chuẩn bị bước xem lại. Hãy thử lại.',
    },
    'We could not reach the site to prepare your review. Check your connection and try again.': {
      es: 'No pudimos conectarnos con el sitio para preparar su revisión. Revise su conexión e inténtelo de nuevo.',
      vi: 'Không thể kết nối đến trang để chuẩn bị bước xem lại. Hãy kiểm tra kết nối và thử lại.',
    },
    'Area code': { es: 'Código de área', vi: 'Mã vùng' },
    'Prefix (next 3 digits)': { es: 'Prefijo (los 3 dígitos siguientes)', vi: 'Tiền tố (3 chữ số tiếp theo)' },
    'Keyed hash of the full number': { es: 'Hash con clave del número completo', vi: 'Mã băm có khóa của số đầy đủ' },
    'Kept internally, never shown': { es: 'Se guarda internamente, nunca se muestra', vi: 'Chỉ lưu nội bộ, không bao giờ hiển thị' },
    'Category': { es: 'Categoría', vi: 'Danh mục' },
    'City named in the message': { es: 'Ciudad mencionada en el mensaje', vi: 'Thành phố được nêu trong tin nhắn' },
    'None': { es: 'Ninguna', vi: 'Không có' },
    'Enter the sender number shown in the text.': {
      es: 'Escriba el número del remitente que aparece en el mensaje.',
      vi: 'Nhập số của người gửi hiển thị trong tin nhắn.',
    },
    'Enter the message text.': { es: 'Escriba el texto del mensaje.', vi: 'Nhập nội dung tin nhắn.' },
    'Try again': { es: 'Intentar de nuevo', vi: 'Thử lại' },
    'File this report': { es: 'Enviar este reporte', vi: 'Gửi báo cáo này' },
    'Reporting is paused on this site right now. Nothing was saved.': {
      es: 'Los reportes están en pausa en este sitio por ahora. No se guardó nada.',
      vi: 'Hiện trang này đang tạm ngừng nhận báo cáo. Không có gì được lưu.',
    },
    'Filing report…': { es: 'Enviando el reporte…', vi: 'Đang gửi báo cáo…' },
    'The report was not filed. Check the details and try again.': {
      es: 'El reporte no se envió. Revise los datos e inténtelo de nuevo.',
      vi: 'Báo cáo chưa được gửi. Hãy kiểm tra thông tin và thử lại.',
    },
    'We couldn’t confirm whether your report was filed. Try again to check.': {
      es: 'No pudimos confirmar si su reporte se envió. Vuelva a intentarlo para comprobarlo.',
      vi: 'Chúng tôi không thể xác nhận báo cáo của bạn đã được gửi hay chưa. Hãy thử lại để kiểm tra.',
    },
    'Code copied.': { es: 'Código copiado.', vi: 'Đã sao chép mã.' },
    'Copy failed. Select the code and copy it manually.': {
      es: 'No se pudo copiar. Seleccione el código y cópielo a mano.',
      vi: 'Sao chép không thành công. Hãy chọn mã và sao chép thủ công.',
    },
    'Select the code and copy it manually.': { es: 'Seleccione el código y cópielo a mano.', vi: 'Hãy chọn mã và sao chép thủ công.' },
    'Reading on your device: {status}…': { es: 'Leyendo en su dispositivo: {status}…', vi: 'Đang đọc trên thiết bị của bạn: {status}…' },
    'Reading on your device. This can take a few seconds.': {
      es: 'Leyendo en su dispositivo. Esto puede tardar unos segundos.',
      vi: 'Đang đọc trên thiết bị của bạn. Việc này có thể mất vài giây.',
    },
    // Tesseract's own progress statuses (shown after "Reading on your device:").
    'loading tesseract core': { es: 'cargando el motor de Tesseract', vi: 'đang tải lõi Tesseract' },
    'initializing tesseract': { es: 'iniciando Tesseract', vi: 'đang khởi động Tesseract' },
    'initialized tesseract': { es: 'Tesseract iniciado', vi: 'đã khởi động Tesseract' },
    'loading language traineddata': { es: 'cargando los datos del idioma', vi: 'đang tải dữ liệu ngôn ngữ' },
    'loaded language traineddata': { es: 'datos del idioma cargados', vi: 'đã tải dữ liệu ngôn ngữ' },
    'initializing api': { es: 'iniciando la API', vi: 'đang khởi tạo API' },
    'initialized api': { es: 'API iniciada', vi: 'đã khởi tạo API' },
    'recognizing text': { es: 'reconociendo el texto', vi: 'đang nhận dạng chữ' },
    'This file type is not supported. Use PNG, JPEG or WebP, or enter the details manually.': {
      es: 'Este tipo de archivo no es compatible. Use PNG, JPEG o WebP, o escriba los datos a mano.',
      vi: 'Loại tệp này không được hỗ trợ. Hãy dùng PNG, JPEG hoặc WebP, hoặc nhập thông tin thủ công.',
    },
    'This file is larger than {mb} MB. Choose a smaller screenshot, or enter the details manually.': {
      es: 'Este archivo pesa más de {mb} MB. Elija una captura de pantalla más pequeña o escriba los datos a mano.',
      vi: 'Tệp này lớn hơn {mb} MB. Hãy chọn ảnh chụp màn hình nhỏ hơn, hoặc nhập thông tin thủ công.',
    },
    'This image is too large to read (over {mp} megapixels). Choose a smaller screenshot, or enter the details manually.': {
      es: 'Esta imagen es demasiado grande para leerla (más de {mp} megapíxeles). Elija una captura de pantalla más pequeña o escriba los datos a mano.',
      vi: 'Ảnh này quá lớn để đọc (trên {mp} megapixel). Hãy chọn ảnh chụp màn hình nhỏ hơn, hoặc nhập thông tin thủ công.',
    },
    'We couldn’t read this screenshot. Choose another image or enter the details manually.': {
      es: 'No pudimos leer esta captura de pantalla. Elija otra imagen o escriba los datos a mano.',
      vi: 'Chúng tôi không đọc được ảnh chụp màn hình này. Hãy chọn ảnh khác hoặc nhập thông tin thủ công.',
    },
    'We found the message but couldn’t find the sender number. Enter it to continue.': {
      es: 'Encontramos el mensaje, pero no el número del remitente. Escríbalo para continuar.',
      vi: 'Chúng tôi tìm thấy tin nhắn nhưng không tìm thấy số của người gửi. Hãy nhập số để tiếp tục.',
    },
    'Screenshot reading is temporarily unavailable. You can enter the details manually.': {
      es: 'La lectura de capturas de pantalla no está disponible por el momento. Puede escribir los datos a mano.',
      vi: 'Tính năng đọc ảnh chụp màn hình tạm thời không khả dụng. Bạn có thể nhập thông tin thủ công.',
    },
  };
  var LANG = (document.documentElement && document.documentElement.lang) || 'en';
  if (LANG !== 'es' && LANG !== 'vi') LANG = 'en';
  function t(s, vars) {
    var e = LANG === 'en' ? null : L10N[s];
    var out = e && e[LANG] ? e[LANG] : s;
    return vars ? out.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? String(vars[k]) : m; }) : out;
  }
  // Same-site URL in the page language (API calls and history entries).
  function withLang(path) { return LANG === 'en' ? path : path + (path.indexOf('?') === -1 ? '?' : '&') + 'lang=' + LANG; }

  var MAX_MB = Number(app.getAttribute('data-max-mb')) || 8;
  var MAX_PIXELS = Number(app.getAttribute('data-max-pixels')) || 16000000;
  var TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  // In-service area codes from the NANPA table, for the number fallback.
  var NPAS = {};
  (app.getAttribute('data-npas') || '').split(/\s+/).forEach(function (c) { if (c) NPAS[c] = true; });
  function isValidNpa(npa) { return NPAS[npa] === true; }
  var ENGINE_NOTE = {
    textdetector: 'Read on this device. Reader: your browser’s built-in text detection (TextDetector).',
    tesseract: 'Read on this device. Reader: Tesseract (in-browser OCR).',
  };

  var draft = emptyDraft();
  var preview = null;
  var idemKey = null;
  var filing = false;
  var ocrGen = 0;
  var ocrWorker = null;

  function emptyDraft() {
    return { number: '', message: '', category: 'unknown', city: '', removals: [], source: 'manual', engine: '' };
  }

  function $(id) { return document.getElementById(id); }

  function show(step) {
    var secs = app.querySelectorAll('[data-step]');
    for (var i = 0; i < secs.length; i++) secs[i].hidden = secs[i].getAttribute('data-step') !== step;
    var h = app.querySelector('[data-step="' + step + '"] h1');
    if (h) h.focus();
  }

  function newKey() {
    var b = new Uint8Array(24);
    crypto.getRandomValues(b);
    var s = '';
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function post(path, body) {
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 20000);
    return fetch(withLang(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl.signal,
      credentials: 'omit',
      cache: 'no-store',
    }).then(function (r) {
      clearTimeout(timer);
      return r.json().then(function (j) { return { status: r.status, body: j }; });
    }, function (e) { clearTimeout(timer); throw e; });
  }

  // ---------- navigation ----------
  app.addEventListener('click', function (e) {
    var go = e.target.closest ? e.target.closest('[data-go]') : null;
    if (!go) return;
    var step = go.getAttribute('data-go');
    if (step === 'details') fillForm();
    if (step === 'start') { draft = emptyDraft(); clearOcr(); }
    show(step);
  });

  // Small muted note naming the on-device reader, so field reports are
  // diagnosable. Never sent to the server.
  function engineNote() {
    var note = draft.source === 'screenshot' && ENGINE_NOTE[draft.engine] ? t(ENGINE_NOTE[draft.engine]) : '';
    ['d-engine', 'r-engine'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.textContent = note;
      el.hidden = !note;
    });
  }

  function fillForm() {
    engineNote();
    $('f-number').value = draft.number;
    $('f-message').value = draft.message;
    $('f-category').value = draft.category;
    $('f-city').value = draft.city;
  }

  function readForm() {
    draft.number = $('f-number').value;
    draft.message = $('f-message').value;
    draft.category = $('f-category').value;
    draft.city = $('f-city').value;
  }

  // ---------- errors ----------
  var FIELDS = ['number', 'message', 'category', 'city'];
  function clearErrors() {
    FIELDS.forEach(function (f) {
      var el = $('e-' + f);
      el.hidden = true; el.textContent = '';
      $('f-' + f).removeAttribute('aria-invalid');
    });
    $('details-summary').hidden = true;
  }
  function showErrors(errors) {
    clearErrors();
    var sum = $('details-summary');
    sum.textContent = '';
    var p = document.createElement('p');
    p.textContent = t('Check the highlighted fields:');
    sum.appendChild(p);
    var ul = document.createElement('ul');
    Object.keys(errors).forEach(function (k) {
      var msg = errors[k];
      var el = $('e-' + k);
      if (el) { el.textContent = msg; el.hidden = false; $('f-' + k).setAttribute('aria-invalid', 'true'); }
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#f-' + (el ? k : 'message');
      a.textContent = msg;
      li.appendChild(a); ul.appendChild(li);
    });
    sum.appendChild(ul);
    sum.hidden = false;
    sum.focus();
  }

  // ---------- preview ----------
  function requestPreview() {
    return post('/api/preview', {
      number: draft.number, message: draft.message, category: draft.category,
      city: draft.city, removals: draft.removals, source: draft.source,
    }).then(function (r) {
      if (r.status === 200) { setPreview(r.body.preview); show('review'); return; }
      if (r.status === 400 && r.body.errors) { fillForm(); show('details'); showErrors(r.body.errors); return; }
      fillForm(); show('details');
      showErrors({ message: r.body.message || t('We could not prepare the review. Try again.') });
    }, function () {
      fillForm(); show('details');
      showErrors({ message: t('We could not reach the site to prepare your review. Check your connection and try again.') });
    });
  }

  function dl(target, rows) {
    target.textContent = '';
    rows.forEach(function (r) {
      var dt = document.createElement('dt'); dt.textContent = r[0];
      var dd = document.createElement('dd'); dd.textContent = r[1];
      target.appendChild(dt); target.appendChild(dd);
    });
  }

  function setPreview(p) {
    if (!preview || preview.previewHash !== p.previewHash) idemKey = null;
    preview = p;
    engineNote();
    $('r-message').textContent = p.scrubbedMessage;
    var notes = $('r-notes'); notes.textContent = '';
    p.notes.forEach(function (n) { var li = document.createElement('li'); li.textContent = n; notes.appendChild(li); });
    dl($('r-kept'), [
      [t('Area code'), p.kept.areaCode],
      [t('Prefix (next 3 digits)'), p.kept.prefix],
      [t('Keyed hash of the full number'), t('Kept internally, never shown')],
      [t('Category'), p.kept.category],
      [t('City named in the message'), p.kept.city || t('None')],
    ]);
    dl($('r-public'), p.publicFields.map(function (f) { return [f.label, f.value]; }));
    $('file-error').hidden = true;
    $('review-changed').hidden = true;
  }

  $('details-form').addEventListener('submit', function (e) {
    e.preventDefault();
    readForm();
    clearErrors();
    var errs = {};
    if (!draft.number.trim()) errs.number = t('Enter the sender number shown in the text.');
    if (!draft.message.trim()) errs.message = t('Enter the message text.');
    if (Object.keys(errs).length) { showErrors(errs); return; }
    requestPreview();
  });

  $('add-removal').addEventListener('click', function () {
    var v = $('f-remove').value.trim();
    if (v.length < 2) return;
    if (draft.removals.indexOf(v) === -1) draft.removals.push(v);
    $('f-remove').value = '';
    requestPreview();
  });

  // ---------- filing ----------
  function fileError(text, retry) {
    var el = $('file-error');
    el.textContent = text;
    el.hidden = false;
    el.focus();
    $('file-btn').textContent = retry ? t('Try again') : t('File this report');
  }

  $('file-btn').addEventListener('click', function () {
    if (filing || !preview) return;
    if (app.getAttribute('data-paused') === '1') {
      fileError(t('Reporting is paused on this site right now. Nothing was saved.'), false);
      return;
    }
    filing = true;
    if (!idemKey) idemKey = newKey();
    var btn = $('file-btn');
    btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = t('Filing report…');
    post('/api/reports', {
      number: draft.number, message: draft.message, category: draft.category, city: draft.city,
      removals: draft.removals, source: draft.source, previewHash: preview.previewHash, idempotencyKey: idemKey,
    }).then(function (r) {
      filing = false; btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = t('File this report');
      if (r.status === 201 || r.status === 200) return done(r.body);
      if (r.status === 409 && r.body.status === 'preview_changed') {
        setPreview(r.body.preview);
        var n = $('review-changed'); n.textContent = r.body.message; n.hidden = false; n.focus();
        return;
      }
      fileError(r.body.message || t('The report was not filed. Check the details and try again.'), false);
    }, function () {
      filing = false; btn.disabled = false; btn.removeAttribute('aria-busy');
      fileError(t('We couldn’t confirm whether your report was filed. Try again to check.'), true);
    });
  });

  function done(body) {
    $('receipt').textContent = body.receipt;
    var saved = false;
    try { saved = !!(window.STMReceipts && window.STMReceipts.save(body.receipt, Date.now())); } catch (e) { saved = false; }
    $('receipt-saved').hidden = !saved;
    if (body.status === 'already_filed') $('done-message').textContent = body.message;
    draft = emptyDraft(); preview = null; idemKey = null;
    fillForm();
    show('done');
    try { history.pushState(null, '', withLang('/report/complete')); } catch (e) { /* ignore */ }
  }

  $('copy-receipt').addEventListener('click', function () {
    var code = $('receipt').textContent;
    var ok = function () { $('copy-status').textContent = t('Code copied.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(ok, function () {
        $('copy-status').textContent = t('Copy failed. Select the code and copy it manually.');
      });
    } else {
      $('copy-status').textContent = t('Select the code and copy it manually.');
    }
  });

  // ---------- screenshot (in-browser OCR) ----------
  var shot = $('shot');
  function shotError(msg) { var e = $('shot-error'); e.textContent = msg; e.hidden = false; }
  function clearOcr() {
    ocrGen++;
    if (ocrWorker) { try { ocrWorker.terminate(); } catch (e) { /* ignore */ } ocrWorker = null; }
    shot.value = '';
  }

  $('cancel-read').addEventListener('click', function () { clearOcr(); show('start'); });

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = '/static/vendor/tesseract/tesseract.min.js';
      s.onload = function () { window.Tesseract ? res(window.Tesseract) : rej(new Error('unavailable')); };
      s.onerror = function () { rej(new Error('unavailable')); };
      document.head.appendChild(s);
    });
  }

  function imageSizeOk(file) {
    if (!window.createImageBitmap) return Promise.resolve(true);
    return createImageBitmap(file).then(function (bmp) {
      var ok = bmp.width * bmp.height <= MAX_PIXELS;
      if (bmp.close) bmp.close();
      return ok;
    }, function () { return null; });
  }

  function splitOcr(text) {
    return window.STMExtract.extract(text, { isValidNpa: isValidNpa });
  }

  // Primary reader: the browser's own on-device text detection, where the
  // Shape Detection API exists. Resolves to text, or rejects on any failure
  // (missing API, unsupported platform, empty result) so the caller falls
  // back to Tesseract.
  function readWithTextDetector(file) {
    return new Promise(function (res, rej) {
      if (!('TextDetector' in window) || !window.createImageBitmap || !window.STMExtract) return rej(new Error('no TextDetector'));
      var bmp = null;
      var close = function () { if (bmp && bmp.close) { try { bmp.close(); } catch (e) { /* ignore */ } } bmp = null; };
      try {
        var detector = new window.TextDetector();
        createImageBitmap(file).then(function (b) {
          bmp = b;
          return detector.detect(b);
        }).then(function (results) {
          close();
          var text = window.STMExtract.assembleDetected(results);
          if (text.replace(/\W/g, '').length < 8) throw new Error('nothing detected');
          res(text);
        }).catch(function (e) { close(); rej(e); });
      } catch (e) { close(); rej(e); }
    });
  }

  // Tesseract's progress line. Its statuses are English; in another language
  // an unknown one falls back to the generic line rather than show English.
  function readingStatus(status) {
    if (LANG !== 'en' && !(L10N[status] && L10N[status][LANG])) return t('Reading on your device. This can take a few seconds.');
    return t('Reading on your device: {status}…', { status: t(status) });
  }

  // Fallback reader: Tesseract.js, whose assets are fetched only now.
  function readWithTesseract(file, gen) {
    return loadTesseract().then(function (T) {
      return T.createWorker('eng', 1, {
        workerPath: '/static/vendor/tesseract/worker.min.js',
        corePath: '/static/vendor/tesseract-core/',
        langPath: '/static/vendor/lang',
        workerBlobURL: false,
        cacheMethod: 'none',
        logger: function (m) {
          if (gen === ocrGen && m && m.status) $('reading-status').textContent = readingStatus(m.status);
        },
      });
    }).then(function (w) {
      if (gen !== ocrGen) { w.terminate(); return null; }
      ocrWorker = w;
      return w.recognize(file).then(function (out) {
        w.terminate(); ocrWorker = null;
        return (out && out.data && out.data.text) || '';
      });
    });
  }

  function readImage(file, gen) {
    return readWithTextDetector(file).then(function (text) {
      return { text: text, engine: 'textdetector' };
    }, function () {
      if (gen !== ocrGen) return null;
      return readWithTesseract(file, gen).then(function (text) {
        return text === null ? null : { text: text, engine: 'tesseract' };
      });
    });
  }

  // One path for every screenshot: the file picker and the share sheet.
  function takeImage(file) {
    $('shot-error').hidden = true;
    if (!file) return; // picker cancelled: stay here, no error
    if (TYPES.indexOf(file.type) === -1) { shot.value = ''; return shotError(t('This file type is not supported. Use PNG, JPEG or WebP, or enter the details manually.')); }
    if (file.size > MAX_MB * 1024 * 1024) { shot.value = ''; return shotError(t('This file is larger than {mb} MB. Choose a smaller screenshot, or enter the details manually.', { mb: MAX_MB })); }
    var gen = ++ocrGen;
    imageSizeOk(file).then(function (ok) {
      if (gen !== ocrGen) return;
      if (ok === false) { shot.value = ''; return shotError(t('This image is too large to read (over {mp} megapixels). Choose a smaller screenshot, or enter the details manually.', { mp: Math.round(MAX_PIXELS / 1e6) })); }
      if (ok === null) { shot.value = ''; return shotError(t('We couldn’t read this screenshot. Choose another image or enter the details manually.')); }
      show('reading');
      return readImage(file, gen).then(function (read) {
        shot.value = ''; file = null; // drop our only reference to the image
        if (gen !== ocrGen || !read) return; // cancelled: ignore late results
        var parts = splitOcr(read.text);
        if (parts.message.replace(/\W/g, '').length < 8) {
          show('start');
          return shotError(t('We couldn’t read this screenshot. Choose another image or enter the details manually.'));
        }
        draft = emptyDraft();
        draft.source = 'screenshot';
        draft.engine = read.engine;
        draft.message = parts.message;
        draft.number = parts.number;
        if (!parts.number) {
          fillForm(); show('details');
          var info = $('details-info');
          info.textContent = t('We found the message but couldn’t find the sender number. Enter it to continue.');
          info.hidden = false;
          $('f-number').focus();
          return;
        }
        return requestPreview();
      }).catch(function () {
        if (gen !== ocrGen) return;
        clearOcr();
        show('start');
        shotError(t('Screenshot reading is temporarily unavailable. You can enter the details manually.'));
      });
    });
  }

  shot.addEventListener('change', function () { takeImage(shot.files && shot.files[0]); });

  // Android share target (v0.1.10): public/sw.js answered the share on this
  // device and kept the image in Cache Storage. Read it once, delete it right
  // away, then handle it exactly like a picked file. Nothing found: nothing
  // happens, the page is as usual.
  var SHARE_CACHE = 'sp-shared-image';
  var SHARE_KEY = '/shared-image';
  function takeShared() {
    if (!/(?:^\?|&)shared=1(?:&|$)/.test(location.search) || !window.caches) return;
    caches.open(SHARE_CACHE).then(function (cache) {
      return cache.match(SHARE_KEY).then(function (hit) {
        if (!hit) return null;
        var drop = function () { return cache.delete(SHARE_KEY); };
        return hit.blob().then(function (blob) {
          return drop().then(function () { return blob; });
        }, function () { return drop().then(function () { return null; }); });
      });
    }).then(function (blob) { if (blob) takeImage(blob); }, function () { /* no shared image: page as usual */ });
  }
  takeShared();
})();
