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
