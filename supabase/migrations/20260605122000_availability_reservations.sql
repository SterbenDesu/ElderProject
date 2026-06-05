-- Availability slots and the reservation model (the one-way choke point).
--
-- availability_slots   — NEW: caregiver-published 2-hour slots.
-- reservations         (was bookings) — restructured to the target model.
-- reservation_slots    — NEW: which slots a reservation occupies.
-- reservation_services — NEW: line items with a price SNAPSHOT.
--
-- THE ONE-WAY RULE lives here: a caregiver can only ever read reservations
-- directed at their OWN caregiver profile. There is no policy that lets a
-- caregiver enumerate elders or read reservations that are not theirs. All status
-- transitions go through a SECURITY DEFINER RPC, never a free client UPDATE.

begin;

-- ---------------------------------------------------------------------------
-- 1. availability_slots — published 2-hour slots
-- ---------------------------------------------------------------------------
create table public.availability_slots (
  id                   uuid primary key default gen_random_uuid(),
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  slot_date            date not null,
  start_time           time not null,
  end_time             time not null,
  status               text not null default 'open',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint availability_slots_status_check check (status in ('open', 'held', 'booked', 'blocked')),
  constraint availability_slots_two_hour_check check (end_time = (start_time + interval '2 hours')),
  constraint availability_slots_unique unique (caregiver_profile_id, slot_date, start_time)
);

create trigger availability_slots_set_updated_at
before update on public.availability_slots
for each row execute function public.set_updated_at();

alter table public.availability_slots enable row level security;

-- Elders may read only OPEN slots of visible + verified caregivers (so they can
-- pick times). Held/booked/blocked slots are not publicly listed.
create policy "availability_slots_public_select_open"
on public.availability_slots
for select
to anon, authenticated
using (
  status = 'open'
  and exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = availability_slots.caregiver_profile_id
      and cp.is_visible = true
      and cp.verification_status in ('verified_basic', 'trusted')
  )
);

-- A caregiver fully manages their OWN slots. (Transitions to held/booked are done
-- by the reservation RPC, but a caregiver may still open/block their own grid.)
create policy "availability_slots_owner_all"
on public.availability_slots
for all
to authenticated
using (
  exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = availability_slots.caregiver_profile_id
      and cp.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = availability_slots.caregiver_profile_id
      and cp.profile_id = auth.uid()
  )
);

create policy "availability_slots_admin_all"
on public.availability_slots
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index availability_slots_caregiver_date_idx
  on public.availability_slots (caregiver_profile_id, slot_date);
create index availability_slots_date_status_idx
  on public.availability_slots (slot_date, status);

-- ---------------------------------------------------------------------------
-- 2. reservations  (was bookings) — restructure to the target model
-- ---------------------------------------------------------------------------
alter table public.bookings rename to reservations;

-- Drop the legacy, now-superseded client booking policies before reshaping.
drop policy if exists "bookings_client_select"          on public.reservations;
drop policy if exists "bookings_client_insert"          on public.reservations;
drop policy if exists "bookings_client_update"          on public.reservations;
drop policy if exists "bookings_client_delete"          on public.reservations;
drop policy if exists "bookings_assigned_helper_select" on public.reservations;
drop policy if exists "bookings_admin_all"              on public.reservations;

-- Rename participant columns to the elder/caregiver vocabulary.
alter table public.reservations rename column client_id        to elder_id;
alter table public.reservations rename column helper_profile_id to caregiver_profile_id;

-- caregiver_profile_id becomes required and restrict-on-delete (a reservation
-- must always point at the caregiver it was directed to).
alter table public.reservations drop constraint if exists bookings_helper_profile_id_fkey;
alter table public.reservations
  add constraint reservations_caregiver_profile_id_fkey
    foreign key (caregiver_profile_id) references public.caregiver_profiles(id) on delete restrict;
alter table public.reservations alter column caregiver_profile_id set not null;

-- elderly_profile_id is now OPTIONAL (book-on-behalf), not required.
alter table public.reservations alter column elderly_profile_id drop not null;

-- New target columns.
alter table public.reservations
  add column if not exists region_id            uuid,
  add column if not exists address_snapshot     text,
  add column if not exists recipient_first_name text,
  add column if not exists start_at             timestamptz,
  add column if not exists end_at               timestamptz,
  add column if not exists total_amount         int not null default 0,
  add column if not exists currency             text not null default 'EUR',
  add column if not exists cancelled_by         uuid;

alter table public.reservations
  add constraint reservations_region_id_fkey
    foreign key (region_id) references public.regions(id) on delete restrict;
alter table public.reservations
  add constraint reservations_cancelled_by_fkey
    foreign key (cancelled_by) references public.profiles(id) on delete set null;

-- region_id, start_at, end_at are required on the target model (tables are empty
-- pre-launch; see VERIFICATION.md for the empty-table assumption).
alter table public.reservations alter column region_id set not null;
alter table public.reservations alter column start_at  set not null;
alter table public.reservations alter column end_at    set not null;

alter table public.reservations
  add constraint reservations_total_amount_check check (total_amount >= 0),
  add constraint reservations_time_order_check   check (end_at > start_at);

-- Drop legacy columns replaced by the new model (district replaces free-text city;
-- line items replace the single service_category_id; slots replace requested_*).
alter table public.reservations
  drop column if exists city,
  drop column if exists service_category_id,
  drop column if exists requested_start_at,
  drop column if exists requested_duration_minutes;

