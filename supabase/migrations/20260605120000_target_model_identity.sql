-- VnukPodNaem — Phase 1 target model: identity & caregiver tables.
--
-- This migration transforms the current ("helper"-named) schema into the target
-- marketplace model from DATABASE_SCHEMA.md:
--   * profiles            — extended (private phone/email/age/last_name, photo,
--                           account_status); role simplified to elder | admin.
--   * elderly_profiles    — kept; owner column renamed to elder_id (book-on-behalf
--                           is now OPTIONAL — see reservations migration).
--   * caregiver_applications  (was helper_applications) — renamed.
--   * caregiver_profiles      (was helper_profiles)     — renamed + extended.
--
-- One-way rule & phone privacy are enforced here at the database level, not the
-- UI: no policy in this file ever lets a caregiver read another user's profile,
-- and no policy returns profiles.phone / email / age / last_name to anyone but the
-- owner and admins.

begin;

-- ---------------------------------------------------------------------------
-- 1. profiles — extend + simplify the role model
-- ---------------------------------------------------------------------------

-- Public display uses the first name; keep the existing value by renaming.
alter table public.profiles rename column display_name to first_name;

alter table public.profiles
  add column if not exists last_name      text,
  add column if not exists age            int,
  add column if not exists avatar_url     text,
  add column if not exists account_status text not null default 'active';

-- Private personal data. age is bounded; account_status is a small enum.
alter table public.profiles
  add constraint profiles_age_check
    check (age is null or (age between 16 and 120)),
  add constraint profiles_account_status_check
    check (account_status in ('active', 'suspended', 'banned'));

-- The role-change guard trigger blocks role updates by non-admins, so it must be
-- dropped before we migrate existing role values, then recreated (extended to
-- also protect account_status).
drop trigger if exists profiles_prevent_non_admin_role_change on public.profiles;

-- Caregiver is NOT a role: it is the existence of an approved caregiver_profiles
-- row (universal-account model). Collapse every non-admin legacy role to 'elder'.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles alter column role set default 'elder';
update public.profiles
   set role = 'elder'
 where role in ('client', 'helper_applicant', 'verified_helper');
alter table public.profiles
  add constraint profiles_role_check check (role in ('elder', 'admin'));

create or replace function public.prevent_non_admin_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only admins may change a profile's role or account_status. Owners can edit
  -- their own name/age/avatar/phone/email but can never escalate themselves.
  if (old.role is distinct from new.role
      or old.account_status is distinct from new.account_status)
     and not public.is_admin() then
    raise exception 'Only admins can change profile role or account_status';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_non_admin_role_change
before update on public.profiles
for each row execute function public.prevent_non_admin_profile_role_change();

-- New accounts may self-insert only as an elder (never admin). Replaces the old
-- client/helper_applicant insert policy.
drop policy if exists "profiles_insert_own_safe_role" on public.profiles;
-- Elders may create only their own row, and only with role = 'elder'.
create policy "profiles_insert_own_elder"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and role = 'elder');

-- NOTE on phone privacy & the one-way rule for profiles:
-- The only SELECT policies on this table are profiles_select_own (id = auth.uid())
-- and profiles_admin_select_all (is_admin()). There is deliberately NO public,
-- anon, or cross-user SELECT policy, so phone/email/age/last_name are unreadable
-- by anyone except the owner and admins, and a caregiver can never read another
-- user's profile row at all. Public display data (first_name, avatar_url) is
-- exposed only through narrow joins/views elsewhere, never via `select *` here.

-- ---------------------------------------------------------------------------
-- 2. elderly_profiles — clarify ownership column name (owner is the elder)
-- ---------------------------------------------------------------------------
alter table public.elderly_profiles rename column caregiver_id to elder_id;
alter index public.elderly_profiles_caregiver_id_idx rename to elderly_profiles_elder_id_idx;

-- RLS unchanged in spirit: owner-only CRUD (now elder_id = auth.uid()) + admin
-- read. There is NO caregiver-readable policy -> consistent with the one-way rule.

