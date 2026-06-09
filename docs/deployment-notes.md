# Deployment Notes

Use this file as the source of truth for deployment setup and deployment status.

## Deployment provider

Recommended provider: **Vercel** for the Next.js web app.

## V2 product direction transition note

- Current deployed shell may still contain old role-selection UX until future refactor tasks are completed.
- Future tasks will align signup, profile/dashboard, homepage copy, and navigation with the new V2 universal profile product model.
- During this transition, deployment verification should distinguish between current implemented behavior and the intended V2 documentation direction.

## Current deployment status

Not deployed yet. The repository now contains a Next.js app shell with Supabase email/password authentication, database-backed client elderly profiles, booking requests, helper applications, helper profile editing, public helper visibility, and admin helper review when Supabase public environment variables are configured. It is still an early shell, not a launched/full MVP. All required Supabase SQL migrations must be applied manually in the Supabase dashboard before database-backed workflows are considered ready.

## Current stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- npm
- Supabase Auth through `@supabase/supabase-js`

## Required services

- Vercel for hosting the web app.
- Supabase for email/password authentication and the PostgreSQL database schema.
- Stripe or another marketplace payment provider is not required for this phase and must not be added until a later payment-specific task. No payment logic, live booking payments, helper acceptance, disputes, Bulgarian localization, chat, notifications, ratings/reviews, subscriptions, or advanced admin workflows exist yet.

## Required environment variables

No real Supabase credentials are committed. Configure these names locally and in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=   # optional — see below
```

These are public browser variables. Do not commit `.env.local`, service role keys, or secret values. Do not use service role keys in browser code.

### Google Maps key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)

- Where to get it: Google Cloud Console → APIs & Services → Credentials → create an
  API key. Enable both the **Maps JavaScript API** and the **Geocoding API** for the
  project.
- It powers the home-page address autocomplete and the silent reverse-geocode that
  maps a chosen address to a Sofia district (`regions`).
- It is a **publishable** browser key (hence the `NEXT_PUBLIC_` prefix). Restrict it
  on the Google side to the production/preview domains (HTTP referrer restriction)
  and to the two APIs above, so the exposed key cannot be abused elsewhere.
- No additional/server Maps key is required — the geocoding runs client-side through
  the same JS API.

### Google Maps Map ID (`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`) — optional

- The marketplace results map (`/helpers`) renders caregiver **price pins** with
  `AdvancedMarkerElement`, which requires a vector map and therefore a **Map ID**.
- This variable is **optional**. When it is unset, the app falls back to Google's
  public `DEMO_MAP_ID`, which renders advanced markers without any extra Cloud
  setup — fine for development and preview.
- For production, create a Map ID in Google Cloud Console → Google Maps Platform →
  **Map Management** (type: *JavaScript / Vector*) and set it here, so you control
  styling and are not relying on the shared demo id.
- It is a public, non-secret identifier (hence the `NEXT_PUBLIC_` prefix).

## Development command

```bash
npm run dev
```

## Build command

```bash
npm run build
```

## Start command

```bash
npm run start
```

## Local setup

1. Run `npm install` to install dependencies, including `@supabase/supabase-js`.
2. Create a local `.env.local` file. Never commit it.
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. In Supabase, enable the Email provider.
5. In Supabase, set the Site URL to `http://localhost:3000` for local testing.
6. Run `npm run dev`.
7. Test `/signup`, `/login`, header auth state, sign out, `/dashboard`, profile creation, terms acceptance creation, missing-profile handling, `/helper/apply` draft/submission behavior, and `/helpers` public verified listing behavior.

## Database setup — Phase 1 target model (apply `SUPABASE_SETUP.sql`)

> **If the live site shows `column profiles.first_name does not exist` or
> `Could not find the 'age' column of 'profiles'`, the Phase 1 migrations were
> never applied to the live database. Apply `SUPABASE_SETUP.sql` (repo root).**

`SUPABASE_SETUP.sql` at the repository root is ONE consolidated, **idempotent**
script that brings the database to the Phase 1 target model from
`DATABASE_SCHEMA.md`. It is equivalent to applying every migration under
`supabase/migrations/` in order, but is safe to paste and run as a single query.

How to apply (no direct DB access needed from the agent):

1. Open the Supabase Dashboard for the project → **SQL Editor** → **New query**.
2. Paste the entire contents of `SUPABASE_SETUP.sql`.
3. Confirm you are in the correct project, then **Run**. It is safe to re-run.

