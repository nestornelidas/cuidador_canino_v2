/* Cuidador Canino - Vista Servicios */
(function (root) {
  'use strict';
  var C = root.Calc, UI = root.UI, Store = root.Store;

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function estadoColor(estado) {
    return (Store.getConfig().colores || {})[estado] || '#94a3b8';
  }

  /* ============ LISTADO ============ */

  function buildList(container, ctx) {
    var html = '';
    html += '<div class="view-head"><h1>Servicios</h1><div class="view-actions">' +
      '<button class="btn btn-primary" id="nuevoServicio">' + UI.icon('plus') + ' Nuevo servicio</button>' +
      '</div></div>';
    html += '<div class="card">';
    html += '<div class="filter-bar">' +
      '<select class="input" id="fYear"><option value="">Todos los años</option></select>' +
      '<select class="input" id="fDog"><option value="">Todos los perros</option></select>' +
      '<select class="input" id="fTipo"><option value="">Todos los tipos</option><option value="hospedaje">Hospedaje</option><option value="paseo">Paseo</option></select>' +
      '<select class="input" id="fEstado"><option value="">Todos los estados</option>' +
      Object.keys(UI.ESTADOS).map(function (k) { return '<option value="' + k + '">' + UI.ESTADOS[k] + '</option>'; }).join('') +
      '</select>' +
      '</div>';
    html += '<div class="table-tools"><span class="muted" id="svcCount"></span><span class="muted" id="svcTotals"></span></div>';
    html += '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th></th><th>Perros</th><th>Tipo</th><th>Fechas</th><th>Subtotal</th><th>Paga y señal</th><th>Plus</th><th>Total</th><th>Pendiente</th><th>Estado</th><th class="ta-r">Acciones</th>' +
      '</tr></thead><tbody id="svcTbody"></tbody></table></div>';
    html += '</div>';
    container.innerHTML = html;

    document.getElementById('nuevoServicio').addEventListener('click', function () { ctx.go('servicios/nuevo'); });

    var initialYearDefault = true;

    async function paint() {
      var [services, dogs] = await Promise.all([Store.listServices(), Store.listDogs({ includeInactive: false })]);
      var dogMap = {}; dogs.forEach(function (d) { dogMap[d.id] = d; });

      var yearSel = document.getElementById('fYear');
      var years = {};
      services.forEach(function (s) { if (s.desde) years[s.desde.slice(0, 4)] = true; });
      var yOpts = Object.keys(years).sort().reverse();
      var cur = yearSel.value;
      if (cur && yOpts.indexOf(cur) === -1) cur = '';
      if (!cur && initialYearDefault) {
        cur = String(new Date().getFullYear());
        if (yOpts.indexOf(cur) === -1) cur = '';
        initialYearDefault = false;
      }
      yearSel.innerHTML = '<option value="">Todos los años</option>' + yOpts.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
      yearSel.value = cur;

      var dogSel = document.getElementById('fDog');
      var dcur = dogSel.value;
      dogSel.innerHTML = '<option value="">Todos los perros</option>' + dogs.map(function (d) { return '<option value="' + d.id + '">' + UI.esc(d.nombre) + '</option>'; }).join('');
      dogSel.value = dcur;

      var fY = yearSel.value, fD = dogSel.value, fT = document.getElementById('fTipo').value, fE = document.getElementById('fEstado').value;
      var list = services.filter(function (s) {
        if (fY && s.desde && s.desde.slice(0, 4) !== fY) return false;
        if (fD && !(s.dog_ids || []).includes(fD)) return false;
        if (fT && s.tipo !== fT) return false;
        if (fE && s.estado !== fE) return false;
        return true;
      }).sort(function (a, b) { return String(b.desde).localeCompare(String(a.desde)); });

      var sumTotal = 0, sumPend = 0;
      list.forEach(function (s) {
        sumTotal += C.calcTotalSvc(s);
        sumPend += C.calcPendienteSvc(s);
      });
      document.getElementById('svcCount').textContent = list.length + ' servicios';
      document.getElementById('svcTotals').textContent = 'Total: ' + C.fmtMoney(sumTotal) + ' · Pendiente: ' + C.fmtMoney(sumPend);

      var tbody = document.getElementById('svcTbody');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="11" class="empty-cell">No hay servicios que coincidan con los filtros.</td></tr>';
        return;
      }
      tbody.innerHTML = list.map(function (s) {
        var names = (s.dog_ids || []).map(function (id) { return dogMap[id] ? dogMap[id].nombre : '¿?'; }).join(', ');
        var pend = C.calcPendienteSvc(s);
        return '<tr class="svc-row" data-id="' + s.id + '">' +
          '<td><span class="chip-dot" style="background:' + estadoColor(s.estado) + '" title="' + UI.estadoLabel(s.estado) + '"></span></td>' +
          '<td>' + UI.esc(names) + '</td>' +
          '<td>' + UI.tipoLabel(s.tipo) + '</td>' +
          '<td>' + C.fmtDMY(s.desde) + ' → ' + C.fmtDMY(s.hasta) + '</td>' +
          '<td>' + C.fmtMoney(s.coste_total) + '</td>' +
          '<td>' + C.fmtMoney(s.paga_senal) + '</td>' +
          '<td>' + C.fmtMoney(s.plus) + '</td>' +
          '<td>' + C.fmtMoney(C.calcTotalSvc(s)) + '</td>' +
          '<td>' + C.fmtMoney(pend) + '</td>' +
          '<td><span class="badge badge-' + s.estado + '">' + UI.estadoLabel(s.estado) + '</span></td>' +
          '<td class="ta-r"><div class="row-actions">' +
          '<button class="icon-btn" data-act="edit" data-id="' + s.id + '" title="Editar">' + UI.icon('pencil') + '</button>' +
          '<button class="icon-btn btn-danger-soft" data-act="del" data-id="' + s.id + '" title="Eliminar">' + UI.icon('trash') + '</button>' +
          '</div></td></tr>';
      }).join('');

      tbody.querySelectorAll('.svc-row').forEach(function (tr) {
        tr.addEventListener('click', function (e) {
          if (e.target.closest('[data-act]')) return;
          ctx.go('servicios/edit/' + tr.dataset.id);
        });
      });
      tbody.querySelectorAll('[data-act="edit"]').forEach(function (b) {
        b.addEventListener('click', function () { ctx.go('servicios/edit/' + b.dataset.id); });
      });
      tbody.querySelectorAll('[data-act="del"]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var ok = await UI.confirmDialog({ title: 'Eliminar servicio', message: '¿Está seguro de eliminar este servicio?', confirmText: 'Sí, eliminar' });
          if (!ok) return;
          await Store.deleteService(b.dataset.id);
          UI.toast('Servicio eliminado', 'success');
          App.refresh();
        });
      });
    }

    ['fYear', 'fDog', 'fTipo', 'fEstado'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', paint);
    });
    paint();
  }

  /* ============ FORMULARIO ============ */

  async function buildForm(container, ctx, service) {
    var editing = !!service;
    var config = Store.getConfig();
    var dogs = await Store.listDogs({ includeInactive: true });

    /* estado del formulario */
    var fs = {
      tipo: service ? service.tipo : 'hospedaje',
      dogIds: new Set(service ? (service.dog_ids || []) : []),
      costeBase: service ? C.num(service.coste_base) : config.costeHospedaje,
      pagaSenal: service ? C.num(service.paga_senal) : 0,
      plus: service ? C.num(service.plus) : 0,
      estado: service ? (service.estado || 'pendiente') : 'pendiente',
      notas: service ? (service.notas || '') : '',
      totalManual: !!(service && service.coste_total_manual),
      costeTotal: service ? C.num(service.coste_total) : null
    };
    var dogMap = {};
    dogs.forEach(function (d) { dogMap[d.id] = d; });

    /* Paseos del servicio (filas de paseo). Cuota: { tiempo_desplazamiento, tiempo_paseo, numero_paseos } */
    function initPaseos() {
      if (!service || service.tipo !== 'paseo') return [];
      if (service.paseos && service.paseos.length) {
        return service.paseos.map(function (p) { return { tiempo_desplazamiento: C.num(p.tiempo_desplazamiento), tiempo_paseo: C.num(p.tiempo_paseo), numero_paseos: C.num(p.numero_paseos) }; });
      }
      /* modelo antiguo (min_desplazamiento/min_paseo) -> una sola fila */
      return [{ tiempo_desplazamiento: C.num(service.min_desplazamiento), tiempo_paseo: C.num(service.min_paseo), numero_paseos: 1 }];
    }
    fs.paseos = initPaseos();
    if (!fs.dogIds.size && service && service.dog_ids) fs.dogIds = new Set(service.dog_ids);

    var html = '';
    html += '<div class="view-head"><h1>' + (editing ? 'Editar servicio' : 'Nuevo servicio') + '</h1><div class="view-actions">' +
      '<button class="btn" id="backServices">' + UI.icon('back') + ' Volver</button>' +
      (editing ? '<button class="btn btn-danger" id="delService">' + UI.icon('trash') + ' Eliminar</button>' : '') +
      '</div></div>';
    html += '<div class="card form-card"><form id="svcForm" novalidate>';
    html += '<div class="form-errors" hidden></div>';

    html += '<div class="form-grid form-grid-3">';
    html += '<div class="form-field"><label>Tipo de servicio *</label><select class="input" name="tipo">' +
      '<option value="hospedaje">Hospedaje</option><option value="paseo">Paseo</option></select></div>';
    html += '<div class="form-field"><label>Desde *</label><input type="date" class="input" name="desde" value="' + (editing ? service.desde : '') + '"></div>';
    html += '<div class="form-field"><label>Hasta *</label><input type="date" class="input" name="hasta" value="' + (editing ? service.hasta : '') + '"></div>';
    html += '</div>';

    html += '<div class="form-field"><label>Perro(s) *</label>';
    html += '<div class="searchbox dog-searchbox">' + UI.icon('search') + '<input type="text" id="buscaPerroSvc" class="input" placeholder="Buscar perro..."></div>';
    html += '<div id="dogCheckboxList" class="dog-check-list"></div>';
    html += '<button type="button" class="btn btn-soft" id="nuevoPerroSvc">' + UI.icon('plus') + ' Nuevo perro</button></div>';

    /* Recuadro de paseos del servicio (solo tipo paseo) */
    html += '<fieldset class="fieldset" id="paseosBox">';
    html += '<legend>' + UI.icon('walking') + ' Paseos del servicio</legend>';
    html += '<p class="hint">Los tiempos van en minutos. Coste desplazamiento = T. despl. × coste base / 60; coste paseo = T. paseo × coste base / 60; total paseo = subtotal × nº de paseos.</p>';
    html += '<div class="table-wrap"><table class="table table-mini"><thead><tr>' +
      '<th>T. desp.<br><em>(min)</em></th><th>Coste desp.</th><th>T. paseo<br><em>(min)</em></th><th>Coste paseo</th><th>Subtotal</th><th>Nº</th><th>Total paseo</th><th class="ta-r">Acciones</th>' +
      '</tr></thead><tbody id="paseoTbody"></tbody></table></div>';
    html += '<button type="button" class="btn btn-soft" id="addPaseoRow">' + UI.icon('plus') + ' Añadir paseo</button>';
    html += '</fieldset>';

    /* Recuadro de cálculo del importe (incluye el campo "Estado del servicio"). En paseo no se muestra el subtotal. */
    html += '<fieldset class="fieldset" id="calcBox">';
    html += '<legend>' + UI.icon('wallet') + ' Cálculo del importe</legend>';
    html += '<div class="form-grid form-grid-3">';
    html += '<div class="form-field"><label>Coste base (€/día o €/hora) *</label><input type="number" class="input" name="coste_base" min="0" step="0.01" value="' + fs.costeBase + '"></div>';
    html += '<div class="form-field" id="fieldSubtotal"><label>Subtotal *</label><input type="number" class="input" name="coste_total" min="0" step="0.01" value="' + (fs.costeTotal != null ? fs.costeTotal : '') + '">' +
      '<p class="hint" id="totalHint">Se recalcula automáticamente al modificar fechas, perros, coste base o paseos.</p></div>';
    html += '<div class="form-field" id="fieldDias"><label>Días naturales</label><div class="static-val" id="diasVal">—</div></div>';
    html += '</div>';
    html += '<div class="form-grid form-grid-3">';
    html += '<div class="form-field"><label>Paga y señal (€) *</label><input type="number" class="input" name="paga_senal" min="0" step="0.01" value="' + fs.pagaSenal + '">' +
      '<p class="hint" id="senalHint"></p></div>';
    html += '<div class="form-field"><label>Plus (€)</label><input type="number" class="input" name="plus" min="0" step="0.01" value="' + fs.plus + '"></div>';
    html += '<div class="form-field"><label>Total</label><div class="static-val" id="totalVal">—</div>' +
      '<p class="hint">Subtotal + Plus</p></div>';
    html += '</div>';
    html += '<div class="form-grid form-grid-2">';
    html += '<div class="form-field"><label>Pendiente</label><div class="static-val pend-val" id="pendienteVal">—</div>' +
      '<p class="hint">Total − Paga y señal</p></div>';
    html += '<div class="form-field"><label>Estado del servicio</label><select class="input" name="estado">' +
      Object.keys(UI.ESTADOS).map(function (k) { return '<option value="' + k + '">' + UI.ESTADOS[k] + '</option>'; }).join('') +
      '</select></div>';
    html += '</div></fieldset>';

    /* Recuadro de alertas: planes de medicación activos (no vencidos) de los perros seleccionados */
    html += '<fieldset class="fieldset" id="alertasBox">';
    html += '<legend>' + UI.icon('alert') + ' Alertas</legend>';
    html += '<p class="hint">Notas de medicación activas (no vencidas) de los perros seleccionados. Se guardan en la ficha del perro.</p>';
    html += '<div id="alertasList"><span class="muted">Selecciona perros para ver sus alertas.</span></div>';
    html += '</fieldset>';

    html += '<div class="form-field"><label>Notas internas</label><textarea class="input" name="notas" rows="3" placeholder="Observaciones del cuidador...">' + UI.esc(fs.notas) + '</textarea></div>';

    /* Alarmas y comunicaciones en paralelo para no alargar el formulario */
    html += '<div class="form-grid form-grid-2">';
    html += '<fieldset class="fieldset" id="alarmaBox">';
    html += '<legend>' + UI.icon('bell') + ' Alarmas</legend>';
    html += '<p class="hint">Destino: el <strong>cuidador</strong>. El enlace abre en tu Google Calendar el evento de este servicio <strong>con hora</strong>, ' +
      'para que allí puedas añadirle el aviso (minutos, horas o días) antes del inicio.</p>';
    html += '<div class="form-grid">';
    html += '<div class="form-field"><label>Hora de inicio (opcional)</label>' +
      '<input type="time" class="input" id="alarmaHora" value="09:00">' +
      '<p class="hint">Se usa solo para el evento de Google Calendar. Si se deja vacía se toma 09:00.</p></div>';
    html += '<div class="form-field"><a class="btn btn-sm btn-pale" id="alarmaLink" target="_blank" rel="noopener noreferrer" href="#">' + UI.icon('calendar') + ' Abrir evento en Google Calendar</a></div>';
    html += '</div></fieldset>';
    html += '<fieldset class="fieldset" id="commsBox">';
    html += '<legend>' + UI.icon('send') + ' Comunicaciones automáticas</legend>';
    html += '<p class="hint">Genera mensajes para los contactos de los perros del servicio usando las plantillas, y envíalos por WhatsApp o Telegram.</p>';
    html += '<div class="form-grid">';
    html += '<div class="form-field"><button type="button" class="btn btn-sm btn-pale" id="btnComms">' + UI.icon('send') + ' Generar</button></div>';
    html += '<div class="form-field"><label>Contacto(s) asociados (automático: contactos comunes de los perros del servicio)</label>' +
      '<div id="svcContacts" class="contacts-chip-list"><span class="muted">Selecciona perros para ver sus contactos.</span></div></div>';
    html += '</div></fieldset>';
    html += '</div>';

    html += '<div class="form-actions">';
    html += '<button type="button" class="btn" id="cancelSvc">Cancelar</button>';
    html += '<button type="submit" class="btn btn-primary">' + UI.icon('check') + ' Guardar servicio</button>';
    html += '</div>';

    html += '</form></div>';

    container.innerHTML = html;

    var form = container.querySelector('#svcForm');
    var errBox = form.querySelector('.form-errors');

    function $n(name) { return form.querySelector('[name="' + name + '"]'); }
    $n('tipo').value = fs.tipo;
    $n('estado').value = fs.estado;

    /* ---- recálculo automático ---- */
    var dogListEl = container.querySelector('#dogCheckboxList');

    var paseoBox = container.querySelector('#paseosBox');
    var paseoTbody = container.querySelector('#paseoTbody');

    function paseoRowHtml(p, idx) {
      p = p || {};
      var base = C.num($n('coste_base').value);
      var costeDesp = C.calcCosteTiempo(p.tiempo_desplazamiento, base);
      var costePaseo = C.calcCosteTiempo(p.tiempo_paseo, base);
      var sub = C.round2(costeDesp + costePaseo);
      var total = C.round2(sub * C.num(p.numero_paseos));
      return '<tr class="paseo-row" data-idx="' + idx + '">' +
        '<td><input type="number" class="input" data-pf="tiempo_desplazamiento" min="0" step="1" value="' + (p.tiempo_desplazamiento != null ? p.tiempo_desplazamiento : '') + '" title="Tiempo desplazamiento (min)"></td>' +
        '<td><div class="static-val sm" data-pfcalc="coste_desplazamiento">' + C.fmtMoney(costeDesp) + '</div></td>' +
        '<td><input type="number" class="input" data-pf="tiempo_paseo" min="0" step="1" value="' + (p.tiempo_paseo != null ? p.tiempo_paseo : '') + '" title="Tiempo paseo (min)"></td>' +
        '<td><div class="static-val sm" data-pfcalc="coste_paseo">' + C.fmtMoney(costePaseo) + '</div></td>' +
        '<td><div class="static-val sm" data-pfcalc="subtotal">' + C.fmtMoney(sub) + '</div></td>' +
        '<td><input type="number" class="input" data-pf="numero_paseos" min="1" step="1" value="' + (p.numero_paseos != null ? p.numero_paseos : 1) + '" title="Número de paseos"></td>' +
        '<td><div class="static-val sm" data-pfcalc="total_paseo">' + C.fmtMoney(total) + '</div></td>' +
        '<td class="ta-r"><button type="button" class="icon-btn btn-danger-soft" data-rmp title="Quitar paseo">' + UI.icon('x') + '</button></td>' +
        '</tr>';
    }

    function recalcPaseoRow(row) {
      var base = C.num($n('coste_base').value);
      var td = C.num(row.querySelector('[data-pf="tiempo_desplazamiento"]').value);
      var tp = C.num(row.querySelector('[data-pf="tiempo_paseo"]').value);
      var n = C.num(row.querySelector('[data-pf="numero_paseos"]').value);
      var costeDesp = C.calcCosteTiempo(td, base);
      var costePaseo = C.calcCosteTiempo(tp, base);
      var sub = C.round2(costeDesp + costePaseo);
      var total = C.round2(sub * n);
      row.querySelector('[data-pfcalc="coste_desplazamiento"]').textContent = C.fmtMoney(costeDesp);
      row.querySelector('[data-pfcalc="coste_paseo"]').textContent = C.fmtMoney(costePaseo);
      row.querySelector('[data-pfcalc="subtotal"]').textContent = C.fmtMoney(sub);
      row.querySelector('[data-pfcalc="total_paseo"]').textContent = C.fmtMoney(total);
    }

    function collectPaseos() {
      return Array.from(paseoTbody.querySelectorAll('.paseo-row')).map(function (row) {
        return {
          tiempo_desplazamiento: C.num(row.querySelector('[data-pf="tiempo_desplazamiento"]').value),
          tiempo_paseo: C.num(row.querySelector('[data-pf="tiempo_paseo"]').value),
          numero_paseos: C.num(row.querySelector('[data-pf="numero_paseos"]').value)
        };
      });
    }

    function addPaseoRowToDom(p, idx) {
      var tpl = document.createElement('template');
      tpl.innerHTML = paseoRowHtml(p, idx).trim();
      var tr = tpl.content.firstElementChild;
      paseoTbody.appendChild(tr);
      tr.querySelectorAll('[data-pf]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          recalcPaseoRow(tr);
          fs.totalManual = false;
          recalc();
        });
      });
      tr.querySelector('[data-rmp]').addEventListener('click', function () {
        tr.remove();
        recalc();
      });
      return tr;
    }

    (fs.paseos.length ? fs.paseos : [{}]).forEach(function (p, i) { addPaseoRowToDom(p, i); });
    container.querySelector('#addPaseoRow').addEventListener('click', function () {
      addPaseoRowToDom({}, paseoTbody.querySelectorAll('.paseo-row').length);
      recalc();
    });

    function paseoSubtotal() {
      var base = C.num($n('coste_base').value);
      return C.calcPaseosTotal(collectPaseos(), base);
    }

    function autoTotal() {
      var tipo = $n('tipo').value;
      var base = C.num($n('coste_base').value);
      var nDogs = fs.dogIds.size;
      if (tipo === 'hospedaje') {
        return C.calcHospedajeTotal(C.diffDaysInclusive($n('desde').value, $n('hasta').value), base, nDogs);
      }
      return paseoSubtotal();
    }

    function updatePendiente() {
      var total = C.num($n('coste_total').value);
      var plus = C.num($n('plus').value);
      container.querySelector('#totalVal').textContent = C.fmtMoney(C.calcTotalSvc({ coste_total: total, plus: plus }));
      var pend = C.calcPendienteSvc({ coste_total: total, plus: plus, paga_senal: $n('paga_senal').value, estado: $n('estado').value });
      container.querySelector('#pendienteVal').textContent = C.fmtMoney(pend);
    }

    function updateSenalHint() {
      var hint = container.querySelector('#senalHint');
      if ($n('tipo').value === 'hospedaje') {
        var dias = C.diffDaysInclusive($n('desde').value, $n('hasta').value);
        var prev = C.calcSenalPrevista(dias, $n('coste_base').value);
        hint.textContent = 'Paga y señal prevista: ' + C.fmtMoney(prev) + ' (= ceil(' + (isNaN(dias) ? '?' : dias) + ' días / 7) × ' + C.fmtMoney(C.num($n('coste_base').value)) + ')';
      } else {
        hint.textContent = '';
      }
    }

    function updateDias() {
      var el = container.querySelector('#diasVal');
      if ($n('tipo').value === 'hospedaje') {
        var dias = C.diffDaysInclusive($n('desde').value, $n('hasta').value);
        el.textContent = isNaN(dias) ? '—' : dias + (dias === 1 ? ' día' : ' días');
        container.querySelector('#fieldDias').style.display = '';
      } else {
        container.querySelector('#fieldDias').style.display = 'none';
      }
    }

    function updatePaseoSections() {
      var isPaseo = $n('tipo').value === 'paseo';
      paseoBox.style.display = isPaseo ? '' : 'none';
      container.querySelector('#fieldSubtotal').style.display = isPaseo ? 'none' : '';
      container.querySelector('#fieldDias').style.display = isPaseo ? 'none' : '';
    }

    function recalc() {
      var isPaseo = $n('tipo').value === 'paseo';
      if (!fs.totalManual || isPaseo) {
        var t = autoTotal();
        $n('coste_total').value = isNaN(t) ? '' : C.round2(t);
      }
      updatePendiente();
      updateSenalHint();
      updateDias();
    }

    function componentChanged() {
      fs.totalManual = false;
      recalc();
    }

    ['desde', 'hasta', 'coste_base'].forEach(function (name) {
      $n(name).addEventListener('input', function () {
        Array.from(paseoTbody.querySelectorAll('.paseo-row')).forEach(recalcPaseoRow);
        componentChanged();
        refreshAlarmaFromForm();
      });
    });
    $n('tipo').addEventListener('change', function () {
      fs.totalManual = false;
      /* Si el coste base coincide con el predeterminado del tipo que se deja,
         aplicar el predeterminado del nuevo tipo; si el usuario lo personalizó, respetarlo */
      var prevDefault = fs.tipo === 'paseo' ? config.costePaseo : config.costeHospedaje;
      if (C.num($n('coste_base').value) === C.num(prevDefault)) {
        $n('coste_base').value = $n('tipo').value === 'paseo' ? config.costePaseo : config.costeHospedaje;
      }
      fs.tipo = $n('tipo').value;
      updatePaseoSections();
      recalc();
      refreshAlarmaFromForm();
    });
    $n('paga_senal').addEventListener('input', updatePendiente);
    $n('notas').addEventListener('input', refreshAlarmaFromForm);
    $n('plus').addEventListener('input', updatePendiente);
    $n('estado').addEventListener('change', updatePendiente);
    $n('coste_total').addEventListener('input', function () {
      fs.totalManual = true;
      updatePendiente();
    });

    /* ---- checkboxes de perros ---- */
    var buscaPerroSvc = container.querySelector('#buscaPerroSvc');
    function hasRedFlag(d) {
      return !!d && (d.comportamientos || []).some(function (c) {
        return String(c).toUpperCase().indexOf('RED FLAG') !== -1;
      });
    }
    function paintDogChecks() {
      var q = buscaPerroSvc.value.trim().toLowerCase();
      var hideDecesos = !!(Store.getConfig().ocultarDecesos);
      var hideRedFlags = !!(Store.getConfig().ocultarRedFlags);
      var visible = dogs.filter(function (d) {
        if (q && d.nombre.toLowerCase().indexOf(q) === -1) return false;
        if (hideDecesos && (d.fecha_deceso || d.es_deceso)) return false;
        if (hideRedFlags && hasRedFlag(d)) return false;
        return true;
      });
      dogListEl.innerHTML = visible.map(function (d) {
        var checked = fs.dogIds.has(d.id);
        var inactive = d.activo === false;
        return '<label class="dog-check' + (inactive ? ' dog-check-inactive' : '') + '">' +
          '<input type="checkbox" value="' + d.id + '" ' + (checked ? 'checked' : '') + '>' +
          UI.avatarHtml(d, 48) +
          '<span class="dog-check-name">' + UI.esc(d.nombre) + (inactive ? ' <em>(inactivo)</em>' : '') + '</span>' +
          '</label>';
      }).join('');
      if (!visible.length) {
        var allOcultos = !q && (hideDecesos || hideRedFlags) && dogs.length > 0 && dogs.every(function (d) {
          if (hideDecesos && (d.fecha_deceso || d.es_deceso)) return true;
          if (hideRedFlags && hasRedFlag(d)) return true;
          return false;
        });
        dogListEl.innerHTML = '<span class="muted">' + (allOcultos ? 'Todos los perros están ocultos por las preferencias activadas.' : 'No hay perros que coincidan con la búsqueda.') + '</span>';
      }
      dogListEl.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
        cb.addEventListener('change', function () {
          if (cb.checked) fs.dogIds.add(cb.value);
          else fs.dogIds.delete(cb.value);
          componentChanged();
          paintCommonContacts();
          paintAlertas();
          refreshAlarmaFromForm();
        });
      });
    }
    paintDogChecks();
    buscaPerroSvc.addEventListener('input', paintDogChecks);

    var contactTimer = null;
    function paintCommonContacts() {
      clearTimeout(contactTimer);
      contactTimer = setTimeout(async function () {
        var box = container.querySelector('#svcContacts');
        if (!box) return;
        if (!fs.dogIds.size) { box.innerHTML = '<span class="muted">Selecciona perros para ver sus contactos.</span>'; return; }
        var contacts = await Store.commonContactsForDogs(Array.from(fs.dogIds));
        if (!contacts.length) { box.innerHTML = '<span class="muted">Sin contactos comunes entre los perros seleccionados.</span>'; return; }
        var firstDog = Array.from(fs.dogIds)[0];
        box.innerHTML = contacts.map(function (c) {
          var chips = [];
          if (c.telefono) chips.push('<span class="ct-chip">' + UI.icon('phone') + ' ' + UI.esc(c.telefono) + '</span>');
          if (c.whatsapp) chips.push('<span class="ct-chip">' + UI.icon('message') + ' ' + UI.esc(c.whatsapp) + '</span>');
          if (c.telegram) chips.push('<span class="ct-chip">' + UI.icon('send') + ' ' + UI.esc(c.telegram) + '</span>');
          if (c.otros) chips.push('<span class="ct-chip">' + UI.icon('info') + ' ' + UI.esc(c.otros) + '</span>');
          return '<button type="button" class="contact-chip" data-go="perros/edit/' + firstDog + '" title="Ver el perro con sus datos de contacto">' + UI.icon('user') + ' <strong>' + UI.esc(c.nombre) + '</strong>' +
            (chips.length ? '<span class="ct-chips">' + chips.join('') + '</span>' : '') + '</button>';
        }).join('');
        box.querySelectorAll('[data-go]').forEach(function (b) {
          b.addEventListener('click', function () { ctx.go(b.dataset.go); });
        });
      }, 150);
    }
    paintCommonContacts();

    /* ---- Alertas: planes de medicación activos (no vencidos) de los perros seleccionados ---- */
    function paintAlertas() {
      var box = container.querySelector('#alertasList');
      if (!box) return;
      var today = C.todayISO();
      var items = [];
      Array.from(fs.dogIds).forEach(function (id) {
        var dd = dogMap[id];
        if (!dd) return;
        if (dd.notas_medicacion || dd.medicacion_expira) {
          if (dd.medicacion_expira && dd.medicacion_expira < today) return;
          items.push(dd);
        }
      });
      if (!items.length) {
        box.innerHTML = '<span class="muted">Sin planes de medicación activos para los perros seleccionados.</span>';
        return;
      }
      box.innerHTML = items.map(function (dd) {
        var parts = [];
        if (dd.notas_medicacion) parts.push('<strong>Notas:</strong> ' + UI.esc(dd.notas_medicacion));
        if (dd.medicacion_expira) parts.push('<strong>Expira el:</strong> ' + UI.esc(C.fmtDMY(dd.medicacion_expira)));
        return '<div class="alerta-item">' +
          '<div class="alerta-dog"><a href="#/perros/edit/' + dd.id + '">' + UI.avatarHtml(dd, 28) + ' <span>' + UI.esc(dd.nombre) + '</span></a></div>' +
          '<p class="alerta-text">' + parts.join('<br>') + '</p>' +
          '</div>';
      }).join('');
    }
    paintAlertas();

    /* ---- Alarmas (destino: el cuidador) ---- */
    var alarmaHora = container.querySelector('#alarmaHora');
    var alarmaLink = container.querySelector('#alarmaLink');
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function fmtGCal(dt) {
      return '' + dt.getFullYear() + pad2(dt.getMonth() + 1) + pad2(dt.getDate()) + 'T' + pad2(dt.getHours()) + pad2(dt.getMinutes()) + '00';
    }
    function refreshAlarma() {
      var desde = $n('desde').value;
      var hasta = $n('hasta').value;
      var hasDates = desde && hasta && fs.dogIds.size;
      if (hasDates) {
        var horaStr = alarmaHora.value || '09:00';
        var tp = String(horaStr).split(':');
        var names = Array.from(fs.dogIds).map(function (id) { return dogMap[id] ? dogMap[id].nombre : '?'; }).join(', ');
        var dFrom = desde.split('-');
        var dTo = hasta.split('-');
        var start = new Date(+dFrom[0], +dFrom[1] - 1, +dFrom[2], +tp[0], +tp[1], 0);
        var end = new Date(+dTo[0], +dTo[1] - 1, +dTo[2], +tp[0], +tp[1], 0);
        if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);
        var tipoLabel = UI.tipoLabel($n('tipo').value);
        var notas = $n('notas').value.trim();
        var det = 'Evento de servicio (Cuidador Canino).\n\n' +
          'Al guardar este evento puedes fijar un aviso (minutos, horas o días) antes del inicio.\n\n' +
          'Tipo: ' + tipoLabel + '\n' +
          'Perros: ' + names + '\n' +
          (notas ? 'Notas internas: ' + notas + '\n' : '') +
          'Desde: ' + C.fmtDMY(desde) + ' ' + horaStr + '\n' +
          'Hasta: ' + C.fmtDMY(hasta) + ' ' + horaStr + '\n' +
          'Total: ' + C.fmtMoney(C.calcTotalSvc({ coste_total: C.num($n('coste_total').value), plus: C.num($n('plus').value) }));
        alarmaLink.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
          '&text=' + encodeURIComponent(tipoLabel + ': ' + names) +
          '&dates=' + fmtGCal(start) + '/' + fmtGCal(end) +
          '&details=' + encodeURIComponent(det);
        alarmaLink.classList.remove('disabled');
        alarmaLink.removeAttribute('aria-disabled');
      } else {
        alarmaLink.removeAttribute('href');
        alarmaLink.setAttribute('aria-disabled', 'true');
        alarmaLink.classList.add('disabled');
      }
    }
    refreshAlarma();
    alarmaHora.addEventListener('input', refreshAlarma);
    function refreshAlarmaFromForm() { refreshAlarma(); }

    /* ---- Comunicaciones automáticas ---- */
    container.querySelector('#btnComms').addEventListener('click', async function () {
      if (!fs.dogIds.size) { UI.toast('Selecciona al menos un perro para poder comunicarse con sus contactos.', 'error'); return; }
      var [templates, contacts] = await Promise.all([
        Store.listTemplates(),
        Store.commonContactsForDogs(Array.from(fs.dogIds))
      ]);
      if (!contacts.length) { UI.toast('No hay contactos comunes entre los perros seleccionados.', 'error'); return; }
      if (!templates.length) { UI.toast('Crea antes alguna plantilla de texto en la pestaña Plantillas.', 'error'); return; }

      /* Contexto de sustitución de variables, común para todos los contactos */
      function serviceCtx(c) {
        var names = (Array.from(fs.dogIds)).map(function (id) { return dogMap[id] ? dogMap[id].nombre : '?'; });
        var selDogs = Array.from(fs.dogIds).map(function (id) { return dogMap[id]; }).filter(Boolean);
        var allHembras = selDogs.length > 0 && selDogs.every(function (d) { return d.sexo === 'hembra'; });
        var genero = selDogs.length === 0 ? 'm' : selDogs.length === 1 ? (selDogs[0].sexo === 'hembra' ? 'f' : 'm') : (allHembras ? 'pf' : 'pm');
        return {
          nombre_contacto: c.nombre || '',
          nombre_perro: C.joinNombres(names) || '',
          fecha_inicio: C.fmtDMY($n('desde').value) || '',
          fecha_fin: C.fmtDMY($n('hasta').value) || '',
          tipo: UI.tipoLabel($n('tipo').value),
          coste_total: C.fmtMoney(C.calcTotalSvc({ coste_total: C.num($n('coste_total').value), plus: C.num($n('plus').value) })),
          pendiente: C.fmtMoney(C.calcPendienteSvc({ coste_total: C.num($n('coste_total').value), plus: C.num($n('plus').value), paga_senal: $n('paga_senal').value, estado: $n('estado').value })),
          notas: $n('notas').value.trim(),
          manana_o_el: $n('desde').value && $n('desde').value === C.addDaysISO(C.todayISO(), 1) ? 'mañana' : 'el',
          estado: UI.estadoLabel($n('estado').value),
          genero: genero
        };
      }
      function phoneDigits(p) { return String(p || '').replace(/\D/g, ''); }
      function contactWa(c) { return phoneDigits(c.whatsapp || c.telefono); }
      function contactTg(c) {
        var t = String(c.telegram || '').trim().replace(/^@/, '');
        return t;
      }

      /* Cuerpo del modal: una tarjeta por contacto */
      var body = document.createElement('div');
      body.innerHTML = '<p class="hint">Selecciona la plantilla, ajusta el texto si quieres y envíalo por WhatsApp o Telegram. El mensaje se abre precargado en tu aplicación para que lo valides.</p>';
      var cards = contacts.map(function (c) {
        var options = templates.map(function (t) {
          return '<option value="' + UI.esc(t.id) + '">' + UI.esc(t.nombre) + '</option>';
        }).join('');
        var wa = contactWa(c);
        var tg = contactTg(c);
        var chips = [];
        if (c.telefono) chips.push('<span class="ct-chip">' + UI.icon('phone') + ' ' + UI.esc(c.telefono) + '</span>');
        if (c.whatsapp) chips.push('<span class="ct-chip">' + UI.icon('message') + ' ' + UI.esc(c.whatsapp) + '</span>');
        else if (wa) chips.push('<span class="ct-chip">' + UI.icon('message') + ' ' + UI.esc(c.telefono || '') + '</span>');
        if (c.telegram) chips.push('<span class="ct-chip">' + UI.icon('send') + ' ' + UI.esc(c.telegram) + '</span>');
        var waBtn = wa ? '<button type="button" class="btn btn-soft btn-sm" data-wa>WhatsApp</button>' : '';
        var tgBtn = tg ? '<button type="button" class="btn btn-soft btn-sm" data-tg>Telegram</button>' : '';
        return '<div class="comms-card" data-wa="' + UI.esc(wa) + '" data-tg="' + UI.esc(tg) + '">' +
          '<div class="comms-head"><span class="avatar avatar-ph" style="width:28px;height:28px;">' + UI.icon('user') + '</span> <strong>' + UI.esc(c.nombre) + '</strong>' +
          (chips.length ? '<span class="ct-chips">' + chips.join('') + '</span>' : '') + '</div>' +
          '<select class="input comms-tpl">' + options + '</select>' +
          '<textarea class="input comms-txt" rows="4"></textarea>' +
          '<div class="comms-actions">' +
          '<button type="button" class="btn btn-soft btn-sm" data-copy>' + UI.icon('copy') + ' Copiar</button>' +
          waBtn + tgBtn +
          '<button type="button" class="btn btn-soft btn-sm" data-share>' + UI.icon('users') + ' Grupo/otro</button>' +
          '</div></div>';
      }).join('');
      body.innerHTML += '<div id="commsCards">' + cards + '</div>';

      var m = UI.modal({ title: 'Comunicaciones automáticas', size: 'lg', body: body, footer: '<button type="button" class="btn" data-close>Cerrar</button>' });
      m.el.querySelector('[data-close]').addEventListener('click', function () { m.close(); });

      var tplById = {};
      templates.forEach(function (t) { tplById[t.id] = t; });

      function fillCard(card) {
        var c = contacts[card.dataset.idx];
        var tpl = tplById[card.querySelector('.comms-tpl').value];
        card.querySelector('.comms-txt').value = tpl ? TemplateData.replaceVars(tpl.contenido, serviceCtx(c)) : '';
      }

      body.querySelectorAll('.comms-card').forEach(function (card, idx) {
        card.dataset.idx = idx;
        var c = contacts[idx];
        card.querySelector('.comms-tpl').value = (templates[0] || {}).id;
        fillCard(card);
        card.querySelector('.comms-tpl').addEventListener('change', function () { fillCard(card); });
        card.querySelector('[data-copy]').addEventListener('click', function () {
          UI.copyText(card.querySelector('.comms-txt').value).then(function () { UI.toast('Mensaje copiado', 'success'); });
        });
        var waBtn = card.querySelector('[data-wa]');
        if (waBtn) waBtn.addEventListener('click', function () {
          var wa = card.dataset.wa;
          if (!wa) { UI.toast('Este contacto no tiene número de WhatsApp', 'error'); return; }
          window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(card.querySelector('.comms-txt').value), '_blank');
        });
        var tgBtn = card.querySelector('[data-tg]');
        if (tgBtn) tgBtn.addEventListener('click', function () {
          var tg = card.dataset.tg;
          if (!tg) { UI.toast('Este contacto no tiene usuario de Telegram', 'error'); return; }
          window.open('https://t.me/' + tg + '?text=' + encodeURIComponent(card.querySelector('.comms-txt').value), '_blank');
        });
        card.querySelector('[data-share]').addEventListener('click', function () {
          window.open('https://wa.me/?text=' + encodeURIComponent(card.querySelector('.comms-txt').value), '_blank');
        });
      });
    });

    /* ---- Nuevo perro (alta rápida) ---- */
    container.querySelector('#nuevoPerroSvc').addEventListener('click', function () {
      var body = document.createElement('div');
      var m = UI.modal({ title: 'Nuevo perro', size: 'lg', body: body, footer: '<button type="button" class="btn" data-close>Cancelar</button>' });
      m.el.querySelector('[data-close]').addEventListener('click', function () { m.close(); });
      DogForm.render(body, null, {
        showCancel: false,
        onSave: async function (saved) {
          m.close();
          dogs = await Store.listDogs({ includeInactive: true });
          dogMap[saved.id] = saved;
          fs.dogIds.add(saved.id);
          paintDogChecks();
          componentChanged();
          paintCommonContacts();
          paintAlertas();
          UI.toast('Perro añadido al servicio', 'success');
        }
      });
    });

    /* ---- acciones ---- */
    container.querySelector('#backServices').addEventListener('click', function () { ctx.go('servicios'); });
    container.querySelector('#cancelSvc').addEventListener('click', function () { ctx.go('servicios'); });
    var delBtn = container.querySelector('#delService');
    if (delBtn) delBtn.addEventListener('click', async function () {
      var ok = await UI.confirmDialog({ title: 'Eliminar servicio', message: '¿Está seguro de eliminar este servicio?', confirmText: 'Sí, eliminar' });
      if (!ok) return;
      await Store.deleteService(service.id);
      UI.toast('Servicio eliminado', 'success');
      ctx.go('servicios');
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var isPaseo = $n('tipo').value === 'paseo';
      var paseos = isPaseo ? collectPaseos() : [];
      var svc = {
        id: editing ? service.id : undefined,
        tipo: $n('tipo').value,
        desde: $n('desde').value,
        hasta: $n('hasta').value,
        dog_ids: Array.from(fs.dogIds),
        coste_base: C.num($n('coste_base').value),
        coste_total: C.num($n('coste_total').value),
        coste_total_manual: fs.totalManual,
        min_desplazamiento: 0,
        min_paseo: 0,
        paga_senal: C.num($n('paga_senal').value),
        plus: C.num($n('plus').value),
        estado: $n('estado').value,
        notas: $n('notas').value.trim(),
        created_at: editing ? (service.created_at || C.todayISO()) : C.todayISO()
      };
      if (isPaseo) svc.paseos = paseos;
      var errs = C.validateService(svc);
      if (errs.length) {
        errBox.innerHTML = '<strong>Revisa el formulario:</strong><ul>' + errs.map(function (e) { return '<li>' + UI.esc(e.msg) + '</li>'; }).join('') + '</ul>';
        errBox.hidden = false;
        var first = errs[0].field;
        var el0 = form.querySelector('[name="' + first + '"]');
        if (el0) el0.focus();
        else if (first === 'paseos') {
          var pf = container.querySelector('#paseoTbody [data-pf]');
          if (pf) pf.focus();
        }
        return;
      }
      errBox.hidden = true;
      await Store.saveService(svc);
      UI.toast('Servicio guardado. Calendario y listados actualizados.', 'success');
      ctx.go('servicios');
    });

    /* estado inicial */
    updatePaseoSections();
    recalc();
  }

  async function render(container, params, ctx) {
    var mode = params[0] || 'list';
    if (mode === 'list') { buildList(container, ctx); return; }
    var service = null;
    if (params[1]) {
      service = await Store.getService(params[1]);
      if (!service) { UI.toast('Servicio no encontrado', 'error'); ctx.go('servicios'); return; }
    }
    await buildForm(container, ctx, service);
  }

  root.Views = root.Views || {};
  root.Views.servicios = { title: 'Servicios', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
