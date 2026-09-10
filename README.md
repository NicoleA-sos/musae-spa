# Musaé Spa

SPA para gestionar reservas de un salón de belleza. El proyecto se desarrolla por fases con React, Vite, TypeScript y Supabase.

## Estado actual

Las fases 1 a 7 están completadas. La fase 8 deja lista la publicación en Vercel y la lista de comprobación final.

## Requisitos

- Node.js 22 o superior.
- Un proyecto de Supabase para aplicar la migración de `supabase/migrations`.

## Ejecución local

1. Copia `.env.example` como `.env.local`.
2. Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` cuando tengas el proyecto de Supabase.
3. Instala dependencias con `npm install`.
4. Ejecuta `npm run dev`.

## Validación

```bash
npm run typecheck
npm run lint
npm run build
```

## Base de datos y seguridad

- La migración de Fase 2 crea `profiles`, `service_categories`, `services`, `business_hours`, `blocked_dates`, `reservations`, `reservation_items` y `payments`.
- Cada registro relevante posee UUID, fechas de creación/actualización y el usuario responsable cuando existe una sesión autenticada.
- Los precios, nombres y duración de cada servicio se copian a `reservation_items`; por eso una modificación posterior del catálogo no cambia el importe histórico de una reserva.
- RLS permite que cada cliente lea solo su perfil, reservas y pagos. Los servicios activos son públicos.
- Las escrituras de reservas, pagos, catálogo y horarios están bloqueadas en el cliente. Las Edge Functions validan la sesión, disponibilidad y precios vigentes antes de crear una reserva.

Revisa [la guía de Supabase](supabase/README.md) para aplicar la migración y los datos iniciales.

## Catálogo, reservas y pago simulado

- La página `/servicios` consulta las categorías, nombres, duraciones y precios reales de Supabase.
- La página `/reservar` permite seleccionar servicios, fecha y un horario disponible; muestra los importes en soles peruanos.
- `get-available-slots` calcula los horarios con la zona `America/Lima`, horarios de atención, fechas bloqueadas y reservas vigentes.
- `create-reservation` vuelve a validar todo en el servidor y crea los importes históricos de cada servicio en una operación atómica.
- Al crear una reserva se abre `/pago/:reservationId`. El pago simulado no pide ni guarda datos de tarjeta.
- La pasarela simulada permite probar Tarjeta, Yape o Plin con datos ficticios que permanecen en el navegador. Cada intento queda registrado como aprobado o rechazado; solo un aprobado genera un código de operación y cambia la reserva a `confirmed`.
- `/mis-reservas` muestra las próximas reservas pendientes de pago y enlaza a su pago correspondiente.

## Historial de reservas

- `/mis-reservas` separa las próximas citas del historial y muestra sus servicios, total, estado de reserva y estado de pago.
- Cada cliente sigue viendo únicamente sus propios datos mediante las políticas RLS existentes de Supabase.
- Las reservas pendientes futuras conservan el botón para completar el pago simulado; las demás permiten consultar su detalle.
- El cliente puede cancelar desde **Mis reservas**. Las reservas confirmadas exigen al menos 12 horas de anticipación; cuando tenían un pago aprobado, este queda marcado como reembolsado dentro de la simulación.

Antes de probar el pago debes ejecutar la migración de Fase 5 y desplegar la tercera Edge Function. La guía explica esos pasos sin exponer claves privadas.

## Autenticación

1. Crea `.env.local` a partir de `.env.example` y define la URL del proyecto y su clave `publishable` o `anon`.
2. En Supabase, agrega `http://127.0.0.1:5173/iniciar-sesion` y `http://127.0.0.1:5173/recuperar-contrasena` a las URL de redirección de Authentication antes de probar el registro o recuperación por correo.
3. Las rutas públicas son `/` (inicio), `/servicios` (catálogo), `/iniciar-sesion`, `/registro` y `/recuperar-contrasena`. El perfil, las reservas y la administración están protegidos por sesión y rol.

## Publicación en Vercel (Fase 8)

