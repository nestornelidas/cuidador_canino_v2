/* Cuidador Canino - Lógica pura (fechas, costes, validación)
   Independiente del navegador para poder testearse en Node. */
(function (root) {
  'use strict';

  var MS_DAY = 86400000;

  function pad(n) { return String(n).padStart(2, '0'); }

  /* ---------- Fechas ---------- */

  function toISO(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return null;
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function parseISO(str) {
    if (typeof str !== 'string') return null;
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str.trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  function parseDMY(str) {
    if (typeof str !== 'string') return null;
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str.trim());
    if (!m) return null;
    var d = +m[1], mo = +m[2], y = +m[3];
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  function parseAny(str) {
    if (typeof str !== 'string') return null;
    str = str.trim();
    if (!str) return null;
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) return parseISO(str);
    return parseDMY(str);
  }

  function fmtDMY(dateOrISO) {
    var d = typeof dateOrISO === 'string' ? parseISO(dateOrISO) : dateOrISO;
    if (!d) return '';
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  var DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* "Viernes 14 agosto de 2026" */
  function fmtLongDMY(dateOrISO) {
    var d = typeof dateOrISO === 'string' ? parseISO(dateOrISO) : dateOrISO;
    if (!d) return '';
    return DIAS_ES[d.getDay()] + ' ' + d.getDate() + ' ' + MESES_ES[d.getMonth()] + ' de ' + d.getFullYear();
  }

  function todayISO() { return toISO(new Date()); }

  function addDaysISO(iso, n) {
    var d = parseISO(iso);
    if (!d) return null;
    d.setDate(d.getDate() + n);
    return toISO(d);
  }

  /* Días naturales (inclusive) entre dos fechas ISO. 1-Dic a 3-Dic = 3. */
  function diffDaysInclusive(fromISO, toISO) {
    var a = parseISO(fromISO), b = parseISO(toISO);
    if (!a || !b) return NaN;
    return Math.round((b - a) / MS_DAY) + 1;
  }

  function daysInMonth(year, month0) { return new Date(year, month0 + 1, 0).getDate(); }

  /* Lunes = 0 ... Domingo = 6 */
  function monOffset(date) { return (date.getDay() + 6) % 7; }

  /* Lunes de la semana (inicio lunes) de la fecha dada */
  function startOfWeekMonday(date) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - monOffset(d));
    return d;
  }

  /* Rejilla del mes: array de semanas; cada semana = 7 Date (L..D) */
  function monthGrid(year, month0) {
    var first = new Date(year, month0, 1);
    var start = startOfWeekMonday(first);
    var weeks = [];
    var cur = new Date(start);
    for (var w = 0; w < 6; w++) {
      var week = [];
      for (var i = 0; i < 7; i++) {
        week.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    while (weeks.length > 1) {
      var last = weeks[weeks.length - 1];
      if (last.every(function (d) { return d.getMonth() !== month0 || d.getFullYear() !== year; })) {
        weeks.pop();
      } else { break; }
    }
    return weeks;
  }

  function isInMonth(date, year, month0) {
    return date.getFullYear() === year && date.getMonth() === month0;
  }

  /* ---------- Edad ---------- */

  function ageParts(birthISO, asOfISO) {
    var b = parseISO(birthISO);
    var a = asOfISO ? parseISO(asOfISO) : parseISO(todayISO());
    if (!b || !a || b > a) return null;
    var years = a.getFullYear() - b.getFullYear();
    var months = a.getMonth() - b.getMonth();
    var days = a.getDate() - b.getDate();
    if (days < 0) { months--; days += daysInMonth(a.getFullYear(), a.getMonth() - 1); }
    if (months < 0) { years--; months += 12; }
    return { years: years, months: months, days: days };
  }

  function ageText(birthISO, asOfISO, deathISO) {
    var asOf = deathISO || asOfISO || todayISO();
    var p = ageParts(birthISO, asOf);
    if (!p) return '';
    if (p.years > 0) {
      var y = p.years + ' ' + (p.years === 1 ? 'año' : 'años');
      if (p.months > 0) y += ' y ' + p.months + ' ' + (p.months === 1 ? 'mes' : 'meses');
      return y;
    }
    if (p.months > 0) return p.months + ' ' + (p.months === 1 ? 'mes' : 'meses');
    return p.days + ' ' + (p.days === 1 ? 'día' : 'días');
  }

  /* ---------- Números y costes ---------- */

  function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function round2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }

  function calcHospedajeTotal(dias, costeBase, numPerros) {
    return round2(Math.max(0, num(dias)) * num(costeBase) * Math.max(0, num(numPerros)));
  }

  function calcPaseoTotal(minDesplazamiento, minPaseo, costeBase) {
    var mins = Math.max(0, num(minDesplazamiento)) + Math.max(0, num(minPaseo));
    return round2((mins / 60) * num(costeBase));
  }

  /* Coste de un tramo de tiempo a precio/hora (minutos a horas) */
  function calcCosteTiempo(min, costeBase) {
    return round2((Math.max(0, num(min)) / 60) * num(costeBase));
  }

  /* Total de una fila de paseo: subtotal (desplazamiento + paseo) × nº de paseos */
  function calcTotalPaseoFila(tDesp, tPaseo, numeroPaseos, costeBase) {
    var subtotal = calcCosteTiempo(tDesp, costeBase) + calcCosteTiempo(tPaseo, costeBase);
    return round2(subtotal * Math.max(0, num(numeroPaseos)));
  }

  /* Suma de los totales de todas las filas de paseo de un servicio */
  function calcPaseosTotal(paseos, costeBase) {
    var total = 0;
    (paseos || []).forEach(function (p) {
      total += calcTotalPaseoFila(p.tiempo_desplazamiento, p.tiempo_paseo, p.numero_paseos, costeBase);
    });
    return round2(total);
  }

  /* Paga y señal prevista (solo hospedaje): ceil(días/7) * coste_base */
  function calcSenalPrevista(dias, costeBase) {
    return round2(Math.ceil(Math.max(0, num(dias)) / 7) * num(costeBase));
  }

  function calcPendiente(costeTotal, plus, pagaSenal) {
    return round2(num(costeTotal) + num(plus) - num(pagaSenal));
  }

  /* Total de un servicio = subtotal (coste_total) + plus */
  function calcTotalSvc(s) {
    return round2(num(s && s.coste_total) + num(s && s.plus));
  }

  /* Pendiente de un servicio: si está finalizado ya se ha abonado -> 0 */
  function calcPendienteSvc(s) {
    if (s && s.estado === 'finalizado') return 0;
    return calcPendiente(s && s.coste_total, s && s.plus, s && s.paga_senal);
  }

  /* Días naturales de un servicio (según tipo) */
  function serviceDias(s) {
    if (s.tipo === 'hospedaje') return diffDaysInclusive(s.desde, s.hasta);
    return diffDaysInclusive(s.desde, s.hasta);
  }

  /* Coste total automático de un servicio según su tipo */
  function calcServiceTotal(s) {
    if (!s) return 0;
    if (s.tipo === 'hospedaje') {
      return calcHospedajeTotal(diffDaysInclusive(s.desde, s.hasta), s.coste_base, (s.dog_ids || []).length);
    }
    if (Array.isArray(s.paseos) && s.paseos.length) return calcPaseosTotal(s.paseos, s.coste_base);
    return calcPaseoTotal(s.min_desplazamiento, s.min_paseo, s.coste_base);
  }

  var nfMoney = null;
  function fmtMoney(n) {
    try {
      nfMoney = nfMoney || new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
      return nfMoney.format(isNaN(n) ? 0 : n);
    } catch (e) { return (isNaN(n) ? 0 : n) + ' €'; }
  }

  var nfNum = null;
  function fmtNum(n) {
    try {
      nfNum = nfNum || new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
      return nfNum.format(isNaN(n) ? 0 : n);
    } catch (e) { return String(isNaN(n) ? 0 : n); }
  }

  /* ---------- Validación ---------- */

  function validateService(s) {
    var errs = [];
    if (!s || typeof s !== 'object') return [{ field: '__all__', msg: 'Datos de servicio no válidos.' }];
    if (!s.tipo) errs.push({ field: 'tipo', msg: 'Debe seleccionar el tipo de servicio.' });
    if (!s.desde) errs.push({ field: 'desde', msg: 'La fecha de inicio es obligatoria.' });
    if (!s.hasta) errs.push({ field: 'hasta', msg: 'La fecha de fin es obligatoria.' });
    if (s.desde && s.hasta) {
      var a = parseISO(s.desde), b = parseISO(s.hasta);
      if (!a) errs.push({ field: 'desde', msg: 'La fecha de inicio no es válida.' });
      if (!b) errs.push({ field: 'hasta', msg: 'La fecha de fin no es válida.' });
      if (a && b && a > b) errs.push({ field: 'desde', msg: 'La fecha de inicio no puede ser posterior a la de fin.' });
    }
    if (!s.dog_ids || !s.dog_ids.length) errs.push({ field: 'dog_ids', msg: 'Debe seleccionar al menos un perro.' });
    if (num(s.coste_base) < 0) errs.push({ field: 'coste_base', msg: 'El coste base no puede ser negativo.' });
    if (num(s.paga_senal) < 0) errs.push({ field: 'paga_senal', msg: 'La paga y señal no puede ser negativa.' });
    if (num(s.plus) < 0) errs.push({ field: 'plus', msg: 'El plus no puede ser negativo.' });
    if (s.tipo === 'paseo') {
      if (Array.isArray(s.paseos) && s.paseos.length) {
        var totalMins = 0;
        (s.paseos).forEach(function (p, i) {
          if (num(p.tiempo_desplazamiento) < 0) errs.push({ field: 'paseos', msg: 'El tiempo de desplazamiento no puede ser negativo (fila ' + (i + 1) + ').' });
          if (num(p.tiempo_paseo) < 0) errs.push({ field: 'paseos', msg: 'El tiempo de paseo no puede ser negativo (fila ' + (i + 1) + ').' });
          if (num(p.numero_paseos) < 0) errs.push({ field: 'paseos', msg: 'El número de paseos no puede ser negativo (fila ' + (i + 1) + ').' });
          totalMins += Math.max(0, num(p.tiempo_desplazamiento)) + Math.max(0, num(p.tiempo_paseo));
        });
        if (totalMins <= 0) errs.push({ field: 'paseos', msg: 'Debe indicar el tiempo de al menos un paseo (en minutos).' });
      } else {
        if (num(s.min_desplazamiento) < 0) errs.push({ field: 'min_desplazamiento', msg: 'El tiempo de desplazamiento no puede ser negativo.' });
        if (num(s.min_paseo) < 0) errs.push({ field: 'min_paseo', msg: 'El tiempo de paseo no puede ser negativo.' });
        if (num(s.min_desplazamiento) + num(s.min_paseo) <= 0) errs.push({ field: 'min_paseo', msg: 'Debe indicar el tiempo total de paseo (en minutos).' });
      }
    }
    return errs;
  }

  function validateDog(d) {
    var errs = [];
    if (!d || typeof d !== 'object') return [{ field: '__all__', msg: 'Datos de perro no válidos.' }];
    if (!d.nombre || !String(d.nombre).trim()) errs.push({ field: 'nombre', msg: 'El nombre es obligatorio.' });
    if (d.fecha_nacimiento && !parseISO(d.fecha_nacimiento)) errs.push({ field: 'fecha_nacimiento', msg: 'La fecha de nacimiento no es válida.' });
    if (d.fecha_deceso && !parseISO(d.fecha_deceso)) errs.push({ field: 'fecha_deceso', msg: 'La fecha de deceso no es válida.' });
    if (d.fecha_nacimiento && d.fecha_deceso && parseISO(d.fecha_nacimiento) && parseISO(d.fecha_deceso) &&
        parseISO(d.fecha_deceso) < parseISO(d.fecha_nacimiento)) {
      errs.push({ field: 'fecha_deceso', msg: 'La fecha de deceso no puede ser anterior a la de nacimiento.' });
    }
    if (!d.contact_ids || !d.contact_ids.length) errs.push({ field: 'contact_ids', msg: 'Debe indicar al menos un contacto humano.' });
    return errs;
  }

  function validateContact(c) {
    var errs = [];
    if (!c || typeof c !== 'object') return [{ field: '__all__', msg: 'Datos de contacto no válidos.' }];
    if (!c.nombre || !String(c.nombre).trim()) errs.push({ field: 'nombre', msg: 'El nombre completo es obligatorio.' });
    return errs;
  }

  /* Normalización para comparar teléfonos/whatsapp/telegram ignorando espacios, guiones y signos */
  function normalizePhone(p) {
    return String(p == null ? '' : p).replace(/\D/g, '');
  }
  function normalizeTelegram(t) {
    return String(t == null ? '' : t).trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
  }
  /* Normalización de nombre para comparar humanos ignorando mayúsculas y espacios redundantes */
  function normalizeName(n) {
    return String(n == null ? '' : n).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /* Une los nombres de los perros de una reserva (plantilla {nombre_perro}):
     - Si el último es "Yago"/"Isabel" (empieza por Y/I) se usa "e"; si no, "y".
     - 2 perros: "Andy y Tula" / "Andy e Isabel".
     - 3 o más: "Andy, Tula y Lupe" / "Andy, Tula e Isabel". */
  function joinNombres(names) {
    var arr = (Array.isArray(names) ? names : []).map(function (n) { return String(n == null ? '' : n).trim(); }).filter(Boolean);
    var n = arr.length;
    if (n <= 1) return arr.join('');
    var last = arr[n - 1];
    var sep = /^[YI]/i.test(last) ? 'e' : 'y';
    return arr.slice(0, n - 1).join(', ') + ' ' + sep + ' ' + last;
  }

  root.Calc = {
    pad: pad, toISO: toISO, parseISO: parseISO, parseDMY: parseDMY, parseAny: parseAny,
    fmtDMY: fmtDMY, fmtLongDMY: fmtLongDMY, todayISO: todayISO, addDaysISO: addDaysISO,
    diffDaysInclusive: diffDaysInclusive, daysInMonth: daysInMonth, monOffset: monOffset,
    startOfWeekMonday: startOfWeekMonday, monthGrid: monthGrid, isInMonth: isInMonth,
    ageParts: ageParts, ageText: ageText,
    num: num, round2: round2,
    calcHospedajeTotal: calcHospedajeTotal, calcPaseoTotal: calcPaseoTotal,
    calcCosteTiempo: calcCosteTiempo, calcTotalPaseoFila: calcTotalPaseoFila, calcPaseosTotal: calcPaseosTotal,
    calcSenalPrevista: calcSenalPrevista, calcPendiente: calcPendiente, calcPendienteSvc: calcPendienteSvc,
    calcTotalSvc: calcTotalSvc,
    serviceDias: serviceDias, calcServiceTotal: calcServiceTotal,
    fmtMoney: fmtMoney, fmtNum: fmtNum,
    validateService: validateService, validateDog: validateDog, validateContact: validateContact,
    normalizePhone: normalizePhone, normalizeTelegram: normalizeTelegram, normalizeName: normalizeName,
    joinNombres: joinNombres
  };
})(typeof window !== 'undefined' ? window : globalThis);
