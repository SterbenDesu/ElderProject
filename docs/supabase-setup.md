# Supabase Setup Guide

Use this guide to configure the real Supabase email/password authentication now used by VnukPodNaem.

This repository does **not** contain real Supabase credentials. Do not commit `.env.local`, service role keys, or any private Supabase secrets.

## Current status

- The app includes `@supabase/supabase-js` for browser-side Supabase Auth.
- `/login` supports Supabase email/password login.
- `/signup` supports Supabase email/password signup with account-type metadata and Terms/Privacy acceptance metadata.
- After auth signup succeeds, `/signup` attempts to create a matching `profiles` row and a `terms_acceptances` row in Supabase.
- The header can show signed-out versus signed-in auth state, and signed-in users can sign out.
- `/dashboard` shows a signed-out prompt or loads the signed-in user's `profiles` row with role-aware placeholder sections.
- An initial SQL migration with profile, helper, booking, complaint, payment-status, audit, terms acceptance, and row-level security tables exists at `supabase/migrations/20260529120000_initial_schema.sql`, and it must be applied manually in Supabase before signup database writes and dashboard profile reads work. Protected middleware, helper approval workflows, bookings UI, admin database management, and payment processing are **not** implemented yet.

## Required package

The app depends on:

```bash
@supabase/supabase-js
```

Run `npm install` after pulling changes so the package is installed locally.

## 1. Create a Supabase project

1. Go to the Supabase website and sign in or create an account.
2. Create a new organization if needed.
3. Click **New project**.
4. Choose a clear project name, such as `vnukpodnaem-dev` for development.
5. Choose the region closest to the first expected users when possible.
6. Save the generated database password in a secure password manager.
7. Wait for Supabase to finish provisioning the project.

Beginner note: create a development project first. Do not start by connecting a production app to untested database rules.

## 2. Find the project URL

1. Open the Supabase project dashboard.
2. Go to **Project Settings**.
3. Open **API**.
4. Find the **Project URL**.
5. Copy only the URL value when creating local or Vercel environment variables.

This value is used as:

```bash
NEXT_PUBLIC_SUPABASE_URL=
```

## 3. Find the publishable key

1. Open the Supabase project dashboard.
2. Go to **Project Settings**.
3. Open **API**.
4. Find the browser-safe **publishable** key for the project.
5. Copy that key for local development and Vercel environment variables.

This value is used as:

```bash
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The publishable key is designed for browser use, but it must still be paired with carefully tested Supabase row-level security policies before real user database tables are used.

## 4. Do not share service role keys

Supabase also provides service role keys. Treat them as server-side admin secrets.

Do not:

- Put a service role key in `.env.example`.
- Put a service role key in browser code.
- Prefix a service role key with `NEXT_PUBLIC_`.
- Share a service role key in chat, screenshots, issue comments, pull requests, or documentation.
- Commit a service role key to Git.

Only add a service role key later if a server-only admin task truly requires it and the security model has been reviewed.

## 5. Enable the Supabase Email provider

1. Open the Supabase project dashboard.
2. Go to **Authentication**.
3. Open **Providers**.
4. Enable the **Email** provider.
5. Decide whether email confirmations are required for the current environment.
6. If confirmations are enabled, test that the confirmation email is delivered and that users can log in afterward.

## 6. Configure the Supabase Site URL

1. Open **Authentication** in the Supabase dashboard.
2. Open **URL Configuration**.
3. Set **Site URL** to the local development URL while testing locally, for example:

```bash
http://localhost:3000
```

4. Add deployed preview/production URLs as allowed redirect URLs when deploying to Vercel.

## 7. Create `.env.local` locally

Create a file named `.env.local` on your own computer only. Do not commit it.

Example local file shape:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
```

Important:

- Replace the placeholder text with values from your own Supabase project.
- Do not use fake production credentials.
- Do not paste real values into documentation.
- Do not commit `.env.local`.
- Do not use service role keys in browser environment variables.

## 8. Add the variables to Vercel

After the Supabase project exists:

1. Open the Vercel project dashboard.
2. Go to **Settings**.
3. Open **Environment Variables**.
4. Add these variables by name:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Paste values from the Supabase project dashboard.
6. Choose the appropriate Vercel environments, usually **Preview** first and **Production** only after testing.
7. Redeploy the Vercel project so the app receives the new environment variables.

## 9. Database schema status

The repository includes an initial SQL schema migration for the database-backed MVP foundation:

```bash
supabase/migrations/20260529120000_initial_schema.sql
```

Apply it manually by following `docs/supabase-schema-apply.md`. Do not paste service role keys or `.env.local` values into the SQL Editor. Signup profile creation and dashboard profile reads depend on this schema being applied first.

The app currently uses these tables directly:

- `profiles`: created after signup and read by `/dashboard`.
- `terms_acceptances`: created after signup with the current placeholder Terms and Privacy versions.

Before storing broader real user profile, booking, helper, complaint, or admin data:

- Apply and review the initial database migration in a development Supabase project.
- Enable and test row-level security for every user-data table.
- Confirm that visitors cannot access private dashboards, profiles, bookings, complaints, or admin records.
- Confirm that helper applicants cannot appear as verified helpers until admin approval exists.
- Confirm that admins have narrowly scoped access and important actions can be audited.
- Confirm that no medical-service functionality, live payment collection, Stripe integration, or payment processing has been added by accident.

## 10. Current app database behavior

- Signup creates a Supabase Auth user, then attempts browser-side inserts into `profiles` and `terms_acceptances` using only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- The client/caregiver signup option maps to `profiles.role = client`; helper applicant maps to `profiles.role = helper_applicant`. Admin and verified helper roles are not self-assignable from signup.
- If auth succeeds but database setup fails, the signup page displays a clear partial-success error and points the user to the dashboard retry path after login.
- `/dashboard` reads `email`, `role`, `display_name`, and `created_at` from `profiles`, handles a missing profile without crashing, and shows role-specific placeholder sections.
- No payment logic, Stripe integration, live booking payments, admin database management, helper application form, elderly profile CRUD, or booking workflow exists yet.