1. Importa el repositorio `NicoleA-sos/musae-spa` en Vercel. La configuración ya reconoce Vite y conserva las rutas de la SPA, incluido `/auth` y `/administracion`.
2. En **Settings → Environment Variables** de Vercel, crea solo estas dos variables para Production:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (también llamada clave `publishable`)
3. Publica el proyecto y copia su URL HTTPS, por ejemplo `https://tu-proyecto.vercel.app`.
4. En Supabase ve a **Authentication → URL Configuration** y cambia **Site URL** por esa URL. En **Redirect URLs**, conserva las locales y agrega `https://tu-proyecto.vercel.app/iniciar-sesion` y `https://tu-proyecto.vercel.app/recuperar-contrasena`.
5. Prueba en la URL publicada: registro o inicio de sesión, disponibilidad, creación y pago simulado, historial y administración con la cuenta administradora.

Nunca configures `service_role_key` ni `VITE_SUPABASE_SECRET_KEY` en Vercel para esta aplicación. Esas claves privadas permanecen únicamente dentro de las Edge Functions de Supabase.

## Tecnologías

- React + Vite + TypeScript
- React Router
- Supabase (Auth, PostgreSQL, RLS y Edge Functions)
- Vercel

## Arquitectura

La aplicación separa la interfaz, la lógica y el acceso a datos:

```text
Páginas y componentes de React
             │
             ▼
Casos de uso y repositorios por funcionalidad
             │
             ▼
Supabase Auth y PostgreSQL ─── Edge Functions
```

- Las páginas y componentes muestran la interfaz y gestionan la interacción.
- Los repositorios consultan datos de Supabase.
- Las API de cada funcionalidad invocan Edge Functions para operaciones sensibles.
- Las Edge Functions validan sesión, rol, disponibilidad y precios antes de modificar la base de datos.
- El navegador usa solamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Ninguna clave privada se incluye en el repositorio ni en Vercel.

## Modelo de datos

```text
auth.users ── profiles ── reservations ── reservation_items ── services ── service_categories
                               │
                               └──────────────── payments

business_hours y blocked_dates controlan la disponibilidad de reservations.
```

Los importes, nombres y duraciones se copian en `reservation_items` al crear una reserva. Así, los cambios posteriores del catálogo no alteran el historial.

## Flujo de pantallas

1. **Inicio** y **Servicios** son públicos.
2. La persona puede registrarse, iniciar sesión o recuperar su contraseña.
3. En **Reservar** selecciona servicios, fecha y un horario disponible.
4. La reserva pasa al **Pago simulado**, donde puede aprobarse o rechazarse sin datos bancarios reales.
5. **Mis reservas** muestra próximas citas e historial.
6. **Administración** está disponible solo para perfiles administradores y permite gestionar el catálogo, horarios, bloqueos y reservas.

## Desarrollo por fases

1. Base de React, Vite y TypeScript.
2. Modelo de datos, Supabase, RLS y autenticación.
3. Catálogo y reserva con validación de disponibilidad.
4. Historial, cancelaciones y perfil.
5. Pago simulado y estados de pago.
6. Panel de administración.
7. Pantallas públicas y recuperación de contraseña.
8. Preparación de documentación, pruebas y despliegue en Vercel.

## Capturas

- [Inicio en escritorio](docs/capturas/inicio-escritorio.png)
- [Reserva con horarios disponibles](docs/capturas/reserva-horarios.png)
- [Horario ocupado no disponible](docs/capturas/horario-ocupado.png)
- [Pago simulado aprobado](docs/capturas/pago-aprobado.png)
- [Cancelación con reembolso simulado](docs/capturas/cancelacion-reembolso.png)
- [Cancelación bloqueada fuera del plazo](docs/capturas/cancelacion-fuera-de-plazo.png)
- [Pago simulado rechazado](docs/capturas/pago-rechazado.png)
- [Panel de administración](docs/capturas/administracion.png)
- [Inicio en celular](docs/capturas/inicio-movil.png)

## Administración

- La ruta `/administracion` está disponible únicamente para perfiles activos con rol `admin`.
- Permite crear, editar o desactivar servicios; ajustar los horarios de atención; bloquear fechas; y gestionar el estado de las reservas recientes.
- Las modificaciones se realizan mediante la Edge Function `admin-manage`, que vuelve a validar la sesión, el rol y los datos antes de escribir en la base de datos.
- La primera cuenta administradora debe asignarse una sola vez desde Supabase; consulta la guía de `supabase/README.md`.
