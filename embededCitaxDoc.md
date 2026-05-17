# Citax embebido

## Objetivo

Este archivo explica cómo exponer Citax para usarlo embebido dentro de otro proyecto.

Hoy el código soporta 2 modelos:

1. `iframe` con UI propia de Citax.
2. Integración headless consumiendo endpoints públicos por `slug`.

También existe un tercer bloque de rutas tipo "embed admin" para leer/configurar agenda por `slug`, pero ojo: esas rutas hoy no usan `authMiddleware`.

---

## Cómo está armado hoy

### 1. `app.js`

`src/app.js` hace estas cosas importantes:

- monta CORS global.
- define CSP `frame-ancestors` para permitir `iframe`.
- sirve archivos estáticos del frontend buildado.
- monta rutas API privadas:
  - `/api/appointments`
  - `/api/availability`
- monta rutas públicas landing:
  - `/api/public`
- monta rutas embed:
  - `/embed/reserva`
- hace fallback SPA para servir `index.html`.

### 2. Rutas privadas autenticadas

Estas usan `authMiddleware`:

- `src/routes/appointments.routes.js`
- `src/routes/availability.routes.js`

Sirven para dashboard interno de Citax. No son las rutas ideales para consumir desde otro proyecto externo salvo que ese proyecto también maneje login JWT de Citax.

### 3. Rutas embed por `slug`

`src/routes/embed.routes.js` resuelve empresa por `EMPRESA.slug` y expone CRUD de agenda sin JWT:

- `GET /embed/reserva/:slug/settings`
- `GET /embed/reserva/:slug/appointments`
- `POST /embed/reserva/:slug/appointments`
- `PUT /embed/reserva/:slug/appointments/:id`
- `DELETE /embed/reserva/:slug/appointments/:id`

Estas rutas replican bastante lógica de `appointments.routes.js`, pero cambian contexto:

- no usan `req.user.id_empresa`
- usan `req.companyId` resuelto por `slug`

### 4. Disponibilidad real

`src/services/ai/companyContextService.js` centraliza lógica importante:

- `listAvailableSlots(...)`
- bloqueo por fechas
- horarios por empresa/prestador
- choque de turnos
- anticipación mínima con `MIN_BOOKING_LEAD_MINUTES`

O sea: tanto WhatsApp como disponibilidad pública dependen de esta lógica. Si exportás Citax embebido, esta capa es parte del contrato real del sistema.

---

## Recomendación simple

Si querés integrar Citax embebido en otro proyecto, recomendación:

### Opción A. `iframe` completo

Usar:

```html
<iframe
  src="https://TU_API_O_DOMINIO/embed/reserva/TU_SLUG"
  width="100%"
  height="900"
  style="border:0"
  loading="lazy"
></iframe>
```

Cuándo conviene:

- querés integración rápida.
- no querés rehacer UI.
- querés que Citax maneje flujo visual.

Qué consume por dentro:

- `GET /api/public/landing/:slug`
- `GET /api/public/landing/:slug/availability`
- `POST /api/public/landing/:slug/appointments`

### Opción B. Headless / custom UI

Tu app construye su propia UI y llama endpoints públicos:

- `GET /api/public/landing/:slug`
- `GET /api/public/landing/:slug/availability?professional_id=...&service_id=...&date=YYYY-MM-DD`
- `POST /api/public/landing/:slug/appointments`

Cuándo conviene:

- querés diseño propio.
- querés controlar UX completa.
- no necesitás montar dashboard/agenda completa, solo reserva pública.

### Opción C. Embed admin por `slug`

Usar rutas de `embed.routes.js` si querés ver o manipular agenda completa desde otro front.

No recomendado exponer así a internet sin capa extra de seguridad, porque hoy esas rutas no piden JWT.

---

## Qué exportar realmente

Para que Citax funcione embebido, necesitás exportar estas piezas:

### Backend Express

Publicar app Node con:

- `src/app.js`
- `src/routes/public.routes.js`
- `src/routes/embed.routes.js`
- `src/routes/appointments.routes.js`
- `src/routes/availability.routes.js`
- `src/services/ai/companyContextService.js`

### Frontend buildado

`app.js` sirve estáticos desde:

```js
const frontendDist = path.resolve(
  __dirname, "..", "..", process.env.FRONTEND_DIST || "Citax", "dist"
);
```

Entonces necesitás:

1. buildar frontend `Citax`.
2. dejar `dist` accesible donde espera `FRONTEND_DIST`.

Sin eso, `/embed/reserva/:slug` no va a renderizar UI.

### Base de datos

Necesitás como mínimo datos correctos en:

- `EMPRESA.slug`
- `EMPRESA.horarios_disponibilidad`
- `PRESTADOR`
- `PRESTADOR_SERVICIO`
- `SERVICIO`
- `CLIENTE`
- `TURNO`
- `BLOCKED_DATES`
- `CONFIG_WHATSAPP` si querés notificaciones / integración WhatsApp

---

## Variables de entorno importantes