What it does (data-preserving — `ALTER`/`ADD`/guarded `RENAME`, never `DROP TABLE`):

- Extends `profiles` to the target identity columns the app requires
  (`first_name` (was `display_name`), `last_name`, `age`, `avatar_url`,
  `account_status`) and simplifies `role` to `elder` | `admin`.
- Renames the helper-era tables to the caregiver/elder vocabulary
  (`helper_profiles`→`caregiver_profiles`, `helper_applications`→
  `caregiver_applications`, `bookings`→`reservations`,
  `service_categories`→`services`, `payment_records`→`payments`,
  `complaints`→`disputes`) and adds the new tables (`regions`,
  `caregiver_services`, `service_extras`, `caregiver_regions`,
  `availability_slots`, `reservation_slots`, `reservation_services`,
  `notifications`, `chat_threads`, `chat_messages`, `reviews`).
- Enables RLS on every table and (re)creates all policies: the **one-way rule**
  (a caregiver can never enumerate elders), **phone privacy**
  (`profiles.phone`/`email`/`age`/`last_name` are owner+admin only — no
  public/anon/cross-user read), the column-level revoke of
  `caregiver_profiles.stripe_account_id`, and the state-machine RPCs.
- Creates the public `avatars` storage bucket + owner-scoped write policies.
- Seeds (upserts) the 24 Sofia districts and the non-medical service catalogue.
  The dev-only fake caregiver accounts from `supabase/seed.sql` are intentionally
  **not** seeded by this script (never seed production with them).

Verified on a local PostgreSQL 16 cluster against (a) a fresh database and (b) a
simulated pre-Phase-1 database with sample rows: applies cleanly, is idempotent
on re-run, preserves existing data (`display_name` value carried into
`first_name`, phone kept), and the one-way-rule / phone-privacy / column-revoke
RLS checks all pass.

### Known follow-up after applying Phase 1

Applying Phase 1 renames the helper-era tables. The signup, **My profile**
(`/account`), and **Become a caregiver** (`/helper/apply`) pages use the target
schema and work after the script runs. The older marketplace pages still
reference pre-Phase-1 names/columns (`bookings`, `helper_profiles`, `client_id`,
`service_category_id`, the `update_own_helper_profile` RPC, etc.) via
`lib/supabase/bookings.ts` and `lib/supabase/helperProfiles.ts`, so
`/dashboard/bookings`, `/helpers`, `/helpers/[id]`, `/dashboard/helper-profile`,
and the marketplace parts of `/admin` need a **follow-up** rewrite onto the
`reservations` + `caregiver_services` model (this is the required follow-up noted
in `VERIFICATION.md`, and is a separate, larger task — not a simple rename). The
production build is unaffected because those references are string literals.

## Database setup — original ordered migrations

The current database schema and RPC/policy updates are represented by the ordered migration files in `supabase/migrations/`:

```bash
supabase/migrations/20260529120000_initial_schema.sql
supabase/migrations/20260530120000_admin_helper_review_rpc.sql
supabase/migrations/20260530130000_helper_profile_management.sql
supabase/migrations/20260530140000_tighten_booking_helper_rls.sql
```

These migrations create the starter `profiles`, elderly profile, helper application/profile, service category, booking, complaint, payment-status, audit log, and terms acceptance tables; install admin/helper-profile RPCs; enable row-level security; and tighten booking insert/update RLS so non-null `helper_profile_id` values must reference visible verified/trusted helper profiles.

The migrations must be applied manually before signup, dashboard, helper, booking, and admin database workflows are considered ready. Codex does not need direct Supabase access for this step. Follow `docs/supabase-schema-apply.md`.

Current auth metadata saved during signup when Supabase accepts it:

- `account_type`
- `terms_accepted`
- `terms_version`
- `privacy_version`

Current database rows created during signup when the schema and RLS policies allow it:

- `profiles` with the auth user id, email, safe role mapping, and simple display-name fallback.
- `terms_acceptances` with the auth user id and placeholder Terms/Privacy versions.

`/dashboard` now reads the signed-in user's `profiles` row and shows role-aware placeholders. For `helper_applicant` users, it also shows the current helper application status when a `helper_applications` row exists and links to `/helper/apply`. Client/caregiver users see elderly profile and booking request counts/links when RLS allows them. Admin users see a link to `/admin`. It does not include broad admin database management, Stripe, payment processing, helper assignment, helper acceptance, or live booking payments.

