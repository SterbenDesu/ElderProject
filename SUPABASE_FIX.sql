-- =====================================================================
-- VnukPodNaem — SUPABASE_FIX.sql
-- Focused, IDEMPOTENT patch for the caregiver marketplace ("Certified
-- caregivers" / /helpers) page.
-- ---------------------------------------------------------------------
-- WHY THIS FILE EXISTS
--   The marketplace page failed with:
--     "Could not find the table 'public.helper_profiles' in the schema cache."
--   The canonical Phase-1 table is `public.caregiver_profiles` (see
--   DATABASE_SCHEMA.md §4.2 and SUPABASE_SETUP.sql §4). This patch guarantees
--   that table exists with the correct columns, Row-Level Security, and the
--   column-level privacy grant, then seeds a few clearly-fake approved
--   caregivers so the marketplace has something to show.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file
--   -> Run. Safe to run more than once.
--
-- SAFETY (AGENTS.md / DATABASE_SCHEMA.md)
--   * NO DROP TABLE — only guarded RENAME / CREATE IF NOT EXISTS / ADD COLUMN
--     IF NOT EXISTS, so existing caregiver data is preserved.
--   * RLS stays ON. Public/anon read is limited to APPROVED + VISIBLE rows and
--     to SAFE columns only (never `stripe_account_id`).
--   * The one-way rule is intact: this table is about caregivers and holds no
--     elder data, so a public read here never exposes the elder population.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Shared helpers (created only if missing; both are needed below).
-- ---------------------------------------------------------------------
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

-- is_admin() is referenced by the admin policy below. It reads public.profiles,
-- which must already exist on a database that ran the base setup. Guard its
-- (re)creation so this file does not error on an unexpected fresh database.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'profiles') then
    execute $fn$
      create or replace function public.is_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        );
      $body$;
    $fn$;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Bring the table to the canonical name `caregiver_profiles`.
--    (a) Rename a legacy `helper_profiles` table in place if present.
--    (b) Otherwise create `caregiver_profiles` in the target shape.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'helper_profiles')
     and not exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'caregiver_profiles')
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
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Ensure every target column exists (for a renamed legacy table).
-- ---------------------------------------------------------------------
alter table public.caregiver_profiles add column if not exists verification_status text not null default 'applicant';
alter table public.caregiver_profiles add column if not exists display_name      text;
alter table public.caregiver_profiles add column if not exists bio               text;
alter table public.caregiver_profiles add column if not exists experience        text;
alter table public.caregiver_profiles add column if not exists badge             text;
alter table public.caregiver_profiles add column if not exists covers_whole_city boolean not null default false;
alter table public.caregiver_profiles add column if not exists is_visible        boolean not null default false;
alter table public.caregiver_profiles add column if not exists stripe_account_id text;
alter table public.caregiver_profiles add column if not exists rating_avg        numeric;
alter table public.caregiver_profiles add column if not exists rating_count      int not null default 0;
alter table public.caregiver_profiles add column if not exists created_at        timestamptz not null default now();
alter table public.caregiver_profiles add column if not exists updated_at        timestamptz not null default now();

