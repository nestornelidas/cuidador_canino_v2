/* Cuidador Canino - Vista Perros */
(function (root) {
  'use strict';
  var C = root.Calc, UI = root.UI, Store = root.Store;

  function buildList(container, ctx) {
    var html = '';
    html += '<div class="view-head"><h1>Perros</h1><div class="view-actions">' +
      '<button class="btn btn-primary" id="nuevoPerro">' + UI.icon('plus') + ' Nuevo perro</button>' +
      '</div></div>';
    html += '<div class="card">';
    html += '<div class="table-tools">' +
      '<div class="searchbox">' + UI.icon('search') + '<input type="text" id="buscaPerro" class="input" placeholder="Buscar por nombre..."></div>' +
      '<span class="muted" id="dogCount"></span>' +
      '</div>';
    html += '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th></th><th data-sort="nombre" class="sortable">Nombre</th><th data-sort="raza" class="sortable">Raza</th><th data-sort="sexo" class="sortable">Sexo</th><th data-sort="tamano" class="sortable">Tamaño</th><th data-sort="castrado" class="sortable">Castrado</th><th data-sort="nacimiento" class="sortable">Nacimiento</th><th data-sort="edad" class="sortable">Edad</th><th data-sort="deceso" class="sortable">Deceso</th>' +
      '<th data-sort="ultimo" class="sortable">Últ. servicio</th><th class="ta-r">Acciones</th>' +
      '</tr></thead><tbody id="dogTbody"></tbody></table></div>';
    html += '</div>';
    container.innerHTML = html;

    document.getElementById('nuevoPerro').addEventListener('click', function () { ctx.go('perros/nuevo'); });
    container.querySelectorAll('th.sortable').forEach(function(th){
      th.style.cursor='pointer';
      th.addEventListener('click', function(){
        var k=th.dataset.sort;
        if(sortKey===k) sortDir = sortDir==='asc'?'desc':'asc';
        else { sortKey=k; sortDir = (k==='edad'?'desc':'asc'); }
        container.querySelectorAll('th.sortable').forEach(function(h){ h.classList.remove('sorted-asc','sorted-desc'); });
        th.classList.add(sortDir==='asc'?'sorted-asc':'sorted-desc');
        paint();
      });
    });

    var input = document.getElementById('buscaPerro');
    input.addEventListener('input', function () { paint(); });

    var sortKey='nombre', sortDir='asc';
    async function paint() {
      var [services, dogs] = await Promise.all([Store.listServices(), Store.listDogs({ includeInactive: false })]);
      var q = input.value.trim().toLowerCase();
      var byDog = {};
      services.forEach(function (s) {
        (s.dog_ids || []).forEach(function (id) {
          if (!byDog[id]) byDog[id] = [];
          byDog[id].push(s);
        });
      });
      var rows = [];
      dogs.forEach(function (d) {
        if (q && !d.nombre.toLowerCase().includes(q)) return;
        var list = (byDog[d.id] || []).filter(function (s) { return s.estado !== 'cancelado'; });
        var last = null;
        list.forEach(function (s) {
          if (!last || s.desde > last.desde || (s.desde === last.desde && s.hasta > last.hasta)) last = s;
        });
        rows.push({
          d: d,
          last: last,
          hasService: (byDog[d.id] || []).length > 0
        });
      });

      rows.sort(function(a,b){
        var dir = sortDir==='asc'?1:-1;
        function cmpText(x,y){ return String(x||'').localeCompare(String(y||''),'es') * dir; }
        if(sortKey==='nombre') return cmpText(a.d.nombre, b.d.nombre);
        if(sortKey==='raza') return cmpText(a.d.raza, b.d.raza);
        if(sortKey==='sexo') return cmpText(a.d.sexo, b.d.sexo);
        if(sortKey==='tamano') return cmpText(a.d.tamano, b.d.tamano);
        if(sortKey==='castrado') return cmpText(String(a.d.castrado), String(b.d.castrado));
        if(sortKey==='nacimiento') return cmpText(a.d.fecha_nacimiento||'', b.d.fecha_nacimiento||'');
        if(sortKey==='deceso') return cmpText(a.d.fecha_deceso|| (a.d.es_deceso?'1':''), b.d.fecha_deceso|| (b.d.es_deceso?'1':''));
        if(sortKey==='ultimo') return cmpText(a.last?a.last.desde:'', b.last?b.last.desde:'');
        if(sortKey==='edad'){
          var ea=C.ageParts(a.d.fecha_nacimiento, a.d.fecha_deceso||null); var eb=C.ageParts(b.d.fecha_nacimiento, b.d.fecha_deceso||null);
          var ma=(ea?ea.y*12+ea.m: -1), mb=(eb?eb.y*12+eb.m: -1);
          if(ma===mb) return 0;
          return (ma>mb? -1:1) * (sortDir==='asc'? -1:1);
        }
        return 0;
      });
      document.getElementById('dogCount').textContent = rows.length + ' perros';
      var tbody = document.getElementById('dogTbody');
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="11" class="empty-cell">No hay perros registrados' + (q ? ' que coincidan con la búsqueda.' : '.') + '</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(function (r) {
        var d = r.d;
        var death = d.fecha_deceso ? C.fmtDMY(d.fecha_deceso) : (d.es_deceso ? 'Sí' : '—');
        var age = d.fecha_nacimiento ? C.ageText(d.fecha_nacimiento, null, d.fecha_deceso) : '—';
        return '<tr class="dog-row" data-id="' + d.id + '">' +
          '<td>' + UI.avatarHtml(d, 64) + '</td>' +
          '<td><strong>' + UI.esc(d.nombre) + '</strong></td>' +
          '<td>' + (d.raza ? UI.esc(d.raza) : '—') + '</td>' +
          '<td>' + (d.sexo ? (d.sexo === 'hembra' ? 'Hembra' : 'Macho') : '—') + '</td>' +
          '<td>' + (d.tamano ? UI.esc(d.tamano) : '—') + '</td>' +
          '<td>' + (d.castrado === true ? 'Sí' : (d.castrado === false ? 'No' : '—')) + '</td>' +
          '<td>' + (d.fecha_nacimiento ? C.fmtDMY(d.fecha_nacimiento) : '—') + '</td>' +
          '<td>' + UI.esc(age) + '</td>' +
          '<td>' + UI.esc(death) + '</td>' +
          '<td>' + (r.last ? C.fmtDMY(r.last.desde) : '—') + '</td>' +
          '<td class="ta-r"><div class="row-actions">' +
          '<button class="icon-btn" data-act="edit" data-id="' + d.id + '" title="Editar">' + UI.icon('pencil') + '</button>' +
          '<button class="icon-btn btn-danger-soft" data-act="baja" data-id="' + d.id + '" title="Dar de baja">' + UI.icon('logout') + '</button>' +
          '</div></td></tr>';
      }).join('');

      tbody.querySelectorAll('.dog-row').forEach(function (tr) {
        tr.addEventListener('click', function (e) {
          if (e.target.closest('[data-act]')) return;
          ctx.go('perros/edit/' + tr.dataset.id);
        });
      });
      tbody.querySelectorAll('[data-act="edit"]').forEach(function (b) {
        b.addEventListener('click', function () { ctx.go('perros/edit/' + b.dataset.id); });
      });
      tbody.querySelectorAll('[data-act="baja"]').forEach(function (b) {
        b.addEventListener('click', function () { bajaFlow(b.dataset.id); });
      });
    }
    paint();
  }

  /* Baja de perro - Opción D */
  async function bajaFlow(dogId) {
    var dog = await Store.getDog(dogId);
    if (!dog) return;
    var hasServices = await Store.dogHasServices(dogId);

    if (!hasServices) {
      var ok = await UI.confirmTypeDialog({
        title: 'Dar de baja a ' + dog.nombre,
        message: 'Este perro no tiene servicios asociados. Se eliminará de forma definitiva de la base de datos.',
        word: 'borrar',
        confirmText: 'Eliminar definitivamente'
      });
      if (!ok) return;
      await Store.deleteDogContactsIfUnused(dog);
      await Store.deleteDogPhysical(dogId);
      UI.toast('Perro eliminado definitivamente', 'success');
      App.refresh();
      return;
    }

    /* Con servicios: tres opciones */
    var m = UI.modal({
      title: 'Dar de baja a ' + dog.nombre,
      body: '<p>Este perro tiene servicios asociados. Elige cómo proceder:</p>' +
        '<ul><li><strong>Borrado físico en cascada:</strong> elimina el perro y todos sus servicios históricos.</li>' +
        '<li><strong>Borrado lógico:</strong> el perro desaparece de los listados pero se conserva en la base de datos para estadísticas.</li>' +
        '<li><strong>Cancelar:</strong> no realiza ningún cambio.</li></ul>',
      footer: '' +
        '<button type="button" class="btn" data-opt="cancel">Cancelar</button>' +
        '<button type="button" class="btn" data-opt="logical">Borrado lógico</button>' +
        '<button type="button" class="btn btn-danger" data-opt="cascade">Borrado físico en cascada</button>'
    });

    m.el.querySelector('[data-opt="cancel"]').addEventListener('click', function () { m.close(); });

    m.el.querySelector('[data-opt="logical"]').addEventListener('click', async function () {
      var ok = await UI.confirmTypeDialog({
        title: 'Borrado lógico de ' + dog.nombre,
        message: 'El perro quedará marcado como inactivo (desaparece de los listados, se conserva en la base de datos).',
        word: 'borrar',
        confirmText: 'Confirmar borrado lógico'
      });
      if (!ok) { m.close(); return; }
      dog.activo = false;
      await Store.saveDog(dog);
      m.close();
      UI.toast('Perro dado de baja (borrado lógico)', 'success');
      App.refresh();
    });

    m.el.querySelector('[data-opt="cascade"]').addEventListener('click', async function () {
      var ok = await UI.confirmTypeDialog({
        title: 'Borrado en cascada de ' + dog.nombre,
        message: 'Se eliminarán el perro y TODOS sus servicios históricos. Esta acción no se puede deshacer.',
        word: 'borrar',
        confirmText: 'Eliminar en cascada'
      });
      if (!ok) { m.close(); return; }
      await Store.cascadeDeleteDog(dogId);
      await Store.deleteDogContactsIfUnused(dog);
      m.close();
      UI.toast('Perro y sus servicios eliminados', 'success');
      App.refresh();
    });
  }

  async function render(container, params, ctx) {
    var mode = params[0] || 'list';

    if (mode === 'list') {
      buildList(container, ctx);
      return;
    }

    var title = 'Nuevo perro';
    var dog = null;
    if (params[1]) {
      dog = await Store.getDog(params[1]);
      if (!dog) { UI.toast('Perro no encontrado', 'error'); ctx.go('perros'); return; }
      title = 'Editar perro';
    }

    var html = '<div class="view-head"><h1>' + title + '</h1><div class="view-actions">' +
      '<button class="btn" id="backDogs">' + UI.icon('back') + ' Volver</button>' +
      '</div></div><div class="card form-card"><div id="dogFormRoot"></div></div>';
    container.innerHTML = html;
    document.getElementById('backDogs').addEventListener('click', function () { ctx.go('perros'); });

    DogForm.render(document.getElementById('dogFormRoot'), dog, {
      showCancel: false,
      onSave: function () { ctx.go('perros'); }
    });
  }

  root.Views = root.Views || {};
  root.Views.perros = { title: 'Perros', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
