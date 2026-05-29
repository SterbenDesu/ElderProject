# Supabase database setup

This folder contains SQL files for the VnukPodNaem Supabase database.

## Current contents

- `migrations/20260529120000_initial_schema.sql` — initial schema for the non-medical marketplace MVP.

## Important safety notes

- Do not commit `.env.local` or any real Supabase credentials.
- Do not paste service role keys into SQL files, docs, pull requests, screenshots, or chat.
- The migration does not add Stripe, live payment collection, native mobile apps, Bulgarian localization, or medical-service functionality.
- `payment_records` stores payment-provider status metadata only. It must not store full card data, card PINs, passwords, or cash-handling instructions.
- Helpers are independent marketplace participants, not employees of VnukPodNaem.
- The schema and RLS policies are a safe starter foundation. Test them in a development Supabase project before using them with real users.

## How to apply the schema

Codex does not connect to Supabase directly for this setup. Apply the migration manually in the Supabase dashboard by following:

- `docs/supabase-schema-apply.md`

## What the initial migration creates

The initial migration creates these app tables:

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

It also creates:

- a reusable `set_updated_at()` trigger function;
- starter service-category seed rows for allowed non-medical services;
- row-level security on all app tables;
- conservative starter RLS policies for users, public reads, related records, and admins.

## After applying

After applying the migration, verify the tables in Supabase **Table Editor** and review RLS policies before building database-backed features.
