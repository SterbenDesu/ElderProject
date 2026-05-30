-- Initial VnukPodNaem Supabase schema.
-- This schema stores non-medical marketplace data only.
-- Do not store full card data, card PINs, medical instructions, or secrets in these tables.

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

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'client',
  display_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('client', 'helper_applicant', 'verified_helper', 'admin'))
);

create table public.elderly_profiles (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  city text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.elderly_profiles is 'Non-medical elderly profile details managed by a client or caregiver. Do not store unnecessary medical data here.';

create table public.helper_applications (
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
  constraint helper_applications_status_check check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected'))
);

create table public.helper_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  verification_status text not null default 'applicant',
  bio text not null,
  city text not null,
  service_radius_km integer,
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint helper_profiles_verification_status_check check (verification_status in ('applicant', 'verified_basic', 'trusted', 'suspended', 'banned')),
  constraint helper_profiles_service_radius_check check (service_radius_km is null or service_radius_km >= 0),
  constraint helper_profiles_visible_only_when_verified_check check (
    is_visible = false or verification_status in ('verified_basic', 'trusted')
  )
);

comment on table public.helper_profiles is 'Marketplace helper profiles. Helpers are independent marketplace participants, not platform employees.';

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  is_allowed boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  elderly_profile_id uuid not null references public.elderly_profiles(id) on delete restrict,
  helper_profile_id uuid references public.helper_profiles(id) on delete set null,
  service_category_id uuid not null references public.service_categories(id) on delete restrict,
  status text not null default 'requested',
  requested_start_at timestamptz,
  requested_duration_minutes integer,
  city text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_status_check check (status in (
    'requested',
    'accepted',
    'payment_secured',
    'in_progress',
    'completed_by_helper',
    'pending_client_confirmation',
    'completed_released',
    'disputed',
    'cancelled',
    'no_show'
  )),
  constraint bookings_requested_duration_check check (requested_duration_minutes is null or requested_duration_minutes > 0)
);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'open',
  reason text not null,
  details text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint complaints_status_check check (status in ('open', 'under_review', 'resolved', 'rejected'))
);

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  amount_cents integer not null,
  currency text not null default 'EUR',
  platform_fee_cents integer,
  payment_status text not null,
  payout_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_records_amount_check check (amount_cents >= 0),
  constraint payment_records_platform_fee_check check (platform_fee_cents is null or platform_fee_cents >= 0)
);

comment on table public.payment_records is 'Payment-provider status records only. Do not store full card data, card PINs, or cash-handling instructions.';

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now()
);

create index elderly_profiles_caregiver_id_idx on public.elderly_profiles(caregiver_id);
create index helper_applications_profile_id_idx on public.helper_applications(profile_id);
create index helper_profiles_profile_id_idx on public.helper_profiles(profile_id);
create index helper_profiles_visible_city_idx on public.helper_profiles(is_visible, city);
create index bookings_client_id_idx on public.bookings(client_id);
create index bookings_helper_profile_id_idx on public.bookings(helper_profile_id);
create index bookings_service_category_id_idx on public.bookings(service_category_id);
create index complaints_booking_id_idx on public.complaints(booking_id);
create index complaints_submitted_by_idx on public.complaints(submitted_by);
create index payment_records_booking_id_idx on public.payment_records(booking_id);
create index audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index terms_acceptances_profile_id_idx on public.terms_acceptances(profile_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger elderly_profiles_set_updated_at
before update on public.elderly_profiles
for each row execute function public.set_updated_at();

create trigger helper_applications_set_updated_at
before update on public.helper_applications
for each row execute function public.set_updated_at();

create trigger helper_profiles_set_updated_at
before update on public.helper_profiles
for each row execute function public.set_updated_at();

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create trigger complaints_set_updated_at
before update on public.complaints
for each row execute function public.set_updated_at();

create trigger payment_records_set_updated_at
before update on public.payment_records
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
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
  );
$$;

create or replace function public.prevent_non_admin_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Only admins can change profile roles';
  end if;

  return new;
end;
$$;

create trigger profiles_prevent_non_admin_role_change
before update on public.profiles
for each row execute function public.prevent_non_admin_profile_role_change();

insert into public.service_categories (name, description, is_allowed)
values
  ('Companionship', 'Non-medical social visits and conversation.', true),
  ('Light errands', 'Simple local errands that do not involve medical, financial, or high-risk tasks.', true),
  ('Shopping', 'Help with routine shopping for everyday items.', true),
  ('Walks', 'Non-medical accompaniment for short local walks.', true),
  ('Check-ins', 'Scheduled non-medical wellbeing check-ins and updates.', true),
  ('Technology help', 'Basic help using phones, computers, video calls, or online forms without handling passwords or sensitive financial access.', true),
  ('Accompaniment', 'Non-medical accompaniment to appointments, shops, or community activities.', true)
on conflict (name) do nothing;

alter table public.profiles enable row level security;
alter table public.elderly_profiles enable row level security;
alter table public.helper_applications enable row level security;
alter table public.helper_profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.bookings enable row level security;
alter table public.complaints enable row level security;
alter table public.payment_records enable row level security;
alter table public.audit_logs enable row level security;
alter table public.terms_acceptances enable row level security;

-- Profiles: users can create/read/update their own profile; admins can view all.
create policy "profiles_insert_own_safe_role"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and role in ('client', 'helper_applicant'));

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_admin_select_all"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "profiles_admin_update_all"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Admin role-management is intentionally limited to authenticated users whose existing profile role is admin.

