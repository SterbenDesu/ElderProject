# Database Schema Draft

This document began as the planning draft for the future Supabase database. The initial MVP schema is now represented by `supabase/migrations/20260529120000_initial_schema.sql`.

Use the migration files as the source of truth for the current implemented SQL schema. Keep this draft as background planning context for later iterations and review it before adding new database-backed features. The current app shell is database-backed when Supabase is configured, but it is still not launched and is not the full MVP.


## Current migration status

- Initial SQL migration created: `supabase/migrations/20260529120000_initial_schema.sql`.
- Manual dashboard apply instructions created: `docs/supabase-schema-apply.md`.
- The migration creates the starter app tables, constraints, seed service categories, `updated_at` triggers, and conservative row-level security policies.
- Codex does not connect to Supabase directly for this setup. Apply and test the SQL manually in a development Supabase project before relying on it for real users.
- Payment-related data remains provider-status metadata only. No Stripe, live payment processing, full card data, card PINs, cash handling, or provider secrets are implemented. Helper acceptance, disputes UI, chat, notifications, ratings/reviews, subscriptions, Bulgarian localization, and advanced admin workflows are also not implemented.

## General schema principles

- Use Supabase Auth for authentication identities.
- Keep application-specific profile data in `profiles`.
- Enable row-level security before storing real user data.
- Store only data needed for the non-medical marketplace MVP.
- Avoid detailed medical history, diagnosis, medication management details, full payment card data, bank card PINs, passwords, or payment provider secrets.
- Keep helpers positioned as independent marketplace participants, not platform employees.
- Keep payment fields as payment-provider-ready placeholders until a regulated provider integration is explicitly implemented later.

## `profiles`

Purpose:

- Stores application profile data linked to a Supabase Auth user.
- Provides the app-level role and account status used by route protection and policies.

Essential fields:

- `id`
- `auth_user_id`
- `email`
- `full_name`
- `phone_number`
- `role`
- `account_status`
- `created_at`
- `updated_at`

Owner/access concept:

- Each signed-in user owns their own profile record.
- Admins can view and manage profile records needed for support, verification, suspension, or ban decisions.

High-level RLS notes:

- Users can read their own profile.
- Users can update only safe self-service fields on their own profile.
- Users cannot self-assign admin or verified helper roles.
- Admin role changes, suspensions, and bans should be admin-only and auditable.

## `elderly_profiles`

Purpose:

- Stores elderly person profiles managed by a client/caregiver.
- The elderly person does not need a separate login in the initial MVP.

Current implemented fields in `supabase/migrations/20260529120000_initial_schema.sql`:

- `id`
- `caregiver_id`
- `full_name`
- `city`
- `notes`
- `created_at`
- `updated_at`

Owner/access concept:

- Owned by the client/caregiver profile referenced by `caregiver_id`.
- Admins can access records only when needed for support, complaint, or safety review.

High-level RLS notes:

- Clients/caregivers can create, read, update, and delete their own elderly profiles under the starter owner policies. If a profile is referenced by future bookings, deletion may be blocked by foreign-key restrictions; an archive field is not part of the current schema yet.
- Other clients cannot read or edit these records.
- Verified helpers should see only limited booking-relevant details for assigned or accepted bookings in a later phase.
- Avoid collecting diagnosis, medication management needs, disability details, clinical care needs, or detailed medical history. The current app flow collects only `full_name`, `city`, and non-medical `notes`.

### Current implementation note

`/dashboard/elderly-profiles` now reads and writes the signed-in client/caregiver user's own `elderly_profiles` rows with the public Supabase browser client. The page supports create, list, edit, and owner-scoped delete actions when current RLS permits them. Signed-out users are prompted to log in, missing `profiles` rows show a setup error, and helper applicant, verified helper, admin, or other non-client roles are shown an access-boundary message rather than management controls.

Elderly profile notes must stay non-medical. The UI warns users not to enter sensitive medical details, diagnoses, medication instructions, card PINs, passwords, cash-handling requests, or access-to-valuables requests. No medical, payment, Stripe, or live booking payment logic is implemented. Booking requests now use `elderly_profiles` as the client-owned elderly-person selection source.

