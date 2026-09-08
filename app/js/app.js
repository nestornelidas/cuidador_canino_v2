/* Cuidador Canino - Aplicación (router SPA + arranque) */
(function (root) {
  'use strict';
  var C = root.Calc, UI = root.UI, Store = root.Store;

  var ROUTES = {
    dashboard: { view: root.Views.dashboard, title: 'Inicio' },
    calendario: { view: root.Views.calendario, title: 'Calendario' },
    perros: { view: root.Views.perros, title: 'Perros' },
    servicios: { view: root.Views.servicios, title: 'Servicios' },
    configuracion: { view: root.Views.configuracion, title: 'Configuración' },
    informes: { view: root.Views.informes, title: 'Informes' },
    plantillas: { view: root.Views.plantillas, title: 'Plantillas' }
  };

  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/').filter(function (p) { return p !== ''; });
    return { name: parts[0] || 'dashboard', params: parts.slice(1) };
  }

  function ctxOf(go) {
    return { go: go, refresh: App.refresh };
  }

  var rendering = false;
  var pendingRender = false;
  async function render() {
    if (rendering) { pendingRender = true; return; }
    rendering = true;
    do {
      pendingRender = false;
      var container = document.getElementById('view');
      var { name, params } = parseHash();
      var route = ROUTES[name];
      if (!route) { route = ROUTES.dashboard; name = 'dashboard'; }

      document.querySelectorAll('#mainnav .nav-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.view === name);
      });
      document.getElementById('navToggle').classList.remove('open');
      document.getElementById('mainnav').classList.remove('open');

      document.title = (name === 'dashboard' ? '' : route.title + ' · ') + 'Cuidador Canino';

      try {
        container.innerHTML = '<div class="view-loading">' + UI.icon('paw') + ' Cargando…</div>';
        await route.view.render(container, params, ctxOf(function (path) { App.go(path); }));
      } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="view-error"><h1>' + UI.icon('alert') + ' Se ha producido un error</h1>' +
          '<p>' + UI.esc(String(err && err.message ? err.message : err)) + '</p>' +
          '<button class="btn" onclick="location.hash=\'#/dashboard\'">Volver al inicio</button></div>';
      }
      container.scrollTop = 0;
    } while (pendingRender);
    rendering = false;
  }

  var App = {
    go: function (path) {
      var target = '#/' + String(path).replace(/^\/+/, '');
      if (location.hash === target) { render(); }
      else location.hash = target;
    },
    refresh: function () { render(); },
    lock: function () {
      try { if (root.Supa && root.Supa.getClient) { var c=root.Supa.getClient(); if(c) c.auth.signOut(); } } catch(e){}
      try{ sessionStorage.removeItem('cc_extra_pin_ok_session'); sessionStorage.removeItem('cc_master_pw_sess'); localStorage.removeItem('cc_extra_pin_ts'); }catch(e){}
      root.Crypto.lock();
      location.reload();
    },
    updateBrand: function () {
      var cfg = Store.getConfig();
      var img = document.getElementById('logoImg');
      if (cfg.logo) {
        img.src = cfg.logo;
        img.hidden = false;
      } else {
        img.hidden = true;
        img.removeAttribute('src');
      }
      var nameEl = document.getElementById('brandName');
      if (nameEl) nameEl.textContent = cfg.nombreEmpresa || 'Cuidador Canino';
    }
  };

  function isEditingForm() {
    var p = parseHash();
    if ((p.name === 'perros' || p.name === 'servicios') && p.params.length > 0 && p.params[0] !== 'list') return true;
    if (document.querySelector('.modal-wrap') || document.querySelector('.auth-gate')) return true;
    return false;
  }

  function initDataChangeListener() {
    window.addEventListener('cc:data-changed', function (e) {
      if (isEditingForm()) {
        UI.toast('Se han recibido novedades desde otro dispositivo', 'info');
      } else {
        App.refresh();
      }
    });
  }

  function initSyncIndicator() {
    var dot = document.getElementById('syncDot');
    var label = document.getElementById('syncLabel');
    var btn = document.getElementById('btnSyncStatus');
    if (!dot || !label || !btn) return;

    function applyStatus(st, detail) {
      dot.className = 'sync-dot';
      if (st === 'synced') {
        dot.classList.add('sync-synced');
        label.textContent = 'En línea';
        btn.title = 'Sincronizado en tiempo real con la nube';
      } else if (st === 'syncing') {
        dot.classList.add('sync-syncing');
        label.textContent = 'Sincronizando…';
        btn.title = 'Sincronizando cambios con la nube…';
      } else if (st === 'offline') {
        dot.classList.add('sync-offline');
        label.textContent = 'Offline';
        btn.title = 'Modo sin conexión a internet (los cambios se guardan localmente)';
      } else if (st === 'error') {
        dot.classList.add('sync-error');
        label.textContent = 'Aviso';
        btn.title = 'Aviso de sincronización: ' + ((detail && detail.message) || 'pulsa para ver detalles');
      } else {
        dot.classList.add('sync-unconfigured');
        label.textContent = 'Local';
        btn.title = 'Modo local (Supabase no configurado)';
      }
    }

    if (root.Sync && root.Sync.getStatus) applyStatus(root.Sync.getStatus());
    if (root.Sync && root.Sync.onStatusChange) {
      root.Sync.onStatusChange(function (st, detail) { applyStatus(st, detail); });
    }
    window.addEventListener('cc:sync-status', function (e) {
      if (e.detail) applyStatus(e.detail.status, e.detail.detail);
    });

    btn.addEventListener('click', async function () {
      if (!root.Supa || !root.Supa.isConfigured()) {
        App.go('configuracion');
        UI.toast('Configura Supabase en la sección Nube para activar sincronización multidispositivo', 'info');
        return;
      }
      var diag = root.Sync && root.Sync.diag ? await root.Sync.diag() : {};
      var modal = UI.modal({
        title: 'Estado de la Nube',
        body: '<div class="sync-modal-body">' +
          '<p><strong>Estado:</strong> ' + UI.esc(dot.className.replace('sync-dot sync-', '')) + ' (' + (diag.online ? 'Con conexión' : 'Sin conexión') + ')</p>' +
          '<p><strong>Usuario:</strong> ' + UI.esc(diag.session || 'Sin sesión') + '</p>' +
          '<p><strong>Cambios pendientes:</strong> ' + (diag.queue ? diag.queue.length : 0) + '</p>' +
          '<p class="hint">Último pull: ' + UI.esc(diag.lastPull || 'Nunca') + '<br>Último push: ' + UI.esc(diag.lastPushOk || 'Nunca') + '</p>' +
          '</div>',
        footer: '<button class="btn" data-act="pull">' + UI.icon('download') + ' Sincronizar (Pull)</button> ' +
          '<button class="btn" data-act="push">' + UI.icon('upload') + ' Subir (Push)</button> ' +
          '<button class="btn btn-primary" data-act="close">Cerrar</button>'
      });
      modal.el.querySelector('[data-act="close"]').addEventListener('click', function () { modal.close(); });
      modal.el.querySelector('[data-act="pull"]').addEventListener('click', async function () {
        UI.toast('Sincronizando...', 'info');
        var res = await root.Sync.pullAll({ full: true });
        UI.toast('Pull completado: ' + res.pulled + ' actualizados', 'success');
        modal.close();
        App.refresh();
      });
      modal.el.querySelector('[data-act="push"]').addEventListener('click', async function () {
        UI.toast('Subiendo pendientes...', 'info');
        var res = await root.Sync.pushQueue();
        UI.toast('Push completado: ' + res + ' registros subidos', 'success');
        modal.close();
      });
    });
  }

  function initNav() {
    document.querySelectorAll('#mainnav .nav-btn').forEach(function (b) {
      b.addEventListener('click', function () { App.go(b.dataset.view); });
    });
    var toggle = document.getElementById('navToggle');
    toggle.addEventListener('click', function () {
      document.getElementById('mainnav').classList.toggle('open');
      toggle.classList.toggle('open');
    });
    var lockBtn = document.getElementById('btnLock');
    if (lockBtn) lockBtn.addEventListener('click', function () { App.lock(); });
    initSyncIndicator();
    initDataChangeListener();
  }


  // Swipe móvil: deslizar en #view cambia de pestaña (respeta tablas con scroll horizontal)
  (function(){
    var ORDER=['dashboard','calendario','perros','servicios','informes','plantillas','configuracion'];
    var startX=0, startY=0, startEl=null, ignore=false;
    function isMobile(){ return window.matchMedia && window.matchMedia('(max-width: 900px)').matches; }
    function isScrollableH(el){
      if(!el) return false;
      var cur=el;
      for(var i=0;i<6 && cur; i++){
        if(cur.scrollWidth > cur.clientWidth + 5) return true;
        if(cur.classList && cur.classList.contains('table-wrap') && cur.scrollWidth > cur.clientWidth) return true;
        cur=cur.parentElement;
      }
      return false;
    }
    var view=document.getElementById('view');
    if(!view) return;
    view.addEventListener('touchstart', function(e){
      if(!isMobile()) return;
      if(e.touches.length!==1) return;
      var t=e.touches[0];
      startX=t.clientX; startY=t.clientY; startEl=e.target;
      // si empieza en input/textarea/select no swipe
      if(startEl.closest('input, textarea, select, button, a')) { ignore=true; return; }
      if(isScrollableH(startEl)) { ignore=true; return; }
      ignore=false;
    }, {passive:true});
    view.addEventListener('touchend', function(e){
      if(!isMobile() || ignore) return;
      if(e.changedTouches.length!==1) return;
      var t=e.changedTouches[0];
      var dx=t.clientX - startX, dy=t.clientY - startY;
      if(Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)*1.2) return;
      // si el gesto fue sobre tabla que puede hacer scroll horizontal, ignorar (ya se dejó desplazar tabla)
      if(isScrollableH(startEl)) return;
      var cur=parseHash().name;
      var idx=ORDER.indexOf(cur);
      if(idx===-1) idx=0;
      if(dx < 0){ // swipe izq -> siguiente
        var nxt=ORDER[(idx+1)%ORDER.length];
        App.go(nxt);
      } else { // swipe der -> anterior
        var prev=ORDER[(idx-1+ORDER.length)%ORDER.length];
        App.go(prev);
      }
    }, {passive:true});
  })();

  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', async function () {
    initNav();
    try {
      await DB.open();
      if (root.Supa && root.Supa.loadEnv) { try{ await root.Supa.loadEnv(); }catch(e){} }
      if (root.ExtraGate) await root.ExtraGate.boot();
      await (root.AuthSupa && root.Supa && root.Supa.isConfigured && root.Supa.isConfigured() ? root.AuthSupa.boot : root.Gate.boot)(); /* bloquea el arranque hasta que haya contraseña maestra en memoria */
      /* Migración única: si se amplió el catálogo de campos cifrados o quedaron registros
         previos sin cifrar (antiguo portal/clave sin cifrado), se re-cifran al desbloquear. */
      if (root.Crypto.marksMigration()) {
        await root.Store.encryptAll();
        root.Crypto.markFieldsCurrent();
      }
      await Store.ensureDefaultTemplates();
      /* La limpieza de huérfanos/duplicados ya corre en importAll y en cada
         guardado (saveContact fusiona al vuelo): no se repite en cada arranque
         para no descifrar toda la base 3 veces al abrir la app. */
      App.updateBrand();
      if (root.Sync) { try { root.Sync.startAutoSync(); } catch(e){} }
      /* Descarga novedades al abrir (no bloquea el pintado): sin esto, un
         dispositivo que sigue online jamás vería los cambios del otro.
         Si trae algo, repinta la vista. */
      if (root.Sync && root.Sync.pullAll) {
        try {
          var pp = root.Sync.pullAll();
          if (pp && pp.then) pp.then(function (r) { if (r && (r.pulled > 0 || r.repaired > 0)) render(); });
        } catch(e){}
      }
      render();
    } catch (err) {
      document.getElementById('view').innerHTML =
        '<div class="view-error"><h1>No se pudo iniciar la aplicación</h1><p>' + UI.esc(err.message) + '</p>' +
        '<p class="hint">Comprueba que el navegador permite almacenamiento local (IndexedDB).</p></div>';
    }
  });

  root.App = App;
})(typeof window !== 'undefined' ? window : globalThis);
