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

  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', async function () {
    initNav();
    try {
      await DB.open();
      await Gate.boot(); /* bloquea el arranque hasta que haya contraseña maestra en memoria */
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
      render();
    } catch (err) {
      document.getElementById('view').innerHTML =
        '<div class="view-error"><h1>No se pudo iniciar la aplicación</h1><p>' + UI.esc(err.message) + '</p>' +
        '<p class="hint">Comprueba que el navegador permite almacenamiento local (IndexedDB).</p></div>';
    }
  });

  root.App = App;
})(typeof window !== 'undefined' ? window : globalThis);
