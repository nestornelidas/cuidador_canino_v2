/* Cuidador Canino - Vista Informes y Estadísticas */
(function (root) {
  'use strict';
  var C = root.Calc, UI = root.UI, Store = root.Store;

  async function render(container, params, ctx) {
    var html = '';
    html += '<div class="view-head"><h1>Informes y Estadísticas</h1><div class="view-actions">' +
      '<button class="btn" id="btnPrint">' + UI.icon('print') + ' Imprimir</button>' +
      '</div></div>';

    html += '<div class="card no-print"><div class="filter-bar">' +
      '<label>Filtrar por año</label>' +
      '<select class="input" id="repYear"><option value="">Todos los años</option></select>' +
      '</div>' +
      '<p class="hint" id="repNote">Los servicios cancelados no se incluyen en los importes. Haz clic en un encabezado para ordenar.</p></div>';

    html += '<section class="card print-area"><div class="chart-head"><h2>' + UI.icon('chart') + ' Rendimiento por año</h2><button class="btn btn-soft btn-sm no-print" id="csvPerf">' + UI.icon('download') + ' CSV</button></div>';
    html += '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th data-key="y" data-type="text">Año</th><th data-key="redito" data-type="num">Redito</th>' +
      '<th data-key="media" data-type="num">Media mensual</th><th data-key="n" data-type="num">Nº servicios</th>' +
      '<th data-key="mediaSvc" data-type="num">Media por servicio</th>' +
      '<th class="th-var" title="Incremento / decremento de la facturación frente al año anterior">▲▼ FACTURACIÓN</th>' +
      '<th data-key="ocup" data-type="num">Ocupación</th>' +
      '<th data-key="pctDead" data-type="num">% Fallecidos</th>' +
      '<th data-key="pctRf" data-type="num">% Red flag</th>' +
      '</tr></thead><tbody id="perfTbody"></tbody></table></div>';
    html += '</section>';

    html += '<section class="card print-area"><div class="chart-head"><h2>' + UI.icon('chart') + ' Evolución mensual</h2><button class="btn btn-soft btn-sm no-print" id="csvEvol">' + UI.icon('download') + ' CSV</button></div>' +
      '<div class="chart-controls">' +
      '<label>Variable <small>eje Y</small><select class="input" id="lineY"><option value="dias">Días con servicios</option><option value="redito">Réditos</option></select></label>' +
      '<label>Período <small>eje X</small><select class="input" id="lineX"><option value="mes">Meses</option><option value="año">Años</option></select></label>' +
      '</div>' +
      '<p class="hint">Días con servicios: número de días distintos del mes con al menos un servicio. Réditos: importe prorrateado por día.</p>' +
      '<div class="line-wrap"><canvas id="lineCanvas" width="900" height="320"></canvas></div>' +
      '</section>';

    html += '<section class="card print-area"><div class="chart-head"><h2>' + UI.icon('dog') + ' Perros cuidados <span class="count-badge" id="dogsCount">0</span></h2><button class="btn btn-soft btn-sm no-print" id="csvDogs">' + UI.icon('download') + ' CSV</button></div>';
    html += '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th></th><th data-key="nombre" data-type="text">Nombre</th>' +
      '<th data-key="nacIso" data-type="text">Fecha nacimiento</th>' +
      '<th data-key="edad" data-type="num">Edad</th>' +
      '<th data-key="acum" data-type="num">Importe acumulado</th>' +
      '</tr></thead><tbody id="dogsTbody"></tbody></table></div>';
    html += '</section>';

    html += '<section class="card print-area"><div class="chart-head"><h2>' + UI.icon('dog') + ' Distribución por sexo</h2><button class="btn btn-soft btn-sm no-print" id="csvSex">' + UI.icon('download') + ' CSV</button></div>' +
      '<div class="pie-flex">' +
      '<canvas id="sexPie" width="220" height="220"></canvas>' +
      '<ul class="pie-legend" id="sexLegend"></ul>' +
      '</div>' +
      '<div id="sexSin"></div>' +
      '</section>';

    html += '<section class="card print-area"><div class="chart-head"><h2>' + UI.icon('users') + ' Canal de captación</h2><button class="btn btn-soft btn-sm no-print" id="csvCapt">' + UI.icon('download') + ' CSV</button></div>' +
      '<div class="pie-flex">' +
      '<canvas id="captPie" width="220" height="220"></canvas>' +
      '<ul class="pie-legend" id="captLegend"></ul>' +
      '</div>' +
      '<div id="captSin"></div>' +
      '<div id="captPorCanal"></div>' +
      '</section>';

    container.innerHTML = html;
    document.getElementById('btnPrint').addEventListener('click', function () { window.print(); });

    var yearSel = document.getElementById('repYear');

    var perfSort = null; /* { key, dir, type } */
    var dogSort = null;
    var yearRows = [];
    var dogRows = [];
    var captCount = {};
    var dogById = {};
    var contactById = {};
    var dogIdsInPeriod = {};
    var captCanalSel = '';
    var gRed = {};
    var gVar = {};
    var gOcup = {};
    var gDead = {};
    var gRf = {};
    var gRedTot = 0;
    var gDeadTot = 0;
    var gRfTot = 0;
    var lineData = { dias: [], redito: [] };

    function makeCmp(type, key, dir) {
      return function (a, b) {
        var va = a[key], vb = b[key];
        var r;
        if (type === 'num') r = (C.num(va) - C.num(vb));
        else r = String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb), 'es');
        return r * dir;
      };
    }

    function markSortDecos() {
      document.querySelectorAll('th[data-key]').forEach(function (th) { th.classList.remove('sort-asc', 'sort-desc'); });
      if (perfSort) {
        var p = document.querySelector('#perfTbody').closest('table').querySelector('th[data-key="' + perfSort.key + '"]');
        if (p) p.classList.add(perfSort.dir === -1 ? 'sort-desc' : 'sort-asc');
      }
      if (dogSort) {
        var d = document.querySelector('#dogsTbody').closest('table').querySelector('th[data-key="' + dogSort.key + '"]');
        if (d) d.classList.add(dogSort.dir === -1 ? 'sort-desc' : 'sort-asc');
      }
    }

    function bindSort() {
      document.querySelectorAll('th[data-key]').forEach(function (th) {
        th.classList.add('sortable');
        th.addEventListener('click', function () {
          var key = th.dataset.key, type = th.dataset.type || 'text';
          var inPerf = !!document.getElementById('perfTbody').closest('table').contains(th);
          var state = inPerf ? perfSort : dogSort;
          var dir;
          if (!state || state.key !== key) {
            /* Primer clic: números de más a menos, texto de A a Z */
            dir = type === 'num' ? -1 : 1;
          } else {
            dir = state.dir === 1 ? -1 : 1;
          }
          if (inPerf) perfSort = { key: key, dir: dir, type: type };
          else dogSort = { key: key, dir: dir, type: type };
          renderPerf();
          renderDogs();
          markSortDecos();
        });
      });
    }

    function renderPerf() {
      var tbody = document.getElementById('perfTbody');
      if (!yearRows.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-cell">Sin datos para el período seleccionado.</td></tr>';
        return;
      }
      var sorted = yearRows.slice();
      if (perfSort) sorted.sort(makeCmp(perfSort.type, perfSort.key, perfSort.dir));
      else sorted.sort(makeCmp('text', 'y', -1));
      var totRedito = yearRows.reduce(function (s, r) { return s + r.redito; }, 0);
      var totN = yearRows.reduce(function (s, r) { return s + r.n; }, 0);
      var totMonths = yearRows.reduce(function (s, r) { return s + r.months; }, 0);
      var maxRed = yearRows.reduce(function (mx, r) { return Math.max(mx, r.redito); }, 0);
      tbody.innerHTML = sorted.map(function (r) {
        var pct = maxRed ? (r.redito / maxRed * 100) : 0;
        return '<tr>' +
          '<td><strong>' + r.y + '</strong></td>' +
          '<td>' + C.fmtMoney(r.redito) + '<div class="mini-bar"><i style="width:' + pct + '%"></i></div></td>' +
          '<td>' + C.fmtMoney(r.media) + '</td>' +
          '<td>' + r.n + '</td>' +
          '<td>' + C.fmtMoney(r.mediaSvc) + '</td>' +
          '<td>' + varCell(r.y) + '</td>' +
          '<td>' + ocupCell(r.y) + '</td>' +
          '<td>' + pctDeadCell(r.y) + '</td>' +
          '<td>' + pctRfCell(r.y) + '</td></tr>';
      }).join('') +
        '<tr class="total-row"><td>TOTAL</td><td>' + C.fmtMoney(totRedito) + '</td>' +
        '<td>' + C.fmtMoney(totMonths ? totRedito / totMonths : 0) + '</td>' +
        '<td>' + totN + '</td>' +
        '<td>' + (totN ? C.fmtMoney(totRedito / totN) : '—') + '</td>' +
        '<td>—</td><td>—</td>' +
        '<td>' + pctTot(gRedTot ? gDeadTot / gRedTot * 100 : null) + '</td>' +
        '<td>' + pctTot(gRedTot ? gRfTot / gRedTot * 100 : null) + '</td></tr>';
    }

    function renderDogs() {
      var tbody = document.getElementById('dogsTbody');
      if (!dogRows.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Sin perros con servicios en el período seleccionado.</td></tr>';
        return;
      }
      var sorted = dogRows.slice();
      if (dogSort) sorted.sort(makeCmp(dogSort.type, dogSort.key, dogSort.dir));
      else sorted.sort(makeCmp('text', 'nombre', 1));
      tbody.innerHTML = sorted.map(function (r) {
        var d = r.d;
        return '<tr class="dog-row" data-id="' + d.id + '">' +
          '<td>' + UI.avatarHtml(d, 40) + '</td>' +
          '<td><strong>' + UI.esc(d.nombre) + '</strong>' + (d.activo === false ? ' <span class="badge badge-cancelado">inactivo</span>' : '') + '</td>' +
          '<td>' + C.fmtDMY(d.fecha_nacimiento) + '</td>' +
          '<td>' + UI.esc(r.edadText) + '</td>' +
          '<td><strong>' + C.fmtMoney(r.acum) + '</strong></td></tr>';
      }).join('');
      tbody.querySelectorAll('.dog-row').forEach(function (tr) {
        tr.addEventListener('click', function () { ctx.go('perros/edit/' + tr.dataset.id); });
      });
    }

    function drawPie(canvas, slices) {
      var ctx = canvas.getContext && canvas.getContext('2d');
      if (!ctx) return;
      var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      var size = 220;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, size * dpr, size * dpr);
      ctx.scale(dpr, dpr);
      var total = slices.reduce(function (s, x) { return s + x.val; }, 0);
      if (!total) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos', size / 2, size / 2);
        return;
      }
      var cx = size / 2, cy = size / 2, r = size / 2 - 6;
      var start = -Math.PI / 2;
      slices.forEach(function (x) {
        if (x.val <= 0) return;
        var end = start + (x.val / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, end);
        ctx.closePath();
        ctx.fillStyle = x.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        start = end;
      });
    }

    function renderPie() {
      var canvas = document.getElementById('sexPie');
      var legend = document.getElementById('sexLegend');
      var counts = { hembra: 0, macho: 0, otro: 0 };
      dogRows.forEach(function (r) {
        var d = r.d;
        if (!d || d.activo === false) return;
        if (d.sexo === 'hembra') counts.hembra++;
        else if (d.sexo === 'macho') counts.macho++;
        else counts.otro++;
      });
      var total = counts.hembra + counts.macho + counts.otro;
      var slices = [
        { key: 'hembra', val: counts.hembra, color: '#ec4899', label: 'Hembras' },
        { key: 'macho', val: counts.macho, color: '#2563eb', label: 'Machos' },
        { key: 'otro', val: counts.otro, color: '#94a3b8', label: 'Sin especificar' }
      ].filter(function (x) { return x.val > 0; });
      drawPie(canvas, slices);
      legend.innerHTML = '<p class="hint">Perros con servicios en el período seleccionado.</p>' +
        slices.map(function (x) {
          var pct = total ? Math.round(x.val / total * 100) : 0;
          return '<li><i class="swatch" style="background:' + x.color + '"></i> ' + x.label + ': <strong>' + x.val + '</strong> (' + pct + '%)</li>';
        }).join('');

      /* Perros del período sin sexo especificado (clicables para editarlos) */
      var sin = document.getElementById('sexSin');
      if (sin) {
        var noSex = dogRows.filter(function (r) {
          return r.d && r.d.activo !== false && !r.d.sexo;
        }).map(function (r) { return { id: r.d.id, nombre: r.d.nombre || '' }; });
        noSex.sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre), 'es'); });
        sin.innerHTML = '<h3>' + UI.icon('alert') + ' Perros sin sexo especificado</h3>' +
          (noSex.length
            ? '<div class="capt-sin-names">' + noSex.map(function (x) {
              return '<a class="badge badge-link" href="#/perros/edit/' + x.id + '">' + UI.esc(x.nombre) + '</a>';
            }).join('') + '</div>'
            : '<p class="hint">Todos los perros con servicios en el período tienen sexo especificado.</p>');
      }
    }

    function renderCapt() {
      var canvas = document.getElementById('captPie');
      var legend = document.getElementById('captLegend');
      var entries = Object.keys(captCount || {}).map(function (k) { return { k: k, n: captCount[k] }; });
      if (!entries.length) {
        drawPie(canvas, []);
        legend.innerHTML = '<p class="hint">Sin contactos con canal de captación en el período seleccionado.</p>';
      } else {
        entries.sort(function (a, b) { return b.n - a.n; });
        var palette = ['#2563eb', '#ec4899', '#16a34a', '#f59e0b', '#7c3aed', '#0ea5e9', '#ef4444', '#64748b'];
        var slices = entries.map(function (e, i) {
          return { key: e.k, val: e.n, color: palette[i % palette.length], label: e.k };
        });
        drawPie(canvas, slices);
        var total = entries.reduce(function (s, e) { return s + e.n; }, 0);
        legend.innerHTML = '<p class="hint">Contactos con canal de captación vinculados a perros con servicios en el período.</p>' +
          slices.map(function (x) {
            var pct = total ? Math.round(x.val / total * 100) : 0;
            return '<li><i class="swatch" style="background:' + x.color + '"></i> ' + UI.esc(x.label) + ': <strong>' + x.val + '</strong> (' + pct + '%)</li>';
          }).join('');
      }

      /* Perros del período sin ningún humano con canal de captación cumplimentado */
      var sin = document.getElementById('captSin');
      if (!sin) return;
      var names = [];
      Object.keys(dogIdsInPeriod || {}).forEach(function (did) {
        var d = dogById[did];
        if (!d) return;
        var cids = d.contact_ids || [];
        var sinCanal = cids.length > 0;
        cids.forEach(function (cid) {
          var cc = contactById[cid];
          if (cc && (cc.referido || '').trim()) sinCanal = false;
        });
        if (sinCanal) names.push({ id: d.id, nombre: d.nombre || '' });
      });
      names.sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre), 'es'); });
      sin.innerHTML = '<h3>' + UI.icon('alert') + ' Perros sin canal de captación</h3>' +
        (names.length
          ? '<div class="capt-sin-names">' + names.map(function (x) {
            return '<a class="badge badge-link" href="#/perros/edit/' + x.id + '">' + UI.esc(x.nombre) + '</a>';
          }).join('') + '</div>'
          : '<p class="hint">Todos los perros con servicios en el período tienen canal de captación.</p>');

      var porCanal = document.getElementById('captPorCanal');
      if (porCanal) {
        var cfgCanales = (Store.getConfig().captacion || Store.defaultCaptacion() || []);
        var allNombres = cfgCanales.map(function (ch) { return (ch.nombre || '').trim(); }).filter(Boolean);
        var byChannel = {};
        Object.keys(dogIdsInPeriod || {}).forEach(function (did) {
          var d = dogById[did];
          if (!d) return;
          var seen = {};
          (d.contact_ids || []).forEach(function (cid) {
            var cc = contactById[cid];
            var k = cc && (cc.referido || '').trim();
            if (!k || seen[k]) return;
            seen[k] = true;
            (byChannel[k] = byChannel[k] || []).push({ id: d.id, nombre: d.nombre || '' });
          });
        });
        if (captCanalSel && allNombres.indexOf(captCanalSel) === -1) captCanalSel = '';
        var h = '<h3>' + UI.icon('search') + ' Perros por canal de captación</h3>';
        h += '<div class="filter-bar"><label>Canal</label><select class="input" id="captCanalSel"><option value="">— Selecciona un canal —</option>' + allNombres.map(function (n) { return '<option value="' + UI.esc(n) + '"' + (n === captCanalSel ? ' selected' : '') + '>' + UI.esc(n) + '</option>'; }).join('') + '</select></div>';
        h += '<div id="captCanalList"></div>';
        porCanal.innerHTML = h;
        var selEl = document.getElementById('captCanalSel');
        var listEl = document.getElementById('captCanalList');
        function paintCanalList() {
          captCanalSel = selEl.value;
          if (!captCanalSel) {
            listEl.innerHTML = '<p class="hint">Selecciona un canal para ver los perros obtenidos en el período.</p>';
            return;
          }
          var arr = (byChannel[captCanalSel] || []).slice();
          arr.sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre), 'es'); });
          if (!arr.length) {
            listEl.innerHTML = '<p class="hint">Sin perros para el canal seleccionado en el período.</p>';
          } else {
            listEl.innerHTML = '<div class="capt-sin-names">' + arr.map(function (x) { return '<a class="badge badge-link" href="#/perros/edit/' + x.id + '">' + UI.esc(x.nombre) + '</a>'; }).join('') + '</div>';
          }
        }
        selEl.addEventListener('change', paintCanalList);
        paintCanalList();
      }
    }

    function isLeapYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

    function varCell(y) {
      if (gVar[y] == null) return '<span class="muted">—</span>';
      var p = gVar[y];
      if (p > 0) return '<span class="var-up">▲ +' + C.fmtNum(p) + '%</span>';
      if (p < 0) return '<span class="var-down">▼ −' + C.fmtNum(-p) + '%</span>';
      return '<span class="var-flat">0%</span>';
    }

    function ocupCell(y) {
      var o = gOcup[y];
      if (!o || !o.days) return '<span class="muted">0 días</span>';
      return o.days + ' días <span class="muted">· ' + C.fmtNum(o.pct) + '%</span>';
    }

    function hasRedFlagItem(d) {
      return !!d && (d.comportamientos || []).some(function (c) {
        return String(c).toUpperCase().indexOf('RED FLAG') !== -1;
      });
    }

    function pctTot(p) {
      return p == null ? '<span class="muted">—</span>' : '<span class="muted">' + C.fmtNum(Math.round(p * 10) / 10) + '%</span>';
    }

    function pctDeadCell(y) {
      if (!gRed[y]) return '<span class="muted">—</span>';
      var p = (gDead[y] || 0) / gRed[y] * 100;
      return pctTot(p);
    }

    function pctRfCell(y) {
      if (!gRed[y]) return '<span class="muted">—</span>';
      var p = (gRf[y] || 0) / gRed[y] * 100;
      return pctTot(p);
    }

    function downloadCSV(name, rows) {
      var csv = rows.map(function (r) {
        return r.map(function (v) {
          var s = String(v == null ? '' : v);
          if (/[",\n;]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
          return s;
        }).join(';');
      }).join('\r\n');
      UI.downloadFile(name, '\ufeff' + csv, 'text/csv;charset=utf-8');
    }

    function niceStep(x) {
      if (!(x > 0)) return 1;
      var p = Math.pow(10, Math.floor(Math.log10(x)));
      var f = x / p;
      var nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
      return Math.max(1, Math.round(nf * p));
    }

    function fmtChartTick(v, isMoney) {
      return isMoney ? C.fmtNum(v) + ' €' : C.fmtNum(v);
    }

    function drawLineChart(canvas, series, isMoney, labels) {
      var cx = canvas.getContext && canvas.getContext('2d');
      if (!cx) return;
      var W = 900, H = 320;
      var M = { l: 74, r: 16, t: 20, b: 46 };
      var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.clearRect(0, 0, W, H);
      cx.font = '11px sans-serif';
      var pw = W - M.l - M.r, ph = H - M.t - M.b;
      var vals = (series || []).slice(0, 60);
      var names = (labels && labels.length
        ? labels.slice(0, 60)
        : ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']);
      var n = Math.max(1, vals.length);
      var max = 0;
      vals.forEach(function (v) { if (v > max) max = v; });
      if (!(max > 0)) {
        cx.fillStyle = '#94a3b8';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText('Sin datos para el período seleccionado', M.l + pw / 2, M.t + ph / 2);
        return;
      }
      var div = 4;
      var step = niceStep(max / div);
      while (step * div < max) step *= 2;
      function xAt(i) { return M.l + (i + 0.5) * pw / n; }
      var top = step * div;
      var i, val, yv;
      for (i = 0; i <= div; i++) {
        val = i === 0 ? 0 : step * i;
        yv = M.t + ph - (val / top) * ph;
        cx.strokeStyle = '#e2e8f0';
        cx.beginPath();
        cx.moveTo(M.l, yv);
        cx.lineTo(M.l + pw, yv);
        cx.stroke();
        cx.fillStyle = '#64748b';
        cx.textAlign = 'right';
        cx.textBaseline = 'middle';
        cx.fillText(fmtChartTick(val, isMoney), M.l - 8, yv);
      }
      cx.fillStyle = '#64748b';
      cx.textAlign = 'center';
      cx.textBaseline = 'top';
      for (i = 0; i < n && i < names.length; i++) cx.fillText(names[i], xAt(i), M.t + ph + 8);

      var pts = [];
      cx.strokeStyle = '#2563eb';
      cx.lineWidth = 2;
      cx.lineJoin = 'round';
      cx.beginPath();
      vals.forEach(function (v, i) {
        var x = xAt(i);
        var y = M.t + ph - (v / top) * ph;
        pts.push([x, y]);
        if (i === 0) cx.moveTo(x, y); else cx.lineTo(x, y);
      });
      cx.stroke();
      pts.forEach(function (p, i) {
        if (vals[i] > 0) {
          cx.fillStyle = '#334155';
          cx.font = '10px sans-serif';
          cx.textAlign = 'center';
          cx.textBaseline = 'bottom';
          cx.fillText(fmtChartTick(vals[i], isMoney), p[0], p[1] - 6);
        }
        cx.fillStyle = '#2563eb';
        cx.beginPath();
        cx.arc(p[0], p[1], 3.5, 0, Math.PI * 2);
        cx.fill();
      });
    }

    function paintLine() {
      var sel = document.getElementById('lineY');
      var xSel = document.getElementById('lineX');
      var canvas = document.getElementById('lineCanvas');
      if (!sel || !canvas) return;
      canvas.dataset.last = sel.value;
      var isYear = !!(xSel && xSel.value === 'año');
      var series, labels;
      if (isYear) {
        labels = lineData.yearLabels || [];
        series = lineData[sel.value === 'redito' ? 'yearRedito' : 'yearDias'] || [];
      } else {
        series = lineData[sel.value] || [];
      }
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(function () { drawLineChart(canvas, series, sel.value === 'redito', labels); });
      } else {
        drawLineChart(canvas, series, sel.value === 'redito', labels);
      }
    }

    async function paint() {
      var [services, dogs] = await Promise.all([
        Store.listServices(),
        Store.listDogs({ includeInactive: true })
      ]);
      var dogMap = {}; dogs.forEach(function (d) { dogMap[d.id] = d; });
      dogById = dogMap;

      var years = {};
      services.forEach(function (s) { if (s.desde) years[s.desde.slice(0, 4)] = true; });
      var yOpts = Object.keys(years).sort().reverse();
      var cur = yearSel.value;
      if (cur && yOpts.indexOf(cur) === -1) cur = '';
      yearSel.innerHTML = '<option value="">Todos los años</option>' + yOpts.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
      yearSel.value = cur;

      var fY = cur;
      var usable = services.filter(function (s) { return s.estado !== 'cancelado'; });
      var filtered = usable.filter(function (s) { return !fY || s.desde.slice(0, 4) === fY; });

      /* La media mensual del año en curso solo contempla los meses transcurridos */
      var nowR = new Date();
      var curY = String(nowR.getFullYear());
      function monthCount(y) { return y === curY ? nowR.getMonth() + 1 : 12; }

/* ---- Variación interanual y ocupación (globales a todos los servicios, no solo al filtro) ---- */
      gRed = {};
      var dY = {};
      usable.forEach(function (s) {
        var y0 = s.desde.slice(0, 4);
        gRed[y0] = (gRed[y0] || 0) + C.calcTotalSvc(s);
        var span = Math.max(1, C.diffDaysInclusive(s.desde, s.hasta));
        var cur = s.desde, guard = 0;
        while (cur && cur <= s.hasta) {
          var dd = C.parseISO(cur);
          if (dd) { var yy = String(dd.getFullYear()); (dY[yy] = dY[yy] || {})[cur] = true; }
          cur = C.addDaysISO(cur, 1);
          if (++guard > 5000) break;
        }
      });
      gVar = {};
      var ySorted = Object.keys(gRed).sort();
      for (var yi = 1; yi < ySorted.length; yi++) {
        var yNow = ySorted[yi], yPrev = ySorted[yi - 1];
        if (gRed[yPrev]) gVar[yNow] = (gRed[yNow] - gRed[yPrev]) / gRed[yPrev] * 100;
      }

      /* Rédito atribuible a perros fallecidos y a perros RED FLAG (prorrateado por perro) */
      gDead = {}; gRf = {};
      usable.forEach(function (s) {
        var y0 = s.desde.slice(0, 4);
        var total = C.calcTotalSvc(s);
        var n = Math.max(1, (s.dog_ids || []).length);
        (s.dog_ids || []).forEach(function (id) {
          var dd = dogMap[id];
          if (!dd) return;
          if (dd.fecha_deceso || dd.es_deceso) {
            var dy = dd.fecha_deceso ? dd.fecha_deceso.slice(0, 4) : null;
            /* Solo cuentan los fallecidos en ese año o en el siguiente (ej.: para 2025, los fallecidos en 2025 y 2026, no en 2027) */
            if (!dy || dy === y0 || dy === String(Number(y0) + 1)) gDead[y0] = (gDead[y0] || 0) + total / n;
          }
          if (hasRedFlagItem(dd)) gRf[y0] = (gRf[y0] || 0) + total / n;
        });
      });
      gRedTot = gDeadTot = gRfTot = 0;
      Object.keys(gRed).forEach(function (y) {
        gRedTot += gRed[y];
        gDeadTot += gDead[y] || 0;
        gRfTot += gRf[y] || 0;
      });
      gOcup = {};
      Object.keys(dY).forEach(function (y) {
        var days = Object.keys(dY[y]).length;
        var totalDays = isLeapYear(+y) ? 366 : 365;
        gOcup[y] = { days: days, pct: Math.round(days / totalDays * 1000) / 10 };
      });

      /* ---- Evolución mensual (serie para la gráfica de líneas) ---- */
      var redArr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var dayM = [];
      var mi;
      for (mi = 0; mi < 12; mi++) dayM.push({});
      filtered.forEach(function (s) {
        var total = C.calcTotalSvc(s);
        var span = Math.max(1, C.diffDaysInclusive(s.desde, s.hasta));
        var cur = s.desde, guard = 0;
        while (cur && cur <= s.hasta) {
          var dd2 = C.parseISO(cur);
          if (dd2 && (!fY || String(dd2.getFullYear()) === fY)) {
            var m2 = dd2.getMonth();
            dayM[m2][cur] = true;
            redArr[m2] += total / span;
          }
          cur = C.addDaysISO(cur, 1);
          if (++guard > 5000) break;
        }
      });
      lineData.dias = dayM.map(function (s) { return Object.keys(s).length; });
      lineData.redito = redArr.map(C.round2);

      /* Evolución por años (mismo criterio: rédito prorrateado por día y días distintos con servicio) */
      var yearDayM = {};
      var yearRed = {};
      filtered.forEach(function (s) {
        var total = C.calcTotalSvc(s);
        var span = Math.max(1, C.diffDaysInclusive(s.desde, s.hasta));
        var cur = s.desde, guard = 0;
        while (cur && cur <= s.hasta) {
          var dd3 = C.parseISO(cur);
          if (dd3 && (!fY || String(dd3.getFullYear()) === fY)) {
            var y3 = String(dd3.getFullYear());
            (yearDayM[y3] = yearDayM[y3] || {})[cur] = true;
            yearRed[y3] = (yearRed[y3] || 0) + total / span;
          }
          cur = C.addDaysISO(cur, 1);
          if (++guard > 5000) break;
        }
      });
      var yearKeys = Object.keys(yearDayM).sort();
      lineData.yearLabels = yearKeys;
      lineData.yearDias = yearKeys.map(function (y) { return Object.keys(yearDayM[y]).length; });
      lineData.yearRedito = yearKeys.map(function (y) { return C.round2(yearRed[y] || 0); });
      var lcEl = document.getElementById('lineCanvas');
      if (lcEl) { lcEl.dataset.dias = JSON.stringify(lineData.dias); lcEl.dataset.redito = JSON.stringify(lineData.redito); lcEl.dataset.years = JSON.stringify({ labels: lineData.yearLabels, dias: lineData.yearDias, redito: lineData.yearRedito }); }

      /* ---- Rendimiento por año ---- */
      var byYear = {};
      usable.forEach(function (s) {
        var y = s.desde.slice(0, 4);
        if (fY && y !== fY) return;
        byYear[y] = byYear[y] || { redito: 0, n: 0 };
        byYear[y].redito += C.calcTotalSvc(s);
        byYear[y].n++;
      });
      yearRows = Object.keys(byYear).map(function (y) {
        var r = byYear[y];
        return {
          y: y,
          redito: C.round2(r.redito),
          n: r.n,
          months: monthCount(y),
          media: C.round2(r.redito / monthCount(y)),
          mediaSvc: r.n ? C.round2(r.redito / r.n) : 0,
          ocup: gOcup[y] ? gOcup[y].pct : -1,
          pctDead: gRed[y] ? Math.round((gDead[y] || 0) / gRed[y] * 1000) / 10 : -1,
          pctRf: gRed[y] ? Math.round((gRf[y] || 0) / gRed[y] * 1000) / 10 : -1
        };
      });
      renderPerf();
      paintLine();

      /* ---- Perros cuidados ---- */
      var byDog = {};
      var dogSvcCount = {};
      filtered.forEach(function (s) {
        var n = Math.max(1, (s.dog_ids || []).length);
        (s.dog_ids || []).forEach(function (id) {
          byDog[id] = byDog[id] || 0;
          byDog[id] += C.calcTotalSvc(s) / n;
          dogSvcCount[id] = (dogSvcCount[id] || 0) + 1;
        });
      });
      dogRows = Object.keys(byDog).map(function (id) {
        var d = dogMap[id];
        if (!d) return null;
        var edadMonths = (function () {
          var p = C.ageParts(d.fecha_nacimiento, d.fecha_deceso || C.todayISO());
          return p ? p.years * 12 + p.months : null;
        })();
        return {
          d: d,
          acum: C.round2(byDog[id]),
          n: dogSvcCount[id] || 0,
          nombre: d.nombre || '',
          nacIso: d.fecha_nacimiento || '',
          edad: edadMonths,
          edadText: C.ageText(d.fecha_nacimiento, null, d.fecha_deceso)
        };
      }).filter(function (r) { return r; });

      /* Nº de perros distintos con al menos un cuidado finalizado o en curso */
      var dogsWithCare = {};
      filtered.forEach(function (s) {
        if (s.estado !== 'finalizado' && s.estado !== 'en_curso') return;
        (s.dog_ids || []).forEach(function (id) { dogsWithCare[id] = true; });
      });
      var dogsCountEl = document.getElementById('dogsCount');
      if (dogsCountEl) dogsCountEl.textContent = Object.keys(dogsWithCare).length;

      /* ---- Canal de captación (contactos de perros con servicios en el período) ---- */
      dogIdsInPeriod = {};
      filtered.forEach(function (s) { (s.dog_ids || []).forEach(function (id) { dogIdsInPeriod[id] = true; }); });
      var contactSet = {};
      dogs.forEach(function (d) {
        if (!dogIdsInPeriod[d.id]) return;
        (d.contact_ids || []).forEach(function (cid) { contactSet[cid] = true; });
      });
      var allContacts = await Store.listContacts();
      contactById = {};
      allContacts.forEach(function (c) { contactById[c.id] = c; });
      captCount = {};
      allContacts.forEach(function (c) {
        if (!contactSet[c.id]) return;
        var k = (c.referido || '').trim();
        if (!k) return;
        captCount[k] = (captCount[k] || 0) + 1;
      });

      renderDogs();
      renderPie();
      renderCapt();
    }

    yearSel.addEventListener('change', paint);
    var lineYEl = document.getElementById('lineY');
    if (lineYEl) lineYEl.addEventListener('change', paintLine);
    var lineXEl = document.getElementById('lineX');
    if (lineXEl) lineXEl.addEventListener('change', paintLine);
    bindSort();
    paint();

    var csvPerfBtn = document.getElementById('csvPerf');
    if (csvPerfBtn) csvPerfBtn.addEventListener('click', function () {
      var sorted = yearRows.slice();
      if (perfSort) sorted.sort(makeCmp(perfSort.type, perfSort.key, perfSort.dir));
      else sorted.sort(makeCmp('text', 'y', -1));
      var rows = [['Año', 'Rédito', 'Media mensual', 'Nº servicios', 'Media por servicio', 'Variación %', 'Ocupación días', 'Ocupación %', '% Fallecidos', '% Red flag']];
      sorted.forEach(function (r) {
        rows.push([r.y, r.redito, r.media, r.n, r.mediaSvc, gVar[r.y] == null ? '' : C.fmtNum(Math.round(gVar[r.y] * 10) / 10), gOcup[r.y] ? gOcup[r.y].days : '', gOcup[r.y] ? C.fmtNum(gOcup[r.y].pct) : '', gRed[r.y] ? C.fmtNum(Math.round((gDead[r.y] || 0) / gRed[r.y] * 1000) / 10) : '', gRed[r.y] ? C.fmtNum(Math.round((gRf[r.y] || 0) / gRed[r.y] * 1000) / 10) : '']);
      });
      var yf = yearSel.value || 'todos';
      downloadCSV('rendimiento-' + yf + '.csv', rows);
    });
    var csvEvolBtn = document.getElementById('csvEvol');
    if (csvEvolBtn) csvEvolBtn.addEventListener('click', function () {
      var isYear = !!(document.getElementById('lineX') && document.getElementById('lineX').value === 'año');
      var labels = isYear ? (lineData.yearLabels || []) : ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      var dias = isYear ? (lineData.yearDias || []) : (lineData.dias || []);
      var red = isYear ? (lineData.yearRedito || []) : (lineData.redito || []);
      var rows = [['Periodo', 'Días con servicios', 'Rédito']];
      for (var i = 0; i < labels.length; i++) rows.push([labels[i], dias[i] == null ? '' : dias[i], red[i] == null ? '' : red[i]]);
      if (!labels.length) rows.push(['Sin datos', '', '']);
      var yf2 = yearSel.value || 'todos';
      downloadCSV('evolucion-' + yf2 + '.csv', rows);
    });
    var csvDogsBtn = document.getElementById('csvDogs');
    if (csvDogsBtn) csvDogsBtn.addEventListener('click', function () {
      var sorted = dogRows.slice();
      if (dogSort) sorted.sort(makeCmp(dogSort.type, dogSort.key, dogSort.dir));
      else sorted.sort(makeCmp('text', 'nombre', 1));
      var rows = [['Nombre', 'Fecha nacimiento', 'Edad', 'Importe acumulado', 'Nº servicios']];
      sorted.forEach(function (r) { rows.push([r.d.nombre || '', r.d.fecha_nacimiento ? C.fmtDMY(r.d.fecha_nacimiento) : '', r.edadText || '', r.acum, r.n]); });
      if (!sorted.length) rows.push(['Sin datos', '', '', '', '']);
      var yf3 = yearSel.value || 'todos';
      downloadCSV('perros-' + yf3 + '.csv', rows);
    });
    var csvSexBtn = document.getElementById('csvSex');
    if (csvSexBtn) csvSexBtn.addEventListener('click', function () {
      var counts = { hembra: 0, macho: 0, otro: 0 };
      dogRows.forEach(function (r) { if (!r.d || r.d.activo === false) return; if (r.d.sexo === 'hembra') counts.hembra++; else if (r.d.sexo === 'macho') counts.macho++; else counts.otro++; });
      var total = counts.hembra + counts.macho + counts.otro;
      var rows = [['Sexo', 'Cantidad', 'Porcentaje']];
      rows.push(['Hembras', counts.hembra, total ? Math.round(counts.hembra / total * 100) : 0]);
      rows.push(['Machos', counts.macho, total ? Math.round(counts.macho / total * 100) : 0]);
      rows.push(['Sin especificar', counts.otro, total ? Math.round(counts.otro / total * 100) : 0]);
      rows.push([]);
      rows.push(['Perros sin sexo especificado']);
      rows.push(['Nombre']);
      var noSex = dogRows.filter(function (r) { return r.d && r.d.activo !== false && !r.d.sexo; }).map(function (r) { return r.d.nombre || ''; }).sort(function (a, b) { return String(a).localeCompare(String(b), 'es'); });
      if (!noSex.length) rows.push(['(Todos con sexo especificado)']);
      else noSex.forEach(function (n) { rows.push([n]); });
      var yf4 = yearSel.value || 'todos';
      downloadCSV('sexo-' + yf4 + '.csv', rows);
    });
    var csvCaptBtn = document.getElementById('csvCapt');
    if (csvCaptBtn) csvCaptBtn.addEventListener('click', function () {
      var entries = Object.keys(captCount || {}).map(function (k) { return { k: k, n: captCount[k] }; });
      entries.sort(function (a, b) { return b.n - a.n; });
      var total = entries.reduce(function (s, e) { return s + e.n; }, 0);
      var rows = [['Canal', 'Cantidad', 'Porcentaje']];
      entries.forEach(function (e) { rows.push([e.k, e.n, total ? Math.round(e.n / total * 100) : 0]); });
      if (!entries.length) rows.push(['Sin datos', '', '']);
      rows.push([]);
      rows.push(['Perros sin canal de captación']);
      rows.push(['Nombre']);
      var sinNames = [];
      Object.keys(dogIdsInPeriod || {}).forEach(function (did) {
        var d = dogById[did]; if (!d) return;
        var cids = d.contact_ids || []; var ok = cids.length > 0;
        cids.forEach(function (cid) { var cc = contactById[cid]; if (cc && (cc.referido || '').trim()) ok = false; });
        if (ok) sinNames.push(d.nombre || '');
      });
      sinNames.sort(function (a, b) { return String(a).localeCompare(String(b), 'es'); });
      if (!sinNames.length) rows.push(['(Todos con canal)']);
      else sinNames.forEach(function (n) { rows.push([n]); });
      var sel = (typeof captCanalSel !== 'undefined' && captCanalSel) ? captCanalSel : '';
      if (sel) {
        var byCh = {};
        Object.keys(dogIdsInPeriod || {}).forEach(function (did) {
          var d = dogById[did]; if (!d) return;
          var seen = {};
          (d.contact_ids || []).forEach(function (cid) { var cc = contactById[cid]; var k = cc && (cc.referido || '').trim(); if (!k || seen[k]) return; seen[k] = true; (byCh[k] = byCh[k] || []).push(d.nombre || ''); });
        });
        rows.push([]);
        rows.push(['Perros por canal: ' + sel]);
        rows.push(['Nombre']);
        var arr = (byCh[sel] || []).slice().sort(function (a, b) { return String(a).localeCompare(String(b), 'es'); });
        if (!arr.length) rows.push(['(Sin perros para este canal)']);
        else arr.forEach(function (n) { rows.push([n]); });
      }
      var yf5 = yearSel.value || 'todos';
      downloadCSV('canal-' + yf5 + '.csv', rows);
    });
  }

  root.Views = root.Views || {};
  root.Views.informes = { title: 'Informes', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
