-- Tighten client booking RLS for specific-helper requests.
--
-- This migration keeps the existing client ownership, elderly profile ownership,
-- and allowed service-category checks while adding a database-side guard that a
-- non-null bookings.helper_profile_id must point to a public visible helper with
-- a verified/trusted verification status.

begin;

drop policy if exists "bookings_client_insert" on public.bookings;
drop policy if exists "bookings_client_update" on public.bookings;

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
  and (
    bookings.helper_profile_id is null
    or exists (
      select 1
      from public.helper_profiles hp
      where hp.id = bookings.helper_profile_id
        and hp.is_visible = true
        and hp.verification_status in ('verified_basic', 'trusted')
    )
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
  and (
    bookings.helper_profile_id is null
    or exists (
      select 1
      from public.helper_profiles hp
      where hp.id = bookings.helper_profile_id
        and hp.is_visible = true
        and hp.verification_status in ('verified_basic', 'trusted')
    )
  )
);

commit;
