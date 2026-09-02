CUIDADOR CANINO - README
========================
Aplicacion web 100% offline (HTML + CSS + JavaScript ES6+ vanilla, sin frameworks ni backend) para la gestion integral de un negocio de cuidado de perros (hospedaje, paseos y guarderia). SPA con router por hash, persistencia en IndexedDB (perros, contactos, servicios, eventos, plantillas) y localStorage (configuracion). PWA con manifest.webmanifest + sw.js. Servir por http://localhost (no file://) por Web Crypto.

REQUISITOS Y ARRANQUE
---------------------
- Navegador moderno (Chrome/Edge/Firefox/Safari).
- Servir estatico: npx serve .  o  python -m http.server 8000  -> http://localhost:8000/index.html
- Base vacia al inicio + 5 plantillas precargadas. Datos de ejemplo: Configuracion > Datos > Cargar datos de ejemplo (5 contactos, 5 perros, 11 servicios diciembre 2026, 2 eventos 07/12 y 14/12).
- Puerta de acceso (gate.js): contrasena maestra obligatoria. Derivacion PBKDF2 + AES-GCM, salt por sesion, verify cifrado. Lock borra clave de memoria. Migracion FIELDS_VERSION=4 re-cifra al desbloquear si se amplia catalogo.

ESTRUCTURA
----------
app/index.html, css/style.css, js/app.js (router), js/calc.js (fechas/costes/validacion), js/db.js (IndexedDB v1), js/store.js (reglas), js/crypto.js, js/templates.js, js/ui.js, js/dogForm.js, js/gate.js, js/views/{dashboard,services,dogs,calendar,reports,plantillas,settings}.js, tests/suite.js + tests/run-browser.js (Edge), tests/calc.test.js

VISTAS Y RUTAS
--------------
#/                          Dashboard
#/perros  #/perros/nuevo  #/perros/edit/:id
#/servicios  #/servicios/nuevo  #/servicios/edit/:id  #/servicios/list
#/calendario  #/calendario/evento/:id (ruta profunda abre modal)
#/informes
#/plantillas
#/configuracion

