/* Cuidador Canino - Capa de acceso a IndexedDB */
(function (root) {
  'use strict';

  var DB_NAME = root.__CC_DB_NAME__ || 'cuidador_canino_db';
  var DB_VERSION = 3;
  var STORES = ['contacts', 'dogs', 'services', 'templates', 'events'];

  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        var tx = e.target.transaction;
        if (!db.objectStoreNames.contains('contacts')) {
          var contacts = db.createObjectStore('contacts', { keyPath: 'id' });
          contacts.createIndex('referido', 'referido', { unique: false });
        } else if (e.oldVersion < 3) {
          var cStore = tx.objectStore('contacts');
          if (!cStore.indexNames.contains('referido')) cStore.createIndex('referido', 'referido', { unique: false });
        }
        if (!db.objectStoreNames.contains('dogs')) {
          var dogs = db.createObjectStore('dogs', { keyPath: 'id' });
          dogs.createIndex('activo', 'activo', { unique: false });
          dogs.createIndex('sexo', 'sexo', { unique: false });
        } else if (e.oldVersion < 3) {
          var dStore = tx.objectStore('dogs');
          if (!dStore.indexNames.contains('sexo')) dStore.createIndex('sexo', 'sexo', { unique: false });
          if (!dStore.indexNames.contains('activo')) dStore.createIndex('activo', 'activo', { unique: false });
        }
        if (!db.objectStoreNames.contains('services')) {
          var s = db.createObjectStore('services', { keyPath: 'id' });
          s.createIndex('dog_ids', 'dog_ids', { unique: false, multiEntry: true });
          s.createIndex('desde', 'desde', { unique: false });
          s.createIndex('hasta', 'hasta', { unique: false });
          s.createIndex('estado', 'estado', { unique: false });
        } else if (e.oldVersion < 3) {
          var sStore = tx.objectStore('services');
          if (!sStore.indexNames.contains('hasta')) sStore.createIndex('hasta', 'hasta', { unique: false });
          if (!sStore.indexNames.contains('dog_ids')) sStore.createIndex('dog_ids', 'dog_ids', { unique: false, multiEntry: true });
          if (!sStore.indexNames.contains('desde')) sStore.createIndex('desde', 'desde', { unique: false });
          if (!sStore.indexNames.contains('estado')) sStore.createIndex('estado', 'estado', { unique: false });
        }
        if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('events')) {
          var ev = db.createObjectStore('events', { keyPath: 'id' });
          ev.createIndex('fecha', 'fecha', { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () { reject(new Error('IndexedDB bloqueado: cierra otras pestañas con esta app.')); };
    });
    return dbPromise;
  }

  function req(p) {
    return new Promise(function (resolve, reject) {
      p.onsuccess = function (e) { resolve(e.target.result); };
      p.onerror = function () { reject(p.error); };
    });
  }

  function getAll(storeName) {
    return open().then(function (db) {
      var st = db.transaction(storeName, 'readonly').objectStore(storeName);
      return req(st.getAll());
    });
  }

  function getAllByIndex(storeName, index, value) {
    return open().then(function (db) {
      var st = db.transaction(storeName, 'readonly').objectStore(storeName);
      var idx = st.index(index);
      return req(idx.getAll(value));
    });
  }

  function get(storeName, id) {
    return open().then(function (db) {
      var st = db.transaction(storeName, 'readonly').objectStore(storeName);
      return req(st.get(id));
    });
  }

  function put(storeName, obj) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(storeName, 'readwrite');
        var st = t.objectStore(storeName);
        var p = st.put(obj);
        t.oncomplete = function () { resolve(p.result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  function putAll(storeName, arr) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(storeName, 'readwrite');
        var st = t.objectStore(storeName);
        (arr || []).forEach(function (o) { st.put(o); });
        t.oncomplete = resolve;
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  function del(storeName, id) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(storeName, 'readwrite');
        t.objectStore(storeName).delete(id);
        t.oncomplete = resolve;
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  function clear(storeName) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(storeName, 'readwrite');
        t.objectStore(storeName).clear();
        t.oncomplete = resolve;
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  /* Carga atómica: limpia y reinserta todos los stores en una sola transacción. */
  function loadAll(payload) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORES, 'readwrite');
        var st = {};
        STORES.forEach(function (n) { st[n] = t.objectStore(n); });
        try {
          STORES.forEach(function (n) {
            st[n].clear();
            (payload[n] || []).forEach(function (o) { st[n].put(o); });
          });
        } catch (e) {
          t.abort();
          return reject(e);
        }
        t.oncomplete = resolve;
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  function close() {
    return open().then(function (db) { db.close(); dbPromise = null; });
  }

  root.DB = {
    STORES: STORES,
    open: open,
    getAll: getAll,
    getAllByIndex: getAllByIndex,
    get: get,
    put: put,
    putAll: putAll,
    del: del,
    clear: clear,
    loadAll: loadAll,
    close: close
  };
})(typeof window !== 'undefined' ? window : globalThis);
