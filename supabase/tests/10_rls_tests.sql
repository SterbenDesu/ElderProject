\set ON_ERROR_STOP on
\pset pager off

-- ===========================================================================
-- PART A: RLS is enabled on EVERY application table
-- ===========================================================================
\echo '--- A. Tables in public WITHOUT row level security (expect ZERO rows) ---'
select n.nspname, c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false
order by 2;

\echo '--- A2. RLS-enabled table count (informational) ---'
select count(*) as rls_enabled_tables
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = true;

-- Test identities
-- elder under test (NOT a caregiver, owns nothing yet)
\set elder    '00000000-0000-0000-0000-0000000000e1'
-- a caregiver account (Maria, profile 1111...)
\set cg_user  '11111111-1111-1111-1111-111111111111'

-- Supabase Auth would own this identity; create the auth.users row as superuser.
insert into auth.users (id, email, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000e1', 'elder.test@example.test', now(), now())
on conflict (id) do nothing;

-- Create a plain elder account row (as that elder) to test cross-user reads.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000e1')::text, false);
insert into public.profiles (id, email, role, first_name, last_name, phone, age)
values ('00000000-0000-0000-0000-0000000000e1', 'elder.test@example.test', 'elder', 'ElderFirst', 'ElderLast', '+359999999999', 77);
reset role;

-- ===========================================================================
-- PART B: THE ONE-WAY RULE — a caregiver cannot read elders as a population
-- ===========================================================================
-- Act as the caregiver (Maria).
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111')::text, false);

\echo '--- B1. Caregiver SELECT * FROM profiles  (expect ONLY own row, not the elder) ---'
select id, first_name, role from public.profiles order by first_name;

\echo '--- B2. Caregiver tries to read the specific elder profile by id (expect 0 rows) ---'
select count(*) as elder_rows_visible_to_caregiver
from public.profiles where id = '00000000-0000-0000-0000-0000000000e1';

\echo '--- B3. Caregiver tries to read elderly_profiles (book-on-behalf data) (expect 0 rows) ---'
select count(*) as elderly_profiles_visible_to_caregiver from public.elderly_profiles;

\echo '--- B4. Caregiver tries to read reservations not addressed to them (expect 0 rows) ---'
select count(*) as foreign_reservations_visible from public.reservations;

reset role;

-- ===========================================================================
-- PART C: PHONE PRIVACY — phone is never readable by non-owner/non-admin,
--          and never present in any public/anon read.
-- ===========================================================================
\echo '--- C1. ANON reading caregiver marketplace profiles: stripe_account_id must be REVOKED ---'
set role anon;
select set_config('request.jwt.claims', '', false);
-- This SELECT lists only safe public columns; selecting stripe_account_id should ERROR.
\echo 'C1a. anon safe columns (works):'
select display_name, bio, rating_avg from public.caregiver_profiles order by display_name;
\echo 'C1b. anon attempting stripe_account_id (expect permission denied error):'
do $$ begin
  perform stripe_account_id from public.caregiver_profiles limit 1;
  raise exception 'FAIL: anon could read stripe_account_id';
exception
  when insufficient_privilege then raise notice 'PASS: anon blocked from stripe_account_id (%).', sqlerrm;
end $$;
reset role;

\echo '--- C2. ANON cannot read ANY profiles row (no public select policy) -> phone unreachable ---'
set role anon;
select set_config('request.jwt.claims', '', false);
select count(*) as profiles_rows_visible_to_anon from public.profiles;
reset role;

\echo '--- C3. Caregiver cannot read the elder phone via profiles (0 rows, B2 already proved no row) ---'
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111')::text, false);
select count(*) as elder_phone_rows_for_caregiver
from public.profiles where id = '00000000-0000-0000-0000-0000000000e1' and phone is not null;
reset role;

\echo '--- C4. The OWNER elder CAN read their own phone (expected: 1 row) ---'
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000e1')::text, false);
select count(*) as own_phone_visible
from public.profiles where id = auth.uid() and phone is not null;
reset role;

-- ===========================================================================
-- PART D: Positive paths still work (marketplace + booking choke point)
-- ===========================================================================
\echo '--- D1. ANON can browse visible+verified caregiver prices (expect rows) ---'
set role anon;
select set_config('request.jwt.claims', '', false);
select count(*) as public_priced_services from public.caregiver_services;
select count(*) as public_regions from public.regions;
reset role;

\echo '--- D2. Elder books via create_reservation RPC, then caregiver sees it; payment held ---'
-- Pick a slot + service for Maria, as the elder.
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000e1')::text, false);
select public.create_reservation(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (select id from public.regions where slug='lozenets'),
  array[(select id from public.availability_slots where caregiver_profile_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and status='open' order by slot_date, start_time limit 1)],
  array[(select id from public.services where slug='companionship')],
  array[]::uuid[],
  'Secret precise address 5', 'Baba'
) as create_result \gset
\echo 'D2a. Elder sees own reservation (expect 1):'
select count(*) as elder_reservations from public.reservations where elder_id = auth.uid();
-- Capture the real reservation id (as the elder, who can see it) for later tests.
select id as resid from public.reservations where elder_id = auth.uid() limit 1 \gset
reset role;

\echo 'D2b. Caregiver (Maria) now sees the incoming reservation (expect 1), and the held payment:'
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111')::text, false);
select count(*) as caregiver_incoming from public.reservations;
select p.payment_status, p.payout_status, p.held_amount
from public.payments p
join public.reservations r on r.id = p.reservation_id
limit 1;
\echo 'D2c. But the caregiver STILL cannot read the elder address/phone via profiles (expect 0):'
select count(*) as elder_profile_visible from public.profiles where id = '00000000-0000-0000-0000-0000000000e1';
reset role;

\echo '--- D3. Caregiver approves -> chat thread opens, slot booked ---'
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111')::text, false);
select public.transition_reservation((select id from public.reservations limit 1), 'approve');
select count(*) as chat_threads_after_approve from public.chat_threads;
select status as slot_status from public.availability_slots
  where id = (select availability_slot_id from public.reservation_slots limit 1);
reset role;

\echo '--- D4. A different caregiver (Georgi) cannot see or act on Maria''s reservation ---'
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222')::text, false);
select count(*) as georgi_can_see_marias_reservations from public.reservations;
-- Pass the REAL reservation id so this exercises the RPC's own caller check
-- (not just RLS hiding the row). Expect ERROR 42501 "not a party".
\set ON_ERROR_STOP off
\echo 'D4b. Outsider Georgi transition on the REAL reservation id (expect 42501 error):'
select public.transition_reservation(:'resid', 'complete');
\set ON_ERROR_STOP on
reset role;

\echo '=== RLS TEST SUITE COMPLETE ==='
