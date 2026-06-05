# DATABASE_SCHEMA.md

> **Status: PROPOSED DESIGN — REVIEW DOCUMENT. NOT A MIGRATION.**
> This document proposes the complete Supabase data model and Row-Level Security
> (RLS) design that backs `PRODUCT_SPEC.md`. **No migrations are created and no
> database is altered in this phase.** Phase 1 will translate the approved version
> here into SQL migrations under `supabase/migrations/`.
>
> Read alongside:
> - `PRODUCT_SPEC.md` — the product behaviour these tables support.
> - `supabase/migrations/` — the **current, already-applied** schema (source of
>   truth for what exists today).
> - `docs/database-schema-draft.md` — earlier planning draft.

---

## 0. Relationship to the current schema

The app already has applied migrations creating: `profiles`, `elderly_profiles`,
`helper_applications`, `helper_profiles`, `service_categories`, `bookings`,
`complaints`, `payment_records`, `audit_logs`, `terms_acceptances`, plus
`is_admin()` and several `SECURITY DEFINER` RPCs.

This document proposes the **target** model. To avoid confusion, here is the
naming map. **Whether we rename or keep current names is an open decision
(Section 13, item 2)** — `AGENTS.md` forbids renaming tables "unless required",
so the design is presented with target names but the mapping is explicit so we can
also implement it additively without renames.

| Target table (this doc) | Current table | Change |
| --- | --- | --- |
| `profiles` | `profiles` | Extend (add private phone, age, photo, capability flags) |
| `caregiver_profiles` | `helper_profiles` | Rename + extend (badges, stripe account) |
| `caregiver_applications` | `helper_applications` | Rename (unchanged shape) |
| `services` | `service_categories` | Extend (slug, base price hint, sort) |
| `caregiver_services` | *(new)* | New — per-caregiver price per service |
| `service_extras` | *(new)* | New — optional add-ons |
| `regions` | *(new — replaces `city`/`service_radius_km`)* | New — Sofia districts |
| `caregiver_regions` | *(new)* | New — caregiver ↔ region |
| `availability_slots` | *(new)* | New — published 2-hour slots |
| `reservations` | `bookings` | Rename + extend (address snapshot, totals) |
| `reservation_services` | *(new)* | New — line items + price snapshot |
| `reservation_slots` | *(new)* | New — booked slots |
| `payments` | `payment_records` | Extend (held amount, stripe refs, payout) |
| `notifications` | *(new)* | New |
| `chat_threads` | *(new)* | New |
| `chat_messages` | *(new)* | New |
| `reviews` | *(new)* | New |
| `disputes` | `complaints` | Rename/extend (or keep `complaints`) |
| `audit_logs` | `audit_logs` | Keep |
| `terms_acceptances` | `terms_acceptances` | Keep |
| `elderly_profiles` | `elderly_profiles` | **Keep or retire — open decision** |

---

## 1. Design principles & shared conventions

- **Supabase Auth** owns identities; `profiles.id` equals `auth.users.id`.
- **RLS is ON for every table.** No table is left open. Public/anon read is granted
  only to explicitly public, safe columns of approved/visible rows.
- **The one-way rule and phone privacy are enforced in the database**, not just the
  UI (see Sections 2, 11, 12).
- **Browser uses only the publishable/anon key** (see `lib/supabase/browser.ts`).
  All privileged transitions go through `SECURITY DEFINER` RPCs that re-check the
  caller — never via the service-role key in client code.
- **Money state only changes through the reservation state machine** (Section 7),
  via RPCs — never by a direct client `UPDATE` on `payments`.
- **Price snapshots**: line-item prices are copied onto the reservation at creation
  so later caregiver price edits never change an agreed amount.
- Standard columns on most tables: `id uuid pk default gen_random_uuid()`,
  `created_at timestamptz not null default now()`, `updated_at timestamptz not null
  default now()` with the existing `set_updated_at()` trigger.
- **Helper predicates** (reused in policies below):
  - `public.is_admin()` — already exists; true when caller's profile role is admin.
  - `public.is_caregiver(uid)` — proposed; true when an approved, non-suspended
    `caregiver_profiles` row exists for `uid`.
  - `public.owns_reservation(uid, reservation_id)` — proposed; true when `uid` is
    the elder who created it **or** the caregiver it is assigned to.

