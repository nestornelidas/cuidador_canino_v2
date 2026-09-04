/* Cuidador Canino - Cliente Supabase (opcional, offline-first) */
(function (root) {
  'use strict';
  var LS_URL = 'cc_supabase_url';
  var LS_KEY = 'cc_supabase_key';
  var _client = null;

  var _envCache=null;
  var _envPromise=null;
  function loadEnv(){
    if(_envPromise) return _envPromise;
    _envPromise = fetch('supabase-config.json', {cache:'no-store'}).then(function(r){
      if(!r.ok) throw new Error('no config');
      return r.json();
    }).then(function(j){
      _envCache = j || {};
      return _envCache;
    }).catch(function(){ _envCache = _envCache || {}; return _envCache; });
    return _envPromise;
  }
  // precarga no bloqueante al cargar el script
  try{ loadEnv(); }catch(e){}
  function getUrl() { try { var v=localStorage.getItem(LS_URL); if(v) return v; if(_envCache && _envCache.url) return _envCache.url; return ''; } catch (e) { return ''; } }
  function getKey() { try { var v=localStorage.getItem(LS_KEY); if(v) return v; if(_envCache && _envCache.key) return _envCache.key; return ''; } catch (e) { return ''; } }

  function isConfigured() {
    var u = getUrl(), k = getKey();
    return !!(u && k && u.indexOf('supabase.co') !== -1 && k.length > 20);
  }

  function setConfig(url, key) {
    localStorage.setItem(LS_URL, String(url || '').trim());
    localStorage.setItem(LS_KEY, String(key || '').trim());
    _client = null;
  }
  function clearConfig() {
    try { localStorage.removeItem(LS_URL); localStorage.removeItem(LS_KEY); } catch (e) {}
    _client = null;
  }

  function getClient() {
    if (_client) return _client;
    if (!isConfigured()) return null;
    var g = root.supabase;
    if (!g || !g.createClient) {
      console.warn('[Supa] supabase-js no cargado. Añade el script UMD en index.html');
      return null;
    }
    _client = g.createClient(getUrl(), getKey(), {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return _client;
  }

  async function getUser() {
    var c = getClient();
    if (!c) return null;
    var r = await c.auth.getUser();
    return r && r.data ? r.data.user : null;
  }

  async function getSession() {
    var c = getClient();
    if (!c) return null;
    var r = await c.auth.getSession();
    return r && r.data ? r.data.session : null;
  }

  function ready(){ return loadEnv().then(function(){ return isConfigured(); }); }

  root.Supa = {
    LS_URL: LS_URL,
    LS_KEY: LS_KEY,
    isConfigured: isConfigured,
    getClient: getClient,
    getUser: getUser,
    getSession: getSession,
    setConfig: setConfig,
    clearConfig: clearConfig,
    getUrl: getUrl,
    getKey: getKey,
    ready: ready,
    loadEnv: loadEnv
  };
})(typeof window !== 'undefined' ? window : globalThis);
