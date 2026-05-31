# Auth and Roles Plan

This document describes the VnukPodNaem authentication and role model. Supabase email/password authentication is implemented for the browser UI, and signup now attempts to create database-backed `profiles` and `terms_acceptances` records after auth signup succeeds. Protected middleware and full role enforcement remain planned work. The current shell is database-backed when Supabase is configured, but it is still not launched or a full MVP.

## Product boundaries

- VnukPodNaem is a non-medical support marketplace.
- Helpers are independent marketplace participants, not employees of the platform.
- The app must not imply guaranteed safety.
- Real payments, Stripe, live booking payments, and payment processing are out of scope for this phase.
- Helper acceptance, full booking lifecycle, disputes/complaints UI, chat, notifications, ratings/reviews, subscriptions, advanced admin workflows, Bulgarian localization, native mobile apps, and medical-service functionality are out of scope for this phase.

## V2 role interpretation

The product direction is now a universal user signup model. Roles remain internal authorization states, not choices that users make during signup.

- The default new user role should be `client` or an equivalent normal user role internally.
- Users do not choose a role at signup. Signup should collect normal account/profile fields and policy acceptance only.
- `helper_applicant` should be assigned when a user submits a caregiver application, not at signup.
- `verified_helper` should be assigned only after admin approval.
- `admin` should remain manually controlled, never self-assignable from browser metadata, and hidden from normal navigation/UI.
- Existing database role fields may remain for now, but future UX should hide role mechanics behind profile, application, and approval flows.

## Current auth implementation

Current behavior:

- The app uses `@supabase/supabase-js` for browser-side email/password authentication.
- Required public environment variables are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- The Supabase Email provider must be enabled in the Supabase dashboard.
- The Supabase Site URL must be configured for local and deployed URLs.
- Current deployed/signup UI may still collect an account type and store it in auth user metadata as `account_type`; this is legacy UX that should be removed in a future V2 refactor.
- Current signup may still map the client/caregiver UI option to `profiles.role = client` and the helper applicant UI option to `profiles.role = helper_applicant`; future V2 signup should instead create a normal user/client-capable profile by default.
- Signup also sends `terms_accepted`, `terms_version`, and `privacy_version` auth metadata.
- After auth signup succeeds, the browser client attempts to insert the user's `profiles` row and a `terms_acceptances` row using only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Duplicate profile creation is handled safely so an existing profile does not crash signup or the dashboard retry path.
- The current Terms and Privacy placeholder versions are stored as `v0.1-placeholder`. Repeated signup or retry edge cases may create multiple `terms_acceptances` rows for the same user/version; keep this as a future cleanup decision until a safe uniqueness/idempotency change is designed and tested.
- The header shows Login/Sign up for signed-out users and Dashboard/Sign out for signed-in users.
- `/dashboard` shows a login prompt for signed-out users, loads signed-in profile data from the `profiles` table, shows a clear incomplete-profile message if the database row is missing, shows helper application status for `helper_applicant` users when an application exists, and links client/caregiver users to elderly profile management and booking request management with counts when RLS allows them.
- `/dashboard/elderly-profiles` now lets signed-in client/caregiver users create, view, update, and delete their own non-medical `elderly_profiles` rows using their normal authenticated browser session. Signed-out users see a login prompt, missing profile rows show a setup error, and helper/admin/non-client roles see an access-boundary message instead of management controls.
- `/dashboard/bookings` now lets signed-in client/caregiver users create, view, and cancel their own basic booking requests with `bookings`, `elderly_profiles`, and allowed `service_categories`. Signed-out users see a login prompt, missing profile rows show a setup error, helper roles and other non-client roles see an access-boundary message, and admin users see a placeholder instead of full booking management.
- `/helper/apply` now lets signed-in users create or update their own `helper_applications` row as `draft` or `submitted`; signed-out users see a login/signup prompt.
- `/helpers` only reads visible verified `helper_profiles` and does not expose submitted `helper_applications` or unverified applicants publicly.

Current limitations:

- The Supabase schema must be applied manually before signup database writes and dashboard profile reads work.
- Role-based routing and protected middleware are not implemented yet. Future role checks should follow the V2 interpretation above.
- A basic `/admin` helper application review foundation is implemented for admin profiles; broader admin database management is still not implemented.
- Admin roles must not be self-assignable from browser metadata.
- Do not use a Supabase service role key in the browser.
- Do not commit `.env.local` or secret values.
- Payments, Stripe, booking payments, helper assignment, helper acceptance, matching, helper notifications, disputes/complaints UI, chat, ratings/reviews, subscriptions, advanced admin workflows, medical-service functionality, Bulgarian localization, and native mobile apps remain out of scope.


## Implemented client/caregiver elderly profile flow

Client/caregiver users can now open `/dashboard/elderly-profiles` to manage elderly profiles connected to their account. The page uses the `elderly_profiles` table and the signed-in user's normal Supabase session with only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No service role key is used.

The form intentionally collects only `full_name`, `city`, and `notes`. The notes field is labeled for non-medical support planning and warns users not to enter sensitive medical details, diagnoses, medication instructions, card PINs, passwords, cash-handling requests, or access-to-valuables requests. Medication, diagnosis, disability, and clinical care fields are intentionally not part of this flow.

The current starter schema includes owner-scoped select, insert, update, and delete RLS policies for `elderly_profiles`. Delete can still be blocked later if related booking records exist because bookings reference elderly profiles with restrictive foreign keys. The UI reports that limitation instead of bypassing RLS or using privileged keys.

Booking requests now use elderly profiles for the client/caregiver booking request form, so clients need at least one elderly profile before creating a request. Payment flow, Stripe, live booking payments, helper assignment, helper acceptance, matching, helper notifications, and medical-service functionality are not implemented.


## Implemented client/caregiver booking request flow

Client/caregiver users can now open `/dashboard/bookings` to create and manage basic booking/service requests. The page uses the existing `bookings` table for requests, `elderly_profiles` for the selected elderly person, and `service_categories` for allowed non-medical service categories. It uses the signed-in user's normal Supabase browser session with only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; no service role key is used.

New requests are inserted with `status = requested`. The client flow intentionally does not implement `accepted`, `payment_secured`, `in_progress`, `completed_by_helper`, `pending_client_confirmation`, `completed_released`, `disputed`, or `no_show` transitions. Clients can cancel only requests that are still `requested`; cancellation updates the row to `status = cancelled` and does not hard-delete booking records.

The booking request form collects only `elderly_profile_id`, `service_category_id`, `city`, `requested_start_at`, `requested_duration_minutes`, and non-medical `notes`. The notes helper text warns users not to enter medical details, diagnoses, medication instructions, card PINs, passwords, cash-handling requests, or access-to-valuables requests. No medication, diagnosis, disability, clinical care, emergency care, payment card, or payment processing fields are part of this flow.

Helper users cannot accept bookings yet, cannot view booking requests from this route, and are not notified. Admin users see only a placeholder on `/dashboard/bookings`; full admin booking management is not implemented.

## Implemented helper application flow

The helper application flow now uses the `helper_applications` table directly from the authenticated browser session with the public Supabase publishable key. Applicants can save a draft or submit an application with `full_name`, `city`, `motivation`, `experience_summary`, and `availability_summary`. Saving sets `status = draft`; submitting sets `status = submitted`.

Applications with `under_review`, `approved`, or `rejected` status are shown as read-only in the applicant UI. Applicants cannot approve themselves, cannot create public helper marketplace profiles from `/helper/apply`, and cannot make themselves visible in `/helpers`. Basic admin review now exists at `/admin`; public helper visibility remains a separate planned workflow.

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
- `/dashboard/bookings` currently allows only the signed-in client/caregiver to manage their own booking requests; helper viewing/acceptance and full admin booking management are later phases.
- `/helper/apply` currently prompts signed-out visitors to log in or sign up, then lets the signed-in application owner save `draft` or `submitted` application data. Future route protection should narrow this to helper-applicant workflows as protected routing is added.
- `/helpers` shows only active public verified helper profiles when they exist; unverified applicants and submitted applications remain private.
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

