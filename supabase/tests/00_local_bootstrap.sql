-- Local Supabase-like bootstrap so the real migrations can run unmodified.
-- Mirrors the parts of a Supabase project the migrations depend on:
--   * anon / authenticated / service_role roles (NOT superuser, NOT bypassrls)
--   * auth schema + auth.users + auth.uid()
--   * default privileges that auto-grant new public tables to anon/authenticated
--     (this is what lets RLS — not missing grants — be what blocks access)

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls; end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;

-- New tables/sequences created by postgres auto-grant to the API roles, exactly
-- like a Supabase project. (Column-level revokes in migrations still take effect.)
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

-- Minimal stand-in for Supabase's auth.users (only the columns the seed sets).
create table if not exists auth.users (
  id uuid primary key,
  instance_id uuid,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb
);

-- auth.uid() reads the current request's JWT claims, like Supabase.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;
