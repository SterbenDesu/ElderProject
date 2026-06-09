-- =====================================================================
-- VnukPodNaem — SUPABASE_FIX_CHAT.sql
-- Idempotent patch for the Phase 9 internal elder <-> caregiver chat.
-- ---------------------------------------------------------------------
-- WHAT THIS INSTALLS
--   * get_my_chat_threads()    — the "Messages" inbox (caller's own threads)
--   * get_chat_thread(id)      — one thread's header (participants only)
--   * mark_thread_read(id)     — read receipts + clear the bell for a thread
--   * send_chat_message(...)   — append text/voice/image + notify the other party
--   * a PRIVATE `chat-media` Storage bucket (+ participant-only policies)
--   * Realtime on public.chat_messages
--
--   The chat TABLES (chat_threads, chat_messages), their RLS, the
--   is_chat_participant() helper, and the approval trigger that opens a thread
--   already ship in earlier migrations / SUPABASE_SETUP.sql. This file adds only
--   the read/send paths + storage the chat UI needs.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file
--   -> Run. Safe to run more than once (create-or-replace + guarded adds).
--   This single file also creates the PRIVATE Storage bucket and its policies,
--   so no manual bucket setup is required. (If you prefer the dashboard:
--   Storage -> New bucket -> name `chat-media`, Public = OFF — then this file
--   only adds the policies.)
--
-- SAFETY (AGENTS.md / DATABASE_SCHEMA.md)
--   * No DROP TABLE. Only CREATE OR REPLACE FUNCTION, guarded bucket/policy
--     creation, and a guarded publication add.
--   * RLS stays ON. Every function is SECURITY DEFINER and re-scopes each row to
--     a thread the caller belongs to. A caregiver reaches an elder ONLY through a
--     thread for a reservation it owns, and sees only the elder's FIRST NAME +
--     avatar — never phone/email. The one-way rule holds (no browse-elders path).
--   * The `chat-media` bucket is PRIVATE; attachments are reachable only via
--     short-lived signed URLs whose access is checked against the participant
--     SELECT policy below.
--   * The RPC bodies are kept identical to the migration
--     supabase/migrations/20260611120000_chat_messaging.sql.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. PREFLIGHT — fail fast with an actionable message if the chat schema this
--    patch depends on has not been applied yet.
-- ---------------------------------------------------------------------------
do $$
declare
  v_missing text[] := array[]::text[];
  v_tbl text;
begin
  foreach v_tbl in array array[
    'profiles', 'caregiver_profiles', 'regions', 'reservations',
    'notifications', 'chat_threads', 'chat_messages'
  ] loop
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = v_tbl
    ) then
      v_missing := v_missing || v_tbl;
    end if;
  end loop;

  if array_length(v_missing, 1) is not null then
    raise exception
      'Cannot install the chat RPCs: missing table(s): %. Apply the reservation/chat schema first (supabase/migrations/20260605122000..125000 and 20260605124000_notifications_chat_reviews_disputes.sql, or the consolidated SUPABASE_SETUP.sql), then re-run this file.',
      array_to_string(v_missing, ', ')
      using errcode = '42P01';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_chat_participant'
  ) then
    raise exception
      'public.is_chat_participant(uuid, uuid) is missing — apply 20260605124000_notifications_chat_reviews_disputes.sql (or SUPABASE_SETUP.sql) before running this file.'
      using errcode = '42883';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. get_my_chat_threads — the inbox, scoped to the caller's own threads
