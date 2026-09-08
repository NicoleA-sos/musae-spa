-- Datos iniciales para desarrollo local de Musaé Spa.
-- No crea usuarios de Auth ni administradores: eso debe hacerse desde Supabase
-- y luego asignar el rol por una operación administrativa segura.

insert into public.service_categories (name, description, display_order)
values
  ('Cabello', 'Cortes, peinados y tratamientos para el cabello.', 1),
  ('Uñas', 'Manicure, pedicure y esmaltado.', 2),
  ('Facial', 'Limpieza y cuidado facial.', 3)
on conflict (name) do update
  set description = excluded.description,
      display_order = excluded.display_order,
      is_active = true;

insert into public.services (category_id, name, description, duration_minutes, price)
select category.id, service.name, service.description, service.duration_minutes, service.price
from (
  values
    ('Cabello', 'Corte y lavado', 'Corte personalizado con lavado y secado.', 60, 55.00::numeric),
    ('Cabello', 'Peinado', 'Peinado para una ocasión especial.', 45, 45.00::numeric),
    ('Uñas', 'Manicure semipermanente', 'Cuidado de uñas y esmaltado semipermanente.', 60, 65.00::numeric),
    ('Uñas', 'Pedicure spa', 'Pedicure con exfoliación e hidratación.', 75, 75.00::numeric),
    ('Facial', 'Limpieza facial', 'Limpieza e hidratación según tu tipo de piel.', 60, 85.00::numeric)
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
