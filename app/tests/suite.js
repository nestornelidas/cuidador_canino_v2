/* Suite adversarial de Cuidador Canino (compartida: navegador real / jsdom).
   Se define window.__runSuite() -> Promise<{fails:number, lines:string[]}> */
(function (root) {
  'use strict';

  root.__runSuite = async function () {
    var C = root.Calc, Store = root.Store, DB = root.DB, UI = root.UI, Views = root.Views, Crypto = root.Crypto;

    var lines = [];
    var fails = 0;
    function log(s) { lines.push(s); }
    function ok(name, cond, extra) {
      log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined && !cond ? '  :: ' + extra : ''));
      if (!cond) fails++;
    }
    function eq(a, b) { return Math.abs(a - b) < 1e-6; }

    /* Comprueba si el texto contiene un importe con valor numérico `val`
       (independiente de agrupación de miles del locale: "1.101,00" o "1101,00"). */
    function hasMoney(text, val) {
      var tokens = String(text).match(/\d[\d\s.,]*/g) || [];
      for (var i = 0; i < tokens.length; i++) {
        var n = parseFloat(tokens[i].replace(/[\s.]/g, '').replace(',', '.'));
        if (!isNaN(n) && Math.abs(n - val) < 0.005) return true;
      }
      return false;
    }

    var ctx = { go: function () {}, refresh: function () {} };

    function clearStores() {
      return Promise.all(['contacts', 'dogs', 'services', 'templates'].map(function (s) { return DB.clear(s); }));
    }

    async function seedPlanner() {
      var c1 = await Store.saveContact({ nombre: 'Ana Martínez', telefono: '600111222', telegram: '@anamtz', whatsapp: '', otros: '', referido: 'Wallapop' });
      var c2 = await Store.saveContact({ nombre: 'Carlos Gómez', telefono: '600333444', telegram: '', whatsapp: '+34 600 333 444', otros: '', referido: 'Boca a boca', referido_por: 'Laura' });
      var c3 = await Store.saveContact({ nombre: 'Lucía Fernández', telefono: '600555666', telegram: '@luciaf', whatsapp: '', otros: '', referido: 'Holidog' });
      var c4 = await Store.saveContact({ nombre: 'Pedro Sánchez', telefono: '600777888', telegram: '', whatsapp: '', otros: 'veterinario', referido: 'Captación directa' });
      var c5 = await Store.saveContact({ nombre: 'María López', telefono: '600999000', telegram: '', whatsapp: '+34 600 999 000', otros: '', referido: 'TopAyuda' });

      var d1 = await Store.saveDogWithContacts({ nombre: 'Loki', raza: 'Beagle', tamano: 'mediano', sexo: 'macho', castrado: true, fecha_nacimiento: '2021-03-15' }, [c1]);
      var d2 = await Store.saveDogWithContacts({ nombre: 'Nala', raza: 'Golden Retriever', tamano: 'grande', sexo: 'hembra', castrado: true, fecha_nacimiento: '2019-07-22' }, [c2]);
      var d3 = await Store.saveDogWithContacts({ nombre: 'Toby', raza: 'Yorkshire Terrier', tamano: 'pequeño', sexo: 'macho', castrado: false, fecha_nacimiento: '2022-11-05' }, [c3]);
      var d4 = await Store.saveDogWithContacts({ nombre: 'Kira', raza: 'Pastor Alemán', tamano: 'grande', sexo: 'hembra', castrado: true, fecha_nacimiento: '2020-01-10' }, [c4, c1, c5]);
      var d5 = await Store.saveDogWithContacts({ nombre: 'Bruno', raza: 'Gran Danés', tamano: 'gigante', sexo: 'macho', castrado: true, fecha_nacimiento: '2018-04-02' }, [c2, c5]);

      async function svc(spec) {
        var s = Object.assign({
          coste_total_manual: false, min_desplazamiento: 0, min_paseo: 0,
          paga_senal: 0, plus: 0, estado: 'pendiente', notas: ''
        }, spec);
        s.coste_total = C.calcServiceTotal(s);
        return Store.saveService(s);
      }

      var S = {};
      S.s1 = await svc({ tipo: 'hospedaje', desde: '2026-12-01', hasta: '2026-12-04', dog_ids: [d1.id], coste_base: 20, paga_senal: 20 });
      S.s2 = await svc({ tipo: 'hospedaje', desde: '2026-12-01', hasta: '2026-12-07', dog_ids: [d2.id, d3.id], coste_base: 20 });
      S.s3 = await svc({ tipo: 'paseo', desde: '2026-12-01', hasta: '2026-12-05', dog_ids: [d1.id], coste_base: 12, min_desplazamiento: 30, min_paseo: 120, paga_senal: 10 });
      S.s4 = await svc({ tipo: 'hospedaje', desde: '2026-12-08', hasta: '2026-12-22', dog_ids: [d4.id], coste_base: 20, paga_senal: 60 });
      S.s5 = await svc({ tipo: 'paseo', desde: '2026-12-10', hasta: '2026-12-11', dog_ids: [d2.id], coste_base: 12, min_desplazamiento: 20, min_paseo: 90 });
      S.s6 = await svc({ tipo: 'hospedaje', desde: '2026-12-23', hasta: '2026-12-29', dog_ids: [d5.id], coste_base: 20, paga_senal: 20 });
      S.s7 = await svc({ tipo: 'paseo', desde: '2026-12-26', hasta: '2026-12-26', dog_ids: [d3.id, d4.id], coste_base: 12, min_desplazamiento: 25, min_paseo: 60 });
      S.s8 = await svc({ tipo: 'hospedaje', desde: '2026-12-30', hasta: '2027-01-03', dog_ids: [d1.id, d5.id], coste_base: 20 });
      S.s9 = await svc({ tipo: 'paseo', desde: '2026-12-02', hasta: '2026-12-03', dog_ids: [d4.id], coste_base: 12, min_desplazamiento: 15, min_paseo: 45 });
      S.s10 = await svc({ tipo: 'hospedaje', desde: '2026-12-15', hasta: '2026-12-15', dog_ids: [d3.id], coste_base: 20 });
      S.s11 = await svc({ tipo: 'hospedaje', desde: '2026-12-05', hasta: '2026-12-06', dog_ids: [d2.id], coste_base: 20, estado: 'cancelado' });

      await Store.saveEvent({ fecha: '2026-12-07', todo_dia: true, hora: null, descripcion: 'Primera visita para conocer a Bruno' });
      await Store.saveEvent({ fecha: '2026-12-14', todo_dia: false, hora: '10:30', descripcion: 'Recogida de llaves de Nala' });

      return { c: { c1: c1, c2: c2, c3: c3, c4: c4, c5: c5 }, d: { d1: d1, d2: d2, d3: d3, d4: d4, d5: d5 }, S: S };
    }

    try {
      await DB.open();
      await clearStores();
      /* Cifrado: arranque con clave maestra determinista para la suite */
      Crypto.resetForTest();
      ok('crypto: sin clave configurada tras reset', Crypto.configured() === false);
      await Crypto.setup('SuiteMaestra1');
      ok('crypto: clave configurada y desbloqueada', Crypto.configured() === true && Crypto.isUnlocked() === true);
      ok('crypto: salt presente en sesión', typeof Crypto.salt() === 'string' && Crypto.salt().length > 0);
      await Store.ensureDefaultTemplates();

      log('== Fase 1: planificador diciembre 2026 ==');
      var seed = await seedPlanner();

      var contacts = await Store.listContacts();
      var dogs = await Store.listDogs({ includeInactive: true });
      var services = await Store.listServices();
      var templates = await Store.listTemplates();
      ok('plantillas precargadas (5)', templates.length === 5, templates.length);
      ok('5 contactos', contacts.length === 5, contacts.length);
      ok('5 perros', dogs.length === 5, dogs.length);
      ok('11 servicios', services.length === 11, services.length);

      ok('coste S1 = 80', eq(seed.S.s1.coste_total, 80));
      ok('coste S2 (2 perros) = 280', eq(seed.S.s2.coste_total, 280));
      ok('coste S4 (15 días) = 300', eq(seed.S.s4.coste_total, 300));
      ok('coste S7 (2 perros, 1 día) = 17', eq(seed.S.s7.coste_total, 17));
      ok('coste S8 (cruza año) = 200', eq(seed.S.s8.coste_total, 200));
      ok('coste S11 cancelado = 40', eq(seed.S.s11.coste_total, 40));

      log('== Fase 2: auditor de datos ==');
      var dogIds = {}; dogs.forEach(function (d) { dogIds[d.id] = true; });
      var contactIds = {}; contacts.forEach(function (c) { contactIds[c.id] = true; });
      var orphanSvcs = 0, badTotals = 0, badPend = 0, orphanContacts = 0;
      services.forEach(function (s) {
        (s.dog_ids || []).forEach(function (id) { if (!dogIds[id]) { orphanSvcs++; log('  ORFANO servicio ' + s.id + ' -> perro ' + id); } });
        if (!eq(C.num(s.coste_total), C.calcServiceTotal(s))) { badTotals++; log('  TOTAL mal en ' + s.id); }
        if (!eq(C.calcPendiente(s.coste_total, s.plus, s.paga_senal), C.num(s.coste_total) + C.num(s.plus) - C.num(s.paga_senal))) badPend++;
      });
      dogs.forEach(function (d) {
        (d.contact_ids || []).forEach(function (id) { if (!contactIds[id]) { orphanContacts++; log('  ORFANO perro ' + d.nombre + ' -> contacto ' + id); } });
      });
      ok('sin servicios huérfanos', orphanSvcs === 0, orphanSvcs);
      ok('sin contactos huérfanos', orphanContacts === 0, orphanContacts);
      ok('todos los totales cuadran', badTotals === 0, badTotals);
      ok('pendientes cuadran', badPend === 0, badPend);

      var redito = 0;
      services.forEach(function (s) {
        if (s.estado !== 'cancelado' && s.desde.slice(0, 4) === '2026') redito += C.num(s.coste_total);
      });
      ok('redito 2026 = 1101', eq(redito, 1101), redito);

      function dogAcum(id) {
        var acum = 0;
        services.forEach(function (s) {
          if (s.estado === 'cancelado' || !(s.dog_ids || []).includes(id)) return;
          acum += C.num(s.coste_total) / Math.max(1, (s.dog_ids || []).length);
        });
        return C.round2(acum);
      }
      ok('Loki acumulado = 210', eq(dogAcum(seed.d.d1.id), 210), dogAcum(seed.d.d1.id));
      ok('Nala acumulado = 162', eq(dogAcum(seed.d.d2.id), 162), dogAcum(seed.d.d2.id));
      ok('Toby acumulado = 168.5', eq(dogAcum(seed.d.d3.id), 168.5), dogAcum(seed.d.d3.id));
      ok('Kira acumulado = 320.5', eq(dogAcum(seed.d.d4.id), 320.5), dogAcum(seed.d.d4.id));
      ok('Bruno acumulado = 240', eq(dogAcum(seed.d.d5.id), 240), dogAcum(seed.d.d5.id));

      var common = await Store.commonContactsForDogs([seed.d.d4.id, seed.d.d5.id]);
      ok('contactos comunes Kira+Bruno = [María]', common.length === 1 && common[0].nombre === 'María López', JSON.stringify(common.map(function (c) { return c.nombre; })));
      var none = await Store.commonContactsForDogs([seed.d.d1.id, seed.d.d2.id]);
      ok('contactos comunes Loki+Nala = []', none.length === 0, none.length);

      var y2026 = await Store.listServicesByYear(2026);
      ok('listServicesByYear(2026) = 11', y2026.length === 11, y2026.length);
      ok('listServicesByYear(2027) = 0', (await Store.listServicesByYear(2027)).length === 0);
      var rDec = await Store.listServicesInRange('2026-12-01', '2026-12-31');
      ok('listServicesInRange diciembre = 11', rDec.length === 11, rDec.length);
      var byDog = await Store.listServicesByDog(seed.d.d1.id);
      ok('listServicesByDog(Loki) = 3 (S1,S3,S8)', byDog.length === 3, byDog.length);
      ok('dogHasServices(Loki) = true', (await Store.dogHasServices(seed.d.d1.id)) === true);

      log('== Fase 3: persistencia (cierre y reapertura) ==');
      await DB.close();
      await DB.open();
      ok('tras reabrir: 11 servicios', (await Store.listServices()).length === 11);
      ok('tras reabrir: 5 perros', (await Store.listDogs({ includeInactive: true })).length === 5);
      ok('tras reabrir: dato intacto', (await Store.getService(seed.S.s4.id)).coste_total === 300);

      log('== Fase 4: borrado en cascada, lógico, contactos, baja sin servicios ==');
      var c6 = await Store.saveContact({ nombre: 'Contacto Temp', telefono: '1' });
      var d6 = await Store.saveDog({ nombre: 'TempDog', fecha_nacimiento: '2020-01-01', contact_ids: [c6.id], activo: true });
      var s12 = await Store.saveService({
        id: Store.uid(), tipo: 'paseo', desde: '2026-12-20', hasta: '2026-12-21', dog_ids: [d6.id],
        coste_base: 12, coste_total: 22, coste_total_manual: false, min_desplazamiento: 10, min_paseo: 100,
        paga_senal: 0, plus: 0, estado: 'pendiente', notas: ''
      });
      ok('dogHasServices(TempDog) = true', (await Store.dogHasServices(d6.id)) === true);
      await Store.cascadeDeleteDog(d6.id);
      await Store.deleteDogContactsIfUnused({ id: d6.id, contact_ids: [c6.id] });
      ok('cascada: perro eliminado', (await Store.getDog(d6.id)) === undefined);
      ok('cascada: servicio eliminado', (await Store.getService(s12.id)) === undefined);
      ok('cascada: contacto huérfano eliminado', (await Store.getContact(c6.id)) === undefined);
      ok('cascada: total servicios = 11', (await Store.listServices()).length === 11);

      var d3 = seed.d.d3;
      await Store.saveDog(Object.assign({}, d3, { activo: false }));
      ok('lógico: excluido de listados', (await Store.listDogs({ includeInactive: false })).some(function (d) { return d.id === d3.id; }) === false);
      ok('lógico: permanece en BBDD', (await Store.listDogs({ includeInactive: true })).some(function (d) { return d.id === d3.id; }) === true);
      await Store.saveDog(Object.assign({}, d3, { activo: true }));

      var c7 = await Store.saveContact({ nombre: 'Contacto SinUso', telefono: '2' });
      var d7 = await Store.saveDog({ nombre: 'SinServicios', fecha_nacimiento: '2019-01-01', contact_ids: [c7.id], activo: true });
      ok('dogHasServices(SinServicios) = false', (await Store.dogHasServices(d7.id)) === false);
      await Store.deleteDogContactsIfUnused(d7);
      await Store.deleteDogPhysical(d7.id);
      ok('física: perro eliminado', (await Store.getDog(d7.id)) === undefined);
      ok('física: contacto sin uso eliminado', (await Store.getContact(c7.id)) === undefined);

      var loki = await Store.getDog(seed.d.d1.id);
      await Store.saveDogWithContacts(loki, [seed.c.c1, seed.c.c2]);
      ok('diff: Loki ahora tiene 2 contactos', (await Store.getDog(loki.id)).contact_ids.length === 2);
      await Store.saveDogWithContacts(loki, [seed.c.c1]);
      ok('diff: c2 no se borra (lo usa Nala)', (await Store.getContact(seed.c.c2.id)) !== undefined);
      var c8 = await Store.saveContact({ nombre: 'Contacto Suelto', telefono: '3' });
      var loki2 = await Store.getDog(loki.id);
      await Store.saveDogWithContacts(loki2, [seed.c.c1, c8]);
      await Store.saveDogWithContacts(loki2, [seed.c.c1]);
      ok('diff: contacto suelto eliminado al retirarlo', (await Store.getContact(c8.id)) === undefined);

      var cOrphan = await Store.saveContact({ nombre: 'Contacto Huérfano', telefono: '4' });
      ok('cleanOrphanContacts: crea contacto huérfano', (await Store.getContact(cOrphan.id)) !== undefined);
      var nBeforeClean = (await Store.listContacts()).length;
      var removedClean = await Store.cleanOrphanContacts();
      ok('cleanOrphanContacts: elimina solo huérfanos', removedClean >= 1 && (await Store.getContact(cOrphan.id)) === undefined, removedClean);
      ok('cleanOrphanContacts: conserva los usados', (await Store.getContact(seed.c.c1.id)) !== undefined && (await Store.getContact(seed.c.c2.id)) !== undefined && (await Store.getContact(seed.c.c3.id)) !== undefined);

      log('== Fase 5: exportación / importación ==');
      var payload = await Store.exportAll();
      var json = JSON.stringify(payload);
      await clearStores();
      ok('tras vaciar: 0 perros', (await Store.listDogs({ includeInactive: true })).length === 0);
      var counts = await Store.importAll(JSON.parse(json));
      ok('import: 5 perros', counts.dogs === 5, counts.dogs);
      ok('import: 11 servicios', counts.services === 11, counts.services);
      ok('import: 5 contactos', counts.contacts === 5, counts.contacts);
      ok('import: config conservada', Store.getConfig().costeHospedaje === 20);
      var importErr = false;
      try { await Store.importAll({ app: 'otra', data: {} }); } catch (e) { importErr = true; }
      ok('import rechaza formato no válido', importErr === true);

      log('== Fase 6: tester destructivo (UI de servicios) ==');
      var host = document.createElement('div');
      document.body.appendChild(host);

      await Views.servicios.render(host, ['nuevo'], ctx);
      var form = host.querySelector('#svcForm');
      var before = (await Store.listServices()).length;
      var inp = function (n) { return form.querySelector('[name="' + n + '"]'); };
      inp('desde').value = '2026-12-10'; inp('desde').dispatchEvent(new Event('input', { bubbles: true }));
      inp('hasta').value = '2026-12-01'; inp('hasta').dispatchEvent(new Event('input', { bubbles: true }));
      inp('coste_base').value = '20'; inp('coste_base').dispatchEvent(new Event('input', { bubbles: true }));
      var d1box = host.querySelector('#dogCheckboxList input[value="' + seed.d.d1.id + '"]');
      d1box.checked = true; d1box.dispatchEvent(new Event('change', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      ok('fecha inicio>fin: errores mostrados', host.querySelector('.form-errors').hidden === false);
      ok('fecha inicio>fin: no se crea servicio', (await Store.listServices()).length === before);

      await Views.servicios.render(host, ['nuevo'], ctx);
      form = host.querySelector('#svcForm');
      inp('coste_base').value = '-5'; inp('coste_base').dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      ok('coste base negativo: error', host.querySelector('.form-errors').hidden === false);

      await Views.servicios.render(host, ['nuevo'], ctx);
      form = host.querySelector('#svcForm');
      inp('tipo').value = 'paseo'; inp('tipo').dispatchEvent(new Event('change', { bubbles: true }));
      inp('desde').value = '2026-12-01'; inp('desde').dispatchEvent(new Event('input', { bubbles: true }));
      inp('hasta').value = '2026-12-02'; inp('hasta').dispatchEvent(new Event('input', { bubbles: true }));
      inp('coste_base').value = '12'; inp('coste_base').dispatchEvent(new Event('input', { bubbles: true }));
      var paseoRow = host.querySelector('#paseoTbody .paseo-row');
      ok('paseo: recuadro con una fila por defecto', paseoRow !== null);
      var pf = function (k) { return paseoRow.querySelector('[data-pf="' + k + '"]'); };
      pf('tiempo_desplazamiento').value = '0'; pf('tiempo_desplazamiento').dispatchEvent(new Event('input', { bubbles: true }));
      pf('tiempo_paseo').value = '0'; pf('tiempo_paseo').dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      ok('paseo sin minutos: error', host.querySelector('.form-errors').hidden === false);

      log('== Fase 7: recálculo automático (Opción B) ==');
      await Views.servicios.render(host, ['nuevo'], ctx);
      form = host.querySelector('#svcForm');
      inp('desde').value = '2026-12-01'; inp('desde').dispatchEvent(new Event('input', { bubbles: true }));
      inp('hasta').value = '2026-12-04'; inp('hasta').dispatchEvent(new Event('input', { bubbles: true }));
      inp('coste_base').value = '20'; inp('coste_base').dispatchEvent(new Event('input', { bubbles: true }));
      d1box = host.querySelector('#dogCheckboxList input[value="' + seed.d.d1.id + '"]');
      d1box.checked = true; d1box.dispatchEvent(new Event('change', { bubbles: true }));
      ok('auto: 4 días × 20 × 1 = 80', C.num(inp('coste_total').value) === 80, inp('coste_total').value);
      inp('coste_total').value = '999'; inp('coste_total').dispatchEvent(new Event('input', { bubbles: true }));
      ok('manual: 999 mantenido', C.num(inp('coste_total').value) === 999);
      inp('plus').value = '10'; inp('plus').dispatchEvent(new Event('input', { bubbles: true }));
      inp('paga_senal').value = '30'; inp('paga_senal').dispatchEvent(new Event('input', { bubbles: true }));
      ok('total = subtotal+plus = 999+10 = 1.009', host.querySelector('#totalVal').textContent.indexOf('1.009') !== -1 || host.querySelector('#totalVal').textContent.indexOf('1009') !== -1, host.querySelector('#totalVal').textContent);
      ok('pendiente = 999+10-30 = 979', host.querySelector('#pendienteVal').textContent.indexOf('979') !== -1, host.querySelector('#pendienteVal').textContent);
      inp('estado').value = 'finalizado'; inp('estado').dispatchEvent(new Event('change', { bubbles: true }));
      ok('pendiente = 0 si estado finalizado', host.querySelector('#pendienteVal').textContent.indexOf('0,00') !== -1, host.querySelector('#pendienteVal').textContent);
      inp('estado').value = 'pendiente'; inp('estado').dispatchEvent(new Event('change', { bubbles: true }));
      inp('hasta').value = '2026-12-05'; inp('hasta').dispatchEvent(new Event('input', { bubbles: true }));
      ok('al cambiar fecha: vuelve a auto = 100', C.num(inp('coste_total').value) === 100, inp('coste_total').value);
      ok('señal prevista 5d = 20', host.querySelector('#senalHint').textContent.indexOf('20') !== -1, host.querySelector('#senalHint').textContent);
      inp('tipo').value = 'paseo'; inp('tipo').dispatchEvent(new Event('change', { bubbles: true }));
      ok('coste base paseo: toma el predeterminado (12) al cambiar el tipo', C.num(inp('coste_base').value) === 12, inp('coste_base').value);
      inp('coste_base').value = '15'; inp('coste_base').dispatchEvent(new Event('input', { bubbles: true }));
      inp('tipo').value = 'hospedaje'; inp('tipo').dispatchEvent(new Event('change', { bubbles: true }));
      inp('tipo').value = 'paseo'; inp('tipo').dispatchEvent(new Event('change', { bubbles: true }));
      ok('coste base manual: no se pisa al volver a cambiar el tipo', C.num(inp('coste_base').value) === 15, inp('coste_base').value);
      inp('tipo').value = 'hospedaje'; inp('tipo').dispatchEvent(new Event('change', { bubbles: true }));
      inp('tipo').value = 'paseo'; inp('tipo').dispatchEvent(new Event('change', { bubbles: true }));
      var paseoRow2 = host.querySelector('#paseoTbody .paseo-row');
      var pf2 = function (k) { return paseoRow2.querySelector('[data-pf="' + k + '"]'); };
      pf2('tiempo_desplazamiento').value = '30'; pf2('tiempo_desplazamiento').dispatchEvent(new Event('input', { bubbles: true }));
      pf2('tiempo_paseo').value = '120'; pf2('tiempo_paseo').dispatchEvent(new Event('input', { bubbles: true }));
      pf2('numero_paseos').value = '1'; pf2('numero_paseos').dispatchEvent(new Event('input', { bubbles: true }));
      inp('coste_base').value = '12'; inp('coste_base').dispatchEvent(new Event('input', { bubbles: true }));
      ok('paseo auto = (30+120)/60*12 = 30', C.num(inp('coste_total').value) === 30, inp('coste_total').value);
      ok('paseo: coste desplazamiento = 30/60*12 = 6', hasMoney(paseoRow2.querySelector('[data-pfcalc="coste_desplazamiento"]').textContent, 6), paseoRow2.querySelector('[data-pfcalc="coste_desplazamiento"]').textContent);
      ok('paseo: coste paseo = 120/60*12 = 24', hasMoney(paseoRow2.querySelector('[data-pfcalc="coste_paseo"]').textContent, 24), paseoRow2.querySelector('[data-pfcalc="coste_paseo"]').textContent);
      ok('paseo: subtotal = 6+24 = 30', hasMoney(paseoRow2.querySelector('[data-pfcalc="subtotal"]').textContent, 30), paseoRow2.querySelector('[data-pfcalc="subtotal"]').textContent);
      ok('paseo: nº paseos 2 → total = 60', (function () {
        pf2('numero_paseos').value = '2'; pf2('numero_paseos').dispatchEvent(new Event('input', { bubbles: true }));
        return hasMoney(paseoRow2.querySelector('[data-pfcalc="total_paseo"]').textContent, 60) && C.num(inp('coste_total').value) === 60;
      })(), inp('coste_total').value);
      ok('paseo: total = subtotal + plus', (function () {
        inp('plus').value = '10'; inp('plus').dispatchEvent(new Event('input', { bubbles: true }));
        return host.querySelector('#totalVal').textContent.indexOf('70') !== -1;
      })(), host.querySelector('#totalVal').textContent);

      log('== Fase 7a: persistencia de paseos (guardar y editar) ==');
      await Views.servicios.render(host, ['nuevo'], ctx);
      form = host.querySelector('#svcForm');
      inp('tipo').value = 'paseo'; inp('tipo').dispatchEvent(new Event('change', { bubbles: true }));
      inp('desde').value = '2026-12-12'; inp('desde').dispatchEvent(new Event('input', { bubbles: true }));
      inp('hasta').value = '2026-12-12'; inp('hasta').dispatchEvent(new Event('input', { bubbles: true }));
      d1box = host.querySelector('#dogCheckboxList input[value="' + seed.d.d1.id + '"]');
      d1box.checked = true; d1box.dispatchEvent(new Event('change', { bubbles: true }));
      inp('coste_base').value = '12'; inp('coste_base').dispatchEvent(new Event('input', { bubbles: true }));
      var addBtn = host.querySelector('#addPaseoRow');
      addBtn.click();
      var rowsP = host.querySelectorAll('#paseoTbody .paseo-row');
      var fRow = function (idx, k) { return rowsP[idx].querySelector('[data-pf="' + k + '"]'); };
      fRow(0, 'tiempo_desplazamiento').value = '20'; fRow(0, 'tiempo_desplazamiento').dispatchEvent(new Event('input', { bubbles: true }));
      fRow(0, 'tiempo_paseo').value = '40'; fRow(0, 'tiempo_paseo').dispatchEvent(new Event('input', { bubbles: true }));
      fRow(0, 'numero_paseos').value = '3'; fRow(0, 'numero_paseos').dispatchEvent(new Event('input', { bubbles: true }));
      fRow(1, 'tiempo_desplazamiento').value = '10'; fRow(1, 'tiempo_desplazamiento').dispatchEvent(new Event('input', { bubbles: true }));
      fRow(1, 'tiempo_paseo').value = '30'; fRow(1, 'tiempo_paseo').dispatchEvent(new Event('input', { bubbles: true }));
      fRow(1, 'numero_paseos').value = '2'; fRow(1, 'numero_paseos').dispatchEvent(new Event('input', { bubbles: true }));
      inp('plus').value = '5'; inp('plus').dispatchEvent(new Event('input', { bubbles: true }));
      /* subtotal = (20/60*12 + 40/60*12)*3 + (10/60*12 + 30/60*12)*2 = (4+8)*3 + (2+6)*2 = 36 + 16 = 52 */
      ok('paseo guardar: subtotal = 52', C.num(inp('coste_total').value) === 52, inp('coste_total').value);
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      await new Promise(function (r) { setTimeout(r, 250); });
      var savedPaseo = (await Store.listServices()).filter(function (s) { return s.tipo === 'paseo' && s.desde === '2026-12-12'; })[0];
      ok('paseo guardar: servicio creado con 2 paseos', savedPaseo !== undefined && savedPaseo.paseos && savedPaseo.paseos.length === 2, savedPaseo ? JSON.stringify(savedPaseo.paseos) : 'sin servicio');
      ok('paseo guardar: coste_total guardado = 52', savedPaseo !== undefined && savedPaseo.coste_total === 52, savedPaseo ? savedPaseo.coste_total : '');
      ok('paseo guardar: total = 52 + plus 5 = 57', savedPaseo !== undefined && C.calcTotalSvc(savedPaseo) === 57, savedPaseo ? C.calcTotalSvc(savedPaseo) : '');
      ok('paseo guardar: la fila 1 conserva nº de paseos = 3', savedPaseo !== undefined && savedPaseo.paseos[0].numero_paseos === 3, savedPaseo ? JSON.stringify(savedPaseo.paseos[0]) : '');
      await Views.servicios.render(host, ['edit', savedPaseo.id], ctx);
      await new Promise(function (r) { setTimeout(r, 80); });
      form = host.querySelector('#svcForm');
      var editRows = host.querySelectorAll('#paseoTbody .paseo-row');
      ok('paseo editar: carga las 2 filas', editRows.length === 2, editRows.length);
      var eRow = function (idx, k) { return editRows[idx].querySelector('[data-pf="' + k + '"]'); };
      ok('paseo editar: valores de la fila 1', eRow(0, 'tiempo_desplazamiento').value === '20' && eRow(0, 'tiempo_paseo').value === '40' && eRow(0, 'numero_paseos').value === '3', eRow(0, 'tiempo_desplazamiento').value + ',' + eRow(0, 'tiempo_paseo').value + ',' + eRow(0, 'numero_paseos').value);
      ok('paseo editar: subtotal recalculado al cargar', C.num(form.querySelector('[name="coste_total"]').value) === 52, form.querySelector('[name="coste_total"]').value);
      await Store.deleteService(savedPaseo.id);

      log('== Fase 7a2: alertas de medicación de los perros ==');
      /* Perros con plan de medicación: activo (expira en el futuro), vencido (fecha pasada) y sin fecha.
         Los planes viven en la ficha del perro; en el servicio solo se muestran las alertas. */
      var medActivo = await Store.saveDogWithContacts({ nombre: 'Medi Activo', raza: 'Cocker', tamano: 'pequeño', sexo: 'macho', castrado: false, activo: true, notas_medicacion: 'Amoxicilina 1 comprimido cada 12 horas. No mezclar con lácteos.', medicacion_expira: C.addDaysISO(C.todayISO(), 60) }, [seed.c.c1]);
      var medVencido = await Store.saveDogWithContacts({ nombre: 'Medi Vencido', raza: 'Mestizo', tamano: 'mediano', sexo: 'hembra', castrado: false, activo: true, notas_medicacion: 'Ivermectina 2 gotas una vez al día en la cruz.', medicacion_expira: C.addDaysISO(C.todayISO(), -5) }, [seed.c.c1]);
      var medSinFecha = await Store.saveDogWithContacts({ nombre: 'Medi SinFecha', raza: 'Bobtail', tamano: 'grande', sexo: 'hembra', castrado: false, activo: true, notas_medicacion: 'Prednisona 1/2 pastilla por la mañana.' }, [seed.c.c1]);

      await Views.servicios.render(host, ['nuevo'], ctx);
      form = host.querySelector('#svcForm');
      var alertasBox = host.querySelector('#alertasBox');
      ok('alertas: recuadro presente en el formulario', alertasBox !== null && alertasBox.querySelector('#alertasList') !== null);
      ok('alertas: la medicación ya no se pide en el servicio (vive en el perro)', form.querySelector('[name="medicacion"]') === null && form.querySelector('[name="dosis"]') === null && form.querySelector('[name="frecuencia"]') === null && form.querySelector('[name="notas_medicacion"]') === null);
      ok('alertas: sin perros seleccionados muestra mensaje', host.querySelector('#alertasList').textContent.indexOf('Sin planes de medicación activos') !== -1, host.querySelector('#alertasList').textContent);
      var calcBox7a2 = host.querySelector('#calcBox');
      ok('importe: recuadro de cálculo presente (coste, total, estado)', calcBox7a2 !== null && calcBox7a2.querySelector('[name="coste_base"]') !== null && calcBox7a2.querySelector('[name="coste_total"]') !== null && calcBox7a2.querySelector('[name="estado"]') !== null && calcBox7a2.querySelector('#totalVal') !== null);
      ok('importe: el recuadro de cálculo queda por encima del de alertas', (calcBox7a2.compareDocumentPosition(alertasBox) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
      ok('importe: el subtotal se retira en paseos', (function () {
        inp('tipo').value = 'paseo'; inp('tipo').dispatchEvent(new Event('change', { bubbles: true }));
        var hidden = form.querySelector('#fieldSubtotal').style.display === 'none';
        inp('tipo').value = 'hospedaje'; inp('tipo').dispatchEvent(new Event('change', { bubbles: true }));
        return hidden;
      })());
      var commsBox7a2 = host.querySelector('#commsBox');
      ok('comms: recuadro propio como los anteriores', commsBox7a2 !== null && commsBox7a2.tagName === 'FIELDSET' && commsBox7a2.querySelector('#btnComms') !== null);
      ok('comms: botón "Generar"', host.querySelector('#btnComms').textContent.indexOf('Generar') !== -1, host.querySelector('#btnComms').textContent);
      ok('comms: alarmas y comunicaciones en paralelo (misma fila)', host.querySelector('#alarmaBox').parentElement === commsBox7a2.parentElement && commsBox7a2.parentElement.classList.contains('form-grid-2'));

      /* perro sin plan no genera alerta */
      d1box = host.querySelector('#dogCheckboxList input[value="' + seed.d.d1.id + '"]');
      d1box.checked = true; d1box.dispatchEvent(new Event('change', { bubbles: true }));
      ok('alertas: un perro sin plan de medicación no genera alerta', host.querySelector('#alertasList').querySelectorAll('.alerta-item').length === 0);
      d1box.checked = false; d1box.dispatchEvent(new Event('change', { bubbles: true }));

      /* perro con plan activo */
      var chkAct = host.querySelector('#dogCheckboxList input[value="' + medActivo.id + '"]');
      chkAct.checked = true; chkAct.dispatchEvent(new Event('change', { bubbles: true }));
      var alAct = host.querySelector('#alertasList');
      ok('alertas: muestra el nombre del perro con plan activo', alAct.textContent.indexOf('Medi Activo') !== -1, alAct.textContent);
      ok('alertas: el plan completo aparece en un mismo bloque', alAct.textContent.indexOf('Amoxicilina') !== -1 && alAct.textContent.indexOf('No mezclar con lácteos') !== -1, alAct.textContent);
      ok('alertas: rótulos resaltados', alAct.innerHTML.indexOf('<strong>Notas:</strong>') !== -1 && alAct.innerHTML.indexOf('<strong>Expira el:</strong>') !== -1, alAct.innerHTML);
      ok('alertas: el nombre del perro enlaza a su edición', host.querySelector('#alertasList a[href="#/perros/edit/' + medActivo.id + '"]') !== null);
      ok('alertas: un solo perro con plan = un único bloque', host.querySelectorAll('#alertasList .alerta-item').length === 1);

      /* plan vencido no aparece */
      var chkVen = host.querySelector('#dogCheckboxList input[value="' + medVencido.id + '"]');
      chkVen.checked = true; chkVen.dispatchEvent(new Event('change', { bubbles: true }));
      ok('alertas: el plan vencido no aparece', host.querySelector('#alertasList').textContent.indexOf('Ivermectina') === -1 && host.querySelector('#alertasList').textContent.indexOf('Medi Vencido') === -1, host.querySelector('#alertasList').textContent);

      /* sin fecha de expiración = siempre activo */
      var chkSf = host.querySelector('#dogCheckboxList input[value="' + medSinFecha.id + '"]');
      chkSf.checked = true; chkSf.dispatchEvent(new Event('change', { bubbles: true }));
      ok('alertas: sin fecha de expiración se considera activo', host.querySelector('#alertasList').textContent.indexOf('Prednisona') !== -1, host.querySelector('#alertasList').textContent);

      /* al renovar el plan vencido vuelve a aparecer y cada perro queda diferenciado */
      await Store.saveDog(Object.assign({}, medVencido, { medicacion_expira: C.addDaysISO(C.todayISO(), 10) }));
      await Views.servicios.render(host, ['nuevo'], ctx);
      form = host.querySelector('#svcForm');
      host.querySelector('#dogCheckboxList input[value="' + medActivo.id + '"]').checked = true;
      host.querySelector('#dogCheckboxList input[value="' + medVencido.id + '"]').checked = true;
      host.querySelector('#dogCheckboxList input[value="' + medActivo.id + '"]').dispatchEvent(new Event('change', { bubbles: true }));
      host.querySelector('#dogCheckboxList input[value="' + medVencido.id + '"]').dispatchEvent(new Event('change', { bubbles: true }));
      var alMulti = host.querySelector('#alertasList');
      var alItems = host.querySelectorAll('#alertasList .alerta-item');
      ok('alertas: con varios perros cada uno se muestra diferenciado', alItems.length === 2 && alMulti.textContent.indexOf('Amoxicilina') !== -1 && alMulti.textContent.indexOf('Ivermectina') !== -1, alItems.length + ' bloques: ' + alMulti.textContent);

      /* alertas visibles también en paseos */
      inp('tipo').value = 'paseo'; inp('tipo').dispatchEvent(new Event('change', { bubbles: true }));
      ok('alertas: visible también en paseos', host.querySelector('#alertasBox').style.display !== 'none');
      inp('tipo').value = 'hospedaje'; inp('tipo').dispatchEvent(new Event('change', { bubbles: true }));

      /* al editar un servicio ya guardado con esos perros se precalculan las alertas */
      var svcAlertas = await Store.saveService({ id: Store.uid(), tipo: 'hospedaje', desde: '2026-12-14', hasta: '2026-12-15', dog_ids: [medActivo.id, medVencido.id], coste_base: 25, coste_total: 50, coste_total_manual: false, min_desplazamiento: 0, min_paseo: 0, paga_senal: 0, plus: 0, estado: 'pendiente', notas: '' });
      await Views.servicios.render(host, ['edit', svcAlertas.id], ctx);
      form = host.querySelector('#svcForm');
      var alEdit = host.querySelector('#alertasList');
      ok('alertas: al editar un servicio se precalculan las alertas', alEdit.textContent.indexOf('Amoxicilina') !== -1 && alEdit.textContent.indexOf('Ivermectina') !== -1, alEdit.textContent);
      await Store.deleteService(svcAlertas.id);
      await Store.deleteDogPhysical(medActivo.id);
      await Store.deleteDogPhysical(medVencido.id);
      await Store.deleteDogPhysical(medSinFecha.id);

      log('== Fase 7b: comunicaciones automáticas ==');
      await Views.servicios.render(host, ['nuevo'], ctx);
      form = host.querySelector('#svcForm');
      var dogSearch = host.querySelector('#buscaPerroSvc');
      ok('buscador perros: campo presente en el formulario', dogSearch !== null);
      var allChecks = host.querySelectorAll('#dogCheckboxList .dog-check');
      ok('buscador perros: se muestran todos los perros inicialmente', allChecks.length === 5, allChecks.length);
      var firstCheck = host.querySelector('#dogCheckboxList .dog-check');
      ok('buscador perros: foto de 48px y nombre en el chip', firstCheck !== null && firstCheck.querySelector('.avatar') !== null && firstCheck.querySelector('.dog-check-name') !== null, firstCheck ? firstCheck.textContent : 'sin chip');
      dogSearch.value = 'Lok'; dogSearch.dispatchEvent(new Event('input', { bubbles: true }));
      var filtered = host.querySelectorAll('#dogCheckboxList .dog-check');
      ok('buscador perros: filtra al teclear', filtered.length === 1 && filtered[0].textContent.indexOf('Loki') !== -1, filtered.length);
      dogSearch.value = 'zzzz'; dogSearch.dispatchEvent(new Event('input', { bubbles: true }));
      ok('buscador perros: mensaje si no hay coincidencias', host.querySelector('#dogCheckboxList').textContent.indexOf('No hay perros') !== -1);
      dogSearch.value = ''; dogSearch.dispatchEvent(new Event('input', { bubbles: true }));
      var commsBtn = host.querySelector('#btnComms');
      ok('comms: botón presente en el formulario', commsBtn !== null);
      commsBtn.click();
      await new Promise(function (r) { setTimeout(r, 50); });
      ok('comms: aviso si no hay perros seleccionados', (await Store.listServices()).length === before);
      d1box = host.querySelector('#dogCheckboxList input[value="' + seed.d.d1.id + '"]');
      d1box.checked = true; d1box.dispatchEvent(new Event('change', { bubbles: true }));
      commsBtn.click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var commsModal = document.querySelector('.modal-overlay.show');
      ok('comms: modal abierto con perros seleccionados', commsModal !== null && commsModal.querySelectorAll('.comms-card').length === 1, commsModal ? commsModal.querySelectorAll('.comms-card').length : 0);
      if (commsModal) {
        var commsCard = commsModal.querySelector('.comms-card');
        ok('comms: tarjeta con el contacto común (Ana)', commsCard.textContent.indexOf('Ana Martínez') !== -1);
        ok('comms: vista previa cumple variables', commsCard.querySelector('.comms-txt').value.indexOf('Loki') !== -1 && commsCard.querySelector('.comms-txt').value.indexOf('Ana Martínez') !== -1, commsCard.querySelector('.comms-txt').value);
        ok('comms: WhatsApp por teléfono (Ana sin whatsapp)', commsCard.dataset.wa === '600111222', commsCard.dataset.wa);
        ok('comms: Telegram por @anamtz', commsCard.dataset.tg === 'anamtz', commsCard.dataset.tg);
        ok('comms: botones WhatsApp y Telegram', commsCard.querySelector('[data-wa]') !== null && commsCard.querySelector('[data-tg]') !== null);
        ok('comms: botón grupo/otro siempre disponible', commsCard.querySelector('[data-share]') !== null);
        var selOpts = commsModal.querySelector('.comms-tpl').options.length;
        ok('comms: selector con plantillas (5)', selOpts === 5, selOpts);
        var prevVal = commsCard.querySelector('.comms-txt').value;
        commsModal.querySelector('.comms-tpl').value = commsModal.querySelector('.comms-tpl').options[1].value;
        commsModal.querySelector('.comms-tpl').dispatchEvent(new Event('change', { bubbles: true }));
        ok('comms: cambiar plantilla actualiza la vista previa', commsCard.querySelector('.comms-txt').value !== prevVal);
        document.querySelector('.modal-overlay .icon-btn').click();
        await new Promise(function (r) { setTimeout(r, 300); });
        ok('comms: modal cerrado', document.querySelectorAll('.modal-overlay').length === 0);
      }

      /* Plantillas: {nombre_perro} con varios perros (reglas "y"/"e" según la inicial del último) */
      var checkNala = host.querySelector('#dogCheckboxList input[value="' + seed.d.d4.id + '"]');
      checkNala.checked = true; checkNala.dispatchEvent(new Event('change', { bubbles: true }));
      commsBtn.click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var commsModal2 = document.querySelector('.modal-overlay.show');
      if (commsModal2) {
        var txt2 = commsModal2.querySelector('.comms-card .comms-txt').value;
        ok('comms: 2 perros separados por "y" (Loki y Kira)', txt2.indexOf('Loki y Kira') !== -1, txt2);
        document.querySelector('.modal-overlay .icon-btn').click();
        await new Promise(function (r) { setTimeout(r, 300); });
      }
      var perroIris = await Store.saveDog({ nombre: 'Iris', activo: true, contact_ids: [seed.c.c1.id] });
      await Views.servicios.render(host, ['nuevo'], ctx);
      form = host.querySelector('#svcForm');
      var checkLoki = host.querySelector('#dogCheckboxList input[value="' + seed.d.d1.id + '"]');
      var checkIris = host.querySelector('#dogCheckboxList input[value="' + perroIris.id + '"]');
      checkLoki.checked = true; checkLoki.dispatchEvent(new Event('change', { bubbles: true }));
      checkIris.checked = true; checkIris.dispatchEvent(new Event('change', { bubbles: true }));
      var commsBtn2 = host.querySelector('#btnComms');
      commsBtn2.click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var commsModal3 = document.querySelector('.modal-overlay.show');
      if (commsModal3) {
        var txt3 = commsModal3.querySelector('.comms-card .comms-txt').value;
        ok('comms: 2 perros, segundo por I -> "e" (Loki e Iris)', txt3.indexOf('Loki e Iris') !== -1, txt3);
        document.querySelector('.modal-overlay .icon-btn').click();
        await new Promise(function (r) { setTimeout(r, 300); });
      }
      await Store.deleteDogPhysical(perroIris.id);
      await Store.cleanOrphanContacts();

      /* Fase 7c: plantillas — token condicional de género/número y variable {pendiente} */
      ok('plantillas: replaceVars 4 alts macho', TemplateData.replaceVars('{Estimado|Estimada|Estimados|Estimadas}', { genero: 'm' }) === 'Estimado', TemplateData.replaceVars('{Estimado|Estimada|Estimados|Estimadas}', { genero: 'm' }));
      ok('plantillas: replaceVars 4 alts hembra', TemplateData.replaceVars('{Estimado|Estimada|Estimados|Estimadas}', { genero: 'f' }) === 'Estimada', TemplateData.replaceVars('{Estimado|Estimada|Estimados|Estimadas}', { genero: 'f' }));
      ok('plantillas: replaceVars 4 alts plural mixto', TemplateData.replaceVars('{Estimado|Estimada|Estimados|Estimadas}', { genero: 'pm' }) === 'Estimados', TemplateData.replaceVars('{Estimado|Estimada|Estimados|Estimadas}', { genero: 'pm' }));
      ok('plantillas: replaceVars 4 alts plural femenino', TemplateData.replaceVars('{Estimado|Estimada|Estimados|Estimadas}', { genero: 'pf' }) === 'Estimadas', TemplateData.replaceVars('{Estimado|Estimada|Estimados|Estimadas}', { genero: 'pf' }));
      ok('plantillas: replaceVars 3 alts', TemplateData.replaceVars('{alojado|alojada|alojados}', { genero: 'm' }) === 'alojado' && TemplateData.replaceVars('{alojado|alojada|alojados}', { genero: 'f' }) === 'alojada' && TemplateData.replaceVars('{alojado|alojada|alojados}', { genero: 'pm' }) === 'alojados' && TemplateData.replaceVars('{alojado|alojada|alojados}', { genero: 'pf' }) === 'alojados', '{alojado|alojada|alojados}');
      ok('plantillas: replaceVars 2 alts', TemplateData.replaceVars('{Estimado|Estimada}', { genero: 'm' }) === 'Estimado' && TemplateData.replaceVars('{Estimado|Estimada}', { genero: 'f' }) === 'Estimada' && TemplateData.replaceVars('{Estimado|Estimada}', { genero: 'pm' }) === 'Estimado' && TemplateData.replaceVars('{Estimado|Estimada}', { genero: 'pf' }) === 'Estimada', '{Estimado|Estimada}');
      ok('plantillas: replaceVars combinado con variables', TemplateData.replaceVars('Hola {nombre_contacto}, {Estimado|Estimada} {nombre_perro}', { nombre_contacto: 'Ana', nombre_perro: 'Kira', genero: 'f' }) === 'Hola Ana, Estimada Kira', TemplateData.replaceVars('Hola {nombre_contacto}, {Estimado|Estimada} {nombre_perro}', { nombre_contacto: 'Ana', nombre_perro: 'Kira', genero: 'f' }));
      ok('plantillas: variable {pendiente} sustituida', TemplateData.replaceVars('Pendiente: {pendiente}', { pendiente: '80,00 €' }).indexOf('80,00') !== -1 && TemplateData.replaceVars('Pendiente: {pendiente}', { pendiente: '80,00 €' }).indexOf('{pendiente}') === -1, TemplateData.replaceVars('Pendiente: {pendiente}', { pendiente: '80,00 €' }));
      ok('plantillas: variable {notas} sustituida', TemplateData.replaceVars('Notas: {notas}', { notas: 'Dar con comida' }).indexOf('Dar con comida') !== -1 && TemplateData.replaceVars('Notas: {notas}', { notas: '' }).indexOf('{notas}') === -1, TemplateData.replaceVars('Notas: {notas}', { notas: 'Dar con comida' }));
      ok('plantillas: variable {manana_o_el} sustituida', TemplateData.replaceVars('{manana_o_el} {fecha_inicio}', { manana_o_el: 'mañana', fecha_inicio: '23/08/2026' }) === 'mañana 23/08/2026' && TemplateData.replaceVars('{manana_o_el} {fecha_inicio}', { manana_o_el: 'el', fecha_inicio: '23/08/2026' }) === 'el 23/08/2026', TemplateData.replaceVars('{manana_o_el} {fecha_inicio}', { manana_o_el: 'mañana', fecha_inicio: '23/08/2026' }));

      var tplGenero = await Store.saveTemplate({ nombre: 'Prueba género', contenido: '{Estimado|Estimada|Estimados|Estimadas} {nombre_perro} {alojado|alojada|alojados|alojadas}', orden: 99 });
      await Views.servicios.render(host, ['nuevo'], ctx);
      var chkLoki = host.querySelector('#dogCheckboxList input[value="' + seed.d.d1.id + '"]');
      var chkKira = host.querySelector('#dogCheckboxList input[value="' + seed.d.d4.id + '"]');
      chkLoki.checked = true; chkLoki.dispatchEvent(new Event('change', { bubbles: true }));
      host.querySelector('#btnComms').click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var gm1 = document.querySelector('.modal-overlay.show');
      if (gm1) {
        gm1.querySelector('.comms-tpl').value = tplGenero.id;
        gm1.querySelector('.comms-tpl').dispatchEvent(new Event('change', { bubbles: true }));
        ok('plantillas: integración macho singular vía servicio', gm1.querySelector('.comms-txt').value.indexOf('Estimado Loki alojado') !== -1, gm1.querySelector('.comms-txt').value);
        document.querySelector('.modal-overlay .icon-btn').click();
        await new Promise(function (r) { setTimeout(r, 300); });
      }
      chkLoki.checked = false; chkLoki.dispatchEvent(new Event('change', { bubbles: true }));
      chkKira.checked = true; chkKira.dispatchEvent(new Event('change', { bubbles: true }));
      host.querySelector('#btnComms').click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var gm2 = document.querySelector('.modal-overlay.show');
      if (gm2) {
        gm2.querySelector('.comms-tpl').value = tplGenero.id;
        gm2.querySelector('.comms-tpl').dispatchEvent(new Event('change', { bubbles: true }));
        ok('plantillas: integración hembra singular vía servicio', gm2.querySelector('.comms-txt').value.indexOf('Estimada Kira alojada') !== -1, gm2.querySelector('.comms-txt').value);
        document.querySelector('.modal-overlay .icon-btn').click();
        await new Promise(function (r) { setTimeout(r, 300); });
      }
      chkLoki.checked = true; chkLoki.dispatchEvent(new Event('change', { bubbles: true }));
      host.querySelector('#btnComms').click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var gm3 = document.querySelector('.modal-overlay.show');
      if (gm3) {
        gm3.querySelector('.comms-tpl').value = tplGenero.id;
        gm3.querySelector('.comms-tpl').dispatchEvent(new Event('change', { bubbles: true }));
        ok('plantillas: integración plural mixto vía servicio', gm3.querySelector('.comms-txt').value.indexOf('Estimados') !== -1 && gm3.querySelector('.comms-txt').value.indexOf('alojados') !== -1, gm3.querySelector('.comms-txt').value);
        document.querySelector('.modal-overlay .icon-btn').click();
        await new Promise(function (r) { setTimeout(r, 300); });
      }
      var hembra2 = await Store.saveDog({ nombre: 'Luna', sexo: 'hembra', activo: true, contact_ids: [seed.c.c1.id] });
      await Views.servicios.render(host, ['nuevo'], ctx);
      var chkKira2 = host.querySelector('#dogCheckboxList input[value="' + seed.d.d4.id + '"]');
      var chkLuna = host.querySelector('#dogCheckboxList input[value="' + hembra2.id + '"]');
      chkKira2.checked = true; chkKira2.dispatchEvent(new Event('change', { bubbles: true }));
      chkLuna.checked = true; chkLuna.dispatchEvent(new Event('change', { bubbles: true }));
      host.querySelector('#btnComms').click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var gm4 = document.querySelector('.modal-overlay.show');
      if (gm4) {
        gm4.querySelector('.comms-tpl').value = tplGenero.id;
        gm4.querySelector('.comms-tpl').dispatchEvent(new Event('change', { bubbles: true }));
        ok('plantillas: integración plural femenino vía servicio', gm4.querySelector('.comms-txt').value.indexOf('Estimadas') !== -1 && gm4.querySelector('.comms-txt').value.indexOf('alojadas') !== -1, gm4.querySelector('.comms-txt').value);
        document.querySelector('.modal-overlay .icon-btn').click();
        await new Promise(function (r) { setTimeout(r, 300); });
      }
      var tplNotas = await Store.saveTemplate({ nombre: 'Prueba notas', contenido: 'Notas: {notas} // {nombre_perro}', orden: 98 });
      await Views.servicios.render(host, ['nuevo'], ctx);
      host.querySelector('[name="notas"]').value = 'Dar con comida';
      host.querySelector('[name="notas"]').dispatchEvent(new Event('input', { bubbles: true }));
      var chkNota = host.querySelector('#dogCheckboxList input[value="' + seed.d.d1.id + '"]');
      chkNota.checked = true; chkNota.dispatchEvent(new Event('change', { bubbles: true }));
      host.querySelector('#btnComms').click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var gmN = document.querySelector('.modal-overlay.show');
      if (gmN) {
        gmN.querySelector('.comms-tpl').value = tplNotas.id;
        gmN.querySelector('.comms-tpl').dispatchEvent(new Event('change', { bubbles: true }));
        ok('plantillas: integración {notas} vía servicio', gmN.querySelector('.comms-txt').value.indexOf('Dar con comida') !== -1 && gmN.querySelector('.comms-txt').value.indexOf('Loki') !== -1, gmN.querySelector('.comms-txt').value);
        document.querySelector('.modal-overlay .icon-btn').click();
        await new Promise(function (r) { setTimeout(r, 300); });
      }
      var tplManana = await Store.saveTemplate({ nombre: 'Prueba manana', contenido: 'Recibimos a {nombre_perro} {manana_o_el} {fecha_inicio}', orden: 97 });
      var mananaISO = C.addDaysISO(C.todayISO(), 1);
      var pasadoISO = '2026-12-01';
      await Views.servicios.render(host, ['nuevo'], ctx);
      host.querySelector('[name="desde"]').value = mananaISO;
      host.querySelector('[name="desde"]').dispatchEvent(new Event('input', { bubbles: true }));
      host.querySelector('[name="hasta"]').value = C.addDaysISO(mananaISO, 2);
      host.querySelector('[name="hasta"]').dispatchEvent(new Event('input', { bubbles: true }));
      var chkMan = host.querySelector('#dogCheckboxList input[value="' + seed.d.d1.id + '"]');
      chkMan.checked = true; chkMan.dispatchEvent(new Event('change', { bubbles: true }));
      host.querySelector('#btnComms').click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var gmM1 = document.querySelector('.modal-overlay.show');
      if (gmM1) {
        gmM1.querySelector('.comms-tpl').value = tplManana.id;
        gmM1.querySelector('.comms-tpl').dispatchEvent(new Event('change', { bubbles: true }));
        ok('plantillas: integración {manana_o_el}=mañana vía servicio', gmM1.querySelector('.comms-txt').value.indexOf('mañana ' + C.fmtDMY(mananaISO)) !== -1, gmM1.querySelector('.comms-txt').value);
        document.querySelector('.modal-overlay .icon-btn').click();
        await new Promise(function (r) { setTimeout(r, 300); });
      }
      host.querySelector('[name="desde"]').value = pasadoISO;
      host.querySelector('[name="desde"]').dispatchEvent(new Event('input', { bubbles: true }));
      host.querySelector('[name="hasta"]').value = '2026-12-03';
      host.querySelector('[name="hasta"]').dispatchEvent(new Event('input', { bubbles: true }));
      host.querySelector('#btnComms').click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var gmM2 = document.querySelector('.modal-overlay.show');
      if (gmM2) {
        gmM2.querySelector('.comms-tpl').value = tplManana.id;
        gmM2.querySelector('.comms-tpl').dispatchEvent(new Event('change', { bubbles: true }));
        ok('plantillas: integración {manana_o_el}=el vía servicio', gmM2.querySelector('.comms-txt').value.indexOf('el ' + C.fmtDMY(pasadoISO)) !== -1 && gmM2.querySelector('.comms-txt').value.indexOf('mañana') === -1, gmM2.querySelector('.comms-txt').value);
        document.querySelector('.modal-overlay .icon-btn').click();
        await new Promise(function (r) { setTimeout(r, 300); });
      }
      await Store.deleteTemplate(tplManana.id);
      await Store.deleteTemplate(tplNotas.id);
      await Store.deleteDogPhysical(hembra2.id);
      await Store.deleteTemplate(tplGenero.id);
      await Store.cleanOrphanContacts();
      await Views.servicios.render(host, ['nuevo'], ctx);

      log('== Fase 8: lista de servicios, calendario, informes ==');
      await Views.servicios.render(host, ['list'], ctx);
      await new Promise(function (r) { setTimeout(r, 80); });
      ok('lista: 11 filas', host.querySelectorAll('#svcTbody tr.svc-row').length === 11, host.querySelectorAll('#svcTbody tr.svc-row').length);
      ok('lista: totales 1.141 / 1.031', hasMoney(host.querySelector('#svcTotals').textContent, 1141) && hasMoney(host.querySelector('#svcTotals').textContent, 1031), host.querySelector('#svcTotals').textContent);

      /* Columna Base retirada, Total sin negrita */
      ok('lista: columna Base retirada del encabezado', host.querySelector('#svcTbody') && host.querySelector('thead').textContent.indexOf('Base') === -1, host.querySelector('thead').textContent);
      ok('lista: encabezados Subtotal y Total', host.querySelector('thead').textContent.indexOf('Subtotal') !== -1 && host.querySelector('thead').textContent.indexOf('Total') !== -1, host.querySelector('thead').textContent);
      ok('lista: Total sin negrita', host.querySelectorAll('#svcTbody strong').length === 0, host.querySelectorAll('#svcTbody strong').length);

      /* Columna Total = Subtotal + Plus (fila del servicio con plus) */
      await Store.saveService(Object.assign({}, seed.S.s3, { plus: 10 }));
      await Views.servicios.render(host, ['list'], ctx);
      await new Promise(function (r) { setTimeout(r, 80); });
      var plusRow = Array.from(host.querySelectorAll('#svcTbody tr.svc-row')).find(function (tr) { return tr.dataset.id === seed.S.s3.id; });
      var subtotalCell = plusRow ? plusRow.querySelectorAll('td')[4] : null;
      var totalCell = plusRow ? plusRow.querySelectorAll('td')[7] : null;
      ok('lista: Subtotal separado y Total = Subtotal+Plus', subtotalCell !== null && hasMoney(subtotalCell.textContent, 30) && hasMoney(totalCell.textContent, 40), (subtotalCell ? subtotalCell.textContent : '') + ' | ' + (totalCell ? totalCell.textContent : ''));
      await Store.saveService(Object.assign({}, seed.S.s3, { plus: 0 }));

      /* Pendiente = 0 si el servicio está finalizado (ya abonado) */
      await Store.saveService(Object.assign({}, seed.S.s11, { estado: 'finalizado' }));
      await Views.servicios.render(host, ['list'], ctx);
      await new Promise(function (r) { setTimeout(r, 80); });
      var finRow = Array.from(host.querySelectorAll('#svcTbody tr.svc-row')).find(function (tr) { return tr.dataset.id === seed.S.s11.id; });
      var finPendCell = finRow ? finRow.querySelectorAll('td')[8] : null;
      ok('lista: finalizado muestra pendiente 0', finPendCell !== null && finPendCell.textContent.indexOf('0,00') !== -1 && finPendCell.textContent.indexOf('40') === -1, finPendCell ? finPendCell.textContent : 'sin celda');
      await Store.saveService(Object.assign({}, seed.S.s11, { estado: 'cancelado' }));
      await Views.servicios.render(host, ['list'], ctx);
      await new Promise(function (r) { setTimeout(r, 80); });

      Views.calendario.setMonth(2026, 11);
      await Views.calendario.render(host, [], ctx);
      /* Una barra por servicio y por semana del mes: las barras de varios días
         aparecen segmentadas por fila semanal (S4 -> 3 semanas, S2 -> 2, S6 -> 2).
         También se muestra el servicio cancelado (S11) y los eventos como barras. */
      var bars = Array.from(host.querySelectorAll('.cal-bar'));
      ok('calendario: 17 barras (15 servicio incl. cancelado + 2 eventos)', bars.length === 17, bars.length);
      ok('calendario: barra pendiente coloreada (rojo tomate)', bars.filter(function (b) { return b.dataset.estado === 'pendiente' && b.dataset.color === '#e63946'; }).length > 0);
      ok('calendario: barra cancelado coloreada (gris grafito)', bars.filter(function (b) { return b.dataset.estado === 'cancelado' && b.dataset.color === '#4b5563'; }).length > 0);
      ok('calendario: leyenda con colores por estado', host.querySelectorAll('.cal-legend .legend-dot').length >= 6);
      ok('calendario: eventos esporádicos como barras apiladas', host.querySelectorAll('.cal-bar[data-tipo="evento"]').length === 2, host.querySelectorAll('.cal-bar[data-tipo="evento"]').length);
      ok('calendario: primera celda = 30/11/2026', host.querySelector('.cal-cell').dataset.iso === '2026-11-30', host.querySelector('.cal-cell').dataset.iso);
      ok('calendario: barra multi-día contiene Loki', Array.from(host.querySelectorAll('.cal-bar')).some(function (b) { return b.textContent.indexOf('Loki') !== -1; }));
      ok('calendario: barras con inicial tipo (H: / P:)', Array.from(host.querySelectorAll('.cal-bar[data-service]')).some(function (b) { return b.textContent.trim().startsWith('H: '); }) && Array.from(host.querySelectorAll('.cal-bar[data-service]')).some(function (b) { return b.textContent.trim().startsWith('P: '); }), Array.from(host.querySelectorAll('.cal-bar[data-service]')).map(function (b) { return b.textContent.trim(); }).join(' | '));
      ok('calendario: diciembre tiene 31 celdas', host.querySelectorAll('.cal-cell[data-iso^="2026-12-"]').length === 31);

      /* Modal de evento: abrir, todo el día sin hora, guardar */
      document.getElementById('btnNewEvent').click();
      await new Promise(function (r) { setTimeout(r, 50); });
      var evFecha = document.getElementById('evFecha');
      var evDesc = document.getElementById('evDesc');
      var evSave = document.getElementById('evSave');
      ok('evento: modal abierto', evFecha !== null && evDesc !== null && evSave !== null);
      evFecha.value = '2026-12-20';
      evFecha.dispatchEvent(new Event('input', { bubbles: true }));
      evDesc.value = 'Recogida de Nala en casa';
      evDesc.dispatchEvent(new Event('input', { bubbles: true }));
      var gcalLink = document.getElementById('evGCalLink');
      ok('evento: botón Google Calendar presente', gcalLink !== null);
      ok('evento: enlace de todo el día usa formato de día completo', gcalLink && gcalLink.href.indexOf('dates=20261220/20261220') !== -1 && gcalLink.href.indexOf('calendar.google.com/calendar/render') !== -1, gcalLink ? gcalLink.href : 'sin href');
      ok('evento: enlace incluye descripción y detalles', gcalLink && gcalLink.href.indexOf('text=') !== -1 && decodeURIComponent(gcalLink.href).indexOf('Recogida de Nala en casa') !== -1);
      evSave.click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var saved = await Store.listEventsInRange('2026-12-20', '2026-12-20');
      ok('evento: se guarda "todo el día" sin hora', saved.length === 1 && saved[0].todo_dia === true && saved[0].hora === null, JSON.stringify(saved));

      /* Validación: hora obligatoria si se elige "A una hora" */
      document.getElementById('btnNewEvent').click();
      await new Promise(function (r) { setTimeout(r, 30); });
      document.getElementById('evCuando').value = 'hora';
      document.getElementById('evCuando').dispatchEvent(new Event('change', { bubbles: true }));
      document.getElementById('evFecha').value = '2026-12-21';
      document.getElementById('evDesc').value = 'Paseo con Loki';
      document.getElementById('evSave').click();
      await new Promise(function (r) { setTimeout(r, 30); });
      ok('evento: sin hora -> error mostrado', document.getElementById('evErrors') && document.getElementById('evErrors').hidden === false);
      var gcalLink2 = document.getElementById('evGCalLink');
      ok('evento: sin hora el enlace está deshabilitado', gcalLink2 && gcalLink2.getAttribute('href') === null && gcalLink2.classList.contains('disabled'));
      document.getElementById('evHora').value = '10:15';
      document.getElementById('evHora').dispatchEvent(new Event('input', { bubbles: true }));
      ok('evento: con hora el enlace usa formato con fecha y hora', gcalLink2.href.indexOf('dates=20261221T101500/20261221T111500') !== -1, gcalLink2.href);
      document.querySelector('.modal-overlay .icon-btn').click();
      await new Promise(function (r) { setTimeout(r, 300); });
      ok('evento: modales cerrados tras validación', document.querySelectorAll('.modal-overlay').length === 0, document.querySelectorAll('.modal-overlay').length);

      /* Edición: clic en la barra de un evento abre el modal precargado y guarda cambios */
      var chip = host.querySelector('.cal-bar[data-tipo="evento"]');
      ok('evento: hay barras de evento clicables', chip !== null);
      var chipId = chip.dataset.evento;
      chip.click();
      await new Promise(function (r) { setTimeout(r, 50); });
      var evEditFecha = document.getElementById('evFecha');
      var evEditDesc = document.getElementById('evDesc');
      ok('evento: clic en chip abre modal de edición', evEditFecha !== null && evEditDesc !== null);
      var pre = await Store.getEvent(chipId);
      ok('evento: el modal carga los datos del evento', evEditDesc.value === pre.descripcion && evEditFecha.value === pre.fecha, evEditDesc.value + ' vs ' + pre.descripcion);
      evEditDesc.value = 'Descripción editada desde el calendario';
      document.getElementById('evSave').click();
      await new Promise(function (r) { setTimeout(r, 250); });
      var edited = await Store.getEvent(chipId);
      ok('evento: edición guardada manteniendo el id', edited.id === chipId && edited.descripcion === 'Descripción editada desde el calendario', JSON.stringify(edited));
      /* Re-render (en la app lo hace ctx.refresh) y comprobar la barra actualizada */
      await Views.calendario.render(host, [], ctx);
      ok('evento: la barra actualizada en el calendario', (function () {
        var chip2 = host.querySelector('.cal-bar[data-evento="' + chipId + '"]');
        return chip2 !== null && chip2.textContent.indexOf('editada') !== -1;
      })());

      /* Las barras de evento se apilan en carriles: ninguna barra solapa a otra */
      var overlaps = 0, evBarsCount = 0;
      Array.from(host.querySelectorAll('.cal-week')).forEach(function (w) {
        var bs = Array.from(w.querySelectorAll('.cal-bar'));
        bs.forEach(function (b) { if (b.dataset.tipo === 'evento') evBarsCount++; });
        for (var i = 0; i < bs.length; i++) {
          for (var j = i + 1; j < bs.length; j++) {
            var ra = bs[i].getBoundingClientRect(), rb = bs[j].getBoundingClientRect();
            var ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
            var iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
            if (ix > 1 && iy > 1) overlaps++;
          }
        }
      });
      ok('evento: barras de evento apiladas sin solapar servicios ni eventos', evBarsCount > 0 && overlaps === 0, JSON.stringify({ eventoBarras: evBarsCount, solapes: overlaps }));
      var evBarTop = host.querySelector('.cal-bar[data-tipo="evento"]');
      if (evBarTop) {
        var rb = evBarTop.getBoundingClientRect();
        var topEl = document.elementFromPoint(rb.left + rb.width / 2, rb.top + rb.height / 2);
        ok('evento: elementFromPoint sobre barra de evento devuelve la barra', topEl !== null && topEl.hasAttribute && topEl.hasAttribute('data-evento'), topEl ? topEl.className : 'null');
      }

      await Views.informes.render(host, [], ctx);
      var yr = host.querySelector('#repYear');
      yr.value = '2026'; yr.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(function (r) { setTimeout(r, 150); });
      ok('informes: redito 2026 = 1.101', hasMoney(host.querySelector('#perfTbody').textContent, 1101), host.querySelector('#perfTbody').textContent);
      var nowR = new Date();
      var medMonths = (2026 === nowR.getFullYear()) ? nowR.getMonth() + 1 : 12;
      ok('informes: media mensual 2026 solo contempla meses transcurridos = ' + (1101 / medMonths), hasMoney(host.querySelector('#perfTbody').textContent, 1101 / medMonths), host.querySelector('#perfTbody').textContent);
      var dogTxt = host.querySelector('#dogsTbody').textContent;
      ok('informes: Loki 210', dogTxt.indexOf('210') !== -1, dogTxt);
      ok('informes: Kira 320,50', dogTxt.indexOf('320') !== -1);

      ok('informes: encabezados ordenables', host.querySelectorAll('th[data-key].sortable').length >= 8, host.querySelectorAll('th[data-key].sortable').length);
      function dogFirstRow() { return host.querySelectorAll('#dogsTbody tr.dog-row')[0].textContent; }
      var acumTh = Array.from(host.querySelectorAll('th[data-key]')).filter(function (th) { return th.dataset.key === 'acum'; })[0];
      acumTh.click();
      ok('informes: 1er clic Importe = de más a menos (Kira)', dogFirstRow().indexOf('Kira') !== -1, dogFirstRow());
      acumTh.click();
      ok('informes: 2º clic Importe = de menos a más (Nala)', dogFirstRow().indexOf('Nala') !== -1, dogFirstRow());

      var edadTh = Array.from(host.querySelectorAll('th[data-key]')).filter(function (th) { return th.dataset.key === 'edad'; })[0];
      ok('informes: columna Edad es numérica (no alfabética)', edadTh !== null && edadTh.dataset.type === 'num', edadTh ? (edadTh.dataset.key + ':' + edadTh.dataset.type) : 'sin th');
      edadTh.click();
      ok('informes: 1er clic Edad = de más viejo a más joven (Bruno)', dogFirstRow().indexOf('Bruno') !== -1, dogFirstRow());
      edadTh.click();
      ok('informes: 2º clic Edad = de más joven a más viejo (Toby)', dogFirstRow().indexOf('Toby') !== -1, dogFirstRow());

      var leg = host.querySelector('#sexLegend').textContent;
      ok('informes: tarta de sexo (canvas + leyenda)', host.querySelector('#sexPie') !== null && leg.indexOf('Hembras') !== -1 && leg.indexOf('Machos') !== -1, leg);
      ok('informes: bloque "sin sexo especificado" presente', host.querySelector('#sexSin') !== null);
      ok('informes: sin perros sin sexo → mensaje de todo correcto', host.querySelector('#sexSin').textContent.indexOf('Todos los perros') !== -1);

      var capLeg = host.querySelector('#captLegend').textContent;
      ok('informes: estadística de canal de captación', host.querySelector('#captPie') !== null && capLeg.indexOf('Wallapop') !== -1 && capLeg.indexOf('Boca a boca') !== -1 && capLeg.indexOf('Holidog') !== -1 && capLeg.indexOf('TopAyuda') !== -1 && capLeg.indexOf('Captación directa') !== -1, capLeg);

      var sinDog = await Store.saveDogWithContacts({ nombre: 'Chano', activo: true, fecha_nacimiento: '2019-01-01' }, [{ nombre: 'Contacto sin canal', telefono: '600555777' }]);
      var chanoSvc = await Store.saveService({
        id: Store.uid(), tipo: 'paseo', desde: '2026-11-10', hasta: '2026-11-10', dog_ids: [sinDog.id],
        coste_base: 12, coste_total: 12, coste_total_manual: false, min_desplazamiento: 0, min_paseo: 60,
        paga_senal: 0, plus: 0, estado: 'pendiente', notas: ''
      });
      await Views.informes.render(host, [], ctx);
      var yr2 = host.querySelector('#repYear');
      yr2.value = '2026'; yr2.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(function (r) { setTimeout(r, 150); });
      var capLeg2 = host.querySelector('#captLegend').textContent;
      ok('informes: solo canales cumplimentados (sin contador "Sin especificar")', capLeg2.indexOf('Sin especificar') === -1 && capLeg2.indexOf('Wallapop') !== -1, capLeg2);
      var capSinTxt = host.querySelector('#captSin').textContent;
      ok('informes: lista perros sin canal debajo del gráfico', capSinTxt.indexOf('Chano') !== -1 && capSinTxt.indexOf('Loki') === -1, capSinTxt);
      var capSinLink = host.querySelector('#captSin a[href="#/perros/edit/' + sinDog.id + '"]');
      ok('informes: perro sin canal es enlace clicable a su ficha', capSinLink !== null && capSinLink.textContent === 'Chano', capSinLink ? capSinLink.getAttribute('href') : 'sin enlace');
      var sexSinTxt = host.querySelector('#sexSin').textContent;
      ok('informes: lista perros sin sexo debajo de la tarta', sexSinTxt.indexOf('Chano') !== -1 && sexSinTxt.indexOf('Loki') === -1, sexSinTxt);
      var sexSinLink = host.querySelector('#sexSin a[href="#/perros/edit/' + sinDog.id + '"]');
      ok('informes: perro sin sexo es enlace clicable a su ficha', sexSinLink !== null && sexSinLink.textContent === 'Chano', sexSinLink ? sexSinLink.getAttribute('href') : 'sin enlace');
      var porCanalBox = host.querySelector('#captPorCanal');
      ok('informes: selector perros por canal debajo de Perros sin canal', porCanalBox !== null && porCanalBox.querySelector('#captCanalSel') !== null, porCanalBox ? porCanalBox.innerHTML.slice(0, 200) : 'sin box');
      var captSel = host.querySelector('#captCanalSel');
      ok('informes: selector muestra todos los canales de captación', captSel && ['Wallapop', 'Holidog', 'TopAyuda', 'Captación directa', 'Boca a boca'].every(function (n) { return Array.from(captSel.options).some(function (o) { return o.value === n; }); }), captSel ? Array.from(captSel.options).map(function (o) { return o.value; }).join(',') : 'sin select');
      captSel.value = 'Wallapop'; captSel.dispatchEvent(new Event('change', { bubbles: true }));
      var captList = host.querySelector('#captCanalList');
      ok('informes: al seleccionar Wallapop salen Loki y Kira del período', captList && captList.textContent.indexOf('Loki') !== -1 && captList.textContent.indexOf('Kira') !== -1 && captList.textContent.indexOf('Toby') === -1, captList ? captList.textContent : 'sin lista');
      var wallLink = host.querySelector('#captCanalList a[href="#/perros/edit/' + seed.d.d1.id + '"]');
      ok('informes: perro por canal es enlace clicable a su ficha', wallLink !== null && wallLink.textContent === 'Loki', wallLink ? wallLink.getAttribute('href') : 'sin enlace');
      captSel.value = 'Holidog'; captSel.dispatchEvent(new Event('change', { bubbles: true }));
      ok('informes: al seleccionar Holidog sale Toby', host.querySelector('#captCanalList').textContent.indexOf('Toby') !== -1 && host.querySelector('#captCanalList').textContent.indexOf('Loki') === -1, host.querySelector('#captCanalList').textContent);
      captSel.value = ''; captSel.dispatchEvent(new Event('change', { bubbles: true }));
      await Store.deleteService(chanoSvc.id);
      await Store.deleteDogPhysical(sinDog.id);
      await Store.cleanOrphanContacts();

      /* Informes: variación interanual y ocupación en "Rendimiento por año" */
      await Views.informes.render(host, [], ctx);
      await new Promise(function (r) { setTimeout(r, 150); });
      var yrG = host.querySelector('#repYear');
      yrG.value = '2026'; yrG.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(function (r) { setTimeout(r, 150); });
      var perfHeadTxt = host.querySelector('#perfTbody').closest('table').querySelector('thead').textContent;
      ok('informes: columna de variación con símbolos ▲▼ y FACTURACIÓN', perfHeadTxt.indexOf('▲') !== -1 && perfHeadTxt.indexOf('▼') !== -1 && perfHeadTxt.toUpperCase().indexOf('FACTURACI') !== -1 && perfHeadTxt.indexOf('Ocupación') !== -1 && perfHeadTxt.indexOf('% Fallecidos') !== -1 && perfHeadTxt.indexOf('% Red flag') !== -1, perfHeadTxt);
      var perfG = host.querySelector('#perfTbody').textContent;
      ok('informes: primer año sin año anterior → sin variación (—)', perfG.indexOf('—') !== -1, perfG);
      ok('informes: ocupación 2026 = 31 días con %', perfG.indexOf('31 días') !== -1 && perfG.indexOf('%') !== -1, perfG);

      /* Un servicio en 2025 para comprobar el incremento interanual de 2026 */
      var prevSvc = await Store.saveService({ id: Store.uid(), tipo: 'paseo', desde: '2025-06-10', hasta: '2025-06-10', dog_ids: [seed.d.d2.id], coste_base: 100, coste_total: 100, coste_total_manual: false, min_desplazamiento: 0, min_paseo: 0, paga_senal: 0, plus: 0, estado: 'finalizado', notas: '' });
      await Views.informes.render(host, [], ctx);
      await new Promise(function (r) { setTimeout(r, 150); });
      var yrG2 = host.querySelector('#repYear');
      yrG2.value = '2026'; yrG2.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(function (r) { setTimeout(r, 150); });
      var perfG2 = host.querySelector('#perfTbody').textContent;
      ok('informes: variación 2026 = +1001% sobre 2025', perfG2.indexOf('▲') !== -1 && perfG2.indexOf('+1') !== -1 && perfG2.indexOf('%') !== -1, perfG2);
      await Store.deleteService(prevSvc.id);
      await Store.cleanOrphanContacts();

      /* Informes: gráfica de líneas con selectores de eje */
      await Views.informes.render(host, [], ctx);
      await new Promise(function (r) { setTimeout(r, 150); });
      var yrG3 = host.querySelector('#repYear');
      yrG3.value = '2026'; yrG3.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(function (r) { setTimeout(r, 150); });
      var lc = host.querySelector('#lineCanvas');
      var ly = host.querySelector('#lineY');
      var lx = host.querySelector('#lineX');
      ok('informes: gráfica de líneas y selectores presentes', lc !== null && ly !== null && lx !== null);
      ok('informes: eje Y = Días con servicios y Réditos', ly && ly.options.length === 2 && ly.options[0].text === 'Días con servicios' && ly.options[1].text === 'Réditos', ly ? Array.prototype.map.call(ly.options, function (o) { return o.text; }).join(',') : 'sin select');
      ok('informes: eje X = Meses y Años', lx && lx.options.length === 2 && lx.options[0].text === 'Meses' && lx.options[1].text === 'Años', lx ? Array.prototype.map.call(lx.options, function (o) { return o.text; }).join(',') : 'sin select');
      var diasS = JSON.parse(lc.dataset.dias);
      var redS = JSON.parse(lc.dataset.redito);
      ok('informes: diciembre 2026 = 31 días con servicios', diasS.length === 12 && diasS[11] === 31, lc.dataset.dias);
      ok('informes: rédito diciembre 2026 positivo', redS[11] > 0 && redS[11] <= 1101, lc.dataset.redito);
      ly.value = 'redito'; ly.dispatchEvent(new Event('change', { bubbles: true }));
      ok('informes: cambiar eje Y re-dibuja con la nueva variable', lc.dataset.last === 'redito', lc.dataset.last);

      /* Eje X = Años: agrega la serie por año (con filtro 2026 solo aparece ese año) */
      ok('informes: eje X Años agrega por año', (function () {
        var ya = JSON.parse(lc.dataset.years);
        return !!(ya && ya.labels.length === 1 && ya.labels[0] === '2026' && ya.dias[0] === 31 && ya.redito[0] > 0);
      })(), lc.dataset.years);
      yr.value = ''; yr.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(function (r) { setTimeout(r, 150); });
      var yrFull = JSON.parse(lc.dataset.years);
      ok('informes: sin filtro el eje X Años muestra 2026 y 2027', yrFull.labels.indexOf('2026') !== -1 && yrFull.labels.indexOf('2027') !== -1, lc.dataset.years);
      ok('informes: días con servicio por año (2026=31, 2027=3 del cruce de S8)', yrFull.dias[yrFull.labels.indexOf('2026')] === 31 && yrFull.dias[yrFull.labels.indexOf('2027')] === 3, lc.dataset.years);
      lx.value = 'año'; lx.dispatchEvent(new Event('change', { bubbles: true }));
      ok('informes: cambiar eje X a Años re-dibuja la gráfica', lc.dataset.last === 'redito');
      lx.value = 'mes'; lx.dispatchEvent(new Event('change', { bubbles: true }));
      yr.value = '2026'; yr.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(function (r) { setTimeout(r, 150); });

      /* Contador de perros cuidados: al principio ningún servicio está finalizado/en curso */
      ok('informes: contador de perros cuidados = 0 sin finalizados', host.querySelector('#dogsCount').textContent === '0', host.querySelector('#dogsCount').textContent);

      /* Marcar S1 (Loki) como finalizado y S4 (Kira) como en_curso y re-pintar */
      await Store.saveService(Object.assign({}, seed.S.s1, { estado: 'finalizado' }));
      await Store.saveService(Object.assign({}, seed.S.s4, { estado: 'en_curso' }));
      await Views.informes.render(host, [], ctx);
      yr.value = '2026'; yr.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(function (r) { setTimeout(r, 150); });
      ok('informes: contador = 2 perros distintos (Loki+Kira)', host.querySelector('#dogsCount').textContent === '2', host.querySelector('#dogsCount').textContent);

      /* Restaurar estados para no afectar a fases posteriores */
      await Store.saveService(Object.assign({}, seed.S.s1, { estado: 'pendiente' }));
      await Store.saveService(Object.assign({}, seed.S.s4, { estado: 'pendiente' }));

      /* Informes: % del rédito de perros fallecidos y RED FLAG */
      await Store.saveDog(Object.assign({}, seed.d.d4, { fecha_deceso: '2026-01-10' }));
      await Store.saveDog(Object.assign({}, seed.d.d1, { comportamientos: ['RED FLAG.'] }));
      await Views.informes.render(host, [], ctx);
      await new Promise(function (r) { setTimeout(r, 150); });
      var yrD = host.querySelector('#repYear');
      yrD.value = '2026'; yrD.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(function (r) { setTimeout(r, 150); });
      var perfD = host.querySelector('#perfTbody').textContent;
      ok('informes: % fallecidos 2026 (Kira) = 29,1%', perfD.indexOf('29,1') !== -1, perfD);
      ok('informes: % red flag 2026 (Loki) = 19,1%', perfD.indexOf('19,1') !== -1, perfD);

      /* Informes: % fallecidos solo cuenta los fallecidos en ese año o en el siguiente.
         Para 2025: cuentan los fallecidos en 2025 y 2026, no los de 2027. */
      await Store.saveDog(Object.assign({}, seed.d.d4, { fecha_deceso: '2026-01-10' })); /* Kira fallece en 2026 -> cuenta para 2025 */
      var fallece2027 = await Store.saveDog({ nombre: 'Rex 2027', activo: true, fecha_deceso: '2027-01-05', contact_ids: [] });
      var fallece2025 = await Store.saveDog({ nombre: 'Nube 2025', activo: true, fecha_deceso: '2025-03-01', contact_ids: [] });
      async function svc2025(dogId, coste) {
        return Store.saveService({ id: Store.uid(), tipo: 'paseo', desde: '2025-08-01', hasta: '2025-08-01', dog_ids: [dogId], coste_base: coste, coste_total: coste, coste_total_manual: false, min_desplazamiento: 0, min_paseo: 0, paga_senal: 0, plus: 0, estado: 'pendiente', notas: '' });
      }
      await svc2025(seed.d.d4.id, 100);    /* Kira (fallece 2026): 100 */
      await svc2025(fallece2027.id, 200);  /* Rex (fallece 2027): NO cuenta */
      await svc2025(fallece2025.id, 300);  /* Nube (fallece 2025): 300 */
      await Views.informes.render(host, [], ctx);
      await new Promise(function (r) { setTimeout(r, 150); });
      var yrDead = host.querySelector('#repYear');
      yrDead.value = '2025'; yrDead.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(function (r) { setTimeout(r, 150); });
      var perfDead = host.querySelector('#perfTbody').textContent;
      ok('informes: % fallecidos 2025 excluye fallecidos en 2027 (66,7%)', perfDead.indexOf('66,7') !== -1, perfDead);

      ok('informes: botones CSV en cada subsección', host.querySelector('#csvPerf') !== null && host.querySelector('#csvEvol') !== null && host.querySelector('#csvDogs') !== null && host.querySelector('#csvSex') !== null && host.querySelector('#csvCapt') !== null, [host.querySelector('#csvPerf') ? 'perf' : '', host.querySelector('#csvEvol') ? 'evol' : '', host.querySelector('#csvDogs') ? 'dogs' : '', host.querySelector('#csvSex') ? 'sex' : '', host.querySelector('#csvCapt') ? 'capt' : ''].join(','));
      var origDL = UI.downloadFile;
      var last = null;
      UI.downloadFile = function (n, c, m) { last = { name: n, content: c, mime: m }; };
      host.querySelector('#csvPerf').click();
      ok('informes: CSV rendimiento con cabecera', last && last.name.indexOf('rendimiento') !== -1 && last.content.indexOf('Año') !== -1 && last.content.indexOf('Rédito') !== -1, last ? last.content.slice(0, 150) : 'sin dl');
      last = null; host.querySelector('#csvEvol').click();
      ok('informes: CSV evolución con Periodo', last && last.name.indexOf('evolucion') !== -1 && last.content.indexOf('Periodo') !== -1 && last.content.indexOf('Rédito') !== -1, last ? last.content.slice(0, 150) : 'sin dl');
      last = null; host.querySelector('#csvDogs').click();
      ok('informes: CSV perros con Nombre', last && last.name.indexOf('perros') !== -1 && last.content.indexOf('Nombre') !== -1 && last.content.indexOf('Importe acumulado') !== -1, last ? last.content.slice(0, 150) : 'sin dl');
      last = null; host.querySelector('#csvSex').click();
      ok('informes: CSV sexo con Hembras', last && last.name.indexOf('sexo') !== -1 && last.content.indexOf('Hembras') !== -1 && last.content.indexOf('Cantidad') !== -1, last ? last.content.slice(0, 150) : 'sin dl');
      last = null; host.querySelector('#csvCapt').click();
      ok('informes: CSV canal con Canal', last && last.name.indexOf('canal') !== -1 && last.content.indexOf('Canal') !== -1 && last.content.indexOf('Cantidad') !== -1, last ? last.content.slice(0, 150) : 'sin dl');
      var lxCsv = host.querySelector('#lineX');
      if (lxCsv) { lxCsv.value = 'año'; lxCsv.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(function (r) { setTimeout(r, 80); }); last = null; host.querySelector('#csvEvol').click(); ok('informes: CSV evolución en modo Años', last && last.content.indexOf('2025') !== -1, last ? last.content.slice(0, 200) : 'sin dl'); }
      UI.downloadFile = origDL;

      log('== Fase 9: dashboard y formulario de perro ==');
      await clearStores();
      await Store.ensureDefaultTemplates();
      var zc = await Store.saveContact({ nombre: 'Dueño Z', telefono: '9' });
      var zd = await Store.saveDogWithContacts({ nombre: 'Zelda', fecha_nacimiento: '2021-05-05' }, [zc]);
      var today = C.todayISO();
      var tomorrow = C.addDaysISO(today, 1);
      await Store.saveService({
        id: Store.uid(), tipo: 'hospedaje', desde: today, hasta: today, dog_ids: [zd.id],
        coste_base: 20, coste_total: 20, coste_total_manual: false, min_desplazamiento: 0, min_paseo: 0,
        paga_senal: 0, plus: 0, estado: 'pendiente', notas: ''
      });
      await Store.saveService({
        id: Store.uid(), tipo: 'paseo', desde: today, hasta: tomorrow, dog_ids: [zd.id],
        coste_base: 12, coste_total: 20, coste_total_manual: false, min_desplazamiento: 10, min_paseo: 90,
        paga_senal: 0, plus: 0, estado: 'pendiente', notas: ''
      });
      await Views.dashboard.render(host, [], ctx);
      ok('dashboard: sección hospedajes activos hoy', host.textContent.indexOf('Hospedajes activos hoy') !== -1);
      ok('dashboard: sección paseos hoy', host.textContent.indexOf('Paseos programados hoy') !== -1);
      ok('dashboard: Zelda presente', host.textContent.indexOf('Zelda') !== -1);
      ok('dashboard: próximos servicios', host.textContent.indexOf('Próximos servicios') !== -1);
      ok('dashboard: botón Nuevo servicio presente', host.querySelector('#dashNewService') !== null && host.querySelector('#dashNewService').textContent.indexOf('Nuevo servicio') !== -1);
      ok('dashboard: botón Nuevo evento presente', host.querySelector('#dashNewEvent') !== null && host.querySelector('#dashNewEvent').textContent.indexOf('Nuevo evento') !== -1);
      host.querySelector('#dashNewEvent').click();
      ok('dashboard: Nuevo evento abre el modal de evento', document.getElementById('evFecha') !== null && document.getElementById('evDesc') !== null);
      var evCancelDash = document.getElementById('evCancel');
      if (evCancelDash) evCancelDash.click();
      document.querySelectorAll('.modal-overlay').forEach(function (o) { o.remove(); });
      ok('dashboard: eventos de hoy sin eventos', host.textContent.indexOf('Eventos de hoy') !== -1 && host.textContent.indexOf('Sin eventos para hoy') !== -1);

      var evHoy = await Store.saveEvent({ fecha: today, todo_dia: false, hora: '12:30', descripcion: 'Recoger llaves de Zelda' });
      await Views.dashboard.render(host, [], ctx);
      ok('dashboard: eventos de hoy con evento', host.textContent.indexOf('12:30') !== -1 && host.textContent.indexOf('Recoger llaves de Zelda') !== -1);
      var evBtn = host.querySelector('[data-go="calendario/evento/' + evHoy.id + '"]');
      ok('dashboard: el evento navega a su edición', evBtn !== null);
      var evModalOk = false;
      try {
        await Views.calendario.render(host, ['evento', evHoy.id], ctx);
        ok('evento: ruta profunda abre el modal de edición', document.getElementById('evFecha') !== null && document.getElementById('evFecha').value === today && document.getElementById('evDesc').value === 'Recoger llaves de Zelda');
        document.querySelectorAll('.modal-overlay').forEach(function (o) { o.remove(); });
        evModalOk = true;
      } catch (e) { ok('evento: ruta profunda abre el modal de edición', false, String(e && e.message ? e.message : e)); }
      if (evModalOk) {
        var evDeep = await Store.getEvent(evHoy.id);
        ok('evento: ruta profunda conserva los datos', evDeep && evDeep.descripcion === 'Recoger llaves de Zelda');
      }
      await Store.deleteEvent(evHoy.id);

      var dogHost = document.createElement('div');
      document.body.appendChild(dogHost);
      root.DogForm.render(dogHost, null, { showCancel: false, onSave: function () {} });
      ok('dog form: botón Guardar visible', dogHost.querySelector('.dog-form button[type="submit"]') !== null);
      ok('dog form: 0 filas de contacto al inicio', dogHost.querySelectorAll('.contact-row').length === 0);
      ok('dog form: 48 checkboxes de comportamiento', dogHost.querySelectorAll('input[name="comportamiento"]').length === 48, dogHost.querySelectorAll('input[name="comportamiento"]').length);
      dogHost.querySelector('#addContact').click();
      ok('dog form: 1 fila de contacto', dogHost.querySelectorAll('.contact-row').length === 1);
      dogHost.querySelector('[name="nombre"]').value = 'Rex';
      dogHost.querySelector('.dog-form').dispatchEvent(new Event('submit', { cancelable: true }));
      ok('dog form: sin humano -> error', dogHost.querySelector('.form-errors').hidden === false);
      ok('dog form: no se crea perro sin humano', (await Store.listDogs({ includeInactive: true })).some(function (d) { return d.nombre === 'Rex'; }) === false);
      dogHost.querySelector('[data-cf="nombre"]').value = 'Juan Rex';
      dogHost.querySelector('[data-cf="telefono"]').value = '600000000';
      dogHost.querySelector('#addContact').click();
      ok('dog form: 2 filas de contacto al añadir', dogHost.querySelectorAll('.contact-row').length === 2);
      var fila1 = dogHost.querySelectorAll('.contact-row')[0];
      ok('dog form: añadir otro contacto conserva lo escrito', fila1.querySelector('[data-cf="nombre"]').value === 'Juan Rex' && fila1.querySelector('[data-cf="telefono"]').value === '600000000', fila1.querySelector('[data-cf="nombre"]').value + ' / ' + fila1.querySelector('[data-cf="telefono"]').value);
      dogHost.querySelector('[name="raza"]').value = 'Beagle';
      dogHost.querySelector('[name="tamano"]').value = 'mediano';
      dogHost.querySelector('[name="sexo"]').value = 'macho';
      dogHost.querySelector('[name="castrado"]').value = 'si';
      dogHost.querySelector('[name="observaciones"]').value = 'Alergia al pollo';
      ok('dog form: recuadro "Plan de medicación" presente', dogHost.querySelector('#medicacionBox') !== null && dogHost.querySelector('#medicacionBox legend').textContent.indexOf('Plan de medicación') !== -1, dogHost.querySelector('#medicacionBox legend').textContent);
      var cbTirar = dogHost.querySelector('[name="comportamiento"][value="Tirar de la correa."]');
      var cbSaltar = dogHost.querySelector('[name="comportamiento"][value="Saltar encima."]');
      cbTirar.checked = true; cbTirar.dispatchEvent(new Event('change', { bubbles: true }));
      cbSaltar.checked = true; cbSaltar.dispatchEvent(new Event('change', { bubbles: true }));
      ok('dog form: las notas de comportamiento se cumplimentan solas', dogHost.querySelector('#txtNotas').innerText.indexOf('Tirar de la correa.') !== -1 && dogHost.querySelector('#txtNotas').innerText.indexOf('Saltar encima.') !== -1, dogHost.querySelector('#txtNotas').innerText);
      var refRowN = dogHost.querySelector('.contact-row');
      var refSelN = refRowN.querySelector('[data-ref-select]');
      var refNameN = refRowN.querySelector('[data-ref-name]');
      ok('dog form: campo referido (canal) presente', refSelN !== null && refNameN !== null);
      ok('dog form: "Recomendado por" oculto por defecto', refNameN.hidden === true);
      refSelN.value = 'Boca a boca'; refSelN.dispatchEvent(new Event('change', { bubbles: true }));
      ok('dog form: "Recomendado por" visible con Boca a boca', refRowN.querySelector('[data-ref-name]').hidden === false);
      refRowN.querySelector('[data-cf="referido_por"]').value = 'Laura Gómez';
      refSelN.value = 'Wallapop'; refSelN.dispatchEvent(new Event('change', { bubbles: true }));
      ok('dog form: "Recomendado por" se oculta y limpia con otro canal', refRowN.querySelector('[data-ref-name]').hidden === true && refRowN.querySelector('[data-cf="referido_por"]').value === '');
      refSelN.value = 'Boca a boca'; refSelN.dispatchEvent(new Event('change', { bubbles: true }));
      refRowN.querySelector('[data-cf="referido_por"]').value = 'Laura Gómez';
      dogHost.querySelector('[name="notas_medicacion"]').value = 'Doxiciclina 1 comprimido cada 12 horas. Tras el paseo de la mañana.';
      dogHost.querySelector('[name="medicacion_expira"]').value = C.addDaysISO(today, 30);
      dogHost.querySelector('.dog-form').dispatchEvent(new Event('submit', { cancelable: true }));
      await new Promise(function (r) { setTimeout(r, 250); });
      ok('dog form: guarda perro con humano', (await Store.listDogs({ includeInactive: true })).some(function (d) { return d.nombre === 'Rex' && (d.contact_ids || []).length === 1; }));
      var savedRex = (await Store.listDogs({ includeInactive: true })).find(function (d) { return d.nombre === 'Rex'; });
      var rexContact = await Store.getContact(savedRex.contact_ids[0]);
      ok('dog form: guarda referido y "recomendado por"', rexContact.referido === 'Boca a boca' && rexContact.referido_por === 'Laura Gómez', JSON.stringify(rexContact));
      ok('dog form: guarda castrado', savedRex.castrado === true);
      ok('dog form: guarda observaciones', savedRex.observaciones === 'Alergia al pollo', savedRex.observaciones);
      ok('dog form: guarda comportamientos', savedRex.comportamientos && savedRex.comportamientos.length === 2, JSON.stringify(savedRex.comportamientos));
      ok('dog form: guarda notas de comportamiento', savedRex.notas && savedRex.notas.indexOf('Tirar de la correa.') !== -1 && savedRex.notas.indexOf('Saltar encima.') !== -1, savedRex.notas);
      ok('dog form: guarda notas de medicación', savedRex.notas_medicacion === 'Doxiciclina 1 comprimido cada 12 horas. Tras el paseo de la mañana.', savedRex.notas_medicacion);
      ok('dog form: guarda fecha de expiración del plan', savedRex.medicacion_expira === C.addDaysISO(today, 30), savedRex.medicacion_expira);
      ok('dog form: ya no guarda campos tipo/dosis/frecuencia', savedRex.medicacion === undefined && savedRex.dosis === undefined && savedRex.frecuencia === undefined, JSON.stringify({ m: savedRex.medicacion, d: savedRex.dosis, f: savedRex.frecuencia }));
      var rexHost = document.createElement('div');
      document.body.appendChild(rexHost);
      root.DogForm.render(rexHost, savedRex, { showCancel: false, onSave: function () {} });
      await new Promise(function (r) { setTimeout(r, 200); });
      ok('dog form: edición carga el humano', rexHost.querySelector('[data-cf="nombre"]').value === 'Juan Rex', rexHost.querySelector('[data-cf="nombre"]').value);
      ok('dog form: edición carga raza/tamaño/sexo', rexHost.querySelector('[name="raza"]').value === 'Beagle' && rexHost.querySelector('[name="tamano"]').value === 'mediano' && rexHost.querySelector('[name="sexo"]').value === 'macho');
      ok('dog form: edición carga castrado/observaciones', rexHost.querySelector('[name="castrado"]').value === 'si' && rexHost.querySelector('[name="observaciones"]').value === 'Alergia al pollo');
      ok('dog form: edición carga comportamientos y notas', rexHost.querySelectorAll('input[name="comportamiento"]:checked').length === 2 && rexHost.querySelector('#txtNotas').innerText.indexOf('Tirar de la correa.') !== -1);
      ok('dog form: edición carga las notas de medicación', rexHost.querySelector('[name="notas_medicacion"]').value === 'Doxiciclina 1 comprimido cada 12 horas. Tras el paseo de la mañana.' && rexHost.querySelector('[name="medicacion_expira"]').value === C.addDaysISO(today, 30));
      ok('dog form: edición ya no muestra tipo/dosis/frecuencia', rexHost.querySelector('[name="medicacion"]') === null && rexHost.querySelector('[name="dosis"]') === null && rexHost.querySelector('[name="frecuencia"]') === null);
      rexHost.querySelector('.dog-form').dispatchEvent(new Event('submit', { cancelable: true }));
      await new Promise(function (r) { setTimeout(r, 250); });
      ok('dog form: guardar tras editar conserva el humano', (await Store.getDog(savedRex.id)).contact_ids.length === 1);

      /* Regresión: guardar repetidamente un perro editado no debe duplicar contactos ni dejar huérfanos */
      var cidRex = (await Store.getDog(savedRex.id)).contact_ids[0];
      for (var rep = 0; rep < 3; rep++) {
        root.DogForm.render(rexHost, (await Store.getDog(savedRex.id)), { showCancel: false, onSave: function () {} });
        await new Promise(function (r) { setTimeout(r, 200); });
        rexHost.querySelector('.dog-form').dispatchEvent(new Event('submit', { cancelable: true }));
        await new Promise(function (r) { setTimeout(r, 250); });
      }
      var cidAfter = (await Store.getDog(savedRex.id)).contact_ids[0];
      ok('dog form: el contacto conserva su id tras guardados repetidos', cidAfter === cidRex, cidRex + ' vs ' + cidAfter);
      var dups = (await Store.listContacts()).filter(function (c) { return c.nombre === 'Juan Rex'; });
      ok('dog form: sin contactos duplicados tras editar 3 veces', dups.length === 1, dups.length);
      var removedByClean = await Store.cleanOrphanContacts();
      ok('dog form: sin contactos huérfanos tras guardar', removedByClean === 0, removedByClean);

      log('== Fase 9b: deceso (checkbox + ocultar decesos) ==');
      var decesoHost = document.createElement('div');
      document.body.appendChild(decesoHost);
      root.DogForm.render(decesoHost, { nombre: 'PerroDeceso', activo: true, fecha_deceso: '2025-03-01', contact_ids: [] }, { showCancel: false, onSave: function () {} });
      ok('deceso: checkbox presente', decesoHost.querySelector('[name="es_deceso"]') !== null);
      ok('deceso: fecha cumplimentada → checkbox marcado', decesoHost.querySelector('[name="es_deceso"]').checked === true, decesoHost.querySelector('[name="es_deceso"]').checked);
      ok('deceso: fecha visible y no deshabilitada', decesoHost.querySelector('[name="fecha_deceso"]').value === '2025-03-01' && decesoHost.querySelector('[name="fecha_deceso"]').disabled === false, decesoHost.querySelector('[name="fecha_deceso"]').value);
      root.DogForm.render(decesoHost, { nombre: 'PerroVivo', activo: true, contact_ids: [] }, { showCancel: false, onSave: function () {} });
      ok('deceso: sin fecha → checkbox desmarcado', decesoHost.querySelector('[name="es_deceso"]').checked === false);
      var chk2 = decesoHost.querySelector('[name="es_deceso"]');
      chk2.click();
      ok('deceso: marcar permite fecha vacía (opcional)', decesoHost.querySelector('[name="fecha_deceso"]').value === '' && decesoHost.querySelector('[name="fecha_deceso"]').disabled === false, decesoHost.querySelector('[name="fecha_deceso"]').value);
      decesoHost.querySelector('[name="fecha_deceso"]').value = '2025-05-01';
      decesoHost.querySelector('[name="fecha_deceso"]').dispatchEvent(new Event('input', { bubbles: true }));
      ok('deceso: marcar mantiene fecha cumplimentada', decesoHost.querySelector('[name="fecha_deceso"]').value === '2025-05-01' && decesoHost.querySelector('[name="es_deceso"]').checked === true);
      chk2.click();
      ok('deceso: desmarcar limpia la fecha', decesoHost.querySelector('[name="fecha_deceso"]').value === '');

      root.DogForm.render(decesoHost, { nombre: 'FallecerSinFecha', activo: true, es_deceso: true, contact_ids: [] }, { showCancel: false, onSave: function () {} });
      ok('deceso: es_deceso true sin fecha → checkbox marcado', decesoHost.querySelector('[name="es_deceso"]').checked === true && decesoHost.querySelector('[name="fecha_deceso"]').value === '');
      var fSolo = await Store.saveDog({ nombre: 'FallecerSinFecha', activo: true, es_deceso: true, contact_ids: [] });
      ok('deceso: guardado persiste es_deceso=true sin fecha', fSolo.es_deceso === true && fSolo.fecha_deceso == null);
      root.DogForm.render(decesoHost, fSolo, { showCancel: false, onSave: function () {} });
      ok('deceso: al recargar fallecido sin fecha sigue marcado', decesoHost.querySelector('[name="es_deceso"]').checked === true && decesoHost.querySelector('[name="fecha_deceso"]').value === '');
      await Store.deleteDogPhysical(fSolo.id);

      await Views.configuracion.render(host, [], ctx);
      var ocultChk = document.getElementById('cfgOcultarDecesos');
      ok('settings: checkbox ocultar decesos presente', ocultChk !== null);
      Store.setConfig({ ocultarDecesos: false });
      await Views.configuracion.render(host, [], ctx);
      ok('settings: checkbox sin marcar por defecto', document.getElementById('cfgOcultarDecesos').checked === false);
      document.getElementById('cfgOcultarDecesos').click();
      ok('settings: al marcar guarda config', Store.getConfig().ocultarDecesos === true);
      await Views.configuracion.render(host, [], ctx);
      ok('settings: vuelve a mostrar marcado', document.getElementById('cfgOcultarDecesos').checked === true);

      var fallecido = await Store.saveDog({ nombre: 'Fallecido Test', activo: true, fecha_deceso: '2024-01-01', contact_ids: [seed.c.c1.id] });
      Store.setConfig({ ocultarDecesos: false });
      await Views.servicios.render(host, ['nuevo'], ctx);
      ok('deceso: perro fallecido visible sin ocultar', host.querySelector('#dogCheckboxList').textContent.indexOf('Fallecido Test') !== -1);
      Store.setConfig({ ocultarDecesos: true });
      await Views.servicios.render(host, ['nuevo'], ctx);
      ok('deceso: perro fallecido oculto con config activa', host.querySelector('#dogCheckboxList').textContent.indexOf('Fallecido Test') === -1, host.querySelector('#dogCheckboxList').textContent);
      ok('deceso: perros vivos siguen visibles', host.querySelector('#dogCheckboxList').textContent.indexOf('Zelda') !== -1);
      var fallecido2 = await Store.saveDog({ nombre: 'Fallecido Sin Fecha', activo: true, es_deceso: true, contact_ids: [seed.c.c1.id] });
      await Views.servicios.render(host, ['nuevo'], ctx);
      ok('deceso: fallecido sin fecha oculto con config activa', host.querySelector('#dogCheckboxList').textContent.indexOf('Fallecido Sin Fecha') === -1);
      await Store.deleteDogPhysical(fallecido2.id);
      Store.setConfig({ ocultarDecesos: false });
      await Store.deleteDogPhysical(fallecido.id);
      await Store.cleanOrphanContacts();

      log('== Fase 9c: alarmas (destino cuidador) ==');
      await Views.servicios.render(host, ['nuevo'], ctx);
      ok('alarma: sección presente antes de comunicaciones', host.querySelector('#alarmaBox') !== null && host.querySelector('#btnComms') !== null);
      ok('alarma: solo con hora y enlace (sin duplicar notificación en la app)', host.querySelector('#alarmaHora') !== null && host.querySelector('#alarmaLink') !== null && host.querySelector('#alarmaCantidad') === null && host.querySelector('#alarmaActiva') === null);
      var lForm = host.querySelector('#svcForm');
      var linp = function (n) { return lForm.querySelector('[name="' + n + '"]'); };
      linp('desde').value = '2026-12-01'; linp('desde').dispatchEvent(new Event('input', { bubbles: true }));
      linp('hasta').value = '2026-12-05'; linp('hasta').dispatchEvent(new Event('input', { bubbles: true }));
      var alBox = host.querySelector('#dogCheckboxList input[value="' + zd.id + '"]');
      alBox.checked = true; alBox.dispatchEvent(new Event('change', { bubbles: true }));
      var alHref = host.querySelector('#alarmaLink').getAttribute('href');
      ok('alarma: genera enlace Google Calendar con fecha y hora', !!alHref && alHref.indexOf('calendar.google.com/calendar/render') !== -1 && alHref.indexOf('20261201T090000/20261205T090000') !== -1, String(alHref));
      ok('alarma: evento con hora (permite avisos en minutos/horas/días)', !!alHref && /\d{8}T\d{6}\/\d{8}T\d{6}$/.test(alHref.split('dates=')[1].split('&')[0]), String(alHref));
      ok('alarma: texto y detalles incluidos', !!alHref && alHref.indexOf('details=') !== -1 && decodeURIComponent(alHref).indexOf('Evento de servicio') !== -1);
      linp('notas').value = 'Claves en conserjería';
      linp('notas').dispatchEvent(new Event('input', { bubbles: true }));
      var alHref2 = host.querySelector('#alarmaLink').getAttribute('href');
      var alDet = decodeURIComponent((alHref2.split('details=')[1] || '').split('&')[0]).replace(/\+/g, ' ');
      ok('alarma: notas internas incluidas entre Perros y Desde', alDet.indexOf('Perros:') < alDet.indexOf('Notas internas: Claves en conserjería') && alDet.indexOf('Notas internas: Claves en conserjería') < alDet.indexOf('Desde:'), alDet);
      linp('notas').value = '';
      linp('notas').dispatchEvent(new Event('input', { bubbles: true }));
      ok('alarma: sin notas no se incluye la línea', decodeURIComponent(host.querySelector('#alarmaLink').getAttribute('href')).indexOf('Notas internas:') === -1);
      var ln2 = host.querySelector('#alarmaHora');
      ln2.value = '16:30';
      ln2.dispatchEvent(new Event('input', { bubbles: true }));
      ok('alarma: el enlace se refresca al cambiar la hora', host.querySelector('#alarmaLink').getAttribute('href').indexOf('20261201T163000/20261205T163000') !== -1, host.querySelector('#alarmaLink').getAttribute('href'));
      await Views.servicios.render(host, ['nuevo'], ctx);
      ok('alarma: sin datos el enlace está deshabilitado', host.querySelector('#alarmaLink').getAttribute('href') === null);

      log('== Fase 10: datos de ejemplo (semilla local de pruebas) ==');
      await Store.clearAllExceptConfig();
      await Store.ensureDefaultTemplates();
      var seed10 = await seedPlanner();
      // Loki con observaciones/comportamientos como en el antiguo seed de ejemplo
      await Store.saveDog(Object.assign({}, seed10.d.d1, { observaciones: 'Alergia leve al pollo', comportamientos: ['Tirar de la correa.', 'Saltar encima.'], notas: 'Tirar de la correa.\nSaltar encima.' }));
      var seed10c = await Store.listContacts();
      var seed10d = await Store.listDogs({ includeInactive: true });
      var seed10s = await Store.listServices();
      ok('seed: 5 contactos', seed10c.length === 5, seed10c.length);
      ok('seed: 5 perros', seed10d.length === 5, seed10d.length);
      ok('seed: 11 servicios', seed10s.length === 11, seed10s.length);
      var seedDogs = await Store.listDogs({ includeInactive: true });
      var seedSvcs = await Store.listServices();
      var seedByName = {};
      seedDogs.forEach(function (d) { seedByName[d.nombre] = d; });
      function seedAcum(name) {
        var total = 0;
        var id = seedByName[name] && seedByName[name].id;
        seedSvcs.forEach(function (s) {
          if (s.estado === 'cancelado' || !id || !(s.dog_ids || []).includes(id)) return;
          total += C.num(s.coste_total) / Math.max(1, (s.dog_ids || []).length);
        });
        return C.round2(total);
      }
      ok('seed: Loki acumulado = 210', eq(seedAcum('Loki'), 210), seedAcum('Loki'));
      ok('seed: Kira acumulado = 320.5', eq(seedAcum('Kira'), 320.5), seedAcum('Kira'));
      ok('seed: servicio cruza año S8 = 200', seedSvcs.some(function (s) { return s.desde === '2026-12-30' && eq(C.num(s.coste_total), 200); }));
      ok('seed: Loki raza/tamaño/sexo', seedByName['Loki'].raza === 'Beagle' && seedByName['Loki'].tamano === 'mediano' && seedByName['Loki'].sexo === 'macho', JSON.stringify(seedByName['Loki']));
      ok('seed: Loki castrado/observaciones/comportamientos', seedByName['Loki'].castrado === true && seedByName['Loki'].observaciones === 'Alergia leve al pollo' && (seedByName['Loki'].comportamientos || []).length === 2, JSON.stringify(seedByName['Loki']));
      await Views.perros.render(host, ['list'], ctx);
      await new Promise(function (r) { setTimeout(r, 80); });
      var dogTHead = host.querySelector('#dogTbody').parentElement.querySelector('thead').textContent;
      ok('perros: columnas Raza/Sexo/Tamaño/Castrado', dogTHead.indexOf('Raza') !== -1 && dogTHead.indexOf('Sexo') !== -1 && dogTHead.indexOf('Tamaño') !== -1 && dogTHead.indexOf('Castrado') !== -1, dogTHead);
      ok('perros: retiradas Últ. precio día e Importe acumulado', dogTHead.indexOf('Últ. precio día') === -1 && dogTHead.indexOf('Importe acumulado') === -1 && dogTHead.indexOf('Últ. servicio') !== -1, dogTHead);
      ok('perros: la lista muestra los datos', host.querySelector('#dogTbody').textContent.indexOf('Beagle') !== -1 && host.querySelector('#dogTbody').textContent.indexOf('Hembra') !== -1);

      /* Preferencia: ocultar perros con RED FLAG solo en el formulario de servicios */
      Store.setConfig({ ocultarRedFlags: false });
      await Store.saveDog(Object.assign({}, seedByName['Loki'], { comportamientos: ['RED FLAG.', 'Tirar de la correa.'] }));
      await Views.servicios.render(host, ['nuevo'], ctx);
      ok('redflag: Loki visible en el alta de servicios sin preferencia', host.querySelector('#dogCheckboxList').textContent.indexOf('Loki') !== -1);
      Store.setConfig({ ocultarRedFlags: true });
      await Views.servicios.render(host, ['nuevo'], ctx);
      var rfBox = host.querySelector('#dogCheckboxList').textContent;
      ok('redflag: con preferencia Loki (RED FLAG) oculto en el alta de servicios', rfBox.indexOf('Loki') === -1, rfBox);
      ok('redflag: otros perros siguen visibles en el alta de servicios', rfBox.indexOf('Kira') !== -1 && rfBox.indexOf('Nala') !== -1, rfBox);
      await Views.perros.render(host, ['list'], ctx);
      await new Promise(function (r) { setTimeout(r, 80); });
      ok('redflag: en la lista general de perros Loki sigue apareciendo', host.querySelector('#dogTbody').textContent.indexOf('Loki') !== -1);
      Store.setConfig({ ocultarRedFlags: false });
      await Store.saveDog(Object.assign({}, seedByName['Loki'], { comportamientos: ['Tirar de la correa.', 'Saltar encima.'] }));

      await Views.configuracion.render(host, [], ctx);
      ok('settings: checkbox ocultar RED FLAG presente', document.getElementById('cfgOcultarRedFlags') !== null);
      ok('settings: checkbox RED FLAG sin marcar por defecto', document.getElementById('cfgOcultarRedFlags').checked === false);
      document.getElementById('cfgOcultarRedFlags').click();
      ok('settings: al marcar RED FLAG guarda config', Store.getConfig().ocultarRedFlags === true);
      Store.setConfig({ ocultarRedFlags: false });
      ok('settings: sin botón de datos de ejemplo', host.querySelector('#btnSeed') === null);
      await new Promise(function (r) { setTimeout(r, 50); });
      var dbSizeEl = host.querySelector('#dbSizeVal');
      ok('settings: campo de tamaño de BBDD presente', dbSizeEl !== null);
      ok('settings: tamaño de BBDD calculado (bytes + KB)', dbSizeEl !== null && /bytes/.test(dbSizeEl.textContent) && /KB/.test(dbSizeEl.textContent) && dbSizeEl.textContent.indexOf('Calculando') === -1, dbSizeEl ? dbSizeEl.textContent : 'sin campo');
      var szBytes = await Store.dbSize();
      ok('settings: Store.dbSize() > 0 con datos', szBytes > 0, szBytes);

      log('== Fase 11a: unicidad de contactos (teléfono/whatsapp/telegram como claves únicas) ==');
      var ana = (await Store.listContacts()).find(function (c) { return c.nombre === 'Ana Martínez'; });
      var maria = (await Store.listContacts()).find(function (c) { return c.nombre === 'María López'; });
      var lucia = (await Store.listContacts()).find(function (c) { return c.nombre === 'Lucía Fernández'; });
      ok('unicidad: contactos seed presentes', ana && maria && lucia);
      var dupAna = await Store.saveContact({ nombre: 'Ana M', telefono: '600111222', telegram: '', whatsapp: '' });
      ok('unicidad: mismo teléfono → reutiliza el contacto existente', dupAna.id === ana.id, dupAna.id + ' vs ' + ana.id);
      ok('unicidad: no crea duplicado', (await Store.listContacts()).filter(function (c) { return c.nombre === 'Ana M'; }).length === 0);
      var dupAna2 = await Store.saveContact({ nombre: 'Ana M2', telefono: '600 111 222', telegram: '', whatsapp: '' });
      ok('unicidad: teléfono con espacios/formatos → reutiliza', dupAna2.id === ana.id, dupAna2.id);
      var dupMaria = await Store.saveContact({ nombre: 'María M', telefono: '', telegram: '', whatsapp: '+34 600 999 000' });
      ok('unicidad: whatsapp con +34 → reutiliza', dupMaria.id === maria.id, dupMaria.id + ' vs ' + maria.id);
      var dupLucia = await Store.saveContact({ nombre: 'Lucía L', telefono: '', telegram: '@LUCIaf', whatsapp: '' });
      ok('unicidad: telegram ignora @/mayúsculas → reutiliza', dupLucia.id === lucia.id, dupLucia.id + ' vs ' + lucia.id);
      var nuevo = await Store.saveContact({ nombre: 'Nuevo Único', telefono: '611000000', telegram: '@nuevo', whatsapp: '' });
      ok('unicidad: contacto con datos nuevos sí se crea', nuevo.id !== undefined && (await Store.getContact(nuevo.id)) !== undefined);
      var reseed = await Store.saveContact({ nombre: 'Nuevo Único', telefono: '611 000 000', telegram: '@nuevo', whatsapp: '' });
      ok('unicidad: guardar de nuevo sin id → reutiliza su propio id', reseed.id === nuevo.id, reseed.id + ' vs ' + nuevo.id);
      var perroUnico = await Store.saveDogWithContacts({ nombre: 'Perro Único', fecha_nacimiento: '2022-01-01', activo: true }, [{ nombre: 'Ana Martínez', telefono: '600111222', telegram: '', whatsapp: '' }]);
      var perroUnicoSaved = await Store.getDog(perroUnico.id);
      ok('unicidad: perro asocia el contacto existente (no crea otro)', perroUnicoSaved.contact_ids.length === 1 && perroUnicoSaved.contact_ids[0] === ana.id, perroUnicoSaved.contact_ids[0] + ' vs ' + ana.id);
      var perroDupe = await Store.saveDogWithContacts({ nombre: 'Perro Dupe', fecha_nacimiento: '2022-02-02', activo: true }, [
        { nombre: 'Dupe X', telefono: '622000111', telegram: '', whatsapp: '' },
        { nombre: 'Dupe Y', telefono: '622 000 111', telegram: '', whatsapp: '' }
      ]);
      var perroDupeSaved = await Store.getDog(perroDupe.id);
      ok('dedupe save: perro con 2 contactos mismo teléfono → 1 id', perroDupeSaved.contact_ids.length === 1, perroDupeSaved.contact_ids.length);
      ok('dedupe save: solo existe un contacto con ese teléfono', (await Store.listContacts()).filter(function (c) { return C.normalizePhone(c.telefono) === '622000111'; }).length === 1);

      log('== Fase 11b: dedupeContacts (limpieza de duplicados previos) ==');
      await DB.put('contacts', { id: 'dz1', nombre: 'Zoe Dup', telefono: '633111222', telegram: '', whatsapp: '' });
      await DB.put('contacts', { id: 'dz2', nombre: 'Zoe', telefono: '633 111 222', telegram: '', whatsapp: '' });
      var perroZoe = await Store.saveDog({ nombre: 'Perro Zoe', fecha_nacimiento: '2022-03-03', activo: true, contact_ids: ['dz1', 'dz2'] });
      var merged = await Store.dedupeContacts();
      ok('dedupe: fusiona duplicados previos', merged >= 1, merged);
      var perroZoeSaved = await Store.getDog(perroZoe.id);
      ok('dedupe: perro apunta a un único contacto', new Set(perroZoeSaved.contact_ids).size === 1, JSON.stringify(perroZoeSaved.contact_ids));
      ok('dedupe: solo queda un contacto con ese teléfono', (await Store.listContacts()).filter(function (c) { return C.normalizePhone(c.telefono) === '633111222'; }).length === 1, (await Store.listContacts()).filter(function (c) { return C.normalizePhone(c.telefono) === '633111222'; }).length);

      log('== Fase 11: edición de comportamientos en Configuración ==');
      await Views.configuracion.render(host, [], ctx);
      ok('settings: sección comportamientos', host.querySelector('#behavEditor') !== null);
      ok('settings: 4 categorías por defecto', host.querySelectorAll('.behav-group').length === 4, host.querySelectorAll('.behav-group').length);
      var g0 = host.querySelector('.behav-group');
      g0.querySelector('[data-grupo-titulo]').value = 'Con la familia';
      g0.querySelector('[data-grupo-titulo]').dispatchEvent(new Event('input', { bubbles: true }));
      g0.querySelector('[data-add-item]').click();
      g0 = host.querySelector('.behav-group');
      var rows = g0.querySelectorAll('[data-item-texto]');
      rows[rows.length - 1].value = 'Nuevo comportamiento de prueba';
      rows[rows.length - 1].dispatchEvent(new Event('input', { bubbles: true }));
      var saltarRow = Array.from(g0.querySelectorAll('.behav-item-row')).find(function (r) { return r.querySelector('[data-item-texto]').value === 'Saltar encima.'; });
      var sel = saltarRow.querySelector('[data-item-grupo]');
      sel.value = '1'; sel.dispatchEvent(new Event('change', { bubbles: true }));
      function groupItems(el) { return Array.from(el.querySelectorAll('[data-item-texto]')).map(function (i) { return i.value; }); }
      var g0r = host.querySelectorAll('.behav-group')[0];
      var g1 = host.querySelectorAll('.behav-group')[1];
      ok('settings: comportamiento movido de categoría', groupItems(g1).indexOf('Saltar encima.') !== -1 && groupItems(g0r).indexOf('Saltar encima.') === -1, JSON.stringify(groupItems(g1)));
      var delRow = Array.from(g1.querySelectorAll('.behav-item-row')).find(function (r) { return r.querySelector('[data-item-texto]').value === 'Saltar encima.'; });
      delRow.querySelector('[data-del-item]').click();
      g1 = host.querySelectorAll('.behav-group')[1];
      ok('settings: comportamiento borrado', groupItems(g1).indexOf('Saltar encima.') === -1, JSON.stringify(groupItems(g1)));
      host.querySelector('#behavAddGroup').click();
      ok('settings: categoría añadida', host.querySelectorAll('.behav-group').length === 5, host.querySelectorAll('.behav-group').length);
      host.querySelector('#behavSave').click();
      var cfg = Store.getConfig();
      ok('settings: guarda título de categoría', cfg.comportamientos[0].titulo === 'Con la familia', JSON.stringify(cfg.comportamientos[0]));
      ok('settings: guarda comportamiento nuevo', cfg.comportamientos.some(function (g) { return g.items.indexOf('Nuevo comportamiento de prueba') !== -1; }));
      ok('settings: comportamiento movido y borrado no se guarda', !cfg.comportamientos.some(function (g) { return g.items.indexOf('Saltar encima.') !== -1; }), JSON.stringify(cfg.comportamientos));
      var cfgForm = document.createElement('div');
      document.body.appendChild(cfgForm);
      root.DogForm.render(cfgForm, { nombre: 'Cfg', activo: true }, { showCancel: false, onSave: function () {} });
      var cfgCbs = Array.from(cfgForm.querySelectorAll('input[name="comportamiento"]')).map(function (cb) { return cb.value; });
      ok('dog form: usa comportamientos de configuración', cfgCbs.indexOf('Nuevo comportamiento de prueba') !== -1 && cfgCbs.indexOf('Saltar encima.') === -1, cfgCbs.length);

      log('== Fase 12: orden y renombrado de comportamientos ==');
      ok('config: comportamientos por defecto ordenados alfabéticamente', Store.defaultComportamientos().every(function (g) {
        return g.items.every(function (it, i, a) { return i === 0 || a[i - 1].localeCompare(it, 'es') <= 0; });
      }));
      ok('notas: agrupadas con categoría en negrita', savedRex.notas.indexOf('<strong>A personas:</strong>') !== -1 && savedRex.notas.indexOf('<strong>Durante los paseos:</strong>') !== -1, savedRex.notas);
      await Views.configuracion.render(host, [], ctx);
      var gB = host.querySelector('.behav-group');
      var bFirst = gB.querySelectorAll('.behav-item-row')[0].querySelector('[data-item-texto]').value;
      gB.querySelectorAll('.behav-item-row')[0].querySelector('[data-move-down]').click();
      ok('settings: el botón bajar reordena', host.querySelectorAll('.behav-group')[0].querySelectorAll('.behav-item-row')[0].querySelector('[data-item-texto]').value !== bFirst, host.querySelectorAll('.behav-group')[0].querySelectorAll('.behav-item-row')[0].querySelector('[data-item-texto]').value);
      host.querySelectorAll('.behav-group')[0].querySelectorAll('.behav-item-row')[1].querySelector('[data-move-up]').click();
      ok('settings: el botón subir restaura el orden', host.querySelectorAll('.behav-group')[0].querySelectorAll('.behav-item-row')[0].querySelector('[data-item-texto]').value === bFirst);
      var oldB = Store.getConfig().comportamientos[0].items[0];
      var newB = oldB + ' (renombrado)';
      var dRen = await Store.saveDog({ nombre: 'PerroRenombrado', activo: true, contact_ids: [], comportamientos: [oldB], notas: oldB });
      async function attemptRename(oldV) {
        await Views.configuracion.render(host, [], ctx);
        var gR = host.querySelector('.behav-group');
        var rRow = Array.from(gR.querySelectorAll('.behav-item-row')).find(function (r) { return r.querySelector('[data-item-texto]').value === oldV; });
        rRow.querySelector('[data-item-texto]').value = newB;
        rRow.querySelector('[data-item-texto]').dispatchEvent(new Event('input', { bubbles: true }));
        host.querySelector('#behavSave').click();
      }
      await attemptRename(oldB);
      ok('rename: muestra aviso de confirmación', document.querySelector('.modal-box [data-act="yes"]') !== null);
      var noBtn = document.querySelector('.modal-box [data-act="no"]');
      if (noBtn) noBtn.click();
      ok('rename: cancelar no guarda el nombre', !Store.getConfig().comportamientos.some(function (g) { return g.items.indexOf(newB) !== -1; }));
      await new Promise(function (r) { setTimeout(r, 300); });
      await attemptRename(oldB);
      var yesBtn = document.querySelector('.modal-box [data-act="yes"]');
      ok('rename: avisa de nuevo al reintentar', yesBtn !== null);
      if (yesBtn) yesBtn.click();
      await new Promise(function (r) { setTimeout(r, 400); });
      var cfgRen = Store.getConfig();
      ok('rename: aceptar guarda el nombre', cfgRen.comportamientos.some(function (g) { return g.items.indexOf(newB) !== -1; }) && !cfgRen.comportamientos.some(function (g) { return g.items.indexOf(oldB) !== -1; }), JSON.stringify(cfgRen.comportamientos));
      var dRenReload = await Store.getDog(dRen.id);
      ok('rename: actualiza los comportamientos del perro', dRenReload.comportamientos.indexOf(newB) !== -1 && dRenReload.comportamientos.indexOf(oldB) === -1, JSON.stringify(dRenReload.comportamientos));
      ok('rename: actualiza las notas del perro', dRenReload.notas === newB, dRenReload.notas);
      await Store.deleteDogPhysical(dRen.id);
      await Store.cleanOrphanContacts();

      log('== Fase 13: canales de captación en Configuración ==');
      await Views.configuracion.render(host, [], ctx);
      ok('settings: sección canales de captación', host.querySelector('#captEditor') !== null);
      ok('settings: 5 canales por defecto (Wallapop, Holidog, TopAyuda, Captación directa, Boca a boca)', host.querySelectorAll('.capt-row').length === 5, host.querySelectorAll('.capt-row').length);
      host.querySelector('#captAdd').click();
      var capRowLast = host.querySelectorAll('.capt-row')[host.querySelectorAll('.capt-row').length - 1];
      var capInp = capRowLast.querySelector('[data-canal-nombre]');
      capInp.value = 'Recomendación vecinal'; capInp.dispatchEvent(new Event('input', { bubbles: true }));
      host.querySelector('#captSave').click();
      ok('settings: guarda canal añadido', Store.getConfig().captacion.some(function (ch) { return ch.nombre === 'Recomendación vecinal'; }));
      var addedRow = Array.from(host.querySelectorAll('.capt-row')).find(function (r) { return r.querySelector('[data-canal-nombre]').value === 'Recomendación vecinal'; });
      addedRow.querySelector('[data-del-canal]').click();
      host.querySelector('#captSave').click();
      ok('settings: borra canal', !Store.getConfig().captacion.some(function (ch) { return ch.nombre === 'Recomendación vecinal'; }));
      var renContact = await Store.saveContact({ nombre: 'Ren Test', telefono: '612345678', referido: 'Wallapop', whatsapp: '', telegram: '', otros: '' });
      var wallRow = Array.from(host.querySelectorAll('.capt-row')).find(function (r) { return r.querySelector('[data-canal-nombre]').value === 'Wallapop'; });
      wallRow.querySelector('[data-canal-nombre]').value = 'Wallapop VIP';
      wallRow.querySelector('[data-canal-nombre]').dispatchEvent(new Event('input', { bubbles: true }));
      host.querySelector('#captSave').click();
      await new Promise(function (r) { setTimeout(r, 300); });
      var renReload = await Store.getContact(renContact.id);
      ok('settings: renombrar canal propaga a humanos asignados', renReload.referido === 'Wallapop VIP', renReload.referido);
      var wallRow2 = Array.from(host.querySelectorAll('.capt-row')).find(function (r) { return r.querySelector('[data-canal-nombre]').value === 'Wallapop VIP'; });
      wallRow2.querySelector('[data-canal-nombre]').value = 'Wallapop';
      wallRow2.querySelector('[data-canal-nombre]').dispatchEvent(new Event('input', { bubbles: true }));
      host.querySelector('#captSave').click();
      await new Promise(function (r) { setTimeout(r, 300); });
      await Store.deleteContact(renContact.id);
      await Store.cleanOrphanContacts();

      log('== Fase 13b: contacto humano compartido por dos perros (canal de captación y teléfono) ==');
      var judit = await Store.saveContact({ nombre: 'Judit', telefono: '611222333', telegram: '', whatsapp: '', otros: '', referido: '' });
      var inuk = await Store.saveDog({ nombre: 'Inuk', activo: true, contact_ids: [judit.id] });
      var sia = await Store.saveDog({ nombre: 'Sia', activo: true, contact_ids: [judit.id] });

      var capSia = document.createElement('div');
      document.body.appendChild(capSia);
      root.DogForm.render(capSia, { id: sia.id, nombre: 'Sia', activo: true, contact_ids: [judit.id] }, { showCancel: false, onSave: function () {} });
      await new Promise(function (r) { setTimeout(r, 250); });
      var siaRow = capSia.querySelector('.contact-row');
      var siaCid = siaRow ? (siaRow.dataset.cid || '') : '';
      var siaSel = siaRow ? siaRow.querySelector('[data-ref-select]') : null;
      ok('canal: la fila de Judit en Sia carga su id', siaCid === judit.id, 'cid=' + siaCid);
      if (siaSel) { siaSel.value = 'Wallapop'; siaSel.dispatchEvent(new Event('change', { bubbles: true })); }
      capSia.querySelector('.dog-form').dispatchEvent(new Event('submit', { cancelable: true }));
      await new Promise(function (r) { setTimeout(r, 300); });
      var juditPost = await Store.getContact(judit.id);
      ok('canal: Judit conserva su id tras guardar desde Sia', juditPost && juditPost.id === judit.id, juditPost ? juditPost.id : 'borrado');
      ok('canal: Judit guarda el canal Wallapop', juditPost && juditPost.referido === 'Wallapop', juditPost ? juditPost.referido : '?');
      var inukPost = await Store.getDog(inuk.id);
      ok('canal: Inuk sigue apuntando al mismo contacto Judit', inukPost && (inukPost.contact_ids || []).indexOf(judit.id) !== -1, JSON.stringify(inukPost && inukPost.contact_ids));

      var capInuk = document.createElement('div');
      document.body.appendChild(capInuk);
      try {
        root.DogForm.render(capInuk, inukPost, { showCancel: false, onSave: function () {} });
      } catch (e) { log('  DogForm(Inuk) lanzó: ' + (e && e.stack ? e.stack : e)); }
      await new Promise(function (r) { setTimeout(r, 250); });
      var inukRow = capInuk.querySelector('.contact-row');
      var inukSel = inukRow ? inukRow.querySelector('[data-ref-select]') : null;
      ok('canal: la ficha de Inuk renderiza la fila de contacto', inukRow !== null && inukSel !== null, inukRow ? 'fila sin select' : 'sin fila');
      ok('canal: la ficha de Inuk muestra el canal de Judit', inukSel !== null && inukSel.value === 'Wallapop', inukSel ? inukSel.value : 'sin select');

      var phSia = document.createElement('div');
      document.body.appendChild(phSia);
      root.DogForm.render(phSia, await Store.getDog(sia.id), { showCancel: false, onSave: function () {} });
      await new Promise(function (r) { setTimeout(r, 250); });
      var phRow = phSia.querySelector('.contact-row');
      phRow.querySelector('[data-cf="telefono"]').value = '699000111';
      phSia.querySelector('.dog-form').dispatchEvent(new Event('submit', { cancelable: true }));
      await new Promise(function (r) { setTimeout(r, 300); });
      var juditNew = await Store.getContact(judit.id);
      ok('telefono: Judit actualiza su teléfono desde Sia', juditNew && juditNew.telefono === '699000111', juditNew ? juditNew.telefono : '?');
      var inukB = await Store.getDog(inuk.id);
      ok('telefono: Inuk sigue apuntando a Judit', inukB && (inukB.contact_ids || []).indexOf(judit.id) !== -1, JSON.stringify(inukB && inukB.contact_ids));
      ok('telefono: no se duplica el contacto (1 con ese teléfono)', (await Store.listContacts()).filter(function (c) { return C.normalizePhone(c.telefono) === '699000111'; }).length === 1);

      var phInuk = document.createElement('div');
      document.body.appendChild(phInuk);
      root.DogForm.render(phInuk, inukB, { showCancel: false, onSave: function () {} });
      await new Promise(function (r) { setTimeout(r, 250); });
      var inukTf = phInuk.querySelector('.contact-row [data-cf="telefono"]');
      ok('telefono: la ficha de Inuk muestra el nuevo teléfono de Judit', inukTf && inukTf.value === '699000111', inukTf ? inukTf.value : 'sin input');

      /* El humano sin teléfono no debe duplicarse: la misma persona tecleada en dos perros
         debe reutilizar el mismo contacto y compartir el canal de captación. */
      var inuk2 = await Store.saveDogWithContacts({ nombre: 'Inuk2', activo: true }, []);
      var sia2 = await Store.saveDogWithContacts({ nombre: 'Sia2', activo: true }, []);
      await Store.saveDogWithContacts({ id: inuk2.id, nombre: 'Inuk2', activo: true, contact_ids: inuk2.contact_ids }, [{ nombre: 'Pilar', telefono: '', telegram: '', whatsapp: '', otros: '', referido: '' }]);
      var sia2Saved = await Store.saveDogWithContacts({ id: sia2.id, nombre: 'Sia2', activo: true, contact_ids: sia2.contact_ids }, [{ nombre: 'Pilar', telefono: '', telegram: '', whatsapp: '', otros: '', referido: 'Holidog' }]);
      var inuk2Post = await Store.getDog(inuk2.id);
      ok('canal: humano sin teléfono reutiliza el mismo contacto (1 registro)', sia2Saved.contact_ids[0] === inuk2Post.contact_ids[0], sia2Saved.contact_ids[0] + ' vs ' + inuk2Post.contact_ids[0]);
      var totalPli = (await Store.listContacts()).filter(function (c) { return C.normalizeName(c.nombre) === 'pilar'; }).length;
      ok('canal: solo existe un registro "Pilar"', totalPli === 1, totalPli);
      var pilarC = await Store.getContact(inuk2Post.contact_ids[0]);
      ok('canal: el canal se guarda en el contacto compartido', pilarC.referido === 'Holidog', pilarC ? pilarC.referido : '?');
      var inuk2Host = document.createElement('div');
      document.body.appendChild(inuk2Host);
      root.DogForm.render(inuk2Host, inuk2Post, { showCancel: false, onSave: function () {} });
      await new Promise(function (r) { setTimeout(r, 250); });
      var inuk2Sel = inuk2Host.querySelector('.contact-row [data-ref-select]');
      ok('canal: la ficha de Inuk2 muestra el canal de Pilar', inuk2Sel && inuk2Sel.value === 'Holidog', inuk2Sel ? inuk2Sel.value : 'sin select');

      /* dedupeContacts fusiona por nombre los humanos sin teléfono (restos de duplicados) y conserva el canal */
      var bp1 = await Store._putContact({ nombre: 'Pepa N', telefono: '', telegram: '', whatsapp: '', otros: '', referido: '' });
      var bp2 = await Store._putContact({ nombre: 'PEPA n', telefono: '', telegram: '', whatsapp: '', otros: '', referido: 'TopAyuda' });
      var bpDog = await Store.saveDog({ nombre: 'PepaDog', activo: true, contact_ids: [bp1.id] });
      var merges = await Store.dedupeContacts();
      ok('dedupe: sin teléfono fusiona por nombre', merges >= 1, merges);
      var survivors = (await Store.listContacts()).filter(function (c) { return C.normalizeName(c.nombre) === 'pepa n'; });
      ok('dedupe: queda 1 registro "Pepa N"', survivors.length === 1, survivors.length);
      ok('dedupe: el superviviente conserva el canal', survivors.length === 1 && survivors[0].referido === 'TopAyuda', survivors.length ? survivors[0].referido : '?');
      var bpDogPost = await Store.getDog(bpDog.id);
      ok('dedupe: el perro queda apuntando al superviviente', bpDogPost && survivors.length === 1 && bpDogPost.contact_ids[0] === survivors[0].id, JSON.stringify(bpDogPost && bpDogPost.contact_ids));
      await Store.deleteDogPhysical(bpDog.id);
      await Store.deleteContact(survivors[0].id);

      log('== Fase 14: cifrado de datos sensibles ==');
      ok('crypto: ya hay clave configurada (de la fase inicial)', Crypto.configured() === true && Crypto.isUnlocked() === true);

      var wrong = await Crypto.unlock('incorrecta1');
      ok('crypto: contraseña incorrecta rechazada', wrong === false && Crypto.isUnlocked() === true);
      var right = await Crypto.unlock('SuiteMaestra1');
      ok('crypto: contraseña correcta aceptada', right === true && Crypto.isUnlocked() === true);

      var cifC = await Store._putContact({ nombre: 'Pepa Gómez', telefono: '611000111', telegram: '@pepa', whatsapp: '', otros: 'conduce un Toyota', referido: 'Wallapop', referido_por: 'Luisa' });
      var rawC = await DB.get('contacts', cifC.id);
      ok('crypto: nombre almacenado cifrado (prefijo enc:)', typeof rawC.nombre === 'string' && rawC.nombre.slice(0, 4) === 'enc:');
      ok('crypto: teléfono almacenado cifrado', typeof rawC.telefono === 'string' && rawC.telefono.slice(0, 4) === 'enc:');
      ok('crypto: telegram almacenado cifrado', typeof rawC.telegram === 'string' && rawC.telegram.slice(0, 4) === 'enc:');
      ok('crypto: otros (texto libre) cifrado', typeof rawC.otros === 'string' && rawC.otros.slice(0, 4) === 'enc:');
      ok('crypto: referido_por (dato personal de tercero) cifrado', typeof rawC.referido_por === 'string' && rawC.referido_por.slice(0, 4) === 'enc:');
      ok('crypto: sin hash_busqueda (ya no se genera)', rawC.hash_busqueda === undefined, String(rawC.hash_busqueda));
      ok('crypto: hashField sigue disponible como utilidad', (await Crypto.hashField('Pepa Gómez')) === (await Crypto.hashField('pepa góMez')));
      ok('crypto: referido (canal no personal) queda en claro', rawC.referido === 'Wallapop');

      var gotC = await Store.listContacts();
      var gotOne = gotC.filter(function (c) { return c.id === cifC.id; })[0];
      ok('crypto: listContacts descifra', gotOne && gotOne.nombre === 'Pepa Gómez' && gotOne.telefono === '611000111' && gotOne.telegram === '@pepa');
      ok('crypto: listContacts descifra otros y referido_por', gotOne && gotOne.otros === 'conduce un Toyota' && gotOne.referido_por === 'Luisa');
      var gotById = await Store.getContact(cifC.id);
      ok('crypto: getContact descifra', gotById.nombre === 'Pepa Gómez' && gotById.telefono === '611000111');

      /* Cifrado de texto libre en perros, servicios y eventos.
         Rex Cipher referencia a Pepa Gómez para que el import no la borre (cleanOrphanContacts). */
      var cifDog = await Store.saveDog({ nombre: 'Rex Cipher', activo: true, contact_ids: [cifC.id], observaciones: 'Alérgico al pollo', notas: 'Miedo a los fuegos', notas_medicacion: 'Meloxicam 2 ml cada 24 h con comida.', medicacion_expira: '2026-12-31' });
      var rawDog = await DB.get('dogs', cifDog.id);
      ok('crypto: dog.observaciones almacenado cifrado', typeof rawDog.observaciones === 'string' && rawDog.observaciones.slice(0, 4) === 'enc:');
      ok('crypto: dog.notas almacenado cifrado', typeof rawDog.notas === 'string' && rawDog.notas.slice(0, 4) === 'enc:');
      ok('crypto: dog.notas_medicacion almacenado cifrado', typeof rawDog.notas_medicacion === 'string' && rawDog.notas_medicacion.slice(0, 4) === 'enc:');
      ok('crypto: dog.medicacion_expira (fecha operativa) queda en claro', rawDog.medicacion_expira === '2026-12-31');
      ok('crypto: dog.nombre (dato no personal) queda en claro', rawDog.nombre === 'Rex Cipher');
      var gotDog = await Store.getDog(cifDog.id);
      ok('crypto: getDog descifra observaciones/notas', gotDog.observaciones === 'Alérgico al pollo' && gotDog.notas === 'Miedo a los fuegos');
      ok('crypto: getDog descifra las notas de medicación', gotDog.notas_medicacion === 'Meloxicam 2 ml cada 24 h con comida.' && gotDog.medicacion_expira === '2026-12-31');
      ok('crypto: listDogs descifra observaciones', (await Store.listDogs({ includeInactive: true })).some(function (d) { return d.id === cifDog.id && d.observaciones === 'Alérgico al pollo'; }));

      var cifSvc = await Store.saveService({ id: Store.uid(), tipo: 'hospedaje', desde: '2026-12-18', hasta: '2026-12-19', dog_ids: [cifDog.id], coste_base: 20, coste_total: 20, coste_total_manual: false, min_desplazamiento: 0, min_paseo: 0, paga_senal: 0, plus: 0, estado: 'pendiente', notas: 'cuidado con la puerta del balcón', medicacion: 'Amoxicilina', dosis: '1 comprimido', frecuencia: 'cada 12 horas', notas_medicacion: 'dar con comida' });
      var rawSvc = await DB.get('services', cifSvc.id);
      ok('crypto: service.notas almacenado cifrado', typeof rawSvc.notas === 'string' && rawSvc.notas.slice(0, 4) === 'enc:');
      ok('crypto: service.medicacion almacenado cifrado', typeof rawSvc.medicacion === 'string' && rawSvc.medicacion.slice(0, 4) === 'enc:');
      ok('crypto: service.dosis/frecuencia/notas_medicacion almacenados cifrados', typeof rawSvc.dosis === 'string' && rawSvc.dosis.slice(0, 4) === 'enc:' && typeof rawSvc.frecuencia === 'string' && rawSvc.frecuencia.slice(0, 4) === 'enc:' && typeof rawSvc.notas_medicacion === 'string' && rawSvc.notas_medicacion.slice(0, 4) === 'enc:');
      ok('crypto: service.desde (dato operativo) queda en claro', rawSvc.desde === '2026-12-18');
      var gotSvc = await Store.getService(cifSvc.id);
      ok('crypto: getService descifra notas', gotSvc.notas === 'cuidado con la puerta del balcón');
      ok('crypto: getService descifra medicación', gotSvc.medicacion === 'Amoxicilina' && gotSvc.dosis === '1 comprimido' && gotSvc.frecuencia === 'cada 12 horas' && gotSvc.notas_medicacion === 'dar con comida');

      var cifEv = await Store.saveEvent({ fecha: '2026-12-20', todo_dia: false, hora: '11:00', descripcion: 'Entrega de llaves de la casa' });
      var rawEv = await DB.get('events', cifEv.id);
      ok('crypto: event.descripcion almacenado cifrado', typeof rawEv.descripcion === 'string' && rawEv.descripcion.slice(0, 4) === 'enc:');
      ok('crypto: event.fecha (dato operativo) queda en claro', rawEv.fecha === '2026-12-20');
      var gotEv = await Store.getEvent(cifEv.id);
      ok('crypto: getEvent descifra descripcion', gotEv.descripcion === 'Entrega de llaves de la casa');

      var dup = await Store.saveContact({ nombre: 'Pepa Gómez', telefono: '611000111', telegram: '', whatsapp: '', otros: '', referido: 'Wallapop' });
      ok('crypto: saveContact reutiliza por teléfono (dedupe transparente)', dup.id === cifC.id);

      var exp = await Store.exportAll();
      var expC = exp.data.contacts.filter(function (c) { return c.id === cifC.id; })[0];
      ok('export: contactos exportados cifrados', expC && typeof expC.nombre === 'string' && expC.nombre.slice(0, 4) === 'enc:');
      ok('export: otros/referido_por exportados cifrados', expC && typeof expC.otros === 'string' && expC.otros.slice(0, 4) === 'enc:' && typeof expC.referido_por === 'string' && expC.referido_por.slice(0, 4) === 'enc:');
      var expDog = exp.data.dogs.filter(function (d) { return d.id === cifDog.id; })[0];
      ok('export: dog.observaciones/notas exportados cifrados', expDog && typeof expDog.observaciones === 'string' && expDog.observaciones.slice(0, 4) === 'enc:' && typeof expDog.notas === 'string' && expDog.notas.slice(0, 4) === 'enc:');
      ok('export: dog.notas_medicacion cifradas y fecha en claro', expDog && typeof expDog.notas_medicacion === 'string' && expDog.notas_medicacion.slice(0, 4) === 'enc:' && expDog.medicacion_expira === '2026-12-31');
      var expSvc = exp.data.services.filter(function (s) { return s.id === cifSvc.id; })[0];
      ok('export: service.notas exportado cifrado', expSvc && typeof expSvc.notas === 'string' && expSvc.notas.slice(0, 4) === 'enc:');
      var expEv = exp.data.events.filter(function (e) { return e.id === cifEv.id; })[0];
      ok('export: event.descripcion exportado cifrado', expEv && typeof expEv.descripcion === 'string' && expEv.descripcion.slice(0, 4) === 'enc:');
      ok('export: JSON incluye cifrado.salt (público)', !!(exp.cifrado && exp.cifrado.salt));
      ok('export: JSON NO incluye verify ni clave', exp.cifrado.verify === undefined);

      var expJson = JSON.stringify(exp);
      await Store.importAll(JSON.parse(expJson));
      var reimp = await Store.getContact(cifC.id);
      ok('import: round-trip export→import descifra con la clave de sesión', reimp && reimp.nombre === 'Pepa Gómez' && reimp.telefono === '611000111');
      ok('import: round-trip descifra perros/servicios/eventos', (await Store.getDog(cifDog.id)).observaciones === 'Alérgico al pollo' && (await Store.getService(cifSvc.id)).notas === 'cuidado con la puerta del balcón' && (await Store.getEvent(cifEv.id)).descripcion === 'Entrega de llaves de la casa');

      var badKey = await Crypto.deriveWith('OtraMaestra2', exp.cifrado.salt);
      var importRejected = false;
      try { await Store.importAll(JSON.parse(expJson), { altKey: badKey }); } catch (e) { importRejected = true; }
      ok('import: contraseña incorrecta rechazada (DB intacta)', importRejected === true);
      var afterBad = await Store.getContact(cifC.id);
      ok('import: tras rechazo los datos siguen intactos', afterBad && afterBad.nombre === 'Pepa Gómez');

      var nRec = await Store.changeMasterPassword('SuiteMaestra1', 'NuevaMaestra8', null);
      ok('crypto: cambio de contraseña re-cifra los datos personales', nRec >= 4, nRec);
      var gotNew = await Store.getContact(cifC.id);
      ok('crypto: tras el cambio los datos siguen descifrándose', gotNew.nombre === 'Pepa Gómez' && gotNew.telefono === '611000111');
      ok('crypto: tras el cambio perros/servicios/eventos siguen descifrándose', (await Store.getDog(cifDog.id)).observaciones === 'Alérgico al pollo' && (await Store.getService(cifSvc.id)).notas === 'cuidado con la puerta del balcón' && (await Store.getEvent(cifEv.id)).descripcion === 'Entrega de llaves de la casa');
      ok('crypto: la contraseña antigua deja de funcionar', (await Crypto.unlock('SuiteMaestra1')) === false);
      ok('crypto: la nueva contraseña funciona', (await Crypto.unlock('NuevaMaestra8')) === true && Crypto.isUnlocked() === true);

      Crypto.lock();
      ok('crypto: lock elimina la clave de memoria', Crypto.isUnlocked() === false);
      var relog = await Crypto.unlock('NuevaMaestra8');
      ok('crypto: relogin tras lock', relog === true && Crypto.isUnlocked() === true);

      var allc = await Store.listContacts();
      var hasCipher = allc.some(function (c) {
        return ['nombre', 'telefono', 'telegram', 'whatsapp', 'otros', 'referido_por'].some(function (f) {
          return typeof c[f] === 'string' && c[f].slice(0, 4) === 'enc:';
        });
      });
      ok('crypto: ningún campo queda como residuo cifrado tras el re-cifrado', hasCipher === false, hasCipher);

      await Store.deleteContact(cifC.id);
      await Store.deleteDogPhysical(cifDog.id);
      await Store.deleteService(cifSvc.id);
      await Store.deleteEvent(cifEv.id);

    } catch (e) {
      log('FATAL: ' + (e && e.stack ? e.stack : String(e)));
      fails++;
    }

    log('RESULTADO: ' + (fails === 0 ? 'PASS' : 'FAIL') + ' (' + fails + ' fallos)');
    return { fails: fails, lines: lines };
  };
})(typeof window !== 'undefined' ? window : globalThis);