-- ---------------------------------------------------------------------------
create or replace function public.get_my_chat_threads()
returns table (
  thread_id               uuid,
  reservation_id          uuid,
  reservation_status      text,
  counterparty_name       text,
  counterparty_avatar_url text,
  region_name             text,
  last_message_kind       text,
  last_message_body       text,
  last_message_at         timestamptz,
  last_message_is_mine    boolean,
  unread_count            int,
  is_open                 boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    t.id as thread_id,
    t.reservation_id,
    r.status as reservation_status,
    case when t.elder_id = auth.uid() then cp.display_name else e.first_name end
      as counterparty_name,
    case when t.elder_id = auth.uid() then cgp.avatar_url else e.avatar_url end
      as counterparty_avatar_url,
    reg.name as region_name,
    lm.kind as last_message_kind,
    case when lm.kind = 'text' then lm.body else null end as last_message_body,
    lm.created_at as last_message_at,
    (lm.sender_id = auth.uid()) as last_message_is_mine,
    coalesce((
      select count(*)
      from public.chat_messages m
      where m.thread_id = t.id
        and m.sender_id <> auth.uid()
        and m.read_at is null
    ), 0)::int as unread_count,
    (r.status in ('approved', 'in_progress')) as is_open
  from public.chat_threads t
  join public.reservations r        on r.id  = t.reservation_id
  join public.caregiver_profiles cp on cp.id = t.caregiver_profile_id
  join public.profiles e            on e.id  = t.elder_id
  left join public.profiles cgp     on cgp.id = cp.profile_id
  left join public.regions reg      on reg.id = r.region_id
  left join lateral (
    select m.kind, m.body, m.created_at, m.sender_id
    from public.chat_messages m
    where m.thread_id = t.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where t.elder_id = auth.uid()
     or cp.profile_id = auth.uid()
  order by coalesce(lm.created_at, t.created_at) desc;
$$;

revoke all on function public.get_my_chat_threads() from public;
grant execute on function public.get_my_chat_threads() to authenticated;
comment on function public.get_my_chat_threads() is
  'Caller''s own chat threads (elder or caregiver participant), with the counterparty''s public-safe name + avatar, last-message preview, and unread count. Never returns phone/email.';

-- ---------------------------------------------------------------------------
-- 2. get_chat_thread — one thread header, participants only
-- ---------------------------------------------------------------------------
create or replace function public.get_chat_thread(p_thread_id uuid)
returns table (
  thread_id               uuid,
  reservation_id          uuid,
  reservation_status      text,
  my_role                 text,
  counterparty_name       text,
  counterparty_avatar_url text,
  region_name             text,
  is_open                 boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    t.id,
    t.reservation_id,
    r.status,
    case when t.elder_id = auth.uid() then 'elder' else 'caregiver' end as my_role,
    case when t.elder_id = auth.uid() then cp.display_name else e.first_name end,
    case when t.elder_id = auth.uid() then cgp.avatar_url else e.avatar_url end,
    reg.name,
    (r.status in ('approved', 'in_progress')) as is_open
  from public.chat_threads t
  join public.reservations r        on r.id  = t.reservation_id
  join public.caregiver_profiles cp on cp.id = t.caregiver_profile_id
  join public.profiles e            on e.id  = t.elder_id
  left join public.profiles cgp     on cgp.id = cp.profile_id
  left join public.regions reg      on reg.id = r.region_id
  where t.id = p_thread_id
    and (t.elder_id = auth.uid() or cp.profile_id = auth.uid());
$$;

revoke all on function public.get_chat_thread(uuid) from public;
grant execute on function public.get_chat_thread(uuid) to authenticated;
comment on function public.get_chat_thread(uuid) is
  'Header for one chat thread the caller participates in: counterparty public-safe name + avatar, caller role, reservation status, and whether the chat is still open. Returns no rows for non-participants.';

-- ---------------------------------------------------------------------------
-- 3. mark_thread_read — read receipts + clear the bell for this thread
-- ---------------------------------------------------------------------------
create or replace function public.mark_thread_read(p_thread_id uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;
  if not public.is_chat_participant(auth.uid(), p_thread_id) then
    raise exception 'You are not a participant of this conversation.' using errcode = '42501';
  end if;

  update public.chat_messages
     set read_at = now()
   where thread_id = p_thread_id
     and sender_id <> auth.uid()
     and read_at is null;
  get diagnostics v_count = row_count;

  update public.notifications
     set is_read = true
   where recipient_id = auth.uid()
     and chat_thread_id = p_thread_id
     and type = 'chat_message'
     and is_read = false;

  return v_count;
end;
$$;

revoke all on function public.mark_thread_read(uuid) from public;
grant execute on function public.mark_thread_read(uuid) to authenticated;
comment on function public.mark_thread_read(uuid) is
  'Marks the OTHER party''s messages in a thread as read and clears the caller''s chat_message notifications for that thread. Participants only.';

-- ---------------------------------------------------------------------------
-- 4. send_chat_message — append a message + notify the other party
-- ---------------------------------------------------------------------------
create or replace function public.send_chat_message(
  p_thread_id       uuid,
  p_kind            text default 'text',
  p_body            text default null,
  p_attachment_url  text default null,
  p_attachment_mime text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_kind       text := lower(coalesce(p_kind, 'text'));
  v_thread     public.chat_threads%rowtype;
  v_status     text;
  v_recipient  uuid;
  v_message_id uuid;
  v_created_at timestamptz;
  v_body       text;
begin
  if v_uid is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;
  if v_kind not in ('text', 'voice', 'image') then
    raise exception 'Invalid message kind: %.', p_kind using errcode = '22023';
  end if;

  select * into v_thread from public.chat_threads where id = p_thread_id;
  if not found then
    raise exception 'Conversation not found.' using errcode = 'P0002';
  end if;

  if not public.is_chat_participant(v_uid, p_thread_id) then
    raise exception 'You are not a participant of this conversation.' using errcode = '42501';
  end if;

  select r.status into v_status from public.reservations r where r.id = v_thread.reservation_id;
  if v_status is distinct from 'approved' and v_status is distinct from 'in_progress' then
    raise exception 'This conversation is closed.' using errcode = '22023';
  end if;

  if v_kind = 'text' then
    if p_body is null or btrim(p_body) = '' then
      raise exception 'Message text is required.' using errcode = '22023';
    end if;
    v_body := btrim(p_body);
  else
    if p_attachment_url is null or btrim(p_attachment_url) = '' then
      raise exception 'Attachment is required.' using errcode = '22023';
    end if;
    v_body := nullif(btrim(coalesce(p_body, '')), '');
  end if;

  insert into public.chat_messages (thread_id, sender_id, kind, body, attachment_url, attachment_mime)
  values (p_thread_id, v_uid, v_kind, v_body, p_attachment_url, p_attachment_mime)
  returning id, created_at into v_message_id, v_created_at;

  if v_thread.elder_id = v_uid then
    select cp.profile_id into v_recipient
    from public.caregiver_profiles cp where cp.id = v_thread.caregiver_profile_id;
  else
    v_recipient := v_thread.elder_id;
  end if;

  if v_recipient is not null and not exists (
    select 1 from public.notifications n
    where n.recipient_id = v_recipient
      and n.chat_thread_id = p_thread_id
      and n.type = 'chat_message'
      and n.is_read = false
  ) then
    insert into public.notifications (recipient_id, type, reservation_id, chat_thread_id, body)
    values (v_recipient, 'chat_message', v_thread.reservation_id, p_thread_id, null);
  end if;

  return jsonb_build_object(
    'id', v_message_id,
    'thread_id', p_thread_id,
    'sender_id', v_uid,
    'kind', v_kind,
    'body', v_body,
    'attachment_url', p_attachment_url,
    'attachment_mime', p_attachment_mime,
    'created_at', v_created_at
  );
end;
$$;

revoke all on function public.send_chat_message(uuid, text, text, text, text) from public;
grant execute on function public.send_chat_message(uuid, text, text, text, text) to authenticated;
comment on function public.send_chat_message(uuid, text, text, text, text) is
  'Append a text/voice/image message to a thread the caller participates in (only while the reservation is approved/in_progress) and notify the other party. Re-checks the caller server-side.';

-- ---------------------------------------------------------------------------
-- 5. PRIVATE Storage bucket for voice/image attachments
--    Files: {thread_id}/{sender_uid}/{filename}. Reachable only via signed URLs
--    whose access is checked against the participant SELECT policy below.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

drop policy if exists "chat_media_participant_read"   on storage.objects;
drop policy if exists "chat_media_participant_insert" on storage.objects;

create policy "chat_media_participant_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and public.is_chat_participant(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

create policy "chat_media_participant_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_chat_participant(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- ---------------------------------------------------------------------------
-- 6. Realtime — new messages arrive without a refresh (RLS still applies).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'chat_messages'
     )
  then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

commit;

-- =====================================================================
-- VERIFY (run after the patch; not part of the transaction).
--
-- 1) All four chat RPCs exist (expect 4 rows):
--   select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and proname in ('get_my_chat_threads','get_chat_thread',
--                      'mark_thread_read','send_chat_message');
--
-- 2) The private bucket exists and is NOT public (expect public = false):
--   select id, public from storage.buckets where id = 'chat-media';
--
-- 3) chat_messages is in the realtime publication (expect one row):
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and tablename = 'chat_messages';
--
-- 4) The participant storage policies exist (expect two rows):
--   select policyname from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and policyname like 'chat_media_%';
-- =====================================================================
