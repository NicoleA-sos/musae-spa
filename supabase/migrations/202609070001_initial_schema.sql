-- Musaé Spa · Fase 2
-- Esquema inicial, auditoría, reglas de negocio esenciales y Row Level Security.

begin;

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.app_role as enum ('admin', 'customer');
create type public.profile_status as enum ('active', 'inactive');
create type public.reservation_status as enum (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
);
create type public.payment_status as enum ('pending', 'approved', 'failed', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint profiles_email_not_blank check (length(trim(email)) > 0)
);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  display_order integer not null default 0 check (display_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint service_categories_name_not_blank check (length(trim(name)) > 0)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories (id) on delete restrict,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 480),
  price numeric(12, 2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint services_name_not_blank check (length(trim(name)) > 0),
  constraint services_name_per_category_unique unique (category_id, name)
);

-- day_of_week usa el formato de PostgreSQL: 0 = domingo y 6 = sábado.
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null unique check (day_of_week between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint business_hours_range check (opens_at < closes_at)
);

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null,
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create unique index blocked_dates_active_date_unique
  on public.blocked_dates (blocked_date)
  where is_active;

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  total_duration_minutes integer not null default 0 check (total_duration_minutes >= 0),
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  currency char(3) not null default 'PEN' check (currency = 'PEN'),
  status public.reservation_status not null default 'pending',
  customer_notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint reservations_time_range check (ends_at > starts_at)
);

-- Las reservas pendientes o confirmadas nunca pueden ocupar el mismo intervalo.
alter table public.reservations
  add constraint reservations_no_overlapping_active_slots
  exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'));

