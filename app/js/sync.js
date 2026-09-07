/* Cuidador Canino - Sincronización offline-first con Supabase */
(function (root) {
  'use strict';
  var TABLES = ['contacts', 'dogs', 'services', 'events', 'templates'];
  var T_TOMB = 'sync_tombstones';
  var LS_QUEUE = 'cc_sync_queue_v1';
  var LS_LAST_PULL = 'cc_sync_last_pull_v1';
  /* Margen anti-desfase de relojes: el pull incremental pide desde
     (last_pull - 2 min); el last-write-wins deduplica lo repetido. */
  var PULL_MARGIN_MS = 2 * 60 * 1000;
  var TOMB_PRUNE_MS = 30 * 24 * 3600 * 1000;

  function isOnline() { return typeof navigator === 'undefined' ? true : navigator.onLine; }

  /* La tabla de lápidas es opcional (requiere sync_tombstones.sql): si no
     existe, el subsistema se desactiva en silencio sin romper el sync. */
  function isMissingTable(e) {
    var m = String((e && e.message) || e || '');
    return /Could not find the table|42P01|does not exist/i.test(m);
  }

  /* Registra una lápida para que los otros dispositivos borren su copia.
     Best-effort: si falla (p.ej. tabla aún no creada) no se bloquea el delete. */
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
          await noteTombstone(c, uid, table, id);
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
        await noteTombstone(c, uid, table, id);
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

  /* Sellos de observabilidad: cuándo se intentó, cuándo subió algo y último
     error. Se muestran en Configuración > Nube para diagnosticar. */
  var LS_LAST_PUSH_RUN = 'cc_sync_last_push_run_v1';
  var LS_LAST_PUSH_OK = 'cc_sync_last_push_ok_v1';
  var LS_LAST_ERR = 'cc_sync_last_err_v1';
  var LS_LAST_SAVE = 'cc_sync_last_save_v1';
  function stamp(key, val) { try { localStorage.setItem(key, val === undefined ? new Date().toISOString() : val); } catch (e) {} }
  function stampErr(m) { stamp(LS_LAST_ERR, new Date().toISOString() + ' ' + String(m || '').slice(0, 200)); }

  /* Mutex: nunca dos pasadas solapadas. Si entran elementos nuevos durante una
     pasada, se hace otra vuelta (acotada); si solo quedan fallos, se sale. */
  var _pushing = false;
  async function pushQueue() {
    if (_pushing) return 0;
    _pushing = true;
    var totalOk = 0;
    try {
      if (!isOnline()) return 0;
      var c = root.Supa && root.Supa.getClient ? root.Supa.getClient() : null;
      if (!c || !root.Supa.isConfigured()) return 0;
      var sess = await root.Supa.getSession();
      if (!sess) return 0;
      var startLen = loadQueue().length;
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
        // otra vuelta solo si entraron elementos nuevos durante la pasada
        if (loadQueue().length <= remaining.length) break;
      }
      stamp(LS_LAST_PUSH_RUN);
      if (totalOk > 0) stamp(LS_LAST_PUSH_OK);
      else if (startLen > 0) stampErr('0 subidos con ' + startLen + ' en cola (¿sesión? ¿red? ¿permisos?)');
      return totalOk;
    } catch (eTop) {
      stampErr(eTop && eTop.message ? eTop.message : eTop);
      return totalOk;
    } finally {
      _pushing = false;
    }
  }

  /* Descarga novedades. Incremental por defecto (solo updated_at posterior al
     último pull OK); {full:true} descarga todo y reconcilia borrados: elimina
     copias locales que ya no existen en remoto (solo si tienen _updated_at y
     no están en la cola pendiente: nunca toca creaciones aún no subidas).
     Nunca rechaza: devuelve {pulled, repaired}. */
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
      // Intención local pendiente: lo que está en cola (editado o borrado y
      // aún no subido) no debe pisarlo el pull; ya lo resolverá el push.
      var pendingSet = {};
      try {
        loadQueue().forEach(function (e) { if (e && e.table && e.id) pendingSet[e.table + ':' + e.id] = e.op || 'upsert'; });
      } catch (eQ) {}

      // 1) Lápidas: borrados hechos en otros dispositivos
      try {
        var tq = c.from(T_TOMB).select('table_name,record_id').eq('user_id', uid);
        if (incremental) tq = tq.gt('deleted_at', since);
        var tres = await tq;
        if (tres.error) throw tres.error;
        var qq = loadQueue();
        var tombs = tres.data || [];
        for (var ti = 0; ti < tombs.length; ti++) {
          var tb = tombs[ti];
          if (TABLES.indexOf(tb.table_name) === -1 || !tb.record_id) continue;
          var pend = false;
          for (var qi = 0; qi < qq.length; qi++) {
            if (qq[qi].table === tb.table_name && qq[qi].id === tb.record_id && qq[qi].op !== 'delete') { pend = true; break; }
          }
          if (pend) continue; // hay edición local pendiente: gana el próximo push
          try { await root.DB.del(tb.table_name, tb.record_id); repaired++; } catch (eDel) {}
        }
        // poda de lápidas antiguas
        try { await c.from(T_TOMB).delete().eq('user_id', uid).lt('deleted_at', new Date(Date.now() - TOMB_PRUNE_MS).toISOString()); } catch (ePrune) {}
      } catch (eT) {
        if (!isMissingTable(eT)) { console.warn('[Sync] pull lápidas', eT && eT.message ? eT.message : eT); errors++; }
      }

      // 2) Tablas
      for (var t = 0; t < TABLES.length; t++) {
        var table = TABLES[t];
        try {
          var sel = c.from(table).select('id,data,updated_at').eq('user_id', uid);
          if (incremental) sel = sel.gt('updated_at', since);
          var res = await sel;
          if (res.error) throw res.error;
          var rows = res.data || [];
          for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            if (pendingSet[table + ':' + r.id]) continue; // intención local pendiente
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
          // 3) Reconciliación (solo en pull completo OK): borra copias locales
          // de filas que ya no existen en remoto (cubre borrados anteriores a
          // las lápidas). Conservador: exige _updated_at y ausencia en cola.
          if (!incremental) {
            var remoteIds = {};
            for (var ri = 0; ri < rows.length; ri++) remoteIds[rows[ri].id] = true;
            var locals = await root.DB.getAll(table);
            var pq = loadQueue();
            for (var li = 0; li < locals.length; li++) {
              var rec = locals[li];
              if (!rec || remoteIds[rec.id]) continue;
              // Sin sello solo se perdona en automático (podría ser creación
              // aún no subida); en reparación manual se asume copia obsoleta.
              if (!rec._updated_at && !opts.repair) continue; // creado local, aún no sincronizado
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
      }
      return { pulled: total, repaired: repaired };
    } catch (eTop) {
      console.warn('[Sync] pullAll', eTop && eTop.message ? eTop.message : eTop);
      return { pulled: 0, repaired: 0 };
    }
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
    // ids previos para dejar lápidas (si no, los otros dispositivos resucitan)
    var idsByTable = {};
    for (var t = 0; t < TABLES.length; t++) {
      try {
        var lr = await c.from(TABLES[t]).select('id').eq('user_id', uid);
        if (!lr.error && lr.data) {
          idsByTable[TABLES[t]] = lr.data.map(function (x) { return x.id; });
        }
      } catch (e) {}
    }
    for (var d = 0; d < TABLES.length; d++) {
      var r = await c.from(TABLES[d]).delete().eq('user_id', uid);
      if (r.error) throw r.error;
    }
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
    var origSaveContact = root.Store.saveContact ? root.Store.saveContact.bind(root.Store) : null;
    var origPutContact = root.Store._putContact ? root.Store._putContact.bind(root.Store) : null;
    // Envolvemos saveDog/saveService etc para encolar
    function wrap(obj, method) {
      var orig = obj[method];
      if (!orig) return;
      obj[method] = async function () {
        var res = await orig.apply(obj, arguments);
        try { stamp(LS_LAST_SAVE); } catch (eS) {}
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
        try { stamp(LS_LAST_SAVE); } catch (eS) {}
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
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && isOnline()) { pushQueue(); pullAll(); } });
    // push cada 30s; pull incremental cada 60s (barato: solo novedades)
    var tick = 0;
    setInterval(function () {
      if (!isOnline()) return;
      pushQueue();
      tick++;
      if (tick % 2 === 0) pullAll();
    }, 30000);
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
    LS_LAST_PULL: LS_LAST_PULL,
    LS_LAST_PUSH_RUN: LS_LAST_PUSH_RUN,
    LS_LAST_PUSH_OK: LS_LAST_PUSH_OK,
    LS_LAST_ERR: LS_LAST_ERR,
    LS_LAST_SAVE: LS_LAST_SAVE
  };
})(typeof window !== 'undefined' ? window : globalThis);
