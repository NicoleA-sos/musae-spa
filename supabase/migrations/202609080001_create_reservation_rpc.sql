-- Musaé Spa · Fase 4
-- Crea una reserva de forma atómica para que no existan cruces ni precios manipulados.

begin;

create or replace function public.create_reservation_from_services(
  p_customer_id uuid,
  p_starts_at timestamptz,
  p_service_ids uuid[],
  p_customer_notes text,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation_id uuid;
  v_total_minutes integer;
  v_total_amount numeric(12, 2);
  v_service_count integer;
begin
  if p_customer_id is null or p_actor_id is null then
    raise exception 'La identidad del usuario es obligatoria';
  end if;

  if p_service_ids is null or cardinality(p_service_ids) = 0 then
    raise exception 'Selecciona al menos un servicio';
  end if;

  if (
    select count(distinct service_id)
    from unnest(p_service_ids) as selected(service_id)
  ) <> cardinality(p_service_ids) then
    raise exception 'Un servicio no puede seleccionarse más de una vez';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_customer_id
      and status = 'active'
  ) then
    raise exception 'La cuenta no está disponible para crear reservas';
  end if;

  select
    count(*)::integer,
    coalesce(sum(duration_minutes), 0)::integer,
    coalesce(sum(price), 0)::numeric(12, 2)
  into v_service_count, v_total_minutes, v_total_amount
  from public.services
  where id = any(p_service_ids)
    and is_active;

  if v_service_count <> cardinality(p_service_ids) then
    raise exception 'Uno o más servicios ya no están disponibles';
  end if;

  insert into public.reservations (
    customer_id,
    starts_at,
    ends_at,
    total_duration_minutes,
    total_amount,
    currency,
    status,
    customer_notes,
    created_by,
    updated_by
  )
  values (
    p_customer_id,
    p_starts_at,
    p_starts_at + make_interval(mins => v_total_minutes),
    v_total_minutes,
    v_total_amount,
    'PEN',
    'pending',
    nullif(trim(coalesce(p_customer_notes, '')), ''),
    p_actor_id,
    p_actor_id
  )
  returning id into v_reservation_id;

  insert into public.reservation_items (
    reservation_id,
    service_id,
    quantity,
    service_name_snapshot,
    duration_minutes_snapshot,
    unit_price_snapshot,
    created_by,
    updated_by
  )
  select
    v_reservation_id,
    service.id,
    1,
    service.name,
    service.duration_minutes,
    service.price,
    p_actor_id,
    p_actor_id
  from public.services as service
  where service.id = any(p_service_ids)
    and service.is_active;

  return v_reservation_id;
end;
$$;

revoke all on function public.create_reservation_from_services(uuid, timestamptz, uuid[], text, uuid)
from public, anon, authenticated;
grant execute on function public.create_reservation_from_services(uuid, timestamptz, uuid[], text, uuid)
to service_role;

comment on function public.create_reservation_from_services is
  'Solo Edge Functions con service_role pueden crear reservas atómicas y conservar snapshots de precio.';

commit;