- New users should start as `client` or an equivalent normal user role by default, regardless of whether they may later apply as caregivers.
- Users should not choose roles during signup.
- `helper_applicant` should be assigned when a user submits the caregiver application flow.
- `verified_helper` should be assigned only after admin approval.
- Admin roles must not be self-assignable from the browser and should stay hidden from normal UI.
- Helper verification must require admin approval before a helper becomes public or eligible for bookings.
- Suspended or banned accounts should lose access to protected marketplace actions.
- Role changes and important safety decisions should create audit logs later.

## Current database-backed auth behavior

- Tables now used by the app: `profiles`, `terms_acceptances`, `elderly_profiles`, `bookings`, `service_categories`, `helper_applications`, and `helper_profiles` for public visible helper reads plus helper profile editing/admin visibility controls.
- Current signup creates the Supabase Auth user first, then inserts `profiles.id`, `profiles.email`, `profiles.role`, and a simple email-derived `profiles.display_name`. Database defaults handle `created_at` and `updated_at`. Future V2 signup should default the inserted profile to a normal user role without asking the user to choose a role.
- Signup inserts `terms_acceptances.profile_id`, `terms_acceptances.terms_version`, and `terms_acceptances.privacy_version`. The database default handles `accepted_at`.
- If auth succeeds but profile or terms storage fails, the UI reports that account creation succeeded but profile setup did not fully complete. The dashboard provides a safe retry path for signed-in users.
- `/dashboard` reads `email`, `role`, `display_name`, and `created_at` from `profiles`. It shows role-aware placeholder sections for `client`, `helper_applicant`, `verified_helper`, and `admin`, and shows helper application status for helper applicants when available.
- This phase includes database-backed auth/profile setup, client elderly profile CRUD, basic client booking requests, applicant-owned helper application draft/submission, verified helper profile editing, admin-controlled public helper visibility, and a basic admin helper review foundation. It does not add Stripe, live payment collection, booking payment processing, helper acceptance, full booking lifecycle, disputes/complaints UI, chat, notifications, ratings/reviews, subscriptions, broad admin database management, Bulgarian localization, native mobile apps, medical-service functionality, or automatic helper acceptance.

## Open questions for the next Supabase phase

- Whether long-term role should live only in `profiles.role`, in Supabase Auth app metadata, or both.
- Which admin actions require server-only logic instead of direct client updates.
- What minimum profile data is required before protected features are available.
- How terms and privacy version acceptance should be enforced before booking or helper application actions.

## Implemented admin helper application review foundation

`/admin` now performs client-side access checks with the signed-in Supabase session and the signed-in user's `profiles.role` value. Signed-out visitors are asked to log in, signed-in users without a profile see a missing-profile message, signed-in non-admin users see access denied, and only `admin` users load helper application review data.

The admin dashboard foundation now uses `helper_applications` for the real review list and detail panel. Admin users can mark an application `under_review`, `approved`, or `rejected` through the admin-only Supabase RPC `public.review_helper_application(p_application_id uuid, p_action text)`. Approval updates the applicant's `profiles.role` to `verified_helper` and creates or updates the related `helper_profiles` row with `verification_status = verified_basic` and `is_visible = false` inside that database function instead of direct browser table updates.

Approved helpers are intentionally not made public automatically. Public listing still requires `helper_profiles.is_visible = true` plus a verified public status through a separate safe visibility workflow. The current admin panel does not add Stripe, payment processing, live booking payments, booking management, Bulgarian localization, native mobile functionality, medical-service functionality, or guaranteed-safety claims.

Audit logging is attempted inside the RPC by inserting an `audit_logs` row with the admin actor, `target_table = helper_applications`, the application id, and metadata containing `old_status` and `new_status`. If audit insertion fails, the RPC still returns one stable JSON object with an audit warning field; the app reports the warning and does not disable security.


## Admin helper approval RPC

Helper application review actions are handled by the Supabase RPC `public.review_helper_application(p_application_id uuid, p_action text)`, installed by `supabase/migrations/20260530120000_admin_helper_review_rpc.sql`. The browser admin page calls this RPC with the signed-in admin session and only the publishable Supabase key. It does not use a service role key and does not directly coordinate role/profile updates from browser code.

