/* Cuidador Canino - Sincronización offline-first con Supabase (Realtime + Pull/Push) */
(function (root) {
  'use strict';
  var TABLES = ['contacts', 'dogs', 'services', 'events', 'templates', 'app_config'];
  var DATA_TABLES = ['contacts', 'dogs', 'services', 'events', 'templates'];
  var T_TOMB = 'sync_tombstones';
  var LS_QUEUE = 'cc_sync_queue_v1';
  var LS_LAST_PULL = 'cc_sync_last_pull_v1';
  /* Margen anti-desfase de relojes: el pull incremental pide desde
     (last_pull - 2 min); el last-write-wins deduplica lo repetido. */
  var PULL_MARGIN_MS = 2 * 60 * 1000;
  var TOMB_PRUNE_MS = 30 * 24 * 3600 * 1000;

  function isOnline() { return typeof navigator === 'undefined' ? true : navigator.onLine; }

  /* Estado de sincronización para UI */
  var _syncStatus = 'unconfigured'; /* 'unconfigured' | 'offline' | 'syncing' | 'synced' | 'error' */
  var _statusListeners = [];
  function setSyncStatus(st, detail) {
    if (!root.Supa || !root.Supa.isConfigured()) st = 'unconfigured';
    else if (!isOnline()) st = 'offline';
    _syncStatus = st;
    _statusListeners.forEach(function (fn) {
      try { fn(_syncStatus, detail); } catch (e) {}
    });
    try {
      window.dispatchEvent(new CustomEvent('cc:sync-status', { detail: { status: _syncStatus, detail: detail } }));
    } catch (e) {}
  }
  function getSyncStatus() {
    if (!root.Supa || !root.Supa.isConfigured()) return 'unconfigured';
    if (!isOnline()) return 'offline';
    return _syncStatus;
  }
  function onStatusChange(fn) {
    if (typeof fn === 'function') _statusListeners.push(fn);
  }

  /* La tabla de lápidas es opcional (requiere sync_tombstones.sql o schema_unified.sql):
     si no existe, el subsistema se desactiva en silencio sin romper el sync. */
  function isMissingTable(e) {
    var m = String((e && e.message) || e || '');
    return /Could not find the table|42P01|does not exist/i.test(m);
  }

  /* Registra una lápida para que los otros dispositivos borren su copia. */
  async function noteTombstone(c, uid, table, id) {
    try {
      await c.from(T_TOMB).upsert({ id: table + ':' + id, user_id: uid, table_name: table, record_id: id, deleted_at: new Date().toISOString() }, { onConflict: 'id' });
    } catch (e) { /* noop: se reintentará con reconcile */ }
  }

  function loadQueue() {
    try { var q = JSON.parse(localStorage.getItem(LS_QUEUE) || '[]'); return Array.isArray(q) ? q : []; } catch (e) { return []; }
  }
  function saveQueue(q) { try { localStorage.setItem(LS_QUEUE, JSON.stringify(q)); } catch (e) {} }

  function enqueue(table, id, op) {
    var q = loadQueue();
    var found = -1;
    for (var i = 0; i < q.length; i++) if (q[i].table === table && q[i].id === id) found = i;
    var entry = { table: table, id: id, op: op || 'upsert', ts: Date.now() };
    if (found >= 0) q[found] = entry; else q.push(entry);
    saveQueue(q);
    setSyncStatus(isOnline() ? 'syncing' : 'offline', { queueLen: q.length });
  }

  async function pushOne(table, id) {
    var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
    if (!c) return false;
    var sess = await root.Supa.getSession();
    if (!sess || !sess.user) return false;
    var uid = sess.user.id;
    try {
      // 1) Configuración
      if (table === 'app_config') {
        var cfg = root.Store ? root.Store.getConfig() : null;
        if (!cfg) return true;
        var nowCfg = new Date().toISOString();
        var upCfg = await c.from(table).upsert({ id: 'config', user_id: uid, data: cfg, updated_at: nowCfg }, { onConflict: 'id' });
        if (upCfg.error) throw upCfg.error;
        return true;
      }

      // 2) Plantillas
      if (table === 'templates') {
        var rec = await root.DB.get(table, id);
        if (!rec) { // borrado
          var del = await c.from(table).delete().eq('id', id).eq('user_id', uid);
          if (del.error) throw del.error;
          await noteTombstone(c, uid, table, id);
          return true;
        }
        try {
          var ex = await c.from(table).select('updated_at').eq('id', id).eq('user_id', uid).maybeSingle();
          if (ex && ex.data && ex.data.updated_at && rec._updated_at && new Date(ex.data.updated_at).getTime() > new Date(rec._updated_at).getTime()) return true;
        } catch (e) {}
        var now = new Date().toISOString();
        rec._updated_at = now;
        try { await root.DB.put(table, rec); } catch (e) {}
        var up = await c.from(table).upsert({ id: rec.id, user_id: uid, data: rec, updated_at: now }, { onConflict: 'id' });
        if (up.error) throw up.error;
        return true;
      }

      // 3) Contactos, Perros, Servicios, Eventos: almacenados cifrados
      var stored = await root.DB.get(table, id);
      if (!stored) {
        var d2 = await c.from(table).delete().eq('id', id).eq('user_id', uid);
        if (d2.error) throw d2.error;
        await noteTombstone(c, uid, table, id);
        return true;
      }
      try {
        var ex2 = await c.from(table).select('updated_at').eq('id', id).eq('user_id', uid).maybeSingle();
        if (ex2 && ex2.data && ex2.data.updated_at && stored._updated_at && new Date(ex2.data.updated_at).getTime() > new Date(stored._updated_at).getTime()) return true;
      } catch (e) {}
      var now2 = new Date().toISOString();
      stored._updated_at = now2;
      try { await root.DB.put(table, stored); } catch (e) {}
      var payload = { id: stored.id, user_id: uid, data: stored, updated_at: now2 };
      var res = await c.from(table).upsert(payload, { onConflict: 'id' });
      if (res.error) throw res.error;
      return true;
    } catch (e) {
      console.warn('[Sync] push fallo', table, id, e && e.message ? e.message : e);
      return false;
    }
  }

  /* Sellos de observabilidad */
  var LS_LAST_PUSH_RUN = 'cc_sync_last_push_run_v1';
  var LS_LAST_PUSH_OK = 'cc_sync_last_push_ok_v1';
  var LS_LAST_ERR = 'cc_sync_last_err_v1';
  var LS_LAST_SAVE = 'cc_sync_last_save_v1';
  function stamp(key, val) { try { localStorage.setItem(key, val === undefined ? new Date().toISOString() : val); } catch (e) {} }
  function stampErr(m) { stamp(LS_LAST_ERR, new Date().toISOString() + ' ' + String(m || '').slice(0, 200)); }

  var _pushing = false;
  async function pushQueue() {
    if (_pushing) return 0;
    _pushing = true;
    var totalOk = 0;
    try {
      if (!isOnline()) { setSyncStatus('offline'); return 0; }
      var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
      if (!c || !root.Supa.isConfigured()) { setSyncStatus('unconfigured'); return 0; }
      var sess = await root.Supa.getSession();
      if (!sess) return 0;
      var startLen = loadQueue().length;
      if (startLen > 0) setSyncStatus('syncing', { queueLen: startLen });
      for (var pass = 0; pass < 5; pass++) {
        var q = loadQueue();
        if (!q.length) break;
        var remaining = [];
        for (var i = 0; i < q.length; i++) {
          var e = q[i];
          var done = await pushOne(e.table, e.id);
          if (done) totalOk++; else remaining.push(e);
        }
        saveQueue(remaining);
        if (!remaining.length) break;
        if (loadQueue().length <= remaining.length) break;
      }
      stamp(LS_LAST_PUSH_RUN);
      if (totalOk > 0) {
        stamp(LS_LAST_PUSH_OK);
        setSyncStatus('synced');
      } else if (startLen > 0) {
        stampErr('0 subidos con ' + startLen + ' en cola');
        setSyncStatus('error', { message: '0 subidos con ' + startLen + ' en cola' });
      } else {
        setSyncStatus('synced');
      }
      return totalOk;
    } catch (eTop) {
      stampErr(eTop && eTop.message ? eTop.message : eTop);
      setSyncStatus('error', { message: eTop && eTop.message ? eTop.message : String(eTop) });
      return totalOk;
    } finally {
      _pushing = false;
    }
  }

  /* Descarga novedades (incremental por defecto; full:true descarga todo y reconcilia) */
  async function pullAll(opts) {
    try {
      opts = opts || {};
      var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
      if (!c || !root.Supa.isConfigured()) return { pulled: 0, repaired: 0 };
      var sess = await root.Supa.getSession();
      if (!sess || !sess.user) return { pulled: 0, repaired: 0 };
      var uid = sess.user.id;
      var lastPull = null;
      try { lastPull = localStorage.getItem(LS_LAST_PULL) || null; } catch (e) {}
      var incremental = !opts.full && !!lastPull;
      var since = null;
      if (incremental) {
        try { since = new Date(new Date(lastPull).getTime() - PULL_MARGIN_MS).toISOString(); }
        catch (e) { incremental = false; }
      }
      var nowIso = new Date().toISOString();
      var total = 0, repaired = 0, errors = 0;
      var pendingSet = {};
      try {
        loadQueue().forEach(function (e) { if (e && e.table && e.id) pendingSet[e.table + ':' + e.id] = e.op || 'upsert'; });
      } catch (eQ) {}

      // 1) Lápidas: borrados hechos en otros dispositivos
      try {
        var tq = c.from(T_TOMB).select('table_name,record_id').eq('user_id', uid);
        if (incremental && since) tq = tq.gt('deleted_at', since);
        var tres = await tq;
        if (tres.error && !isMissingTable(tres.error)) throw tres.error;
        var qq = loadQueue();
        var tombs = (tres && tres.data) ? tres.data : [];
        for (var ti = 0; ti < tombs.length; ti++) {
          var tb = tombs[ti];
          if (DATA_TABLES.indexOf(tb.table_name) === -1 || !tb.record_id) continue;
          var pend = false;
          for (var qi = 0; qi < qq.length; qi++) {
            if (qq[qi].table === tb.table_name && qq[qi].id === tb.record_id && qq[qi].op !== 'delete') { pend = true; break; }
          }
          if (pend) continue;
          try { await root.DB.del(tb.table_name, tb.record_id); repaired++; } catch (eDel) {}
        }
        try { await c.from(T_TOMB).delete().eq('user_id', uid).lt('deleted_at', new Date(Date.now() - TOMB_PRUNE_MS).toISOString()); } catch (ePrune) {}
      } catch (eT) {
        if (!isMissingTable(eT)) { console.warn('[Sync] pull lápidas', eT && eT.message ? eT.message : eT); errors++; }
      }

      // 2) Configuración compartida
      try {
        var cfgSel = await c.from('app_config').select('id,data,updated_at').eq('user_id', uid).maybeSingle();
        if (cfgSel && cfgSel.data && cfgSel.data.data && root.Store && root.Store.applyRemoteConfig) {
          root.Store.applyRemoteConfig(cfgSel.data.data);
          total++;
        }
      } catch (eCfg) {
        if (!isMissingTable(eCfg)) console.warn('[Sync] pull app_config', eCfg);
      }

      // 3) Tablas de datos
      for (var t = 0; t < DATA_TABLES.length; t++) {
        var table = DATA_TABLES[t];
        try {
          var sel = c.from(table).select('id,data,updated_at').eq('user_id', uid);
          if (incremental && since) sel = sel.gt('updated_at', since);
          var res = await sel;
          if (res.error) throw res.error;
          var rows = res.data || [];
          for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            if (!r || !r.data) continue;
            if (pendingSet[table + ':' + r.id]) continue;
            try {
              var local = await root.DB.get(table, r.id);
              if (local && local._updated_at && r.updated_at && new Date(local._updated_at).getTime() > new Date(r.updated_at).getTime()) {
                continue;
              }
              r.data._updated_at = r.updated_at || new Date().toISOString();
              r.data.id = r.id; // asegura clave primaria
              await root.DB.put(table, r.data);
              total++;
            } catch (ePut) {
              console.warn('[Sync] put local error', table, r.id, ePut);
            }
          }
          // Reconciliación en pull completo
          if (!incremental) {
            var remoteIds = {};
            for (var ri = 0; ri < rows.length; ri++) remoteIds[rows[ri].id] = true;
            var locals = await root.DB.getAll(table);
            var pq = loadQueue();
            for (var li = 0; li < locals.length; li++) {
              var rec = locals[li];
              if (!rec || remoteIds[rec.id]) continue;
              if (!rec._updated_at && !opts.repair) continue;
              var hasPend = false;
              for (var pi = 0; pi < pq.length; pi++) {
                if (pq[pi].table === table && pq[pi].id === rec.id) { hasPend = true; break; }
              }
              if (hasPend) continue;
              try { await root.DB.del(table, rec.id); repaired++; } catch (eRd) {}
            }
          }
        } catch (e) {
          console.warn('[Sync] pull fallo', table, e && e.message ? e.message : e);
          errors++;
        }
      }

      if (!errors) {
        try { localStorage.setItem(LS_LAST_PULL, nowIso); } catch (e) {}
        setSyncStatus('synced');
      } else {
        setSyncStatus('error', { message: 'Errores durante pull' });
      }

      if (total > 0 || repaired > 0) {
        try {
          window.dispatchEvent(new CustomEvent('cc:data-changed', {
            detail: { source: 'pull', pulled: total, repaired: repaired }
          }));
        } catch (eEv) {}
      }

      return { pulled: total, repaired: repaired };
    } catch (eTop) {
      console.warn('[Sync] pullAll', eTop && eTop.message ? eTop.message : eTop);
      setSyncStatus('error', { message: eTop && eTop.message ? eTop.message : String(eTop) });
      return { pulled: 0, repaired: 0 };
    }
  }

  /* ==========================================================================
     SUPABASE REALTIME (WebSockets instantáneos multidispositivo)
     ========================================================================== */
  var _realtimeChannel = null;

  async function handleRealtimeEvent(payload) {
    try {
      if (!payload) return;
      var table = payload.table;
      var eventType = payload.eventType; // 'INSERT' | 'UPDATE' | 'DELETE'
      var newRec = payload.new;
      var oldRec = payload.old;

      // 1) Lápidas de borrado
      if (table === T_TOMB && newRec && newRec.table_name && newRec.record_id) {
        if (DATA_TABLES.indexOf(newRec.table_name) !== -1) {
          try { await root.DB.del(newRec.table_name, newRec.record_id); } catch (eDel) {}
          window.dispatchEvent(new CustomEvent('cc:data-changed', {
            detail: { source: 'realtime', table: newRec.table_name, op: 'DELETE', id: newRec.record_id }
          }));
        }
        return;
      }

      // 2) Borrado directo en tabla
      if (eventType === 'DELETE' && (oldRec || newRec)) {
        var delId = (oldRec && oldRec.id) || (newRec && newRec.id);
        if (delId && DATA_TABLES.indexOf(table) !== -1) {
          try { await root.DB.del(table, delId); } catch (eDel2) {}
          window.dispatchEvent(new CustomEvent('cc:data-changed', {
            detail: { source: 'realtime', table: table, op: 'DELETE', id: delId }
          }));
        }
        return;
      }

      // 3) Configuración compartida
      if (table === 'app_config' && newRec && newRec.data) {
        if (root.Store && root.Store.applyRemoteConfig) {
          root.Store.applyRemoteConfig(newRec.data);
          window.dispatchEvent(new CustomEvent('cc:data-changed', {
            detail: { source: 'realtime', table: 'app_config', op: eventType }
          }));
        }
        return;
      }

      // 4) Estado criptográfico
      if (table === 'user_config' && newRec && newRec.crypto_state) {
        if (root.Crypto && root.Crypto.setState) {
          root.Crypto.setState(newRec.crypto_state);
        }
        return;
      }

      // 5) Tablas de datos (contactos, perros, servicios, eventos, plantillas)
      if (DATA_TABLES.indexOf(table) !== -1 && newRec && newRec.data) {
        var data = newRec.data;
        data.id = newRec.id;
        data._updated_at = newRec.updated_at || new Date().toISOString();
        // Verificar si local tiene algo más nuevo pendiente
        var local = await root.DB.get(table, newRec.id);
        if (local && local._updated_at && newRec.updated_at && new Date(local._updated_at).getTime() > new Date(newRec.updated_at).getTime()) {
          return;
        }
        await root.DB.put(table, data);
        setSyncStatus('synced');
        window.dispatchEvent(new CustomEvent('cc:data-changed', {
          detail: { source: 'realtime', table: table, op: eventType, id: newRec.id }
        }));
      }
    } catch (eRt) {
      console.warn('[Sync] handleRealtimeEvent error', eRt);
    }
  }

  function initRealtime() {
    if (_realtimeChannel) return _realtimeChannel;
    var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
    if (!c || !root.Supa.isConfigured()) return null;

    try {
      _realtimeChannel = c.channel('cc-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, function (payload) {
          handleRealtimeEvent(payload);
        })
        .subscribe(function (status) {
          if (status === 'SUBSCRIBED') {
            setSyncStatus('synced');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setSyncStatus(isOnline() ? 'error' : 'offline', { realtimeStatus: status });
          }
        });
      return _realtimeChannel;
    } catch (e) {
      console.warn('[Sync] initRealtime fallo', e);
      return null;
    }
  }

  function stopRealtime() {
    if (_realtimeChannel) {
      try {
        var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
        if (c) c.removeChannel(_realtimeChannel);
      } catch (e) {}
      _realtimeChannel = null;
    }
  }

  async function pushAllLocal() {
    if (!isOnline()) return 0;
    var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
    if (!c || !root.Supa.isConfigured()) return 0;
    var sess = await root.Supa.getSession();
    if (!sess) return 0;
    var n = 0;
    for (var t = 0; t < DATA_TABLES.length; t++) {
      var table = DATA_TABLES[t];
      var all = await root.DB.getAll(table);
      for (var i = 0; i < all.length; i++) {
        await pushOne(table, all[i].id);
        n++;
      }
    }
    // Subir también app_config
    try { await pushOne('app_config', 'config'); n++; } catch (e) {}
    return n;
  }

  async function wipeRemote() {
    var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
    if (!c || !root.Supa.isConfigured()) return { ok: false, reason: 'no-config' };
    if (!isOnline()) return { ok: false, reason: 'offline' };
    var sess = await root.Supa.getSession();
    if (!sess || !sess.user) return { ok: false, reason: 'no-session' };
    var uid = sess.user.id;
    var idsByTable = {};
    for (var t = 0; t < DATA_TABLES.length; t++) {
      try {
        var lr = await c.from(DATA_TABLES[t]).select('id').eq('user_id', uid);
        if (!lr.error && lr.data) {
          idsByTable[DATA_TABLES[t]] = lr.data.map(function (x) { return x.id; });
        }
      } catch (e) {}
    }
    for (var d = 0; d < DATA_TABLES.length; d++) {
      var r = await c.from(DATA_TABLES[d]).delete().eq('user_id', uid);
      if (r.error) throw r.error;
    }
    try { await c.from('app_config').delete().eq('user_id', uid); } catch (e) {}
    try {
      var tombs = [];
      Object.keys(idsByTable).forEach(function (tb) {
        idsByTable[tb].forEach(function (rid) {
          tombs.push({ id: tb + ':' + rid, user_id: uid, table_name: tb, record_id: rid, deleted_at: new Date().toISOString() });
        });
      });
      if (tombs.length) await c.from(T_TOMB).upsert(tombs, { onConflict: 'id' });
    } catch (eT) {}
    saveQueue([]);
    try { localStorage.removeItem(LS_LAST_PULL); } catch (e) {}
    return { ok: true };
  }

  function hookStore() {
    if (!root.Store || root.Store._syncHooked) return;
    root.Store._syncHooked = true;

    function wrap(obj, method) {
      var orig = obj[method];
      if (!orig) return;
      obj[method] = async function () {
        var res = await orig.apply(obj, arguments);
        try { stamp(LS_LAST_SAVE); } catch (eS) {}
        try {
          var tableMap = {
            saveDog: 'dogs',
            saveService: 'services',
            saveEvent: 'events',
            saveTemplate: 'templates',
            saveContact: 'contacts',
            _putContact: 'contacts'
          };
          var table = tableMap[method];
          if (table && res && res.id) {
            enqueue(table, res.id, 'upsert');
            if (isOnline() && root.Supa && root.Supa.isConfigured()) pushQueue();
          } else if (table && arguments[0] && arguments[0].id) {
            enqueue(table, arguments[0].id, 'upsert');
            if (isOnline() && root.Supa && root.Supa.isConfigured()) pushQueue();
          }
        } catch (e) {}
        return res;
      };
    }

    wrap(root.Store, 'saveDog');
    wrap(root.Store, 'saveService');
    wrap(root.Store, 'saveEvent');
    wrap(root.Store, 'saveTemplate');
    wrap(root.Store, 'saveContact');
    wrap(root.Store, '_putContact');

    var delMap = {
      deleteContact: 'contacts',
      deleteDogPhysical: 'dogs',
      deleteService: 'services',
      deleteEvent: 'events',
      deleteTemplate: 'templates'
    };
    Object.keys(delMap).forEach(function (m) {
      var orig = root.Store[m];
      if (!orig) return;
      root.Store[m] = async function (id) {
        var r = await orig.apply(root.Store, arguments);
        try { stamp(LS_LAST_SAVE); } catch (eS) {}
        try {
          enqueue(delMap[m], id, 'delete');
          if (isOnline() && root.Supa && root.Supa.isConfigured()) pushQueue();
        } catch (e) {}
        return r;
      };
    });

    // Envolver setConfig para sincronizar configuración
    if (root.Store.setConfig) {
      var origSetConfig = root.Store.setConfig.bind(root.Store);
      root.Store.setConfig = function (partial, fromRemote) {
        var res = origSetConfig(partial);
        if (!fromRemote) {
          try {
            enqueue('app_config', 'config', 'upsert');
            if (isOnline() && root.Supa && root.Supa.isConfigured()) pushQueue();
          } catch (e) {}
        }
        return res;
      };
    }
  }

  var _started = false;
  function startAutoSync() {
    hookStore();
    initRealtime();
    if (_started) return;
    _started = true;

    window.addEventListener('online', function () {
      setSyncStatus('syncing');
      initRealtime();
      pushQueue();
      pullAll().then(function (r) {
        if (r && (r.pulled > 0 || r.repaired > 0)) {
          window.dispatchEvent(new CustomEvent('cc:data-changed', { detail: { source: 'online-pull' } }));
        }
      });
    });

    window.addEventListener('offline', function () {
      setSyncStatus('offline');
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && isOnline()) {
        initRealtime();
        pushQueue();
        pullAll().then(function (r) {
          if (r && (r.pulled > 0 || r.repaired > 0)) {
            window.dispatchEvent(new CustomEvent('cc:data-changed', { detail: { source: 'visibility-pull' } }));
          }
        });
      }
    });

    // Temporizador secundario de respaldo
    var tick = 0;
    setInterval(function () {
      if (!isOnline()) return;
      pushQueue();
      tick++;
      if (tick % 2 === 0) {
        pullAll().then(function (r) {
          if (r && (r.pulled > 0 || r.repaired > 0)) {
            window.dispatchEvent(new CustomEvent('cc:data-changed', { detail: { source: 'interval-pull' } }));
          }
        });
      }
    }, 30000);
  }

  function ls(key) { try { return localStorage.getItem(key) || null; } catch (e) { return null; } }

  async function diag() {
    var out = {
      href: (typeof location !== 'undefined' ? String(location.href) : ''),
      ua: (typeof navigator !== 'undefined' ? String(navigator.userAgent).slice(0, 120) : ''),
      swVer: root.__CC_VER__ || null,
      online: isOnline(),
      status: getSyncStatus(),
      realtimeActive: !!_realtimeChannel,
      configured: false,
      session: null,
      queue: [],
      lastPull: ls(LS_LAST_PULL),
      lastPushOk: ls(LS_LAST_PUSH_OK),
      lastErr: ls(LS_LAST_ERR),
      lastSave: ls(LS_LAST_SAVE),
      hooked: {}
    };
    try { out.configured = !!(root.Supa && root.Supa.isConfigured && root.Supa.isConfigured()); } catch (e) {}
    try { out.queue = loadQueue(); } catch (e) {}
    if (root.Store) {
      ['saveDog', 'saveService', 'saveEvent', 'saveTemplate', 'saveContact', 'deleteService', 'deleteDogPhysical', 'deleteContact', 'deleteEvent', 'deleteTemplate', 'setConfig'].forEach(function (m) {
        try { out.hooked[m] = String(root.Store[m]).indexOf('enqueue') !== -1; }
        catch (e) { out.hooked[m] = 'err'; }
      });
    }
    try {
      if (root.Supa && root.Supa.getSession) {
        var s = await root.Supa.getSession();
        out.session = (s && s.user) ? (s.user.email || s.user.id) : null;
      }
    } catch (e) { out.session = 'err'; }
    return out;
  }

  root.Sync = {
    TABLES: TABLES,
    DATA_TABLES: DATA_TABLES,
    enqueue: enqueue,
    pushOne: pushOne,
    pushQueue: pushQueue,
    pullAll: pullAll,
    pushAllLocal: pushAllLocal,
    wipeRemote: wipeRemote,
    hookStore: hookStore,
    startAutoSync: startAutoSync,
    initRealtime: initRealtime,
    stopRealtime: stopRealtime,
    getStatus: getSyncStatus,
    onStatusChange: onStatusChange,
    diag: diag,
    LS_QUEUE: LS_QUEUE,
    LS_LAST_PULL: LS_LAST_PULL,
    LS_LAST_PUSH_RUN: LS_LAST_PUSH_RUN,
    LS_LAST_PUSH_OK: LS_LAST_PUSH_OK,
    LS_LAST_ERR: LS_LAST_ERR,
    LS_LAST_SAVE: LS_LAST_SAVE
  };
})(typeof window !== 'undefined' ? window : globalThis);