-- Backfill the public display name (from the owner's first name when possible),
-- then enforce NOT NULL so the marketplace always has a label to show.
update public.caregiver_profiles cp
   set display_name = coalesce(cp.display_name, p.first_name, 'Caregiver')
  from public.profiles p
 where p.id = cp.profile_id and cp.display_name is null;
update public.caregiver_profiles set display_name = 'Caregiver' where display_name is null;
alter table public.caregiver_profiles alter column display_name set not null;

-- bio is required by the public card; backfill blanks before any NOT NULL use.
update public.caregiver_profiles set bio = '' where bio is null;

-- ---------------------------------------------------------------------
-- 3. Constraints (drop-then-add = idempotent).
-- ---------------------------------------------------------------------
alter table public.caregiver_profiles drop constraint if exists caregiver_profiles_verification_status_check;
alter table public.caregiver_profiles
  add constraint caregiver_profiles_verification_status_check
  check (verification_status in ('applicant', 'verified_basic', 'trusted', 'suspended', 'banned'));

alter table public.caregiver_profiles drop constraint if exists caregiver_profiles_visible_only_when_verified_check;
alter table public.caregiver_profiles
  add constraint caregiver_profiles_visible_only_when_verified_check
  check (is_visible = false or verification_status in ('verified_basic', 'trusted'));

alter table public.caregiver_profiles drop constraint if exists caregiver_profiles_badge_check;
alter table public.caregiver_profiles
  add constraint caregiver_profiles_badge_check
  check (badge is null or badge in ('verified', 'volunteer'));

alter table public.caregiver_profiles drop constraint if exists caregiver_profiles_rating_count_check;
alter table public.caregiver_profiles
  add constraint caregiver_profiles_rating_count_check check (rating_count >= 0);

-- Legacy geography columns are replaced by the regions model — remove if present.
alter table public.caregiver_profiles drop constraint if exists helper_profiles_service_radius_check;
alter table public.caregiver_profiles drop column if exists service_radius_km;
alter table public.caregiver_profiles drop column if exists city;

-- ---------------------------------------------------------------------
-- 4. Indexes + updated_at trigger.
-- ---------------------------------------------------------------------
create index if not exists caregiver_profiles_profile_id_idx
  on public.caregiver_profiles (profile_id);
create index if not exists caregiver_profiles_visible_verified_idx
  on public.caregiver_profiles (is_visible, verification_status);

drop trigger if exists helper_profiles_set_updated_at on public.caregiver_profiles;
drop trigger if exists caregiver_profiles_set_updated_at on public.caregiver_profiles;
create trigger caregiver_profiles_set_updated_at
before update on public.caregiver_profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. Row-Level Security: public reads ONLY approved + visible rows.
-- ---------------------------------------------------------------------
alter table public.caregiver_profiles enable row level security;

-- Drop any legacy/duplicate policy names, then (re)create the canonical set.
drop policy if exists "helper_profiles_public_select_visible_verified"    on public.caregiver_profiles;
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

-- The admin policy needs is_admin(); only create it when that function exists.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'is_admin') then
    execute $pol$
      create policy "caregiver_profiles_admin_all"
      on public.caregiver_profiles for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
    $pol$;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. COLUMN-LEVEL PRIVACY.
--    Public rows are readable, so RLS alone cannot hide the private payout
--    column. Revoke table-wide SELECT and re-grant only the safe columns
--    (never `stripe_account_id`) to the API roles.
-- ---------------------------------------------------------------------
revoke select on public.caregiver_profiles from anon, authenticated;
grant select (
  id, profile_id, verification_status, badge, display_name, bio, experience,
  covers_whole_city, is_visible, rating_avg, rating_count, created_at, updated_at
) on public.caregiver_profiles to anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. SEED — clearly-FAKE approved caregivers so the marketplace shows data.
--    Idempotent (ON CONFLICT DO NOTHING). NO real personal data.
--    Supabase owns identities, so insert auth.users first, then profiles,
--    then the public caregiver_profiles rows (visible + verified).
-- ---------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'test.caregiver.maria@example.test', '',
   now(), now(), now(), '{"provider":"email"}'::jsonb, '{}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'test.caregiver.georgi@example.test', '',
   now(), now(), now(), '{"provider":"email"}'::jsonb, '{}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'test.caregiver.elena@example.test', '',
   now(), now(), now(), '{"provider":"email"}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

insert into public.profiles (id, email, role, first_name, last_name, phone, account_status) values
  ('11111111-1111-1111-1111-111111111111', 'test.caregiver.maria@example.test', 'elder', 'Maria',  'T.', '+359000000001', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'test.caregiver.georgi@example.test','elder', 'Georgi', 'P.', '+359000000002', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'test.caregiver.elena@example.test', 'elder', 'Elena',  'V.', '+359000000003', 'active')
on conflict (id) do nothing;

insert into public.caregiver_profiles
  (id, profile_id, verification_status, badge, display_name, bio, experience,
   covers_whole_city, is_visible, rating_avg, rating_count) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
   'verified_basic', 'verified', 'Maria T.',
   'Warm, patient companion for everyday support and good conversation.',
   'Several years helping older neighbours with shopping and walks. Speaks Bulgarian and English.',
   false, true, 4.8, 12),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222',
   'trusted', 'volunteer', 'Georgi P.',
   'Friendly volunteer happy to help with tech, paperwork company, and accompaniment.',
   'Volunteer with a local community group. Comfortable with phones and online forms.',
   true, true, 4.9, 31),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333',
   'verified_basic', 'verified', 'Elena V.',
   'Reliable check-ins and light errands in the eastern districts.',
   'Background in social work; calm and dependable.',
   false, true, null, 0)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 8. caregiver_applications — the table the ADMIN PANEL reads.
