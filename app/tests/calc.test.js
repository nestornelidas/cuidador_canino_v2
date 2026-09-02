/* Tests de lógica pura (calc.js) - se ejecuta con: node tests/calc.test.js */
'use strict';
const fs = require('fs');
const path = require('path');

/* Carga calc.js en Node (no depende del navegador) */
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'calc.js'), 'utf8');
const sandbox = { Intl: Intl, Number: Number, Math: Math, Date: Date, parseFloat: parseFloat, isNaN: isNaN };
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const C = sandbox.Calc;

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' -> ' + extra : '')); }
}
function eq(a, b) { return Math.abs(a - b) < 1e-9; }

console.log('== Fechas ==');
ok('diffDaysInclusive 1-3 Dic = 3', C.diffDaysInclusive('2026-12-01', '2026-12-03') === 3);
ok('diffDaysInclusive mismo día = 1', C.diffDaysInclusive('2026-12-01', '2026-12-01') === 1);
ok('diffDaysInclusive año nuevo = 5', C.diffDaysInclusive('2026-12-30', '2027-01-03') === 5);
ok('diffDaysInclusive 15 días', C.diffDaysInclusive('2026-12-08', '2026-12-22') === 15);
ok('fmtDMY es 01/12/2026', C.fmtDMY('2026-12-01') === '01/12/2026');
ok('parseAny DMY válido', C.parseAny('31/12/2026') && C.fmtDMY(C.parseAny('31/12/2026')) === '31/12/2026');
ok('parseAny DMY inválido 31/02 -> null', C.parseAny('31/02/2026') === null);
ok('parseAny ISO inválido', C.parseISO('2026-13-01') === null);
ok('addDaysISO', C.addDaysISO('2026-12-01', 2) === '2026-12-03');
ok('addDaysISO cruza mes', C.addDaysISO('2026-12-30', 4) === '2027-01-03');

const grid = C.monthGrid(2026, 11);
ok('monthGrid diciembre 2026 tiene semanas', Array.isArray(grid) && grid.length >= 4 && grid.length <= 6);
ok('monthGrid primera semana empieza lunes', grid[0][0].getDay() === 1, grid[0][0]);
ok('monthGrid primera semana contiene día 1', grid.some(w => w.some(d => d.getDate() === 1 && d.getMonth() === 11)));
const firstCell = C.toISO(grid[0][0]);
ok('monthGrid dic 2026 celda inicial = 30/11/2026', firstCell === '2026-11-30', firstCell);

console.log('== Edad ==');
ok('edad 6 años', C.ageText('2020-01-01', '2026-01-01') === '6 años');
ok('edad 1 año y 2 meses', C.ageText('2025-06-01', '2026-08-01') === '1 año y 2 meses');
ok('edad 1 mes', C.ageText('2026-07-01', '2026-08-01') === '1 mes');
ok('edad con deceso', C.ageText('2020-01-01', null, '2022-03-15') === '2 años y 2 meses');

console.log('== Costes ==');
ok('hospedaje 4d*20*1 = 80', eq(C.calcHospedajeTotal(4, 20, 1), 80));
ok('hospedaje 7d*20*2 = 280', eq(C.calcHospedajeTotal(7, 20, 2), 280));
ok('hospedaje 15d*20*1 = 300', eq(C.calcHospedajeTotal(15, 20, 1), 300));
ok('hospedaje 5d*20*2 = 200', eq(C.calcHospedajeTotal(5, 20, 2), 200));
ok('señal prevista 15d = 60', eq(C.calcSenalPrevista(15, 20), 60));
ok('señal prevista 7d = 20', eq(C.calcSenalPrevista(7, 20), 20));
ok('señal prevista 4d = 20', eq(C.calcSenalPrevista(4, 20), 20));
ok('señal prevista 1d = 20', eq(C.calcSenalPrevista(1, 20), 20));
ok('paseo (30+120)/60*12 = 30', eq(C.calcPaseoTotal(30, 120, 12), 30));
ok('paseo (20+90)/60*12 = 22', eq(C.calcPaseoTotal(20, 90, 12), 22));
ok('paseo (25+60)/60*12 = 17', eq(C.calcPaseoTotal(25, 60, 12), 17));
ok('coste tiempo 30min*12€/h = 6', eq(C.calcCosteTiempo(30, 12), 6));
ok('coste tiempo 120min*12€/h = 24', eq(C.calcCosteTiempo(120, 12), 24));
ok('total fila paseo (30+120)min*1 = 30', eq(C.calcTotalPaseoFila(30, 120, 1, 12), 30));
ok('total fila paseo (30+120)min*2 = 60', eq(C.calcTotalPaseoFila(30, 120, 2, 12), 60));
ok('paseosTotal 2 filas = 30 + 45', eq(C.calcPaseosTotal([
  { tiempo_desplazamiento: 30, tiempo_paseo: 120, numero_paseos: 1 },
  { tiempo_desplazamiento: 15, tiempo_paseo: 60, numero_paseos: 1 }
], 12), 30 + 15));
ok('pendiente 80+10-20 = 70', eq(C.calcPendiente(80, 10, 20), 70));
ok('pendiente negativo posible', eq(C.calcPendiente(30, 0, 50), -20));

