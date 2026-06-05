# PRODUCT_SPEC.md

> **Status: DESIGN / SOURCE OF TRUTH (review document).**
> This document captures the full product vision for VnukPodNaem. It is the
> single source of truth for *what* the product does. It does **not** mean every
> feature here is built yet — implementation is phased and each phase still
> requires explicit product confirmation (see `PROJECT_BRIEF.md` and `AGENTS.md`).
>
> Companion documents:
> - `DATABASE_SCHEMA.md` — the proposed data model and Row-Level Security (RLS) design that backs this spec.
> - `PROJECT_BRIEF.md` — original product brief and MVP scope.
> - `docs/` — existing planning notes and current implementation status.

---

## 0. How to read this document

VnukPodNaem already has a working MVP shell (universal accounts, caregiver
application + admin approval, a booking-request placeholder, safety pages). This
spec describes the **complete target marketplace** the product is growing toward,
modelled on the flow of **buddyguard.bg** (a pet-sitter marketplace) but adapted
for elderly everyday-support services.

Where the full vision extends beyond today's build, the gap is intentional and
called out. Section 11 lists the open product decisions that must be answered
before the schema is implemented in Phase 1.

A short terminology note, because the codebase and the vision use different words
for the same things. This spec standardises on **elder** and **caregiver**:

| This spec | Brief / current code | Meaning |
| --- | --- | --- |
| Elder | `client`, "user", "elderly profile" | The family member who searches and books |
| Caregiver | `helper`, `verified_helper`, `helper_profiles` | The approved person who provides support |
| Reservation | `booking` / `bookings` | A requested/approved engagement |
| Region | (new) `city` / `service_radius_km` | A Sofia district served by a caregiver |

---

## 1. Roles & permissions

### 1.1 The two roles

There are two functional roles, both backed by real accounts:

- **Elder** — the family member (or the elderly person themselves) who searches
  for, browses, and books caregivers. This is the **default** capability every
  account has.
- **Caregiver** — an elder-type account that has been **approved by an admin** as
  a caregiver, which **unlocks extra dashboard options** (schedule, services,
  regions, incoming reservation requests). A caregiver does not stop being an
  elder; they simply gain caregiver tools.

There is also an internal **Admin** role (manually assigned, never self-service,
hidden from normal navigation) that reviews applications, resolves disputes, and
manages visibility.

This preserves the **universal account model** from `PROJECT_BRIEF.md`: nobody
chooses "client vs helper" at signup. Everyone signs up the same way, is an elder
by default, and may later apply to unlock caregiver capability.

### 1.2 The one-way platform rule (critical)

The marketplace is **strictly one-way**:

- **Only elders can search, browse, and view caregivers.**
- **Caregivers can NEVER search for, browse, or view elder accounts.** A caregiver
  only ever *receives* reservation requests directed at them, and only sees the
  specific elder information attached to **their own** reservations (and, after
  approval, the in-reservation chat).
- A caregiver cannot enumerate elders, cannot discover elders who have not booked
  them, and cannot read any elder's private contact details beyond what a specific
  accepted reservation deliberately exposes.

This rule is a **security boundary, not a UI convenience**. It MUST be enforced at
the database level with **Supabase Row-Level Security**, on every relevant table,
so that it holds even if a UI bug or a direct API call tries to bypass it. See
`DATABASE_SCHEMA.md` for the per-table policies.

> **Nuance to confirm (see Section 11):** because a caregiver account *is* an
> elder-type account, a caregiver may still act as an elder (e.g. book a caregiver
> for their own relative). The one-way rule restricts the **caregiver-facing**
> surface — it never lets anyone read elders as a browsable population. It does not
> remove a caregiver's own elder-side rights over their own data.

### 1.3 Phone-number & contact privacy (critical)

- An elder's **phone number is private**. It is collected at signup for account
  and contact purposes but is **never shown publicly** and **never returned in any
  API response to a caregiver or to other users**.
- A caregiver's email and the elder's email/phone are never exposed on public
  surfaces (search, profile cards, profile pages).
- Contact between an elder and a caregiver happens through the **in-platform chat**
  that opens only after a reservation is approved — never by exchanging raw phone
  numbers or emails.

Enforcement is at the database level: private columns are excluded from any
publicly- or cross-role-readable view/policy. See `DATABASE_SCHEMA.md`.

