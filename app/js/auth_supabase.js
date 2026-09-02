/* Cuidador Canino - Auth Supabase + fallback Gate (offline-first) */
(function (root) {
  'use strict';
  var UI = root.UI, Crypto = root.Crypto, Supa = root.Supa;

  function secure() { return !!(root.crypto && root.crypto.subtle); }

  function hasSupaSession() {
    if (!Supa || !Supa.isConfigured() || !Supa.getClient()) return Promise.resolve(false);
    return Supa.getSession().then(function (s) { return !!s; }).catch(function () { return false; });
  }

  function renderSupaGate(container, mode) {
    // mode: 'login' | 'signup'
    var isLogin = mode !== 'signup';
    container.innerHTML = '<div class="auth-card"><h2>' + UI.icon('lock') + ' ' + UI.esc(isLogin ? 'Iniciar sesión (nube)' : 'Crear cuenta (nube)') + '</h2>' +
      '<p class="hint">Tus datos se sincronizan entre móvil y PC. El cifrado sigue siendo local (misma contraseña).</p>' +
      '<div class="form-field"><label>Email</label><input type="email" class="input" id="suEmail" autocomplete="email" placeholder="tu@email.com"></div>' +
      '<div class="form-field"><label>Contraseña</label><input type="password" class="input" id="suPw" autocomplete="current-password" placeholder="Mín 8, 1 mayúscula y 1 número"></div>' +
      '<div class="auth-err" id="suErr" hidden></div>' +
      '<div class="form-actions">' +
      '<button class="btn btn-primary" id="suOk">' + UI.icon('check') + ' ' + UI.esc(isLogin ? 'Entrar' : 'Crear cuenta') + '</button> ' +
      '<button class="btn" id="suToggle">' + UI.esc(isLogin ? 'Crear cuenta' : 'Ya tengo cuenta') + '</button>' +
      '</div>' +
      '<p class="hint"><a href="#" id="suOffline">Usar sin nube (solo este dispositivo)</a> · <a href="#" id="suForgot">¿Olvidaste la contraseña?</a></p>' +
      '</div>';

    var errEl = container.querySelector('#suErr');
    function showErr(m) { errEl.textContent = m; errEl.hidden = false; }
    function checkRules(pw) { return pw.length >= 8 && /[A-ZÁÉÍÓÚÑ]/.test(pw) && /\d/.test(pw); }

    container.querySelector('#suToggle').addEventListener('click', function (e) { e.preventDefault(); renderSupaGate(container, isLogin ? 'signup' : 'login'); });
    container.querySelector('#suOffline').addEventListener('click', function (e) {
      e.preventDefault();
      container.remove();
      root.Gate.boot().then(function () { if (root.Sync) root.Sync.startAutoSync(); });
    });
    container.querySelector('#suForgot').addEventListener('click', function (e) {
      e.preventDefault();
      var email = container.querySelector('#suEmail').value.trim();
      if (!email) { showErr('Escribe tu email para recuperar la contraseña.'); return; }
      Supa.getClient().auth.resetPasswordForEmail(email).then(function (r) {
        if (r.error) showErr(r.error.message);
        else { errEl.textContent = 'Si el email existe, recibirás un enlace para restablecer la contraseña.'; errEl.hidden = false; errEl.style.color = '#16a34a'; }
      });
    });

    container.querySelector('#suOk').addEventListener('click', async function () {
      var email = container.querySelector('#suEmail').value.trim();
      var pw = container.querySelector('#suPw').value;
      if (!email || !pw) { showErr('Email y contraseña obligatorios.'); return; }
      if (!checkRules(pw)) { showErr('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.'); return; }
      var btn = container.querySelector('#suOk');
      btn.disabled = true; btn.textContent = 'Conectando…';
      try {
        var c = Supa.getClient();
        var res;
        if (isLogin) res = await c.auth.signInWithPassword({ email: email, password: pw });
        else res = await c.auth.signUp({ email: email, password: pw });
        if (res.error) throw new Error(res.error.message);
        // Deriva clave Crypto con la misma contraseña -> mantiene cifrado enc: compatible con local
        var st = null;
        try { st = JSON.parse(localStorage.getItem('cuidador_canino_crypto_v1') || 'null'); } catch (e) {}
        if (Crypto.configured()) {
          var ok = await Crypto.unlock(pw);
          if (!ok) { // contraseña supabase distinta de la maestra previa -> re-setup
            await Crypto.setup(pw);
            if (root.Store) await root.Store.encryptAll();
          }
        } else {
          await Crypto.setup(pw);
          if (root.Store) await root.Store.encryptAll();
        }
        // Sincronización inicial
        if (root.Sync) {
          root.Sync.hookStore();
          try { await root.Sync.pullAll(); } catch (e) {}
          // Si local tiene datos y remoto vacío, subir
          try { await root.Sync.pushAllLocal(); } catch (e) {}
          root.Sync.startAutoSync();
        }
        container.remove();
        // resuelve boot
        if (root.AuthSupa._resolve) { var r = root.AuthSupa._resolve; root.AuthSupa._resolve = null; r(); }
      } catch (e) {
        showErr(e && e.message ? e.message : 'No se pudo autenticar.');
        btn.disabled = false; btn.innerHTML = UI.icon('check') + ' ' + UI.esc(isLogin ? 'Entrar' : 'Crear cuenta');
      }
    });
  }

  function boot() {
    return new Promise(async function (resolve) {
      if (!secure()) {
        var el0 = document.createElement('div'); el0.id = 'authGate'; el0.className = 'auth-gate';
        el0.innerHTML = '<div class="auth-card"><h2>' + UI.icon('alert') + ' Cifrado no disponible</h2><p class="auth-warn">Sirve por http://localhost o https, no file://</p></div>';
        document.body.appendChild(el0);
        return;
      }
      // Si no hay Supabase configurado -> Gate clásico
      if (!Supa || !Supa.isConfigured()) {
        return root.Gate.boot().then(function () { if (root.Sync) root.Sync.startAutoSync(); resolve(); });
      }
      // Si ya hay sesión Supabase y Crypto desbloqueado -> directo
      if (Crypto.isUnlocked()) {
        var sess = await Supa.getSession();
        if (sess) { if (root.Sync) { root.Sync.hookStore(); root.Sync.startAutoSync(); } resolve(); return; }
      }
      // Si hay sesión Supabase pero Crypto bloqueado -> pedir contraseña para desbloquear (misma que supabase)
      var hasSess = await hasSupaSession();
      if (hasSess && Crypto.configured() && !Crypto.isUnlocked()) {
        // Reusa Gate login (pide contraseña maestra = supabase pass)
        return root.Gate.boot().then(function () { if (root.Sync) root.Sync.startAutoSync(); resolve(); });
      }
      // Si no hay sesión -> mostrar gate Supabase
      root.AuthSupa._resolve = resolve;
      var gate = document.createElement('div');
      gate.id = 'authGate';
      gate.className = 'auth-gate';
      gate.setAttribute('role', 'dialog');
      gate.setAttribute('aria-modal', 'true');
      document.body.appendChild(gate);
      renderSupaGate(gate, 'login');
      // También intenta sesión existente silenciosa
      Supa.getSession().then(function (s) {
        if (s && Crypto.isUnlocked()) {
          gate.remove();
          if (root.AuthSupa._resolve) { var r = root.AuthSupa._resolve; root.AuthSupa._resolve = null; r(); }
        }
      });
    });
  }

  root.AuthSupa = { boot: boot, _resolve: null };
})(typeof window !== 'undefined' ? window : globalThis);