## `helper_applications`

Purpose:

- Stores helper applicant submissions for admin review.
- Separates application review data from public helper profile data.

Essential fields:

- `id`
- `profile_id`
- `status`
- `service_categories_requested`
- `experience_summary`
- `availability_summary`
- `general_location`
- `admin_notes`
- `reviewed_by_admin_id`
- `reviewed_at`
- `created_at`
- `updated_at`

Owner/access concept:

- Owned by the helper applicant profile.
- Admins review and update status, admin notes, reviewer, and review timestamp.

High-level RLS notes:

- Helper applicants can create and read their own application.
- Helper applicant inserts and updates are constrained to `draft` or `submitted` in the starter RLS policy so applicants cannot set `under_review`, `approved`, or `rejected` themselves.
- Helper applicants can create or update their own application from `/helper/apply` while the application is in an applicant-editable status.
- The current UI supports applicant actions that set status to `draft` or `submitted` only.
- Applications with `under_review`, `approved`, or `rejected` are shown read-only in the applicant UI.
- Applicants cannot modify review fields, approve themselves, create public helper profiles, or make themselves visible from the application page.
- Admin helper application review decisions now attempt to create audit logs from the admin session when RLS allows it; a trusted server-side audit path is still recommended for later high-risk workflows.


### Current implementation note

`/helper/apply` now reads and writes the signed-in user's own `helper_applications` row using the existing authenticated RLS policies and only the public Supabase browser variables. The applicant form stores `full_name`, `city`, `motivation`, `experience_summary`, and `availability_summary`. Basic admin review and approval now exist at `/admin`; public helper visibility is still separate and is not automatic. `/helpers` reads only `helper_profiles` rows where the profile is public and verified; it does not read or expose `helper_applications`.

## `helper_profiles`

Purpose:

- Stores approved helper profile information shown to clients/caregivers when public.
- Represents marketplace helper information, not employee records.

Essential fields:

- `id`
- `profile_id`
- `verification_status`
- `display_name`
- `bio`
- `service_categories`
- `general_location`
- `hourly_rate_placeholder`
- `is_public`
- `created_at`
- `updated_at`

Owner/access concept:

- Owned by the verified helper profile.
- Public read access applies only to active verified helpers with `is_public` enabled.
- Admins can manage verification and safety status.

High-level RLS notes:

- Public visitors and clients can read only active, public, verified helper profiles.
- Helper applicants cannot publish themselves by editing `verification_status`.
- Verified helpers can update safe display fields on their own helper profile.
- Admins control verification status, suspension, and ban-related fields.

## `service_categories`

Purpose:

- Defines allowed non-medical service categories.
- Provides public content for service selection and safety boundaries.

Essential fields:

- `id`
- `name`
- `slug`
- `short_description`
- `allowed_examples`
- `prohibited_examples`
- `is_active`
- `sort_order`
- `created_at`
- `updated_at`

Owner/access concept:

- Managed by admins or seeded through reviewed migrations later.
- Read by visitors, clients/caregivers, helper applicants, verified helpers, and admins.

High-level RLS notes:

- Public read access can be allowed for active categories.
- Writes should be admin-only or migration-only.
- Prohibited examples should reinforce that medical, clinical, cash-handling, and off-platform services are not allowed.

## `bookings`

Purpose:

- Stores non-medical client/caregiver booking/service requests and lifecycle statuses.
- The current application flow only creates `requested` rows and lets clients cancel them with `cancelled`; later lifecycle statuses remain database-ready only.
- Payment processing is not implemented in this flow, and the app does not collect card details or create `payment_records`.

Essential fields in the applied starter schema:

- `id`
- `client_id`
- `elderly_profile_id`
- `helper_profile_id`
- `service_category_id`
- `status`
- `requested_start_at`
- `requested_duration_minutes`
- `city`
- `notes`
- `created_at`
- `updated_at`

Owner/access concept:

