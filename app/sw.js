/* Service Worker — Cuidador Canino (PWA)
   Al publicar cambios en js/css, sube VERSION para forzar la actualización del caché. */
'use strict';

var VERSION = 'cuidador-canino-v14';
var SHELL_CACHE = VERSION;

var PRECACHE = [
  './',
  'index.html',
  'css/style.css',
  'js/calc.js',
  'js/db.js',
  'js/templates.js',
  'js/crypto.js',
  'js/store.js',
  'js/ui.js',
  'js/gate.js',
  'js/supabaseClient.js',
  'js/sync.js',
  'js/auth_supabase.js',
  'js/extraGate.js',
  'js/dogForm.js',
  'js/views/dashboard.js',
  'js/views/calendar.js',
  'js/views/dogs.js',
  'js/views/services.js',
  'js/views/settings.js',
  'js/views/reports.js',
  'js/views/plantillas.js',
  'js/app.js',
  'manifest.webmanifest',
  'image/app-icon-192.png',
  'image/app-icon-512.png',
  'image/app-icon-180.png',
  'image/app-icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE).catch(function (err) {
        // tolerante: si un recurso falla (p.ej. icono), cachea lo que sí existe
        return Promise.all(PRECACHE.map(function (url) {
          return cache.add(url).catch(function () {});
        }));
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL_CACHE) return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return caches.match('index.html').then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.ok) {
          var clone = res.clone();
          caches.open(SHELL_CACHE).then(function (cache) {
            cache.put(req, clone);
          });
        }
        return res;
      }).catch(function () {
        return cached;
      });
      return cached || network;
    })
  );
});