const svcHosp = { tipo: 'hospedaje', desde: '2026-12-01', hasta: '2026-12-04', dog_ids: ['a'], coste_base: 20 };
ok('calcServiceTotal hospedaje = 80', eq(C.calcServiceTotal(svcHosp), 80));
const svcPaseo = { tipo: 'paseo', desde: '2026-12-01', hasta: '2026-12-05', dog_ids: ['a'], coste_base: 12, min_desplazamiento: 30, min_paseo: 120 };
ok('calcServiceTotal paseo = 30', eq(C.calcServiceTotal(svcPaseo), 30));
const svcPaseos = { tipo: 'paseo', desde: '2026-12-01', hasta: '2026-12-05', dog_ids: ['a'], coste_base: 12, paseos: [
  { tiempo_desplazamiento: 30, tiempo_paseo: 120, numero_paseos: 1 },
  { tiempo_desplazamiento: 15, tiempo_paseo: 60, numero_paseos: 2 }
] };
ok('calcServiceTotal con paseos = 30 + 30 = 60', eq(C.calcServiceTotal(svcPaseos), 60));
ok('calcTotalSvc sin plus = subtotal', eq(C.calcTotalSvc({ coste_total: 80, plus: 0 }), 80));
ok('calcTotalSvc = subtotal + plus', eq(C.calcTotalSvc({ coste_total: 80, plus: 10 }), 90));

console.log('== Validación servicio ==');
ok('vacío -> errores de tipo/desde/hasta/perros', C.validateService({}).length >= 4);
const badDates = { tipo: 'hospedaje', desde: '2026-12-05', hasta: '2026-12-01', dog_ids: ['a'], coste_base: 20 };
ok('inicio > fin -> error', C.validateService(badDates).some(e => e.field === 'desde'));
const negBase = { tipo: 'hospedaje', desde: '2026-12-01', hasta: '2026-12-02', dog_ids: ['a'], coste_base: -5 };
ok('coste base negativo -> error', C.validateService(negBase).some(e => e.field === 'coste_base'));
const paseo0 = { tipo: 'paseo', desde: '2026-12-01', hasta: '2026-12-02', dog_ids: ['a'], coste_base: 12, min_desplazamiento: 0, min_paseo: 0 };
ok('paseo sin minutos -> error', C.validateService(paseo0).some(e => e.field === 'min_paseo'));
const paseoNeg = { tipo: 'paseo', desde: '2026-12-01', hasta: '2026-12-02', dog_ids: ['a'], coste_base: 12, min_desplazamiento: -5, min_paseo: 10 };
ok('paseo minutos negativos -> error', C.validateService(paseoNeg).some(e => e.field === 'min_desplazamiento'));
const valido = { tipo: 'paseo', desde: '2026-12-01', hasta: '2026-12-02', dog_ids: ['a'], coste_base: 12, min_desplazamiento: 10, min_paseo: 20 };
ok('servicio válido -> sin errores', C.validateService(valido).length === 0);
ok('sin perros -> error', C.validateService({ tipo: 'hospedaje', desde: '2026-12-01', hasta: '2026-12-02', dog_ids: [], coste_base: 20 }).some(e => e.field === 'dog_ids'));