- Owned by the client/caregiver who created the booking through `client_id`.
- The selected `elderly_profile_id` must belong to the same client/caregiver under the starter insert policy.
- The selected `service_category_id` must refer to an allowed service category.
- Assigned verified-helper viewing is a later phase; the current browser UI does not show requests to helpers or allow helper acceptance.
- Admins may have database-level access through admin RLS, but full admin booking management is not implemented in the app yet.

High-level RLS and application notes:

- Clients/caregivers can read booking rows they created.
- Clients/caregivers can create bookings only for elderly profiles they own and allowed service categories.
- Client cancellation is an update to `status = cancelled`, not a hard delete.
- New booking requests use `status = requested`. The app does not implement `accepted`, `payment_secured`, `in_progress`, `completed_by_helper`, `pending_client_confirmation`, `completed_released`, `disputed`, or `no_show` transitions yet.
- Requests involving medication management, injections, wound care, clinical tasks, bank card PINs, passwords, cash handling, or access-to-valuables should be rejected or flagged.

## `complaints`

Purpose:

- Stores client/caregiver complaints or disputes connected to bookings.
- Supports admin review without promising a guaranteed outcome.

Essential fields:

- `id`
- `booking_id`
- `submitted_by_profile_id`
- `status`
- `category`
- `summary`
- `admin_notes`
- `resolved_by_admin_id`
- `resolved_at`
- `created_at`
- `updated_at`

Owner/access concept:

- Submitted by a client/caregiver connected to the booking.
- Admins review and resolve according to internal policy and future payment provider rules.

High-level RLS notes:

- Clients/caregivers can create complaints for their own bookings.
- Clients/caregivers can read complaints they submitted.
- Verified helpers may need limited complaint status visibility for bookings assigned to them, but detailed admin notes should stay private.
- Admin-only fields include `admin_notes`, `resolved_by_admin_id`, and `resolved_at`.

## `payment_records`

Purpose:

- Stores payment-provider-ready status records for future integration.
- Does not store full card data or process payments in this phase.

Essential fields:

- `id`
- `booking_id`
- `provider_name`
- `provider_payment_reference`
- `amount_total`
- `currency`
- `platform_commission_amount`
- `payment_status`
- `payout_status`
- `dispute_hold_status`
- `created_at`
- `updated_at`

Owner/access concept:

- Connected to a booking.
- Clients/caregivers can view payment status for their own bookings.
- Verified helpers can view payout placeholder status for their own accepted bookings when appropriate.
- Admins can review payment placeholder state for support and disputes.

High-level RLS notes:

- No full card numbers, card security codes, bank card PINs, provider secrets, or raw payment credentials should ever be stored.
- Writes should be tightly controlled by server-side logic or admin-reviewed workflows in a later phase.
- Real refunds, holds, payouts, and provider actions are out of scope until a regulated payment provider integration is explicitly built.

## `audit_logs`

Purpose:

- Records important operational events and safety-sensitive decisions.
- Supports admin review and accountability.

Essential fields:

- `id`
- `actor_profile_id`
- `target_type`
- `target_id`
- `action`
- `metadata_summary`
- `created_at`

Owner/access concept:

- Created by trusted server-side actions, controlled database functions, or admin workflows in a later phase.
- Read by admins only.

High-level RLS notes:

- Regular users should not browse audit logs.
- Audit log records should generally be append-only.
- Metadata should be minimal and must not include secrets, full payment data, unnecessary medical details, or sensitive document contents.

## `terms_acceptances`

Purpose:

- Records that a user accepted specific Terms and Privacy Policy versions.
- Supports future access checks before protected marketplace actions.

Essential fields:

- `id`
- `profile_id`
- `terms_version`
- `privacy_version`
- `accepted_at`
- `ip_address`
- `user_agent`

Owner/access concept:

- Connected to the signed-in user's profile.
- Admins can review acceptance history when needed for support or compliance.

High-level RLS notes:

- Users can create and read their own terms acceptance records.
- Users should not modify historical acceptance records after creation.
- Admin read access should be limited to appropriate support or compliance needs.
- Confirm retention rules before storing IP address and user agent in production.
- Repeated retry/signup edge cases may create multiple `terms_acceptances` rows for the same profile and placeholder versions; decide later whether to add a uniqueness/idempotency constraint after testing the signup retry path.