Current helper application behavior:

- `/helper/apply` uses `helper_applications` for signed-in applicants.
- Applicants can save a draft (`status = draft`) or submit (`status = submitted`).
- `under_review`, `approved`, and `rejected` applications are read-only in the applicant UI.
- Basic admin review and approval tooling is implemented at `/admin`.
- Public helper marketplace visibility is not implemented from the application page.
- Unverified helpers and submitted applications are not shown publicly; `/helpers` only reads visible verified `helper_profiles` rows.

Before real user data is used in production:

1. Apply the ordered SQL migrations in a development Supabase project first.
2. Confirm all app tables exist.
3. Confirm row-level security is enabled on every app table.
4. Test role-based access for visitors, clients/caregivers, helper applicants, verified helpers, and admins.
5. Confirm signup creates `profiles` and `terms_acceptances` rows with only the publishable key and authenticated user session.
6. Review any policy TODO comments before allowing browser writes for sensitive workflows.

See `docs/supabase-setup.md`, `docs/auth-and-roles-plan.md`, `docs/database-schema-draft.md`, and `docs/supabase-schema-apply.md` for the current planning and apply documents.

## Migration steps

1. Open the Supabase dashboard.
2. Open **SQL Editor**.
3. Create a new query for each migration and run them manually in this exact order:
   1. `supabase/migrations/20260529120000_initial_schema.sql`
   2. `supabase/migrations/20260530120000_admin_helper_review_rpc.sql`
   3. `supabase/migrations/20260530130000_helper_profile_management.sql`
   4. `supabase/migrations/20260530140000_tighten_booking_helper_rls.sql`
4. Verify tables, RLS policies, `public.review_helper_application`, `public.update_own_helper_profile`, and `public.set_helper_profile_visibility` in Supabase.
5. Verify the `bookings_client_insert` and `bookings_client_update` policies require non-null `helper_profile_id` values to reference visible `verified_basic` or `trusted` helper profiles.

Do not paste service role keys, `.env.local` values, provider secrets, or database passwords into the SQL Editor.

## Vercel deployment steps

1. Create or connect a Vercel project to this repository.
2. Use npm as the package manager.
3. Use `npm run build` as the build command.
4. Use Vercel's default Next.js output handling.
5. Configure these Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
6. In Supabase Authentication settings, enable the Email provider.
7. In Supabase Authentication URL settings, set the Site URL to the deployed Vercel URL and add any preview URLs as allowed redirect URLs.
8. Redeploy after adding environment variables in Vercel.
9. Deploy a preview and review all required public and auth routes.

## Verification checklist

- Production build succeeds with `npm run build`.
- Lint succeeds with `npm run lint`.
- Homepage loads at `/`.
- Static public pages load: `/services`, `/safety`, `/allowed-services`, `/prohibited-services`, `/terms`, and `/privacy`.
- Auth pages load: `/login` and `/signup`.
- Signup requires Terms and Privacy acceptance before submission.
- Signup stores selected `account_type` in auth metadata when Supabase accepts the signup.
- Signup creates a `profiles` row and a `terms_acceptances` row after auth signup when the schema and RLS policies allow it.
- Signed-out users see Login and Sign up in the header.
- Signed-in users see Dashboard and Sign out in the header.
- Sign out works.
- `/dashboard` asks signed-out users to log in and shows signed-in users profile email, role, display name, and created date from the `profiles` table.
- `/dashboard` shows a clear incomplete-profile message and retry action if the profile row is missing.
- `/dashboard` shows different placeholders for `client`, `helper_applicant`, `verified_helper`, and `admin` profile roles.
- `/dashboard` shows helper application status for helper applicants when available and links to `/helper/apply`.
- `/helper/apply` lets signed-in users save a helper application draft or submit it using `helper_applications`.
- `/dashboard` shows client/caregiver booking request count when RLS allows it and links to `/dashboard/bookings`.
- `/dashboard/bookings` lets client/caregiver users create requested booking rows, list their own booking rows, and cancel requested rows by setting `status = cancelled`.
- `/helper/apply` shows `under_review`, `approved`, and `rejected` applications as read-only for applicants.
- `/helpers` does not show unverified applicants or submitted helper applications publicly.
- Terms and Privacy pages clearly state they are draft placeholders requiring legal review before launch.
- No secrets are committed or documented.
- No `.env.local` file is committed.
- No service role key is used in the browser.
- All required database migrations exist and have been manually applied in Supabase before database-backed features are used.
- RLS is enabled and reviewed on every app table.
- No Stripe, live payment, booking payment, helper assignment, helper acceptance, disputes, chat, notifications, ratings/reviews, subscriptions, native mobile, Bulgarian localization, advanced admin workflows, or medical-service functionality is active.

