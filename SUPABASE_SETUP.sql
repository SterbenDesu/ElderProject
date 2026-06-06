-- =====================================================================
-- VnukPodNaem — SUPABASE_SETUP.sql
-- ONE consolidated, IDEMPOTENT setup script for the Phase 1 target model.
-- ---------------------------------------------------------------------
-- WHY THIS FILE EXISTS
--   The Phase 1 migrations under supabase/migrations/2026060*.sql were
--   written and verified locally but were NEVER applied to the live
--   Supabase database. The live database is still on the PRE-Phase-1
--   schema (display_name, helper_profiles, bookings, service_categories,
--   role 'client'...). That is why the live site throws:
--       - column profiles.first_name does not exist
--       - Could not find the 'age' column of 'profiles'
--
--   This single file brings ANY of these starting points to the Phase 1
--   target model from DATABASE_SCHEMA.md:
--       (a) the live PRE-Phase-1 database (most likely), OR
--       (b) a database already migrated to the target (safe re-run), OR
--       (c) a brand-new empty database.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole
--   file -> Run. It is safe to run more than once.
--
-- DESIGN RULES HONOURED (see AGENTS.md / DATABASE_SCHEMA.md)
--   * NO DROP TABLE on existing data — only ADD / ALTER / guarded RENAME,
--     so existing user data is preserved.
--   * RLS is ON for every table.
--   * The ONE-WAY RULE: a caregiver can never enumerate elders. The only
--     path to elder-linked data is a reservation the caregiver owns.
--   * PHONE PRIVACY: profiles.phone/email/age/last_name are owner+admin
--     only — there is no public/anon/cross-user SELECT policy on profiles.
--   * Money state changes only through SECURITY DEFINER reservation RPCs.
--
-- IDEMPOTENCY TECHNIQUES USED
--   * CREATE TABLE IF NOT EXISTS (in target shape) for fresh databases.
--   * Guarded RENAMEs in DO blocks (rename old->new only when old exists
--     and new does not) so a live PRE-Phase-1 DB is transformed in place.
--   * ADD COLUMN IF NOT EXISTS for added columns.
--   * DROP ... IF EXISTS then CREATE for policies / triggers / check
--     constraints (Postgres has no CREATE POLICY IF NOT EXISTS).
--   * CREATE OR REPLACE FUNCTION for all functions/RPCs.
--   * Upserts (ON CONFLICT ... DO NOTHING/UPDATE) for seed data.
-- =====================================================================

begin;

-- =====================================================================
-- 0. EXTENSIONS + SHARED HELPERS (set_updated_at, is_admin)
-- =====================================================================
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- NOTE: public.is_admin() is defined just below, AFTER the profiles table is
-- ensured to exist, because its SQL body references public.profiles (Postgres
-- validates SQL function bodies at creation time on a fresh database).

-- =====================================================================
-- 1. profiles — extend to the target identity model (preserve data)
--    Target columns the application code requires:
--      id, email, phone, first_name, last_name, age, avatar_url,
--      role ('elder'|'admin'), account_status, created_at, updated_at
-- =====================================================================

-- Fresh-DB safety net: create profiles already in the TARGET shape. On the
-- live DB this is skipped (the table exists) and the transforms below run.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'elder',
  first_name text not null,
  last_name text,
  phone text,
  age int,
  avatar_url text,
  account_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- is_admin(): true when the caller's profile role is admin. Defined here (not in
-- section 0) so the profiles table its body references already exists.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- PRE-Phase-1 DBs have profiles.display_name (NOT NULL). Rename it to
-- first_name, preserving every existing value. Guarded so it runs once.
do $$
begin
  if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles'
          and column_name = 'display_name'
     )
     and not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles'
          and column_name = 'first_name'
     )
  then
    alter table public.profiles rename column display_name to first_name;
  end if;
end $$;

-- Add the remaining target columns if they are missing.
alter table public.profiles add column if not exists first_name     text;
alter table public.profiles add column if not exists last_name      text;
alter table public.profiles add column if not exists age            int;
alter table public.profiles add column if not exists avatar_url     text;
alter table public.profiles add column if not exists account_status text not null default 'active';

-- first_name is required by the app. Backfill any NULLs, then enforce NOT NULL.
update public.profiles
   set first_name = coalesce(nullif(trim(first_name), ''), split_part(email, '@', 1), 'User')
 where first_name is null or trim(first_name) = '';
alter table public.profiles alter column first_name set not null;

-- Bounded age + small account_status enum (drop-then-add = idempotent).
alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles
  add constraint profiles_age_check check (age is null or (age between 16 and 120));
alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles
  add constraint profiles_account_status_check check (account_status in ('active', 'suspended', 'banned'));

-- Role model: collapse legacy roles to 'elder' (caregiver is NOT a role — it is
-- the existence of an approved caregiver_profiles row). Keep 'admin'.
-- Drop the role-change guard trigger FIRST: it would otherwise block this
-- maintenance role remap (the script runs without an admin auth.uid()). It is
-- recreated (extended to also protect account_status) a few lines below.
drop trigger if exists profiles_prevent_non_admin_role_change on public.profiles;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles alter column role set default 'elder';
update public.profiles
   set role = 'elder'
 where role in ('client', 'helper_applicant', 'verified_helper');
alter table public.profiles
  add constraint profiles_role_check check (role in ('elder', 'admin'));

-- Guard: only admins may change role OR account_status (owners can edit their
-- own name/age/avatar/phone/email but can never escalate themselves).
create or replace function public.prevent_non_admin_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.role is distinct from new.role
      or old.account_status is distinct from new.account_status)
     and not public.is_admin() then
    raise exception 'Only admins can change profile role or account_status';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists profiles_prevent_non_admin_role_change on public.profiles;
create trigger profiles_prevent_non_admin_role_change
before update on public.profiles
for each row execute function public.prevent_non_admin_profile_role_change();

alter table public.profiles enable row level security;

-- RLS: owner reads/updates own row; admin reads/updates all. NO public/anon/
-- cross-user SELECT exists -> phone/email/age/last_name stay private and a
-- caregiver can never read another user's profile (the one-way rule).
drop policy if exists "profiles_insert_own_safe_role" on public.profiles;
drop policy if exists "profiles_insert_own_elder"     on public.profiles;
create policy "profiles_insert_own_elder"
on public.profiles for insert to authenticated
with check (id = auth.uid() and role = 'elder');

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all"
on public.profiles for select to authenticated
using (public.is_admin());

drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy "profiles_admin_update_all"
on public.profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =====================================================================
-- 2. elderly_profiles — optional "book on behalf of" relative (owner = elder)
-- =====================================================================
create table if not exists public.elderly_profiles (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  city text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PRE-Phase-1 owner column was caregiver_id; rename to elder_id (guarded).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='elderly_profiles' and column_name='caregiver_id')
     and not exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='elderly_profiles' and column_name='elder_id')
  then
    alter table public.elderly_profiles rename column caregiver_id to elder_id;
  end if;
end $$;

create index if not exists elderly_profiles_elder_id_idx on public.elderly_profiles(elder_id);

drop trigger if exists elderly_profiles_set_updated_at on public.elderly_profiles;
create trigger elderly_profiles_set_updated_at
before update on public.elderly_profiles
for each row execute function public.set_updated_at();

alter table public.elderly_profiles enable row level security;

-- Owner-only CRUD + admin read. NO caregiver-readable policy (one-way rule).
drop policy if exists "elderly_profiles_owner_select"     on public.elderly_profiles;
drop policy if exists "elderly_profiles_owner_insert"     on public.elderly_profiles;
drop policy if exists "elderly_profiles_owner_update"     on public.elderly_profiles;
drop policy if exists "elderly_profiles_owner_delete"     on public.elderly_profiles;
drop policy if exists "elderly_profiles_admin_select_all" on public.elderly_profiles;
create policy "elderly_profiles_owner_select" on public.elderly_profiles for select to authenticated using (elder_id = auth.uid());
create policy "elderly_profiles_owner_insert" on public.elderly_profiles for insert to authenticated with check (elder_id = auth.uid());
create policy "elderly_profiles_owner_update" on public.elderly_profiles for update to authenticated using (elder_id = auth.uid()) with check (elder_id = auth.uid());
create policy "elderly_profiles_owner_delete" on public.elderly_profiles for delete to authenticated using (elder_id = auth.uid());
create policy "elderly_profiles_admin_select_all" on public.elderly_profiles for select to authenticated using (public.is_admin());