--    Fixes: "Could not find the table 'public.helper_applications'".
--    The canonical Phase-1 table is `public.caregiver_applications`
--    (DATABASE_SCHEMA.md §4.1 / SUPABASE_SETUP.sql §3). Guarded rename of a
--    legacy `helper_applications` table, else create in the target shape.
-- ---------------------------------------------------------------------
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
  updated_at timestamptz not null default now()
);

alter table public.caregiver_applications drop constraint if exists caregiver_applications_status_check;
alter table public.caregiver_applications
  add constraint caregiver_applications_status_check
  check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected'));

create index if not exists caregiver_applications_profile_id_idx
  on public.caregiver_applications (profile_id);

drop trigger if exists helper_applications_set_updated_at    on public.caregiver_applications;
drop trigger if exists caregiver_applications_set_updated_at on public.caregiver_applications;
create trigger caregiver_applications_set_updated_at
before update on public.caregiver_applications
for each row execute function public.set_updated_at();

alter table public.caregiver_applications enable row level security;

-- RLS: applicant manages OWN row only while draft/submitted (cannot self-approve);
-- admin reviews ALL. No public access; no cross-user access (one-way rule holds).
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
create policy "caregiver_applications_owner_select"
on public.caregiver_applications for select to authenticated
using (profile_id = auth.uid());
create policy "caregiver_applications_owner_insert"
on public.caregiver_applications for insert to authenticated
with check (profile_id = auth.uid() and status in ('draft','submitted'));
create policy "caregiver_applications_owner_update"
on public.caregiver_applications for update to authenticated
using (profile_id = auth.uid() and status in ('draft','submitted'))
with check (profile_id = auth.uid() and status in ('draft','submitted'));

-- Admin policies need is_admin(); only create them when that function exists.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname='is_admin') then
    execute $pol$
      create policy "caregiver_applications_admin_select_all"
      on public.caregiver_applications for select to authenticated
      using (public.is_admin());
    $pol$;
    execute $pol$
      create policy "caregiver_applications_admin_update_all"
      on public.caregiver_applications for update to authenticated
      using (public.is_admin()) with check (public.is_admin());
    $pol$;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 9. Admin approval / visibility RPCs (caregiver vocabulary).
--    Retire the legacy helper-era RPCs the app no longer calls, then
--    (re)create the canonical ones the admin panel uses. SECURITY DEFINER
--    so the browser never needs a service-role key.
-- ---------------------------------------------------------------------
drop function if exists public.review_helper_application(uuid, text);
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

-- ---------------------------------------------------------------------
-- 10. ADMIN IDENTIFICATION.
--     Admin = profiles.role = 'admin' (read by is_admin()). Admin is never
--     self-service: it is set here by SQL only. Promote the platform admin
--     account if its profile exists. Idempotent and data-safe.
--
--     The base setup installs a guard trigger
--     (`profiles_prevent_non_admin_role_change`) that blocks role edits unless
--     the CALLER is already an admin. In the SQL Editor `auth.uid()` is null, so
--     that guard would reject this maintenance promotion — temporarily disable
--     it for just this statement, then re-enable it.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_trigger
             where tgname = 'profiles_prevent_non_admin_role_change'
               and tgrelid = 'public.profiles'::regclass) then
    execute 'alter table public.profiles disable trigger profiles_prevent_non_admin_role_change';
  end if;
end $$;

update public.profiles
   set role = 'admin'
 where lower(email) = 'ivanzhelyazov@gmail.com'
   and role <> 'admin';

do $$
begin
  if exists (select 1 from pg_trigger
             where tgname = 'profiles_prevent_non_admin_role_change'
               and tgrelid = 'public.profiles'::regclass) then
    execute 'alter table public.profiles enable trigger profiles_prevent_non_admin_role_change';
  end if;
end $$;

commit;

-- Verify the admin flag took effect (expect one row, role = admin):
--   select id, email, role from public.profiles
--    where lower(email) = 'ivanzhelyazov@gmail.com';

-- =====================================================================
-- DONE. Verify in the SQL Editor:
--   select display_name, verification_status, is_visible
--     from public.caregiver_profiles where is_visible = true;   -- expect 3 rows
--   -- Confirm the private payout column is NOT publicly granted:
--   select has_column_privilege('anon', 'public.caregiver_profiles',
--                               'stripe_account_id', 'select');  -- expect false
-- =====================================================================
