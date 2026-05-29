# Deployment Notes

Use this file as the source of truth for deployment setup and deployment status.

## Deployment provider

Recommended provider: **Vercel** for the Next.js web app.

## Current deployment status

Not deployed yet. The repository now contains a Next.js app shell with Supabase email/password authentication UI when Supabase public environment variables are configured. The initial Supabase SQL schema exists in the repository but must be applied manually in the Supabase dashboard before database-backed features are added.

## Current stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- npm
- Supabase Auth through `@supabase/supabase-js`

## Required services

- Vercel for hosting the web app.
- Supabase for email/password authentication and the PostgreSQL database schema.
- Stripe or another marketplace payment provider is not required for this phase and must not be added until a later payment-specific task.

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
7. Test `/signup`, `/login`, header auth state, sign out, and `/dashboard`.

## Database setup

The initial database schema is now represented in:

```bash
supabase/migrations/20260529120000_initial_schema.sql
```

This migration creates the starter `profiles`, elderly profile, helper application/profile, service category, booking, complaint, payment-status, audit log, and terms acceptance tables. It also enables row-level security on all app tables and adds conservative starter policies.

The schema must be applied manually before database-backed features are added to the app. Codex does not need direct Supabase access for this step. Follow `docs/supabase-schema-apply.md`.

Current auth metadata saved during signup when Supabase accepts it:

- `account_type`
- `terms_accepted`
- `terms_version`
- `privacy_version`

Before real user data is used in production:

1. Apply the SQL migration in a development Supabase project first.
2. Confirm all app tables exist.
3. Confirm row-level security is enabled on every app table.
4. Test role-based access for visitors, clients/caregivers, helper applicants, verified helpers, and admins.
5. Decide how auth metadata will be synchronized with the new `profiles` table.
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
- Signed-out users see Login and Sign up in the header.
- Signed-in users see Dashboard and Sign out in the header.
- Sign out works.
- `/dashboard` asks signed-out users to log in and shows signed-in users their email and account type.
- Terms and Privacy pages clearly state they are draft placeholders requiring legal review before launch.
- No secrets are committed or documented.
- No `.env.local` file is committed.
- No service role key is used in the browser.
- Initial database schema migration exists and has been manually applied in Supabase before database-backed features are used.
- RLS is enabled and reviewed on every app table.
- No Stripe, live payment, booking payment, native mobile, Bulgarian localization, or medical-service functionality is active.

## Deployment issues

None known for the current auth UI phase.