---

## 2. The one-way rule & phone privacy — enforcement summary

These two boundaries are the most important in the system. They are repeated, per
table, in the policy notes, but summarised here:

**One-way rule.**
- There is **no policy anywhere** that lets a caregiver `SELECT` the elder
  population. Elders are reachable from a caregiver's perspective **only** by
  joining *from a reservation the caregiver owns* to the minimal elder fields that
  reservation needs.
- `reservations`, `chat_*`, and `notifications` policies for caregivers are always
  scoped `where caregiver_id = auth.uid()`-style. No "browse elders" surface
  exists.
- Elder-owned tables (`elderly_profiles`, elder-side reservation details, elder
  reviews-authored) have **no caregiver-readable policy** except the narrow,
  reservation-scoped exposure.

**Phone privacy.**
- `profiles.phone` (and any private contact field) is readable **only** by the
  owner and by admins. **No public, anon, or cross-user policy selects `phone`.**
- Public/marketplace reads go through a **column-restricted view or explicit
  column list** that excludes `phone`, `email`, and `age` — never `select *`.
- The minimal elder contact a caregiver may see on an **accepted** reservation is
  defined by a dedicated RPC/view that returns only the agreed fields (e.g. first
  name + district), **never the phone number**, unless product explicitly decides
  otherwise (open decision).

---

## 3. Identity & profiles

### 3.1 `profiles`
**Purpose:** Application profile for every account (elder by default; caregiver
capability unlocked separately). One row per auth user.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | = `auth.users.id`, `on delete cascade` |
| `email` | text not null | Account email. **Private** (owner/admin only). |
| `phone` | text | **PRIVATE — never public.** Owner/admin only. |
| `first_name` | text not null | Public display uses first name. |
| `last_name` | text | Private by default (or initial shown publicly). |
| `age` | int | Private. Check `age between 16 and 120`. |
| `avatar_url` | text | Optional profile photo (public-safe). |
| `role` | text not null default `'elder'` | `elder` \| `admin`. (Caregiver is **not** a role here — it is the existence of an approved `caregiver_profiles` row. Keeps universal model.) |
| `account_status` | text not null default `'active'` | `active` \| `suspended` \| `banned`. |
| `created_at` / `updated_at` | timestamptz | Standard. |

> Migration note vs. today: current `profiles` has `role in
> ('client','helper_applicant','verified_helper','admin')` and `display_name`.
> Target simplifies role to `elder`/`admin` and derives caregiver status from
> `caregiver_profiles`. If we keep the current role enum instead, that is decision
> #2 — the RLS shape below is the same either way.

**Relationships:** referenced by nearly every other table via owner FKs.

**RLS (plain English):**
- **Select:** owner can read **their own** row. Admin can read all. **No public or
  cross-user select.** Public display data needed elsewhere (first name, avatar)
  is exposed only through narrow joins/views that **exclude `phone`, `email`,
  `age`, `last_name`**.
- **Insert:** a user may insert **their own** row (`id = auth.uid()`) with
  `role = 'elder'` only. Cannot self-insert `admin`.
- **Update:** owner may update safe self fields (name, age, avatar, phone, email)
  on their own row; **cannot change `role` or `account_status`** (enforced by the
  existing `prevent_non_admin_profile_role_change()` trigger, extended to cover
  `account_status`). Admin may update role/status.
- **Phone privacy:** enforced because **no policy grants any non-owner/non-admin
  read of this table**, and public surfaces never `select *`.
- **One-way rule:** a caregiver has **no** policy to read other users' profiles —
  there is simply no caregiver-scoped select policy here.

### 3.2 `elderly_profiles` *(keep-or-retire — open decision #3)*
**Purpose (if kept):** an optional named relative an elder books *on behalf of*
(full_name, district, non-medical notes), owned by the elder.

Current columns: `caregiver_id` (→ owner profile), `full_name`, `city`, `notes`.
**RLS (current, retained):** owner-only CRUD (`caregiver_id = auth.uid()`); admin
read. **No caregiver read** → consistent with the one-way rule. If retired,
reservations instead carry an address/recipient snapshot (Section 6).