Tomando `.env.example` y código actual:

### Mínimas para que levante

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DATABASE_URL`
- `JWT_SECRET`

### Para embed SPA

- `FRONTEND_DIST`
  - default: `Citax`
  - debe apuntar a carpeta que contiene `dist`

- `EMBED_ANCESTORS`
  - lista separada por comas con dominios que pueden embeber iframe
  - ejemplo:

```env
EMBED_ANCESTORS=https://miapp.com,https://admin.miapp.com
```

### Para reglas de disponibilidad

- `MIN_BOOKING_LEAD_MINUTES`
  - si no está, usa `20`
  - afecta slots visibles y turnos válidos

### Para flujo público con WhatsApp

- `SUPPORT_WHATSAPP_INSTANCE`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

Si no configurás WhatsApp, la reserva pública igual puede crearse, pero la notificación puede no salir.

---

## Pasos para exportar API

## Paso 1. Asegurar `slug` por empresa

`embed.routes.js` y `public.routes.js` dependen de `EMPRESA.slug`.

Sin `slug`, no existe ruta pública/embebida usable.

Chequeo mínimo:

```sql
SELECT id_empresa, nombre_comercial, slug
FROM EMPRESA
WHERE slug IS NOT NULL AND slug <> '';
```

---

## Paso 2. Buildar frontend

Necesitás generar `Citax/dist`.

Ejemplo típico:

```bash
cd Citax
npm install
npm run build
```

Después verificar que exista:

- `Citax/dist/index.html`

---

## Paso 3. Configurar `FRONTEND_DIST`

Si el frontend no queda en `../Citax/dist`, ajustar:

```env
FRONTEND_DIST=Citax
```

O valor que corresponda según estructura deploy.

---

## Paso 4. Permitir iframe desde dominio externo

`app.js` arma:

- header `Content-Security-Policy`
- directiva `frame-ancestors`

Entonces tu dominio host debe estar en `EMBED_ANCESTORS`.

Ejemplo:

```env
EMBED_ANCESTORS=https://midominio.com,https://app.midominio.com
```

Si no lo agregás, browser puede bloquear embed.

---

## Paso 5. Revisar CORS si vas a usar headless

`app.js` tiene `allowedOrigins` restringido.

Hoy permite:

- `https://www.citax.com.ar`
- `https://citax.com.ar`
- `http://localhost:*`
- algunos subdominios citax/local

Si tu frontend externo va a llamar `/api/public/...` directo desde navegador y no desde iframe servido por Citax, probablemente tengas que agregar tu dominio a CORS.

Si solo usás `iframe` a `/embed/reserva/:slug`, esto no suele hacer falta.

---

## Paso 6. Exponer rutas correctas

### Para widget público

Estas son las importantes:

#### `GET /api/public/landing/:slug`

Devuelve:

- datos empresa
- servicios
- profesionales

Sirve para poblar selects del widget.

#### `GET /api/public/landing/:slug/availability`

Query params:

- `professional_id`
- `service_id`
- `date=YYYY-MM-DD`

Devuelve:

- `slots: string[]`

Internamente usa `listAvailableSlots(...)`.

#### `POST /api/public/landing/:slug/appointments`

Body:

```json
{
  "client_name": "Juan Perez",
  "client_phone": "5491122334455",
  "client_email": "juan@mail.com",
  "service_id": 1,
  "professional_id": 2,
  "date": "2026-05-20",
  "time": "15:30"
}
```

Comportamiento actual:

- valida slug, servicio, profesional, fecha, hora
- valida que profesional haga ese servicio
- valida disponibilidad real
- crea/actualiza cliente
- crea turno con estado `pendiente_confirmacion`
- origen `pagina` si columna `origen` existe
- intenta notificar por WhatsApp a empresa

Respuesta esperada:

```json
{
  "id_turno": 123,
  "estado": "pendiente_confirmacion",
  "notification_sent": true,
  "notification_error": "",
  "message": "Solicitud enviada. El turno queda pendiente hasta la confirmacion por WhatsApp."
}
```

---

## Paso 7. Si querés agenda embebida tipo admin

Rutas de `embed.routes.js`:

### `GET /embed/reserva/:slug/settings`

Devuelve:

- `services`
- `professionals`
- `clients`

### `GET /embed/reserva/:slug/appointments`

Devuelve agenda de empresa por slug.

### `POST /embed/reserva/:slug/appointments`

Crea turno directo.

Diferencia importante vs público:

- crea turno `confirmado`
- origen `manual`
- no pasa por flujo `pendiente_confirmacion`

### `PUT /embed/reserva/:slug/appointments/:id`

Permite:

- cambiar estado
- mover horario
- cambiar servicio
- cambiar profesional
- cambiar cliente

### `DELETE /embed/reserva/:slug/appointments/:id`

Borra turno.

---

## Diferencias clave entre público y embed/admin

### Público `api/public`

Pensado para reserva de cliente final.