The RPC verifies the current authenticated user has `profiles.role = 'admin'` before doing any review work. It supports `under_review`, `approved`, and `rejected`. Approval updates the applicant `profiles.role` to `verified_helper`, creates or updates a `helper_profiles` row with `verification_status = verified_basic`, and keeps `helper_profiles.is_visible = false` so approval does not automatically publish the helper in public search.

Role changes remain protected: users cannot self-assign admin or verified helper during signup, and the profile role-protection trigger should remain in place unless replaced by an equal or safer database-side control.

## Verified helper profile management and public visibility

Verified helpers can now open `/dashboard/helper-profile` to manage only the safe public profile fields stored in `helper_profiles`: `bio`, `city`, and `service_radius_km`. The route uses the signed-in user's normal Supabase browser session and the public environment variables only. It does not expose helper controls for `verification_status`, `is_visible`, `profile_id`, `role`, or admin-only fields.

Access behavior for `/dashboard/helper-profile` is role-aware:

- signed-out visitors see a login message;
- signed-in users with no `profiles` row see a clear profile setup error;
- `verified_helper` users can edit the safe helper profile fields when an approved `helper_profiles` row exists;
- `helper_applicant` users see application-status guidance and a link to `/helper/apply`;
- `client` users see that helper profile management is only for approved helpers;
- `admin` users are linked back to `/admin` for helper visibility management.

Only admins control public helper visibility. `/admin` now loads approved helper profiles and calls the admin-only `set_helper_profile_visibility(p_helper_profile_id uuid, p_is_visible boolean)` RPC to toggle `helper_profiles.is_visible`. The RPC verifies the signed-in actor has `profiles.role = admin`, only allows verified helper profiles to be made public, and attempts to write an `audit_logs` row with the old and new visibility values. Helpers cannot make themselves public.

`/helpers` remains public-safe: it reads only `helper_profiles` rows where `is_visible = true` and `verification_status` is `verified_basic` or `trusted`, and it shows only safe fields. Helper applications, email addresses, hidden helpers, and unverified applicants are not exposed publicly.

Booking assignment, helper acceptance, payment processing, Stripe, live booking payments, card collection, native mobile apps, Bulgarian localization, and medical-service functionality are still not implemented.

## Visible helper detail pages and specific-helper booking requests

`/helpers` now links each public visible verified helper card to `/helpers/[id]`. The detail route reads only `helper_profiles` rows where `is_visible = true` and `verification_status` is `verified_basic` or `trusted`, and it shows only safe public helper fields: bio, city, service radius, and a public verification label. It does not expose helper email addresses, private profile ownership IDs, helper application answers, hidden helpers, unverified applicants, or admin-only fields.

Signed-out visitors on `/helpers/[id]` see a prompt to log in or sign up as a client/caregiver. Signed-in users with roles `helper_applicant`, `verified_helper`, or `admin` see an access-boundary message explaining that booking requests are for client/caregiver accounts. Signed-in `client` users can create a booking request for the visible helper.

Specific-helper requests still use the same owner-scoped browser Supabase session and public environment variables only. The app inserts a `bookings` row with `status = requested` and stores the selected visible helper in `bookings.helper_profile_id`. The `20260530140000_tighten_booking_helper_rls.sql` migration tightens the client booking insert/update policies so a non-null `helper_profile_id` must reference a `helper_profiles` row where `is_visible = true` and `verification_status` is `verified_basic` or `trusted`, while preserving client ownership, elderly-profile ownership, and allowed service-category checks. Helper acceptance, helper notifications, final confirmation, payment collection, Stripe/payment processing, disputes, Bulgarian localization, and live booking payments are not implemented yet.

`/dashboard/bookings` now labels each booking as either a general/unassigned request or a request for a specific helper. When `helper_profile_id` is present, it attempts to show only safe public helper details from visible verified helper profiles. If that helper is later hidden or cannot be read under RLS, the client list keeps the booking visible but does not expose private helper data.