## Deployment issues

None known for the current auth UI phase.

## Client/caregiver elderly profiles deployment note

`/dashboard/elderly-profiles` is now a database-backed client/caregiver flow for managing non-medical elderly profiles. It requires Supabase Auth, the `profiles` table, the `elderly_profiles` table, and the owner-scoped RLS policies from `supabase/migrations/20260529120000_initial_schema.sql`.

Required environment variables remain name-only and public-client safe:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No service role key is used by the browser app, and no `.env.local` file should be committed. The flow stores only `full_name`, `city`, and non-medical `notes` in `elderly_profiles`. Do not collect medical details, diagnoses, medication instructions, card PINs, passwords, cash-handling requests, access-to-valuables requests, or other unnecessary sensitive data in this flow.

Client/caregiver users can create, view, update, and delete their own elderly profiles when RLS and foreign-key rules permit it. If future bookings reference an elderly profile, deletion may be blocked by the database because the current schema does not include an archive flag.

Booking requests are implemented separately at `/dashboard/bookings`; booking payments, Stripe/payment processing, helper acceptance, disputes, chat, notifications, ratings/reviews, subscriptions, native mobile apps, Bulgarian localization, advanced admin workflows, and medical-service functionality are still not implemented. To verify deployment, sign in as a client/caregiver profile, open `/dashboard`, confirm the elderly profile count/link appears, then open `/dashboard/elderly-profiles` and create, edit, view, and delete a test non-medical elderly profile. Also verify helper applicant, verified helper, and admin profiles cannot use the management form.


## Client/caregiver booking requests deployment note

`/dashboard/bookings` is now a database-backed client/caregiver flow for creating and managing basic non-medical booking/service requests. It requires Supabase Auth, the `profiles` table, the `bookings` table, the `elderly_profiles` table, the `service_categories` table, and the owner-scoped RLS policies from `supabase/migrations/20260529120000_initial_schema.sql`.

Required environment variables remain name-only and public-client safe:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No service role key is used by the browser app, and no `.env.local` file should be committed. New booking requests insert `bookings.status = requested` and use the selected client-owned `elderly_profiles.id`, an allowed `service_categories.id`, `city`, `requested_start_at`, `requested_duration_minutes`, and non-medical `notes`.

Client/caregiver users can view their own booking requests and cancel a request only while it is still `requested`. Cancellation updates the row to `status = cancelled`; booking rows are not hard-deleted. Payment processing, Stripe, live booking payments, helper assignment, helper acceptance, matching, helper notifications, disputes, chat, ratings/reviews, subscriptions, Bulgarian localization, and advanced admin workflows are not implemented. Helpers should not see or accept booking requests yet. Admin booking management is not implemented in the app; admin users see a placeholder on `/dashboard/bookings`.

The booking notes UI warns users not to enter medical details, diagnoses, medication instructions, card PINs, passwords, cash-handling requests, or access-to-valuables requests. The flow does not add medical-service fields or collect unnecessary medical or health data.

To verify deployment, sign in as a client/caregiver profile, ensure at least one elderly profile exists at `/dashboard/elderly-profiles`, open `/dashboard/bookings`, create a requested booking with an allowed service category, confirm it appears in the list with elderly profile, service category, city, date/time, duration, status, and notes, then cancel it and confirm the status changes to Cancelled. Also verify signed-out users are asked to log in and helper applicant, verified helper, and admin profiles cannot use the client booking form.

## Admin helper application review deployment note

`/admin` is now a database-backed admin dashboard foundation for helper application review. It requires Supabase Auth, the `profiles` table, `helper_applications`, `helper_profiles`, and the admin RLS policies from `supabase/migrations/20260529120000_initial_schema.sql`.

Required environment variables remain name-only and public-client safe:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No service role key is used by the browser app, and no `.env.local` file should be committed. Admin review uses the signed-in admin user's normal Supabase session and the admin-only database RPC `public.review_helper_application(p_application_id uuid, p_action text)`. The browser app calls this RPC with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; role changes are intentionally not done directly from browser table updates and no service role key is used in the browser.

Approval behavior inside the RPC:

