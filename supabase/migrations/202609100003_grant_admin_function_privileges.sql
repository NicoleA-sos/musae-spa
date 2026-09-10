-- Musaé Spa · Permisos mínimos para la Edge Function de administración.
-- service_role omite RLS, pero igualmente necesita privilegios SQL explícitos.

begin;

grant usage on schema public to service_role;

grant select on table
  public.profiles,
  public.services,
  public.business_hours,
  public.blocked_dates,
  public.reservations,
  public.payments
to service_role;

grant insert, update on table
  public.services,
  public.blocked_dates
to service_role;

grant update on table
  public.business_hours,
  public.reservations
to service_role;

commit;