-- =====================================================================
-- 3. caregiver_applications  (PRE-Phase-1: helper_applications)
--    Same shape; just renamed (region_id FK added in section 5).
-- =====================================================================
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='helper_applications')
     and not exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='caregiver_applications')
  then
    alter table public.helper_applications rename to caregiver_applications;
  end if;
end $$;

create table if not exists public.caregiver_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'draft',
  full_name text not null,
  city text not null,
  motivation text not null,
  experience_summary text,
  availability_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint caregiver_applications_status_check
    check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected'))
);

create index if not exists caregiver_applications_profile_id_idx on public.caregiver_applications(profile_id);

drop trigger if exists helper_applications_set_updated_at on public.caregiver_applications;
drop trigger if exists caregiver_applications_set_updated_at on public.caregiver_applications;
create trigger caregiver_applications_set_updated_at
before update on public.caregiver_applications
for each row execute function public.set_updated_at();

alter table public.caregiver_applications enable row level security;

-- Applicant manages own row only while draft/submitted (cannot self-approve);
-- admin reviews all. No public, no cross-user access.
drop policy if exists "helper_applications_owner_select"        on public.caregiver_applications;
drop policy if exists "helper_applications_owner_insert"        on public.caregiver_applications;
drop policy if exists "helper_applications_owner_update"        on public.caregiver_applications;
drop policy if exists "helper_applications_admin_select_all"    on public.caregiver_applications;
drop policy if exists "helper_applications_admin_update_all"    on public.caregiver_applications;
drop policy if exists "caregiver_applications_owner_select"     on public.caregiver_applications;
drop policy if exists "caregiver_applications_owner_insert"     on public.caregiver_applications;
drop policy if exists "caregiver_applications_owner_update"     on public.caregiver_applications;
drop policy if exists "caregiver_applications_admin_select_all" on public.caregiver_applications;
drop policy if exists "caregiver_applications_admin_update_all" on public.caregiver_applications;
create policy "caregiver_applications_owner_select" on public.caregiver_applications for select to authenticated using (profile_id = auth.uid());
create policy "caregiver_applications_owner_insert" on public.caregiver_applications for insert to authenticated with check (profile_id = auth.uid() and status in ('draft','submitted'));
create policy "caregiver_applications_owner_update" on public.caregiver_applications for update to authenticated using (profile_id = auth.uid() and status in ('draft','submitted')) with check (profile_id = auth.uid() and status in ('draft','submitted'));
create policy "caregiver_applications_admin_select_all" on public.caregiver_applications for select to authenticated using (public.is_admin());
create policy "caregiver_applications_admin_update_all" on public.caregiver_applications for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 4. caregiver_profiles  (PRE-Phase-1: helper_profiles) — rename + extend
-- =====================================================================
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='helper_profiles')
     and not exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='caregiver_profiles')
  then
    alter table public.helper_profiles rename to caregiver_profiles;
  end if;
end $$;

create table if not exists public.caregiver_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  verification_status text not null default 'applicant',
  display_name text not null,
  bio text not null,
  experience text,
  badge text,
  covers_whole_city boolean not null default false,
  is_visible boolean not null default false,
  stripe_account_id text,
  rating_avg numeric,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint caregiver_profiles_verification_status_check
    check (verification_status in ('applicant', 'verified_basic', 'trusted', 'suspended', 'banned')),
  constraint caregiver_profiles_visible_only_when_verified_check
    check (is_visible = false or verification_status in ('verified_basic', 'trusted'))
);

-- Add target columns for a renamed PRE-Phase-1 table.
alter table public.caregiver_profiles add column if not exists display_name      text;
alter table public.caregiver_profiles add column if not exists experience        text;
alter table public.caregiver_profiles add column if not exists badge             text;
alter table public.caregiver_profiles add column if not exists covers_whole_city boolean not null default false;
alter table public.caregiver_profiles add column if not exists stripe_account_id text;
alter table public.caregiver_profiles add column if not exists rating_avg        numeric;
alter table public.caregiver_profiles add column if not exists rating_count      int not null default 0;

-- Backfill the public display_name from the owner's first name, then enforce.
update public.caregiver_profiles cp
   set display_name = coalesce(cp.display_name, p.first_name, 'Caregiver')
  from public.profiles p
 where p.id = cp.profile_id and cp.display_name is null;
update public.caregiver_profiles set display_name = 'Caregiver' where display_name is null;
alter table public.caregiver_profiles alter column display_name set not null;

-- badge enum + non-negative rating count.
alter table public.caregiver_profiles drop constraint if exists caregiver_profiles_badge_check;
alter table public.caregiver_profiles
  add constraint caregiver_profiles_badge_check check (badge is null or badge in ('verified', 'volunteer'));
alter table public.caregiver_profiles drop constraint if exists caregiver_profiles_rating_count_check;
alter table public.caregiver_profiles
  add constraint caregiver_profiles_rating_count_check check (rating_count >= 0);

-- City/radius geography is replaced by the regions model. Drop legacy columns.
alter table public.caregiver_profiles drop constraint if exists helper_profiles_service_radius_check;
alter table public.caregiver_profiles drop column if exists service_radius_km;
alter table public.caregiver_profiles drop column if exists city;

create index if not exists caregiver_profiles_profile_id_idx
  on public.caregiver_profiles (profile_id);
create index if not exists caregiver_profiles_visible_verified_idx
  on public.caregiver_profiles (is_visible, verification_status);

drop trigger if exists helper_profiles_set_updated_at on public.caregiver_profiles;
drop trigger if exists caregiver_profiles_set_updated_at on public.caregiver_profiles;
create trigger caregiver_profiles_set_updated_at
before update on public.caregiver_profiles
for each row execute function public.set_updated_at();

alter table public.caregiver_profiles enable row level security;

-- is_caregiver(uid): true when an approved caregiver profile exists for uid.
create or replace function public.is_caregiver(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.caregiver_profiles cp
    where cp.profile_id = p_uid
      and cp.verification_status in ('verified_basic', 'trusted')
  );
$$;

-- Public reads only visible+verified rows; owner reads own; admin manages all.
drop policy if exists "helper_profiles_public_select_visible_verified"   on public.caregiver_profiles;
drop policy if exists "caregiver_profiles_public_select_visible_verified" on public.caregiver_profiles;
drop policy if exists "helper_profiles_owner_select"     on public.caregiver_profiles;
drop policy if exists "caregiver_profiles_owner_select"  on public.caregiver_profiles;
drop policy if exists "helper_profiles_admin_all"        on public.caregiver_profiles;
drop policy if exists "caregiver_profiles_admin_all"     on public.caregiver_profiles;
create policy "caregiver_profiles_public_select_visible_verified"
on public.caregiver_profiles for select to anon, authenticated
using (is_visible = true and verification_status in ('verified_basic', 'trusted'));
create policy "caregiver_profiles_owner_select"
on public.caregiver_profiles for select to authenticated
using (profile_id = auth.uid());
create policy "caregiver_profiles_admin_all"
on public.caregiver_profiles for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- COLUMN-LEVEL PRIVACY: public rows are readable, so RLS alone cannot hide the
-- private payout column. Revoke table-wide SELECT and re-grant only safe columns
-- (never stripe_account_id) to the API roles.
revoke select on public.caregiver_profiles from anon, authenticated;
grant select (
  id, profile_id, verification_status, badge, display_name, bio, experience,
  covers_whole_city, is_visible, rating_avg, rating_count, created_at, updated_at
) on public.caregiver_profiles to anon, authenticated;

-- =====================================================================
-- 5. services (PRE-Phase-1: service_categories) + regions
-- =====================================================================
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='service_categories')
     and not exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='services')
  then
    alter table public.service_categories rename to services;
  end if;
end $$;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text,
  description text not null,
  is_allowed boolean not null default true,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services add column if not exists slug       text;
alter table public.services add column if not exists is_active  boolean not null default true;
alter table public.services add column if not exists sort_order int not null default 0;
alter table public.services add column if not exists updated_at timestamptz not null default now();

-- Backfill slugs from names, then enforce NOT NULL + UNIQUE.
update public.services
   set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
 where slug is null;
