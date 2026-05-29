# Deployment Notes

Use this file as the source of truth for deployment setup and deployment status.

## Deployment provider

Recommended provider: **Vercel** for the Next.js web app.

## Current deployment status

Not deployed yet. The repository now contains the first static, deployable Next.js app shell for review and preview deployment.

## Current stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- npm

## Required services

- Vercel for hosting the static web app shell.
- Supabase is not required for this scaffold and should be added only in a later authentication/database phase.
- Stripe or another marketplace payment provider is not required for this scaffold and should be added only in a later payment phase.

## Required environment variables

None for this static scaffold.

Document future variable names only. Do not include secret values.

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

None for this static scaffold. No database, Supabase project, schema, or row-level security rules are implemented yet.

## Migration steps

None for this static scaffold. No migrations exist yet.

## Deployment steps

1. Create or connect a Vercel project to this repository.
2. Use npm as the package manager.
3. Use `npm run build` as the build command.
4. Use Vercel's default Next.js output handling.
5. Do not configure environment variables for this scaffold.
6. Deploy a preview and review all required public and placeholder routes.

## Verification checklist

- Production build succeeds with `npm run build`.
- Homepage loads at `/`.
- Static public pages load: `/services`, `/safety`, `/allowed-services`, `/prohibited-services`, `/terms`, and `/privacy`.
- Placeholder pages load: `/login`, `/signup`, `/dashboard`, `/helper/apply`, `/helpers`, and `/admin`.
- Placeholder pages clearly state that real authentication, database storage, payment processing, and admin logic are not active yet.
- Terms and Privacy pages clearly state they are draft placeholders requiring legal review before launch.
- No secrets are committed or documented.
- No Supabase, Stripe, live payment, or medical-service functionality is active.

## Deployment issues

None known for the static scaffold.