-- Migrate the old status vocabulary to the canonical state machine, then swap the
-- check constraint and default.
alter table public.reservations drop constraint if exists bookings_status_check;
alter table public.reservations drop constraint if exists bookings_requested_duration_check;
update public.reservations set status = case status
  when 'requested'                    then 'pending'
  when 'accepted'                     then 'approved'
  when 'payment_secured'              then 'approved'
  when 'in_progress'                  then 'in_progress'
  when 'completed_by_helper'          then 'awaiting_confirmation'
  when 'pending_client_confirmation'  then 'awaiting_confirmation'
  when 'completed_released'           then 'completed'
  when 'disputed'                     then 'disputed'
  when 'cancelled'                    then 'cancelled'
  when 'no_show'                      then 'cancelled'
  else 'pending'
end;
alter table public.reservations alter column status set default 'pending';
alter table public.reservations
  add constraint reservations_status_check check (status in (
    'pending', 'approved', 'rejected', 'in_progress',
    'awaiting_confirmation', 'completed', 'disputed', 'cancelled'
  ));

-- Rename legacy indexes to the new vocabulary.
alter index public.bookings_client_id_idx        rename to reservations_elder_id_idx;
alter index public.bookings_helper_profile_id_idx rename to reservations_caregiver_profile_id_idx;
drop index if exists public.bookings_service_category_id_idx;
create index reservations_region_id_idx on public.reservations (region_id);
create index reservations_status_idx    on public.reservations (status);
create index reservations_start_at_idx  on public.reservations (start_at);

-- owns_reservation(uid, reservation_id): true for the elder who created it OR the
-- caregiver it is assigned to. Reused by child-table policies.
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

-- RESERVATIONS RLS ---------------------------------------------------------
-- Elder sees only their OWN reservations.
create policy "reservations_elder_select"
on public.reservations
for select
to authenticated
using (elder_id = auth.uid());

-- Caregiver sees ONLY reservations directed at their own caregiver profile. This
-- is the single path by which a caregiver ever reaches elder-linked data. There is
-- NO policy that lets a caregiver list elders or other caregivers' reservations.
create policy "reservations_caregiver_select"
on public.reservations
for select
to authenticated
using (
  caregiver_profile_id in (
    select cp.id from public.caregiver_profiles cp where cp.profile_id = auth.uid()
  )
);

-- Only an elder may create a reservation, for themselves, against a visible +
-- verified caregiver. Status transitions are NOT done here (no UPDATE policy for
-- non-admins) — they go through transition_reservation().
create policy "reservations_elder_insert"
on public.reservations
for insert
to authenticated
with check (
  elder_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = reservations.caregiver_profile_id
      and cp.is_visible = true
      and cp.verification_status in ('verified_basic', 'trusted')
  )
  and (
    elderly_profile_id is null
    or exists (
      select 1 from public.elderly_profiles ep
      where ep.id = reservations.elderly_profile_id
        and ep.elder_id = auth.uid()
    )
  )
);

create policy "reservations_admin_all"
on public.reservations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. reservation_slots — slots a reservation occupies (anti double-booking)
-- ---------------------------------------------------------------------------
create table public.reservation_slots (
  id                   uuid primary key default gen_random_uuid(),
  reservation_id       uuid not null references public.reservations(id) on delete cascade,
  availability_slot_id uuid not null references public.availability_slots(id) on delete restrict,
  created_at           timestamptz not null default now(),
  -- A slot can back exactly ONE active reservation.
  constraint reservation_slots_slot_unique unique (availability_slot_id)
);

alter table public.reservation_slots enable row level security;

-- Readable only by the reservation's two parties + admin. Written only by the RPC.
create policy "reservation_slots_parties_select"
on public.reservation_slots
for select
to authenticated
using (public.owns_reservation(auth.uid(), reservation_id));

create policy "reservation_slots_admin_all"
on public.reservation_slots
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index reservation_slots_reservation_idx on public.reservation_slots (reservation_id);

-- ---------------------------------------------------------------------------
-- 4. reservation_services — line items with a price SNAPSHOT
-- ---------------------------------------------------------------------------
create table public.reservation_services (
  id                  uuid primary key default gen_random_uuid(),
  reservation_id      uuid not null references public.reservations(id) on delete cascade,
  service_id          uuid references public.services(id) on delete set null,
  extra_id            uuid references public.service_extras(id) on delete set null,
  label_snapshot      text not null,
  unit_price_snapshot int not null,
  quantity            int not null default 1,
  created_at          timestamptz not null default now(),
  constraint reservation_services_price_check check (unit_price_snapshot >= 0),
  constraint reservation_services_quantity_check check (quantity >= 1),
  -- Each line item is either a service or an extra (snapshot keeps the label/price).
  constraint reservation_services_kind_check check (service_id is not null or extra_id is not null)
);

alter table public.reservation_services enable row level security;

-- Readable only by the reservation's two parties + admin. Written only by the RPC.
-- The snapshot guarantees later caregiver price edits never change agreed totals.
create policy "reservation_services_parties_select"
on public.reservation_services
for select
to authenticated
using (public.owns_reservation(auth.uid(), reservation_id));

create policy "reservation_services_admin_all"
on public.reservation_services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index reservation_services_reservation_idx on public.reservation_services (reservation_id);

commit;