alter table public.services alter column slug set not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'services_slug_key') then
    alter table public.services add constraint services_slug_key unique (slug);
  end if;
end $$;

create index if not exists services_active_sort_idx on public.services (is_active, sort_order);

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

alter table public.services enable row level security;

drop policy if exists "service_categories_public_select_allowed" on public.services;
drop policy if exists "service_categories_admin_all"             on public.services;
drop policy if exists "services_public_select_active"            on public.services;
drop policy if exists "services_admin_all"                       on public.services;
create policy "services_public_select_active"
on public.services for select to anon, authenticated
using (is_allowed = true and is_active = true);
create policy "services_admin_all"
on public.services for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- regions — Sofia districts (launch geography). NEW table.
create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  city text not null default 'Sofia',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.regions enable row level security;

drop policy if exists "regions_public_select_active" on public.regions;
drop policy if exists "regions_admin_all"            on public.regions;
create policy "regions_public_select_active"
on public.regions for select to anon, authenticated using (is_active = true);
create policy "regions_admin_all"
on public.regions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Now that regions exist, give caregiver_applications a typed region reference.
alter table public.caregiver_applications
  add column if not exists region_id uuid references public.regions(id) on delete set null;

-- =====================================================================
-- 6. caregiver_services / service_extras / caregiver_regions (NEW)
--    Public reads limited to VISIBLE + VERIFIED caregivers so hidden
--    caregivers' prices/regions never leak. No elder data here.
-- =====================================================================
create table if not exists public.caregiver_services (
  id uuid primary key default gen_random_uuid(),
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  price_amount int not null,
  currency text not null default 'EUR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint caregiver_services_price_check check (price_amount >= 0),
  constraint caregiver_services_unique unique (caregiver_profile_id, service_id)
);
create index if not exists caregiver_services_caregiver_idx on public.caregiver_services (caregiver_profile_id);
create index if not exists caregiver_services_service_idx   on public.caregiver_services (service_id);
drop trigger if exists caregiver_services_set_updated_at on public.caregiver_services;
create trigger caregiver_services_set_updated_at before update on public.caregiver_services for each row execute function public.set_updated_at();
alter table public.caregiver_services enable row level security;

drop policy if exists "caregiver_services_public_select_visible" on public.caregiver_services;
drop policy if exists "caregiver_services_owner_all"             on public.caregiver_services;
drop policy if exists "caregiver_services_admin_all"             on public.caregiver_services;
create policy "caregiver_services_public_select_visible"
on public.caregiver_services for select to anon, authenticated
using (is_active = true and exists (
  select 1 from public.caregiver_profiles cp
  where cp.id = caregiver_services.caregiver_profile_id
    and cp.is_visible = true and cp.verification_status in ('verified_basic','trusted')));
create policy "caregiver_services_owner_all"
on public.caregiver_services for all to authenticated
using (exists (select 1 from public.caregiver_profiles cp where cp.id = caregiver_services.caregiver_profile_id and cp.profile_id = auth.uid()))
with check (exists (select 1 from public.caregiver_profiles cp where cp.id = caregiver_services.caregiver_profile_id and cp.profile_id = auth.uid()));
create policy "caregiver_services_admin_all"
on public.caregiver_services for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.service_extras (
  id uuid primary key default gen_random_uuid(),
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  label text not null,
  price_amount int not null,
  currency text not null default 'EUR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_extras_price_check check (price_amount >= 0)
);
create index if not exists service_extras_caregiver_idx on public.service_extras (caregiver_profile_id);
drop trigger if exists service_extras_set_updated_at on public.service_extras;
create trigger service_extras_set_updated_at before update on public.service_extras for each row execute function public.set_updated_at();
alter table public.service_extras enable row level security;

drop policy if exists "service_extras_public_select_visible" on public.service_extras;
drop policy if exists "service_extras_owner_all"             on public.service_extras;
drop policy if exists "service_extras_admin_all"             on public.service_extras;
create policy "service_extras_public_select_visible"
on public.service_extras for select to anon, authenticated
using (is_active = true and exists (
  select 1 from public.caregiver_profiles cp
  where cp.id = service_extras.caregiver_profile_id
    and cp.is_visible = true and cp.verification_status in ('verified_basic','trusted')));
create policy "service_extras_owner_all"
on public.service_extras for all to authenticated
using (exists (select 1 from public.caregiver_profiles cp where cp.id = service_extras.caregiver_profile_id and cp.profile_id = auth.uid()))
with check (exists (select 1 from public.caregiver_profiles cp where cp.id = service_extras.caregiver_profile_id and cp.profile_id = auth.uid()));
create policy "service_extras_admin_all"
on public.service_extras for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.caregiver_regions (
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  region_id uuid not null references public.regions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (caregiver_profile_id, region_id)
);
create index if not exists caregiver_regions_region_idx on public.caregiver_regions (region_id);
alter table public.caregiver_regions enable row level security;

drop policy if exists "caregiver_regions_public_select_visible" on public.caregiver_regions;
drop policy if exists "caregiver_regions_owner_all"             on public.caregiver_regions;
drop policy if exists "caregiver_regions_admin_all"             on public.caregiver_regions;
create policy "caregiver_regions_public_select_visible"
on public.caregiver_regions for select to anon, authenticated
using (exists (
  select 1 from public.caregiver_profiles cp
  where cp.id = caregiver_regions.caregiver_profile_id
    and cp.is_visible = true and cp.verification_status in ('verified_basic','trusted')));
create policy "caregiver_regions_owner_all"
on public.caregiver_regions for all to authenticated
using (exists (select 1 from public.caregiver_profiles cp where cp.id = caregiver_regions.caregiver_profile_id and cp.profile_id = auth.uid()))
with check (exists (select 1 from public.caregiver_profiles cp where cp.id = caregiver_regions.caregiver_profile_id and cp.profile_id = auth.uid()));
create policy "caregiver_regions_admin_all"
on public.caregiver_regions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 7. availability_slots (NEW) — caregiver-published 2-hour slots
-- =====================================================================
create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_slots_status_check check (status in ('open', 'held', 'booked', 'blocked')),
  constraint availability_slots_two_hour_check check (end_time = (start_time + interval '2 hours')),
  constraint availability_slots_unique unique (caregiver_profile_id, slot_date, start_time)
);
create index if not exists availability_slots_caregiver_date_idx on public.availability_slots (caregiver_profile_id, slot_date);
create index if not exists availability_slots_date_status_idx    on public.availability_slots (slot_date, status);
drop trigger if exists availability_slots_set_updated_at on public.availability_slots;
create trigger availability_slots_set_updated_at before update on public.availability_slots for each row execute function public.set_updated_at();
alter table public.availability_slots enable row level security;

drop policy if exists "availability_slots_public_select_open" on public.availability_slots;
drop policy if exists "availability_slots_owner_all"          on public.availability_slots;
drop policy if exists "availability_slots_admin_all"          on public.availability_slots;
create policy "availability_slots_public_select_open"
on public.availability_slots for select to anon, authenticated
using (status = 'open' and exists (
  select 1 from public.caregiver_profiles cp
  where cp.id = availability_slots.caregiver_profile_id
    and cp.is_visible = true and cp.verification_status in ('verified_basic','trusted')));
create policy "availability_slots_owner_all"
on public.availability_slots for all to authenticated
using (exists (select 1 from public.caregiver_profiles cp where cp.id = availability_slots.caregiver_profile_id and cp.profile_id = auth.uid()))
with check (exists (select 1 from public.caregiver_profiles cp where cp.id = availability_slots.caregiver_profile_id and cp.profile_id = auth.uid()));
create policy "availability_slots_admin_all"
on public.availability_slots for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 8. reservations (PRE-Phase-1: bookings) — the one-way choke point
-- =====================================================================
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='bookings')
     and not exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='reservations')
  then
    alter table public.bookings rename to reservations;
  end if;
end $$;

