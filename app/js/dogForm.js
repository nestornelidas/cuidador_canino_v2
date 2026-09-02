/* Cuidador Canino - Formulario de perro (reutilizable: vista Perros y alta rápida desde Servicios) */
(function (root) {
  'use strict';
  var C = root.Calc, UI = root.UI, Store = root.Store;

  function bocaNombre() {
    var c = Store.getConfig().captacion || [];
    for (var i = 0; i < c.length; i++) if (c[i].id === 'boca_a_boca') return c[i].nombre;
    return null;
  }

  function contactRowHtml(c, idx) {
    c = c || {};
    var canales = Store.getConfig().captacion || [];
    var boca = bocaNombre();
    var showName = boca && c.referido === boca;
    return '<div class="contact-row" data-idx="' + idx + '"' + (c.id ? ' data-cid="' + UI.esc(c.id) + '"' : '') + '>' +
      '<div class="contact-fields">' +
      '<div class="form-field"><label>Nombre completo *</label><input type="text" class="input" data-cf="nombre" value="' + UI.esc(c.nombre || '') + '"></div>' +
      '<div class="form-field"><label>Teléfono</label><input type="text" class="input" data-cf="telefono" value="' + UI.esc(c.telefono || '') + '"></div>' +
      '<div class="form-field"><label>Usuario Telegram</label><input type="text" class="input" data-cf="telegram" value="' + UI.esc(c.telegram || '') + '"></div>' +
      '<div class="form-field"><label>WhatsApp</label><input type="text" class="input" data-cf="whatsapp" value="' + UI.esc(c.whatsapp || '') + '"></div>' +
      '<div class="form-field"><label>Otros</label><input type="text" class="input" data-cf="otros" value="' + UI.esc(c.otros || '') + '"></div>' +
      '<div class="form-field"><label>Referido (canal de captación)</label><select class="input" data-cf="referido" data-ref-select><option value="">— Sin especificar —</option>' +
      canales.map(function (ch) {
        return '<option value="' + UI.esc(ch.nombre || '') + '"' + (c.referido === ch.nombre ? ' selected' : '') + '>' + UI.esc(ch.nombre || '') + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="form-field" data-ref-name' + (showName ? '' : ' hidden') + '><label>Recomendado por</label><input type="text" class="input" data-cf="referido_por" value="' + UI.esc(c.referido_por || '') + '" placeholder="Nombre de la persona que recomendó"></div>' +
      '</div>' +
      '<button type="button" class="icon-btn btn-danger-soft" data-rmc title="Quitar contacto">' + UI.icon('x') + '</button>' +
      '</div>';
  }

  function render(container, dog, opts) {
    opts = opts || {};
    dog = dog || { contact_ids: [], activo: true };
    var comportamientos = (Store.getConfig().comportamientos || []).filter(function (g) { return g && g.items; });
    function notasHtml(list) {
      list = list || [];
      return comportamientos.map(function (g) {
        var sel = list.filter(function (b) { return g.items.indexOf(b) !== -1; });
        return sel.length ? '<div><strong>' + UI.esc(g.titulo) + ':</strong> ' + sel.map(function (b) { return UI.esc(b); }).join('; ') + '</div>' : '';
      }).join('');
    }
    var initialNotas;
    if (dog.comportamientos && dog.comportamientos.length) {
      initialNotas = notasHtml(dog.comportamientos);
    } else if (dog.notas) {
      initialNotas = UI.esc(dog.notas).replace(/\n/g, '<br>');
    } else {
      initialNotas = '';
    }

    container.innerHTML =
      '<form class="dog-form" novalidate>' +
      '<div class="form-errors" hidden></div>' +
      '<div class="form-grid form-grid-3">' +
      '<div class="form-field"><label>Nombre *</label><input type="text" class="input" name="nombre" value="' + UI.esc(dog.nombre || '') + '" required></div>' +
      '<div class="form-field"><label>Fecha de nacimiento</label><input type="date" class="input" name="fecha_nacimiento" value="' + UI.esc(dog.fecha_nacimiento || '') + '"></div>' +
      '<div class="form-field"><label>Fecha de deceso</label>' +
      '<div class="fallecido-row">' +
      '<label class="chk"><input type="checkbox" name="es_deceso"' + ((dog.fecha_deceso || dog.es_deceso === true) ? ' checked' : '') + '> Fallecido/a</label>' +
      '<input type="date" class="input" name="fecha_deceso" value="' + UI.esc(dog.fecha_deceso || '') + '"></div>' +
      '</div>' +
      '</div>' +
      '<div class="form-grid form-grid-3">' +
      '<div class="form-field"><label>Raza</label><input type="text" class="input" name="raza" value="' + UI.esc(dog.raza || '') + '" placeholder="p. ej. Beagle"></div>' +
      '<div class="form-field"><label>Tamaño</label><select class="input" name="tamano">' +
      '<option value="">— Sin especificar —</option>' +
      '<option value="pequeño"' + (dog.tamano === 'pequeño' ? ' selected' : '') + '>Pequeño</option>' +
      '<option value="mediano"' + (dog.tamano === 'mediano' ? ' selected' : '') + '>Mediano</option>' +
      '<option value="grande"' + (dog.tamano === 'grande' ? ' selected' : '') + '>Grande</option>' +
      '<option value="gigante"' + (dog.tamano === 'gigante' ? ' selected' : '') + '>Gigante</option>' +
      '</select></div>' +
      '<div class="form-field"><label>Sexo</label><select class="input" name="sexo">' +
      '<option value="">— Sin especificar —</option>' +
      '<option value="macho"' + (dog.sexo === 'macho' ? ' selected' : '') + '>Macho</option>' +
      '<option value="hembra"' + (dog.sexo === 'hembra' ? ' selected' : '') + '>Hembra</option>' +
      '</select></div>' +
      '<div class="form-field"><label>Castrado/Esterilizado</label><select class="input" name="castrado">' +
      '<option value="">— Sin especificar —</option>' +
      '<option value="si"' + (dog.castrado === true ? ' selected' : '') + '>Sí</option>' +
      '<option value="no"' + (dog.castrado === false ? ' selected' : '') + '>No</option>' +
      '</select></div>' +
      '</div>' +
      '<div class="form-field photo-field">' +
      '<label>Foto</label>' +
      '<div class="photo-row">' +
      '<span class="avatar avatar-preview" id="dogPreview">' + (dog.foto ? '<img src="' + UI.esc(dog.foto) + '" alt="Foto">' : UI.icon('dog')) + '</span>' +
      '<div class="photo-actions">' +
      '<label class="btn btn-soft" for="dogFotoInput">' + UI.icon('upload') + ' Subir foto</label>' +
      '<input type="file" id="dogFotoInput" accept="image/*" hidden>' +
      '<button type="button" class="btn btn-soft" id="dogFotoRemove" ' + (dog.foto ? '' : 'hidden') + '>' + UI.icon('trash') + ' Quitar foto</button>' +
      '</div>' +
      '</div>' +
      '<p class="hint">La imagen se redimensiona a 800x800 píxeles (máximo) antes de guardarse.</p>' +
      '</div>' +
      '<div class="form-grid form-grid-2">' +
      '<div class="form-field"><label>Observaciones</label>' +
      '<textarea class="input" name="observaciones" rows="4" placeholder="Cuidados, alergias, instrucciones específicas...">' + UI.esc(dog.observaciones || '') + '</textarea></div>' +
      '<div class="form-field"><label>Notas de comportamiento</label>' +
      '<div class="note-editable input" id="txtNotas" contenteditable="true" data-placeholder="Se rellena automáticamente al marcar comportamientos de entre los listados abajo.">' + initialNotas + '</div>' +
      '<p class="hint"></p>' +
      '</div></div>' +
      '<fieldset class="fieldset">' +
      '<legend>Contactos humanos *</legend>' +
      '<p class="hint">Cada perro debe tener al menos un contacto humano (dueño, familiar, veterinario...). Un humano puede estar asociado a varios perros.</p>' +
      '<div id="contactList"></div>' +
      '<button type="button" class="btn btn-soft" id="addContact">' + UI.icon('plus') + ' Añadir contacto</button>' +
      '</fieldset>' +
      '<fieldset class="fieldset">' +
      '<legend>Comportamientos</legend>' +
      '<p class="hint">Marca los comportamientos observados; su descripción se añadirá automáticamente a las notas de comportamiento.</p>' +
      '<div class="behav-grid">' + comportamientos.map(function (g) {
        return '<div class="behav-col"><h4>' + UI.esc(g.titulo) + '</h4>' +
          g.items.map(function (item) {
            var checked = (dog.comportamientos || []).indexOf(item) !== -1;
            return '<label class="chk"><input type="checkbox" name="comportamiento" value="' + UI.esc(item) + '"' + (checked ? ' checked' : '') + '> ' + UI.esc(item) + '</label>';
          }).join('') +
          '</div>';
      }).join('') + '</div>' +
      '</fieldset>' +
      '<fieldset class="fieldset" id="medicacionBox">' +
      '<legend>' + UI.icon('clipboard') + ' Plan de medicación</legend>' +
      '<p class="hint">Notas de medicación o cuidados sanitarios del perro. En los servicios aparecerá una alerta mientras la fecha de expiración no haya vencido.</p>' +
      '<div class="form-grid form-grid-2">' +
      '<div class="form-field"><label>Notas</label><textarea class="input" name="notas_medicacion" rows="3" placeholder="p. ej. 1 comprimido cada 12 horas; administrar con comida; no mezclar con lácteos">' + UI.esc(dog.notas_medicacion || '') + '</textarea></div>' +
      '<div class="form-field"><label>Fecha de expiración del plan (opcional)</label><input type="date" class="input" name="medicacion_expira" value="' + UI.esc(dog.medicacion_expira || '') + '">' +
      '<p class="hint"></p></div>' +
      '</div>' +
      '</fieldset>' +
      '<div class="form-actions">' +
      (opts.showCancel === false ? '' :
        '<button type="button" class="btn" id="cancelDogForm">Cancelar</button>') +
      '<button type="submit" class="btn btn-primary">' + UI.icon('check') + ' Guardar perro</button>' +
      '</div>' +
      '</form>';

    var form = container.querySelector('.dog-form');
    var errBox = form.querySelector('.form-errors');
    var contactList = form.querySelector('#contactList');

    /* Checkbox de deceso: al marcar se pide la fecha; si hay fecha, queda marcado. */
    var chkDeceso = form.querySelector('[name="es_deceso"]');
    var fechaDeceso = form.querySelector('[name="fecha_deceso"]');
    function syncDeceso() {
      var on = chkDeceso.checked;
      fechaDeceso.disabled = !on;
      if (!on) fechaDeceso.value = '';
    }
    syncDeceso();
    chkDeceso.addEventListener('change', function () {
      syncDeceso();
    });
    fechaDeceso.addEventListener('input', function () {
      if (fechaDeceso.value) chkDeceso.checked = true;
      syncDeceso();
    });

    /* Crea el elemento DOM de una fila de contacto (sin re-renderizar la lista completa) */
    function rowEl(c, idx) {
      var wrap = document.createElement('div');
      wrap.innerHTML = contactRowHtml(c, idx).trim();
      return wrap.firstChild;
    }

    /* Añade una fila de contacto al listado */
    function addRow(c, idx) {
      var row = rowEl(c, idx);
      contactList.appendChild(row);
      row.querySelector('[data-rmc]').addEventListener('click', function () { row.remove(); });
      return row;
    }

    /* Muestra "Recomendado por" solo cuando el canal referido es "Boca a boca" */
    var bocaCh = bocaNombre();
    function syncRefBox(row) {
      var sel = row.querySelector('[data-ref-select]');
      var nameBox = row.querySelector('[data-ref-name]');
      if (!sel || !nameBox) return;
      var isBoca = bocaCh && sel.value === bocaCh;
      nameBox.hidden = !isBoca;
      if (!isBoca) nameBox.querySelector('[data-cf="referido_por"]').value = '';
    }

    /* Al cargar/editar, pinta una fila por contacto existente (solo id) */
    (dog.contact_ids || []).forEach(function (id, i) { addRow({ id: id }, i); });

    /* Al editar, carga los datos reales de cada contacto rellenando los campos vacíos.
       No re-renderiza la lista, así no se pierde lo escrito por el usuario. */
    if ((dog.contact_ids || []).length) {
      Promise.all((dog.contact_ids || []).map(function (id) {
        return Store.getContact(id).catch(function () { return undefined; });
      })).then(function (list) {
        var found = list.filter(Boolean);
        var rows = contactList.querySelectorAll('.contact-row');
        found.forEach(function (c, i) {
          var row = rows[i];
          if (!row) return;
          row.dataset.cid = c.id;
          row.querySelectorAll('[data-cf]').forEach(function (inp) {
            var v = c[inp.dataset.cf];
            if (v && inp.value === '') inp.value = v;
          });
          syncRefBox(row);
        });
      });
    }

    contactList.addEventListener('change', function (e) {
      var s = e.target.closest('[data-ref-select]');
      if (!s) return;
      syncRefBox(s.closest('.contact-row'));
    });

    form.querySelector('#addContact').addEventListener('click', function () {
      addRow({}, contactList.querySelectorAll('.contact-row').length);
    });

    var fotoInput = form.querySelector('#dogFotoInput');
    fotoInput.addEventListener('change', function () {
      var f = fotoInput.files[0];
      if (!f) return;
      UI.readImageResized(f, 800).then(function (dataUrl) {
        dog.foto = dataUrl;
        var prev = form.querySelector('#dogPreview');
        prev.innerHTML = '<img src="' + UI.esc(dataUrl) + '" alt="Foto">';
        form.querySelector('#dogFotoRemove').hidden = false;
        UI.toast('Foto actualizada', 'success');
      }).catch(function (err) {
        UI.toast(err.message, 'error');
      });
    });
    form.querySelector('#dogFotoRemove').addEventListener('click', function () {
      dog.foto = null;
      form.querySelector('#dogPreview').innerHTML = UI.icon('dog');
      this.hidden = true;
      fotoInput.value = '';
    });

    var behavBox = form.querySelector('.behav-grid');
    var txtNotas = form.querySelector('#txtNotas');
    function checkedBehaviors() {
      var list = [];
      behavBox.querySelectorAll('input[name="comportamiento"]:checked').forEach(function (cb) { list.push(cb.value); });
      return list;
    }
    behavBox.addEventListener('change', function () {
      txtNotas.innerHTML = notasHtml(checkedBehaviors());
    });

    function showErrors(errs) {
      if (!errs.length) { errBox.hidden = true; return; }
      errBox.innerHTML = '<strong>Revisa el formulario:</strong><ul>' + errs.map(function (e) { return '<li>' + UI.esc(e.msg) + '</li>'; }).join('') + '</ul>';
      errBox.hidden = false;
      var first = errs[0].field;
      var el0 = form.querySelector('[name="' + first + '"]') || form.querySelector('[data-cf="' + first + '"]');
      if (el0) el0.focus();
    }

    function collect() {
      var d = {
        id: dog.id,
        contact_ids: (dog.contact_ids || []).slice(),
        nombre: form.querySelector('[name="nombre"]').value.trim(),
        fecha_nacimiento: form.querySelector('[name="fecha_nacimiento"]').value || null,
        fecha_deceso: form.querySelector('[name="fecha_deceso"]').value || null,
        es_deceso: form.querySelector('[name="es_deceso"]').checked,
        raza: (form.querySelector('[name="raza"]').value || '').trim() || null,
        tamano: form.querySelector('[name="tamano"]').value || null,
        sexo: form.querySelector('[name="sexo"]').value || null,
        castrado: (function () {
          var v = form.querySelector('[name="castrado"]').value;
          return v === 'si' ? true : (v === 'no' ? false : null);
        })(),
        observaciones: (form.querySelector('[name="observaciones"]').value || '').trim() || null,
        notas_medicacion: (form.querySelector('[name="notas_medicacion"]').value || '').trim() || null,
        medicacion_expira: form.querySelector('[name="medicacion_expira"]').value || null,
        comportamientos: checkedBehaviors().length ? checkedBehaviors() : null,
        notas: (txtNotas.innerHTML || '').trim() || null,
        foto: dog.foto || null,
        activo: dog.activo !== false
      };
      var finalContacts = [];
      contactList.querySelectorAll('.contact-row').forEach(function (row) {
        var c = {};
        if (row.dataset.cid) c.id = row.dataset.cid;
        row.querySelectorAll('[data-cf]').forEach(function (inp) { c[inp.dataset.cf] = inp.value.trim(); });
        var hasAny = Object.keys(c).some(function (k) { return k !== 'id' && c[k] !== ''; });
        if (hasAny) finalContacts.push(c);
      });
      return { dog: d, contacts: finalContacts };
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = collect();
      var dog = data.dog;
      var errs = [];
      if (!data.contacts.length) {
        errs.push({ field: 'contact_ids', msg: 'Debe indicar al menos un contacto humano.' });
      }
      /* El perro aún no tiene contact_ids asignados: se validan los contactos del formulario */
      var dogForValidation = Object.assign({}, dog, { contact_ids: data.contacts.length ? ['__pendiente__'] : [] });
      errs = errs.concat(C.validateDog(dogForValidation));
      data.contacts.forEach(function (c) {
        errs = errs.concat(C.validateContact(c));
      });
      if (errs.length) { showErrors(errs); return; }
      if (opts.beforeSave) opts.beforeSave();
      Store.saveDogWithContacts(dog, data.contacts).then(function (saved) {
        UI.toast('Perro guardado correctamente', 'success');
        if (opts.onSave) opts.onSave(saved);
      }).catch(function (err) {
        UI.toast('Error al guardar: ' + err.message, 'error');
      });
    });

    var cancelBtn = form.querySelector('#cancelDogForm');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      if (opts.onCancel) opts.onCancel();
    });
  }

  root.DogForm = { render: render };
})(typeof window !== 'undefined' ? window : globalThis);
