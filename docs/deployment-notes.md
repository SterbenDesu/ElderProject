# Deployment Notes

Use this file as the source of truth for deployment setup and deployment status.

## Deployment provider

Recommended provider: **Vercel** for the Next.js web app.

## Current deployment status

Not deployed yet. The repository now contains a Next.js app shell with Supabase email/password authentication UI and first database-backed profile writes/reads when Supabase public environment variables are configured. The initial Supabase SQL schema must be applied manually in the Supabase dashboard before signup database writes and dashboard profile reads work.

## Current stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- npm
- Supabase Auth through `@supabase/supabase-js`

## Required services

- Vercel for hosting the web app.
- Supabase for email/password authentication and the PostgreSQL database schema.
- Stripe or another marketplace payment provider is not required for this phase and must not be added until a later payment-specific task. No payment logic or live booking payments exist yet.

## Required environment variables

No real Supabase credentials are committed. Configure these names locally and in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

These are public browser variables. Do not commit `.env.local`, service role keys, or secret values. Do not use service role keys in browser code.

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

## Database setup

The initial database schema is now represented in:

```bash
supabase/migrations/20260529120000_initial_schema.sql
```

This migration creates the starter `profiles`, elderly profile, helper application/profile, service category, booking, complaint, payment-status, audit log, and terms acceptance tables. It also enables row-level security on all app tables and adds conservative starter policies.

The schema must be applied manually before signup database writes and dashboard profile reads work. Codex does not need direct Supabase access for this step. Follow `docs/supabase-schema-apply.md`.

Current auth metadata saved during signup when Supabase accepts it:

- `account_type`
- `terms_accepted`
- `terms_version`
- `privacy_version`

Current database rows created during signup when the schema and RLS policies allow it:

- `profiles` with the auth user id, email, safe role mapping, and simple display-name fallback.
- `terms_acceptances` with the auth user id and placeholder Terms/Privacy versions.

`/dashboard` now reads the signed-in user's `profiles` row and shows role-aware placeholders. For `helper_applicant` users, it also shows the current helper application status when a `helper_applications` row exists and links to `/helper/apply`. Admin users see a link to `/admin`. It does not include broad admin database management, elderly profile CRUD, bookings, Stripe, payment processing, or live booking payments.

Current helper application behavior:

- `/helper/apply` uses `helper_applications` for signed-in applicants.
- Applicants can save a draft (`status = draft`) or submit (`status = submitted`).
- `under_review`, `approved`, and `rejected` applications are read-only in the applicant UI.
- Basic admin review and approval tooling is implemented at `/admin`.
- Public helper marketplace visibility is not implemented from the application page.
- Unverified helpers and submitted applications are not shown publicly; `/helpers` only reads visible verified `helper_profiles` rows.

Before real user data is used in production:

1. Apply the SQL migration in a development Supabase project first.
2. Confirm all app tables exist.
3. Confirm row-level security is enabled on every app table.
4. Test role-based access for visitors, clients/caregivers, helper applicants, verified helpers, and admins.
5. Confirm signup creates `profiles` and `terms_acceptances` rows with only the publishable key and authenticated user session.
6. Review any policy TODO comments before allowing browser writes for sensitive workflows.

See `docs/supabase-setup.md`, `docs/auth-and-roles-plan.md`, `docs/database-schema-draft.md`, and `docs/supabase-schema-apply.md` for the current planning and apply documents.

## Migration steps

1. Open the Supabase dashboard.
2. Open **SQL Editor**.
3. Create a new query.
4. Paste the contents of `supabase/migrations/20260529120000_initial_schema.sql`.
5. Run the query.
6. Verify tables and RLS policies in Supabase.

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
- `/helper/apply` shows `under_review`, `approved`, and `rejected` applications as read-only for applicants.
- `/helpers` does not show unverified applicants or submitted helper applications publicly.
- Terms and Privacy pages clearly state they are draft placeholders requiring legal review before launch.
- No secrets are committed or documented.
- No `.env.local` file is committed.
- No service role key is used in the browser.
- Initial database schema migration exists and has been manually applied in Supabase before database-backed features are used.
- RLS is enabled and reviewed on every app table.
- No Stripe, live payment, booking payment, native mobile, Bulgarian localization, or medical-service functionality is active.

## Deployment issues

None known for the current auth UI phase.

## Admin helper application review deployment note

`/admin` is now a database-backed admin dashboard foundation for helper application review. It requires Supabase Auth, the `profiles` table, `helper_applications`, `helper_profiles`, and the admin RLS policies from `supabase/migrations/20260529120000_initial_schema.sql`.

Required environment variables remain name-only and public-client safe:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No service role key is used by the browser app, and no `.env.local` file should be committed. Admin review uses the signed-in admin user's normal Supabase session and RLS policies.

Approval behavior:

1. Sets `helper_applications.status = approved`.
2. Updates the applicant's `profiles.role` to `verified_helper`.
3. Creates or updates the applicant's `helper_profiles` row with `verification_status = verified_basic`.
4. Keeps `helper_profiles.is_visible = false` by default, so approved helpers are not automatically public.
5. Attempts to insert an `audit_logs` row for the status change.

Booking logic, booking payments, Stripe/payment processing, native mobile apps, Bulgarian localization, and medical-service functionality are still not implemented. To verify deployment, sign in as an admin profile, open `/admin`, confirm non-admin accounts are denied, review a test helper application, and confirm `/helpers` only shows verified helper profiles that are explicitly visible.
