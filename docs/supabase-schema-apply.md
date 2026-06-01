# Apply the Supabase database schema manually

Use this guide to apply the VnukPodNaem database schema migrations in a Supabase project. Codex does **not** need direct access to Supabase for this step. The current shell is database-backed when Supabase is configured, but it is still not launched or a full MVP.

## Before you start

Make sure you have:

1. A Supabase project for development or testing.
2. Access to the Supabase dashboard in your browser.
3. The migration files from this repository, applied manually in this order:
   1. `supabase/migrations/20260529120000_initial_schema.sql`
   2. `supabase/migrations/20260530120000_admin_helper_review_rpc.sql`
   3. `supabase/migrations/20260530130000_helper_profile_management.sql`
   4. `supabase/migrations/20260530140000_tighten_booking_helper_rls.sql`

Do **not** paste service role keys, database passwords, `.env.local` values, or any other secrets into the SQL Editor.

## What this migration does

The migration creates the first database foundation for the non-medical marketplace MVP:

- user-linked app profiles;
- elderly profiles managed by caregivers;
- helper applications and approved helper profiles;
- allowed non-medical service categories;
- booking, complaint, payment-status, audit, and terms-acceptance tables;
- `updated_at` triggers;
- row-level security on every app table;
- conservative starter RLS policies;
- helper profile management/admin visibility RPCs;
- tightened booking RLS requiring non-null `helper_profile_id` values to reference visible helpers with `verification_status` of `verified_basic` or `trusted`.

It does **not** add Stripe, process payments, store card data, collect medical data, add helper acceptance, add disputes, add Bulgarian localization, or make helpers employees.

## Step-by-step instructions

1. Open the Supabase website and sign in.
2. Open the correct Supabase project. Use a development project first.
3. In the left sidebar, open **SQL Editor**.
4. Click **New query**.
5. Open `supabase/migrations/20260529120000_initial_schema.sql` from this repository.
6. Copy the full SQL file contents.
7. Paste the SQL into the Supabase SQL Editor.
8. Read the first comments in the SQL and confirm you are in the correct project.
9. Click **Run**.
10. Wait for Supabase to finish running the query.
11. Click **New query** again.
12. Open `supabase/migrations/20260530120000_admin_helper_review_rpc.sql` from this repository.
13. Copy the full SQL file contents.
14. Paste the SQL into the Supabase SQL Editor.
15. Click **Run** to install or replace the admin helper review RPC.
16. Click **New query** again.
17. Open `supabase/migrations/20260530130000_helper_profile_management.sql`, paste the full contents, and click **Run** to install or replace the helper profile management/admin visibility RPCs.
18. Click **New query** again.
19. Open `supabase/migrations/20260530140000_tighten_booking_helper_rls.sql`, paste the full contents, and click **Run** to tighten booking insert/update RLS for specific-helper requests.

## How to verify it worked

After the query succeeds:

1. Open **Table Editor** in Supabase.
2. Confirm these tables exist:
   - `profiles`
   - `elderly_profiles`
   - `helper_applications`
   - `helper_profiles`
   - `service_categories`
   - `bookings`
   - `complaints`
   - `payment_records`
   - `audit_logs`
   - `terms_acceptances`
3. Open `service_categories` and confirm these allowed categories were inserted:
   - Companionship
   - Light errands
   - Shopping
   - Walks
   - Check-ins
   - Technology help
   - Accompaniment
4. Open **Authentication** and confirm your users are still managed by Supabase Auth.
5. Open each table's policy/RLS view and confirm RLS is enabled.
6. In the SQL Editor or Database function list, confirm `public.review_helper_application(p_application_id uuid, p_action text)`, `public.update_own_helper_profile(p_bio text, p_city text, p_service_radius_km integer)`, and `public.set_helper_profile_visibility(p_helper_profile_id uuid, p_is_visible boolean)` exist.
7. In the `bookings` policy view, confirm `bookings_client_insert` and `bookings_client_update` require a non-null `helper_profile_id` to reference a visible helper profile with `verification_status` of `verified_basic` or `trusted`.

## If SQL errors occur

If the SQL Editor shows an error:

1. Copy the exact error text into an issue or development note. Do not include secrets.
2. Check whether the migration was already partially applied. For example, some tables may already exist.
3. If this is a fresh development project and a partial migration is acceptable to reset, use Supabase project reset tools or create a new development project.
4. If this is not a fresh project, stop and ask for a review before dropping or changing tables.
5. Do not try random fixes in production.

Common beginner causes:

- Running the same migration twice in the same project.
- Running in the wrong Supabase project.
- Copying only part of the SQL file.
- Editing table or policy names by hand before running.

## Security reminders

- Never paste a service role key into SQL Editor for this migration.
- Never commit `.env.local`.
- Never store full card data, card PINs, passwords, or medical instructions in these tables.
- Review and test RLS policies before adding database-backed app features.
- Helper application owner policies allow applicants to create or update only their own `draft` or `submitted` applications. Applicants must not be able to set `under_review`, `approved`, or `rejected`; those statuses are reserved for a future admin review workflow.


## Admin helper review RPC migration

Apply `supabase/migrations/20260530120000_admin_helper_review_rpc.sql` manually after the initial schema migration. The migration creates `public.review_helper_application(p_application_id uuid, p_action text)`, an authenticated admin-only RPC used by `/admin` for `under_review`, `approved`, and `rejected` helper application actions.

The RPC intentionally performs helper approval role changes inside the database instead of directly from browser table updates. It verifies the current `auth.uid()` has `profiles.role = 'admin'`, updates `helper_applications.status`, updates the applicant `profiles.role` to `verified_helper` on approval, creates or updates the related `helper_profiles` row with `verification_status = verified_basic`, and keeps `helper_profiles.is_visible = false`. Approved helpers therefore remain hidden from `/helpers` until a separate admin visibility process explicitly sets `is_visible = true`.

Do not use service role keys in the browser, do not disable RLS, and do not add broad public update policies to support helper approval.

## Apply verified helper profile management RPC migration

After applying the initial schema and the admin helper review RPC migration, also apply:

```text
supabase/migrations/20260530130000_helper_profile_management.sql
```

This migration creates two authenticated RPC functions:

1. `public.update_own_helper_profile(p_bio text, p_city text, p_service_radius_km integer)` lets a signed-in `verified_helper` update only safe public helper profile fields: `bio`, `city`, and `service_radius_km`.
2. `public.set_helper_profile_visibility(p_helper_profile_id uuid, p_is_visible boolean)` lets a signed-in `admin` toggle `helper_profiles.is_visible` for approved helper profiles and attempts to insert an `audit_logs` row containing the old and new visibility values.

The migration does not disable RLS, does not weaken public helper policies, and does not require service role keys in the browser. Public `/helpers` listings still show only `helper_profiles` rows where `is_visible = true` and `verification_status` is `verified_basic` or `trusted`. Unverified helpers remain hidden. Booking assignment and payment logic are still not implemented.

## Tighten booking helper RLS migration

Apply `supabase/migrations/20260530140000_tighten_booking_helper_rls.sql` manually after the helper profile management migration. This migration drops and recreates only the client booking insert/update policies so existing ownership checks remain in place while non-null `bookings.helper_profile_id` values must reference a `helper_profiles` row where `is_visible = true` and `verification_status` is `verified_basic` or `trusted`.

This is a shell safety cleanup only. It does not add payments, helper acceptance, full booking lifecycle, disputes, Bulgarian localization, chat, notifications, ratings, subscriptions, or advanced admin workflows.

## 2026-06-01 helper approval visibility migration

Apply `supabase/migrations/20260601100000_helper_approval_visible_default.sql` after the previous helper review and helper profile management migrations.

Behavior after applying it:

1. Admin approval through `review_helper_application` sets the applicant profile role to `verified_helper`.
2. The approval creates or updates a `helper_profiles` row with `verification_status = 'verified_basic'`.
3. The approved helper profile is set to `is_visible = true` by default so it can appear on `/helpers`.
4. Admins can still hide or unpublish an approved helper later with `set_helper_profile_visibility` when that RPC is installed.

Manual SQL application steps:

1. Open the Supabase SQL editor for the project.
2. Paste the full contents of `supabase/migrations/20260601100000_helper_approval_visible_default.sql`.
3. Run the SQL once.
4. Verify that approving a submitted helper application returns `helper_profile_is_visible: true` and the helper appears on the certified caregivers page when public RLS policies are applied.