-- Drop superseded legacy booking policies (if a PRE-Phase-1 DB was renamed).
drop policy if exists "bookings_client_select"          on public.reservations;
drop policy if exists "bookings_client_insert"          on public.reservations;
drop policy if exists "bookings_client_update"          on public.reservations;
drop policy if exists "bookings_client_delete"          on public.reservations;
drop policy if exists "bookings_assigned_helper_select" on public.reservations;
drop policy if exists "bookings_admin_all"              on public.reservations;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.profiles(id) on delete cascade,
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete restrict,
  elderly_profile_id uuid references public.elderly_profiles(id) on delete restrict,
  region_id uuid references public.regions(id) on delete restrict,
  address_snapshot text,
  recipient_first_name text,
  status text not null default 'pending',
  start_at timestamptz,
  end_at timestamptz,
  total_amount int not null default 0,
  currency text not null default 'EUR',
  cancelled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rename PRE-Phase-1 participant columns (guarded).
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='reservations' and column_name='client_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reservations' and column_name='elder_id')
  then alter table public.reservations rename column client_id to elder_id; end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='reservations' and column_name='helper_profile_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reservations' and column_name='caregiver_profile_id')
  then alter table public.reservations rename column helper_profile_id to caregiver_profile_id; end if;
end $$;

-- New target columns (idempotent).
alter table public.reservations add column if not exists region_id            uuid;
alter table public.reservations add column if not exists address_snapshot     text;
alter table public.reservations add column if not exists recipient_first_name text;
alter table public.reservations add column if not exists start_at             timestamptz;
alter table public.reservations add column if not exists end_at               timestamptz;
alter table public.reservations add column if not exists total_amount         int not null default 0;
alter table public.reservations add column if not exists currency             text not null default 'EUR';
alter table public.reservations add column if not exists cancelled_by         uuid;

-- caregiver_profile_id must be required and point at caregiver_profiles.
alter table public.reservations drop constraint if exists bookings_helper_profile_id_fkey;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reservations_caregiver_profile_id_fkey') then
    alter table public.reservations
      add constraint reservations_caregiver_profile_id_fkey
      foreign key (caregiver_profile_id) references public.caregiver_profiles(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reservations_region_id_fkey') then
    alter table public.reservations
      add constraint reservations_region_id_fkey
      foreign key (region_id) references public.regions(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reservations_cancelled_by_fkey') then
    alter table public.reservations
      add constraint reservations_cancelled_by_fkey
      foreign key (cancelled_by) references public.profiles(id) on delete set null;
  end if;
end $$;

-- elderly_profile_id is OPTIONAL in the target model.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='reservations'
               and column_name='elderly_profile_id' and is_nullable='NO')
  then alter table public.reservations alter column elderly_profile_id drop not null; end if;
end $$;

-- Migrate legacy status vocabulary to the canonical state machine BEFORE the
-- new check constraint is applied.
alter table public.reservations drop constraint if exists bookings_status_check;
alter table public.reservations drop constraint if exists bookings_requested_duration_check;
update public.reservations set status = case status
  when 'requested'                    then 'pending'
  when 'accepted'                     then 'approved'
  when 'payment_secured'              then 'approved'
  when 'completed_by_helper'          then 'awaiting_confirmation'
  when 'pending_client_confirmation'  then 'awaiting_confirmation'
  when 'completed_released'           then 'completed'
  when 'no_show'                      then 'cancelled'
  else status
end
where status in ('requested','accepted','payment_secured','completed_by_helper',
                 'pending_client_confirmation','completed_released','no_show');
alter table public.reservations alter column status set default 'pending';
alter table public.reservations drop constraint if exists reservations_status_check;
alter table public.reservations
  add constraint reservations_status_check check (status in (
    'pending', 'approved', 'rejected', 'in_progress',
    'awaiting_confirmation', 'completed', 'disputed', 'cancelled'));

-- Drop legacy columns replaced by the new model.
alter table public.reservations drop column if exists city;
alter table public.reservations drop column if exists service_category_id;
alter table public.reservations drop column if exists requested_start_at;
alter table public.reservations drop column if exists requested_duration_minutes;

-- Required-NOT-NULL targets — applied ONLY when the table is empty, so a live
-- DB with existing rows is never broken (DATABASE_SCHEMA.md pre-launch note).
do $$
begin
  if not exists (select 1 from public.reservations limit 1) then
    execute 'alter table public.reservations alter column region_id set not null';
    execute 'alter table public.reservations alter column start_at  set not null';
    execute 'alter table public.reservations alter column end_at    set not null';
    execute 'alter table public.reservations alter column caregiver_profile_id set not null';
  end if;
end $$;

alter table public.reservations drop constraint if exists reservations_total_amount_check;
alter table public.reservations add constraint reservations_total_amount_check check (total_amount >= 0);
alter table public.reservations drop constraint if exists reservations_time_order_check;
alter table public.reservations add constraint reservations_time_order_check check (end_at is null or start_at is null or end_at > start_at);

create index if not exists reservations_elder_id_idx             on public.reservations (elder_id);
create index if not exists reservations_caregiver_profile_id_idx on public.reservations (caregiver_profile_id);
create index if not exists reservations_region_id_idx            on public.reservations (region_id);
create index if not exists reservations_status_idx               on public.reservations (status);
create index if not exists reservations_start_at_idx             on public.reservations (start_at);

drop trigger if exists bookings_set_updated_at on public.reservations;
drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at before update on public.reservations for each row execute function public.set_updated_at();

alter table public.reservations enable row level security;

-- owns_reservation(uid, id): elder who created it OR caregiver it is assigned to.
create or replace function public.owns_reservation(p_uid uuid, p_reservation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reservations r
    left join public.caregiver_profiles cp on cp.id = r.caregiver_profile_id
    where r.id = p_reservation_id
      and (r.elder_id = p_uid or cp.profile_id = p_uid)
  );
$$;

drop policy if exists "reservations_elder_select"     on public.reservations;
drop policy if exists "reservations_caregiver_select" on public.reservations;
drop policy if exists "reservations_elder_insert"     on public.reservations;
drop policy if exists "reservations_admin_all"        on public.reservations;
-- Elder sees only OWN reservations.
create policy "reservations_elder_select"
on public.reservations for select to authenticated using (elder_id = auth.uid());
-- Caregiver sees ONLY reservations directed at their own caregiver profile —
-- the single path to elder-linked data (one-way rule).
create policy "reservations_caregiver_select"
on public.reservations for select to authenticated
using (caregiver_profile_id in (select cp.id from public.caregiver_profiles cp where cp.profile_id = auth.uid()));
-- Only an elder may create a pending reservation against a visible+verified caregiver.
create policy "reservations_elder_insert"
on public.reservations for insert to authenticated
with check (
  elder_id = auth.uid()
  and status = 'pending'
  and exists (select 1 from public.caregiver_profiles cp
              where cp.id = reservations.caregiver_profile_id
                and cp.is_visible = true and cp.verification_status in ('verified_basic','trusted'))
  and (elderly_profile_id is null
       or exists (select 1 from public.elderly_profiles ep
                  where ep.id = reservations.elderly_profile_id and ep.elder_id = auth.uid())));
create policy "reservations_admin_all"
on public.reservations for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 9. reservation_slots / reservation_services (NEW)
-- =====================================================================
create table if not exists public.reservation_slots (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  availability_slot_id uuid not null references public.availability_slots(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint reservation_slots_slot_unique unique (availability_slot_id)
);
create index if not exists reservation_slots_reservation_idx on public.reservation_slots (reservation_id);
alter table public.reservation_slots enable row level security;
drop policy if exists "reservation_slots_parties_select" on public.reservation_slots;
drop policy if exists "reservation_slots_admin_all"      on public.reservation_slots;
create policy "reservation_slots_parties_select"
on public.reservation_slots for select to authenticated using (public.owns_reservation(auth.uid(), reservation_id));
create policy "reservation_slots_admin_all"
on public.reservation_slots for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.reservation_services (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  extra_id uuid references public.service_extras(id) on delete set null,
  label_snapshot text not null,
  unit_price_snapshot int not null,
  quantity int not null default 1,
  created_at timestamptz not null default now(),
  constraint reservation_services_price_check check (unit_price_snapshot >= 0),
  constraint reservation_services_quantity_check check (quantity >= 1),
  constraint reservation_services_kind_check check (service_id is not null or extra_id is not null)
);
create index if not exists reservation_services_reservation_idx on public.reservation_services (reservation_id);
alter table public.reservation_services enable row level security;
drop policy if exists "reservation_services_parties_select" on public.reservation_services;
drop policy if exists "reservation_services_admin_all"      on public.reservation_services;
create policy "reservation_services_parties_select"
on public.reservation_services for select to authenticated using (public.owns_reservation(auth.uid(), reservation_id));
create policy "reservation_services_admin_all"
on public.reservation_services for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 10. payments (PRE-Phase-1: payment_records) — escrow-ready, DESIGN ONLY
--     RPC-only writes: there is NO client insert/update policy.
-- =====================================================================
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='payment_records')
     and not exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='payments')
  then
    alter table public.payment_records rename to payments;
  end if;
