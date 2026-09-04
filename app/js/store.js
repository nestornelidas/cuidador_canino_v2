/* Cuidador Canino - Capa de datos y lógica de negocio */
(function (root) {
  'use strict';

  var CONFIG_KEY = 'cuidador_canino_config_v1';

  function defaultComportamientos() {
    function s(ls) {
      return ls.slice().sort(function (a, b) { return String(a).localeCompare(String(b), 'es'); });
    }
    return [
      { id: 'personas', titulo: 'A personas', items: s([
        'Saltar encima.', 'Ladrar/gruñir/mostrar dientes', 'Intentar morder.',
        'Mordisquear manos, ropa o partes del cuerpo.', 'Robar comida de las manos.',
        'Pedir comida de forma insistente.', 'Exigir atención.', 'No tolera manipulación.',
        'Muestra miedo o evitación excesiva.', 'Proteger juguetes, comida o espacios'
      ])},
      { id: 'perros', titulo: 'Con otros perros', items: s([
        'Ladrarles.', 'Lanzarse hacia ellos.', 'Gruñir o intentar morder.', 'Montar a otros perros.',
        'Acosarlos o perseguirlos constantemente.', 'No respetar sus señales de incomodidad.',
        'Proteger juguetes, comida o espacios.'
      ])},
      { id: 'casa', titulo: 'En casa', items: s([
        'Romper muebles, cables, objetos.', 'Romper sus cosas, juguetes, cama', 'Robar objetos.',
        'Subirse a muebles cuando no está permitido.', 'Escarbar en camas, sofás o muebles.', 'Abrir puertas.',
        'Robar comida de mesas o encimeras.', 'Hacer sus necesidades dentro de casa.', 'Marcar con orina.',
        'Ladrar excesivamente.', 'Aullar.', 'Correr o excitarse excesivamente dentro de casa.',
        'Excitación excesiva al recibir visitas.', 'Incapacidad para relajarse.',
        'Seguir al propietario de manera obsesiva.', 'Ansiedad cuando se queda solo.',
        'Destruir objetos durante la ausencia.', 'Ladrar o aullar cuando está solo.',
        'Proteger excesivamente a una persona.', 'Reaccionar exageradamente ante ruidos.',
        'Tener dificultades para aceptar límites.'
      ])},
      { id: 'paseos', titulo: 'Durante los paseos', items: s([
        'Tirar de la correa.', 'Pararse constantemente.', 'Ir de un lado a otro de la acera.',
        'Intentar escapar del collar/arnés.', 'Lanzarse hacia perros, personas, bicicletas o vehículos.',
        'Perseguir animales.', 'Comer cosas del suelo.', 'Ladrar a estímulos.',
        'No acudir cuando se le llama.', 'No camina tranquilamente junto al guía.'
      ])}
    ];
  }

  function defaultConfig() {
    return {
      costeHospedaje: 20,
      costePaseo: 12,
      ocultarDecesos: false,
      ocultarRedFlags: false,
      logo: null,
      nombreEmpresa: '',
      google: { enabled: false, email: '', apiKey: '', calendarId: '' },
      comportamientos: defaultComportamientos(),
      captacion: defaultCaptacion(),
      colores: {
        pendiente: '#e63946',
        confirmado: '#2563eb',
        en_curso: '#7c3aed',
        finalizado: '#16a34a',
        cancelado: '#4b5563',
        evento: '#f5c518'
      }
    };
  }

  function defaultCaptacion() {
    return [
      { id: 'wallapop', nombre: 'Wallapop' },
      { id: 'holidog', nombre: 'Holidog' },
      { id: 'topayuda', nombre: 'TopAyuda' },
      { id: 'directa', nombre: 'Captación directa' },
      { id: 'boca_a_boca', nombre: 'Boca a boca' }
    ];
  }

  var _cfgCache=null, _cfgRaw=null;
  function getConfig() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (raw === _cfgRaw && _cfgCache) return JSON.parse(JSON.stringify(_cfgCache));
      var c = raw ? JSON.parse(raw) : {};
      var out = Object.assign(defaultConfig(), c, { google: Object.assign(defaultConfig().google, (c && c.google) || {}) });
      _cfgRaw = raw; _cfgCache = out;
      return JSON.parse(JSON.stringify(out));
    } catch (e) {
      return defaultConfig();
    }
  }

  function setConfig(partial) {
    var c = Object.assign(getConfig(), partial);
    if (c.google) c.google = Object.assign(defaultConfig().google, c.google);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
    _cfgRaw = null; _cfgCache = null;
    return c;
  }

  var Store = {
    uid: function () { return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); },
    getConfig: getConfig,
    setConfig: setConfig,
    defaultConfig: defaultConfig,
    defaultComportamientos: defaultComportamientos,
    defaultCaptacion: defaultCaptacion,
    CONFIG_KEY: CONFIG_KEY,

    /* ---- Contactos (cifrado transparente: se descifra al leer y se cifra al escribir) ---- */
    listContacts: async function () {
      var all = (await DB.getAll('contacts')) || [];
      return Promise.all(all.map(function (r) { return Crypto.decryptRecord('contact', r); }));
    },
    getContact: async function (id) {
      var r = await DB.get('contacts', id);
      return r ? Crypto.decryptRecord('contact', r) : undefined;
    },
    /* Contactos tal y como se almacenan (cifrados). Para exportar/importar. */
    listContactsStored: function () { return DB.getAll('contacts'); },

    /* Cifra y guarda un contacto en su forma almacenada; devuelve el objeto en claro. */
    _putContact: async function (c) {
      c.id = c.id || Store.uid();
      var stored = await Crypto.encryptRecord('contact', c);
      await DB.put('contacts', stored);
      return c;
    },

    /* Devuelve el contacto existente (distinto id) que comparta teléfono/whatsapp/telegram normalizado.
       Si el humano no aporta ningún dato de contacto (ni teléfono, ni WhatsApp, ni Telegram), se
       reutiliza por nombre: así "Judit" sin número no crea un registro distinto por perro y el canal
       de captación (u otros datos) se comparte de verdad entre todos sus perros. */
    async findContactByUnique(c) {
      var np = Calc.normalizePhone(c.telefono);
      var nw = Calc.normalizePhone(c.whatsapp);
      var nt = Calc.normalizeTelegram(c.telegram);
      var contacts = await Store.listContacts();
      for (var i = 0; i < contacts.length; i++) {
        var o = contacts[i];
        if (o.id && o.id === c.id) continue;
        if (np && np === Calc.normalizePhone(o.telefono)) return o;
        if (nw && nw === Calc.normalizePhone(o.whatsapp)) return o;
        if (nt && nt === Calc.normalizeTelegram(o.telegram)) return o;
      }
      if (!np && !nw && !nt) {
        var nn = Calc.normalizeName(c.nombre);
        if (nn) {
          for (var j = 0; j < contacts.length; j++) {
            var oc = contacts[j];
            if (oc.id && oc.id === c.id) continue;
            if (Calc.normalizeName(oc.nombre) === nn) return oc;
          }
        }
      }
      return null;
    },

    async saveContact(c) {
      var existing = await Store.findContactByUnique(c);
      if (existing) {
        var merged = Object.assign({}, existing);
        ['nombre', 'telefono', 'telegram', 'whatsapp', 'otros'].forEach(function (f) {
          if (!merged[f] && c[f]) merged[f] = c[f];
        });
        /* El canal de captación y "recomendado por" se toman del formulario: si el usuario lo ha
           cambiado (o lo ha dejado vacío) debe reflejarse en el contacto compartido. */
        if (c.referido !== undefined) merged.referido = c.referido;
        if (c.referido_por !== undefined) merged.referido_por = c.referido_por;
        return Store._putContact(merged);
      }
      return Store._putContact(c);
    },
    async deleteContact(id) { await DB.del('contacts', id); },

    /* ---- Perros (cifrado transparente de datos personales en texto libre) ---- */
    async listDogs(opts) {
      var dogs = (await DB.getAll('dogs')) || [];
      var out = await Promise.all(dogs.map(function (r) { return Crypto.decryptRecord('dog', r); }));
      if (opts && opts.includeInactive === false) out = out.filter(function (d) { return d.activo !== false; });
      return out.sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre), 'es'); });
    },
    /* Perros tal y como se almacenan (cifrados). Para exportar. */
    listDogsStored: function () { return DB.getAll('dogs'); },
    async getDog(id) {
      var r = await DB.get('dogs', id);
      return r ? Crypto.decryptRecord('dog', r) : undefined;
    },
    async saveDog(d) {
      d.id = d.id || Store.uid();
      if (d.activo === undefined) d.activo = true;
      await DB.put('dogs', await Crypto.encryptRecord('dog', d));
      return d;
    },
    async deleteDogPhysical(id) { await DB.del('dogs', id); },

    /* ---- Servicios (cifrado transparente de notas) ---- */
    async listServices() {
      var s = (await DB.getAll('services')) || [];
      var out = await Promise.all(s.map(function (r) { return Crypto.decryptRecord('service', r); }));
      return out.sort(function (a, b) { return String(a.desde).localeCompare(String(b.desde)); });
    },
    /* Servicios tal y como se almacenan (cifrados). Para exportar. */
    listServicesStored: function () { return DB.getAll('services'); },
    async getService(id) {
      var r = await DB.get('services', id);
      return r ? Crypto.decryptRecord('service', r) : undefined;
    },
    async saveService(s) {
      s.id = s.id || Store.uid();
      await DB.put('services', await Crypto.encryptRecord('service', s));
      return s;
    },
    async deleteService(id) { await DB.del('services', id); },
    async listServicesByDog(dogId) {
      var list = (await DB.getAllByIndex('services', 'dog_ids', dogId)) || [];
      return Promise.all(list.map(function (r) { return Crypto.decryptRecord('service', r); }));
    },
    async listServicesInRange(fromISO, toISO) {
      var all = await Store.listServices();
      return all.filter(function (s) { return s.desde <= toISO && s.hasta >= fromISO; });
    },
    async listServicesByYear(year) {
      var all = await Store.listServices();
      var y = String(year);
      return all.filter(function (s) { return s.desde && s.desde.slice(0, 4) === y; });
    },

    /* ---- Plantillas ---- */
    async listTemplates() {
      var t = (await DB.getAll('templates')) || [];
      return t.sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
    },
    async saveTemplate(t) {
      t.id = t.id || Store.uid();
      await DB.put('templates', t);
      return t;
    },
    async deleteTemplate(id) { await DB.del('templates', id); },
    async ensureDefaultTemplates() {
      var existing = await Store.listTemplates();
      if (existing.length > 0) return;
      await DB.putAll('templates', TemplateData.DEFAULT_TEMPLATES);
    },

    /* ---- Eventos esporádicos (cifrado transparente de la descripción) ---- */
    async listEvents() {
      var list = (await DB.getAll('events')) || [];
      var out = await Promise.all(list.map(function (r) { return Crypto.decryptRecord('event', r); }));
      return out.sort(function (a, b) {
        return String(a.fecha).localeCompare(String(b.fecha)) ||
          String(a.hora || '').localeCompare(String(b.hora || '')) ||
          String(a.descripcion).localeCompare(String(b.descripcion), 'es');
      });
    },
    /* Eventos tal y como se almacenan (cifrados). Para exportar. */
    listEventsStored: function () { return DB.getAll('events'); },
    async listEventsInRange(fromISO, toISO) {
      var all = await Store.listEvents();
      return all.filter(function (e) { return e.fecha && e.fecha >= fromISO && e.fecha <= toISO; });
    },
    async getEvent(id) {
      var r = await DB.get('events', id);
      return r ? Crypto.decryptRecord('event', r) : undefined;
    },
    async saveEvent(ev) {
      ev.id = ev.id || Store.uid();
      await DB.put('events', await Crypto.encryptRecord('event', ev));
      return ev;
    },
    async deleteEvent(id) { await DB.del('events', id); },

    /* ---- Contactos comunes a todos los perros de un servicio ---- */
    async commonContactsForDogs(dogIds) {
      if (!dogIds || !dogIds.length) return [];
      var dogs = await Store.listDogs({ includeInactive: true });
      var byId = {};
      dogs.forEach(function (d) { byId[d.id] = d; });
      var valid = dogIds.map(function (id) { return byId[id]; }).filter(Boolean);
      if (!valid.length) return [];
      var ids = valid[0].contact_ids || [];
      for (var i = 1; i < valid.length; i++) {
        ids = ids.filter(function (cid) { return (valid[i].contact_ids || []).indexOf(cid) !== -1; });
      }
      var contacts = await Store.listContacts();
      var cmap = {};
      contacts.forEach(function (c) { cmap[c.id] = c; });
      return ids.map(function (id) { return cmap[id]; }).filter(Boolean);
    },

    /* ---- Importar / Exportar / Borrar ---- */
    async exportAll() {
      /* Forma almacenada (cifrada) para no filtrar datos personales en el backup */
      var contacts = await Store.listContactsStored();
      var dogs = await Store.listDogsStored();
      var services = await Store.listServicesStored();
      var templates = await Store.listTemplates();
      var events = await Store.listEventsStored();
      var payload = {
        app: 'cuidador_canino',
        version: 2,
        exportedAt: Calc.todayISO(),
        config: getConfig(),
        data: { contacts: contacts, dogs: dogs, services: services, templates: templates, events: events }
      };
      /* El backup cifrado lleva el salt (público, necesario para derivar la clave al importar)
         pero NUNCA la clave ni el blob de verificación. */
      if (Crypto.configured() && Crypto.salt()) {
        payload.cifrado = { salt: Crypto.salt(), iter: Crypto.ITERATIONS, fv: Crypto.fieldsVersion() };
      }
      return payload;
    },
    async importAll(payload, opts) {
      if (!payload || payload.app !== 'cuidador_canino' || !payload.data || typeof payload.data !== 'object') {
        throw new Error('El archivo no tiene un formato de copia de seguridad de Cuidador Canino.');
      }
      var BACKUP_VERSION = 2;
      if (payload.version && Number(payload.version) > BACKUP_VERSION) {
        throw new Error('Esta copia es de una versión más nueva (v' + payload.version + '). Actualiza la app antes de importarla para no perder datos.');
      }
      opts = opts || {};
      var data = payload.data;
      var usesCipher = !!(payload.cifrado && payload.cifrado.salt);

      /* Aplica descifrado + re-cifrado por tipo de registro (contactos, perros,
         servicios, eventos). Las plantillas no contienen datos personales. */
      var KINDS = [
        { key: 'contacts', kind: 'contact' },
        { key: 'dogs', kind: 'dog' },
        { key: 'services', kind: 'service' },
        { key: 'events', kind: 'event' }
      ];
      var out = { contacts: [], dogs: [], services: [], templates: [], events: [] };
      for (var ki = 0; ki < KINDS.length; ki++) {
        var k = KINDS[ki];
        var inArr = Array.isArray(data[k.key]) ? data[k.key] : [];
        for (var i = 0; i < inArr.length; i++) {
          var raw = inArr[i] || {};
          var plain;
          if (usesCipher) {
            if (!opts.altKey && !Crypto.isUnlocked()) {
              throw new Error('Para importar este archivo cifrado se necesita la contraseña maestra.');
            }
            var fields = Crypto.fieldsFor(k.kind);
            var hadEnc = fields.some(function (f) {
              return typeof raw[f] === 'string' && raw[f].slice(0, 4) === 'enc:';
            });
            plain = await Crypto.decryptRecord(k.kind, raw, opts.altKey || undefined);
            /* decryptRecord tolera fallos: si la contraseña/clave es errónea los campos
               cifrados se quedan como 'enc:' → lo detectamos aquí para no importar basura. */
            if (hadEnc) {
              var stillEnc = fields.some(function (f) {
                return typeof plain[f] === 'string' && plain[f].slice(0, 4) === 'enc:';
              });
              if (stillEnc) {
                throw new Error('Contraseña incorrecta o archivo dañado: no se pudo descifrar un dato.');
              }
            }
          } else {
            plain = raw;
          }
          out[k.key].push(await Crypto.encryptRecord(k.kind, plain)); /* se re-cifra con la clave de la sesión */
        }
      }
      out.templates = Array.isArray(data.templates) ? data.templates : [];

      await DB.loadAll(out);
      await Store.dedupeContacts();
      await Store.cleanOrphanContacts();
      if (payload.config && typeof payload.config === 'object') {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(Object.assign(defaultConfig(), payload.config)));
        _cfgRaw = null; _cfgCache = null; /* invalida el memo de getConfig */
      }
      return { contacts: out.contacts.length, dogs: out.dogs.length, services: out.services.length, templates: out.templates.length, events: out.events.length };
    },
    async clearAllExceptConfig() {
      await Promise.all(['contacts', 'dogs', 'services', 'templates', 'events'].map(function (s) { return DB.clear(s); }));
    },

    /* Migración: re-cifra todos los registros con datos personales que estén guardados
       (contactos, perros, servicios y eventos) con la clave de la sesión. Se usa tras
       establecer la contraseña la primera vez y al ampliar el catálogo de campos cifrados. */
    encryptAll: async function (onProgress) {
      var stores = [
        { store: 'contacts', kind: 'contact' },
        { store: 'dogs', kind: 'dog' },
        { store: 'services', kind: 'service' },
        { store: 'events', kind: 'event' }
      ];
      var total = 0;
      var counts = {};
      for (var si = 0; si < stores.length; si++) {
        var all = (await DB.getAll(stores[si].store)) || [];
        counts[stores[si].store] = all;
        total += all.length;
      }
      var done = 0;
      for (var sj = 0; sj < stores.length; sj++) {
        var s = stores[sj];
        var recs = counts[s.store] || [];
        for (var i = 0; i < recs.length; i++) {
          var plain = await Crypto.decryptRecord(s.kind, recs[i]);
          await DB.put(s.store, await Crypto.encryptRecord(s.kind, plain));
          done++;
          if (onProgress) onProgress(done, total);
        }
      }
      return total;
    },

    /* Cambio de contraseña maestra: verifica la actual, descifra con ella todos los
       datos personales y los re-cifra con la nueva clave (nuevo salt). */
    changeMasterPassword: async function (currentPw, newPw, onProgress) {
      var ok = await Crypto.unlock(currentPw);
      if (!ok) throw new Error('La contraseña actual no es correcta.');
      var stores = [
        { store: 'contacts', kind: 'contact' },
        { store: 'dogs', kind: 'dog' },
        { store: 'services', kind: 'service' },
        { store: 'events', kind: 'event' }
      ];
      var plain = [];
      var all = [];
      var total = 0;
      for (var si = 0; si < stores.length; si++) {
        var recs = (await DB.getAll(stores[si].store)) || [];
        all.push({ store: stores[si].store, kind: stores[si].kind, recs: recs });
        total += recs.length;
        for (var i = 0; i < recs.length; i++) plain.push(await Crypto.decryptRecord(stores[si].kind, recs[i]));
      }
      await Crypto.setup(newPw);
      var done = 0;
      for (var sj = 0; sj < all.length; sj++) {
        var g = all[sj];
        for (var j = 0; j < g.recs.length; j++) {
          await DB.put(g.store, await Crypto.encryptRecord(g.kind, plain[done]));
          done++;
          if (onProgress) onProgress(done, total);
        }
      }
      return total;
    },

    /* ---- Tamaño de la base de datos (bytes del contenido serializado) ---- */
    async dbSize() {
      var payload = await Store.exportAll();
      var json = JSON.stringify(payload);
      if (typeof Blob !== 'undefined') return new Blob([json]).size;
      return json.length;
    },

    /* ---- Guardar perro con su lista de contactos (con diff) ---- */
    async saveDogWithContacts(dog, finalContacts) {
      dog.contact_ids = dog.contact_ids || [];
      var originalIds = dog.contact_ids.slice();
      finalContacts = finalContacts || [];

      var finalIds = [];
      for (var i = 0; i < finalContacts.length; i++) {
        var c = finalContacts[i];
        var saved = await Store.saveContact(c); /* asigna id si es nuevo; reutiliza si coincide */
        if (finalIds.indexOf(saved.id) === -1) finalIds.push(saved.id);
      }

      /* Contactos retirados: desvincular y eliminar si no los usa otro perro */
      var removedIds = originalIds.filter(function (id) { return finalIds.indexOf(id) === -1; });
      if (removedIds.length) {
        var allDogs = await Store.listDogs({ includeInactive: true });
        for (var j = 0; j < removedIds.length; j++) {
          var used = allDogs.some(function (d) {
            return d.id !== dog.id && (d.contact_ids || []).indexOf(removedIds[j]) !== -1;
          });
          if (!used) await Store.deleteContact(removedIds[j]);
        }
      }

      dog.contact_ids = finalIds;
      return Store.saveDog(dog);
    },

    /* ---- Baja de perro (Opción D) ---- */
    async dogHasServices(dogId) {
      var list = await Store.listServicesByDog(dogId);
      return list && list.length > 0;
    },

    /* Elimina contactos que ningún perro referencia (huérfanos por bugs previos) */
    async cleanOrphanContacts() {
      var allDogs = await Store.listDogs({ includeInactive: true });
      var used = {};
      allDogs.forEach(function (d) { (d.contact_ids || []).forEach(function (id) { used[id] = true; }); });
      var contacts = await Store.listContacts();
      var removed = 0;
      for (var i = 0; i < contacts.length; i++) {
        if (!used[contacts[i].id]) {
          await Store.deleteContact(contacts[i].id);
          removed++;
        }
      }
      return removed;
    },

    /* Fusiona contactos que comparten teléfono/whatsapp/telegram normalizado (o, si el humano
       no aporta ningún dato de contacto, el mismo nombre): deja un superviviente por clave y
       reasigna los perros. Devuelve nº de fusionados. */
    async dedupeContacts() {
      var contacts = await Store.listContacts();
      var keysOf = function (c) {
        var keys = [];
        var p = Calc.normalizePhone(c.telefono);
        var w = Calc.normalizePhone(c.whatsapp);
        var t = Calc.normalizeTelegram(c.telegram);
        if (p) keys.push('p:' + p);
        if (w) keys.push('w:' + w);
        if (t) keys.push('t:' + t);
        if (!p && !w && !t) {
          var n = Calc.normalizeName(c.nombre);
          if (n) keys.push('n:' + n);
        }
        return keys;
      };
      // union-find para cierre transitivo: A-x, B-x,y, C-y => {A,B,C} mismo grupo
      var parent = {};
      contacts.forEach(function(c){ parent[c.id]=c.id; });
      function find(x){ while(parent[x]!==x){ parent[x]=parent[parent[x]]; x=parent[x]; } return x; }
      function union(a,b){ var ra=find(a), rb=find(b); if(ra!==rb) parent[rb]=ra; }
      var keyToIds = {};
      contacts.forEach(function(c){
        keysOf(c).forEach(function(k){ (keyToIds[k]=keyToIds[k]||[]).push(c.id); });
      });
      Object.keys(keyToIds).forEach(function(k){
        var ids=keyToIds[k]; for(var i=1;i<ids.length;i++) union(ids[0], ids[i]);
      });
      var groups={};
      contacts.forEach(function(c){ var r=find(c.id); (groups[r]=groups[r]||[]).push(c); });
      var survivor = {};
      var mergeInto = {};
      Object.keys(groups).forEach(function(r){
        var g=groups[r];
        if(g.length===1){ survivor[g[0].id]=g[0]; return; }
        g.sort(function(a,b){ return String(a.id).localeCompare(String(b.id)); });
        var s=g[0]; survivor[s.id]=s;
        for(var i=1;i<g.length;i++) mergeInto[g[i].id]=s.id;
      });

      /* Fusionar campos vacíos del superviviente con cada duplicado */
      var mergedSurvivors = {};
      Object.keys(mergeInto).forEach(function (dupId) {
        var sId = mergeInto[dupId];
        if (!mergedSurvivors[sId]) {
          mergedSurvivors[sId] = Object.assign({}, survivor[sId]);
          survivor[sId] = mergedSurvivors[sId];
        }
        var dup = contacts.filter(function (c) { return c.id === dupId; })[0];
        if (dup) {
          ['nombre', 'telefono', 'telegram', 'whatsapp', 'otros', 'referido_por', 'referido'].forEach(function (f) {
            if (!survivor[sId][f] && dup[f]) survivor[sId][f] = dup[f];
          });
        }
      });

      /* Reasignar perros y guardar supervivientes */
      if (Object.keys(mergeInto).length) {
        var allDogs = await Store.listDogs({ includeInactive: true });
        for (var j = 0; j < allDogs.length; j++) {
          var d = allDogs[j];
          var ids = (d.contact_ids || []).slice();
          var changed = false;
          for (var m = 0; m < ids.length; m++) {
            if (mergeInto[ids[m]]) { ids[m] = mergeInto[ids[m]]; changed = true; }
          }
          if (changed) {
            d.contact_ids = ids;
            await Store.saveDog(d);
          }
        }
        for (var sId in mergedSurvivors) {
          await Store._putContact(mergedSurvivors[sId]);
        }
        for (var dupId in mergeInto) {
          await Store.deleteContact(dupId);
        }
      }
      return Object.keys(mergeInto).length;
    },
    /* Borrado físico en cascada: elimina perro y todos sus servicios.
       Usa Store.deleteService/deleteDogPhysical (no DB.del directo) para que
       Sync.hookStore encole los borrados y se propaguen a la nube. */
    async cascadeDeleteDog(dogId) {
      var services = (await Store.listServicesByDog(dogId)) || [];
      for (var i = 0; i < services.length; i++) {
        await Store.deleteService(services[i].id);
      }
      await Store.deleteDogPhysical(dogId);
    },

    /* Elimina los contactos de un perro que no use ningún otro perro */
    async deleteDogContactsIfUnused(dog) {
      var ids = (dog && dog.contact_ids) || [];
      if (!ids.length) return;
      var allDogs = await Store.listDogs({ includeInactive: true });
      for (var i = 0; i < ids.length; i++) {
        var used = allDogs.some(function (d) {
          return d.id !== dog.id && (d.contact_ids || []).indexOf(ids[i]) !== -1;
        });
        if (!used) await Store.deleteContact(ids[i]);
      }
    }
  };

  root.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