console.log('== Validación perro ==');
ok('perro sin nombre -> error', C.validateDog({ contact_ids: ['x'] }).some(e => e.field === 'nombre'));
ok('perro sin nacimiento -> sin errores (opcional)', C.validateDog({ nombre: 'Loki', contact_ids: ['x'] }).length === 0);
ok('perro sin contactos -> error (obligatorio)', C.validateDog({ nombre: 'Loki', fecha_nacimiento: '2021-03-15' }).some(e => e.field === 'contact_ids'));
ok('perro si contactos y sin nacimiento -> sin errores', C.validateDog({ nombre: 'Loki', contact_ids: ['x'] }).length === 0);
ok('deceso antes de nacimiento -> error', C.validateDog({ nombre: 'Loki', fecha_nacimiento: '2021-03-15', fecha_deceso: '2020-01-01', contact_ids: ['x'] }).some(e => e.field === 'fecha_deceso'));
ok('perro válido -> sin errores', C.validateDog({ nombre: 'Loki', fecha_nacimiento: '2021-03-15', contact_ids: ['x'] }).length === 0);
ok('perro sin nacimiento ni contactos -> error de contactos', C.validateDog({ nombre: 'Rex' }).some(e => e.field === 'contact_ids'));

console.log('== Números / formato ==');
ok('num vacío = 0', C.num('') === 0 && C.num(null) === 0 && C.num(undefined) === 0);
ok('num NaN = 0', C.num('abc') === 0);
ok('fmtMoney es-ES', (function () { const s = C.fmtMoney(1101); return s.indexOf(',00') !== -1 && s.indexOf('€') !== -1; })());
ok('round2', C.round2(0.1 + 0.2) === 0.3);
ok('validateService tolera valores raros sin lanzar', (function () { try { C.validateService(null); C.validateService(42); C.validateService('x'); return true; } catch (e) { return false; } })());
ok('validateDog tolera valores raros sin lanzar', (function () { try { C.validateDog(null); C.validateDog(42); return true; } catch (e) { return false; } })());

console.log('== Normalización de claves únicas ==');
ok('normalizePhone elimina espacios/guiones', C.normalizePhone('600 111-222') === '600111222');
ok('normalizePhone elimina +34', C.normalizePhone('+34 600 111 222') === '34600111222');
ok('normalizePhone vacío = cadena vacía', C.normalizePhone('') === '' && C.normalizePhone(null) === '');
ok('normalizePhone mantiene dígitos', C.normalizePhone('600.111-222') === '600111222');
ok('normalizeTelegram elimina @ y mayúsculas', C.normalizeTelegram('@AnaMtz') === 'anamtz');
ok('normalizeTelegram elimina espacios', C.normalizeTelegram(' ana mtz ') === 'anamtz');
ok('normalizeTelegram vacío = cadena vacía', C.normalizeTelegram('') === '' && C.normalizeTelegram(null) === '');
ok('validateContact tolera valores raros sin lanzar', (function () { try { C.validateContact(null); C.validateContact(42); return true; } catch (e) { return false; } })());

console.log('== Nombres de perros en plantillas ==');
ok('1 perro -> nombre solo', C.joinNombres(['Loki']) === 'Loki');
ok('vacío -> cadena vacía', C.joinNombres([]) === '' && C.joinNombres(null) === '');
ok('2 perros -> "y"', C.joinNombres(['Andy', 'Tula']) === 'Andy y Tula');
ok('2 perros segundo con Y -> "e"', C.joinNombres(['Andy', 'Yago']) === 'Andy e Yago');
ok('2 perros segundo con I -> "e"', C.joinNombres(['Andy', 'Isabel']) === 'Andy e Isabel');
ok('2 perros segundo con i minúscula -> "e"', C.joinNombres(['Andy', 'inés']) === 'Andy e inés');
ok('3+ -> comas y "y" al final', C.joinNombres(['Andy', 'Tula', 'Lupe']) === 'Andy, Tula y Lupe');
ok('3+ -> comas y "e" al final', C.joinNombres(['Andy', 'Tula', 'Isabel']) === 'Andy, Tula e Isabel');
ok('ignora nombres vacíos', C.joinNombres(['Andy', '', 'Tula']) === 'Andy y Tula');

console.log('\nResultado: ' + pass + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
