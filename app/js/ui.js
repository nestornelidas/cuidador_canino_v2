/* Cuidador Canino - Utilidades de interfaz (iconos SVG, toasts, modales, imágenes) */
(function (root) {
  'use strict';

  var P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    dog: '<path d="M9 8l-4-3v5c-2 1-2 5 0 6v4h14v-4c2-1 2-5 0-6V5l-4 3"/><path d="M9 12.5h.01"/><path d="M15 12.5h.01"/>',
    clipboard: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    chevron_left: '<polyline points="15 18 9 12 15 6"/>',
    chevron_right: '<polyline points="9 18 15 12 9 6"/>',
    chevron_up: '<polyline points="18 15 12 9 6 15"/>',
    chevron_down: '<polyline points="6 9 12 15 18 9"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.86.35 1.7.67 2.49a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.59-1.24a2 2 0 0 1 2.11-.45c.79.32 1.63.55 2.49.67A2 2 0 0 1 22 16.92z"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    message: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    print: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    calendar_check: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    walking: '<path d="M13 5a2 2 0 1 0-4 0 2 2 0 0 0 4 0z"/><path d="M10 10l-3 3-1 6"/><path d="M14 9l2 3 4 1"/><path d="M12 13l-1-2"/>',
    bone: '<path d="M17 5a3 3 0 1 0 0 6c1.5 0 2-1 2-2s-.5-2-2-2z"/><path d="M7 5a3 3 0 1 1 0 6c-1.5 0-2-1-2-2s.5-2 2-2z"/><path d="M14 15l-1-2a3.5 3.5 0 0 0-2-2l-2-1"/><path d="M10 15l1-2a3.5 3.5 0 0 1 2-2l2-1"/>',
    back: '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    sparkles: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><path d="M19 14l.9 2.4L22 17.3l-2.1.9L19 20.6l-.9-2.4-2.1-.9 2.1-.9L19 14z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>'
  };

  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  /* ---------- HTML seguro ---------- */
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- Toasts ---------- */
  function toast(msg, type) {
    var rootEl = document.getElementById('toast-root');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = 'toast-root';
      document.body.appendChild(rootEl);
    }
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    var ic = type === 'success' ? 'check' : type === 'error' ? 'alert' : type === 'warning' ? 'alert' : 'info';
    el.innerHTML = icon(ic) + '<span>' + esc(msg) + '</span>';
    rootEl.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, 3200);
  }

  /* ---------- Modales ---------- */
  function ensureModalRoot() {
    var rootEl = document.getElementById('modal-root');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = 'modal-root';
      document.body.appendChild(rootEl);
    }
    return rootEl;
  }

  /* modal({title, body(html|Element), footer(html), size, onClose, closeOnBackdrop}) -> {close()} */
  function modal(opts) {
    var rootEl = ensureModalRoot();
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay && opts.closeOnBackdrop !== false) close();
    });
    var box = document.createElement('div');
    box.className = 'modal-box' + (opts.size ? ' modal-' + opts.size : '');
    var header = document.createElement('div');
    header.className = 'modal-header';
    var title = document.createElement('h3');
    title.textContent = opts.title || '';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'icon-btn';
    closeBtn.innerHTML = icon('x');
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.addEventListener('click', close);
    header.appendChild(title);
    header.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body && opts.body.nodeType) body.appendChild(opts.body);

    box.appendChild(header);
    box.appendChild(body);
    if (opts.footer) {
      var foot = document.createElement('div');
      foot.className = 'modal-footer';
      if (typeof opts.footer === 'string') foot.innerHTML = opts.footer;
      else if (opts.footer.nodeType) foot.appendChild(opts.footer);
      box.appendChild(foot);
    }
    overlay.appendChild(box);
    rootEl.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('show'); });

    function close() {
      overlay.classList.remove('show');
      setTimeout(function () { overlay.remove(); }, 200);
      if (opts.onClose) opts.onClose();
    }
    return { el: box, overlay: overlay, close: close };
  }

  /* Confirmación simple (¿Está seguro?). Devuelve Promise<boolean>. */
  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var done = false;
      var m = modal({
        title: opts.title || 'Confirmación',
        body: '<p>' + esc(opts.message || '¿Está seguro?').replace(/\n/g, '<br>') + '</p>',
        size: 'sm',
        footer: '' +
          '<button type="button" class="btn" data-act="no">Cancelar</button>' +
          '<button type="button" class="btn btn-danger" data-act="yes">' + esc(opts.confirmText || 'Sí, continuar') + '</button>',
        onClose: function () { if (!done) resolve(false); }
      });
      m.el.querySelector('[data-act="no"]').addEventListener('click', function () { done = true; m.close(); resolve(false); });
      m.el.querySelector('[data-act="yes"]').addEventListener('click', function () { done = true; m.close(); resolve(true); });
    });
  }

  /* Confirmación con escritura de una palabra ("borrar" / "borrar todo").
     Devuelve Promise<boolean>. */
  function confirmTypeDialog(opts) {
    return new Promise(function (resolve) {
      var done = false;
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'input';
      input.placeholder = opts.placeholder || 'Escriba "' + opts.word + '" para confirmar';
      var body = document.createElement('div');
      body.innerHTML = '<p>' + esc(opts.message || '') + '</p>';
      body.appendChild(input);

      var okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'btn ' + (opts.danger !== false ? 'btn-danger' : 'btn-primary');
      okBtn.disabled = true;
      okBtn.textContent = opts.confirmText || 'Confirmar';
      okBtn.addEventListener('click', function () {
        done = true; m.close(); resolve(true);
      });

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.addEventListener('click', function () {
        done = true; m.close(); resolve(false);
      });

      var foot = document.createElement('div');
      foot.appendChild(cancelBtn);
      foot.appendChild(okBtn);

      var m = modal({
        title: opts.title || 'Confirmación requerida',
        body: body,
        size: 'sm',
        footer: foot,
        onClose: function () { if (!done) resolve(false); }
      });
      input.addEventListener('input', function () {
        okBtn.disabled = (input.value.trim() !== opts.word);
      });
      setTimeout(function () { input.focus(); }, 50);
    });
  }

  /* ---------- Imágenes ---------- */
  /* Lee un archivo de imagen y devuelve un dataURL redimensionado (máx. maxSize px) */
  function readImageResized(file, maxSize) {
    maxSize = maxSize || 800;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('El archivo debe ser una imagen.'));
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('La imagen no es válida.')); };
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, maxSize / Math.max(w, h));
          var nw = Math.max(1, Math.round(w * scale));
          var nh = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement('canvas');
          canvas.width = nw; canvas.height = nh;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff'; /* JPEG no tiene transparencia: fondo blanco en vez de negro */
          ctx.fillRect(0, 0, nw, nh);
          ctx.drawImage(img, 0, 0, nw, nh);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Descargas ---------- */
  function downloadFile(name, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (e) { reject(e); }
      ta.remove();
    });
  }

  /* ---------- Utilidades ---------- */
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function avatarHtml(dog, size) {
    size = size || 40;
    var style = 'width:' + size + 'px;height:' + size + 'px;';
    if (dog && dog.foto) {
      return '<span class="avatar" style="' + style + '"><img src="' + esc(dog.foto) + '" alt="' + esc(dog.nombre) + '"></span>';
    }
    return '<span class="avatar avatar-ph" style="' + style + '">' + icon('dog') + '</span>';
  }

  var ESTADOS = {
    'pendiente': 'Pendiente',
    'confirmado': 'Confirmado',
    'en_curso': 'En curso',
    'finalizado': 'Finalizado',
    'cancelado': 'Cancelado'
  };
  var TIPOS = { 'hospedaje': 'Hospedaje', 'paseo': 'Paseo' };

  function estadoLabel(v) { return ESTADOS[v] || v || ''; }
  function tipoLabel(v) { return TIPOS[v] || v || ''; }

  root.UI = {
    icon: icon, esc: esc, toast: toast, modal: modal,
    confirmDialog: confirmDialog, confirmTypeDialog: confirmTypeDialog,
    readImageResized: readImageResized, downloadFile: downloadFile, copyText: copyText,
    el: el, avatarHtml: avatarHtml, ESTADOS: ESTADOS, TIPOS: TIPOS,
    estadoLabel: estadoLabel, tipoLabel: tipoLabel
  };
})(typeof window !== 'undefined' ? window : globalThis);