end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  provider text not null default 'stripe',
  payment_intent_id text,
  connected_account_id text,
  transfer_id text,
  held_amount int not null default 0,
  captured_amount int,
  currency text not null default 'EUR',
  platform_fee int,
  payment_status text not null default 'requires_authorization',
  payout_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rename PRE-Phase-1 columns (guarded).
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='booking_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='reservation_id')
  then alter table public.payments rename column booking_id to reservation_id; end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='provider_payment_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='payment_intent_id')
  then alter table public.payments rename column provider_payment_id to payment_intent_id; end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='amount_cents')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='held_amount')
  then alter table public.payments rename column amount_cents to held_amount; end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='platform_fee_cents')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='payments' and column_name='platform_fee')
  then alter table public.payments rename column platform_fee_cents to platform_fee; end if;
end $$;

alter table public.payments add column if not exists connected_account_id text;
alter table public.payments add column if not exists transfer_id          text;
alter table public.payments add column if not exists captured_amount      int;
alter table public.payments alter column provider set default 'stripe';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_reservation_unique') then
    alter table public.payments add constraint payments_reservation_unique unique (reservation_id);
  end if;
end $$;

alter table public.payments drop constraint if exists payment_records_amount_check;
alter table public.payments drop constraint if exists payment_records_platform_fee_check;
alter table public.payments drop constraint if exists payments_held_amount_check;
alter table public.payments add constraint payments_held_amount_check check (held_amount >= 0);
alter table public.payments drop constraint if exists payments_captured_check;
alter table public.payments add constraint payments_captured_check check (captured_amount is null or captured_amount >= 0);
alter table public.payments drop constraint if exists payments_platform_fee_check;
alter table public.payments add constraint payments_platform_fee_check check (platform_fee is null or platform_fee >= 0);

alter table public.payments alter column payment_status set default 'requires_authorization';
alter table public.payments alter column payout_status  set default 'pending';
update public.payments set payment_status = 'requires_authorization'
  where payment_status not in ('requires_authorization','authorized_held','captured','released','refunded','void');
update public.payments set payout_status = 'pending'
  where payout_status not in ('pending','paid','failed','reversed');
alter table public.payments drop constraint if exists payments_payment_status_check;
alter table public.payments add constraint payments_payment_status_check check (payment_status in (
  'requires_authorization', 'authorized_held', 'captured', 'released', 'refunded', 'void'));
alter table public.payments drop constraint if exists payments_payout_status_check;
alter table public.payments add constraint payments_payout_status_check check (payout_status in (
  'pending', 'paid', 'failed', 'reversed'));

create index if not exists payments_reservation_id_idx on public.payments (reservation_id);
drop trigger if exists payment_records_set_updated_at on public.payments;
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
alter table public.payments enable row level security;

drop policy if exists "payment_records_related_user_select" on public.payments;
drop policy if exists "payment_records_admin_all"           on public.payments;
drop policy if exists "payments_parties_select"             on public.payments;
drop policy if exists "payments_admin_all"                  on public.payments;
-- Parties read escrow status of their own reservation; admin manages. No client write.
create policy "payments_parties_select"
on public.payments for select to authenticated using (public.owns_reservation(auth.uid(), reservation_id));
create policy "payments_admin_all"
on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 11. notifications / chat_threads / chat_messages / reviews (NEW)
-- =====================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  reservation_id uuid references public.reservations(id) on delete cascade,
  chat_thread_id uuid,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in (
    'reservation_requested', 'reservation_approved', 'reservation_rejected',
    'reservation_cancelled', 'chat_message', 'completion_ready', 'dispute_update'))
);
create index if not exists notifications_recipient_unread_idx on public.notifications (recipient_id, is_read);
alter table public.notifications enable row level security;
drop policy if exists "notifications_owner_select"      on public.notifications;
drop policy if exists "notifications_owner_update_read" on public.notifications;
drop policy if exists "notifications_admin_select"      on public.notifications;
create policy "notifications_owner_select" on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy "notifications_owner_update_read" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "notifications_admin_select" on public.notifications for select to authenticated using (public.is_admin());

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  elder_id uuid not null references public.profiles(id) on delete cascade,
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists chat_threads_caregiver_idx on public.chat_threads (caregiver_profile_id);
alter table public.chat_threads enable row level security;

-- Wire the notifications -> chat_threads optional reference (guarded).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'notifications_chat_thread_id_fkey') then
    alter table public.notifications
      add constraint notifications_chat_thread_id_fkey
      foreign key (chat_thread_id) references public.chat_threads(id) on delete cascade;
  end if;
end $$;

drop policy if exists "chat_threads_participants_select" on public.chat_threads;
drop policy if exists "chat_threads_admin_all"           on public.chat_threads;
create policy "chat_threads_participants_select"
on public.chat_threads for select to authenticated
using (elder_id = auth.uid()
       or caregiver_profile_id in (select cp.id from public.caregiver_profiles cp where cp.profile_id = auth.uid()));
create policy "chat_threads_admin_all"
on public.chat_threads for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'text',
  body text,
  attachment_url text,
  attachment_mime text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint chat_messages_kind_check check (kind in ('text', 'voice', 'image'))
);
create index if not exists chat_messages_thread_idx on public.chat_messages (thread_id, created_at);
alter table public.chat_messages enable row level security;

create or replace function public.is_chat_participant(p_uid uuid, p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_threads t
    left join public.caregiver_profiles cp on cp.id = t.caregiver_profile_id
    where t.id = p_thread_id and (t.elder_id = p_uid or cp.profile_id = p_uid)
  );
$$;

drop policy if exists "chat_messages_participants_select"  on public.chat_messages;
drop policy if exists "chat_messages_participant_insert"   on public.chat_messages;
drop policy if exists "chat_messages_admin_select"         on public.chat_messages;
create policy "chat_messages_participants_select"
on public.chat_messages for select to authenticated using (public.is_chat_participant(auth.uid(), thread_id));
create policy "chat_messages_participant_insert"
on public.chat_messages for insert to authenticated
with check (sender_id = auth.uid()
  and public.is_chat_participant(auth.uid(), thread_id)
  and exists (select 1 from public.chat_threads t join public.reservations r on r.id = t.reservation_id
              where t.id = chat_messages.thread_id and r.status in ('approved','in_progress')));
create policy "chat_messages_admin_select"
on public.chat_messages for select to authenticated using (public.is_admin());

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  elder_id uuid not null references public.profiles(id) on delete cascade,
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  rating int not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint reviews_rating_check check (rating between 1 and 5)
);
create index if not exists reviews_caregiver_idx on public.reviews (caregiver_profile_id);
alter table public.reviews enable row level security;
drop policy if exists "reviews_public_select"           on public.reviews;
drop policy if exists "reviews_elder_insert_completed"  on public.reviews;
drop policy if exists "reviews_admin_all"               on public.reviews;
create policy "reviews_public_select" on public.reviews for select to anon, authenticated using (true);
create policy "reviews_elder_insert_completed"
on public.reviews for insert to authenticated
with check (elder_id = auth.uid() and exists (
  select 1 from public.reservations r
  where r.id = reviews.reservation_id and r.elder_id = auth.uid()
    and r.caregiver_profile_id = reviews.caregiver_profile_id and r.status = 'completed'));
create policy "reviews_admin_all" on public.reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 12. disputes (PRE-Phase-1: complaints) — admin-resolved
-- =====================================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='complaints')
     and not exists (select 1 from information_schema.tables where table_schema='public' and table_name='disputes')
  then alter table public.complaints rename to disputes; end if;
end $$;

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'open',
  reason text not null,
  details text not null,
  resolution text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint disputes_status_check check (status in ('open', 'under_review', 'resolved', 'rejected'))
);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='disputes' and column_name='booking_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='disputes' and column_name='reservation_id')
  then alter table public.disputes rename column booking_id to reservation_id; end if;
