# Musaé Spa

SPA para gestionar reservas de un salón de belleza. El proyecto se desarrolla por fases con React, Vite, TypeScript y Supabase.

## Estado actual

Fases 1 a 7 completadas en el código. La Fase 7 añade el panel de administración protegido del salón.

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
- `process-simulated-payment` registra un pago aprobado y cambia la reserva a `confirmed` en una sola operación del servidor. Solo puede pagar el propietario de una reserva futura pendiente.
- `/mis-reservas` muestra las próximas reservas pendientes de pago y enlaza a su pago correspondiente.

## Historial de reservas

- `/mis-reservas` separa las próximas citas del historial y muestra sus servicios, total, estado de reserva y estado de pago.
- Cada cliente sigue viendo únicamente sus propios datos mediante las políticas RLS existentes de Supabase.
- Las reservas pendientes futuras conservan el botón para completar el pago simulado; las demás permiten consultar su detalle.

Antes de probar el pago debes ejecutar la migración de Fase 5 y desplegar la tercera Edge Function. La guía explica esos pasos sin exponer claves privadas.

## Autenticación

1. Crea `.env.local` a partir de `.env.example` y define la URL del proyecto y su clave `publishable` o `anon`.
2. En Supabase, agrega `http://127.0.0.1:5173/auth` a las URL de redirección de Authentication antes de probar el registro con confirmación por correo.
3. La ruta `/auth` permite crear una cuenta, iniciar sesión y cerrar sesión. El perfil, las reservas y la administración están protegidos por sesión y rol.

## Tecnologías

- React + Vite + TypeScript
- React Router
- Supabase (Auth, PostgreSQL, RLS y Edge Functions)
- Vercel

Las pruebas finales y el despliegue se incorporarán en las fases posteriores.

## Administración

- La ruta `/administracion` está disponible únicamente para perfiles activos con rol `admin`.
- Permite crear, editar o desactivar servicios; ajustar los horarios de atención; bloquear fechas; y gestionar el estado de las reservas recientes.
- Las modificaciones se realizan mediante la Edge Function `admin-manage`, que vuelve a validar la sesión, el rol y los datos antes de escribir en la base de datos.
- La primera cuenta administradora debe asignarse una sola vez desde Supabase; consulta la guía de `supabase/README.md`.