---

## 2. Elder experience

### 2.1 Home → search

1. The elder lands on the home page and selects **one or more service needs**
   (e.g. companionship, shopping, accompaniment, house help).
2. The elder types their **address** using **Google Maps autocomplete**. The
   system maps the chosen address to a **Sofia district / neighbourhood** (a
   `region`). Only the district is needed for matching; the precise address is
   used later for an accepted reservation, not for public search.
3. The elder selects a **single date or a date range**.
4. The elder clicks **Search** and lands on the **marketplace**, pre-filtered by
   *service + district + date(s)*.

### 2.2 Marketplace (browse caregivers)

The marketplace shows **caregiver cards**, each with:

- Profile photo, first name (public display name).
- **Verified / volunteer** badges.
- Services offered.
- Review count (and average rating once reviews exist).
- Location (district / "whole city"), never a precise address.
- Price, shown as **"from X лв."** (the lowest of the caregiver's per-service
  prices that match the search).

Alongside the list, a **map** displays **price pins** (à la buddyguard.bg): one
pin per matching caregiver, anchored to their district, labelled with the "from"
price. Pins reflect district-level location only — never a caregiver's home
address.

Only **approved, visible** caregivers appear. Unapproved, hidden, suspended, or
banned caregivers never appear in search, on the map, or on a direct profile URL.

### 2.3 Select a caregiver → auth gate

1. The elder selects a caregiver to view the **public caregiver profile** (bio,
   elderly-care experience, per-service prices, reviews, regions, availability
   preview).
2. To continue to booking, the elder is prompted to **log in or create an
   account**.
3. **Elder signup is intentionally easy.** Fields:
   - Phone number — **PRIVATE, never shown publicly**.
   - Email.
   - First name, last name.
   - Age.
   - Optional profile photo.
   (Signup never asks "are you a client or a helper?" — universal model.)
4. After signup/login, the elder is **returned to the marketplace with their
   filtered list intact** (service + district + dates preserved).

---

## 3. Caregiver experience

### 3.1 Becoming a caregiver

A normal (elder) account applies through the **"Become a caregiver"** flow.
Admin approval is required before any caregiver capability unlocks (no
self-activation, ever). On approval the account gains a **public caregiver
profile** and the **caregiver dashboard panel**.

### 3.2 Public caregiver profile

- Bio.
- Elderly-care / experience info ("pets/elderly-care info" in the BuddyGuard
  analogue → here: experience, comfort areas, languages, etc.).
- **Services they perform, each with their own price.**
- Reviews and review count.
- Regions served.
- Availability preview.

No private contact details are ever shown.

### 3.3 Caregiver dashboard (right-side panel, unlocked after approval)

- **Schedule setup** — publish availability as **2-hour time slots per day**.
- **Services** — choose which services they are willing to perform, **each with
  their own price**.
- **Operating regions** — select **one or more Sofia districts**, or **"whole
  city"** (which covers all districts). **Region-based only — no radius.**
- **Incoming reservation requests** — receive, review, and **approve or reject**
  requests. Caregivers **never browse elders**; requests come to them.

---

## 4. Reservation lifecycle

### 4.1 Creating a reservation (elder side)

1. The elder picks a caregiver, then selects **service(s)**, **date(s)**, and
   **time slot(s)**.
2. Slots already booked for that caregiver on that date are **not shown as
   available**, so a caregiver can hold **multiple appointments per day** without
   double-booking.
3. As the elder adds services or **optional extras** (e.g. *take out trash*,
   *light tidy-up*), the **price updates live**.
4. The elder submits the reservation. Funds are **authorized and held via Stripe
   (escrow) — not yet captured**. (Stripe is a later phase; the data model is
   designed to support it now — see Section 8 and `DATABASE_SCHEMA.md`.)

### 4.2 Caregiver receives & decides

5. The caregiver receives a **notification** in their **notification center** (a
   bell / telegram-style icon with an **unread count**). The request shows the
   elder's location (district), the service type(s), the date(s), and the **total
   requested duration**.
6. The caregiver **approves** or **rejects**.
7. **Only on approval** does the elder get a **confirmation**, **and** the
   **internal chat opens** between the two parties.

### 4.3 Reservation states (state machine)