1. Verifies the current authenticated user has `profiles.role = admin`.
2. Sets `helper_applications.status = approved`.
3. Updates the applicant's `profiles.role` to `verified_helper`.
4. Creates or updates the applicant's `helper_profiles` row with `verification_status = verified_basic`.
5. Keeps `helper_profiles.is_visible = false` by default, so approved helpers are not automatically public.
6. Attempts to insert an `audit_logs` row for the status change.

Full booking management, helper assignment, helper acceptance, booking payments, Stripe/payment processing, disputes, chat, notifications, ratings/reviews, subscriptions, native mobile apps, Bulgarian localization, advanced admin workflows, and medical-service functionality are still not implemented. To verify deployment, sign in as an admin profile, open `/admin`, confirm non-admin accounts are denied, review a test helper application, and confirm `/helpers` only shows verified helper profiles that are explicitly visible.

## Verified helper profile management and admin helper visibility deployment note

`/dashboard/helper-profile` is now a database-backed route for approved helpers to manage safe public helper profile fields. It requires Supabase Auth, the `profiles` table, the `helper_profiles` table, and the RPC migration in `supabase/migrations/20260530130000_helper_profile_management.sql`.

Required environment variables remain name-only and public-client safe:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No service role key is used by the browser app, and no `.env.local` file should be committed. Verified helpers can edit only `helper_profiles.bio`, `helper_profiles.city`, and `helper_profiles.service_radius_km`. Helpers cannot edit `verification_status`, `is_visible`, `profile_id`, role values, or admin-only fields, and they cannot make themselves public.

`/admin` now includes approved helper profile visibility controls. Admins can see approved helper profiles and toggle `helper_profiles.is_visible` through the admin-only `public.set_helper_profile_visibility(p_helper_profile_id uuid, p_is_visible boolean)` RPC. The RPC attempts to insert an `audit_logs` row with the actor, action, `target_table = helper_profiles`, target id, and metadata containing old and new visibility values. If audit insertion fails, the UI reports a warning without weakening RLS.

`/helpers` shows only safe fields from visible verified helper profiles: `bio`, `city`, `service_radius_km`, and verification label. Hidden helpers, unverified helpers, helper applications, and email addresses are not public. The empty state explains that verified helper listings are not public yet when no visible rows exist.

Manual deployment steps:

1. Apply `supabase/migrations/20260529120000_initial_schema.sql` if it has not already been applied.
2. Apply `supabase/migrations/20260530120000_admin_helper_review_rpc.sql` if it has not already been applied.
3. Apply `supabase/migrations/20260530130000_helper_profile_management.sql`.
4. Apply `supabase/migrations/20260530140000_tighten_booking_helper_rls.sql`.
5. Redeploy the Next.js app with `npm run build` as the build command and `npm run start` as the start command.
6. Verify with a client, helper applicant, verified helper, and admin account.

Manual verification:

- As a verified helper, open `/dashboard/helper-profile`, edit `bio`, `city`, and `service_radius_km`, and confirm visibility cannot be changed there.
- As a helper applicant, open `/dashboard/helper-profile` and confirm the page links to `/helper/apply`.
- As a client, open `/dashboard/helper-profile` and confirm the page says helper profile management is only for approved helpers.
- As an admin, open `/admin`, toggle an approved helper visible, then confirm that helper appears on `/helpers` without an email address.
- Toggle the helper hidden again and confirm the helper no longer appears on `/helpers`.

No booking assignment/helper acceptance exists yet. Payment logic, Stripe/payment processing, live booking payments, card collection, disputes, chat, notifications, ratings/reviews, subscriptions, native mobile apps, Bulgarian localization, advanced admin workflows, and medical-service functionality are still not implemented.

## Visible helper detail pages and specific-helper booking requests deployment note

`/helpers` now links visible verified helper cards to `/helpers/[id]`. The detail page reads only public-safe `helper_profiles` fields for helpers where `is_visible = true` and `verification_status` is `verified_basic` or `trusted`. It does not show helper email addresses, private profile ownership IDs, helper applications, hidden helpers, unverified helpers, or admin-only fields.

Signed-in client/caregiver users can request a specific visible helper from the helper detail page. The request inserts a `bookings` row with `status = requested` and stores the selected helper in `bookings.helper_profile_id`. Signed-out users are prompted to log in or sign up, and helper applicant, verified helper, and admin roles are told that booking requests are for client/caregiver accounts.

