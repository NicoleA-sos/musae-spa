-- Musaé Spa · Catálogo inicial requerido
-- Conserva el historial de reservas: solo desactiva los servicios de demostración
-- que son reemplazados por el catálogo solicitado.

begin;

insert into public.service_categories (name, description, display_order, is_active)
values
  ('Manos', 'Manicure y cuidado de manos.', 1, true),
  ('Pies', 'Pedicure y cuidado de pies.', 2, true),
  ('Cabello', 'Cortes y coloración para el cabello.', 3, true)
on conflict (name) do update
  set description = excluded.description,
      display_order = excluded.display_order,
      is_active = true;

with required_services(category_name, name, description, duration_minutes, price) as (
  values
    ('Manos', 'Manicure básica', 'Limpieza, limado y esmaltado tradicional para las manos.', 45, 30.00::numeric),
    ('Manos', 'Manicure semipermanente', 'Preparación de uñas y esmaltado semipermanente.', 60, 50.00::numeric),
    ('Pies', 'Pedicure básica', 'Limpieza, limado y esmaltado tradicional para los pies.', 60, 40.00::numeric),
    ('Pies', 'Pedicure semipermanente', 'Preparación de uñas y esmaltado semipermanente para los pies.', 75, 60.00::numeric),
    ('Cabello', 'Corte para dama', 'Corte de cabello para dama.', 60, 30.00::numeric),
    ('Cabello', 'Corte para caballero', 'Corte de cabello para caballero.', 30, 30.00::numeric),
    ('Cabello', 'Tinte completo', 'Aplicación de tinte en todo el cabello.', 120, 120.00::numeric)
)
insert into public.services (category_id, name, description, duration_minutes, price, is_active)
select category.id, service.name, service.description, service.duration_minutes, service.price, true
from required_services as service
join public.service_categories as category on category.name = service.category_name
on conflict (category_id, name) do update
  set description = excluded.description,
      duration_minutes = excluded.duration_minutes,
      price = excluded.price,
      is_active = true;

-- Los registros históricos siguen utilizando sus datos copiados en reservation_items.
update public.services as service
set is_active = false
from public.service_categories as category
where service.category_id = category.id
  and service.is_active
  and (
    (category.name = 'Cabello' and service.name in ('Corte y lavado', 'Peinado'))
    or (category.name = 'Uñas' and service.name in ('Manicure semipermanente', 'Pedicure spa'))
    or (category.name = 'Facial' and service.name = 'Limpieza facial')
  );

update public.service_categories as category
set is_active = false
where category.name in ('Uñas', 'Facial')
  and not exists (
    select 1
    from public.services as service
    where service.category_id = category.id
      and service.is_active
  );

commit;
