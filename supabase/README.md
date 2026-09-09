# Base de datos de Musaé Spa

La migración `migrations/202609070001_initial_schema.sql` crea las ocho tablas requeridas, los tipos de estado, los disparadores de auditoría, las validaciones de disponibilidad y las políticas RLS.

La migración `migrations/202609080001_create_reservation_rpc.sql` agrega la operación atómica que crea una reserva con precios y duraciones históricos. La migración `migrations/202609080002_grant_booking_function_reads.sql` concede a las Edge Functions el acceso mínimo de lectura necesario para calcular disponibilidad. La migración `migrations/202609080003_process_simulated_payment.sql` crea el pago simulado atómico y confirma la reserva.

## Aplicación en Supabase

1. Crea un proyecto en Supabase y conserva su URL y su clave `anon` pública para el frontend.
2. Instala e inicia sesión con la CLI de Supabase o abre el SQL Editor del proyecto.
3. Ejecuta la migración mediante `supabase db push` o pega su contenido una sola vez en SQL Editor.
4. Ejecuta `seed.sql` para cargar los servicios y horarios de demostración.
5. Ejecuta `migrations/202609080001_create_reservation_rpc.sql` después de la migración inicial. Si usas SQL Editor, pégala en una consulta nueva y selecciona **Run** una sola vez.
6. Ejecuta `migrations/202609080002_grant_booking_function_reads.sql` una sola vez para habilitar la consulta segura de horarios desde las Edge Functions.
7. Ejecuta `migrations/202609080003_process_simulated_payment.sql` una sola vez. Crea un índice que evita dos pagos aprobados para la misma reserva y permite que solo el servidor confirme una reserva tras el pago simulado.
8. Crea el primer usuario administrador desde Supabase Auth y asígnale el rol según la sección **Administración** de esta guía.

## Edge Functions de reservas

Las funciones están en `functions/get-available-slots`, `functions/create-reservation` y `functions/process-simulated-payment`.

1. Inicia sesión en la CLI con `supabase login` y vincula el proyecto con `supabase link --project-ref TU_PROJECT_REF`.
2. Despliega las funciones con `supabase functions deploy get-available-slots`, `supabase functions deploy create-reservation` y `supabase functions deploy process-simulated-payment`.
3. Prueba el flujo desde `/reservar` con una cuenta que haya confirmado su correo; al crear una cita, abre el pago simulado y confirma la reserva.

Supabase proporciona a sus Edge Functions alojadas las variables seguras de proyecto, incluida la clave de servidor. No copies ni configures `service_role_key` en el navegador, `.env.local` o GitHub.

Nunca copies la `service_role_key` en `.env.local`, el frontend ni GitHub. Solo las Edge Functions la usarán como secreto de servidor.

## Administración

La función `functions/admin-manage` procesa los cambios del panel de administración. Solo funciona para perfiles con rol `admin` y estado `active`.

1. Despliega la función con `supabase functions deploy admin-manage`.
2. Asigna el primer rol administrador una sola vez desde SQL Editor, reemplazando el correo por el de tu cuenta:

```sql
update public.profiles
set role = 'admin'
where email = 'tu-correo@ejemplo.com';
```

3. Cierra sesión y vuelve a ingresar, o recarga la aplicación. Verás **Administración** en el menú.

No otorgues el rol `admin` a clientes normales. El panel permite editar la disponibilidad, el catálogo y el estado de las reservas.

## Relaciones principales

```text
auth.users ──── profiles ──── reservations ──── reservation_items ──── services
                                      │                                  │
                                      └──────── payments                  └── service_categories

business_hours y blocked_dates validan la disponibilidad de reservations.
```
