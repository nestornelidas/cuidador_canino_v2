/* Cuidador Canino - Sincronización offline-first con Supabase */
(function (root) {
  'use strict';
  var TABLES = ['contacts', 'dogs', 'services', 'events', 'templates'];
  var LS_QUEUE = 'cc_sync_queue_v1';
  var LS_LAST_PULL = 'cc_sync_last_pull_v1';

  function isOnline() { return typeof navigator === 'undefined' ? true : navigator.onLine; }

  function loadQueue() {
    try { var q = JSON.parse(localStorage.getItem(LS_QUEUE) || '[]'); return Array.isArray(q) ? q : []; } catch (e) { return []; }
  }
  function saveQueue(q) { try { localStorage.setItem(LS_QUEUE, JSON.stringify(q)); } catch (e) {} }

  function enqueue(table, id, op) {
    var q = loadQueue();
    // coalesce: si ya hay pendiente para mismo id, reemplaza
    var found = -1;
    for (var i = 0; i < q.length; i++) if (q[i].table === table && q[i].id === id) found = i;
    var entry = { table: table, id: id, op: op || 'upsert', ts: Date.now() };
    if (found >= 0) q[found] = entry; else q.push(entry);
    saveQueue(q);
  }

  async function pushOne(table, id) {
    var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
    if (!c) return false;
    var sess = await root.Supa.getSession();
    if (!sess || !sess.user) return false;
    var uid = sess.user.id;
    try {
      if (table === 'templates') {
        var rec = await root.DB.get(table, id);
        if (!rec) { // borrado
          var del = await c.from(table).delete().eq('id', id).eq('user_id', uid);
          if (del.error) throw del.error;
          return true;
        }
        // last-write-wins: no pisar si remoto es más nuevo
        try{
          var ex = await c.from(table).select('updated_at').eq('id', id).eq('user_id', uid).maybeSingle();
          if(ex && ex.data && ex.data.updated_at && rec._updated_at && ex.data.updated_at > rec._updated_at) return true;
        }catch(e){}
        var now = new Date().toISOString();
        rec._updated_at = now;
        try{ await root.DB.put(table, rec); }catch(e){}
        var up = await c.from(table).upsert({ id: rec.id, user_id: uid, data: rec, updated_at: now }, { onConflict: 'id' });
        if (up.error) throw up.error;
        return true;
      }
      // contacts/dogs/services/events: stored cifrado
      var stored = await root.DB.get(table, id);
      if (!stored) {
        var d2 = await c.from(table).delete().eq('id', id).eq('user_id', uid);
        if (d2.error) throw d2.error;
        return true;
      }
      try{
        var ex2 = await c.from(table).select('updated_at').eq('id', id).eq('user_id', uid).maybeSingle();
        if(ex2 && ex2.data && ex2.data.updated_at && stored._updated_at && ex2.data.updated_at > stored._updated_at) return true;
      }catch(e){}
      var now2 = new Date().toISOString();
      stored._updated_at = now2;
      try{ await root.DB.put(table, stored); }catch(e){}
      var payload = { id: stored.id, user_id: uid, data: stored, updated_at: now2 };
      var res = await c.from(table).upsert(payload, { onConflict: 'id' });
      if (res.error) throw res.error;
      return true;
    } catch (e) {
      console.warn('[Sync] push fallo', table, id, e && e.message ? e.message : e);
      return false;
    }
  }

  async function pushQueue() {
    if (!isOnline()) return 0;
    var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
    if (!c || !root.Supa.isConfigured()) return 0;
    var sess = await root.Supa.getSession();
    if (!sess) return 0;
    var q = loadQueue();
    if (!q.length) return 0;
    var ok = 0;
    var remaining = [];
    for (var i = 0; i < q.length; i++) {
      var e = q[i];
      var done = await pushOne(e.table, e.id);
      if (done) ok++; else remaining.push(e);
    }
    saveQueue(remaining);
    return ok;
  }

  async function pullAll() {
    var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
    if (!c || !root.Supa.isConfigured()) return { pulled: 0 };
    var sess = await root.Supa.getSession();
    if (!sess) return { pulled: 0 };
    var total = 0;
    for (var t = 0; t < TABLES.length; t++) {
      var table = TABLES[t];
      try {
        var res = await c.from(table).select('id,data,updated_at').eq('user_id', sess.user.id);
        if (res.error) throw res.error;
        var rows = res.data || [];
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i];
          // last-write-wins: no pisar local más nuevo
          try{
            var local = await root.DB.get(table, r.id);
            if(local && local._updated_at && r.updated_at && local._updated_at > r.updated_at){
              // local más nuevo -> no pisar, se subirá en próximo push
              continue;
            }
            if(r.data) r.data._updated_at = r.updated_at;
          }catch(e){}
          await root.DB.put(table, r.data);
          total++;
        }
        // Nota: no borramos locales que no estén en remoto en v1 (evita pérdida si pull parcial)
        // Los borrados locales se propagan vía pushOne(delete) con cola LS_QUEUE
      } catch (e) {
        console.warn('[Sync] pull fallo', table, e && e.message ? e.message : e);
      }
    }
    try { localStorage.setItem(LS_LAST_PULL, new Date().toISOString()); } catch (e) {}
    return { pulled: total };
  }

  async function pushAllLocal() {
    // Migración inicial: sube todo lo local
    if (!isOnline()) return 0;
    var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
    if (!c || !root.Supa.isConfigured()) return 0;
    var sess = await root.Supa.getSession();
    if (!sess) return 0;
    var n = 0;
    for (var t = 0; t < TABLES.length; t++) {
      var table = TABLES[t];
      var all = await root.DB.getAll(table);
      for (var i = 0; i < all.length; i++) {
        await pushOne(table, all[i].id);
        n++;
      }
    }
    return n;
  }

  /* Borrado total: elimina todas las filas del usuario en la nube y vacía la
     cola pendiente (si no, los upserts encolados resucitarían datos). Se usa
     tras Store.clearAllExceptConfig() en "Borrar todos los datos". */
  async function wipeRemote() {
    var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
    if (!c || !root.Supa.isConfigured()) return { ok: false, reason: 'no-config' };
    if (!isOnline()) return { ok: false, reason: 'offline' };
    var sess = await root.Supa.getSession();
    if (!sess || !sess.user) return { ok: false, reason: 'no-session' };
    var uid = sess.user.id;
    for (var t = 0; t < TABLES.length; t++) {
      var r = await c.from(TABLES[t]).delete().eq('user_id', uid);
      if (r.error) throw r.error;
    }
    saveQueue([]);
    try { localStorage.removeItem(LS_LAST_PULL); } catch (e) {}
    return { ok: true };
  }

  function hookStore() {
    if (!root.Store || root.Store._syncHooked) return;
    root.Store._syncHooked = true;
    var origSaveContact = root.Store.saveContact ? root.Store.saveContact.bind(root.Store) : null;
    var origPutContact = root.Store._putContact ? root.Store._putContact.bind(root.Store) : null;
    // Envolvemos saveDog/saveService etc para encolar
    function wrap(obj, method) {
      var orig = obj[method];
      if (!orig) return;
      obj[method] = async function () {
        var res = await orig.apply(obj, arguments);
        try {
          var tableMap = { saveDog: 'dogs', saveService: 'services', saveEvent: 'events', saveTemplate: 'templates', saveContact: 'contacts', _putContact: 'contacts' };
          var table = tableMap[method];
          if (table && res && res.id) {
            enqueue(table, res.id, 'upsert');
            if (isOnline() && root.Supa && root.Supa.isConfigured()) pushQueue();
          } else if (table && arguments[0] && arguments[0].id) {
            enqueue(table, arguments[0].id, 'upsert');
            if (isOnline() && root.Supa.isConfigured()) pushQueue();
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
    // deletes
    var delMap = { deleteContact: 'contacts', deleteDogPhysical: 'dogs', deleteService: 'services', deleteEvent: 'events', deleteTemplate: 'templates' };
    Object.keys(delMap).forEach(function (m) {
      var orig = root.Store[m];
      if (!orig) return;
      root.Store[m] = async function (id) {
        var r = await orig.apply(root.Store, arguments);
        try { enqueue(delMap[m], id, 'delete'); if (isOnline() && root.Supa && root.Supa.isConfigured()) pushQueue(); } catch (e) {}
        return r;
      };
    });
  }

  var _started = false;
  function startAutoSync() {
    hookStore();
    if (_started) return;
    _started = true;
    window.addEventListener('online', function () { pushQueue(); pullAll(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && isOnline()) pushQueue(); });
    // intento periódico
    setInterval(function () { if (isOnline()) pushQueue(); }, 30000);
  }

  root.Sync = {
    TABLES: TABLES,
    enqueue: enqueue,
    pushOne: pushOne,
    pushQueue: pushQueue,
    pullAll: pullAll,
    pushAllLocal: pushAllLocal,
    wipeRemote: wipeRemote,
    hookStore: hookStore,
    startAutoSync: startAutoSync,
    LS_QUEUE: LS_QUEUE,
    LS_LAST_PULL: LS_LAST_PULL
  };
})(typeof window !== 'undefined' ? window : globalThis);
