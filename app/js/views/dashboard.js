/* Cuidador Canino - Vista Dashboard */
(function (root) {
  'use strict';
  var C = root.Calc, UI = root.UI, Store = root.Store;

  async function render(container, params, ctx) {
    var today = C.todayISO();
    var days7 = C.addDaysISO(today, 100);

    var [services, dogs, todayEvents] = await Promise.all([
      Store.listServices(),
      Store.listDogs({ includeInactive: false }),
      Store.listEventsInRange(today, today)
    ]);
    var dogMap = {};
    dogs.forEach(function (d) { dogMap[d.id] = d; });

    var active = services.filter(function (s) {
      return s.estado !== 'cancelado' && s.desde <= today && s.hasta >= today;
    });
    var boarding = active.filter(function (s) { return s.tipo === 'hospedaje'; });
    var walks = active.filter(function (s) { return s.tipo === 'paseo'; });
    var upcoming = services.filter(function (s) {
      return s.estado !== 'cancelado' && s.desde >= today && s.desde <= days7;
    }).sort(function (a, b) { return a.desde.localeCompare(b.desde) || a.hasta.localeCompare(b.hasta); });
    if (!upcoming.length) {
      upcoming = services.filter(function (s) {
        return s.estado !== 'cancelado' && s.desde >= today;
      }).sort(function (a, b) { return a.desde.localeCompare(b.desde) || a.hasta.localeCompare(b.hasta); }).slice(0, 3);
    }

    function serviceLinkHtml(s, extra) {
      return '<button class="link-chip" data-go="servicios/edit/' + s.id + '">' +
        '<span class="chip-dot chip-' + (s.tipo === 'hospedaje' ? 'blue' : 'green') + (s.paga_senal > 0 ? '' : ' chip-red') + '"></span>' +
        UI.tipoLabel(s.tipo) + ' · ' + C.fmtDMY(s.desde) + ' → ' + C.fmtDMY(s.hasta) +
        ' · ' + UI.estadoLabel(s.estado) + (extra || '') + '</button>';
    }

    function dogChipHtml(id, label) {
      var d = dogMap[id];
      if (!d) return '';
      return '<button class="link-chip" data-go="perros/edit/' + id + '">' + UI.avatarHtml(d, 36) +
        '<span>' + UI.esc(label || d.nombre) + '</span></button>';
    }

    function dogChips(s) {
      return (s.dog_ids || []).map(function (id) {
        var d = dogMap[id];
        return dogChipHtml(id, d ? d.nombre : '¿?');
      }).join(' ');
    }

    var html = '';
    html += '<div class="view-head"><h1>Dashboard</h1><p class="view-sub">Hoy, ' + C.fmtDMY(today) + '</p>' +
      '<div class="view-actions">' +
      '<button class="btn btn-primary" id="dashNewService">' + UI.icon('plus') + ' Nuevo servicio</button>' +
      '<button class="btn btn-primary" id="dashNewEvent">' + UI.icon('plus') + ' Nuevo evento</button>' +
      '</div></div>';

    html += '<div class="cards-grid dash-grid">';

    /* Hospedajes activos hoy */
    html += '<section class="card"><h2>' + UI.icon('home') + ' Hospedajes activos hoy</h2>';
    if (!boarding.length) {
      html += '<p class="muted empty">Sin hospedajes que incluyan hoy.</p>';
    } else {
      html += '<div class="dash-list">';
      boarding.forEach(function (s) {
        html += '<div class="dash-item">' + dogChips(s) + '<div class="dash-item-right">' + serviceLinkHtml(s) + '</div></div>';
      });
      html += '</div>';
    }
    html += '</section>';

    /* Paseos hoy */
    html += '<section class="card"><h2>' + UI.icon('walking') + ' Paseos programados hoy</h2>';
    if (!walks.length) {
      html += '<p class="muted empty">Sin paseos que incluyan hoy.</p>';
    } else {
      html += '<div class="dash-list">';
      walks.forEach(function (s) {
        html += '<div class="dash-item">' + dogChips(s) + '<div class="dash-item-right">' + serviceLinkHtml(s) + '</div></div>';
      });
      html += '</div>';
    }
    html += '</section>';

    /* Eventos de hoy */
    html += '<section class="card"><h2>' + UI.icon('calendar') + ' Eventos de hoy</h2>';
    if (!todayEvents.length) {
      html += '<p class="muted empty">Sin eventos para hoy.</p>';
    } else {
      html += '<div class="dash-list">';
      todayEvents.forEach(function (ev) {
        var label = ev.todo_dia ? 'Todo el día' : (ev.hora || '');
        html += '<button class="dash-item dash-item-btn" data-go="calendario/evento/' + ev.id + '">' +
          '<span class="dash-date">' + UI.esc(label) + '</span>' +
          '<span>' + UI.esc(ev.descripcion) + '</span>' +
          '</button>';
      });
      html += '</div>';
    }
    html += '</section>';

    /* Próximos servicios */
    html += '<section class="card card-wide"><h2>' + UI.icon('calendar') + ' Próximos servicios</h2>';
    if (!upcoming.length) {
      html += '<p class="muted empty">No hay servicios programados a partir de hoy.</p>';
    } else {
      html += '<p class="hint">Próximos 100 días, o los 3 siguientes si no hay ninguno antes.</p>';
      html += '<div class="dash-list">';
      upcoming.forEach(function (s) {
        html += '<div class="dash-item"><span class="dash-date">' + C.fmtLongDMY(s.desde) + '</span>' +
          '<span class="dash-dogs">' + dogChips(s) + '</span>' +
          '<div class="dash-item-right">' + serviceLinkHtml(s, ' · ' + C.fmtMoney(C.calcTotalSvc(s))) + '</div></div>';
      });
      html += '</div>';
    }
    html += '</section>';
    html += '</div>';

    container.innerHTML = html;

    document.getElementById('dashNewService').addEventListener('click', function () { ctx.go('servicios/nuevo'); });
    document.getElementById('dashNewEvent').addEventListener('click', function () {
      root.Views.calendario.openEventModal(null, ctx);
    });

    container.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { ctx.go(b.dataset.go); });
    });
  }

  root.Views = root.Views || {};
  root.Views.dashboard = { title: 'Dashboard', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
