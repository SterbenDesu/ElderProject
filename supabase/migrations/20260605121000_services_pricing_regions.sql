-- Services catalogue, per-caregiver pricing, optional extras, and Sofia regions.
--
-- services            (was service_categories) — renamed + extended.
-- caregiver_services  — NEW: a caregiver's chosen services with their own price.
-- service_extras      — NEW: per-caregiver optional add-ons with prices.
-- regions             — NEW: Sofia districts (launch geography).
-- caregiver_regions   — NEW: which districts a caregiver serves.
--
-- One-way rule: none of these tables hold elder data. Public reads are limited to
-- active catalogue rows and to the pricing/region rows of VISIBLE + VERIFIED
-- caregivers only (so hidden caregivers' prices never leak).

begin;

-- ---------------------------------------------------------------------------
-- 1. services  (was service_categories) — add slug, is_active, sort_order, ts
-- ---------------------------------------------------------------------------
alter table public.service_categories rename to services;

alter table public.services
  add column if not exists slug       text,
  add column if not exists is_active  boolean not null default true,
  add column if not exists sort_order int not null default 0,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill slugs from existing names, then enforce not-null + unique.
update public.services
   set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
 where slug is null;
alter table public.services alter column slug set not null;
alter table public.services add constraint services_slug_key unique (slug);

create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

-- Public read now also requires is_active. Replace the legacy policy.
drop policy if exists "service_categories_public_select_allowed" on public.services;
drop policy if exists "service_categories_admin_all" on public.services;
-- Everyone can read allowed + active services; only admins manage the catalogue.
create policy "services_public_select_active"
on public.services
for select
to anon, authenticated
using (is_allowed = true and is_active = true);

create policy "services_admin_all"
on public.services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. regions — Sofia districts (seeded separately in supabase/seed.sql)
-- ---------------------------------------------------------------------------
create table public.regions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  city       text not null default 'Sofia',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.regions enable row level security;

-- Anyone may read active regions (needed for search + caregiver region pickers).
create policy "regions_public_select_active"
on public.regions
for select
to anon, authenticated
using (is_active = true);

-- Only admins manage the region list.
create policy "regions_admin_all"
on public.regions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Now that regions exist, give caregiver_applications a typed region reference.
alter table public.caregiver_applications
  add column if not exists region_id uuid references public.regions(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. caregiver_services — per-caregiver price per service
-- ---------------------------------------------------------------------------
create table public.caregiver_services (
  id                   uuid primary key default gen_random_uuid(),
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  service_id           uuid not null references public.services(id) on delete restrict,
  price_amount         int not null,
  currency             text not null default 'EUR',
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint caregiver_services_price_check check (price_amount >= 0),
  constraint caregiver_services_unique unique (caregiver_profile_id, service_id)
);

create trigger caregiver_services_set_updated_at
before update on public.caregiver_services
for each row execute function public.set_updated_at();

alter table public.caregiver_services enable row level security;

-- Public read ONLY for active rows whose caregiver profile is visible + verified
-- (drives "from X" pricing + matching). Hidden caregivers' prices never leak.
create policy "caregiver_services_public_select_visible"
on public.caregiver_services
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = caregiver_services.caregiver_profile_id
      and cp.is_visible = true
      and cp.verification_status in ('verified_basic', 'trusted')
  )
);

-- A caregiver fully manages the price rows on their OWN profile.
create policy "caregiver_services_owner_all"
on public.caregiver_services
for all
to authenticated
using (
  exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = caregiver_services.caregiver_profile_id
      and cp.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = caregiver_services.caregiver_profile_id
      and cp.profile_id = auth.uid()
  )
);

create policy "caregiver_services_admin_all"
on public.caregiver_services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. service_extras — per-caregiver optional add-ons
-- ---------------------------------------------------------------------------
create table public.service_extras (
  id                   uuid primary key default gen_random_uuid(),
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  label                text not null,
  price_amount         int not null,
  currency             text not null default 'EUR',
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint service_extras_price_check check (price_amount >= 0)
);

create trigger service_extras_set_updated_at
before update on public.service_extras
for each row execute function public.set_updated_at();

alter table public.service_extras enable row level security;

-- Same visibility model as caregiver_services.
create policy "service_extras_public_select_visible"
on public.service_extras
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = service_extras.caregiver_profile_id
      and cp.is_visible = true
      and cp.verification_status in ('verified_basic', 'trusted')
  )
);

create policy "service_extras_owner_all"
on public.service_extras
for all
to authenticated
using (
  exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = service_extras.caregiver_profile_id
      and cp.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = service_extras.caregiver_profile_id
      and cp.profile_id = auth.uid()
  )
);

create policy "service_extras_admin_all"
on public.service_extras
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. caregiver_regions — which districts a caregiver serves
-- ---------------------------------------------------------------------------
create table public.caregiver_regions (
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  region_id            uuid not null references public.regions(id) on delete cascade,
  created_at           timestamptz not null default now(),
  primary key (caregiver_profile_id, region_id)
);

alter table public.caregiver_regions enable row level security;

-- Public read for visible + verified caregivers (needed for map/search matching).
create policy "caregiver_regions_public_select_visible"
on public.caregiver_regions
for select
to anon, authenticated
using (
  exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = caregiver_regions.caregiver_profile_id
      and cp.is_visible = true
      and cp.verification_status in ('verified_basic', 'trusted')
  )
);

create policy "caregiver_regions_owner_all"
on public.caregiver_regions
for all
to authenticated
using (
  exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = caregiver_regions.caregiver_profile_id
      and cp.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = caregiver_regions.caregiver_profile_id
      and cp.profile_id = auth.uid()
  )
);

create policy "caregiver_regions_admin_all"
on public.caregiver_regions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Indexes for filtering (service, region)
-- ---------------------------------------------------------------------------
create index services_active_sort_idx          on public.services (is_active, sort_order);
create index caregiver_services_caregiver_idx   on public.caregiver_services (caregiver_profile_id);
create index caregiver_services_service_idx     on public.caregiver_services (service_id);
create index service_extras_caregiver_idx       on public.service_extras (caregiver_profile_id);
create index caregiver_regions_region_idx       on public.caregiver_regions (region_id);

commit;