---

## 4. Caregiver identity

### 4.1 `caregiver_applications` *(today: `helper_applications`)*
**Purpose:** Application submitted by an elder account to unlock caregiver
capability; admin-reviewed.

Columns (as today): `id`, `profile_id` → `profiles`, `status` (`draft` \|
`submitted` \| `under_review` \| `approved` \| `rejected`), `full_name`, `city`/
`region_id`, `motivation`, `experience_summary`, `availability_summary`,
timestamps. *(Optional later: certifications, document attachment placeholder —
pending legal review per the brief.)*

**RLS:**
- Applicant: select/insert/update **own** row, and only while status ∈
  (`draft`,`submitted`) — cannot self-approve. (Matches current policy.)
- Admin: select/update all.
- **No caregiver-of-others or elder-of-others access.** No public access.

### 4.2 `caregiver_profiles` *(today: `helper_profiles`)*
**Purpose:** The approved caregiver's public marketplace profile + private payout
linkage.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `profile_id` | uuid not null unique | → `profiles`, `on delete cascade`. |
| `verification_status` | text not null | `applicant` \| `verified_basic` \| `trusted` \| `suspended` \| `banned`. |
| `badge` | text | `verified` \| `volunteer` (semantics = open decision #7). |
| `display_name` | text not null | Public (first name / chosen public name). |
| `bio` | text not null | Public. |
| `experience` | text | Public elderly-care experience info. |
| `covers_whole_city` | boolean not null default false | If true, matches all regions. |
| `is_visible` | boolean not null default false | Admin-controlled publication. |
| `stripe_account_id` | text | **PRIVATE.** Stripe Connect connected-account ref. Owner/admin only; design-only until Stripe phase. |
| `rating_avg` | numeric | Denormalised from `reviews` (nullable). |
| `rating_count` | int not null default 0 | Denormalised. |
| `created_at` / `updated_at` | timestamptz | |

**Constraints:** `is_visible = false OR verification_status in
('verified_basic','trusted')` (keep current guard — only approved profiles can be
public).

**RLS:**
- **Public/anon select:** only rows with `is_visible = true AND verification_status
  in ('verified_basic','trusted')`, and only **safe public columns** (never
  `stripe_account_id`). Implemented via a public **view** or column-scoped policy.
- Owner: select own row (all columns except still cannot read others').
- Owner update: only safe public fields (`bio`, `experience`, `display_name`,
  `covers_whole_city`) via the existing `update_own_*` RPC pattern; **cannot** set
  `verification_status`, `is_visible`, `badge`, `stripe_account_id`.
- Admin: full; `is_visible` toggled only via the admin RPC (current pattern),
  which writes an audit log.
- **One-way rule:** this table is *about caregivers*, so public read is fine; it
  contains **no elder data**. `stripe_account_id` is private (owner/admin only).

---

## 5. Services, pricing, extras, regions

### 5.1 `services` *(today: `service_categories`)*
**Purpose:** Canonical catalogue of allowed (non-medical) services.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `name` | text not null unique | |
| `slug` | text not null unique | URL/i18n key. |
| `description` | text not null | |
| `is_allowed` | boolean not null default true | Safety boundary. |
| `is_active` | boolean not null default true | |
| `sort_order` | int not null default 0 | |
| timestamps | | |

**RLS:** public select where `is_allowed AND is_active`; admin-only writes (current
pattern). Seeded by migration.

### 5.2 `caregiver_services`
**Purpose:** A caregiver's chosen services **with their own price**.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `caregiver_profile_id` | uuid not null | → `caregiver_profiles`, cascade. |
| `service_id` | uuid not null | → `services`. |
| `price_amount` | int not null | Minor units (стотинки). `>= 0`. |
| `currency` | text not null default `'BGN'` | |
| `is_active` | boolean not null default true | |
| unique | | `(caregiver_profile_id, service_id)`. |

**RLS:** public select **only for active rows whose caregiver profile is visible &
verified** (drives "from X лв." and matching) — exclude prices of hidden
caregivers. Owner (caregiver) CRUD on own rows. Admin all. No elder data here.

### 5.3 `service_extras`
**Purpose:** Optional add-ons (take out trash, light tidy-up, …) with prices.

Two viable shapes (open decision): **(a) global catalogue** of extras with admin
prices, or **(b) per-caregiver extras** like `caregiver_services`. Proposed:
**per-caregiver extras** for pricing flexibility, mirroring `caregiver_services`:
`id`, `caregiver_profile_id`, `label`, `price_amount`, `currency`, `is_active`.
**RLS:** same as `caregiver_services`.

### 5.4 `regions`
**Purpose:** Sofia districts / neighbourhoods (launch geography).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `name` | text not null unique | e.g. "Lozenets". |
| `slug` | text not null unique | |
| `city` | text not null default `'Sofia'` | Future multi-city. |
| `is_active` | boolean not null default true | |

**RLS:** public select where `is_active`; admin writes. Seeded from the canonical
Sofia district list (open decision #6).

### 5.5 `caregiver_regions`
**Purpose:** Which districts a caregiver serves (no radius). "Whole city" is the
`caregiver_profiles.covers_whole_city` flag (so matching = `covers_whole_city OR
region_id IN caregiver_regions`).

| Column | Type | Notes |
| --- | --- | --- |
| `caregiver_profile_id` | uuid not null | → `caregiver_profiles`, cascade. |
| `region_id` | uuid not null | → `regions`. |
| PK | | `(caregiver_profile_id, region_id)`. |

**RLS:** public select for visible/verified caregivers (needed for map/search);
owner CRUD on own rows; admin all.

---

## 6. Availability & reservations

### 6.1 `availability_slots`
**Purpose:** Caregiver-published **2-hour** availability slots per day.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `caregiver_profile_id` | uuid not null | → `caregiver_profiles`, cascade. |
| `slot_date` | date not null | |
| `start_time` | time not null | Slot start; 2-hour grid. |
| `end_time` | time not null | `= start_time + 2h` (check). |
| `status` | text not null default `'open'` | `open` \| `held` \| `booked` \| `blocked`. |
| unique | | `(caregiver_profile_id, slot_date, start_time)`. |

**Availability shown to elders** = `status = 'open'` slots **minus** any slot tied
to a `pending`/`approved` reservation (Section 6.3). This is how a caregiver holds
multiple appointments/day without double-booking.

**RLS:** public select of `open` slots for visible/verified caregivers (so elders
can pick times); owner (caregiver) CRUD on own slots; admin all. Slot status
transitions to `held`/`booked` happen **only via the reservation RPC**, never by a
direct client update from an elder.

### 6.2 `reservations` *(today: `bookings`)*
**Purpose:** A requested/approved engagement between an elder and a caregiver.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `elder_id` | uuid not null | → `profiles` (the booker), cascade. |
| `caregiver_profile_id` | uuid not null | → `caregiver_profiles`, restrict. |
| `elderly_profile_id` | uuid | Optional, if `elderly_profiles` kept. |
| `region_id` | uuid not null | → `regions` (district of service). |
| `address_snapshot` | text | **PRIVATE.** Precise address; visible to the assigned caregiver only **after approval** (open decision on exact exposure). |
| `recipient_first_name` | text | Who the visit is for (if not the account holder). |
| `status` | text not null default `'pending'` | State machine (Section 7). |
| `start_at` | timestamptz not null | Derived from chosen slots. |
| `end_at` | timestamptz not null | For completion detection on page load. |
| `total_amount` | int not null | Snapshot sum (minor units). `>= 0`. |
| `currency` | text not null default `'BGN'` | |
| `cancelled_by` | uuid | → `profiles` (audit). |
| `created_at` / `updated_at` | timestamptz | |

**Constraints:** `end_at > start_at`; status in the canonical set
(`pending`,`approved`,`in_progress`,`awaiting_confirmation`,`completed`,
`rejected`,`cancelled`,`disputed`).

**RLS (this is where the one-way rule bites hardest):**
- **Elder select:** `elder_id = auth.uid()` — sees own reservations.
- **Caregiver select:** `caregiver_profile_id IN (select id from caregiver_profiles
  where profile_id = auth.uid())` — sees **only reservations directed at them**.
  This is the *only* way a caregiver ever reaches any elder-linked row. There is
  **no** policy that lets a caregiver list elders or reservations not their own.
- **Insert:** only an elder, for themselves (`elder_id = auth.uid()`), targeting a
  **visible/verified** caregiver, with an **allowed** service set, mirroring the
  current tightened `bookings_client_insert` guard.
- **Status changes:** **not** via free client `UPDATE`. All transitions
  (approve/reject/cancel/complete/report) go through a `SECURITY DEFINER`
  **`transition_reservation(reservation_id, action)`** RPC that (a) checks the
  caller is the right party for that action, (b) validates the transition against
  the state machine, (c) updates slots + payment state atomically, (d) writes an
  audit log + notification. This is the single choke point for money + state.
- `address_snapshot` exposure to the caregiver is gated to `status = 'approved'`+
  via a dedicated view/RPC (never bulk-readable).
- Admin: full.

### 6.3 `reservation_slots`
**Purpose:** The specific availability slots a reservation occupies (links to
`availability_slots`), preventing double-booking.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `reservation_id` | uuid not null | → `reservations`, cascade. |
| `availability_slot_id` | uuid not null | → `availability_slots`, restrict. |
| unique | | `(availability_slot_id)` — a slot can back **one** active reservation. |

**RLS:** readable by the reservation's two parties + admin (via
`owns_reservation`). Written only by the reservation RPC.

### 6.4 `reservation_services`
**Purpose:** Line items (services + extras) with **price snapshot**.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `reservation_id` | uuid not null | → `reservations`, cascade. |
| `service_id` | uuid | → `services` (null if it's an extra). |
| `extra_id` | uuid | → `service_extras` (null if it's a service). |
| `label_snapshot` | text not null | Name at booking time. |
| `unit_price_snapshot` | int not null | Price at booking time (minor units). |
| `quantity` | int not null default 1 | |

**RLS:** read by the two parties + admin; written only by the reservation RPC. The
snapshot guarantees later caregiver price edits never change agreed totals.

---

## 7. Payments (DESIGN ONLY — Stripe Connect escrow-ready)

### 7.1 `payments` *(today: `payment_records`)*
**Purpose:** One escrow record per reservation. **No card data ever.** Statuses +
provider references only. No Stripe code in this phase.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `reservation_id` | uuid not null unique | → `reservations`, cascade. |
| `provider` | text not null default `'stripe'` | |
| `payment_intent_id` | text | **Stripe PaymentIntent ref.** |
| `connected_account_id` | text | Caregiver's Stripe Connect account ref. |
| `transfer_id` | text | Payout/transfer ref on release. |
| `held_amount` | int not null | Authorized/held (minor units). `>= 0`. |
| `captured_amount` | int | Captured on completion. |
| `currency` | text not null default `'BGN'` | |
| `platform_fee` | int | Commission (minor units), `>= 0`. |
| `payment_status` | text not null default `'requires_authorization'` | `requires_authorization` \| `authorized_held` \| `captured` \| `released` \| `refunded` \| `void`. |
| `payout_status` | text not null default `'pending'` | `pending` \| `paid` \| `failed` \| `reversed`. |
| `created_at` / `updated_at` | timestamptz | |

**Escrow ↔ state-machine mapping:**

| Reservation transition | `payment_status` becomes |
| --- | --- |
| submit → `pending` | `authorized_held` (authorize/hold) |
| → `rejected` / `cancelled` | `void` / `refunded` |
| → `completed` | `captured` then `released`; `payout_status = paid` |
| → `disputed` | stays `authorized_held` until admin resolves |

**RLS:**
- Select: the reservation's elder and assigned caregiver (via `owns_reservation`),
  and admin. **No public access.** Caregiver sees payout-relevant status of **their
  own** reservations only — consistent with the one-way rule.
- **Insert/Update: nobody from the client.** Only the reservation/payment
  `SECURITY DEFINER` RPCs (server-trusted) write here. This guarantees *money state
  only changes through the reservation state machine* (`AGENTS.md` backend rule).
- Never store full card numbers, CVC, PINs, passwords, or provider secrets.

---

## 8. Notifications

### 8.1 `notifications`
**Purpose:** Per-user notification center (bell + unread count).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `recipient_id` | uuid not null | → `profiles`, cascade. |
| `type` | text not null | `reservation_requested` \| `reservation_approved` \| `reservation_rejected` \| `reservation_cancelled` \| `chat_message` \| `completion_ready` \| `dispute_update`. |
| `reservation_id` | uuid | → `reservations` (optional ref). |
| `chat_thread_id` | uuid | → `chat_threads` (optional ref). |
| `body` | text | Short summary (no private contact data). |
| `is_read` | boolean not null default false | Drives unread count. |
| `created_at` | timestamptz | |

**RLS:**
- Select/update(read-flag): **owner only** (`recipient_id = auth.uid()`). A user
  only ever sees their **own** notifications. A caregiver's notifications reference
  only their own reservations → the one-way rule holds (no elder enumeration).
- Insert: only via RPCs/triggers tied to reservation/chat events (server-trusted),
  not free client insert.
- Admin: read for support.
- Bodies must **not** contain elder phone numbers or other private contact data.

---

## 9. Chat (post-approval, text/voice/media)

### 9.1 `chat_threads`
**Purpose:** One thread per reservation, created **only when the reservation is
approved**.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `reservation_id` | uuid not null unique | → `reservations`, cascade. |
| `elder_id` | uuid not null | → `profiles`. Denormalised participant. |
| `caregiver_profile_id` | uuid not null | → `caregiver_profiles`. Denormalised participant. |
| `created_at` | timestamptz | |

**RLS:** select only by the two participants (elder = `elder_id`; caregiver =
owner of `caregiver_profile_id`) + admin. Created only by the approval RPC (so no
thread exists before approval). No public access.

### 9.2 `chat_messages`
**Purpose:** Messages within a thread.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `thread_id` | uuid not null | → `chat_threads`, cascade. |
| `sender_id` | uuid not null | → `profiles`. |
| `kind` | text not null default `'text'` | `text` \| `voice` \| `image`. |
| `body` | text | For `text`. |
| `attachment_url` | text | For `voice`/`image`; Supabase Storage path (private bucket). |
| `attachment_mime` | text | |
| `created_at` | timestamptz | |
| `read_at` | timestamptz | |

**RLS:**
- Select: only the thread's two participants + admin (join through `chat_threads`).
- Insert: only a participant of that thread, and **only while the reservation is
  `approved`/`in_progress`** (no chatting after terminal states, or before
  approval). Voice/image storage uses a **private bucket** with per-thread access
  via signed URLs (open decision #9: bucket, allowed types/sizes, retention).
- **One-way rule:** chat is reservation-scoped; a caregiver reaches an elder only
  inside a thread for *their own* approved reservation — never a browse surface.

---

## 10. Reviews

### 10.1 `reviews`
**Purpose:** Elder reviews of a caregiver after a completed reservation.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `reservation_id` | uuid not null unique | → `reservations` (one review per reservation). |
| `elder_id` | uuid not null | → `profiles` (author). |
| `caregiver_profile_id` | uuid not null | → `caregiver_profiles` (subject). |
| `rating` | int not null | `between 1 and 5`. |
| `comment` | text | |
| `created_at` | timestamptz | |

**RLS:**
- Insert: only the elder who owns a **`completed`** reservation, once
  (`unique(reservation_id)`), via RPC that re-checks completion (open decision #10
  on gating/editing).
- Public select: rating + comment + caregiver are public (drives card review
  counts), but **author identity is limited** to first name / anonymised — the
  author's `profiles` row is never bulk-exposed. No elder enumeration → one-way
  rule holds.
- Caregiver: reads reviews about themselves (already public).
- `caregiver_profiles.rating_avg`/`rating_count` updated by trigger/RPC.

---

## 11. Disputes, audit, terms

- **`disputes`** *(today `complaints`)* — created by the elder of a `disputed`
  reservation; admin-resolved. RLS: creator select/insert own; admin all; the
  assigned caregiver may see limited status of disputes on **their own**
  reservations (not the admin notes). Resolution drives the payment release/refund
  via RPC.
- **`audit_logs`** — keep as-is: admin-readable, append-only, written by RPCs for
  every money/state/visibility change. No secrets or private contact data in
  metadata.
- **`terms_acceptances`** — keep as-is: owner insert/select own; admin read.

---

## 12. RLS coverage matrix (one-way rule at a glance)

| Table | Public/anon read | Elder (own) | Caregiver | Notes |
| --- | --- | --- | --- | --- |
| `profiles` | ❌ (only first_name/avatar via narrow view) | own row | ❌ others | phone/email/age private |
| `elderly_profiles` | ❌ | own CRUD | ❌ | one-way |
| `caregiver_profiles` | ✅ visible+verified, safe cols | n/a | own edit (safe) | no elder data |
| `caregiver_services` / `_extras` / `_regions` | ✅ for visible caregivers | n/a | own CRUD | pricing/match |
| `availability_slots` | ✅ open slots, visible caregivers | n/a | own CRUD | slot transitions via RPC |
| `reservations` | ❌ | own (`elder_id`) | **own only** (`caregiver_profile_id`) | **core one-way choke point**; transitions via RPC |
| `reservation_services`/`_slots` | ❌ | via `owns_reservation` | via `owns_reservation` | RPC-written |
| `payments` | ❌ | own reservation | own reservation (status) | **RPC-only writes** |
| `notifications` | ❌ | own | own | recipient-only |
| `chat_threads`/`chat_messages` | ❌ | participant | participant | post-approval only |
| `reviews` | ✅ (rating/comment, anonymised author) | author insert | subject read | gated on completed |
| `disputes` | ❌ | creator | limited status (own) | admin resolves |
| `audit_logs` | ❌ | ❌ | ❌ | admin only, append-only |
| `terms_acceptances` | ❌ | own | n/a | admin read |

**The single most important invariant:** a caregiver's only path to any
elder-linked data is `... where caregiver_profile_id = (my caregiver profile)` on
a reservation they own, and onward joins from there. No table grants a caregiver a
"list elders" capability. No policy returns `profiles.phone` to anyone but the
owner and admins.

---

## 13. Open decisions before Phase 1 (mirror of PRODUCT_SPEC §11)

1. **Account-model reconciliation** — confirm elder = default, caregiver =
   unlocked capability (not a separate signup), one-way rule as described.
2. **Rename vs. additive** — rename `helper_profiles`→`caregiver_profiles`,
   `bookings`→`reservations`, role `client`→`elder`? Or keep current names and add
   new tables only? (`AGENTS.md` forbids renames "unless required".)
3. **`elderly_profiles`** — keep (book on behalf of a named relative) or retire in
   favour of account-level booking + `reservations.address_snapshot`/
   `recipient_first_name`?
4. **Phase scope** — which of {availability, reservations+escrow design,
   notifications, chat, reviews} land in the next implementation phase vs. stay
   design-only?
5. **Escrow timing** — authorize/hold at **submit** (`pending`) vs. at approval.
6. **Sofia district seed list** — canonical source for `regions` (current
   `lib/bulgariaCities.ts` is Bulgaria-wide, not Sofia districts).
7. **Volunteer vs. verified badge** — exact meaning and price/escrow interaction.
8. **Cancellation & refund policy** — who/when/refund split → drives `cancelled`
   transition + payment void/refund.
9. **Voice/media storage** — Supabase Storage bucket, allowed types/sizes,
   retention for chat attachments.
10. **Reviews gating** — completed-only, one-per-reservation, edit window.
11. **Currency** — schema assumes **BGN (стотинки)**; current `payment_records`
    defaulted to `EUR`. Confirm display + storage currency.
12. **Caregiver elder-contact exposure** — exactly which elder fields a caregiver
    sees on an approved reservation (district + first name only, recommended;
    confirm phone stays hidden).

---

## 14. What this document deliberately does NOT do

- It creates **no** migrations and alters **no** database.
- It does **not** implement Stripe, chat transport, Google Maps, or notifications
  delivery — only the **data model** that will support them.
- It does not change the currently-applied schema until Phase 1 is approved.
