# Local RLS verification harness

These files reproduce the verification described in the repo-root
`VERIFICATION.md`. They are **dev/test only** and are never applied to a real
Supabase project (Supabase already provides `auth`, the API roles, and grants).

- `00_local_bootstrap.sql` — creates a Supabase-like environment on a plain
  PostgreSQL cluster: `anon` / `authenticated` / `service_role` roles (no
  `BYPASSRLS`), an `auth` schema with `auth.users` + `auth.uid()`, and default
  privileges that auto-grant new public tables to the API roles. This ensures it
  is **RLS** — not a missing grant — that blocks access in the tests.
- `10_rls_tests.sql` — asserts RLS is on for every table, then proves the one-way
  rule and phone privacy, and exercises the booking/approval happy path.

## Run

```bash
# Start a throwaway PostgreSQL 16 cluster (any local cluster works), then:
createdb vnuk_test
psql -d vnuk_test -f supabase/tests/00_local_bootstrap.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -d vnuk_test -f "$f"; done
psql -d vnuk_test -f supabase/seed.sql
psql -d vnuk_test -f supabase/tests/10_rls_tests.sql
```

Expected highlights: `0` tables without RLS; a caregiver reads `0` elder rows; an
elder reads their own phone (`1`) while anon/caregiver read `0`; `anon` selecting
`caregiver_profiles.stripe_account_id` raises `permission denied`.
