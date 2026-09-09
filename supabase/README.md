# Base de datos de Musaé Spa

La migración `migrations/202609070001_initial_schema.sql` crea las ocho tablas requeridas, los tipos de estado, los disparadores de auditoría, las validaciones de disponibilidad y las políticas RLS.

La migración `migrations/202609080001_create_reservation_rpc.sql` agrega la operación atómica que crea una reserva con precios y duraciones históricos. La migración `migrations/202609080002_grant_booking_function_reads.sql` concede a las Edge Functions el acceso mínimo de lectura necesario para calcular disponibilidad.

## Aplicación en Supabase

1. Crea un proyecto en Supabase y conserva su URL y su clave `anon` pública para el frontend.
2. Instala e inicia sesión con la CLI de Supabase o abre el SQL Editor del proyecto.
3. Ejecuta la migración mediante `supabase db push` o pega su contenido una sola vez en SQL Editor.
4. Ejecuta `seed.sql` para cargar los servicios y horarios de demostración.
5. Ejecuta `migrations/202609080001_create_reservation_rpc.sql` después de la migración inicial. Si usas SQL Editor, pégala en una consulta nueva y selecciona **Run** una sola vez.
6. Ejecuta `migrations/202609080002_grant_booking_function_reads.sql` una sola vez para habilitar la consulta segura de horarios desde las Edge Functions.
7. Crea el primer usuario administrador desde Supabase Auth. En la siguiente fase añadiremos una operación administrativa segura para asignarle el rol `admin`.

## Edge Functions de reservas

Las funciones están en `functions/get-available-slots` y `functions/create-reservation`.

1. Inicia sesión en la CLI con `supabase login` y vincula el proyecto con `supabase link --project-ref TU_PROJECT_REF`.
2. Despliega ambas funciones con `supabase functions deploy get-available-slots` y `supabase functions deploy create-reservation`.
3. Prueba el flujo desde `/reservar` con una cuenta que haya confirmado su correo.

Supabase proporciona a sus Edge Functions alojadas las variables seguras de proyecto, incluida la clave de servidor. No copies ni configures `service_role_key` en el navegador, `.env.local` o GitHub.

Nunca copies la `service_role_key` en `.env.local`, el frontend ni GitHub. Solo las Edge Functions la usarán como secreto de servidor.

## Relaciones principales

```text
auth.users ──── profiles ──── reservations ──── reservation_items ──── services
                                      │                                  │
                                      └──────── payments                  └── service_categories

business_hours y blocked_dates validan la disponibilidad de reservations.
```
