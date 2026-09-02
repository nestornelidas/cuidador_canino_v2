/* Cuidador Canino - Puerta de autenticación (contraseña maestra).
   - Primer uso: modal de configuración de contraseña (+ migración de contactos existentes).
   - Usos posteriores: modal de acceso. La app queda bloqueada hasta autenticarse.
   - La clave derivada vive solo en memoria (Crypto); aquí solo hay UI. */
(function (root) {
  'use strict';
  var UI = root.UI, Crypto = root.Crypto;

  var OVERLAY_ID = 'authGate';
  var bootResolve = null;

  function overlayEl() {
    var el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.className = 'auth-gate';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    return el;
  }

  function hide() {
    var el = document.getElementById(OVERLAY_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function done() {
    hide();
    if (bootResolve) { var r = bootResolve; bootResolve = null; r(); }
  }

  function secure() { return !!(root.crypto && root.crypto.subtle); }

  function checkRules(pw) {
    return pw.length >= 8 && /[A-ZÀ-ÜÑ]/.test(pw) && /\d/.test(pw);
  }

  function card(title, body) {
    return '<div class="auth-card"><h2>' + UI.icon('lock') + ' ' + UI.esc(title) + '</h2>' + body + '</div>';
  }

  function renderSetup(el) {
    el.innerHTML = card('Configurar contraseña maestra',
      '<p class="auth-warn">' + UI.icon('alert') + ' <strong>Si olvidas esta contraseña, los datos de tus clientes serán irrecuperables.</strong> No hay método de recuperación. Guarda la contraseña en un lugar seguro.</p>' +
      '<div class="form-field"><label>Nueva contraseña</label><input type="password" class="input" id="authPw1" autocomplete="new-password" placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"></div>' +
      '<div class="form-field"><label>Confirmar contraseña</label><input type="password" class="input" id="authPw2" autocomplete="new-password"></div>' +
      '<div class="auth-err" id="authErr" hidden></div>' +
      '<div class="form-actions"><button class="btn btn-primary" id="authOk">' + UI.icon('check') + ' Establecer contraseña</button></div>' +
      '<p class="hint">A partir de ahora los datos personales (nombre, teléfono, Telegram, WhatsApp, «recomendado por», observaciones y notas) se guardarán cifrados. La clave nunca se almacena en el dispositivo.</p>');

    var err = el.querySelector('#authErr');
    var ok = el.querySelector('#authOk');
    function submit() {
      var p1 = el.querySelector('#authPw1').value;
      var p2 = el.querySelector('#authPw2').value;
      if (!checkRules(p1)) {
        err.textContent = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.';
        err.hidden = false;
        return;
      }
      if (p1 !== p2) {
        err.textContent = 'Las contraseñas no coinciden.';
        err.hidden = false;
        return;
      }
      ok.disabled = true;
      ok.textContent = '';
      ok.innerHTML = UI.icon('refresh') + ' Cifrando datos…';
      Crypto.setup(p1).then(function () {
        return root.Store ? root.Store.encryptAll() : 0;
      }).then(done).catch(function (e) {
        err.textContent = e && e.message ? e.message : 'No se pudo establecer la contraseña.';
        err.hidden = false;
        ok.disabled = false;
        ok.innerHTML = UI.icon('check') + ' Establecer contraseña';
      });
    }
    el.querySelector('#authPw1').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    el.querySelector('#authPw2').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    el.querySelector('#authPw1').focus();
    ok.addEventListener('click', submit);
  }

  function renderLogin(el) {
    el.innerHTML = card('Acceder',
      '<p class="auth-warn">' + UI.icon('lock') + ' La base de datos está protegida con una contraseña maestra.</p>' +
      '<div class="form-field"><label>Contraseña maestra</label><input type="password" class="input" id="authPw" autocomplete="current-password"></div>' +
      '<div class="auth-err" id="authErr" hidden></div>' +
      '<div class="form-actions"><button class="btn btn-primary" id="authOk">' + UI.icon('check') + ' Acceder</button></div>');

    var err = el.querySelector('#authErr');
    var ok = el.querySelector('#authOk');
    function submit() {
      var pw = el.querySelector('#authPw').value;
      ok.disabled = true;
      Crypto.unlock(pw).then(function (res) {
        if (res) {
          done();
        } else {
          err.textContent = 'Contraseña incorrecta. Vuelve a intentarlo.';
          err.hidden = false;
          ok.disabled = false;
        }
      }).catch(function () {
        err.textContent = 'No se pudo verificar la contraseña.';
        err.hidden = false;
        ok.disabled = false;
      });
    }
    el.querySelector('#authPw').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    el.querySelector('#authPw').focus();
    ok.addEventListener('click', submit);
  }

  /* Bloquea el arranque de la app hasta que haya clave maestra en memoria. */
  function boot() {
    return new Promise(function (resolve) {
      if (!secure()) {
        var el = overlayEl();
        el.innerHTML = '<div class="auth-card"><h2>' + UI.icon('alert') + ' Cifrado no disponible</h2>' +
          '<p class="auth-warn">El navegador no expone la API Web Crypto. Sirve la aplicación por HTTPS o localhost (evita abrirla desde file://) y recarga la página.</p></div>';
        document.body.appendChild(el);
        return;
      }
      if (Crypto.isUnlocked()) { resolve(); return; }
      bootResolve = resolve;
      var gate = overlayEl();
      document.body.appendChild(gate);
      if (!Crypto.configured()) renderSetup(gate);
      else renderLogin(gate);
    });
  }

  /* Modal para pedir la contraseña maestra (p.ej. al importar un backup cifrado).
     Devuelve la contraseña (string) o null si se cancela. */
  function askPassword(message) {
    return new Promise(function (resolve) {
      var el = overlayEl();
      el.innerHTML = card('Contraseña maestra requerida',
        '<p class="auth-warn">' + UI.icon('info') + ' ' + UI.esc(message) + '</p>' +
        '<div class="form-field"><label>Contraseña</label><input type="password" class="input" id="askPw" autocomplete="current-password"></div>' +
        '<div class="auth-err" id="askErr" hidden></div>' +
        '<div class="form-actions"><button class="btn" id="askCancel">Cancelar</button>' +
        '<button class="btn btn-primary" id="askOk">' + UI.icon('check') + ' Continuar</button></div>');
      document.body.appendChild(el);
      function close(v) { hide(); resolve(v); }
      el.querySelector('#askCancel').addEventListener('click', function () { close(null); });
      el.querySelector('#askOk').addEventListener('click', function () { close(el.querySelector('#askPw').value || null); });
      el.querySelector('#askPw').addEventListener('keydown', function (e) { if (e.key === 'Enter') close(el.querySelector('#askPw').value || null); });
      el.querySelector('#askPw').focus();
    });
  }

  root.Gate = { boot: boot, askPassword: askPassword };
})(typeof window !== 'undefined' ? window : globalThis);