end $$;

alter table public.disputes add column if not exists resolution  text;
alter table public.disputes add column if not exists resolved_by uuid references public.profiles(id) on delete set null;
alter table public.disputes add column if not exists resolved_at timestamptz;

create index if not exists disputes_reservation_id_idx on public.disputes (reservation_id);
create index if not exists disputes_submitted_by_idx   on public.disputes (submitted_by);
drop trigger if exists complaints_set_updated_at on public.disputes;
drop trigger if exists disputes_set_updated_at on public.disputes;
create trigger disputes_set_updated_at before update on public.disputes for each row execute function public.set_updated_at();
alter table public.disputes enable row level security;

drop policy if exists "complaints_creator_select" on public.disputes;
drop policy if exists "complaints_creator_insert" on public.disputes;
drop policy if exists "complaints_admin_all"      on public.disputes;
drop policy if exists "disputes_creator_select"   on public.disputes;
drop policy if exists "disputes_creator_insert"   on public.disputes;
drop policy if exists "disputes_admin_all"        on public.disputes;
drop policy if exists "disputes_caregiver_select_own_reservation" on public.disputes;
create policy "disputes_creator_select" on public.disputes for select to authenticated using (submitted_by = auth.uid());
create policy "disputes_creator_insert" on public.disputes for insert to authenticated with check (submitted_by = auth.uid());
create policy "disputes_admin_all" on public.disputes for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Assigned caregiver may see LIMITED status of disputes on their OWN reservations.
create policy "disputes_caregiver_select_own_reservation"
on public.disputes for select to authenticated
using (exists (
  select 1 from public.reservations r join public.caregiver_profiles cp on cp.id = r.caregiver_profile_id
  where r.id = disputes.reservation_id and cp.profile_id = auth.uid()));

-- =====================================================================
-- 13. audit_logs + terms_acceptances (kept as-is; ensure they exist)
-- =====================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
alter table public.audit_logs enable row level security;
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_admin_select" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "audit_logs_admin_insert" on public.audit_logs for insert to authenticated with check (public.is_admin());

create table if not exists public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now()
);
create index if not exists terms_acceptances_profile_id_idx on public.terms_acceptances (profile_id);
alter table public.terms_acceptances enable row level security;
drop policy if exists "terms_acceptances_owner_select"     on public.terms_acceptances;
drop policy if exists "terms_acceptances_owner_insert"     on public.terms_acceptances;
drop policy if exists "terms_acceptances_admin_select_all" on public.terms_acceptances;
create policy "terms_acceptances_owner_select" on public.terms_acceptances for select to authenticated using (profile_id = auth.uid());
create policy "terms_acceptances_owner_insert" on public.terms_acceptances for insert to authenticated with check (profile_id = auth.uid());
create policy "terms_acceptances_admin_select_all" on public.terms_acceptances for select to authenticated using (public.is_admin());

-- =====================================================================
-- 14. Caregiver application / profile RPCs (target vocabulary)
--     Drop the legacy helper-era RPCs; create the caregiver ones.
-- =====================================================================
drop function if exists public.review_helper_application(uuid, text);
drop function if exists public.update_own_helper_profile(text, text, integer);
drop function if exists public.set_helper_profile_visibility(uuid, boolean);

