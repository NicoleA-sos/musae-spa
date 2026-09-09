-- Musaé Spa · Fase 5
-- Procesa un pago simulado en el servidor y confirma la reserva de forma atómica.

begin;

create unique index if not exists payments_one_approved_per_reservation_idx
  on public.payments (reservation_id)
  where status = 'approved';

create or replace function public.process_simulated_payment(
  p_reservation_id uuid,
  p_customer_id uuid,
  p_actor_id uuid
)
returns table (
  payment_id uuid,
  payment_status public.payment_status,
  reservation_status public.reservation_status,
  amount numeric(12, 2),
  currency char(3)
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations%rowtype;
  v_payment_id uuid;
begin
  if p_reservation_id is null or p_customer_id is null or p_actor_id is null then
    raise exception 'La identidad y la reserva son obligatorias';
  end if;

  if p_customer_id <> p_actor_id then
    raise exception 'No tienes permiso para procesar este pago';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_customer_id
      and status = 'active'
  ) then
    raise exception 'La cuenta no está disponible para procesar pagos';
  end if;

  select *
    into v_reservation
  from public.reservations
  where id = p_reservation_id
    and customer_id = p_customer_id
  for update;

  if not found then
    raise exception 'La reserva no está disponible para pago';
  end if;

  if v_reservation.status = 'confirmed' then
    select id
      into v_payment_id
    from public.payments
    where reservation_id = v_reservation.id
      and status = 'approved'
    order by created_at desc
    limit 1;

    if found then
      return query
      select
        v_payment_id,
        'approved'::public.payment_status,
        'confirmed'::public.reservation_status,
        v_reservation.total_amount,
        v_reservation.currency;
      return;
    end if;

    raise exception 'La reserva ya está confirmada';
  end if;

  if v_reservation.status <> 'pending' then
    raise exception 'Solo se pueden pagar reservas pendientes';
  end if;

  if v_reservation.starts_at <= now() then
    raise exception 'No se puede procesar el pago de una reserva pasada';
  end if;

  insert into public.payments (
    reservation_id,
    amount,
    currency,
    status,
    provider,
    provider_reference,
    processed_by,
    created_by,
    updated_by
  )
  values (
    v_reservation.id,
    v_reservation.total_amount,
    v_reservation.currency,
    'approved',
    'simulated',
    'sim_' || replace(gen_random_uuid()::text, '-', ''),
    p_actor_id,
    p_actor_id,
    p_actor_id
  )
  returning id into v_payment_id;

  update public.reservations
  set status = 'confirmed',
      updated_by = p_actor_id
  where id = v_reservation.id;

  return query
  select
    v_payment_id,
    'approved'::public.payment_status,
    'confirmed'::public.reservation_status,
    v_reservation.total_amount,
    v_reservation.currency;
end;
$$;

revoke all on function public.process_simulated_payment(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.process_simulated_payment(uuid, uuid, uuid)
to service_role;

comment on function public.process_simulated_payment is
  'Solo Edge Functions con service_role pueden aprobar pagos simulados y confirmar reservas.';

commit;
