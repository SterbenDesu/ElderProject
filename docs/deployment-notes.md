# Deployment Notes

Use this file as the source of truth for deployment setup and deployment status.

## Deployment provider

Recommended provider: **Vercel** for the Next.js web app.

## Current deployment status

Not deployed yet. The repository contains the first static, deployable Next.js app shell for review and preview deployment.

## Current stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- npm

## Required services

- Vercel for hosting the web app.
- Supabase is planned for the next authentication and database implementation phase.
- Stripe or another marketplace payment provider is not required for this phase and must not be added until a later payment-specific task.

## Required environment variables

No real Supabase credentials have been added yet.

Future Supabase variable names:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

These names are also listed in `.env.example` with empty values. Do not commit `.env.local`, service role keys, or secret values.

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

## Database setup

Supabase setup is planned for the next implementation phase. No Supabase project credentials, database tables, row-level security policies, or SQL migrations are active in the app yet.

Before real user data is stored:

1. Create a Supabase project.
2. Add local values to `.env.local` using the names from `.env.example`.
3. Add the same variables to Vercel after the Supabase project exists.
4. Create reviewed database migrations.
5. Enable and test row-level security for every user-data table.
6. Verify role-based access for visitors, clients/caregivers, helper applicants, verified helpers, and admins.

See `docs/supabase-setup.md`, `docs/auth-and-roles-plan.md`, and `docs/database-schema-draft.md` for the current planning documents.

## Migration steps

None for this phase. Database schema planning is documented, but no migrations have been created yet.

## Deployment steps

1. Create or connect a Vercel project to this repository.
2. Use npm as the package manager.
3. Use `npm run build` as the build command.
4. Use Vercel's default Next.js output handling.
5. For the current static app shell, Supabase environment variables are not required to run the app.
6. After creating a Supabase project in the next phase, configure these Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Redeploy after adding environment variables in Vercel.
8. Deploy a preview and review all required public and placeholder routes.

## Verification checklist

- Production build succeeds with `npm run build`.
- Lint succeeds with `npm run lint`.
- Homepage loads at `/`.
- Static public pages load: `/services`, `/safety`, `/allowed-services`, `/prohibited-services`, `/terms`, and `/privacy`.
- Placeholder pages load: `/login`, `/signup`, `/dashboard`, `/helper/apply`, `/helpers`, and `/admin`.
- Placeholder pages clearly state that real authentication, database storage, payment processing, and admin logic are not active yet.
- Terms and Privacy pages clearly state they are draft placeholders requiring legal review before launch.
- No secrets are committed or documented.
- No real Supabase connection is active yet.
- No Stripe, live payment, or medical-service functionality is active.

## Deployment issues

None known for the static scaffold.