The `supabase/migrations/20260530140000_tighten_booking_helper_rls.sql` migration is now required after the initial/helper RPC migrations. It keeps existing client ownership, elderly-profile ownership, and allowed service-category checks while requiring non-null `bookings.helper_profile_id` values to reference visible helpers with `verification_status` of `verified_basic` or `trusted`. Deployment still requires the same public browser environment variables by name only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No service role key is used by the browser app, and no `.env.local` file should be committed. No Stripe integration, payment processing, card collection, cash payment language, off-platform payment language, helper acceptance, disputes, chat, notifications, ratings/reviews, subscriptions, native mobile app, Bulgarian localization, advanced admin workflows, or medical-service functionality is included in this phase.

Manual verification after deployment:

1. Confirm at least one verified helper profile is set to `is_visible = true` from the admin helper visibility controls.
2. Open `/helpers` and confirm each visible helper card links to `/helpers/[id]` and does not show email addresses.
3. Open a helper detail page while signed out and confirm it prompts for login/signup.
4. Sign in as a client/caregiver with at least one elderly profile and create a request from `/helpers/[id]`.
5. Open `/dashboard/bookings` and confirm the booking appears as a request for a specific helper with safe public helper information.
6. Create a general request from `/dashboard/bookings` and confirm it appears as general/unassigned.
7. Sign in as `helper_applicant`, `verified_helper`, and `admin` accounts and confirm they cannot create client booking requests.
8. Hide the helper profile and confirm `/helpers/[id]` becomes unavailable publicly and dashboard booking history does not expose private helper data.
9. After applying `20260530140000_tighten_booking_helper_rls.sql`, confirm a client cannot create or update a booking with `helper_profile_id` pointing to a hidden or unverified helper profile, while general requests with `helper_profile_id = null` still work.

## V2 first UI/product refactor deployment note (2026-05-31)

The first visible V2 UI/product refactor is implemented without database schema changes.

Required services remain:

- Vercel or another Next.js-compatible hosting provider.
- Supabase project with the existing migrations already applied.

Required environment variables by name only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Build command:

- `npm run build`

Start command:

- `npm run start`

Database setup and migrations:

- No new SQL migration is required for this refactor.
- Continue using the existing Supabase migrations in `supabase/migrations`.
- Universal signup now creates profiles with the existing internal `client` role.
- First/last name are saved to `profiles.display_name` and phone is saved to `profiles.phone`.
- Gender is saved in Supabase auth metadata only because the existing `profiles` table has no gender column.

Current V2 behavior to verify after deployment:

1. Open `/` and confirm the homepage is service-first with a city/location, date/date range, and service type search box.
2. Submit the homepage search and confirm it navigates to `/helpers` with simple query parameters; no booking should be created.
3. Open `/signup` and confirm there is no account type selection.
4. Create a test account and confirm the profile is created with the internal `client` role.
5. Sign in from `/login` and confirm the app redirects to `/`.
6. Confirm the header shows an avatar/initials menu while signed in.
7. Confirm normal users do not see an Admin menu item.
8. Confirm admin users do see the Admin menu item and can still open `/admin`.
9. Open `/dashboard` and confirm it reads as My profile and includes Browse caregivers and Become a caregiver actions.
10. Open `/helper/apply` from the avatar menu or dashboard and confirm the existing caregiver application flow still loads.

Not implemented in this refactor:

- Real homepage search filtering.
- Scheduling logic.
- Final reservation flow.
- Payment processing or Stripe.
- Helper acceptance workflow.
- Ratings/reviews.
- File upload.
- Bulgarian localization.
- Native mobile app work.
- Real password reset emails. The forgot-password UI is placeholder only.

## 2026-06-01 certified caregivers UI and approval visibility

Required migration update:

- Apply `supabase/migrations/20260601100000_helper_approval_visible_default.sql` after existing helper review/profile migrations.

Verification steps:

1. Build command: `npm run build`.
2. Start command: `npm start` after building, or the configured host start command.
3. Approve a submitted caregiver application as an admin.
4. Confirm the resulting helper profile is `verified_basic` and `is_visible = true`.
5. Open `/helpers` and confirm the approved caregiver appears in the Certified caregivers card grid.
6. Use the admin visibility control to hide/unpublish the caregiver if the profile should be removed from public listing.

Environment variables remain documented by name only in the existing deployment notes; no new secrets are required for this UI pass.

## 2026-06-06 Role system + elder signup/login/account

