/* Cuidador Canino - Cliente Supabase (opcional, offline-first) */
(function (root) {
  'use strict';
  var LS_URL = 'cc_supabase_url';
  var LS_KEY = 'cc_supabase_key';
  var _client = null;

  var _envCache=null;
  function getUrl() { try { var v=localStorage.getItem(LS_URL); if(v) return v; if(_envCache && _envCache.url) return _envCache.url; try{ var r=new XMLHttpRequest(); r.open('GET','supabase-config.json',false); r.send(null); if(r.status===200){ _envCache=JSON.parse(r.responseText); if(_envCache.url) return _envCache.url; } }catch(e){} return ''; } catch (e) { return ''; } }
  function getKey() { try { var v=localStorage.getItem(LS_KEY); if(v) return v; if(_envCache && _envCache.key) return _envCache.key; try{ var r=new XMLHttpRequest(); r.open('GET','supabase-config.json',false); r.send(null); if(r.status===200){ _envCache=JSON.parse(r.responseText); if(_envCache.key) return _envCache.key; } }catch(e){} return ''; } catch (e) { return ''; } }

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
    getKey: getKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
