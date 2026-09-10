-- Musaé Spa · Cancelación segura por parte del cliente
-- La regla de 12 horas para reservas confirmadas se aplica mediante el trigger existente.

begin;

create or replace function public.cancel_customer_reservation(
  p_reservation_id uuid,
  p_customer_id uuid,
  p_actor_id uuid,
  p_cancellation_reason text default null
)
returns table (
  reservation_status public.reservation_status,
  payment_status public.payment_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations%rowtype;
  v_payment public.payments%rowtype;
begin
  if p_reservation_id is null or p_customer_id is null or p_actor_id is null then
    raise exception 'La identidad y la reserva son obligatorias';
  end if;

  if p_customer_id <> p_actor_id then
    raise exception 'No tienes permiso para cancelar esta reserva';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_customer_id
      and status = 'active'
  ) then
    raise exception 'La cuenta no está disponible para cancelar reservas';
  end if;

  select *
    into v_reservation
  from public.reservations
  where id = p_reservation_id
    and customer_id = p_customer_id
  for update;

  if not found then
    raise exception 'No encontramos la reserva que deseas cancelar';
  end if;

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'Esta reserva ya no se puede cancelar';
  end if;

  update public.reservations
  set status = 'cancelled',
      cancellation_reason = nullif(trim(coalesce(p_cancellation_reason, '')), ''),
      updated_by = p_actor_id
  where id = v_reservation.id;

  if v_reservation.status = 'confirmed' then
    update public.payments
    set status = 'refunded',
        updated_by = p_actor_id
    where id = (
      select id
      from public.payments
      where reservation_id = v_reservation.id
        and status = 'approved'
      order by created_at desc
      limit 1
    )
    returning * into v_payment;

    if not found then
      raise exception 'No encontramos el pago aprobado de esta reserva';
    end if;
  end if;

  return query
  select
    'cancelled'::public.reservation_status,
    case when v_payment.id is null then null else v_payment.status end;
end;
$$;

revoke all on function public.cancel_customer_reservation(uuid, uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.cancel_customer_reservation(uuid, uuid, uuid, text)
to service_role;

comment on function public.cancel_customer_reservation is
  'Permite que el cliente cancele su propia reserva y simula el reembolso de un pago aprobado.';

commit;