Scope: identity/auth layer built on the already-applied target schema
(`profiles.role = elder|admin`; caregiver capability = an approved
`caregiver_profiles` row). No existing table RLS was changed.

Required migration:

- Apply `supabase/migrations/20260606120000_avatars_storage.sql` (creates a
  public `avatars` Storage bucket for OPTIONAL profile photos).
  - Public READ is limited to the `avatars` bucket only (avatar URLs are
    public-safe; phone/email are never stored here).
  - WRITE/UPDATE/DELETE are restricted to a user's own `{auth.uid}/...` folder.
  - This is additive and does NOT weaken the one-way rule or phone privacy.

Required services / env vars: unchanged
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

Build command: `npm run build`. Start command: `npm run start`.

Auth method: email + password (existing pattern kept). Magic-link/OTP is a
recommended future upgrade once a transactional email provider is chosen.

Profile creation: on signup the elder profile row is written to `public.profiles`
with `role = 'elder'` and the private `phone` (RLS already restricts phone to
owner/admin). When email confirmation defers the first session, the row is
created on first authenticated load by the single source of truth
(`lib/auth/useCurrentUser.ts` -> `ensureElderProfile`) from auth user_metadata.

Verification steps:

1. `/signup`: create an elder (first/last name, email, phone, age, optional
   photo, password). Confirm a `profiles` row is created with `role = 'elder'`.
2. Confirm the phone reassurance note is shown under the phone field (EN + BG).
3. `/login`: sign in; confirm redirect to `/account` (or to `returnTo`).
4. Filter preservation: open `/helpers?city=...&services=...`, open a caregiver,
   while signed out click Login/Create account, finish auth, and confirm you are
   returned to the same caregiver page with the filter query intact.
5. `/account`: confirm the phone is visible ONLY to the signed-in owner, and that
   name/phone/age/photo can be edited and saved.
6. Header avatar menu: confirm "My profile" -> `/account`, caregivers see
   "Caregiver dashboard", admins see "Admin", others see "Become a caregiver".

Known follow-ups (out of scope here):

- The legacy `/dashboard`, marketplace and booking pages still reference the
  pre-rename table/column names and remain part of the separate app-code
  migration follow-up noted in `VERIFICATION.md`.
- Editing the sign-in email from `/account` is intentionally deferred (shown
  read-only with a note) because changing the Supabase Auth email requires a
  re-confirmation flow; revisit as a dedicated task.

## Phase 8 — notification center + caregiver approval flow

Database setup step (run once, idempotent):

- In the Supabase SQL Editor, run `SUPABASE_FIX_NOTIFICATIONS.sql` (identical to
  the migration `supabase/migrations/20260610120000_notification_center_rpcs.sql`).
  It adds four SECURITY DEFINER read RPCs — `get_my_notifications`,
  `mark_notifications_read`, `get_caregiver_requests`, `get_elder_reservations` —
  and adds `public.notifications` to the `supabase_realtime` publication. It
  creates no tables and drops nothing; safe to re-run.
- The `notifications` / `chat_threads` / `reservations` tables, their RLS, and
  the `create_reservation` / `transition_reservation` state-machine RPCs already
  ship in earlier migrations — no change needed there.

Required services / env vars: unchanged
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Supabase
Realtime must be enabled for the project (default on); the notifications bell
falls back to a refresh-on-open if the realtime channel can't connect.

Verification steps:

1. As an elder, book a visible+verified caregiver (`/helpers/[id]/book`) and send
   the request. Confirm the booking shows under `/dashboard/reservations` with
   status **Pending** and the copy "Waiting for the caregiver to approve".
2. As that caregiver, confirm the nav bell shows an unread badge in real time
   (no refresh) and the panel reads "New booking request from <elder first name>"
   — never a phone number. Open `/dashboard/requests` and confirm the request
   shows services, dates/time slots, total duration, district, and total price,
   but NOT the elder's phone or exact address (address appears only after
   approval).
3. Click **Approve**. Confirm: the reservation moves to **Approved**, the elder
   gets a "Your booking with <caregiver> was approved" notification, the booked
   slots disappear from that caregiver's public availability, and a `chat_threads`
   row now exists for the reservation (Phase 9 builds the chat UI on it).
4. On a second request click **Decline**. Confirm the elder is notified
   "Your booking request was declined", the reservation is **Declined**, and the
   slots return to open/available.
5. Confirm the elder is only ever confirmed on approval (a pending request is
   never an auto-confirmation), and that each side sees only their own
   reservations.

