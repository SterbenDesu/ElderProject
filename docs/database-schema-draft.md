# Database Schema Draft

This document began as the planning draft for the future Supabase database. The initial MVP schema is now represented by `supabase/migrations/20260529120000_initial_schema.sql`.

Use the migration file as the source of truth for the current implemented SQL schema. Keep this draft as background planning context for later iterations and review it before adding new database-backed features.


## Current migration status

- Initial SQL migration created: `supabase/migrations/20260529120000_initial_schema.sql`.
- Manual dashboard apply instructions created: `docs/supabase-schema-apply.md`.
- The migration creates the starter app tables, constraints, seed service categories, `updated_at` triggers, and conservative row-level security policies.
- Codex does not connect to Supabase directly for this setup. Apply and test the SQL manually in a development Supabase project before relying on it for real users.
- Payment-related data remains provider-status metadata only. No Stripe, live payment processing, full card data, card PINs, cash handling, or provider secrets are implemented.

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

Essential fields:

- `id`
- `caregiver_profile_id`
- `display_name`
- `general_location`
- `mobility_notes`
- `communication_preferences`
- `emergency_contact_name`
- `emergency_contact_phone`
- `created_at`
- `updated_at`

Owner/access concept:

- Owned by the client/caregiver profile referenced by `caregiver_profile_id`.
- Admins can access records only when needed for support, complaint, or safety review.

High-level RLS notes:

- Clients/caregivers can create, read, update, and later archive their own elderly profiles.
- Other clients cannot read or edit these records.
- Verified helpers should see only limited booking-relevant details for assigned or accepted bookings in a later phase.
- Avoid collecting diagnosis, medication management needs, or detailed medical history.

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

- Stores non-medical service booking requests and their lifecycle statuses.
- Keeps payment-provider-ready placeholder fields without processing payments in this phase.

Essential fields:

- `id`
- `client_profile_id`
- `elderly_profile_id`
- `helper_profile_id`
- `service_category_id`
- `requested_start_at`
- `requested_duration_minutes`
- `general_location`
- `non_medical_request_details`
- `status`
- `payment_status`
- `payout_status`
- `platform_commission_percent`
- `provider_payment_reference`
- `confirmation_window_ends_at`
- `created_at`
- `updated_at`

Owner/access concept:

- Owned by the client/caregiver who created the booking.
- Assigned verified helpers can access booking details necessary to decide, perform, or complete the accepted non-medical service.
- Admins can access bookings for support, moderation, dispute review, and audit purposes.

High-level RLS notes:

- Clients/caregivers can read bookings they created.
- Clients/caregivers can create bookings only for elderly profiles they own and allowed service categories.
- Verified helpers can read bookings assigned to them or accepted by them.
- Admins can review and update statuses according to policy.
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

## Admin helper application review usage

The admin review foundation now uses these existing tables:

- `helper_applications` stores submitted applicant review records and their review `status` (`draft`, `submitted`, `under_review`, `approved`, or `rejected`).
- `profiles` stores the account role. Approval updates the applicant's `profiles.role` to `verified_helper`.
- `helper_profiles` stores the helper marketplace profile foundation. Approval creates or updates a row for the applicant with `verification_status = verified_basic` and `is_visible = false` so approved helpers are not published automatically.
- `audit_logs` stores a best-effort admin status-change log with `actor_id`, `action`, `target_table`, `target_id`, and metadata containing old and new statuses.

The starter migration includes admin RLS policies for selecting and updating operational records needed by this review flow. Admin role assignment is still sensitive: users cannot self-assign admin through signup, and helper applicants cannot approve themselves. Public helper listing remains limited to rows in `helper_profiles` where `is_visible = true` and `verification_status` is `verified_basic` or `trusted`; helper applications are never public listings.

Payment logic, Stripe, live booking payments, and booking lifecycle logic remain unimplemented in the application layer.
