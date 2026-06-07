# Caregiver dashboard

The extra panel an **approved caregiver** uses to configure what populates the
marketplace: their services + prices, schedule, and operating regions. This
phase only lets caregivers **save** their config — no public marketplace,
booking, or availability-checking logic is built here.

Route: **`/dashboard/caregiver`** (also linked from `My profile`, the account
avatar menu, and the dashboard hub when the signed-in account is a caregiver).

## Access control (two layers)

1. **UI** — gated with the Phase 2 single source of truth `useCurrentUser()`
   on `isCaregiver`. Caregiver capability = an **approved `caregiver_profiles`
   row** (`verification_status in ('verified_basic','trusted')`), **not** a
   `profiles.role` — the universal account model is preserved. An elder never
   sees these controls.
2. **RLS** — every read/write is owner-scoped in the database
   (`caregiver_services`, `service_extras`, `caregiver_regions`,
   `availability_slots` each have an `*_owner_all` policy keyed to the
   `caregiver_profiles` row owned by `auth.uid()`; `covers_whole_city` is set
   through the `update_own_caregiver_profile` SECURITY DEFINER RPC, which
   re-checks the caller is an approved caregiver). So even a direct API call
   from an elder, or from another caregiver, is rejected — a caregiver can only
   edit **their own** services, slots, and regions.

## Schedule model (recurring vs per-date)

The single source of truth is the live **`availability_slots`** table: concrete
**dated 2-hour rows** (`slot_date` + `start_time`/`end_time`), each with its own
`status` (`open` / `held` / `booked` / `blocked`). That per-slot status is
exactly what lets a future booking flow mark **one** slot taken without
double-booking — no extra modelling needed.

The dashboard offers **two ways to create those rows**, both writing to the same
table:

- **Week grid (specific dates)** — a tappable 7-day × 7-slot grid for the
  selected week. Tap future slots open/closed, then *Save this week*. Booked /
  held / blocked slots are locked and shown for reference; past slots are
  disabled.
- **Recurring weekly pattern** — pick weekday × time-slot cells and *Publish*
  them across the next N weeks. This **materialises** open dated slots
  (idempotent: existing slots are kept, never overwritten).

We deliberately did **not** add a separate recurring-pattern table: it would
require a schema change and complicate the booking flow. Recurring is just a
generator over the existing per-date table, which keeps the model the simplest
thing that supports per-slot booking later.

Slot grid: `06:00–08:00, 08:00–10:00, 10:00–12:00, 12:00–14:00, 14:00–16:00,
16:00–18:00, 18:00–20:00`.

## Dashboard placement

A dedicated **`/dashboard/caregiver`** route (with Services & prices / Schedule
/ Regions tabs), rather than a profile right-rail. The repo already uses
`/dashboard/*` subroutes, a dedicated route keeps each section independently
saveable and mobile-clean, and it avoids cramming three editors into a profile
sidebar.

## Pricing / currency

Prices are entered in **лв.** and stored as **minor units (стотинки)** with
`currency = 'BGN'` in `caregiver_services.price_amount` and
`service_extras.price_amount`. (The columns default to `'EUR'`; the dashboard
writes `'BGN'` explicitly. No schema change required.)

## SUPABASE_FIX.sql

**Not needed.** Every table, column, and RPC this feature uses already exists in
the live schema.

## How to flip a test account to caregiver (for testing)

Caregiver capability is the existence of an **approved, visible**
`caregiver_profiles` row. Sign up / log in normally with your test account,
then paste this into the **Supabase SQL editor** (replace the email):

```sql
-- Make an existing account an approved, visible caregiver.
insert into public.caregiver_profiles
  (profile_id, verification_status, display_name, bio, is_visible)
select p.id,
       'verified_basic',
       coalesce(p.first_name, 'Caregiver'),
       'Test caregiver profile created for dashboard testing — at least twenty characters long.',
       true
from public.profiles p
where p.email = 'you@example.com'
on conflict (profile_id) do update
  set verification_status = 'verified_basic',
      is_visible = true;
```

Reload the app — `My profile`, the avatar menu, and `/dashboard/caregiver` now
unlock. To revert, set `verification_status = 'applicant'` (or delete the row).

> The `supabase/seed.sql` caregiver accounts (Maria / Georgi / Elena) are also
> approved caregivers, but they are seeded **without a usable password**, so they
> are for marketplace display data, not for logging in. Use the SQL above on your
> own test login.