### Troubleshooting — "We couldn't load your notifications / requests / bookings"

If, after the app loads, all three of these signed-in data loads fail at once:

- the notification bell shows "We couldn't load your notifications right now",
- `/dashboard/requests` shows "We couldn't load your requests right now",
- `/dashboard/reservations` shows "We couldn't load your bookings right now",

the cause is that the **Phase 8 read RPCs were never applied to the live
database**. Each page calls one SECURITY DEFINER RPC
(`get_my_notifications` / `get_caregiver_requests` / `get_elder_reservations`);
when the function is absent, `supabase.rpc()` returns PostgREST **PGRST202**
(HTTP 404, "Could not find the function … in the schema cache"), which the pages
render as the banner above. The underlying reservation/notification **rows are
not lost** — `create_reservation()` already wrote them; they are just unreadable
until the read paths exist.

Fix: run `SUPABASE_FIX_NOTIFICATIONS.sql` in the Supabase SQL Editor. It now
begins with a **preflight** that stops with an actionable message if the
prerequisite tables (or the `create_reservation` RPC) are also missing — in that
case apply migrations `20260605122000`..`20260605125000` (or `SUPABASE_SETUP.sql`)
first, then re-run it. The file ends with VERIFY queries that confirm the four
RPCs exist and that a specific reservation + its caregiver notification are
present and readable.

Note: a caregiver account may itself book another caregiver as a client
(PRODUCT_SPEC §1.2) — `get_elder_reservations` is scoped to `elder_id =
auth.uid()` (the booker), so the booker sees it in My bookings and the target
caregiver sees it in Requests, with the one-way rule intact (no policy lets a
caregiver browse the elder population).

## Phase 9 — internal elder <-> caregiver chat

Database + storage setup step (run once, idempotent):

- In the Supabase SQL Editor, run `SUPABASE_FIX_CHAT.sql` (identical RPC bodies to
  the migration `supabase/migrations/20260611120000_chat_messaging.sql`). It:
  1. adds four SECURITY DEFINER RPCs — `get_my_chat_threads`, `get_chat_thread`,
     `mark_thread_read`, `send_chat_message`;
  2. **creates the PRIVATE `chat-media` Storage bucket** (`public = false`) and
     its two participant-only `storage.objects` policies
     (`chat_media_participant_read`, `chat_media_participant_insert`);
  3. adds `public.chat_messages` to the `supabase_realtime` publication.
  It creates no tables and drops nothing; safe to re-run. A preflight stops with
  an actionable message if the chat tables / `is_chat_participant()` are missing
  (apply `20260605124000_notifications_chat_reviews_disputes.sql` or
  `SUPABASE_SETUP.sql` first).
- The `chat_threads` / `chat_messages` tables, their RLS, `is_chat_participant()`,
  and the approval trigger that opens a thread already ship in earlier migrations —
  no change needed there.

Storage bucket (if you prefer the dashboard over SQL): Storage -> New bucket ->
name **`chat-media`**, **Public = OFF**. The policies above are still installed by
the SQL file. Files are stored at `{thread_id}/{sender_uid}/{file}` and are served
only through short-lived **signed URLs** whose access is re-checked against the
participant SELECT policy — they are never publicly readable.

Required services / env vars: unchanged
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Supabase
Realtime must be enabled (default on); the chat window degrades gracefully to a
load-on-open if the realtime channel can't connect, and is wrapped in an
ErrorBoundary so a failure can never blank the app.

Verification steps:

1. As an elder, book a caregiver and have the caregiver **Approve** it. Confirm a
   "Open chat" button now appears on both `/dashboard/reservations` (elder) and
   `/dashboard/requests` (caregiver), and a "Messages" item shows in the account
   menu and at `/messages`.
2. Open the thread from each side. Send a **text** message and confirm it appears
   on the other side in real time (no refresh), right-aligned for the sender.
3. Tap the microphone, record a **voice** note, send it, and confirm it plays back
   inline on both sides. Tap the paperclip, attach a **JPG/PNG/WebP image**, and
   confirm it shows as a thumbnail that opens full-size.
4. Confirm the bell shows a "New message" notification that links to the thread,
   and that opening the thread clears it.
5. Negative checks: a third signed-in user opening `/messages/<thread_id>` directly
   sees "Conversation not available"; copying an attachment's signed URL and opening
   it while signed out (or as a non-participant) fails. No phone number appears
   anywhere in the chat.