1) DASHBOARD (#/)
----------------
- Hospedajes activos hoy / Paseos programados hoy / Proximos servicios / Eventos de hoy.
- Botones "Nuevo servicio" -> #/servicios/nuevo y "Nuevo evento" -> openEventModal(null, ctx) (ctx.go/ctx.refresh).
- Chips de evento clicables a su edicion; mensaje "sin eventos" si no hay.

2) PERROS (#/perros)
--------------------
- Tabla: Foto 40px, Nombre, Raza, Sexo (Macho/Hembra/—), Tamano, Castrado, Edad (C.ageText), acciones. Perros inactivos con badge, fallecidos y RED FLAG filtrables. Click fila -> edicion.
- Formulario dogForm.js (reutilizable desde Servicios > Nuevo perro):
  - Datos: Nombre*, Raza, Tamano, Sexo (macho/hembra), Fecha nacimiento, Castrado, Foto (readImageResized 800px jpeg 0.85, base64).
  - Deceso: checkbox "Fallecido" + fecha_deceso opcional; es_deceso puede ser true sin fecha. Config ocultarDecesos filtra listados.
  - Contactos humanos *: lista dinamica de filas (Nombre, Telefono, Whatsapp, Telegram, Otros). Select Referido (canal) desde config.captacion + campo "Recomendado por" (referido_por) solo visible con "Boca a boca" (se limpia al cambiar). Unicidad: telefono/whatsapp/telegram normalizados (solo digitos / @/minusculas) son claves unicas; sin telefono se fusiona por nombre. Contacto compartido entre varios perros (mismo id). cleanOrphanContacts y dedupeContacts.
  - Comportamientos: 48 checkboxes en 4 categorias (A personas / Con otros perros / En casa / Durante los paseos) desde config.comportamientos (editable, ordenable, renombrable). Notas de comportamiento agrupadas por categoria en negrita y auto-cumplimentadas.
  - Observaciones (textarea) y Plan de medicacion: recuadro con Notas (textarea notas_medicacion) + Fecha expiracion (medicacion_expira, en claro). Ya no pide Tipo/Dosis/Frecuencia en perro (simplificado).
  - Guardado: Store.saveDogWithContacts -> saveDog + saveContact por fila (dedupe transparente). Id contacto se conserva al reeditar. Sin duplicados tras 3 guardados.

3) SERVICIOS (#/servicios)
---------------------------
- Lista (#/servicios/list): 11 filas seed, columnas Subtotal (=coste_total) y Total (=coste_total+plus) sin negrita, columna Base retirada, Pendiente 0 si finalizado.
- Formulario (#/servicios/nuevo y edit/:id):
  - Tipo: Hospedaje / Paseo. Buscador #buscaPerroSvc filtra chips (avatar 48px + nombre).
  - Fechas: desde / hasta (validacion inicio>fin). Coste base (por defecto config.costeHospedaje=20 / costePaseo=12).
  - Calculo automatico Opcion B: coste_total auto = dias*costeBase*numPerros (hospedaje) o (minDesplazamiento+minPaseo)/60*costeBase por paseo (paseo). Manual (999) se respeta hasta cambiar fecha/tipo. Al cambiar fecha vuelve a auto (100). Senal prevista 20% (5 dias). Al cambiar tipo se respeta coste_base manual si no coincide con default anterior.
  - Paseos: recuadro con tabla (Desplazamiento, Paseo, Nº paseos, Total) + boton Anadir paseo. Fila por defecto. Subtotal = suma por paseo. Total = subtotal+plus. plus y paga_senal con pendiente en vivo. Persistencia: subtotal guardado como coste_total, plus aparte; al editar se recargan filas y se recalcula subtotal.
  - Calculo importe: recuadro con Coste, Total, Estado (pendiente/confirmado/en_curso/finalizado/cancelado) por encima de Alertas; en paseos se oculta subtotal duplicado.
  - Alertas medicacion: #alertasBox debajo de importe. Por cada perro seleccionado con plan activo (notas_medicacion o medicacion_expira y no vencido) muestra nombre clicable (#/perros/edit/ID) + bloque con Notas y Expira el (DD/MM/AAAA) resaltados. Mensaje si ninguno, un bloque por perro, visible en hospedaje y paseos, en paralelo con Comunicaciones (#alertasBox y #commsBox misma fila).
  - Alarmas (cuidador): #alarmaBox antes de comunicaciones, solo Hora (09:00 por defecto) + enlace "Abrir evento en Google Calendar" (target _blank). URL: https://calendar.google.com/calendar/render?action=TEMPLATE&text=Tipo: Nombres&dates=YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS&details=Evento de servicio...Tipo/Perros/[Notas internas]/Desde/Hasta/Total. Notas internas entre Perros y Desde solo si hay. Sin fechas/perros/hora el enlace disabled+aria-disabled. Se refresca al escribir notas.
  - Comunicaciones automaticas: #btnComms. Requiere >=1 perro y contacto comun (Store.commonContactsForDogs). Modal por contacto (avatar, chips telefono/whatsapp/telegram/otros) con select plantilla (5) + textarea + botones Copiar, WhatsApp (wa.me/<digitos>?text=encodeURIComponent), Telegram (t.me/<user>?text=), Grupo/otro (wa.me/?text=). Vista previa via TemplateData.replaceVars con contexto del servicio. Regla nombres: C.joinNombres con "y"/"e" segun inicial del ultimo (Loki y Kira, Loki e Iris).
  - Validaciones: fecha fin<inicio, coste_base negativo, paseo sin minutos, evento sin hora (cuando "A una hora").
  - Guardado: Store.saveService con coste_total, plus, paga_senal, estado, notas, paseos[], etc. Notas cifradas.

4) CALENDARIO (#/calendario)
-----------------------------
- Toolbar: prev/today/next, titulo mes largo ES, leyenda 6 colores (pendiente #e63946, confirmado, en_curso, finalizado, cancelado #4b5563, evento #f5c518).
- Grilla semanas L-D (C.monthGrid). Cabecera L M X J V S D. Celda 84px, daynum absolute, .cal-cell-out gris.
- Barras: .cal-week relative, .cal-bars absolute top 26px z-index1, .cal-bar absolute height20 gap3. Algoritmo greedy por carriles (lanes) compartido entre servicios y eventos: servicios primero (orden desde/hasta), luego eventos (orden fecha/hora/descripcion) apilados en carril libre -> nunca se solapan. Eventos son barras de 1 dia con data-tipo="evento" fondo eventoColor, texto #1f2937, sin padding 26px. BarH = lanes*(20+3), cellMin = max(90, barH+36). 15 barras servicio por semana (S4 3 semanas etc) + 2 eventos = 17 en diciembre 2026.
- Celdas solo muestran daynum (chips eliminados). Click barra servicio -> #/servicios/edit/:id, click barra evento -> openEventModal(ev, ctx).
- Nuevo servicio / Nuevo evento botones. Modal evento: Fecha*, Cuando (Todo el dia / A una hora), Hora (si no todo dia), Descripcion*, enlace Google Calendar (formato todo dia YYYYMMDD/YYYYMMDD o con hora YYYYMMDDTHHMMSS, details con Todo el dia/Hora+Fecha+Descripcion), validar fecha/hora/descripcion, Guardar (Store.saveEvent), Borrar si existe, ctx.refresh.

5) INFORMES (#/informes)
------------------------
- Filtro ano #repYear (Todos + anos con servicios). Nota cancelados excluidos de importes. Ordenable por header (numeros desc, texto asc, toggle).
- Rendimiento por ano: tabla Ano, Redito, Media mensual (solo meses transcurridos si ano actual), Nº servicios, Media por servicio, ▲▼ FACTURACION (variacion interanual (gVar)), Ocupacion (dias distintos con servicio /365/366 % - gOcup), % Fallecidos y % Red flag (prorrateado por perro, fallecidos cuentan si fecha_deceso en ano o ano siguiente, gDead/gRf/gRed). Fila TOTAL. gVar = (reditoN-reditoPrev)/reditoPrev*100.
- Evolucion mensual: canvas #lineCanvas 900x320 con dos ejes: Y (Dias con servicios / Reditos prorrateados por dia) y X (Meses / Anos). X: #lineX con Meses y Anos; Y: #lineY. Labels por mes o por ano. Datos mensuales: dayM[12] y redArr[12] prorrateado por span; datos anuales: yearDayM/yearRed prorrateados filtrando por fY. dataset.dias/redito/years expuesto. Pintado con drawLineChart(canvas, series, isMoney, labels) + niceStep, grid 4 divisiones, puntos y valores.
- Perros cuidados: tabla con avatar, Nombre, Fecha nacimiento, Edad (meses para sort numeric), Importe acumulado (prorrateado por numPerros). Sort Edad numerico. Badge count #dogsCount = perros distintos con servicio finalizado/en_curso en periodo.
- Distribucion por sexo: pie #sexPie/#sexLegend (Hembra #ec4899, Macho #2563eb, Sin especificar #94a3b8) + bloque #sexSin con perros sin sexo clicables -> #/perros/edit.
- Canal de captacion: pie #captPie/#captLegend (palette 8 colores) por contacto con referido en periodo + bloque #captSin con perros sin canal clicables + bloque #captPorCanal con selector #captCanalSel (todos los canales de config.captacion) y lista #captCanalList de perros por canal en periodo (por perro un canal una vez, ordenados alfabeticamente, badge link). Respeta filtro ano.
- Imprimir: boton window.print, print-area.

6) PLANTILLAS (#/plantillas)
----------------------------
- 5 por defecto (t_bienvenida, t_recordatorio_paseo, t_aviso_cancelacion, t_confirmacion_reserva con Presupuesto + Pendiente, t_recordatorio_hospedaje) en js/templates.js. CRUD Store.listTemplates/saveTemplate/deleteTemplate.
- Grid cards con Ver/Copiar/Editar. Editor modal: Nombre*, Contenido (textarea 10 rows) + Variables disponibles como chip-btn (click inserta token en cursor). Hint documenta variables y sintaxis condicional.
- Variables (TemplateData.VARIABLES + replaceVars):
  {nombre_perro} (C.joinNombres), {nombre_contacto}, {fecha_inicio} (DD/MM/AAAA), {fecha_fin}, {tipo}, {coste_total} (C.fmtMoney total), {pendiente} (C.fmtMoney pendiente), {notas} (notas internas servicio), {manana_o_el} ("mañana" si desde==manana ISO else "el"), {estado} + genero interno.
  Token condicional: {a|b} (masc|fem), {a|b|c} (masc|fem|plural), {a|b|c|d} (masc|fem|plural mixto/masc|plural fem) resuelto por ctx.genero (m/f/pm/pf) calculado de sexo de perros seleccionados (todos hembras -> pf, mixto/todos machos -> pm, 1 hembra -> f else m). Ej: {Estimado|Estimada|Estimados|Estimadas}, {alojado|alojada|alojados|alojadas}. Combinable con variables. Emoticonos/Unicode soportados.
- Uso: desde Servicios > Generar, el select carga plantillas y fillCard hace replaceVars con serviceCtx (lee desde/hasta/tipo/coste_total/plus/paga_senal/estado/notas y genero). Copiar via UI.copyText, enviar via wa.me/t.me con encodeURIComponent.

7) CONFIGURACION (#/configuracion)
----------------------------------
- Costes base: costeHospedaje / costePaseo editables.
- Preferencias: ocultarDecesos, ocultarRedFlag (checkboxes, Store.getConfig/setConfig).
- Colores calendario: 6 inputs color para pendiente/confirmado/en_curso/finalizado/cancelado/evento.
- Empresa y logo: nombre + upload imagen redimensionada.
- Google Calendar: campos google.*
- Datos: Exportar (JSON con contactos/perros/servicios/eventos/plantillas/config + cifrado.salt, todo cifrado con prefijo enc:), Importar (reemplazo atomico DB.loadAll clear+insert, requiere contrasena original, rechaza formato invalido), Borrar todos, Cargar datos de ejemplo, Tamano BBDD (Store.dbSize bytes/KB), Wipe.
- Seguridad: Cambiar contrasena maestra (re-cifra todos los campos via Crypto.derive), Cerrar sesion (lock).
- Comportamientos: 4 categorias con items ordenables alfabeticamente, mover categoria/item, subir/bajar, borrar, anadir categoria/comportamiento, renombrar con confirmacion, persistir. DogForm usa config actual.
- Canales de captacion: lista editable (id/nombre) con anadir/borrar/guardar/reset a defaultCaptacion (Wallapop/Holidog/TopAyuda/Captacion directa/Boca a boca).

8) SEGURIDAD Y CIFRADO (js/crypto.js)
--------------------------------------
- Web Crypto API AES-GCM. FIELDS_VERSION=4. Campos cifrados: contact: nombre, telefono, telegram, whatsapp, otros, referido_por (+hash_busqueda SHA256 nombre lower), dog: observaciones, notas, notas_medicacion (medicacion_expira en claro, nombre/raza/tamano/sexo en claro), service: notas, medicacion, dosis, frecuencia, notas_medicacion (desde/hasta/tipo/costes en claro), event: descripcion (fecha/hora en claro). Prefijo "enc:" en storage. Store.save* cifra, list*/get* descifra. Export cifra, import descifra con clave de sesion. Cambio de contrasena re-cifra todo y antigua deja de funcionar. Lock elimina clave de memoria. Gate.boot bloquea arranque hasta clave en memoria, contexto no seguro file:// avisa.

9) CONTACTOS Y DEDUPE
---------------------
- Normalizacion: telefono/whatsapp solo digitos (quitar +34/espacios), telegram sin @ y lower, nombre lower trim. Mismo telefono/whatsapp/telegram -> reutiliza contacto existente (no duplicado). Perro con 2 contactos mismo telefono -> 1 id. Sin telefono fusiona por nombre. dedupeContacts limpia duplicados previos y reasigna perros.

10) OTROS
--------
- Calculos (js/calc.js): diffDaysInclusive, addDaysISO, parseISO, daysInMonth, monthGrid L-D, ageParts/ageText, calcServiceTotal, calcTotalSvc (coste_total+plus), calcPendiente (coste_total+plus-paga_senal), calcPendienteSvc (0 si finalizado), joinNombres, fmtMoney (es-ES), fmtDMY, fmtNum, pad, etc. Independiente de DOM testeable en Node.
- UI (js/ui.js): icon() SVG 24px, esc(), toast(), modal() con overlay, confirmDialog/confirmTypeDialog, readImageResized(canvas), downloadFile, copyText(clipboard/writeText fallback), el(), avatarHtml().
- Tests (tests/suite.js ~1500 lineas, 14 fases): planificador diciembre, auditor, persistencia, cascada, export/import, destructivo UI, recalculos, paseos, alertas, comunicaciones (buscador, y/e), lista/calendario/eventos/informes (variacion, ocupacion, graficas linea X/Y, canales, sexo, porcentajes), dashboard/dogForm (48 checks, referido, plan medicacion), deceso, alarmas (notas internas en detalles), seed, redflag, unicidad, comportamientos, canales, contacto compartido, cifrado round-trip. Ejecutar: node tests/run-browser.js (Edge) -> RESULTADO: PASS (0 fallos).

TECNOLOGIAS
-----------
Vanilla JS, CSS custom properties, IndexedDB (db.js), localStorage, Web Crypto, PWA. Sin dependencias. Responsive y printable.

LICENCIA/EULA en LICENCIA.txt/EULA.txt
