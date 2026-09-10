-- Musaé Spa · Pasarela de pago simulada
-- Registra cada intento sin recibir ni guardar datos bancarios reales.

begin;

create or replace function public.process_simulated_payment_attempt(
  p_reservation_id uuid,
  p_customer_id uuid,
  p_actor_id uuid,
  p_method text,
  p_outcome text
)
returns table (
  payment_id uuid,
  payment_status public.payment_status,
  reservation_status public.reservation_status,
  amount numeric(12, 2),
  currency char(3),
  operation_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations%rowtype;
  v_payment public.payments%rowtype;
  v_operation_code text;
begin
  if p_reservation_id is null or p_customer_id is null or p_actor_id is null then
    raise exception 'La identidad y la reserva son obligatorias';
  end if;

  if p_customer_id <> p_actor_id then
    raise exception 'No tienes permiso para procesar este pago';
  end if;

  if p_method is null or p_method not in ('card', 'yape', 'plin') then
    raise exception 'Selecciona un método de pago simulado válido';
  end if;

  if p_outcome is null or p_outcome not in ('approved', 'rejected') then
    raise exception 'Selecciona un resultado simulado válido';
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
    select *
      into v_payment
    from public.payments
    where reservation_id = v_reservation.id
      and status = 'approved'
    order by created_at desc
    limit 1;

    if found then
      return query
      select
        v_payment.id,
        'approved'::public.payment_status,
        'confirmed'::public.reservation_status,
        v_reservation.total_amount,
        v_reservation.currency,
        v_payment.provider_reference;
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

  if p_outcome = 'rejected' then
    insert into public.payments (
      reservation_id,
      amount,
      currency,
      status,
      provider,
      processed_by,
      created_by,
      updated_by
    )
    values (
      v_reservation.id,
      v_reservation.total_amount,
      v_reservation.currency,
      'failed',
      'simulated_' || p_method,
      p_actor_id,
      p_actor_id,
      p_actor_id
    )
    returning * into v_payment;

    return query
    select
      v_payment.id,
      'failed'::public.payment_status,
      'pending'::public.reservation_status,
      v_reservation.total_amount,
      v_reservation.currency,
      null::text;
    return;
  end if;

  v_operation_code := 'SIM-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));

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
    'simulated_' || p_method,
    v_operation_code,
    p_actor_id,
    p_actor_id,
    p_actor_id
  )
  returning * into v_payment;

  update public.reservations
  set status = 'confirmed',
      updated_by = p_actor_id
  where id = v_reservation.id;

  return query
  select
    v_payment.id,
    'approved'::public.payment_status,
    'confirmed'::public.reservation_status,
    v_reservation.total_amount,
    v_reservation.currency,
    v_operation_code;
end;
$$;

revoke all on function public.process_simulated_payment_attempt(uuid, uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.process_simulated_payment_attempt(uuid, uuid, uuid, text, text)
to service_role;

comment on function public.process_simulated_payment_attempt is
  'Registra un intento de pago ficticio; solo un resultado aprobado confirma la reserva.';

commit;