- usa `slug`
- no requiere login
- crea `pendiente_confirmacion`
- manda notificación WhatsApp si hay config
- pide email, teléfono, nombre

### Embed admin `embed.routes.js`

Pensado para agenda embebida externa.

- usa `slug`
- no requiere login hoy
- crea turno `confirmado`
- no depende de confirmación WhatsApp
- expone CRUD amplio

### Privado `appointments.routes.js` y `availability.routes.js`

Pensado para dashboard Citax autenticado.

- requiere JWT
- usa `req.user.id_empresa`
- respeta roles

---

## Ejemplo integración `iframe`

```html
<section>
  <iframe
    src="https://api.midominio.com/embed/reserva/barberia-sol"
    width="100%"
    height="920"
    style="border:0;border-radius:16px"
    loading="lazy"
    referrerpolicy="strict-origin-when-cross-origin"
  ></iframe>
</section>
```

Opcional: escuchar evento éxito.

`EmbedBooking.jsx` hace:

```js
window.parent.postMessage(
  {
    type: "CITAX_APPOINTMENT_SUCCESS",
    payload: { slug, date, time }
  },
  EMBED_PARENT_ORIGIN
);
```

Entonces tu app host puede escuchar:

```js
window.addEventListener("message", (event) => {
  if (event.data?.type === "CITAX_APPOINTMENT_SUCCESS") {
    console.log("Turno solicitado", event.data.payload);
  }
});
```

---

## Ejemplo integración headless

### Cargar catálogo

```js
const landing = await fetch("https://api.midominio.com/api/public/landing/barberia-sol").then(r => r.json());
```

### Cargar slots

```js
const params = new URLSearchParams({
  professional_id: "2",
  service_id: "1",
  date: "2026-05-20"
});

const availability = await fetch(
  `https://api.midominio.com/api/public/landing/barberia-sol/availability?${params}`
).then(r => r.json());
```

### Crear solicitud

```js
const created = await fetch(
  "https://api.midominio.com/api/public/landing/barberia-sol/appointments",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Juan Perez",
      client_phone: "5491122334455",
      client_email: "juan@mail.com",
      service_id: 1,
      professional_id: 2,
      date: "2026-05-20",
      time: "15:30"
    })
  }
).then(r => r.json());
```

---

## Reglas de negocio que el integrador debe saber

Tomadas de `companyContextService.js`, `appointments.routes.js`, `availability.routes.js` y `embed.routes.js`:

- disponibilidad real no sale de una tabla simple, sale de horarios + bloqueos + solapamientos.
- `MIN_BOOKING_LEAD_MINUTES` puede ocultar slots cercanos.
- fechas bloqueadas invalidan creación.
- si profesional no ofrece servicio, reserva falla.
- una reserva pública crea `pendiente_confirmacion`.
- una creación embed/admin crea `confirmado`.
- cambios de estado tienen transiciones permitidas:
  - `pendiente -> confirmado/cancelado`
  - `pendiente_confirmacion -> confirmado/cancelado`
  - `confirmado -> cancelado`

---

## Riesgos actuales

### 1. `embed.routes.js` sin autenticación

Esto hoy deja CRUD de agenda por `slug` sin JWT.

Si lo vas a exportar a terceros, conviene agregar una de estas capas:

1. token de integración por empresa.
2. firma HMAC.
3. API key por cliente integrador.
4. restringir por reverse proxy / IP / middleware propio.

### 2. CORS restringido

Si querés frontend externo consumiendo API pública directo, probablemente debas ampliar `allowedOrigins`.

### 3. Dependencia del build frontend

Sin `dist`, ruta `/embed/reserva/:slug` no sirve UI.

---

## Qué usaría yo según caso

### Quiero insertar reserva rápido

Usar `iframe`:

- exportar backend + frontend buildado
- configurar `EMBED_ANCESTORS`
- usar `/embed/reserva/:slug`

### Quiero UI propia

Usar API pública:

- `/api/public/landing/:slug`
- `/api/public/landing/:slug/availability`
- `/api/public/landing/:slug/appointments`

### Quiero agenda completa embebida

Usar `embed.routes.js`, pero antes meter auth liviana.

---

## Checklist final deploy

- empresa tiene `slug`
- frontend buildado en `dist`
- `FRONTEND_DIST` correcto
- dominio externo agregado a `EMBED_ANCESTORS`
- si integración headless, dominio externo agregado a CORS
- servicios, prestadores y disponibilidades cargados
- WhatsApp configurado si querés confirmación automática
- revisar seguridad de `embed.routes.js`

---

## Resumen corto

Para integración embebida estándar, hoy Citax ya está casi listo:

- UI embebida: `GET /embed/reserva/:slug`
- API pública del widget:
  - `GET /api/public/landing/:slug`
  - `GET /api/public/landing/:slug/availability`
  - `POST /api/public/landing/:slug/appointments`

Si querés exportar también agenda/admin embebido, existen rutas en `embed.routes.js`, pero conviene agregar seguridad antes de publicarlas a terceros.
