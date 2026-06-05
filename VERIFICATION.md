# VERIFICATION.md — Phase 1 schema & RLS

This documents how the Phase 1 migrations (the target model from
`DATABASE_SCHEMA.md`) were verified, with emphasis on the two security
guarantees: **the one-way rule** and **phone privacy**.

## How it was tested

Supabase was not contacted. Instead a local PostgreSQL 16 cluster was used with a
small bootstrap that mirrors the Supabase pieces the migrations depend on:

- `anon`, `authenticated`, `service_role` roles (none are superuser; `anon`/
  `authenticated` do **not** have `BYPASSRLS`, so RLS actually applies);
- `auth.users` + `auth.uid()` reading `request.jwt.claims` (as Supabase does);
- `ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES TO anon, authenticated` so new
  tables auto-grant to the API roles exactly like a Supabase project — meaning it
  is **RLS**, not a missing grant, that blocks access in the tests below.

Steps run, all of which completed with no errors:

1. Apply the 5 pre-existing migrations (current applied baseline).
2. Apply the 7 new Phase 1 migrations.
3. Apply `supabase/seed.sql`.
4. Run the RLS test suite.

A logged-in user is simulated with:

```sql
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"<user-uuid>"}', false);
```

and an anonymous visitor with `set role anon;` and empty claims.

## Result 1 — migrations + seed apply cleanly

All 12 migrations and the seed applied without error on a fresh database
(`ALL MIGRATIONS + SEED APPLIED`). The seed inserts the 24 official Sofia
districts, the service catalogue, sample extras, and 3 fake caregiver accounts
with prices, regions, and open availability slots.

## Result 2 — RLS is enabled on every table

```sql
select n.nspname, c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;
```

Result: **0 rows** (no public table is missing RLS). The companion count of
RLS-enabled tables returned **21**.

## Result 3 — THE ONE-WAY RULE (a caregiver cannot read elders)

Acting as caregiver **Maria** (`11111111-…`), with a separate elder account
(`…00e1`, phone `+359999999999`) present in the database:

| Query (run as the caregiver) | Result | Meaning |
| --- | --- | --- |
| `select id, first_name, role from profiles` | only Maria's own row | caregiver cannot list other users |
| `select count(*) from profiles where id = '<elder>'` | `0` | cannot read a specific elder by id |
| `select count(*) from elderly_profiles` | `0` | cannot read book-on-behalf elder data |
| `select count(*) from reservations` | `0` | cannot see reservations not addressed to them |

A second caregiver (**Georgi**) also saw `0` of Maria's reservations, and calling
`transition_reservation(<real id>, 'complete')` as Georgi failed with
`ERROR 42501: You are not a party to this reservation.` — proving the choke-point
RPC re-checks the caller even when the row id is known.

## Result 4 — PHONE PRIVACY (phone never leaks)

| Query | Run as | Result | Meaning |
| --- | --- | --- | --- |
| `select count(*) from profiles` | anon | `0` | no public/anon read of profiles at all → phone unreachable publicly |
| `select count(*) from profiles where id='<elder>' and phone is not null` | caregiver | `0` | a caregiver can never read an elder's phone |
| `select count(*) from profiles where id=auth.uid() and phone is not null` | the elder (owner) | `1` | the owner *can* read their own phone |
| `select stripe_account_id from caregiver_profiles` | anon | `ERROR: permission denied` | private payout column is column-revoked from API roles |
| `select display_name, bio, rating_avg from caregiver_profiles` | anon | rows returned | safe public marketplace columns still work |

The caregiver's only contact with the elder happens through the in-platform chat
thread, which is created **only on approval** by the state-machine RPC. Even after
booking and approval, the caregiver still read `0` rows from the elder's
`profiles` row (Result D2c), so the phone is never exposed by the booking flow.

## Result 5 — positive paths still work

- Anon browse of the marketplace returned **9** priced caregiver services and
  **24** regions.
- An elder created a reservation via `create_reservation(...)`: the elder saw it
  (`1`), the addressed caregiver saw it (`1`), and a `payments` row was created
  with `payment_status = authorized_held`, `payout_status = pending`,
  `held_amount = 1500` (escrow held at submit, status only — no Stripe call).
- On `transition_reservation(id, 'approve')` a `chat_threads` row was created and
  the linked `availability_slots` row moved to `booked`.

## Assumptions / notes

- The structural `ALTER`s that add `NOT NULL` columns (e.g.
  `reservations.region_id/start_at/end_at`) assume the existing `bookings`
  (now `reservations`) table is **empty** at migration time — true for this
  pre-launch project. If real rows existed, those columns would need a backfill
  step first.
- Per product decision, table/role names were **renamed** to the blueprint
  vocabulary (`bookings → reservations`, `helper_profiles → caregiver_profiles`,
  `service_categories → services`, role `client/verified_helper → elder`).
  Application code in `lib/supabase/*` and the app still references the old names
  and the old RPC names; updating that code is a required **follow-up** (it is out
  of scope for this schema/RLS/seed-only phase). The TypeScript build is
  unaffected because those references are string literals.