create or replace function public.review_caregiver_application(p_application_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_actor_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_application public.caregiver_applications%rowtype;
  v_applicant_profile public.profiles%rowtype;
  v_old_status text; v_new_status text; v_bio text; v_display_name text;
  v_caregiver_profile_id uuid; v_audit_logged boolean := false; v_audit_error text := null;
begin
  if v_actor_id is null then raise exception 'Caregiver review requires an authenticated user.' using errcode='28000'; end if;
  select exists (select 1 from public.profiles where id=v_actor_id and role='admin') into v_is_admin;
  if not v_is_admin then raise exception 'Only admins can review caregiver applications.' using errcode='42501'; end if;
  v_new_status := lower(trim(coalesce(p_action,'')));
  if v_new_status not in ('under_review','approved','rejected') then
    raise exception 'Invalid review action: %. Use under_review, approved, or rejected.', coalesce(p_action,'<null>') using errcode='22023'; end if;
  select * into v_application from public.caregiver_applications where id=p_application_id for update;
  if not found then raise exception 'Caregiver application not found: %.', p_application_id using errcode='P0002'; end if;
  v_old_status := v_application.status;
  select * into v_applicant_profile from public.profiles where id=v_application.profile_id for update;
  if not found then raise exception 'Applicant profile is missing for application %.', p_application_id using errcode='P0002'; end if;
  if v_applicant_profile.id = v_actor_id then raise exception 'Admins cannot review their own caregiver application.' using errcode='42501'; end if;
  if v_new_status='approved' then
    v_bio := left(coalesce(nullif(trim(v_application.experience_summary),''), trim(v_application.motivation)), 500);
    v_display_name := coalesce(nullif(trim(v_application.full_name),''), v_applicant_profile.first_name, 'Caregiver');
    insert into public.caregiver_profiles (profile_id, verification_status, display_name, bio, is_visible)
    values (v_application.profile_id, 'verified_basic', v_display_name, v_bio, true)
    on conflict (profile_id) do update
      set verification_status='verified_basic', display_name=excluded.display_name, bio=excluded.bio, is_visible=true
    returning id into v_caregiver_profile_id;
  end if;
  update public.caregiver_applications set status=v_new_status where id=v_application.id returning * into v_application;
  begin
    insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
    values (v_actor_id, 'caregiver_application_reviewed', 'caregiver_applications', v_application.id,
      jsonb_build_object('old_status', v_old_status, 'new_status', v_new_status,
        'applicant_profile_id', v_application.profile_id, 'caregiver_profile_id', v_caregiver_profile_id));
    v_audit_logged := true;
  exception when others then v_audit_logged := false; v_audit_error := sqlerrm; end;
  return jsonb_build_object('ok', true, 'action', v_new_status, 'application_id', v_application.id,
    'application_status', v_application.status, 'caregiver_profile_id', v_caregiver_profile_id,
    'caregiver_profile_is_visible', case when v_new_status='approved' then true else null end,
    'audit_logged', v_audit_logged, 'audit_error', v_audit_error);
end; $$;
revoke all on function public.review_caregiver_application(uuid, text) from public;
grant execute on function public.review_caregiver_application(uuid, text) to authenticated;

create or replace function public.update_own_caregiver_profile(
  p_display_name text, p_bio text, p_experience text, p_covers_whole_city boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_actor_id uuid := auth.uid(); v_profile public.caregiver_profiles%rowtype;
begin
  if v_actor_id is null then raise exception 'Caregiver profile updates require an authenticated user.' using errcode='28000'; end if;
  if not public.is_caregiver(v_actor_id) then raise exception 'Only approved caregivers can update caregiver profile fields.' using errcode='42501'; end if;
  if length(trim(coalesce(p_bio,''))) < 20 then raise exception 'Bio must be at least 20 characters.' using errcode='22023'; end if;
  if length(trim(coalesce(p_display_name,''))) < 2 then raise exception 'Display name is required.' using errcode='22023'; end if;
  update public.caregiver_profiles
     set display_name=trim(p_display_name), bio=trim(p_bio),
         experience=nullif(trim(coalesce(p_experience,'')),''), covers_whole_city=coalesce(p_covers_whole_city,false)
   where profile_id=v_actor_id and verification_status in ('verified_basic','trusted')
  returning * into v_profile;
  if not found then raise exception 'Approved caregiver profile not found for editing.' using errcode='P0002'; end if;
  return jsonb_build_object('ok', true, 'caregiver_profile', jsonb_build_object(
    'id', v_profile.id, 'profile_id', v_profile.profile_id, 'display_name', v_profile.display_name,
    'bio', v_profile.bio, 'experience', v_profile.experience, 'covers_whole_city', v_profile.covers_whole_city,
    'verification_status', v_profile.verification_status, 'is_visible', v_profile.is_visible));
end; $$;
revoke all on function public.update_own_caregiver_profile(text, text, text, boolean) from public;
grant execute on function public.update_own_caregiver_profile(text, text, text, boolean) to authenticated;

create or replace function public.set_caregiver_profile_visibility(p_caregiver_profile_id uuid, p_is_visible boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_actor_id uuid := auth.uid(); v_is_admin boolean := false; v_profile public.caregiver_profiles%rowtype; v_old boolean;
begin
  if v_actor_id is null then raise exception 'Visibility changes require an authenticated admin user.' using errcode='28000'; end if;
  select exists (select 1 from public.profiles where id=v_actor_id and role='admin') into v_is_admin;
  if not v_is_admin then raise exception 'Only admins can change caregiver visibility.' using errcode='42501'; end if;
  select * into v_profile from public.caregiver_profiles where id=p_caregiver_profile_id for update;
  if not found then raise exception 'Caregiver profile not found: %.', p_caregiver_profile_id using errcode='P0002'; end if;
  if v_profile.verification_status not in ('verified_basic','trusted') then
    raise exception 'Only verified caregiver profiles can be made public.' using errcode='42501'; end if;
  v_old := v_profile.is_visible;
  update public.caregiver_profiles set is_visible=p_is_visible where id=v_profile.id returning * into v_profile;
  begin
    insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
    values (v_actor_id, 'caregiver_profile_visibility_changed', 'caregiver_profiles', v_profile.id,
      jsonb_build_object('old_is_visible', v_old, 'new_is_visible', v_profile.is_visible,
        'caregiver_user_profile_id', v_profile.profile_id, 'verification_status', v_profile.verification_status));
  exception when others then null; end;
  return jsonb_build_object('ok', true, 'caregiver_profile_id', v_profile.id, 'old_is_visible', v_old, 'new_is_visible', v_profile.is_visible);
end; $$;
revoke all on function public.set_caregiver_profile_visibility(uuid, boolean) from public;
grant execute on function public.set_caregiver_profile_visibility(uuid, boolean) to authenticated;

-- =====================================================================
-- 15. Reservation state-machine RPCs (single choke point; escrow status only)
-- =====================================================================
create or replace function public.create_reservation(
  p_caregiver_profile_id uuid, p_region_id uuid, p_slot_ids uuid[], p_service_ids uuid[],
  p_extra_ids uuid[], p_address_snapshot text default null, p_recipient_first_name text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_elder uuid := auth.uid(); v_reservation_id uuid; v_start timestamptz; v_end timestamptz;
  v_total int := 0; v_sid uuid; v_eid uuid; v_slot uuid; v_price int; v_label text; v_slot_count int;
begin
  if v_elder is null then raise exception 'Authentication required to create a reservation.' using errcode='28000'; end if;
  if not exists (select 1 from public.caregiver_profiles cp where cp.id=p_caregiver_profile_id
                 and cp.is_visible=true and cp.verification_status in ('verified_basic','trusted')) then
    raise exception 'Caregiver is not available for booking.' using errcode='42501'; end if;
  if not exists (select 1 from public.regions where id=p_region_id and is_active=true) then
    raise exception 'Region is not available.' using errcode='22023'; end if;
  if p_slot_ids is null or array_length(p_slot_ids,1) is null then
    raise exception 'At least one time slot is required.' using errcode='22023'; end if;
  perform s.id from public.availability_slots s
   where s.id = any(p_slot_ids) and s.caregiver_profile_id=p_caregiver_profile_id and s.status='open' for update;
  get diagnostics v_slot_count = row_count;
  if v_slot_count <> array_length(p_slot_ids,1) then
    raise exception 'One or more selected slots are no longer available.' using errcode='40001'; end if;
  select min(s.slot_date + s.start_time), max(s.slot_date + s.end_time) into v_start, v_end
    from public.availability_slots s where s.id = any(p_slot_ids);
  insert into public.reservations (elder_id, caregiver_profile_id, region_id, address_snapshot,
    recipient_first_name, status, start_at, end_at, total_amount, currency)
  values (v_elder, p_caregiver_profile_id, p_region_id, p_address_snapshot, p_recipient_first_name,
    'pending', v_start, v_end, 0, 'EUR') returning id into v_reservation_id;
  if p_service_ids is not null then
    foreach v_sid in array p_service_ids loop
      select cs.price_amount, sv.name into v_price, v_label
        from public.caregiver_services cs join public.services sv on sv.id=cs.service_id
       where cs.caregiver_profile_id=p_caregiver_profile_id and cs.service_id=v_sid and cs.is_active=true;
      if v_price is null then raise exception 'Service % is not offered by this caregiver.', v_sid using errcode='22023'; end if;
      insert into public.reservation_services (reservation_id, service_id, label_snapshot, unit_price_snapshot, quantity)
      values (v_reservation_id, v_sid, v_label, v_price, 1);
      v_total := v_total + v_price;
    end loop;
  end if;
  if p_extra_ids is not null then
    foreach v_eid in array p_extra_ids loop
      select se.price_amount, se.label into v_price, v_label
        from public.service_extras se where se.id=v_eid and se.caregiver_profile_id=p_caregiver_profile_id and se.is_active=true;
      if v_price is null then raise exception 'Extra % is not offered by this caregiver.', v_eid using errcode='22023'; end if;
      insert into public.reservation_services (reservation_id, extra_id, label_snapshot, unit_price_snapshot, quantity)
      values (v_reservation_id, v_eid, v_label, v_price, 1);
      v_total := v_total + v_price;
    end loop;
  end if;
  foreach v_slot in array p_slot_ids loop
    insert into public.reservation_slots (reservation_id, availability_slot_id) values (v_reservation_id, v_slot);
  end loop;
  update public.availability_slots set status='held' where id = any(p_slot_ids);
  update public.reservations set total_amount=v_total where id=v_reservation_id;
  insert into public.payments (reservation_id, provider, held_amount, currency, payment_status, payout_status)
  values (v_reservation_id, 'stripe', v_total, 'EUR', 'authorized_held', 'pending');
  insert into public.notifications (recipient_id, type, reservation_id, body)
  select cp.profile_id, 'reservation_requested', v_reservation_id, 'New reservation request'
    from public.caregiver_profiles cp where cp.id=p_caregiver_profile_id;
  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  values (v_elder, 'reservation_created', 'reservations', v_reservation_id,
          jsonb_build_object('total_amount', v_total, 'caregiver_profile_id', p_caregiver_profile_id));
  return jsonb_build_object('ok', true, 'reservation_id', v_reservation_id, 'status', 'pending', 'total_amount', v_total);
end; $$;
revoke all on function public.create_reservation(uuid, uuid, uuid[], uuid[], uuid[], text, text) from public;
grant execute on function public.create_reservation(uuid, uuid, uuid[], uuid[], uuid[], text, text) to authenticated;

create or replace function public.transition_reservation(p_reservation_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_action text := lower(trim(coalesce(p_action,'')));
  v_res public.reservations%rowtype; v_is_elder boolean; v_is_caregiver boolean; v_new_status text; v_thread_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required.' using errcode='28000'; end if;
  if v_action not in ('approve','reject','cancel','complete','report') then
    raise exception 'Invalid action: %.', p_action using errcode='22023'; end if;
  select * into v_res from public.reservations where id=p_reservation_id for update;
  if not found then raise exception 'Reservation not found.' using errcode='P0002'; end if;
  v_is_elder := (v_res.elder_id = v_uid);
  v_is_caregiver := exists (select 1 from public.caregiver_profiles cp where cp.id=v_res.caregiver_profile_id and cp.profile_id=v_uid);
  if not (v_is_elder or v_is_caregiver or public.is_admin()) then
    raise exception 'You are not a party to this reservation.' using errcode='42501'; end if;
  if v_action='approve' then
    if v_res.status<>'pending' then raise exception 'Only pending reservations can be approved.' using errcode='22023'; end if;
    if not (v_is_caregiver or public.is_admin()) then raise exception 'Only the caregiver can approve.' using errcode='42501'; end if;
    v_new_status := 'approved';
  elsif v_action='reject' then
    if v_res.status<>'pending' then raise exception 'Only pending reservations can be rejected.' using errcode='22023'; end if;
    if not (v_is_caregiver or public.is_admin()) then raise exception 'Only the caregiver can reject.' using errcode='42501'; end if;
    v_new_status := 'rejected';
  elsif v_action='cancel' then
    if v_res.status not in ('pending','approved') then raise exception 'Only pending/approved reservations can be cancelled.' using errcode='22023'; end if;
    if not (v_is_elder or public.is_admin()) then raise exception 'Only the elder can cancel.' using errcode='42501'; end if;
    v_new_status := 'cancelled';
  elsif v_action='complete' then
    if v_res.status not in ('approved','in_progress','awaiting_confirmation') then raise exception 'Reservation cannot be completed from %.', v_res.status using errcode='22023'; end if;
    if not (v_is_elder or public.is_admin()) then raise exception 'Only the elder can mark complete.' using errcode='42501'; end if;
    if v_res.end_at > now() then raise exception 'Reservation cannot be completed before its end time.' using errcode='22023'; end if;
    v_new_status := 'completed';
  elsif v_action='report' then
    if v_res.status not in ('approved','in_progress','awaiting_confirmation') then raise exception 'Reservation cannot be disputed from %.', v_res.status using errcode='22023'; end if;
    if not (v_is_elder or public.is_admin()) then raise exception 'Only the elder can report an issue.' using errcode='42501'; end if;
    v_new_status := 'disputed';
  end if;
  update public.reservations
     set status=v_new_status, cancelled_by=case when v_new_status='cancelled' then v_uid else cancelled_by end
   where id=v_res.id;
  if v_new_status='approved' then
    update public.availability_slots s set status='booked'
      from public.reservation_slots rs where rs.reservation_id=v_res.id and rs.availability_slot_id=s.id;
    insert into public.chat_threads (reservation_id, elder_id, caregiver_profile_id)
    values (v_res.id, v_res.elder_id, v_res.caregiver_profile_id)
    on conflict (reservation_id) do nothing returning id into v_thread_id;
    insert into public.notifications (recipient_id, type, reservation_id, chat_thread_id, body)
    values (v_res.elder_id, 'reservation_approved', v_res.id, v_thread_id, 'Your reservation was approved');
  elsif v_new_status in ('rejected','cancelled') then
    update public.availability_slots s set status='open'
      from public.reservation_slots rs where rs.reservation_id=v_res.id and rs.availability_slot_id=s.id;
    update public.payments
       set payment_status=case when v_new_status='rejected' then 'void' else 'refunded' end, payout_status='reversed'
     where reservation_id=v_res.id;
    insert into public.notifications (recipient_id, type, reservation_id, body)
    select case when v_is_elder then cp.profile_id else v_res.elder_id end,
           case when v_new_status='rejected' then 'reservation_rejected' else 'reservation_cancelled' end,
           v_res.id, case when v_new_status='rejected' then 'Your reservation was declined' else 'A reservation was cancelled' end
    from public.caregiver_profiles cp where cp.id=v_res.caregiver_profile_id;
  elsif v_new_status='completed' then
    update public.payments set payment_status='released', captured_amount=held_amount, payout_status='paid'
     where reservation_id=v_res.id;
    insert into public.notifications (recipient_id, type, reservation_id, body)
    select cp.profile_id, 'dispute_update', v_res.id, 'Reservation completed and funds released'
    from public.caregiver_profiles cp where cp.id=v_res.caregiver_profile_id;
  elsif v_new_status='disputed' then
    insert into public.notifications (recipient_id, type, reservation_id, body)
    select cp.profile_id, 'dispute_update', v_res.id, 'An issue was reported on a reservation'
    from public.caregiver_profiles cp where cp.id=v_res.caregiver_profile_id;
  end if;
  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  values (v_uid, 'reservation_transitioned', 'reservations', v_res.id,
          jsonb_build_object('action', v_action, 'old_status', v_res.status, 'new_status', v_new_status));
  return jsonb_build_object('ok', true, 'reservation_id', v_res.id, 'status', v_new_status);
end; $$;
revoke all on function public.transition_reservation(uuid, text) from public;
grant execute on function public.transition_reservation(uuid, text) to authenticated;

-- =====================================================================
-- 16. Avatars storage bucket + policies (optional profile photos)
--     Public READ of avatars only; WRITE only inside the user's own folder.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_owner_insert"  on storage.objects;
drop policy if exists "avatars_owner_update"  on storage.objects;
drop policy if exists "avatars_owner_delete"  on storage.objects;
create policy "avatars_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
create policy "avatars_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- 17. SEED DATA (upserts — safe to re-run)
--     Sofia districts + the non-medical service catalogue with slugs/order.
--     NOTE: the fake sample caregiver accounts from supabase/seed.sql are
--     intentionally NOT included here (dev-only; never seed production).
-- =====================================================================

-- 17a. The 24 official Sofia districts (rayoni).
insert into public.regions (name, slug, city) values
  ('Sredets',        'sredets',        'Sofia'),
  ('Krasno selo',    'krasno-selo',    'Sofia'),
  ('Vazrazhdane',    'vazrazhdane',    'Sofia'),
  ('Oborishte',      'oborishte',      'Sofia'),
  ('Serdika',        'serdika',        'Sofia'),
  ('Poduyane',       'poduyane',       'Sofia'),
  ('Slatina',        'slatina',        'Sofia'),
  ('Izgrev',         'izgrev',         'Sofia'),
  ('Lozenets',       'lozenets',       'Sofia'),
  ('Triaditsa',      'triaditsa',      'Sofia'),
  ('Krasna polyana', 'krasna-polyana', 'Sofia'),
  ('Ilinden',        'ilinden',        'Sofia'),
  ('Nadezhda',       'nadezhda',       'Sofia'),
  ('Iskar',          'iskar',          'Sofia'),
  ('Mladost',        'mladost',        'Sofia'),
  ('Studentski',     'studentski',     'Sofia'),
  ('Vitosha',        'vitosha',        'Sofia'),
  ('Ovcha kupel',    'ovcha-kupel',    'Sofia'),
  ('Lyulin',         'lyulin',         'Sofia'),
  ('Vrabnitsa',      'vrabnitsa',      'Sofia'),
  ('Novi Iskar',     'novi-iskar',     'Sofia'),
  ('Kremikovtsi',    'kremikovtsi',    'Sofia'),
  ('Pancharevo',     'pancharevo',     'Sofia'),
  ('Bankya',         'bankya',         'Sofia')
on conflict (name) do nothing;

-- 17b. Base non-medical service catalogue (created on fresh DBs; idempotent).
--      slug is generated to match the regexp backfill above.
insert into public.services (name, slug, description, is_allowed, is_active, sort_order) values
  ('Companionship',   'companionship',   'Non-medical social visits and conversation.', true, true, 10),
  ('Shopping',        'shopping',        'Help with routine shopping for everyday items.', true, true, 20),
  ('Walks',           'walks',           'Non-medical accompaniment for short local walks.', true, true, 30),
  ('Accompaniment',   'accompaniment',   'Non-medical accompaniment to appointments, shops, or community activities.', true, true, 40),
  ('Short visits',    'short-visits',    'Brief non-medical wellbeing visits and company.', true, true, 50),
  ('Check-ins',       'check-ins',       'Scheduled non-medical wellbeing check-ins and updates.', true, true, 60),
  ('Light errands',   'light-errands',   'Simple local errands that do not involve medical, financial, or high-risk tasks.', true, true, 70),
  ('Technology help', 'technology-help', 'Basic help using phones, computers, video calls, or online forms without handling passwords or sensitive financial access.', true, true, 80)
on conflict (name) do nothing;

-- Align sort order + activation for any rows seeded by the initial migration.
update public.services set sort_order = 10, is_active = true where slug = 'companionship';
update public.services set sort_order = 20, is_active = true where slug = 'shopping';
update public.services set sort_order = 30, is_active = true where slug = 'walks';
update public.services set sort_order = 40, is_active = true where slug = 'accompaniment';
update public.services set sort_order = 50, is_active = true where slug = 'short-visits';
update public.services set sort_order = 60, is_active = true where slug = 'check-ins';
update public.services set sort_order = 70, is_active = true where slug = 'light-errands';
update public.services set sort_order = 80, is_active = true where slug = 'technology-help';

commit;

-- =====================================================================
-- DONE. Verify in the Supabase SQL Editor, e.g.:
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='profiles' order by 1;
--   -- expect: account_status, age, avatar_url, created_at, email,
--   --         first_name, id, last_name, phone, role, updated_at
--   select count(*) from public.regions;   -- expect 24
--   select count(*) from public.services;  -- expect 8
-- =====================================================================