```
                +-----------+      reject       +-----------+
                |  pending  | ----------------> | rejected  |
   submit ----> | (held $)  |                   +-----------+
                +-----------+
                      | approve  (chat opens, elder confirmed)
                      v
                +-----------+    end time passes    +----------------------+
                | approved  | --------------------> | awaiting_confirmation |
                +-----------+                       +----------------------+
                      |                                 |                |
              cancel  |                    mark complete |                | report issue
                      v                                 v                v
                +-----------+                     +-----------+    +-----------+
                | cancelled |                     | completed |    | disputed  |
                +-----------+                     | ($ released)|  | ($ held)  |
                                                  +-----------+    +-----------+
```

Canonical states:

| State | Meaning | Money | Who can move it |
| --- | --- | --- | --- |
| `pending` | Submitted, awaiting caregiver decision | Authorized & held | Caregiver (approve/reject), Elder (cancel) |
| `approved` | Caregiver accepted; chat open; elder confirmed | Held | System (time passes), Elder (cancel pre-start), Admin |
| `rejected` | Caregiver declined | Released/voided back to elder | — (terminal) |
| `in_progress` *(optional)* | Reservation window is currently active | Held | System (time-based) |
| `awaiting_confirmation` | End time passed; elder action needed | Held | Elder (complete / report) |
| `completed` | Elder marked complete | **Captured & released to caregiver** | — (terminal) |
| `disputed` | Elder reported an issue | **Held** pending admin | Admin (resolve) |
| `cancelled` | Cancelled before completion | Released/voided per policy | — (terminal) |

> `in_progress` is optional for MVP. Because completion is detected by comparing
> the reservation **end time** to **the current time on page load** (no background
> job required for MVP), the practical MVP path is
> `pending → approved → awaiting_confirmation → completed | disputed`. The schema
> still includes `in_progress` so a future scheduler can use it.

### 4.4 Slot-holding rule

A caregiver can hold **several reservations in one day**, as long as their time
slots do not overlap. Availability shown to elders always **subtracts** slots that
are already taken by a `pending` or `approved` reservation for that caregiver on
that date.

---

## 5. Internal chat

- Opens **only after a reservation is approved** (never before; never for
  rejected/expired requests).
- All communication must **stay in-platform**, so the platform remains the **sole
  record** of the engagement. The UI must discourage moving to phone/other apps.
- Supports **text**, **voice messages**, and **media (images)**.
- Scoped to the two parties of that reservation (and admins for dispute review).
  A caregiver can only see chats for reservations that belong to them; an elder
  only for reservations they created.

---

## 6. Completion & disputes

- When the reserved period's **end time has passed**, the elder sees two buttons
  on their reservation:
  - **"Mark as complete"** → moves to `completed`; **Stripe releases the held
    funds** (capture + transfer/payout) to the caregiver.
  - **"Report an issue"** → moves to `disputed`; the reservation is flagged to an
    **admin review queue**; **funds stay held** until an admin resolves it.
- For MVP, completion eligibility is detected by comparing the reservation **end
  time** to **the current time on page load** — **no background job required**.
- Admin dispute resolution decides the final money outcome (release to caregiver,
  refund to elder, or partial), always recorded in the audit log.

---

## 7. Notifications

- Each user has a **notification center** (bell / telegram-style icon) with an
  **unread count**.
- Caregiver-facing notifications include: new reservation request, cancellation,
  new chat message, dispute updates.
- Elder-facing notifications include: request approved/rejected, reservation
  reminder, chat message, dispute updates, "ready to confirm completion".
- Notifications have a recipient, a type, a read/unread state, and a reference to
  the related object (reservation, chat thread, etc.).

---

## 8. Payments (DESIGN ONLY for now)

> **No Stripe code is implemented in this phase.** This section defines the
> behaviour the **data model must support** so a later, product-approved Stripe
> integration can be added without re-modelling.

- Caregivers receive **payouts**, so the model must support **Stripe Connect**
  (each caregiver is a **connected account**) with **escrow**:
  - **Authorize/hold** the elder's payment when the reservation is **submitted**
    (`pending`).
  - **Void/release** the hold if the request is **rejected** or **cancelled**.
  - **Capture & transfer/payout** to the caregiver when the elder marks the
    reservation **completed**.
  - **Keep held** while **disputed**, until an admin resolves it.
