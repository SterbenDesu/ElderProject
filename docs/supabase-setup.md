# Supabase Setup Guide

Use this guide in the next implementation phase when VnukPodNaem is ready to connect real authentication and database storage.

This repository does **not** contain real Supabase credentials yet. Do not commit `.env.local`, service role keys, or any private Supabase secrets.

## Current status

- Supabase is planned for authentication and the database in the next phase.
- No live Supabase client or active authentication behavior is connected yet.
- `.env.example` lists the variable names that will be needed later.
- No SQL migrations or production database schema have been created yet.

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

This value will be used as:

```bash
NEXT_PUBLIC_SUPABASE_URL=
```

## 3. Find the anon public key

1. Open the Supabase project dashboard.
2. Go to **Project Settings**.
3. Open **API**.
4. Find the **anon** / **public** API key.
5. Copy that key for local development and Vercel environment variables.

This value will be used as:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The anon key is designed for browser use, but it must still be paired with carefully tested Supabase row-level security policies before real user data is stored.

## 4. Do not share service role keys

Supabase also provides a **service_role** key. Treat it as a server-side admin secret.

Do not:

- Put the service role key in `.env.example`.
- Put the service role key in browser code.
- Prefix the service role key with `NEXT_PUBLIC_`.
- Share the service role key in chat, screenshots, issue comments, pull requests, or documentation.
- Commit the service role key to Git.

Only add a service role key later if a server-only admin task truly requires it and the security model has been reviewed.

## 5. Create `.env.local` locally

Create a file named `.env.local` on your own computer only. Do not commit it.

Example local file shape:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

Important:

- Replace the placeholder text with values from your own Supabase project.
- Do not use fake production credentials.
- Do not paste real values into documentation.
- Do not commit `.env.local`.

## 6. Add the variables to Vercel

After the Supabase project exists and the app is ready to connect to it:

1. Open the Vercel project dashboard.
2. Go to **Settings**.
3. Open **Environment Variables**.
4. Add these variables by name:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Paste values from the Supabase project dashboard.
6. Choose the appropriate Vercel environments, usually **Preview** first and **Production** only after testing.
7. Redeploy the Vercel project so the app receives the new environment variables.

## 7. Before enabling real users

Before storing real user data, complete these checks:

- Create and review the final database schema.
- Enable and test row-level security for every user-data table.
- Confirm that visitors cannot access private dashboards, profiles, bookings, complaints, or admin records.
- Confirm that helper applicants cannot appear as verified helpers until admin approval exists.
- Confirm that admins have narrowly scoped access and important actions can be audited.
- Confirm that no medical-service functionality, live payment collection, Stripe integration, or payment processing has been added by accident.