## Admin helper application review usage

The admin review foundation now uses these existing tables:

- `helper_applications` stores submitted applicant review records and their review `status` (`draft`, `submitted`, `under_review`, `approved`, or `rejected`).
- `profiles` stores the account role. Approval updates the applicant's `profiles.role` to `verified_helper`.
- `helper_profiles` stores the helper marketplace profile foundation. Approval creates or updates a row for the applicant with `verification_status = verified_basic` and `is_visible = false` so approved helpers are not published automatically.
- `audit_logs` stores a best-effort admin status-change log with `actor_id`, `action`, `target_table`, `target_id`, and metadata containing old and new statuses.

The starter migration includes admin RLS policies for selecting and updating operational records needed by this review flow. Admin role assignment is still sensitive: users cannot self-assign admin through signup, and helper applicants cannot approve themselves. Public helper listing remains limited to rows in `helper_profiles` where `is_visible = true` and `verification_status` is `verified_basic` or `trusted`; helper applications are never public listings.

Payment logic, Stripe, live booking payments, helper assignment, helper acceptance, and advanced booking lifecycle logic remain unimplemented in the application layer.

## Verified helper profile editing and admin public visibility update

The helper profile management phase continues to use the existing `helper_profiles` table. Verified helpers may edit only these safe public fields:

- `bio`
- `city`
- `service_radius_km`

Verified helpers may not edit `verification_status`, `is_visible`, `profile_id`, account `role`, or admin-only fields. Public visibility remains admin-controlled through the `is_visible` column.

A migration adds two security-definer RPCs that are designed to preserve RLS boundaries while avoiding service role keys in the browser:

- `public.update_own_helper_profile(p_bio text, p_city text, p_service_radius_km integer)` verifies `auth.uid()` has `profiles.role = verified_helper`, requires an existing verified helper profile, and updates only `bio`, `city`, and `service_radius_km`.
- `public.set_helper_profile_visibility(p_helper_profile_id uuid, p_is_visible boolean)` verifies `auth.uid()` has `profiles.role = admin`, only allows verified helper profiles to be made public, updates `helper_profiles.is_visible`, and writes a best-effort `audit_logs` row with `actor_id`, `action = helper_profile_visibility_changed`, `target_table = helper_profiles`, `target_id`, and metadata containing old and new visibility values.

`/helpers` reads only visible verified `helper_profiles` rows and does not read or expose `helper_applications`, public email addresses, hidden helpers, or unverified applicants. No booking assignment exists yet, and payment logic is still not implemented.

## Current specific-helper request behavior

The starter schema already includes nullable `bookings.helper_profile_id`, and the app uses this field when a client/caregiver requests a specific public helper from `/helpers/[id]`. The `20260530140000_tighten_booking_helper_rls.sql` migration updates client booking insert/update RLS so the database also requires a non-null `helper_profile_id` to reference a visible helper profile with `verification_status` of `verified_basic` or `trusted`.

Current application behavior:

- Public helper detail pages read only visible verified `helper_profiles` rows: `is_visible = true` and `verification_status` in `verified_basic` or `trusted`.
- Public helper pages expose only safe profile fields: `bio`, `city`, `service_radius_km`, and public verification status labels.
- Public helper pages do not expose helper email addresses, `profile_id`, helper applications, private user details, hidden helpers, unverified helpers, or admin-only fields.
- Client/caregiver users can create `bookings` rows with `status = requested` and `helper_profile_id` set to the selected visible helper profile; database RLS now enforces that non-null helper reference in addition to app-level checks.
- General booking requests still store `helper_profile_id = null`.
- `/dashboard/bookings` distinguishes general/unassigned requests from specific-helper requests and shows only safe public helper details when the helper remains visible and readable.
- Helper acceptance is not implemented yet.
- Payment processing, Stripe, card collection, live booking payments, helper acceptance, disputes, Bulgarian localization, chat, notifications, ratings/reviews, subscriptions, and advanced admin workflows are not implemented yet.
- The notes UI remains non-medical and warns users not to enter medical details, medication instructions, diagnoses, card PINs, passwords, cash-handling requests, or access-to-valuables requests.
