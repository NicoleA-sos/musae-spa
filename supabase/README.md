# Base de datos de Musaé Spa

La migración `migrations/202609070001_initial_schema.sql` crea las ocho tablas requeridas, los tipos de estado, los disparadores de auditoría, las validaciones de disponibilidad y las políticas RLS.

## Aplicación en Supabase

1. Crea un proyecto en Supabase y conserva su URL y su clave `anon` pública para el frontend.
2. Instala e inicia sesión con la CLI de Supabase o abre el SQL Editor del proyecto.
3. Ejecuta la migración mediante `supabase db push` o pega su contenido una sola vez en SQL Editor.
4. Ejecuta `seed.sql` para cargar los servicios y horarios de demostración.
5. Crea el primer usuario administrador desde Supabase Auth. En la siguiente fase añadiremos una operación administrativa segura para asignarle el rol `admin`.

Nunca copies la `service_role_key` en `.env.local`, el frontend ni GitHub. Solo las Edge Functions la usarán como secreto de servidor.

## Relaciones principales

```text
auth.users ──── profiles ──── reservations ──── reservation_items ──── services
                                      │                                  │
                                      └──────── payments                  └── service_categories

business_hours y blocked_dates validan la disponibilidad de reservations.
```
