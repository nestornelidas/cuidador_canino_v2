/* Cuidador Canino - Vista Calendario (semanas empiezan en lunes) */
(function (root) {
  'use strict';
  var C = root.Calc, UI = root.UI, Store = root.Store;

  var DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  var state = null; /* {y, m} */
  var gridCache = {};

  function ensureState() {
    var today = new Date();
    if (!state) state = { y: today.getFullYear(), m: today.getMonth() };
  }

  function goMonth(delta) {
    state.m += delta;
    if (state.m < 0) { state.m = 11; state.y--; }
    if (state.m > 11) { state.m = 0; state.y++; }
    App.refresh();
  }

  function estadoColor(estado, cache) {
    var c = cache || (Store.getConfig().colores || {});
    return c[estado] || '#94a3b8';
  }

  function eventoColor(cache) {
    var c = cache || (Store.getConfig().colores || {});
    return c.evento || '#f5c518';
  }

  async function render(container, params, ctx) {
    ensureState();
    var y = state.y, m = state.m;
    var todayISO = C.todayISO();
    var firstISO = y + '-' + C.pad(m + 1) + '-01';
    var lastISO = y + '-' + C.pad(m + 1) + '-' + C.pad(C.daysInMonth(y, m));

    /* Ruta profunda: calendario/evento/<id> -> sitúa el mes y abre el modal de edición */
    var deepEventId = params && params[0] === 'evento' ? params[1] : null;
    var deepEvent = null;
    if (deepEventId) {
      deepEvent = await Store.getEvent(deepEventId);
      if (deepEvent && deepEvent.fecha) {
        var dy = +deepEvent.fecha.slice(0, 4);
        var dm = +deepEvent.fecha.slice(5, 7) - 1;
        if (state.y !== dy || state.m !== dm) {
          state = { y: dy, m: dm };
          y = dy; m = dm;
          firstISO = y + '-' + C.pad(m + 1) + '-01';
          lastISO = y + '-' + C.pad(m + 1) + '-' + C.pad(C.daysInMonth(y, m));
        }
      }
    }

    var [services, dogs, monthEvents] = await Promise.all([
      Store.listServices(),
      Store.listDogs({ includeInactive: true }),
      Store.listEventsInRange(firstISO, lastISO)
    ]);
    var dogMap = {};
    dogs.forEach(function (d) { dogMap[d.id] = d; });

    var colores = (Store.getConfig().colores || {});
    var monthServices = services.filter(function (s) {
      return s.desde <= lastISO && s.hasta >= firstISO;
    }).sort(function (a, b) { return a.desde.localeCompare(b.desde) || a.hasta.localeCompare(b.hasta); });

    var cacheKey = y + '-' + m;
    var weeks = gridCache[cacheKey];
    if (!weeks) {
      weeks = gridCache[cacheKey] = C.monthGrid(y, m);
      var keys = Object.keys(gridCache);
      if (keys.length > 12) delete gridCache[keys[0]];
    }

    var html = '';
    html += '<div class="view-head"><h1>Calendario</h1><div class="view-actions">' +
      '<button class="btn btn-primary" id="btnNewService">' + UI.icon('plus') + ' Nuevo servicio</button>' +
      '<button class="btn btn-primary" id="btnNewEvent">' + UI.icon('plus') + ' Nuevo evento</button>' +
      '</div></div>';

    html += '<div class="card cal-card">';
    /* Toolbar */
    html += '<div class="cal-toolbar">';
    html += '<div class="cal-nav">';
    html += '<button class="icon-btn" data-cal="prev" title="Mes anterior">' + UI.icon('chevron_left') + '</button>';
    html += '<button class="icon-btn" data-cal="today" title="Hoy">' + UI.icon('calendar_check') + '</button>';
    html += '<button class="icon-btn" data-cal="next" title="Mes siguiente">' + UI.icon('chevron_right') + '</button>';
    html += '</div>';
    html += '<h2 class="cal-title">' + monthLabel(y, m) + '</h2>';
    html += '<div class="cal-legend">' +
      '<span><i class="legend-dot" style="background:' + estadoColor('pendiente', colores) + '"></i>Pendiente</span>' +
      '<span><i class="legend-dot" style="background:' + estadoColor('confirmado', colores) + '"></i>Confirmado</span>' +
      '<span><i class="legend-dot" style="background:' + estadoColor('en_curso', colores) + '"></i>En curso</span>' +
      '<span><i class="legend-dot" style="background:' + estadoColor('finalizado', colores) + '"></i>Finalizado</span>' +
      '<span><i class="legend-dot" style="background:' + estadoColor('cancelado', colores) + '"></i>Cancelado</span>' +
      '<span><i class="legend-dot" style="background:' + eventoColor(colores) + '"></i>Eventos</span>' +
      '</div>';
    html += '</div>';

    /* Cabecera de días */
    html += '<div class="cal-dow">';
    DOW.forEach(function (d) { html += '<div class="cal-dow-cell">' + d + '</div>'; });
    html += '</div>';

    html += '<div class="cal-body">';
    var monthEventsSorted = monthEvents.slice().sort(function (a, b) {
      return (a.fecha || '').localeCompare(b.fecha || '') ||
        String(a.hora || '').localeCompare(String(b.hora || '')) ||
        String(a.descripcion || '').localeCompare(String(b.descripcion || ''));
    });
    weeks.forEach(function (week, wi) {
      /* Cobertura semanal: servicios y eventos comparten carriles (nada se solapa) */
      var weekIsos = week.map(C.toISO);
      var items = [];
      var lanes = []; /* lane -> última columna ocupada */
      function pack(colStart, colEnd) {
        var lane = -1;
        for (var l = 0; l < lanes.length; l++) {
          if (lanes[l] < colStart) { lane = l; break; }
        }
        if (lane === -1) { lane = lanes.length; lanes.push(colEnd); }
        else lanes[lane] = colEnd;
        return lane;
      }
      monthServices.forEach(function (s) {
        var colStart = -1, colEnd = -1;
        for (var i = 0; i < 7; i++) {
          var dayISO = weekIsos[i];
          if (s.desde <= dayISO && s.hasta >= dayISO) {
            if (colStart === -1) colStart = i;
            colEnd = i;
          }
        }
        if (colStart === -1) return;
        items.push({ kind: 'svc', s: s, colStart: colStart, colEnd: colEnd, lane: pack(colStart, colEnd) });
      });
      /* Los eventos se apilan tras los servicios: ocupan siempre un carril libre */
      monthEventsSorted.forEach(function (ev) {
        for (var i = 0; i < 7; i++) {
          if (weekIsos[i] === ev.fecha) {
            items.push({ kind: 'ev', ev: ev, colStart: i, colEnd: i, lane: pack(i, i) });
            return;
          }
        }
      });

      var laneH = 20, gap = 3;
      var barH = lanes.length * (laneH + gap);
      var cellMin = Math.max(90, barH + 36);

      html += '<div class="cal-week">';
      if (barH > 0) {
        html += '<div class="cal-bars" style="height:' + barH + 'px">';
        items.forEach(function (it) {
          var leftPct = (it.colStart / 7 * 100);
          var widthPct = ((it.colEnd - it.colStart + 1) / 7 * 100);
          var topPx = it.lane * (laneH + gap);
          if (it.kind === 'svc') {
            var s = it.s;
            var names = (s.dog_ids || []).map(function (id) {
              return dogMap[id] ? dogMap[id].nombre : '?';
            }).join(', ');
            var pref = s.tipo === 'paseo' ? 'P: ' : 'H: ';
            var label = pref + names;
            var tip = UI.tipoLabel(s.tipo) + ': ' + names + ' · ' + C.fmtDMY(s.desde) + ' → ' + C.fmtDMY(s.hasta) +
              ' · ' + C.fmtMoney(C.calcTotalSvc(s)) + ' · ' + UI.estadoLabel(s.estado);
            var col = estadoColor(s.estado, colores);
            html += '<button class="cal-bar" data-estado="' + s.estado + '" data-color="' + col + '" style="left:' + leftPct + '%;width:' + widthPct +
              '%;top:' + topPx + 'px;background:' + col + '" data-service="' + s.id + '" title="' + UI.esc(tip) + '">' +
              '<span class="cal-bar-label">' + UI.esc(label) + '</span></button>';
          } else {
            var ev = it.ev;
            var label = ev.hora ? ev.hora + ' ' + ev.descripcion : ev.descripcion;
            var tipEv = 'Evento · ' + C.fmtDMY(ev.fecha) + (ev.hora ? ' ' + ev.hora : '') + ' · ' + ev.descripcion;
            var eCol = eventoColor(colores);
            html += '<button type="button" class="cal-bar" data-tipo="evento" data-evento="' + ev.id + '" style="left:' + leftPct + '%;width:' + widthPct +
              '%;top:' + topPx + 'px;background:' + eCol + '" title="' + UI.esc(tipEv) + '">' +
              '<span class="cal-bar-label">' + UI.esc(label) + '</span></button>';
          }
        });
        html += '</div>';
      }
      html += '<div class="cal-cells" style="min-height:' + cellMin + 'px">';
      week.forEach(function (day) {
        var inMonth = C.isInMonth(day, y, m);
        var iso = C.toISO(day);
        var isToday = iso === todayISO;
        var cls = 'cal-cell' + (inMonth ? '' : ' cal-cell-out') + (isToday ? ' cal-cell-today' : '');
        html += '<div class="' + cls + '" data-iso="' + iso + '">' +
          '<span class="cal-daynum">' + day.getDate() + '</span>' +
          '</div>';
      });
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    /* Navegación */
    container.querySelectorAll('[data-cal]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.dataset.cal;
        if (act === 'prev') goMonth(-1);
        else if (act === 'next') goMonth(1);
        else { state = null; ensureState(); App.refresh(); }
      });
    });

    /* Clic en barra */
    container.querySelectorAll('[data-service]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        ctx.go('servicios/edit/' + b.dataset.service);
      });
    });

    /* Nuevo servicio */
    document.getElementById('btnNewService').addEventListener('click', function () {
      ctx.go('servicios/nuevo');
    });
    /* Nuevo evento */
    document.getElementById('btnNewEvent').addEventListener('click', function () {
      openEventModal(null, ctx);
    });
    /* Clic en chip de evento (editar/borrar) */
    container.querySelectorAll('[data-evento]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = b.dataset.evento;
        var ev = monthEvents.filter(function (x) { return x.id === id; })[0] || { id: id };
        openEventModal(ev, ctx);
      });
    });

    /* Ruta profunda: abrir el modal de edición del evento solicitado */
    if (deepEventId && deepEvent) {
      var evDeep = monthEvents.filter(function (x) { return x.id === deepEventId; })[0] || deepEvent;
      openEventModal(evDeep, ctx);
    }
  }

  /* Modal de evento esporádico (nuevo/editar/borrar) */
  function openEventModal(ev, ctx) {
    ev = ev || {};
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="form-field"><label>Fecha *</label><input type="date" class="input" id="evFecha" value="' + UI.esc(ev.fecha || '') + '"></div>' +
      '<div class="form-field"><label>Cuándo</label><select class="input" id="evCuando">' +
      '<option value="todo"' + (ev.todo_dia !== false ? ' selected' : '') + '>Todo el día</option>' +
      '<option value="hora"' + (ev.todo_dia === false ? ' selected' : '') + '>A una hora</option>' +
      '</select></div>' +
      '<div class="form-field" id="evHoraWrap" ' + (ev.todo_dia === false ? '' : 'hidden') + '><label>Hora</label><input type="time" class="input" id="evHora" value="' + UI.esc(ev.hora || '') + '"></div>' +
      '<div class="form-field"><label>Descripción *</label><textarea class="input" id="evDesc" rows="3" placeholder="Primera visita, entrega de llaves, recogida...">' + UI.esc(ev.descripcion || '') + '</textarea></div>' +
      '<div class="form-field align-end"><a class="btn btn-primary" id="evGCalLink" target="_blank" rel="noopener noreferrer" href="#">' + UI.icon('calendar') + ' Crear evento en Google Calendar</a>' +
      '<p class="hint">Se usa la fecha y, si es a una hora, la hora indicada arriba. Para los avisos (minutos, horas o días) usa la app de Google Calendar.</p></div>' +
      '<div class="form-errors" id="evErrors" hidden></div>';
    var footer = (ev.id ? '<button type="button" class="btn btn-danger" id="evDelete">' + UI.icon('trash') + ' Borrar</button>' : '') +
      '<button type="button" class="btn" id="evCancel">Cancelar</button>' +
      '<button type="button" class="btn btn-primary" id="evSave">' + UI.icon('check') + ' Guardar</button>';
    var m = UI.modal({ title: ev.id ? 'Editar evento' : 'Nuevo evento', body: body, footer: footer });
    var cuando = body.querySelector('#evCuando');
    var horaWrap = body.querySelector('#evHoraWrap');
    var errBox = body.querySelector('#evErrors');
    var btnSave = m.el.querySelector('#evSave');
    var btnCancel = m.el.querySelector('#evCancel');
    var btnDelete = m.el.querySelector('#evDelete');
    var gcalLink = m.el.querySelector('#evGCalLink');
    var inpFecha = body.querySelector('#evFecha');
    var inpHora = body.querySelector('#evHora');
    var inpDesc = body.querySelector('#evDesc');

    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function refreshGCal() {
      var fecha = inpFecha.value;
      var desc = inpDesc.value.trim();
      var todo = cuando.value === 'todo';
      var hora = todo ? null : inpHora.value;
      if (!fecha || !desc || (!todo && !hora)) {
        gcalLink.removeAttribute('href');
        gcalLink.setAttribute('aria-disabled', 'true');
        gcalLink.classList.add('disabled');
        return;
      }
      var d = fecha.split('-');
      var y = +d[0], mo = +d[1] - 1, dia = +d[2];
      var dates;
      if (todo) {
        dates = fmtGCalDate(new Date(y, mo, dia)) + '/' + fmtGCalDate(new Date(y, mo, dia));
      } else {
        var tp = hora.split(':');
        var start = new Date(y, mo, dia, +tp[0], +tp[1], 0);
        var end = new Date(start.getTime() + 60 * 60 * 1000);
        dates = fmtGCalDT(start) + '/' + fmtGCalDT(end);
      }
      var det = 'Evento (Cuidador Canino).\n\n' +
        (todo ? 'Todo el día' : 'Hora: ' + hora) + '\n' +
        'Fecha: ' + C.fmtDMY(fecha) + '\n' +
        'Descripción: ' + desc;
      gcalLink.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        '&text=' + encodeURIComponent(desc) +
        '&dates=' + dates +
        '&details=' + encodeURIComponent(det);
      gcalLink.classList.remove('disabled');
      gcalLink.removeAttribute('aria-disabled');
    }
    function fmtGCalDate(dt) {
      return '' + dt.getFullYear() + pad2(dt.getMonth() + 1) + pad2(dt.getDate());
    }
    function fmtGCalDT(dt) {
      return fmtGCalDate(dt) + 'T' + pad2(dt.getHours()) + pad2(dt.getMinutes()) + '00';
    }
    refreshGCal();
    cuando.addEventListener('change', function () { horaWrap.hidden = cuando.value === 'todo'; refreshGCal(); });
    inpFecha.addEventListener('input', refreshGCal);
    inpHora.addEventListener('input', refreshGCal);
    inpDesc.addEventListener('input', refreshGCal);
    btnCancel.addEventListener('click', function () { m.close(); });

    function save() {
      var errs = [];
      var fecha = body.querySelector('#evFecha').value;
      var desc = body.querySelector('#evDesc').value.trim();
      var todo = cuando.value === 'todo';
      var hora = todo ? null : body.querySelector('#evHora').value;
      if (!fecha) errs.push('La fecha es obligatoria.');
      if (!desc) errs.push('La descripción es obligatoria.');
      if (!todo && !hora) errs.push('Indica la hora del evento.');
      if (errs.length) {
        errBox.innerHTML = '<strong>Revisa el formulario:</strong><ul>' + errs.map(function (s) { return '<li>' + UI.esc(s) + '</li>'; }).join('') + '</ul>';
        errBox.hidden = false;
        return;
      }
      Store.saveEvent({ id: ev.id, fecha: fecha, todo_dia: todo, hora: hora, descripcion: desc }).then(function () {
        m.close();
        UI.toast(ev.id ? 'Evento actualizado' : 'Evento creado', 'success');
        if (ctx && ctx.refresh) ctx.refresh();
      }).catch(function (err) {
        UI.toast('Error al guardar el evento: ' + err.message, 'error');
      });
    }
    btnSave.addEventListener('click', save);
    if (btnDelete) {
      btnDelete.addEventListener('click', async function () {
        var ok = await UI.confirmDialog({ title: 'Eliminar evento', message: '¿Está seguro de eliminar este evento?', confirmText: 'Sí, eliminar' });
        if (!ok) return;
        Store.deleteEvent(ev.id).then(function () {
          m.close();
          UI.toast('Evento eliminado', 'success');
          if (ctx && ctx.refresh) ctx.refresh();
        }).catch(function (err) {
          UI.toast('Error al borrar el evento: ' + err.message, 'error');
        });
      });
    }
  }

  function monthLabel(y, m0) {
    var d = new Date(y, m0, 1);
    var txt = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  root.Views = root.Views || {};
  root.Views.calendario = {
    title: 'Calendario',
    render: render,
    openEventModal: openEventModal,
    setMonth: function (y, m) { state = { y: y, m: m }; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
