-- Optional elder profile photos.
--
-- Adds a public `avatars` Storage bucket so elders can (optionally) upload a
-- profile photo at signup or from their account page. The resulting public URL
-- is stored in profiles.avatar_url, which DATABASE_SCHEMA.md defines as a
-- public-safe field (it is NOT a private contact field like phone/email).
--
-- SECURITY NOTES (additive, low-risk):
--   * Public READ is intentional and limited to this bucket only — avatars are
--     public-safe; no other bucket is affected.
--   * WRITE/UPDATE/DELETE are restricted to authenticated users acting inside
--     their OWN `{auth.uid}/...` folder, so one user can never overwrite or
--     delete another user's photo.
--   * This does NOT touch any existing table policy and does NOT weaken the
--     one-way rule or phone privacy (phone is never stored here).

begin;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read of avatar objects (and only the avatars bucket).
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

-- A user may upload only into their own top-level folder: `{auth.uid}/...`.
drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
