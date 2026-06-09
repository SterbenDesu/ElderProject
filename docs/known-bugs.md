# Known Bugs and UX Findings

Use this file to track bugs found during testing.

## Bug report format

### Bug title

Status: Open / Fixed / Deferred  
Severity: Low / Medium / High / Critical  
Area: UI / Auth / Database / API / Deployment / Performance / Other

#### What happened

TBD

#### Expected behavior

TBD

#### Steps to reproduce

1. TBD
2. TBD
3. TBD

#### Evidence

- Screenshot:
- Console error:
- Server log:
- URL/page:
- Browser/device:

#### Notes for Codex

Fix only this bug. Do not refactor unrelated code. Do not change unrelated UI or architecture.

---

## Navigation stuck on "Checking account…"

Status: Fixed
Severity: Critical
Area: Auth / UI

#### What happened

The header auth control could stay on the "Checking account…" label indefinitely. `supabase.auth.getSession()` had no `.catch()`, so if the promise rejected (network/CORS failure) the status never left `"loading"`.

#### Fix

`components/AuthNav.tsx`: added a `.catch()` that resolves to signed-out, a 1s loading fallback timeout, and replaced the raw text with a subtle accessible spinner (`role="status"`, `aria-label`). The timeout is cleared on unmount.

---

## /helpers stuck on "Loading certified caregivers…"

Status: Fixed
Severity: Critical
Area: Database / UI

#### What happened

The caregivers page could show the loading spinner forever. The Supabase query promise had no `.catch()`, so a rejected request left status on `"loading"`. The empty state also lacked a way back to the homepage.

#### Fix

`app/helpers/page.tsx`: added `.catch()` (resolves to an error state), an 8s loading fallback, mount guards, and a friendly empty state ("No caregivers are available in your area yet. Check back soon.") with a "Back to homepage" button.

---

## Notifications, Requests, and My bookings all fail with "We couldn't load your … right now"

Status: Fixed (deployment patch)
Severity: Critical
Area: Database / API

#### What happened

After the notification-center crash fix, the app loaded but three signed-in data
loads failed together:

- the notification bell — "We couldn't load your notifications right now",
- `/dashboard/requests` (caregiver) — "We couldn't load your requests right now",
- `/dashboard/reservations` (elder "My bookings") — "We couldn't load your bookings right now".

Concrete repro: account "Jovani Jorjo" (`ivanzhelyazov+client2@gmail.com`) booked
caregiver "Kura". Jovani saw nothing under My bookings and Kura saw no
notification / nothing under Requests.

#### Root cause

Not an app bug — a **deployment gap**. Each page calls one SECURITY DEFINER read
RPC from the Phase 8 migration
`supabase/migrations/20260610120000_notification_center_rpcs.sql`:

| Surface | RPC called | File |
| --- | --- | --- |
| Notification bell | `get_my_notifications` | `lib/supabase/notifications.ts` |
| Requests | `get_caregiver_requests` | `lib/supabase/reservations.ts` |
| My bookings | `get_elder_reservations` | `lib/supabase/reservations.ts` |

That migration (a.k.a. `SUPABASE_FIX_NOTIFICATIONS.sql`) was never applied to the
live project, so all three functions were missing. `supabase.rpc()` then returns
PostgREST **PGRST202** (HTTP 404, "Could not find the function … in the schema
cache"), which the pages surface as the banner. The earlier migration that ships
`create_reservation()` was applied, so the reservation row and Kura's
`reservation_requested` notification row **were created** — they were just
unreadable until the read RPCs existed. (No data was lost.)

The booker being a caregiver account is irrelevant to the failure and is allowed
by design: PRODUCT_SPEC §1.2 says a caregiver account is an elder-type account
that may book others as a client. The one-way rule (caregivers cannot browse
elders) is unaffected — the reads are self-scoped (`elder_id = auth.uid()` /
owned `caregiver_profile_id`).

#### Fix

Hardened `SUPABASE_FIX_NOTIFICATIONS.sql` (still idempotent, no DROP): added a
**preflight** that fails fast with an actionable message if the prerequisite
tables / the `create_reservation` RPC are also absent (so you apply the schema
migrations first instead of hitting an opaque "relation does not exist"), kept
the four read RPCs + realtime, and appended VERIFY queries that confirm the RPCs
exist and that the Jovani→Kura reservation + caregiver notification are present
and readable. Running it in the Supabase SQL Editor restores all three loads;
documented under "Troubleshooting" in `docs/deployment-notes.md`.

No application/RLS code changed — the error boundaries and resilient realtime
from the previous fix stay intact.