- The schema must therefore carry, per reservation: a **payment status**, the
  **held amount** (and currency), **Stripe references** (payment intent, connected
  account / transfer), and **payout status**. See `DATABASE_SCHEMA.md` →
  `payments`.
- **Never store** full card numbers, CVCs, card PINs, passwords, or raw provider
  secrets. Only provider **references and statuses**.

---

## 9. Pricing model

- **Per-caregiver, per-service prices**: each caregiver sets their own price for
  each service they offer (`caregiver_services`).
- **Optional extras** (`service_extras`): small add-ons (take out trash, light
  tidy-up, etc.) with their own prices, selectable at booking time.
- **Live total**: as the elder adds services/extras/slots, the running total
  updates in the UI before submission.
- **Price snapshot**: when a reservation is created, the chosen line items and
  their prices are **snapshotted** onto the reservation (`reservation_services` /
  `reservation_slots`), so later price changes by the caregiver do not alter an
  existing reservation's agreed amount.
- The **"from X лв."** shown on cards/pins is derived from the caregiver's lowest
  matching per-service price.

---

## 10. Geography model

- Launch geography is **Sofia**, divided into **districts/neighbourhoods**
  (`regions`).
- A caregiver serves **one or more districts**, or **"whole city"** (covers all
  districts). **No radius** — region-based matching only.
- The elder's typed address (Google Maps autocomplete) is resolved to a **single
  district** for matching; the precise address is retained privately and only
  surfaced to the matched caregiver on an **accepted** reservation.

---

## 11. Open product decisions (needed before Phase 1 schema implementation)

These are the decisions required from the product owner before we turn
`DATABASE_SCHEMA.md` into migrations. They are repeated, with context, at the end
of `DATABASE_SCHEMA.md`.

1. **Account-model reconciliation.** Confirm the reconciliation in §1.1/§1.2:
   universal account = elder by default, caregiver = an unlocked capability, and a
   caregiver retains elder rights over their own data while the one-way rule blocks
   any caregiver-facing view of elders as a population. Is that correct?
2. **Table renames vs. keep current names.** The current schema uses
   `profiles.role = client/verified_helper`, `helper_profiles`, `bookings`. The
   vision reads better as `elder/caregiver`, `caregiver_profiles`, `reservations`.
   Do we **rename** (cleaner, but a breaking migration touching code) or **keep**
   the current names and just layer the new tables on top? (`AGENTS.md` forbids
   renames "unless required for the task" — so this needs an explicit call.)
3. **Elderly-profile object.** Today bookings reference a separate
   `elderly_profiles` row owned by the booker. The new elder flow ties a
   reservation to the **signed-in elder account** plus a per-reservation address.
   Do we keep `elderly_profiles` (book *on behalf of* a named relative) or retire
   it in favour of account-level booking + reservation address snapshot?
4. **MVP scope of the full vision.** Chat (text/voice/media), reviews, real
   scheduling, notifications, and Stripe are all listed as *later* in
   `PROJECT_BRIEF.md`. This spec designs them now (design-only). Which of these are
   in the **next implementation phase**, and which stay design-only until a
   dedicated approved task?
5. **Stripe escrow timing.** Confirm: authorize/hold at **submit** (`pending`),
   not at **approval**. (Holding at submit matches "money is authorized and held"
   in the brief, but means we hold funds before the caregiver accepts.)
6. **Sofia district source list.** Which canonical list of Sofia districts/
   neighbourhoods do we seed into `regions`? (The current code uses a
   Bulgaria-wide city list in `lib/bulgariaCities.ts`, which does not match a
   Sofia-district model.)
7. **Volunteer vs. verified badge semantics.** What exactly distinguishes a
   "volunteer" caregiver from a "verified" one (price = 0? a flag? a separate
   verification tier?), and how does it interact with payments/escrow?
8. **Cancellation & refund policy.** Who can cancel, until when, and what happens
   to the held funds (full release, partial, fee)? This drives the `cancelled`
   transition and payment voids.
9. **Voice/media storage.** Chat voice + images need a storage bucket and
   retention policy. Confirm Supabase Storage, allowed types/size, and retention.
10. **Reviews timing & gating.** Are reviews only allowed after a `completed`
    reservation? One review per reservation? Editable window?

> When these are answered, Phase 1 implements the schema in `DATABASE_SCHEMA.md`
> as Supabase migrations, with the one-way rule and phone privacy enforced via RLS
> from day one.
