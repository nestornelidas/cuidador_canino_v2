/* Cuidador Canino - Cifrado de datos sensibles (Web Crypto API).
   - Clave maestra derivada con PBKDF2-HMAC-SHA256 (150.000 iteraciones) + salt aleatorio.
   - Cifrado AES-GCM 256 (256 bits): confidencialidad + integridad.
   - IV aleatorio por mensaje; los campos cifrados llevan el prefijo 'enc:'.
   - La clave derivada SOLO existe en memoria (cierre del módulo): nunca se persiste.
   - Verificación de contraseña: blob cifrado con texto conocido (sin hashes de la clave en claro). */
(function (root) {
  'use strict';

  var CRYPTO_KEY = 'cuidador_canino_crypto_v1';
  var ITERATIONS = 150000;
  var SALT_BYTES = 16;
  var IV_BYTES = 12;
  var PREFIX = 'enc:';
  var VERIFY_TEXT = 'cuidador_canino_verify_v1';
  /* Campos con datos personales almacenados cifrados, por tipo de registro.
     v1: solo contactos (nombre/teléfono/Telegram/WhatsApp).
     v2: + otros/referido_por (contactos) y notas/observaciones/descripción.
     v3: + medicación del servicio (medicación/dosis/frecuencia/notas sobre medicación).
     v4: + notas de medicación del perro (la fecha de expiración no se cifra). */
  var FIELDS_VERSION = 4;
  var SECRET_FIELDS = ['nombre', 'telefono', 'telegram', 'whatsapp', 'otros', 'referido_por'];
  var SECRET_FIELDS_BY_KIND = {
    contact: SECRET_FIELDS,
    dog: ['observaciones', 'notas', 'notas_medicacion'],
    service: ['notas', 'medicacion', 'dosis', 'frecuencia', 'notas_medicacion'],
    event: ['descripcion']
  };
  var LEGACY_FIELDS_VERSION = 1;

  function fieldsFor(kind) { return SECRET_FIELDS_BY_KIND[kind] || []; }

  var enc = new TextEncoder();
  var dec = new TextDecoder();

  var currentKey = null;   /* CryptoKey AES-GCM (solo memoria) */
  var currentSalt = null;  /* salt con el que se derivó currentKey */

  function ab2b64(buf) {
    var u = new Uint8Array(buf), s = '', CH = 0x8000;
    for (var i = 0; i < u.length; i += CH) {
      s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
    }
    return btoa(s);
  }

  function b642ab(b64) {
    var s = atob(b64), u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }

  function hex(u) {
    var s = '';
    for (var i = 0; i < u.length; i++) s += (u[i] < 16 ? '0' : '') + u[i].toString(16);
    return s;
  }

  function randBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); }

  async function deriveKey(pw, saltB64) {
    var km = await crypto.subtle.importKey('raw', enc.encode(String(pw)), { name: 'PBKDF2' }, false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b642ab(saltB64), iterations: ITERATIONS, hash: { name: 'SHA-256' } },
      km,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function aesEncrypt(dataBytes, key) {
    var iv = randBytes(IV_BYTES);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, dataBytes);
    return { iv: ab2b64(iv), ct: ab2b64(new Uint8Array(ct)) };
  }

  async function aesDecrypt(ivB64, ctB64, key) {
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b642ab(ivB64) }, key, b642ab(ctB64));
    return new Uint8Array(pt);
  }

  function readState() {
    try { return JSON.parse(localStorage.getItem(CRYPTO_KEY) || 'null'); } catch (e) { return null; }
  }

  function writeState(st) { localStorage.setItem(CRYPTO_KEY, JSON.stringify(st)); }

  function isEnc(v) { return typeof v === 'string' && v.slice(0, 4) === PREFIX; }

  async function encryptStr(plain, key) {
    var r = await aesEncrypt(enc.encode(String(plain)), key);
    return PREFIX + r.iv + ':' + r.ct;
  }

  async function decryptStr(s, key) {
    if (!isEnc(s)) return s;
    var body = s.slice(4);
    var i = body.indexOf(':');
    var pt = await aesDecrypt(body.slice(0, i), body.slice(i + 1), key);
    return dec.decode(pt);
  }

  /* Cifra los campos sensibles de un registro según su tipo y calcula el hash de búsqueda
     del contacto (basado en el nombre). Los campos no sensibles se dejan igual. */
  async function encryptRecord(kind, obj, key) {
    var k = key || currentKey;
    var out = Object.assign({}, obj);
    if (!k) return out;
    /* hash del nombre en CLARO (el campo puede estar cifrado a continuación) */
    if (kind === 'contact' && !isEnc(out.nombre)) out.hash_busqueda = await hashField(out.nombre);
    var fields = fieldsFor(kind);
    await Promise.all(fields.map(async function (f) {
      if (out[f] != null && out[f] !== '' && !isEnc(out[f])) {
        out[f] = await encryptStr(out[f], k);
      }
    }));
    return out;
  }

  /* Descifra los campos sensibles de un registro (los no cifrados se dejan igual). */
  async function decryptRecord(kind, obj, key) {
    var k = key || currentKey;
    var out = Object.assign({}, obj);
    if (!k) return out;
    var fields = fieldsFor(kind);
    await Promise.all(fields.map(async function (f) {
      if (isEnc(out[f])) {
        try { out[f] = await decryptStr(out[f], k); } catch (e) { /* se deja el valor cifrado */ }
      }
    }));
    return out;
  }

  async function hashField(v) {
    var data = enc.encode(String(v == null ? '' : v).toLowerCase().trim());
    var d = await crypto.subtle.digest('SHA-256', data);
    return hex(new Uint8Array(d));
  }

  async function setup(pw) {
    var saltB64 = ab2b64(randBytes(SALT_BYTES));
    var key = await deriveKey(pw, saltB64);
    var v = await aesEncrypt(enc.encode(VERIFY_TEXT), key);
    writeState({ salt: saltB64, verify: v.iv + ':' + v.ct, iter: ITERATIONS, fv: FIELDS_VERSION });
    currentKey = key;
    currentSalt = saltB64;
    return key;
  }

  async function unlock(pw) {
    var st = readState();
    if (!st || !st.salt || !st.verify) return false;
    var key = await deriveKey(pw, st.salt);
    try {
      var i = st.verify.indexOf(':');
      var pt = await aesDecrypt(st.verify.slice(0, i), st.verify.slice(i + 1), key);
      if (dec.decode(pt) !== VERIFY_TEXT) return false;
    } catch (e) { return false; }
    currentKey = key;
    currentSalt = st.salt;
    return true;
  }

  /* Versión de campos con la que se creó/actualizó el estado cifrado. */
  function fieldsVersion() {
    var st = readState();
    return (st && typeof st.fv === 'number') ? st.fv : LEGACY_FIELDS_VERSION;
  }

  /* Tras actualizar el código, si se amplían los campos cifrados conviene re-ejecutar
     el cifrado de los registros ya guardados (migración única). */
  function marksMigration() { return fieldsVersion() < FIELDS_VERSION; }

  /* Persiste la versión actual de campos (tras re-cifrar en la migración). */
  function markFieldsCurrent() {
    var st = readState();
    if (!st) return;
    st.fv = FIELDS_VERSION;
    writeState(st);
  }

  function configured() {
    var st = readState();
    return !!(st && st.salt && st.verify);
  }

  function isUnlocked() { return !!currentKey; }
  function salt() { return currentSalt; }
  function lock() { currentKey = null; currentSalt = null; }

  /* Deriva una clave para un salt concreto (sin tocar la sesión). Se usa para importar. */
  function deriveWith(pw, saltB64) { return deriveKey(pw, saltB64); }

  function resetForTest() {
    try { localStorage.removeItem(CRYPTO_KEY); } catch (e) { /* noop */ }
    currentKey = null;
    currentSalt = null;
  }

  root.Crypto = {
    ITERATIONS: ITERATIONS,
    FIELDS_VERSION: FIELDS_VERSION,
    SECRET_FIELDS: SECRET_FIELDS.slice(),
    fieldsFor: fieldsFor,
    configured: configured,
    isUnlocked: isUnlocked,
    salt: salt,
    fieldsVersion: fieldsVersion,
    marksMigration: marksMigration,
    markFieldsCurrent: markFieldsCurrent,
    setup: setup,
    unlock: unlock,
    lock: lock,
    deriveWith: deriveWith,
    resetForTest: resetForTest,
    encryptRecord: encryptRecord,
    decryptRecord: decryptRecord,
    encryptStr: encryptStr,
    decryptStr: decryptStr,
    hashField: hashField
  };
})(typeof window !== 'undefined' ? window : globalThis);