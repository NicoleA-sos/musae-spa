-- Datos iniciales para desarrollo local de Musaé Spa.
-- No crea usuarios de Auth ni administradores: eso debe hacerse desde Supabase
-- y luego asignar el rol por una operación administrativa segura.

insert into public.service_categories (name, description, display_order)
values
  ('Manos', 'Manicure y cuidado de manos.', 1),
  ('Pies', 'Pedicure y cuidado de pies.', 2),
  ('Cabello', 'Cortes y coloración para el cabello.', 3)
on conflict (name) do update
  set description = excluded.description,
      display_order = excluded.display_order,
      is_active = true;

insert into public.services (category_id, name, description, duration_minutes, price)
select category.id, service.name, service.description, service.duration_minutes, service.price
from (
  values
    ('Manos', 'Manicure básica', 'Limpieza, limado y esmaltado tradicional para las manos.', 45, 30.00::numeric),
    ('Manos', 'Manicure semipermanente', 'Preparación de uñas y esmaltado semipermanente.', 60, 50.00::numeric),
    ('Pies', 'Pedicure básica', 'Limpieza, limado y esmaltado tradicional para los pies.', 60, 40.00::numeric),
    ('Pies', 'Pedicure semipermanente', 'Preparación de uñas y esmaltado semipermanente para los pies.', 75, 60.00::numeric),
    ('Cabello', 'Corte para dama', 'Corte de cabello para dama.', 60, 30.00::numeric),
    ('Cabello', 'Corte para caballero', 'Corte de cabello para caballero.', 30, 30.00::numeric),
    ('Cabello', 'Tinte completo', 'Aplicación de tinte en todo el cabello.', 120, 120.00::numeric)
) as service(category_name, name, description, duration_minutes, price)
join public.service_categories as category on category.name = service.category_name
on conflict (category_id, name) do update
  set description = excluded.description,
      duration_minutes = excluded.duration_minutes,
      price = excluded.price,
      is_active = true;

insert into public.business_hours (day_of_week, opens_at, closes_at, is_active)
values
  (0, '09:00', '18:00', false),
  (1, '09:00', '19:00', true),
  (2, '09:00', '19:00', true),
  (3, '09:00', '19:00', true),
  (4, '09:00', '19:00', true),
  (5, '09:00', '19:00', true),
  (6, '09:00', '18:00', true)
on conflict (day_of_week) do update
  set opens_at = excluded.opens_at,
      closes_at = excluded.closes_at,
      is_active = excluded.is_active;
