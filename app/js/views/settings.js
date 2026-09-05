/* Cuidador Canino - Vista Configuración */
(function (root) {
  'use strict';
  var C = root.Calc, UI = root.UI, Store = root.Store;

  async function render(container, params, ctx) {
    var config = Store.getConfig();

    var html = '';
    html += '<div class="view-head"><h1>Configuración</h1></div>';

    /* --- Costes base --- */
    html += '<section class="card"><h2>' + UI.icon('wallet') + ' Costes base por defecto</h2>';
    html += '<p class="hint">Estos importes se toman como valor predeterminado al crear servicios nuevos. No afectan a servicios ya creados.</p>';
    html += '<div class="form-grid form-grid-3">' +
      '<div class="form-field"><label>Coste base hospedaje (€/día)</label><input type="number" class="input" id="cfgCosteHosp" min="0" step="0.01" value="' + config.costeHospedaje + '"></div>' +
      '<div class="form-field"><label>Coste base paseo (€/hora)</label><input type="number" class="input" id="cfgCostePaseo" min="0" step="0.01" value="' + config.costePaseo + '"></div>' +
      '<div class="form-field align-end"><button class="btn btn-primary" id="saveCostes">' + UI.icon('check') + ' Guardar costes</button></div>' +
      '</div></section>';

    /* --- Preferencias --- */
    html += '<section class="card"><h2>' + UI.icon('settings') + ' Preferencias</h2>';
    html += '<p class="hint">Ajustes de visualización de la aplicación.</p>';
    html += '<div class="form-field"><label class="chk"><input type="checkbox" id="cfgOcultarDecesos"' + (config.ocultarDecesos ? ' checked' : '') + '> Ocultar perros fallecidos en el alta de servicios</label>' +
      '<p class="hint">Si está marcado, en la pantalla de alta de servicios no se muestran los perros con fecha de deceso. Solo afecta a esa pantalla.</p></div>';
    html += '<div class="form-field"><label class="chk"><input type="checkbox" id="cfgOcultarRedFlags"' + (config.ocultarRedFlags ? ' checked' : '') + '> Ocultar perros marcados con "RED FLAG."</label>' +
      '<p class="hint">Si está marcado, los perros que tengan el comportamiento "RED FLAG." en cualquiera de las áreas (personas, en paseo, perros, en casa...) no aparecen en la lista de perros. Solo afecta a esa lista.</p></div></section>';

    /* --- Datos --- */
    html += '<section class="card"><h2>' + UI.icon('refresh') + ' Datos (copia de seguridad)</h2>';
    html += '<div class="form-field"><label>Tamaño de la base de datos</label><div class="static-val" id="dbSizeVal">Calculando…</div>' +
      '<p class="hint">Espacio en disco que ocupan los datos (perros, servicios, contactos, plantillas, eventos y configuración).</p></div>';
    html += '<div class="btn-stack">' +
      '<button class="btn" id="btnExport">' + UI.icon('download') + ' Exportar BBDD (JSON)</button>' +
      '<button class="btn" id="btnImport">' + UI.icon('upload') + ' Importar BBDD (JSON)</button>' +
      '<input type="file" id="importFile" accept=".json,application/json" hidden>' +
      '<button class="btn btn-danger" id="btnWipe">' + UI.icon('trash') + ' Borrar todos los datos</button>' +
      '</div>' +
      '<p class="hint">La importación sobrescribe toda la base de datos (perros, servicios, contactos, plantillas y configuración).</p></section>';

    /* --- Canales de captación --- */
    html += '<section class="card"><h2>' + UI.icon('users') + ' Canales de captación</h2>';
    html += '<p class="hint">Canales disponibles en el campo "Referido (canal de captación)" de cada humano. El canal "Boca a boca" muestra además la casilla "Recomendado por". Si renombras un canal, el cambio se propaga a los humanos que lo tenían asignado.</p>';
    html += '<div id="captEditor"></div>';
    html += '<div class="form-actions">' +
      '<button class="btn btn-soft" id="captAdd">' + UI.icon('plus') + ' Añadir canal</button>' +
      '<button class="btn btn-soft" id="captReset">' + UI.icon('refresh') + ' Valores por defecto</button>' +
      '<button class="btn btn-primary" id="captSave">' + UI.icon('check') + ' Guardar canales</button>' +
      '</div></section>';

    /* --- Comportamientos (sección minimizada por defecto, con flecha maestra) --- */
    html += '<section class="card"><h2>' + UI.icon('dog') + ' Comportamientos' +
      '<button type="button" class="icon-btn" id="behavSectionToggle" title="Mostrar/ocultar sección" style="margin-left:auto">' + UI.icon('chevron_down') + '</button></h2>';
    html += '<p class="hint">Lista de comportamientos disponibles en el formulario de cada perro. La sección aparece minimizada: pulsa la flecha (▼/▲) del título para mostrarla u ocultarla; dentro, cada categoría tiene su propia flecha. Pulsa "Guardar comportamientos" para aplicar los cambios.</p>';
    html += '<div id="behavSectionBody" hidden><div id="behavEditor"></div>';
    html += '<div class="form-actions">' +
      '<button class="btn btn-soft" id="behavAddGroup">' + UI.icon('plus') + ' Añadir categoría</button>' +
      '<button class="btn btn-soft" id="behavReset">' + UI.icon('refresh') + ' Valores por defecto</button>' +
      '<button class="btn btn-primary" id="behavSave">' + UI.icon('check') + ' Guardar comportamientos</button>' +
      '</div></div></section>';

    /* --- Seguridad (cifrado) --- */
    html += '<section class="card"><h2>' + UI.icon('lock') + ' Seguridad</h2>';
    html += '<p class="hint">Los datos personales de los humanos (nombre, teléfono, Telegram y WhatsApp) se guardan cifrados en el dispositivo. La clave maestra solo está en memoria durante la sesión y nunca se almacena.</p>';
    html += '<div class="btn-stack">' +
      '<button class="btn" id="btnChangePw">' + UI.icon('key') + ' Cambiar contraseña maestra</button>' +
      '<button class="btn btn-soft" id="btnResetPin">' + UI.icon('key') + ' Cambiar PIN de acceso público</button>' +
      '<button class="btn btn-soft" id="btnLockSesion">' + UI.icon('logout') + ' Cerrar sesión</button>' +
      '</div></section>';

    /* --- Nube (Supabase) --- */
    var supaUrl = (root.Supa && root.Supa.getUrl) ? root.Supa.getUrl() : '';
    var supaKey = (root.Supa && root.Supa.getKey) ? root.Supa.getKey() : '';
    var isSupaCfg = !!(supaUrl && supaKey);
    html += '<section class="card"><h2>' + UI.icon('cloud') + ' Nube (Supabase) - sincronización móvil y PC</h2>';
    html += '<p class="hint">Configura Supabase (gratis) para ver los mismos datos en móvil y PC. Sin configurar, la app sigue 100% offline. Ver <code>supabase/README.md</code> y <code>supabase/schema.sql</code>.</p>';
    html += '<div class="form-field"><label>Supabase URL</label><input type="text" class="input" id="supaUrl" value="' + UI.esc(supaUrl) + '" placeholder="https://xxxxx.supabase.co"></div>';
    html += '<div class="form-field"><label>Supabase anon key</label><input type="password" class="input" id="supaKey" value="' + UI.esc(supaKey) + '" placeholder="eyJhbG..." autocomplete="off"></div>';
    html += '<div class="form-actions"><button class="btn btn-primary" id="saveSupa">' + UI.icon('check') + ' Guardar nube</button> <button class="btn" id="clearSupa">' + UI.icon('x') + ' Desactivar nube</button></div>';
    html += '<div class="form-field"><div class="static-val" id="supaStatus">' + (isSupaCfg ? 'Configurada - recarga para activar login por email' : 'No configurada (modo offline)') + '</div></div>';
    html += '<div class="btn-stack"><button class="btn" id="btnSupaPull">' + UI.icon('download') + ' Sincronizar ahora (pull)</button><button class="btn" id="btnSupaPush">' + UI.icon('upload') + ' Subir datos locales a nube (push)</button></div>';
    html += '<p class="hint">Estado cola: <span id="supaQueueInfo">-</span> · Último pull: <span id="supaLastPull">-</span></p>';
    html += '</section>';

    /* --- Colores del calendario --- */
    html += '<section class="card"><h2>' + UI.icon('palette') + ' Colores del calendario</h2>';
    html += '<p class="hint">Colores de las barras del calendario según el estado de cada servicio, y de los eventos esporádicos.</p>';
    html += '<div class="form-grid form-grid-3">' +
      '<div class="form-field"><label>Pendiente</label><input type="color" class="input color-input" id="colPendiente" value="' + (config.colores && config.colores.pendiente) + '"></div>' +
      '<div class="form-field"><label>Confirmado</label><input type="color" class="input color-input" id="colConfirmado" value="' + (config.colores && config.colores.confirmado) + '"></div>' +
      '<div class="form-field"><label>En curso</label><input type="color" class="input color-input" id="colEnCurso" value="' + (config.colores && config.colores.en_curso) + '"></div>' +
      '<div class="form-field"><label>Finalizado</label><input type="color" class="input color-input" id="colFinalizado" value="' + (config.colores && config.colores.finalizado) + '"></div>' +
      '<div class="form-field"><label>Cancelado</label><input type="color" class="input color-input" id="colCancelado" value="' + (config.colores && config.colores.cancelado) + '"></div>' +
      '<div class="form-field"><label>Eventos</label><input type="color" class="input color-input" id="colEvento" value="' + (config.colores && config.colores.evento) + '"></div>' +
      '</div>' +
      '<div class="form-actions">' +
      '<button class="btn btn-soft" id="colReset">' + UI.icon('refresh') + ' Valores por defecto</button>' +
      '<button class="btn btn-primary" id="colSave">' + UI.icon('check') + ' Guardar colores</button>' +
      '</div></section>';

    /* --- Logo y empresa --- */
    html += '<section class="card"><h2>' + UI.icon('image') + ' Empresa y logo</h2>';
    html += '<p class="hint"></p>';
    html += '<div class="form-grid form-grid-2">' +
      '<div class="form-field"><label>Nombre de la empresa</label><input type="text" class="input" id="cfgEmpresa" value="' + UI.esc(config.nombreEmpresa || '') + '" placeholder="Cuidador Canino"></div>' +
      '<div class="form-field align-end"><button class="btn btn-primary" id="saveEmpresa">' + UI.icon('check') + ' Guardar nombre</button></div>' +
      '</div>';
    html += '<div class="photo-row">' +
      '<span class="avatar avatar-xl" id="logoPreview">' + (config.logo ? '<img src="' + UI.esc(config.logo) + '" alt="Logo">' : UI.icon('dog')) + '</span>' +
      '<div class="photo-actions">' +
      '<label class="btn btn-soft" for="logoInput">' + UI.icon('upload') + ' Cargar logo</label>' +
      '<input type="file" id="logoInput" accept="image/*" hidden>' +
      '<button class="btn btn-soft" id="logoRemove" ' + (config.logo ? '' : 'hidden') + '>' + UI.icon('trash') + ' Borrar logo</button>' +
      '</div></div>' +
      '<p class="hint">Se redimensiona a 800x800 píxeles.</p></section>';

    /* --- Google Calendar --- */
    html += '<section class="card"><h2>' + UI.icon('calendar') + ' Google Calendar</h2>';
    html += '<p class="hint">Integración opcional (funcionalidad prevista). Si no se configura, el calendario local funciona igualmente.</p>';
    html += '<div class="form-grid form-grid-2">' +
      '<div class="form-field"><label>Activar sincronización</label><select class="input" id="gEnabled"><option value="0">No</option><option value="1">Sí</option></select></div>' +
      '<div class="form-field"><label>Correo de la cuenta</label><input type="email" class="input" id="gEmail" value="' + UI.esc((config.google && config.google.email) || '') + '" placeholder="tu.cuenta@gmail.com"></div>' +
      '<div class="form-field"><label>API Key</label><input type="text" class="input" id="gApiKey" value="' + UI.esc((config.google && config.google.apiKey) || '') + '"></div>' +
      '<div class="form-field"><label>ID de calendario</label><input type="text" class="input" id="gCalId" value="' + UI.esc((config.google && config.google.calendarId) || '') + '"></div>' +
      '</div>' +
      '<div class="form-actions">' +
      '<button class="btn" id="gConnect">' + UI.icon('link') + ' Conectar</button>' +
      '<button class="btn btn-primary" id="saveGoogle">' + UI.icon('check') + ' Guardar</button>' +
      '</div></section>';

    container.innerHTML = html;

    /* Comportamientos */
    function normGrupos(raw) {
      return (raw || []).map(function (g) {
        return {
          id: g.id,
          titulo: g.titulo || '',
          items: (g.items || []).map(function (t) { return typeof t === 'object' ? t : { t: t, orig: t }; }),
          /* Minimizada por defecto; booleano explícito para que el primer
             toque en la flecha responda (undefined se quedaba colapsado). */
          _collapsed: g._collapsed === false ? false : true
        };
      });
    }
    var grupos = normGrupos(Store.getConfig().comportamientos || Store.defaultComportamientos());
    var ed = document.getElementById('behavEditor');

    /* Flecha maestra de la sección: muestra/oculta todo el bloque */
    (function () {
      var secToggle = document.getElementById('behavSectionToggle');
      var secBody = document.getElementById('behavSectionBody');
      if (!secToggle || !secBody) return;
      secToggle.addEventListener('click', function () {
        var hiddenNow = secBody.hidden;
        secBody.hidden = !hiddenNow;
        secToggle.innerHTML = hiddenNow ? UI.icon('chevron_up') : UI.icon('chevron_down');
      });
    })();

    function renderBehaviors() {
      ed.innerHTML = grupos.map(function (g, gi) {
        var collapsed = g._collapsed !== false;
        return '<div class="behav-group' + (collapsed ? ' collapsed' : '') + '" data-gi="' + gi + '">' +
          '<div class="behav-group-head">' +
          '<button type="button" class="icon-btn" data-toggle-group title="Expandir/colapsar">' + (collapsed ? UI.icon('chevron_down') : UI.icon('chevron_up')) + '</button>' +
          '<input class="input" data-grupo-titulo value="' + UI.esc(g.titulo || '') + '">' +
          '<button type="button" class="icon-btn btn-danger-soft" data-del-grupo title="Borrar categoría">' + UI.icon('x') + '</button>' +
          '</div>' +
          '<div class="behav-items" ' + (collapsed ? 'hidden' : '') + '>' + (g.items || []).map(function (item, ii) {
            return '<div class="behav-item-row" data-ii="' + ii + '">' +
              '<div class="behav-move">' +
              '<button type="button" class="icon-btn" data-move-up title="Subir">' + UI.icon('chevron_up') + '</button>' +
              '<button type="button" class="icon-btn" data-move-down title="Bajar">' + UI.icon('chevron_down') + '</button>' +
              '</div>' +
              '<input class="input" data-item-texto value="' + UI.esc(item.t) + '">' +
              '<button type="button" class="icon-btn btn-danger-soft" data-del-item title="Borrar comportamiento">' + UI.icon('x') + '</button>' +
              '</div>';
          }).join('') + '</div>' +
          '<button type="button" class="btn btn-soft" data-add-item ' + (collapsed ? 'hidden' : '') + '>' + UI.icon('plus') + ' Añadir comportamiento</button>' +
          '</div>';
      }).join('');
    }
    renderBehaviors();

    ed.addEventListener('input', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-grupo-titulo')) {
        grupos[+t.closest('.behav-group').dataset.gi].titulo = t.value;
      } else if (t.hasAttribute('data-item-texto')) {
        grupos[+t.closest('.behav-group').dataset.gi].items[+t.closest('.behav-item-row').dataset.ii].t = t.value;
      }
    });
    // selector de grupo eliminado: cada comportamiento permanece en su categoría
    ed.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-toggle-group')) {
        var gi = +b.closest('.behav-group').dataset.gi;
        grupos[gi]._collapsed = !grupos[gi]._collapsed;
        renderBehaviors();
        return;
      }
      if (b.hasAttribute('data-add-item')) {
        var gi = +b.closest('.behav-group').dataset.gi;
        grupos[gi].items.push({ t: '' });
        renderBehaviors();
        var rows = b.closest('.behav-group').querySelectorAll('[data-item-texto]');
        var last = rows[rows.length - 1];
        if (last) last.focus();
      } else if (b.hasAttribute('data-move-up') || b.hasAttribute('data-move-down')) {
        var gmi = +b.closest('.behav-group').dataset.gi;
        var imi = +b.closest('.behav-item-row').dataset.ii;
        var dir = b.hasAttribute('data-move-up') ? -1 : 1;
        var tgt = imi + dir;
        var arr = grupos[gmi].items;
        if (tgt < 0 || tgt >= arr.length) return;
        var tmp = arr[imi]; arr[imi] = arr[tgt]; arr[tgt] = tmp;
        renderBehaviors();
      } else if (b.hasAttribute('data-del-item')) {
        var gdi = +b.closest('.behav-group').dataset.gi;
        var di = +b.closest('.behav-item-row').dataset.ii;
        grupos[gdi].items.splice(di, 1);
        renderBehaviors();
      } else if (b.hasAttribute('data-del-grupo')) {
        var ggi = +b.closest('.behav-group').dataset.gi;
        var group = grupos[ggi];
        (function (gi2) {
          var doDelete = function () { grupos.splice(gi2, 1); renderBehaviors(); };
          if ((group.items || []).length) {
            UI.confirmDialog({
              title: 'Borrar categoría',
              message: 'Se borrará la categoría "' + (group.titulo || '') + '" y sus ' + group.items.length + ' comportamientos. ¿Continuar?',
              confirmText: 'Sí, borrar'
            }).then(function (ok) { if (ok) doDelete(); });
          } else {
            doDelete();
          }
        })(ggi);
      }
    });

    document.getElementById('behavAddGroup').addEventListener('click', function () {
      grupos.push({ id: Store.uid(), titulo: 'Nueva categoría', items: [], _collapsed: false });
      renderBehaviors();
    });
    document.getElementById('behavReset').addEventListener('click', function () {
      grupos = normGrupos(Store.defaultComportamientos());
      renderBehaviors();
      UI.toast('Lista restablecida. Pulsa Guardar para aplicarla.', 'info');
    });
    document.getElementById('behavSave').addEventListener('click', function () {
      var clean = grupos.map(function (g) {
        return {
          id: g.id || Store.uid(),
          titulo: (g.titulo || '').trim(),
          items: (g.items || []).map(function (o) { return (o.t || '').trim(); }).filter(Boolean)
        };
      }).filter(function (g) { return g.titulo; });
      if (!clean.length) { UI.toast('Debe quedar al menos una categoría', 'error'); return; }
      var doSave = function () {
        Store.setConfig({ comportamientos: clean });
        UI.toast('Comportamientos guardados', 'success');
      };
      var renames = [];
      grupos.forEach(function (g) {
        (g.items || []).forEach(function (o) {
          var act = (o.t || '').trim();
          var ant = o.orig || '';
          if (ant.trim() && ant !== act) renames.push({ from: ant, to: act });
        });
      });
      if (!renames.length) { doSave(); return; }
      UI.confirmDialog({
        title: 'Renombrar comportamientos',
        message: 'Estos comportamientos cambian de nombre y se actualizarán en los perros que los tenían marcados:\n' +
          renames.map(function (r) { return '• ' + r.from + ' → ' + r.to; }).join('\n') +
          '\n\n¿Desea continuar?',
        confirmText: 'Sí, actualizar'
      }).then(function (ok) {
        if (!ok) { UI.toast('Cambios no guardados', 'error'); return; }
        Store.listDogs({ includeInactive: true }).then(function (dogs) {
          var chain = Promise.resolve();
          dogs.forEach(function (d) {
            var ch = false;
            if (d.comportamientos && d.comportamientos.length) {
              d.comportamientos = d.comportamientos.map(function (it) {
                for (var i = 0; i < renames.length; i++) {
                  if (it === renames[i].from) { ch = true; return renames[i].to; }
                }
                return it;
              });
            }
            if (d.notas) {
              var n = d.notas;
              renames.forEach(function (r) {
                if (n.indexOf(r.from) !== -1) { n = n.split(r.from).join(r.to); ch = true; }
              });
              d.notas = n;
            }
            if (ch) chain = chain.then(function () { return Store.saveDog(d); });
          });
          return chain;
        }).then(doSave);
      });
    });

    /* Canales de captación */
    var canales = JSON.parse(JSON.stringify(config.captacion || Store.defaultCaptacion()));
    var capEd = document.getElementById('captEditor');
    function renderCanales() {
      capEd.innerHTML = (!canales.length ? '<p class="hint">Sin canales. Añade al menos uno.</p>' : '') +
        canales.map(function (ch, i) {
          return '<div class="capt-row" data-ci="' + i + '">' +
            '<input class="input" data-canal-nombre value="' + UI.esc(ch.nombre || '') + '">' +
            '<button type="button" class="icon-btn btn-danger-soft" data-del-canal title="Borrar canal">' + UI.icon('x') + '</button>' +
            '</div>';
        }).join('');
    }
    renderCanales();
    capEd.addEventListener('input', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-canal-nombre')) canales[+t.closest('.capt-row').dataset.ci].nombre = t.value;
    });
    capEd.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || !b.hasAttribute('data-del-canal')) return;
      canales.splice(+b.closest('.capt-row').dataset.ci, 1);
      renderCanales();
    });
    document.getElementById('captAdd').addEventListener('click', function () {
      canales.push({ id: Store.uid(), nombre: '' });
      renderCanales();
      var rows = capEd.querySelectorAll('[data-canal-nombre]');
      var last = rows[rows.length - 1];
      if (last) last.focus();
    });
    document.getElementById('captReset').addEventListener('click', function () {
      canales = JSON.parse(JSON.stringify(Store.defaultCaptacion()));
      renderCanales();
      UI.toast('Canales restablecidos. Pulsa Guardar para aplicarlos.', 'info');
    });
    document.getElementById('captSave').addEventListener('click', async function () {
      var clean = canales.map(function (ch) { return { id: ch.id || Store.uid(), nombre: (ch.nombre || '').trim() }; }).filter(function (ch) { return ch.nombre; });
      if (!clean.length) { UI.toast('Debe quedar al menos un canal', 'error'); return; }
      var renames = [];
      var oldById = {};
      (config.captacion || []).forEach(function (c) { oldById[c.id] = (c.nombre || '').trim(); });
      clean.forEach(function (c) {
        var old = oldById[c.id];
        if (old && old !== c.nombre) renames.push({ from: old, to: c.nombre });
      });
      Store.setConfig({ captacion: clean });
      if (renames.length) {
        var contacts = await Store.listContacts();
        var chain = Promise.resolve();
        contacts.forEach(function (ct) {
          renames.forEach(function (r) {
            if ((ct.referido || '').trim() === r.from) {
              ct.referido = r.to;
              chain = chain.then(function () { return Store.saveContact(ct); });
            }
          });
        });
        await chain;
      }
      UI.toast('Canales de captación guardados' + (renames.length ? ' (' + renames.length + ' canal(es) renombrado(s) y propagado(s) a los contactos)' : ''), 'success');
      config = Store.getConfig();
      canales = JSON.parse(JSON.stringify(config.captacion || Store.defaultCaptacion()));
      renderCanales();
    });

    /* Costes */
    document.getElementById('saveCostes').addEventListener('click', function () {
      var h = C.num(document.getElementById('cfgCosteHosp').value);
      var p = C.num(document.getElementById('cfgCostePaseo').value);
      Store.setConfig({ costeHospedaje: h, costePaseo: p });
      UI.toast('Costes base actualizados', 'success');
    });

    /* Preferencias */
    document.getElementById('cfgOcultarDecesos').addEventListener('change', function () {
      Store.setConfig({ ocultarDecesos: this.checked });
      UI.toast(this.checked ? 'Perros fallecidos ocultos en el alta de servicios' : 'Se muestran todos los perros en el alta de servicios', 'success');
    });
    document.getElementById('cfgOcultarRedFlags').addEventListener('change', function () {
      Store.setConfig({ ocultarRedFlags: this.checked });
      UI.toast(this.checked ? 'Los perros con RED FLAG se ocultan en la lista de perros' : 'Se muestran todos los perros en la lista', 'success');
    });

    /* Colores del calendario */
    var colMap = [
      ['colPendiente', 'pendiente'],
      ['colConfirmado', 'confirmado'],
      ['colEnCurso', 'en_curso'],
      ['colFinalizado', 'finalizado'],
      ['colCancelado', 'cancelado'],
      ['colEvento', 'evento']
    ];
    document.getElementById('colSave').addEventListener('click', function () {
      var colores = {};
      colMap.forEach(function (pair) {
        colores[pair[1]] = document.getElementById(pair[0]).value;
      });
      Store.setConfig({ colores: colores });
      UI.toast('Colores del calendario guardados', 'success');
    });
    document.getElementById('colReset').addEventListener('click', function () {
      var def = Store.defaultConfig().colores;
      colMap.forEach(function (pair) {
        document.getElementById(pair[0]).value = def[pair[1]];
      });
      UI.toast('Valores por defecto restablecidos. Pulsa Guardar colores para aplicarlos.', 'info');
    });

    /* Empresa */
    document.getElementById('saveEmpresa').addEventListener('click', function () {
      Store.setConfig({ nombreEmpresa: document.getElementById('cfgEmpresa').value.trim() });
      App.updateBrand();
      UI.toast('Nombre de la empresa actualizado', 'success');
    });

    /* Logo */
    var logoInput = document.getElementById('logoInput');
    logoInput.addEventListener('change', function () {
      var f = logoInput.files[0];
      if (!f) return;
      UI.readImageResized(f, 800).then(function (dataUrl) {
        Store.setConfig({ logo: dataUrl });
        document.getElementById('logoPreview').innerHTML = '<img src="' + dataUrl + '" alt="Logo">';
        document.getElementById('logoRemove').hidden = false;
        App.updateBrand();
        UI.toast('Logo actualizado', 'success');
      }).catch(function (err) { UI.toast(err.message, 'error'); });
    });
    document.getElementById('logoRemove').addEventListener('click', function () {
      Store.setConfig({ logo: null });
      document.getElementById('logoPreview').innerHTML = UI.icon('dog');
      this.hidden = true;
      logoInput.value = '';
      App.updateBrand();
      UI.toast('Logo eliminado', 'success');
    });

    /* Google */
    document.getElementById('gEnabled').value = config.google.enabled ? '1' : '0';
    document.getElementById('gConnect').addEventListener('click', function () {
      UI.toast('La conexión con Google Calendar es una funcionalidad futura. Guarda los datos de acceso y habilita la sincronización cuando esté disponible.', 'info');
    });
    document.getElementById('saveGoogle').addEventListener('click', function () {
      Store.setConfig({
        google: {
          enabled: document.getElementById('gEnabled').value === '1',
          email: document.getElementById('gEmail').value.trim(),
          apiKey: document.getElementById('gApiKey').value.trim(),
          calendarId: document.getElementById('gCalId').value.trim()
        }
      });
      UI.toast('Configuración de Google Calendar guardada', 'success');
    });
    /* Nube Supabase */
    (function(){
      var saveBtn=document.getElementById('saveSupa');
      var clearBtn=document.getElementById('clearSupa');
      var pullBtn=document.getElementById('btnSupaPull');
      var pushBtn=document.getElementById('btnSupaPush');
      function updInfo(){
        try{
          var q=JSON.parse(localStorage.getItem('cc_sync_queue_v1')||'[]');
          var el=document.getElementById('supaQueueInfo');
          if(el) el.textContent=q.length+' pendientes';
          var lp=localStorage.getItem('cc_sync_last_pull_v1')||'-';
          var el2=document.getElementById('supaLastPull');
          if(el2) el2.textContent=lp;
        }catch(e){}
      }
      updInfo();
      if(saveBtn) saveBtn.addEventListener('click', function(){
        var u=document.getElementById('supaUrl').value.trim();
        var k=document.getElementById('supaKey').value.trim();
        if(!u||!k){ UI.toast('URL y anon key obligatorios','error'); return; }
        if(u.indexOf('supabase.co')===-1){ UI.toast('URL debe ser https://xxx.supabase.co','error'); return; }
        root.Supa.setConfig(u,k);
        UI.toast('Configuración nube guardada. Recarga la página para iniciar sesión con email.','success');
        document.getElementById('supaStatus').textContent='Configurada - recarga para activar login por email';
      });
      if(clearBtn) clearBtn.addEventListener('click', function(){
        root.Supa.clearConfig();
        document.getElementById('supaUrl').value='';
        document.getElementById('supaKey').value='';
        document.getElementById('supaStatus').textContent='No configurada (modo offline)';
        UI.toast('Nube desactivada. Modo offline.','info');
      });
      if(pullBtn) pullBtn.addEventListener('click', async function(){
        if(!root.Supa.isConfigured()){ UI.toast('Configura primero Supabase URL/key','error'); return; }
        var c=root.Supa.getClient();
        if(!c){ UI.toast('supabase-js no cargado (revisa conexión)','error'); return; }
        var sess=await root.Supa.getSession();
        if(!sess){ UI.toast('Inicia sesión con email primero (recarga)','error'); return; }
        UI.toast('Sincronizando...','info');
        var r=await root.Sync.pullAll();
        updInfo(); UI.toast('Pull OK: '+r.pulled+' registros','success'); App.refresh();
      });
      if(pushBtn) pushBtn.addEventListener('click', async function(){
        if(!root.Supa.isConfigured()){ UI.toast('Configura primero','error'); return; }
        var sess=await root.Supa.getSession();
        if(!sess){ UI.toast('Inicia sesión primero','error'); return; }
        UI.toast('Subiendo datos locales...','info');
        var n=await root.Sync.pushAllLocal();
        updInfo(); UI.toast('Push OK: '+n+' registros','success');
      });
    })();


    /* Exportar */
    document.getElementById('btnExport').addEventListener('click', async function () {
      var payload = await Store.exportAll();
      UI.downloadFile('cuidador_canino_backup_' + C.todayISO() + '.json', JSON.stringify(payload, null, 2), 'application/json');
      UI.toast('Base de datos exportada', 'success');
    });

    /* Tamaño de la base de datos */
    (async function () {
      var el = document.getElementById('dbSizeVal');
      if (!el) return;
      try {
        var bytes = await Store.dbSize();
        el.textContent = (bytes / 1024).toFixed(2) + ' KB (' + bytes + ' bytes)';
      } catch (e) {
        el.textContent = 'No disponible';
      }
    })();

    /* Importar */
    document.getElementById('btnImport').addEventListener('click', function () {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', function () {
      var f = this.files[0];
      this.value = '';
      if (!f) return;
      var reader = new FileReader();
      reader.onload = async function () {
        var payload;
        try { payload = JSON.parse(reader.result); }
        catch (e) { UI.toast('El archivo no es un JSON válido', 'error'); return; }
        var ok = await UI.confirmTypeDialog({
          title: 'Importar base de datos',
          message: 'Se sobrescribirá TODA la base de datos actual (perros, servicios, contactos, plantillas y configuración).',
          word: 'importar',
          confirmText: 'Importar y sobrescribir'
        });
        if (!ok) return;
        var altKey = null;
        if (payload && payload.cifrado && payload.cifrado.salt &&
            !(root.Crypto.isUnlocked() && root.Crypto.salt() === payload.cifrado.salt)) {
          var pw = await root.Gate.askPassword('Este archivo está cifrado. Introduce la contraseña maestra que se usó al exportarlo para poder importarlo.');
          if (pw === null) { UI.toast('Importación cancelada.', 'error'); return; }
          altKey = await root.Crypto.deriveWith(pw, payload.cifrado.salt);
        }
        try {
          var counts = await Store.importAll(payload, { altKey: altKey });
          UI.toast('Importación correcta: ' + counts.dogs + ' perros, ' + counts.services + ' servicios, ' + counts.contacts + ' contactos, ' + counts.templates + ' plantillas.', 'success');
          App.updateBrand();
          App.refresh();
          // Sube lo importado a la nube para que el otro dispositivo no
          // resucite los datos anteriores al sincronizar.
          try {
            if (root.Sync && root.Sync.pushAllLocal) {
              var pushed = await root.Sync.pushAllLocal();
              if (pushed > 0) UI.toast('Nube actualizada: ' + pushed + ' registros', 'info');
            }
          } catch (ePush) { console.warn('[Import] push nube', ePush); }
        } catch (e) {
          UI.toast('Error al importar: ' + e.message, 'error');
        }
      };
      reader.readAsText(f);
    });

    /* Modal de cambio de contraseña maestra */
    function changePwModal() {
      return new Promise(function (resolve) {
        var ov = document.createElement('div');
        ov.className = 'auth-gate';
        ov.setAttribute('role', 'dialog');
        var html = '<div class="auth-card"><h2>' + UI.icon('key') + ' Cambiar contraseña maestra</h2>' +
          '<p class="auth-warn">' + UI.icon('alert') + ' Si olvidas la nueva contraseña, los datos de tus clientes serán irrecuperables permanentemente. No hay forma de restablecerla. Haz una copia de seguridad de la base de datos sin cifrar si necesitas un método alternativo.</p>' +
          '<div class="form-field"><label>Contraseña actual</label><input type="password" class="input" id="cpw1" autocomplete="current-password"></div>' +
          '<div class="form-field"><label>Nueva contraseña</label><input type="password" class="input" id="cpw2" autocomplete="new-password" placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"></div>' +
          '<div class="form-field"><label>Confirmar nueva contraseña</label><input type="password" class="input" id="cpw3" autocomplete="new-password"></div>' +
          '<div class="progress" id="cpwProg" hidden><div class="progress-bar" id="cpwBar" style="width:0%"></div></div>' +
          '<div class="auth-err" id="cpwErr" hidden></div>' +
          '<div class="form-actions"><button class="btn" id="cpwCancel">Cancelar</button>' +
          '<button class="btn btn-primary" id="cpwOk">' + UI.icon('check') + ' Cambiar contraseña</button></div></div>';
        ov.innerHTML = html;
        document.body.appendChild(ov);
        function close(v) { if (ov.parentNode) ov.parentNode.removeChild(ov); resolve(v); }
        ov.querySelector('#cpwCancel').addEventListener('click', function () { close(false); });
        var okBtn = ov.querySelector('#cpwOk');
        function submit() {
          var cur = ov.querySelector('#cpw1').value;
          var nw = ov.querySelector('#cpw2').value;
          var nw2 = ov.querySelector('#cpw3').value;
          var err = ov.querySelector('#cpwErr');
          if (!(nw.length >= 8 && /[A-ZÁÉÍÓÚÜÑ]/.test(nw) && /\d/.test(nw))) {
            err.textContent = 'La nueva contraseña debe tener al menos 8 caracteres, una mayúscula y un número.';
            err.hidden = false;
            return;
          }
          if (nw !== nw2) {
            err.textContent = 'Las contraseñas nuevas no coinciden.';
            err.hidden = false;
            return;
          }
          okBtn.disabled = true;
          var prog = ov.querySelector('#cpwProg');
          var bar = ov.querySelector('#cpwBar');
          prog.hidden = false;
          Store.changeMasterPassword(cur, nw, function (done, total) {
            bar.style.width = Math.round((done / total) * 100) + '%';
          }).then(function () {
            close(true);
            UI.toast('Contraseña cambiada y datos re-cifrados.', 'success');
            App.refresh();
          }).catch(function (e) {
            err.textContent = e && e.message ? e.message : 'No se pudo cambiar la contraseña.';
            err.hidden = false;
            okBtn.disabled = false;
            prog.hidden = true;
          });
        }
        ov.querySelector('#cpw1').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
        ov.querySelector('#cpw2').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
        ov.querySelector('#cpw3').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
        okBtn.addEventListener('click', submit);
        ov.querySelector('#cpw1').focus();
      });
    }
    document.getElementById('btnChangePw').addEventListener('click', changePwModal);
    document.getElementById('btnLockSesion').addEventListener('click', function () {
      if (root.App && root.App.lock) root.App.lock();
    });
    document.getElementById('btnResetPin').addEventListener('click', async function(){
      if(!root.ExtraGate){ UI.toast('Gate extra no cargado','error'); return; }
      var ok=await UI.confirmDialog({title:'Cambiar PIN', message:'Se borrará el PIN actual y al recargar se te pedirá uno nuevo de 6 dígitos. ¿Continuar?', confirmText:'Sí, borrar PIN'});
      if(!ok) return;
      try{ localStorage.removeItem(root.ExtraGate.LS_HASH); }catch(e){}
      // El PIN vive también en Supabase (app_pin, compartido entre dispositivos):
      // si no se borra allí, al recargar pediría el PIN viejo igualmente.
      try{
        if(root.Supa && root.Supa.isConfigured() && root.Supa.getClient()){
          var c=root.Supa.getClient();
          var sess=await root.Supa.getSession();
          if(sess){ await c.from('app_pin').delete().eq('id',1); }
          else { UI.toast('PIN local borrado. Sin sesión de nube: si otro dispositivo fijó el PIN compartido, seguirá pidiéndolo.','warning'); }
        }
      }catch(e){}
      UI.toast('PIN borrado. Recarga la página para establecer uno nuevo.','success');
    });

    /* Borrar todo (local + nube para que no resuciten al sincronizar) */
    document.getElementById('btnWipe').addEventListener('click', async function () {
      var ok = await UI.confirmTypeDialog({
        title: 'Borrar todos los datos',
        message: 'Se eliminarán todos los perros, servicios, contactos y plantillas, también en la nube. Se conserva la configuración (costes base y logo).',
        word: 'borrar todo',
        confirmText: 'Borrar todos los datos'
      });
      if (!ok) return;
      await Store.clearAllExceptConfig();
      var msg = 'Base de datos vaciada (se mantiene la configuración)';
      try {
        if (root.Sync && root.Sync.wipeRemote) {
          var wr = await root.Sync.wipeRemote();
          if (wr.ok) msg += ' en este dispositivo y en la nube';
          else if (wr.reason === 'no-config') msg += '. Sin nube configurada: solo este dispositivo';
          else msg += '. AVISO: no se pudo borrar la nube (sin conexión o sin sesión); los datos volverán al sincronizar. Repite el borrado con conexión';
        }
      } catch (e) {
        msg += '. AVISO: no se pudo borrar la nube (' + (e && e.message ? e.message : 'error') + '); los datos volverán al sincronizar';
      }
      UI.toast(msg, 'success');
      App.refresh();
    });
  }

  root.Views = root.Views || {};
  root.Views.configuracion = { title: 'Configuración', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