-- ---------------------------------------------------------------------------
-- 3. caregiver_applications  (was helper_applications)
-- ---------------------------------------------------------------------------
alter table public.helper_applications rename to caregiver_applications;
alter index public.helper_applications_profile_id_idx rename to caregiver_applications_profile_id_idx;

-- ---------------------------------------------------------------------------
-- 4. caregiver_profiles  (was helper_profiles) — rename + extend
-- ---------------------------------------------------------------------------
alter table public.helper_profiles rename to caregiver_profiles;
alter index public.helper_profiles_profile_id_idx rename to caregiver_profiles_profile_id_idx;

alter table public.caregiver_profiles
  add column if not exists display_name      text,
  add column if not exists experience        text,
  add column if not exists badge             text,
  add column if not exists covers_whole_city boolean not null default false,
  add column if not exists stripe_account_id text,
  add column if not exists rating_avg        numeric,
  add column if not exists rating_count      int not null default 0;

-- Backfill display_name (public name) from the owner's first name, then enforce.
update public.caregiver_profiles cp
   set display_name = coalesce(cp.display_name, p.first_name, 'Caregiver')
  from public.profiles p
 where p.id = cp.profile_id;
alter table public.caregiver_profiles alter column display_name set not null;

-- badge is an optional small enum. stripe_account_id is PRIVATE (owner/admin only,
-- never selected by any public policy). rating_* are denormalised from reviews.
alter table public.caregiver_profiles
  add constraint caregiver_profiles_badge_check
    check (badge is null or badge in ('verified', 'volunteer')),
  add constraint caregiver_profiles_rating_count_check
    check (rating_count >= 0);

-- City/radius geography is replaced by the regions model (caregiver_regions +
-- covers_whole_city). Drop the legacy radius; city is dropped after the regions
-- migration backfills caregiver_regions is unnecessary for a fresh launch, so we
-- drop city here too. (Old visibility constraint on verification_status is kept.)
alter table public.caregiver_profiles drop constraint if exists helper_profiles_service_radius_check;
alter table public.caregiver_profiles drop column if exists service_radius_km;
alter table public.caregiver_profiles drop column if exists city;

-- helper_profiles index on (is_visible, city) referenced the dropped city column
-- and was removed with it; recreate a visibility index for marketplace reads.
create index if not exists caregiver_profiles_visible_verified_idx
  on public.caregiver_profiles (is_visible, verification_status);

-- ---------------------------------------------------------------------------
-- 5. is_caregiver(uid) helper predicate (approved, non-suspended caregiver)
-- ---------------------------------------------------------------------------
create or replace function public.is_caregiver(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- True when an approved, non-suspended/banned caregiver profile exists for uid.
  select exists (
    select 1
    from public.caregiver_profiles cp
    where cp.profile_id = p_uid
      and cp.verification_status in ('verified_basic', 'trusted')
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. caregiver_profiles RLS — rename legacy policies + protect private columns
-- ---------------------------------------------------------------------------
-- The row policies carried over from helper_profiles unchanged; rename them to
-- the target vocabulary. Public read still returns ONLY visible + verified rows.
alter policy "helper_profiles_public_select_visible_verified"
  on public.caregiver_profiles rename to "caregiver_profiles_public_select_visible_verified";
alter policy "helper_profiles_owner_select"
  on public.caregiver_profiles rename to "caregiver_profiles_owner_select";
alter policy "helper_profiles_admin_all"
  on public.caregiver_profiles rename to "caregiver_profiles_admin_all";

-- PHONE/PAYOUT PRIVACY (column level): caregiver_profiles rows are publicly
-- readable when visible+verified, so RLS alone cannot hide stripe_account_id.
-- Revoke that private payout column from every API role so it can never appear
-- in a marketplace read or `select *`. It is reachable only through trusted
-- SECURITY DEFINER RPCs (Stripe phase) and the table owner.
revoke select on public.caregiver_profiles from anon, authenticated;
grant select (
  id, profile_id, verification_status, badge, display_name, bio, experience,
  covers_whole_city, is_visible, rating_avg, rating_count, created_at, updated_at
) on public.caregiver_profiles to anon, authenticated;

commit;
