/* Cuidador Canino - Aplicación (router SPA + arranque) */
(function (root) {
  'use strict';
  var C = root.Calc, UI = root.UI, Store = root.Store;

  var ROUTES = {
    dashboard: { view: root.Views.dashboard, title: 'Dashboard' },
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
  async function render() {
    if (rendering) return;
    rendering = true;
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
  }


  // Swipe móvil: deslizar en #view cambia de pestaña (respeta tablas con scroll horizontal)
  (function(){
    var ORDER=['dashboard','calendario','perros','servicios','informes','plantillas','configuracion'];
    var startX=0, startY=0, startEl=null, ignore=false;
    function isMobile(){ return window.matchMedia && window.matchMedia('(max-width: 900px)').matches; }
    function isScrollableH(el){
      if(!el) return false;
      var cur=el;
      for(var i=0;i<4 && cur; i++){
        if(cur.scrollWidth > cur.clientWidth + 5 && cur.scrollWidth > 0) return true;
        // también tablas dentro de card
        if(cur.classList && (cur.classList.contains('table') || cur.classList.contains('card') || cur.classList.contains('table-responsive')) && cur.scrollWidth > cur.clientWidth) return true;
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
      if (root.ExtraGate) await root.ExtraGate.boot();
      await (root.AuthSupa && root.Supa && root.Supa.isConfigured && root.Supa.isConfigured() ? root.AuthSupa.boot : root.Gate.boot)(); /* bloquea el arranque hasta que haya contraseña maestra en memoria */
      /* Migración única: si se amplió el catálogo de campos cifrados o quedaron registros
         previos sin cifrar (antiguo portal/clave sin cifrado), se re-cifran al desbloquear. */
      if (root.Crypto.marksMigration()) {
        await root.Store.encryptAll();
        root.Crypto.markFieldsCurrent();
      }
      await Store.ensureDefaultTemplates();
      await Store.cleanOrphanContacts();
      await Store.dedupeContacts();
      App.updateBrand();
      if (root.Sync) { try { root.Sync.startAutoSync(); } catch(e){} }
      render();
    } catch (err) {
      document.getElementById('view').innerHTML =
        '<div class="view-error"><h1>No se pudo iniciar la aplicación</h1><p>' + UI.esc(err.message) + '</p>' +
        '<p class="hint">Comprueba que el navegador permite almacenamiento local (IndexedDB).</p></div>';
    }
  });

  root.App = App;
})(typeof window !== 'undefined' ? window : globalThis);
