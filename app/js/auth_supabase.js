/* Cuidador Canino - Auth Supabase + fallback Gate (offline-first) */
(function (root) {
  'use strict';
  var UI = root.UI, Crypto = root.Crypto, Supa = root.Supa;

  function secure() { return !!(root.crypto && root.crypto.subtle); }

  var SS_PW='cc_master_pw_sess';

  async function syncCryptoState(pw){
    try{
      var c=Supa.getClient(); if(!c) return;
      var user=(await c.auth.getUser()).data?.user; if(!user) return;
      var sel=await c.from('user_config').select('crypto_state').eq('user_id', user.id).maybeSingle();
      var remote=sel.data?.crypto_state;
      var local=null; try{ local=JSON.parse(localStorage.getItem('cuidador_canino_crypto_v1')||'null'); }catch(e){}
      if(!remote && local){
        await c.from('user_config').upsert({user_id: user.id, crypto_state: local}, {onConflict:'user_id'});
      } else if(remote && local && remote.salt!==local.salt){
        // conflicto: usa remoto (es el que cifró los datos en la nube)
        // re-escribe local con remoto y reintenta unlock con pw
        Crypto.setState(remote);
        await Crypto.unlock(pw);
      } else if(remote && !local){
        Crypto.setState(remote);
        await Crypto.unlock(pw);
      }
    }catch(e){ console.warn('[Auth] syncCryptoState',e); }
  }
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
    function showErr(m) { errEl.textContent = m; errEl.hidden = false; errEl.style.color = ''; }
    function checkRules(pw) { return pw.length >= 8 && /[A-ZÁÉÍÓÚÜÑ]/.test(pw) && /\d/.test(pw); }

    // Registro de cuentas nuevas desactivado en Supabase: no se muestra formulario
    // de alta, se informa al usuario en español en lugar del error genérico inglés.
    container.querySelector('#suToggle').addEventListener('click', function (e) {
      e.preventDefault();
      if (isLogin) {
        errEl.textContent = 'El registro de cuentas nuevas está desactivado. Si necesitas acceso, pídelo al administrador. Si ya tienes cuenta, inicia sesión con tu email.';
        errEl.hidden = false; errEl.style.color = '#1d4ed8';
      } else {
        renderSupaGate(container, 'login');
      }
    });
    container.querySelector('#suOffline').addEventListener('click', function (e) {
      e.preventDefault();
      container.remove();
      root.Gate.boot().then(function () { if (root.Sync) root.Sync.startAutoSync(); });
    });
    container.querySelector('#suForgot').addEventListener('click', function (e) {
      e.preventDefault();
      var email = container.querySelector('#suEmail').value.trim();
      if (!email) { showErr('Escribe tu email para recuperar la contraseña.'); return; }
      Supa.getClient().auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(function (r) {
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
        try{ sessionStorage.setItem(SS_PW, pw); }catch(e){}
        await syncCryptoState(pw);
        if (Crypto.configured()) {
          var ok = await Crypto.unlock(pw);
          if (!ok) {
            // La contraseña de la nube no abre los datos de este dispositivo.
            // NUNCA re-cifrar a ciegas: se pide la antigua y se migra de forma
            // segura (changeMasterPassword verifica antes de tocar nada).
            var oldPw = (root.Gate && root.Gate.askPassword)
              ? await root.Gate.askPassword('La contraseña de la nube no coincide con la que cifraba los datos de este dispositivo. Introduce la contraseña ANTIGUA para migrar tus datos sin perderlos. Si no la recuerdas, cancela y haz antes una copia de seguridad.')
              : null;
            if (oldPw === null || oldPw === '') throw new Error('Migración de cifrado cancelada. Tus datos locales siguen intactos.');
            if (!root.Store || !root.Store.changeMasterPassword) throw new Error('No se puede migrar el cifrado en este dispositivo.');
            btn.textContent = 'Migrando cifrado…';
            await root.Store.changeMasterPassword(oldPw, pw);
            try { sessionStorage.setItem(SS_PW, pw); } catch (e2) {}
            // publica el nuevo estado (salt) en la nube para los otros dispositivos
            try {
              var cUp = Supa.getClient();
              var gUp = await cUp.auth.getUser();
              var uUp = gUp && gUp.data && gUp.data.user;
              var stNew = Crypto.readState ? Crypto.readState() : null;
              if (uUp && stNew) await cUp.from('user_config').upsert({ user_id: uUp.id, crypto_state: stNew }, { onConflict: 'user_id' });
            } catch (eUp) { console.warn('[Auth] no se pudo publicar crypto_state', eUp); }
          }
        } else {
          await Crypto.setup(pw); try{ sessionStorage.setItem(SS_PW, pw); }catch(e){}
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
        var msg = e && e.message ? e.message : 'No se pudo autenticar.';
        if (/signups? not allowed|signup.*disabled|registration.*disabled/i.test(msg)) {
          msg = 'El registro de cuentas nuevas está desactivado. Pide tu cuenta al administrador.';
        }
        showErr(msg);
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
      // Suave: si hay sesión Supabase y pw en sessionStorage, auto-desbloquea sin pedir
      try{
        var sessPw=null; try{ sessPw=sessionStorage.getItem(SS_PW); }catch(e){}
        // intenta traer salt remoto antes de auto-unlock
        try{ var c2=Supa.getClient(); var u2=(await c2.auth.getUser()).data?.user; if(u2){ var r2=await c2.from('user_config').select('crypto_state').eq('user_id', u2.id).maybeSingle(); if(r2.data?.crypto_state) Crypto.setState(r2.data.crypto_state); } }catch(e){}
        if(sessPw && Crypto.configured() && !Crypto.isUnlocked()){
          var ok=await Crypto.unlock(sessPw);
          if(ok){ if(root.Sync){ root.Sync.hookStore(); root.Sync.startAutoSync(); } resolve(); return; }
        }
      }catch(e){}
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
