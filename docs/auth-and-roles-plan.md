# Auth and Roles Plan

This document describes the VnukPodNaem authentication and role model. Supabase email/password authentication is implemented for the browser UI, and signup now attempts to create database-backed `profiles` and `terms_acceptances` records after auth signup succeeds. Protected middleware and full role enforcement remain planned work.

## Product boundaries

- VnukPodNaem is a non-medical support marketplace.
- Helpers are independent marketplace participants, not employees of the platform.
- The app must not imply guaranteed safety.
- Real payments, Stripe, live booking payments, and payment processing are out of scope for this phase.
- Bulgarian localization, native mobile apps, and medical-service functionality are out of scope for this phase.

## Current auth implementation

Current behavior:

- The app uses `@supabase/supabase-js` for browser-side email/password authentication.
- Required public environment variables are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- The Supabase Email provider must be enabled in the Supabase dashboard.
- The Supabase Site URL must be configured for local and deployed URLs.
- Signup collects an account type and stores it in auth user metadata as `account_type` when Supabase accepts the signup.
- Signup maps the client/caregiver UI option to `profiles.role = client` and the helper applicant UI option to `profiles.role = helper_applicant`.
- Signup also sends `terms_accepted`, `terms_version`, and `privacy_version` auth metadata.
- After auth signup succeeds, the browser client attempts to insert the user's `profiles` row and a `terms_acceptances` row using only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Duplicate profile creation is handled safely so an existing profile does not crash signup or the dashboard retry path.
- The current Terms and Privacy placeholder versions are stored as `v0.1-placeholder`.
- The header shows Login/Sign up for signed-out users and Dashboard/Sign out for signed-in users.
- `/dashboard` shows a login prompt for signed-out users, loads signed-in profile data from the `profiles` table, and shows a clear incomplete-profile message if the database row is missing.

Current limitations:

- The Supabase schema must be applied manually before signup database writes and dashboard profile reads work.
- Role-based routing and protected middleware are not implemented yet.
- No admin database management UI or admin permission enforcement is implemented yet.
- Admin roles must not be self-assignable from browser metadata.
- Do not use a Supabase service role key in the browser.
- Do not commit `.env.local` or secret values.
- Payments, Stripe, booking payments, medical-service functionality, Bulgarian localization, and native mobile apps remain out of scope.

## Planned roles

### Visitor

A person who is not signed in.

Purpose:

- Learn what the platform is.
- Read public safety and service-boundary pages.
- Start login or signup.

### Client/caregiver

A signed-in user who books non-medical help for themselves or on behalf of an elderly person.

Purpose:

- Manage their own profile.
- Manage elderly profiles connected to their account.
- Request allowed non-medical services when booking functionality exists.

### Helper applicant

A signed-in user who has started or submitted an application to provide non-medical support.

Purpose:

- Create and maintain their own helper application.
- Track review status.
- Remain hidden from public helper listings until approved.

### Verified helper

A helper whose application has been approved by an admin and whose account is active.

Purpose:

- Maintain an approved helper profile.
- Appear in helper listings when public and active.
- Later, view assigned or accepted bookings.

### Admin

A trusted platform/support team role for operational review and moderation.

Purpose:

- Review helpers, bookings, complaints/disputes, and audit logs.
- Approve, reject, suspend, or ban helper accounts according to internal policy.
- Support safety, marketplace integrity, and legal/compliance review.

## Planned access rules

| Role | Planned access |
| --- | --- |
| Visitor | Can view public pages only, including landing, services, safety, allowed services, prohibited services, terms, privacy, login, and signup. |
| Client/caregiver | Can manage their own profile, elderly profiles they own, and their own bookings. |
| Helper applicant | Can manage their own helper application and view its status. |
| Verified helper | Can manage their approved helper profile and later view assigned or accepted bookings. |
| Admin | Can review helper applications, bookings, disputes/complaints, payment placeholder records, users needed for support, and audit logs. |

## Route protection plan

Route protection is not implemented in this auth-only phase. Future route protection should be simple and explicit:

- Public pages stay accessible to visitors.
- `/dashboard` and nested client pages require a signed-in client/caregiver or admin as appropriate.
- `/dashboard/elderly-profiles` requires the signed-in client/caregiver to own the elderly profile records being viewed or edited.
- `/dashboard/bookings` requires the signed-in user to be connected to the booking as the client/caregiver, assigned verified helper, or admin.
- `/helper/apply` requires a signed-in helper applicant, verified helper, or admin depending on the workflow step.
- `/helpers` should show only active public verified helper profiles once real data exists.
- `/admin` and nested admin routes require the admin role.

## Database authorization plan

The initial database schema has been drafted and must be applied manually before database-backed auth features work. Supabase row-level security is expected to be enabled for all application tables that contain user or operational data.

High-level policy direction:

- Visitors can read only public data that has been intentionally marked public.
- Signed-in users can read and update their own profile fields that are safe for self-service.
- Clients/caregivers can read and update elderly profiles they own.
- Helper applicants can read and update their own application while its status allows edits.
- Verified helpers can read only their own helper profile and booking records assigned or accepted by them.
- Admins can read and update operational records required for review, support, dispute handling, and audit workflows.
- Audit log creation should happen through trusted server-side actions or carefully controlled database functions in a later phase.

## Role assignment notes

- New users should start with the least privileged role needed for their signup path.
- Admin roles must not be self-assignable from the browser.
- Helper verification must require admin approval before a helper becomes public or eligible for bookings.
- Suspended or banned accounts should lose access to protected marketplace actions.
- Role changes and important safety decisions should create audit logs later.

## Current database-backed auth behavior

- Tables now used by the app: `profiles` and `terms_acceptances`.
- Signup creates the Supabase Auth user first, then inserts `profiles.id`, `profiles.email`, `profiles.role`, and a simple email-derived `profiles.display_name`. Database defaults handle `created_at` and `updated_at`.
- Signup inserts `terms_acceptances.profile_id`, `terms_acceptances.terms_version`, and `terms_acceptances.privacy_version`. The database default handles `accepted_at`.
- If auth succeeds but profile or terms storage fails, the UI reports that account creation succeeded but profile setup did not fully complete. The dashboard provides a safe retry path for signed-in users.
- `/dashboard` reads `email`, `role`, `display_name`, and `created_at` from `profiles`. It shows role-aware placeholder sections for `client`, `helper_applicant`, `verified_helper`, and `admin`.
- This phase does not add Stripe, live payment collection, booking payment processing, admin database management, helper application forms, elderly profile CRUD, bookings, Bulgarian localization, native mobile apps, or medical-service functionality.

## Open questions for the next Supabase phase

- Whether long-term role should live only in `profiles.role`, in Supabase Auth app metadata, or both.
- Which admin actions require server-only logic instead of direct client updates.
- What minimum profile data is required before protected features are available.
- How terms and privacy version acceptance should be enforced before booking or helper application actions.
