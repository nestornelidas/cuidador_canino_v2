/* Cuidador Canino - Vista Plantillas de Texto */
(function (root) {
  'use strict';
  var C = root.Calc, UI = root.UI, Store = root.Store;

  function varChipsHtml() {
    return TemplateData.VARIABLES.map(function (v) {
      return '<button type="button" class="chip-btn" data-var="' + v.token + '" title="' + UI.esc(v.desc) + '">' + UI.esc(v.token) + '</button>';
    }).join('');
  }

  function openEditor(template) {
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="form-field"><label>Nombre de la plantilla</label>' +
      '<input type="text" class="input" id="tplNombre" value="' + UI.esc(template.nombre) + '"></div>' +
      '<div class="form-field"><label>Contenido</label>' +
      '<textarea class="input" id="tplContenido" rows="10" placeholder="Escribe aquí el mensaje...">' + UI.esc(template.contenido) + '</textarea></div>' +
      '<div class="form-field"><label>Variables disponibles</label>' +
      '<div class="var-chips">' + varChipsHtml() + '</div>' +
      '<p class="hint">Haz clic en una variable para insertarla en el mensaje. Se sustituyen cuando se invocan desde un servicio. Para concordar género y número usa alternativas separadas por <code>|</code> dentro de llaves: <code>{alojado|alojada|alojados|alojadas}</code> = macho | hembra | plural mixto/masculino | plural femenino (2 o 3 alternativas también valen: <code>{estimado|estimada}</code>).</p></div>';

    var foot = document.createElement('div');
    if (template.id) {
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger';
      delBtn.innerHTML = UI.icon('trash') + ' Eliminar';
      delBtn.addEventListener('click', async function () {
        var ok = await UI.confirmDialog({ title: 'Eliminar plantilla', message: '¿Eliminar la plantilla "' + template.nombre + '"?', confirmText: 'Sí, eliminar' });
        if (!ok) return;
        await Store.deleteTemplate(template.id);
        m.close();
        UI.toast('Plantilla eliminada', 'success');
        App.refresh();
      });
      foot.appendChild(delBtn);
    }
    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary';
    saveBtn.innerHTML = UI.icon('check') + ' Guardar';
    foot.appendChild(saveBtn);

    var m = UI.modal({ title: template.id ? 'Editar plantilla' : 'Nueva plantilla', size: 'lg', body: body, footer: foot });

    var ta = body.querySelector('#tplContenido');
    body.querySelectorAll('[data-var]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var token = chip.dataset.var;
        var start = ta.selectionStart || ta.value.length;
        var end = ta.selectionEnd || ta.value.length;
        ta.value = ta.value.slice(0, start) + token + ta.value.slice(end);
        ta.focus();
        var pos = start + token.length;
        ta.setSelectionRange(pos, pos);
      });
    });

    saveBtn.addEventListener('click', async function () {
      var nombre = body.querySelector('#tplNombre').value.trim();
      var contenido = ta.value;
      if (!nombre) { UI.toast('El nombre de la plantilla es obligatorio', 'error'); return; }
      if (!contenido.trim()) { UI.toast('El contenido no puede estar vacío', 'error'); return; }
      var t = {
        id: template.id,
        nombre: nombre,
        contenido: contenido,
        orden: template.orden || 99
      };
      await Store.saveTemplate(t);
      m.close();
      UI.toast('Plantilla guardada', 'success');
      App.refresh();
    });
  }

  async function render(container, params, ctx) {
    var templates = await Store.listTemplates();

    var html = '';
    html += '<div class="view-head"><h1>Plantillas de Texto</h1><div class="view-actions">' +
      '<button class="btn btn-primary" id="newTemplate">' + UI.icon('plus') + ' Nueva plantilla</button>' +
      '</div></div>';
    html += '<div class="card"><p class="hint">Pueden usarse desde el apartado de comunicaciones de la pantalla de Servicios</p>';

    if (!templates.length) {
      html += '<p class="empty">No hay plantillas.</p>';
    } else {
      html += '<div class="template-grid">';
      templates.forEach(function (t) {
        html += '<article class="template-card">' +
          '<h3>' + UI.icon('file') + ' ' + UI.esc(t.nombre) + '</h3>' +
          '<p class="tpl-preview">' + UI.esc(t.contenido.split('\n').slice(0, 3).join(' ')) + '</p>' +
          '<div class="row-actions">' +
          '<button class="btn btn-soft btn-sm" data-act="ver" data-id="' + t.id + '">' + UI.icon('eye') + ' Ver</button>' +
          '<button class="btn btn-soft btn-sm" data-act="copiar" data-id="' + t.id + '">' + UI.icon('copy') + ' Copiar</button>' +
          '<button class="btn btn-soft btn-sm" data-act="editar" data-id="' + t.id + '">' + UI.icon('pencil') + ' Editar</button>' +
          '</div></article>';
      });
      html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;

    document.getElementById('newTemplate').addEventListener('click', function () {
      openEditor({ id: null, nombre: '', contenido: '', orden: 99 });
    });

    var byId = {};
    templates.forEach(function (t) { byId[t.id] = t; });

    container.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = byId[b.dataset.id];
        if (!t) return;
        var act = b.dataset.act;
        if (act === 'copiar') {
          UI.copyText(t.contenido).then(function () { UI.toast('Mensaje copiado al portapapeles', 'success'); })
            .catch(function () { UI.toast('No se pudo copiar', 'error'); });
        } else if (act === 'editar') {
          openEditor(t);
        } else if (act === 'ver') {
          UI.modal({
            title: t.nombre,
            size: 'lg',
            body: '<pre class="tpl-view">' + UI.esc(t.contenido) + '</pre>',
            footer: '<button type="button" class="btn btn-primary" id="viewCopy">' + UI.icon('copy') + ' Copiar</button>'
          });
          document.getElementById('viewCopy').addEventListener('click', function () {
            UI.copyText(t.contenido).then(function () { UI.toast('Mensaje copiado al portapapeles', 'success'); });
          });
        }
      });
    });
  }

  root.Views = root.Views || {};
  root.Views.plantillas = { title: 'Plantillas', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
