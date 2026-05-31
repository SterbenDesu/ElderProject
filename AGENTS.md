# AGENTS.md

## Purpose

This file gives Codex persistent instructions for working in this repository.

Codex must read and follow this file before making changes.

## Operating rules

- Do not make broad rewrites unless explicitly requested.
- Do not refactor unrelated code.
- Do not change the package manager.
- Do not change the deployment provider without explaining why.
- Do not remove existing features unless explicitly requested.
- Do not rename files, routes, components, database tables, or environment variables unless required for the task.
- Do not introduce large new dependencies without explaining the reason.
- Do not edit secrets, credentials, API keys, `.env` files, or private configuration values.
- Do not commit generated junk files, local cache files, build output, or temporary debugging files.
- Do not change styling, layout, or UX outside the requested scope.
- Do not change authentication, authorization, database rules, or deployment logic without explicitly stating the risk first.
- If the requested task requires changes outside the expected scope, stop and explain why before editing.

## Current product direction

- VnukPodNaem should use a universal user signup model.
- Do not ask users to choose client/helper role during signup.
- New users should be treated as standard users/client-capable users by default.
- Caregiver status is obtained later through a “Become a caregiver” application flow.
- Admin approval is required before caregiver functionality becomes available.
- Public copy should prioritize services, booking, trust, and ease of use.
- Safety boundaries should be present but not repetitive, alarming, or dominant.
- Do not overuse phrases like “non-medical”, “clinical care”, or “not medical care” in every visible section.
- Keep legal/safety limits in dedicated safety, terms, helper application, and booking confirmation areas.
- Admin access should be hidden from normal navigation and visible only to admin users.
- Top navigation should be simple and user-facing.
- Prefer profile/avatar menus for account actions after login.
- Avoid implementing large feature leaps without first updating documentation and asking for product confirmation.

## Work style

Before coding, Codex must provide:

1. A short implementation plan.
2. The files expected to change.
3. Any uncertainty or risk.

After coding, Codex must provide:

1. Files changed.
2. What changed in each file.
3. Commands run.
4. Test/build/lint results.
5. Remaining risks or follow-up work.

## Scope control

For bug fixes:

- Fix only the described bug.
- Do not change unrelated UI, layout, styling, or architecture.
- If the fix requires changing unrelated files, stop and explain why first.

For feature work:

- Implement the smallest complete version first.
- Prefer simple, maintainable code over clever abstractions.
- Keep the user experience clear for a non-technical end user.
- Add loading states, error states, and empty states where relevant.
- Do not build later-stage features unless explicitly requested.

## Repository conventions

Use the existing code style and folder structure.

If the repository already has established patterns for routing, components, database access, API calls, authentication, forms, validation, styling, or tests, follow those patterns instead of inventing new ones.

## Verification

When available, run the relevant commands before finishing:

- install check
- lint
- typecheck
- tests
- build

If a command fails, report:

1. The command.
2. The error.
3. Whether the failure was caused by the current change or pre-existing code.

## Deployment

Deployment work must include or update `docs/deployment-notes.md`.

Deployment instructions must include:

1. Required services.
2. Required environment variables by name only, not secret values.
3. Build command.
4. Start command.
5. Database setup steps, if any.
6. Migration steps, if any.
7. How to verify that deployment worked.

## Security

Never expose secrets.

Never hardcode credentials.

Never commit `.env` files.

Environment variables should be documented by name only.

Authentication, authorization, database rules, and user permissions must be treated as high-risk areas.

## Product memory

Use `PROJECT_BRIEF.md` as the source of truth for the app idea, user roles, core flows, and MVP scope.

Use `docs/known-bugs.md` as the source of truth for user-tested bugs and UX issues.

Use `docs/deployment-notes.md` as the source of truth for deployment state and deployment instructions.
