/* Cuidador Canino - Plantillas de texto predefinidas */
(function (root) {
  'use strict';

  var DEFAULT_TEMPLATES = [
    {
      id: 't_bienvenida',
      nombre: 'Mensaje de bienvenida',
      orden: 1,
      contenido: [
        'Hola {nombre_contacto},',
        '',
        '¡Gracias por confiar en Cuidador Canino! A partir de ahora cuidaremos de {nombre_perro} con todo el cariño y la atención que se merece.',
        '',
        'Quedo atento/a para cualquier consulta. Un saludo.'
      ].join('\n')
    },
    {
      id: 't_recordatorio_paseo',
      nombre: 'Recordatorio de paseo',
      orden: 2,
      contenido: [
        'Hola {nombre_contacto},',
        '',
        'Le recuerdo que {nombre_perro} tiene un servicio de paseo previsto del {fecha_inicio} al {fecha_fin}.',
        'El importe acordado es de {coste_total}.',
        '',
        'Cualquier cambio, me avisan. Un saludo.'
      ].join('\n')
    },
    {
      id: 't_aviso_cancelacion',
      nombre: 'Aviso de cancelación',
      orden: 3,
      contenido: [
        'Hola {nombre_contacto},',
        '',
        'Lamentablemente tengo que cancelar el servicio de {nombre_perro} previsto para el {fecha_inicio}.',
        'Pido disculpas por las molestias y buscaremos una solución alternativa lo antes posible.',
        '',
        'Un saludo.'
      ].join('\n')
    },
    {
      id: 't_confirmacion_reserva',
      nombre: 'Confirmación de reserva',
      orden: 4,
      contenido: [
        'Hola {nombre_contacto},',
        '',
        'Su reserva para {nombre_perro} queda confirmada:',
        '- Tipo de servicio: {tipo}',
        '- Fechas: del {fecha_inicio} al {fecha_fin}',
        '- Presupuesto: {coste_total}',
        '- Pendiente: {pendiente}',
        '',
        'En cuanto tenga cualquier novedad se la comunico. Un saludo.'
      ].join('\n')
    },
    {
      id: 't_recordatorio_hospedaje',
      nombre: 'Recordatorio de hospedaje',
      orden: 5,
      contenido: [
        'Hola {nombre_contacto},',
        '',
        '{nombre_perro} estará alojado con nosotros del {fecha_inicio} al {fecha_fin}.',
        'Le iré enviando novedades sobre cómo se encuentra.',
        '',
        'Un saludo.'
      ].join('\n')
    }
  ];

  root.TemplateData = {
    DEFAULT_TEMPLATES: DEFAULT_TEMPLATES,
    /* Variables soportadas para sustitución (contexto opcional) */
    VARIABLES: [
      { token: '{nombre_perro}', desc: 'Nombre del perro' },
      { token: '{nombre_contacto}', desc: 'Nombre del contacto' },
      { token: '{fecha_inicio}', desc: 'Fecha de inicio del servicio' },
      { token: '{fecha_fin}', desc: 'Fecha de fin del servicio' },
      { token: '{tipo}', desc: 'Tipo de servicio (Hospedaje/Paseo)' },
      { token: '{coste_total}', desc: 'Total del servicio (subtotal + plus)' },
      { token: '{pendiente}', desc: 'Importe pendiente (total menos señal), en €' },
      { token: '{notas}', desc: 'Notas internas del servicio' },
      { token: '{manana_o_el}', desc: '"mañana" si el servicio empieza mañana, "el" en caso contrario' },
      { token: '{estado}', desc: 'Estado del servicio' }
    ],
    replaceVars: function (content, ctx) {
      if (!ctx) return content;
      var map = {
        '{nombre_perro}': ctx.nombre_perro || '{nombre_perro}',
        '{nombre_contacto}': ctx.nombre_contacto || '{nombre_contacto}',
        '{fecha_inicio}': ctx.fecha_inicio || '{fecha_inicio}',
        '{fecha_fin}': ctx.fecha_fin || '{fecha_fin}',
        '{tipo}': ctx.tipo || '{tipo}',
        '{coste_total}': ctx.coste_total || '{coste_total}',
        '{pendiente}': ctx.pendiente || '{pendiente}',
        '{notas}': ctx.notas != null ? ctx.notas : '{notas}',
        '{manana_o_el}': ctx.manana_o_el || '{manana_o_el}',
        '{estado}': ctx.estado || '{estado}'
      };
      var str = String(content || '');
      str = str.replace(/\{([^{}]*\|[^{}]*)\}/g, function (m, inner) {
        var parts = inner.split('|');
        var g = (ctx.genero || 'm');
        var n = parts.length;
        var idx = 0;
        if (n >= 4) {
          var tbl = { m: 0, f: 1, pm: 2, pf: 3 };
          idx = tbl[g] !== undefined ? tbl[g] : 0;
        } else if (n === 3) {
          if (g === 'f') idx = 1;
          else if (g === 'm') idx = 0;
          else idx = 2;
        } else if (n === 2) {
          idx = (g === 'f' || g === 'pf') ? 1 : 0;
        }
        if (idx >= n) idx = n - 1;
        return parts[idx];
      });
      return str.replace(/\{(nombre_perro|nombre_contacto|fecha_inicio|fecha_fin|tipo|coste_total|pendiente|notas|manana_o_el|estado)\}/g,
        function (m) { return map[m]; });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
