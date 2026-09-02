# Cuidador Canino

Aplicación web (HTML + CSS + JavaScript ES6+, sin frameworks ni backend) para la gestión de un
pequeño negocio de cuidado de perros: hospedaje, paseos y guardería.

Los datos se guardan en el navegador mediante **IndexedDB** (perros, contactos, servicios y
plantillas) y **localStorage** (configuración). La aplicación funciona 100 % sin conexión.

## Cómo usar

1. Abre `index.html` en un navegador moderno (Chrome, Edge, Firefox o Safari).
   - Recomendado: ejecutar un servidor local estático para evitar restricciones de `file://`.
     Por ejemplo: `npx serve .` o `python -m http.server 8000`, y abrir `http://localhost:8000`.
2. La aplicación empieza con la base de datos **vacía** (solo se crean las 5 plantillas de texto
   precargadas). Para probarla con datos, ve a **Configuración → Datos → Cargar datos de ejemplo**
   (crea 5 perros, 5 contactos y 11 servicios de la planificación de diciembre 2026).

## Vistas

| Ruta               | Descripción                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `#/`               | **Dashboard**: hospedajes activos hoy, paseos de hoy, próximos servicios.    |
| `#/calendario`     | Vista mensual con eventos de hospedaje (azul) y paseo (verde), barra roja si no hay señal. Semana empieza en lunes. |
| `#/perros`         | Gestión de perros (alta, edición, baja).                                    |
| `#/servicios`      | Alta/edición de servicios con cálculo automático de costes.                 |
| `#/informes`       | Rendimiento anual y por perro; botón imprimir.                              |
| `#/plantillas`     | Plantillas de texto para WhatsApp/mensajes (ver, copiar, crear, editar).    |
| `#/configuracion`  | Tarifas, logo, campos de Google Calendar, exportar/importar/resetear datos. |

## Características clave

- **Costes automáticos (Opción B)**: el coste se recalcula al cambiar tarifa, fechas, perros,
  minutos o días de paseo. Si el usuario edita el total manualmente, se respeta hasta que cambie
  algún dato del servicio.
- **Pendiente de pago**: `coste_total + señal - pagado`, recalculado en vivo.
- **Señal prevista**: el 20 % del total (según configuración), mostrada como orientación.
- **Baja de perro** (Opción D): permite cancelar sus servicios activos, borrarlos en cascada o
  eliminarlo físicamente. Los perros inactivos se conservan y excluyen de los listados.
- **Borrado lógico vs. físico**: dar de baja un servicio lo marca como `cancelado` (30 % de señal
  según tarifa); borrarlo definitivamente lo elimina.
- **Fotos de perros**: se redimensionan a 800 px y se guardan en base64 en IndexedDB.
- **Exportar/importar**: copia de seguridad completa en JSON.
- **Fechas** en formato DD/MM/AAAA y **importes** en euros (`1.141,00 €`).

## Estructura

```
app/
  index.html              Punto de entrada (SPA con enrutado por hash)
  css/style.css           Estilos, modo impresión, diseño responsive
  js/
    calc.js               Lógica pura: fechas, costes, validación, formato ES
    db.js                 Capa IndexedDB (promesas)
    store.js              Acceso a datos y reglas de negocio (cascada, cálculos)
    templates.js          Plantillas de texto precargadas
    ui.js                 Iconos, modales, toasts, redimensionado de imagen
    app.js                Router y arranque
    views/
      dashboard.js        Vista principal
      calendar.js         Calendario mensual
      dogs.js             Gestión de perros
      services.js         Gestión de servicios (formulario + lista)
      settings.js         Configuración y copias de seguridad
      reports.js          Informes
      templatesView.js    Plantillas de texto
```

## Tarifas por defecto (configurables)

| Tipo      | Precio base        | Extras                                              |
| --------- | ------------------ | --------------------------------------------------- |
| Hospedaje | 20 €/día           | 
| Paseo     | 12 €/hora          | 

Al cancelar un servicio se cobra el 100 % de la señal si la hubiera.