-- Elderly profiles: clients/caregivers manage records they own; admins can view all.
create policy "elderly_profiles_owner_select"
on public.elderly_profiles
for select
to authenticated
using (caregiver_id = auth.uid());

create policy "elderly_profiles_owner_insert"
on public.elderly_profiles
for insert
to authenticated
with check (caregiver_id = auth.uid());

create policy "elderly_profiles_owner_update"
on public.elderly_profiles
for update
to authenticated
using (caregiver_id = auth.uid())
with check (caregiver_id = auth.uid());

create policy "elderly_profiles_owner_delete"
on public.elderly_profiles
for delete
to authenticated
using (caregiver_id = auth.uid());

create policy "elderly_profiles_admin_select_all"
on public.elderly_profiles
for select
to authenticated
using (public.is_admin());

-- Helper applications: applicants manage their own application; admins review and update all.
create policy "helper_applications_owner_select"
on public.helper_applications
for select
to authenticated
using (profile_id = auth.uid());

create policy "helper_applications_owner_insert"
on public.helper_applications
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and status in ('draft', 'submitted')
);

create policy "helper_applications_owner_update"
on public.helper_applications
for update
to authenticated
using (
  profile_id = auth.uid()
  and status in ('draft', 'submitted')
)
with check (
  profile_id = auth.uid()
  and status in ('draft', 'submitted')
);

create policy "helper_applications_admin_select_all"
on public.helper_applications
for select
to authenticated
using (public.is_admin());

create policy "helper_applications_admin_update_all"
on public.helper_applications
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Helper profiles: public sees visible verified profiles; owners see their own; admins manage all.
create policy "helper_profiles_public_select_visible_verified"
on public.helper_profiles
for select
to anon, authenticated
using (is_visible = true and verification_status in ('verified_basic', 'trusted'));

create policy "helper_profiles_owner_select"
on public.helper_profiles
for select
to authenticated
using (profile_id = auth.uid());

create policy "helper_profiles_admin_all"
on public.helper_profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- TODO: Add a server-side helper approval workflow before allowing helper profile self-edits.

-- Service categories: everyone can read allowed categories; admins can manage all categories.
create policy "service_categories_public_select_allowed"
on public.service_categories
for select
to anon, authenticated
using (is_allowed = true);

create policy "service_categories_admin_all"
on public.service_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Bookings: clients manage their own bookings; assigned helpers can view; admins manage all.
create policy "bookings_client_select"
on public.bookings
for select
to authenticated
using (client_id = auth.uid());

create policy "bookings_client_insert"
on public.bookings
for insert
to authenticated
with check (
  client_id = auth.uid()
  and exists (
    select 1
    from public.elderly_profiles ep
    where ep.id = bookings.elderly_profile_id
      and ep.caregiver_id = auth.uid()
  )
  and exists (
    select 1
    from public.service_categories sc
    where sc.id = bookings.service_category_id
      and sc.is_allowed = true
  )
);

create policy "bookings_client_update"
on public.bookings
for update
to authenticated
using (client_id = auth.uid())
with check (
  client_id = auth.uid()
  and exists (
    select 1
    from public.elderly_profiles ep
    where ep.id = bookings.elderly_profile_id
      and ep.caregiver_id = auth.uid()
  )
  and exists (
    select 1
    from public.service_categories sc
    where sc.id = bookings.service_category_id
      and sc.is_allowed = true
  )
);

create policy "bookings_client_delete"
on public.bookings
for delete
to authenticated
using (client_id = auth.uid());

create policy "bookings_assigned_helper_select"
on public.bookings
for select
to authenticated
using (
  helper_profile_id in (
    select id
    from public.helper_profiles
    where profile_id = auth.uid()
  )
);

create policy "bookings_admin_all"
on public.bookings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- TODO: Add server-side status transition checks before helpers or clients can change booking lifecycle statuses broadly.

-- Complaints: creators can view and create their own complaints; admins manage all.
create policy "complaints_creator_select"
on public.complaints
for select
to authenticated
using (submitted_by = auth.uid());

create policy "complaints_creator_insert"
on public.complaints
for insert
to authenticated
with check (submitted_by = auth.uid());

create policy "complaints_admin_all"
on public.complaints
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Payment records: no public access; related client/helper can view; admins manage all.
create policy "payment_records_related_user_select"
on public.payment_records
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    left join public.helper_profiles hp on hp.id = b.helper_profile_id
    where b.id = payment_records.booking_id
      and (b.client_id = auth.uid() or hp.profile_id = auth.uid())
  )
);

create policy "payment_records_admin_all"
on public.payment_records
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- TODO: Payment rows should be written by trusted server-side code only after a provider integration is designed.

-- Audit logs: admins can view. Users do not directly modify audit logs.
create policy "audit_logs_admin_select"
on public.audit_logs
for select
to authenticated
using (public.is_admin());

create policy "audit_logs_admin_insert"
on public.audit_logs
for insert
to authenticated
with check (public.is_admin());

-- TODO: Move audit log writes into trusted server-side actions or database functions before high-risk workflows expand.

-- Terms acceptances: users can view/insert their own acceptance records; admins can view all.
create policy "terms_acceptances_owner_select"
on public.terms_acceptances
for select
to authenticated
using (profile_id = auth.uid());

create policy "terms_acceptances_owner_insert"
on public.terms_acceptances
for insert
to authenticated
with check (profile_id = auth.uid());

create policy "terms_acceptances_admin_select_all"
on public.terms_acceptances
for select
to authenticated
using (public.is_admin());
