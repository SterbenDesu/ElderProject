-- VnukPodNaem — seed data for local/dev testing only.
--
-- Safe to run after the migrations on a development database. Inserts:
--   * the 24 official Sofia districts (regions),
--   * the non-medical service catalogue (slugs + sort order),
--   * sample per-caregiver optional extras,
--   * 2-3 CLEARLY FAKE sample caregiver accounts with profiles, prices, regions,
--     and open availability slots, so the marketplace has data to display.
--
-- NO real personal data. All names/emails are obviously fake test values.
-- Do NOT run against production.

-- ---------------------------------------------------------------------------
-- 1. Sofia districts (rayoni). Source: official 24 districts of Stolichna
--    Municipality (en.wikipedia.org/wiki/Districts_of_Sofia, sofia.bg).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. Service catalogue. The base 7 are seeded by the initial migration; here we
--    set their sort order and add a couple of extra catalogue entries so the set
--    matches the public site (companionship, errands, shopping, walks,
--    accompaniment, short visits, tech help).
-- ---------------------------------------------------------------------------
insert into public.services (name, slug, description, is_allowed, is_active, sort_order) values
  ('Short visits', 'short-visits', 'Brief non-medical wellbeing visits and company.', true, true, 50)
on conflict (name) do nothing;

update public.services set sort_order = 10 where slug = 'companionship';
update public.services set sort_order = 20 where slug = 'shopping';
update public.services set sort_order = 30 where slug = 'walks';
update public.services set sort_order = 40 where slug = 'accompaniment';
update public.services set sort_order = 60 where slug = 'check-ins';
update public.services set sort_order = 70 where slug = 'light-errands';
update public.services set sort_order = 80 where slug = 'technology-help';

-- ---------------------------------------------------------------------------
-- 3. Sample caregiver accounts (FAKE). Insert auth.users first (Supabase owns
--    identities), then the application profile rows.
-- ---------------------------------------------------------------------------
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

insert into public.caregiver_profiles (id, profile_id, verification_status, badge, display_name, bio, experience, covers_whole_city, is_visible, rating_avg, rating_count) values
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

-- 3a. Per-caregiver service prices (price_amount = minor units, EUR cents).
insert into public.caregiver_services (caregiver_profile_id, service_id, price_amount, currency)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', s.id, p.price, 'EUR'
from (values ('companionship', 1500), ('shopping', 1200), ('walks', 1000)) as p(slug, price)
join public.services s on s.slug = p.slug
on conflict (caregiver_profile_id, service_id) do nothing;

insert into public.caregiver_services (caregiver_profile_id, service_id, price_amount, currency)
select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', s.id, p.price, 'EUR'
from (values ('technology-help', 800), ('accompaniment', 900), ('companionship', 700)) as p(slug, price)
join public.services s on s.slug = p.slug
on conflict (caregiver_profile_id, service_id) do nothing;

insert into public.caregiver_services (caregiver_profile_id, service_id, price_amount, currency)
select 'cccccccc-cccc-cccc-cccc-cccccccccccc', s.id, p.price, 'EUR'
from (values ('check-ins', 1000), ('light-errands', 1100), ('short-visits', 900)) as p(slug, price)
join public.services s on s.slug = p.slug
on conflict (caregiver_profile_id, service_id) do nothing;

-- 3b. Optional extras (per-caregiver).
insert into public.service_extras (caregiver_profile_id, label, price_amount, currency) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Take out the trash', 300, 'EUR'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Light tidy-up',      500, 'EUR'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Water the plants',   200, 'EUR'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Pick up a parcel',   400, 'EUR')
on conflict do nothing;

-- 3c. Operating regions (Georgi covers the whole city via the flag, so no rows).
insert into public.caregiver_regions (caregiver_profile_id, region_id)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', r.id from public.regions r
where r.slug in ('lozenets', 'triaditsa', 'sredets')
on conflict do nothing;

insert into public.caregiver_regions (caregiver_profile_id, region_id)
select 'cccccccc-cccc-cccc-cccc-cccccccccccc', r.id from public.regions r
where r.slug in ('mladost', 'studentski', 'slatina')
on conflict do nothing;

-- 3d. A few OPEN 2-hour availability slots over the next few days.
insert into public.availability_slots (caregiver_profile_id, slot_date, start_time, end_time, status)
select cp, (current_date + d), t::time, (t::time + interval '2 hours'), 'open'
from (values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid)
) as c(cp)
cross join (values (1), (2), (3)) as days(d)
cross join (values ('10:00'), ('14:00')) as times(t)
on conflict (caregiver_profile_id, slot_date, start_time) do nothing;
