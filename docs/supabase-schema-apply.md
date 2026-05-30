# Apply the Supabase database schema manually

Use this guide to apply the initial VnukPodNaem database schema in a Supabase project. Codex does **not** need direct access to Supabase for this step.

## Before you start

Make sure you have:

1. A Supabase project for development or testing.
2. Access to the Supabase dashboard in your browser.
3. The migration file from this repository:
   - `supabase/migrations/20260529120000_initial_schema.sql`

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
- conservative starter RLS policies.

It does **not** add Stripe, process payments, store card data, collect medical data, or make helpers employees.

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