create table public.reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  quantity smallint not null default 1 check (quantity > 0 and quantity <= 10),
  service_name_snapshot text not null,
  duration_minutes_snapshot integer not null check (duration_minutes_snapshot > 0),
  unit_price_snapshot numeric(12, 2) not null check (unit_price_snapshot >= 0),
  line_total numeric(12, 2) generated always as (
    round(unit_price_snapshot * quantity::numeric, 2)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint reservation_items_service_name_not_blank check (length(trim(service_name_snapshot)) > 0)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  currency char(3) not null default 'PEN' check (currency = 'PEN'),
  status public.payment_status not null default 'pending',
  provider text not null default 'simulated',
  provider_reference text unique,
  approved_at timestamptz,
  processed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create index services_category_id_idx on public.services (category_id);
create index services_active_idx on public.services (is_active);
create index reservations_customer_starts_at_idx on public.reservations (customer_id, starts_at desc);
create index reservations_status_starts_at_idx on public.reservations (status, starts_at);
create index reservation_items_reservation_id_idx on public.reservation_items (reservation_id);
create index payments_reservation_id_idx on public.payments (reservation_id);

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.set_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;

  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by, new.created_by);
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    status,
    created_by,
    updated_by
  )
  values (
    new.id,
    coalesce(new.email, new.id::text || '@placeholder.invalid'),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    'customer',
    'active',
    new.id,
    new.id
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now(),
        updated_by = new.id;

  return new;
end;
$$;

create or replace function public.validate_reservation_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  local_start timestamp;
  local_end timestamp;
  opening_time time;
  closing_time time;
begin
  -- Un cambio de estado no vuelve a invalidar una reserva ya pasada.
  if tg_op = 'UPDATE'
    and new.starts_at = old.starts_at
    and new.ends_at = old.ends_at then
    return new;
  end if;

  if new.starts_at <= now() then
    raise exception 'No se permiten reservas en fechas u horarios pasados';
  end if;

  local_start := new.starts_at at time zone 'America/Lima';
  local_end := new.ends_at at time zone 'America/Lima';

  if local_start::date <> local_end::date then
    raise exception 'Una reserva debe iniciar y terminar el mismo día';
  end if;

  if exists (
    select 1
    from public.blocked_dates
    where blocked_date = local_start::date
      and is_active
  ) then
    raise exception 'La fecha seleccionada no está disponible';
  end if;

  select opens_at, closes_at
    into opening_time, closing_time
  from public.business_hours
  where day_of_week = extract(dow from local_start)::smallint
    and is_active;

  if not found then
    raise exception 'El salón no atiende el día seleccionado';
  end if;

  if local_start::time < opening_time or local_end::time > closing_time then
    raise exception 'El horario solicitado está fuera del horario de atención';
  end if;

  return new;
end;
$$;

create or replace function public.validate_reservation_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'confirmed'
    and new.status = 'cancelled'
    and old.starts_at < now() + interval '12 hours' then
    raise exception 'Una reserva confirmada solo puede cancelarse con 12 horas de anticipación';
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;

  return new;
end;
$$;

create or replace function public.snapshot_reservation_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_service record;
begin
  if tg_op = 'UPDATE' then
    if new.service_id <> old.service_id or new.quantity <> old.quantity then
      raise exception 'Los servicios de una reserva no se modifican directamente';
    end if;

    new.service_name_snapshot := old.service_name_snapshot;
    new.duration_minutes_snapshot := old.duration_minutes_snapshot;
    new.unit_price_snapshot := old.unit_price_snapshot;
    return new;
  end if;

  select name, duration_minutes, price
    into current_service
  from public.services
  where id = new.service_id
    and is_active;

  if not found then
    raise exception 'El servicio seleccionado no está disponible';
  end if;

  -- El precio y duración se guardan solo al crear el ítem.
  new.service_name_snapshot := current_service.name;
  new.duration_minutes_snapshot := current_service.duration_minutes;
  new.unit_price_snapshot := current_service.price;
  return new;
end;
$$;

create or replace function public.refresh_reservation_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reservation_id uuid;
  total_price numeric(12, 2);
  total_minutes integer;
begin
  if tg_op = 'DELETE' then
    target_reservation_id := old.reservation_id;
  else
    target_reservation_id := new.reservation_id;
  end if;

  select
    coalesce(sum(line_total), 0),
    coalesce(sum(duration_minutes_snapshot * quantity), 0)
  into total_price, total_minutes
  from public.reservation_items
  where reservation_id = target_reservation_id;

  if total_minutes <= 0 then
    raise exception 'Una reserva debe contener al menos un servicio';
  end if;

  update public.reservations
  set total_amount = total_price,
      total_duration_minutes = total_minutes,
      ends_at = starts_at + make_interval(mins => total_minutes)
  where id = target_reservation_id;

  return null;
end;
$$;

create or replace function public.validate_payment_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_total numeric(12, 2);
  reservation_currency char(3);
begin
  select total_amount, currency
    into reservation_total, reservation_currency
  from public.reservations
  where id = new.reservation_id;

  if not found then
    raise exception 'La reserva asociada al pago no existe';
  end if;

  if new.amount <> reservation_total or new.currency <> reservation_currency then
    raise exception 'El importe del pago debe coincidir con el total de la reserva';
  end if;

  if new.status = 'approved' and new.approved_at is null then
    new.approved_at := now();
  end if;

  return new;
end;
$$;

create trigger profiles_set_audit_fields
before insert or update on public.profiles
for each row execute function public.set_audit_fields();

create trigger service_categories_set_audit_fields
before insert or update on public.service_categories
for each row execute function public.set_audit_fields();

create trigger services_set_audit_fields
before insert or update on public.services
for each row execute function public.set_audit_fields();

create trigger business_hours_set_audit_fields
before insert or update on public.business_hours
for each row execute function public.set_audit_fields();

create trigger blocked_dates_set_audit_fields
before insert or update on public.blocked_dates
for each row execute function public.set_audit_fields();

create trigger reservations_validate_window
before insert or update of starts_at, ends_at on public.reservations
for each row execute function public.validate_reservation_window();

create trigger reservations_validate_cancellation
before update of status on public.reservations
for each row execute function public.validate_reservation_cancellation();

create trigger reservations_set_audit_fields
before insert or update on public.reservations
for each row execute function public.set_audit_fields();

create trigger reservation_items_snapshot
before insert or update on public.reservation_items
for each row execute function public.snapshot_reservation_item();

create trigger reservation_items_set_audit_fields
before insert or update on public.reservation_items
for each row execute function public.set_audit_fields();

create trigger reservation_items_refresh_totals
after insert or update or delete on public.reservation_items
for each row execute function public.refresh_reservation_totals();

create trigger payments_validate_amount
before insert or update of amount, currency, status, reservation_id on public.payments
for each row execute function public.validate_payment_amount();

create trigger payments_set_audit_fields
before insert or update on public.payments
for each row execute function public.set_audit_fields();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Perfiles para usuarios que ya existieran antes de aplicar la migración.
insert into public.profiles (id, email, full_name, created_by, updated_by)
select
  id,
  coalesce(email, id::text || '@placeholder.invalid'),
  nullif(trim(coalesce(raw_user_meta_data ->> 'full_name', '')), ''),
  id,
  id
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.business_hours enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;
alter table public.payments enable row level security;

-- No hay escrituras directas de reservas, pagos, catálogo u horarios desde el
-- navegador. Las Edge Functions verificarán rol, precio y disponibilidad.
revoke all on table public.profiles,
  public.service_categories,
  public.services,
  public.business_hours,
  public.blocked_dates,
  public.reservations,
  public.reservation_items,
  public.payments
from anon, authenticated;

grant select on public.service_categories, public.services, public.business_hours to anon;
grant select on public.profiles,
  public.service_categories,
  public.services,
  public.business_hours,
  public.blocked_dates,
  public.reservations,
  public.reservation_items,
  public.payments
to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant execute on function public.is_active_admin() to anon, authenticated;

create policy profiles_select_own_or_admin
on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_active_admin());

create policy profiles_update_own
on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy service_categories_public_read
on public.service_categories
for select to anon, authenticated
using (is_active or public.is_active_admin());

create policy services_public_read
on public.services
for select to anon, authenticated
using (
  (
    is_active
    and exists (
      select 1
      from public.service_categories
      where service_categories.id = services.category_id
        and service_categories.is_active
    )
  )
  or public.is_active_admin()
);

create policy business_hours_public_read
on public.business_hours
for select to anon, authenticated
using (is_active or public.is_active_admin());

create policy blocked_dates_admin_read
on public.blocked_dates
for select to authenticated
using (public.is_active_admin());

create policy reservations_select_own_or_admin
on public.reservations
for select to authenticated
using (customer_id = auth.uid() or public.is_active_admin());

create policy reservation_items_select_own_or_admin
on public.reservation_items
for select to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1
    from public.reservations
    where reservations.id = reservation_items.reservation_id
      and reservations.customer_id = auth.uid()
  )
);

create policy payments_select_own_or_admin
on public.payments
for select to authenticated
using (
  public.is_active_admin()
  or exists (
    select 1
    from public.reservations
    where reservations.id = payments.reservation_id
      and reservations.customer_id = auth.uid()
  )
);

comment on table public.reservation_items is
  'Snapshot de cada servicio y precio al momento de crear la reserva.';
comment on column public.reservations.currency is
  'La aplicación trabaja únicamente con soles peruanos (PEN).';
comment on column public.reservations.starts_at is
  'Se almacena en UTC y se valida con la zona America/Lima.';

commit;

