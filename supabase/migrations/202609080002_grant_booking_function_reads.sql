-- Musaé Spa · Corrección de Fase 4
-- Las Edge Functions usan service_role solo en el servidor y requieren
-- permisos de lectura explícitos, además de la omisión de RLS de ese rol.

begin;

grant usage on schema public to service_role;

grant select on table
  public.services,
  public.business_hours,
  public.blocked_dates,
  public.reservations
to service_role;

commit;
