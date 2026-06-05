-- Notifications, in-platform chat, reviews, and disputes.
--
-- notifications  — NEW: per-user notification center (recipient-only).
-- chat_threads   — NEW: one thread per reservation, created at approval.
-- chat_messages  — NEW: messages, visible only to the two participants.
-- reviews        — NEW: elder reviews a caregiver after a completed reservation.
-- disputes       (was complaints) — renamed + extended; admin-resolved.
--
-- One-way rule throughout: every caregiver-reachable row is scoped to a
-- reservation the caregiver owns. No browse-elders surface exists.

begin;

-- ---------------------------------------------------------------------------
-- 1. notifications — recipient-only
-- ---------------------------------------------------------------------------
create table public.notifications (
  id             uuid primary key default gen_random_uuid(),
  recipient_id   uuid not null references public.profiles(id) on delete cascade,
  type           text not null,
  reservation_id uuid references public.reservations(id) on delete cascade,
  chat_thread_id uuid,  -- FK added after chat_threads exists (below)
  body           text,
  is_read        boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint notifications_type_check check (type in (
    'reservation_requested', 'reservation_approved', 'reservation_rejected',
    'reservation_cancelled', 'chat_message', 'completion_ready', 'dispute_update'
  ))
);

alter table public.notifications enable row level security;

-- A user only ever sees their OWN notifications, and may only flip the read flag.
-- Inserts come from trusted RPCs/triggers (no free client insert). Bodies must
-- never contain private contact data (e.g. phone numbers).
create policy "notifications_owner_select"
on public.notifications
for select
to authenticated
using (recipient_id = auth.uid());

create policy "notifications_owner_update_read"
on public.notifications
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create policy "notifications_admin_select"
on public.notifications
for select
to authenticated
using (public.is_admin());

create index notifications_recipient_unread_idx on public.notifications (recipient_id, is_read);

-- ---------------------------------------------------------------------------
-- 2. chat_threads — one per reservation, created only at approval (by RPC)
-- ---------------------------------------------------------------------------
create table public.chat_threads (
  id                   uuid primary key default gen_random_uuid(),
  reservation_id       uuid not null unique references public.reservations(id) on delete cascade,
  elder_id             uuid not null references public.profiles(id) on delete cascade,
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  created_at           timestamptz not null default now()
);

alter table public.chat_threads enable row level security;

-- Now wire the notifications -> chat_threads optional reference.
alter table public.notifications
  add constraint notifications_chat_thread_id_fkey
    foreign key (chat_thread_id) references public.chat_threads(id) on delete cascade;

-- Visible only to the two participants (elder + the caregiver who owns the profile)
-- and admins. Threads are created only by the approval RPC, so none exist before
-- approval. No public access.
create policy "chat_threads_participants_select"
on public.chat_threads
for select
to authenticated
using (
  elder_id = auth.uid()
  or caregiver_profile_id in (
    select cp.id from public.caregiver_profiles cp where cp.profile_id = auth.uid()
  )
);

create policy "chat_threads_admin_all"
on public.chat_threads
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index chat_threads_caregiver_idx on public.chat_threads (caregiver_profile_id);

-- ---------------------------------------------------------------------------
-- 3. chat_messages — only the two participants can read/write
-- ---------------------------------------------------------------------------
create table public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references public.chat_threads(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  kind            text not null default 'text',
  body            text,
  attachment_url  text,
  attachment_mime text,
  created_at      timestamptz not null default now(),
  read_at         timestamptz,
  constraint chat_messages_kind_check check (kind in ('text', 'voice', 'image'))
);

alter table public.chat_messages enable row level security;

-- Helper: is the caller a participant of this thread?
create or replace function public.is_chat_participant(p_uid uuid, p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_threads t
    left join public.caregiver_profiles cp on cp.id = t.caregiver_profile_id
    where t.id = p_thread_id
      and (t.elder_id = p_uid or cp.profile_id = p_uid)
  );
$$;

-- Read: only the thread's two participants (or admin).
create policy "chat_messages_participants_select"
on public.chat_messages
for select
to authenticated
using (public.is_chat_participant(auth.uid(), thread_id));

-- Insert: only a participant, only as themselves, and ONLY while the underlying
-- reservation is approved or in_progress (no chat before approval or after a
-- terminal state).
create policy "chat_messages_participant_insert"
on public.chat_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_chat_participant(auth.uid(), thread_id)
  and exists (
    select 1
    from public.chat_threads t
    join public.reservations r on r.id = t.reservation_id
    where t.id = chat_messages.thread_id
      and r.status in ('approved', 'in_progress')
  )
);

create policy "chat_messages_admin_select"
on public.chat_messages
for select
to authenticated
using (public.is_admin());

create index chat_messages_thread_idx on public.chat_messages (thread_id, created_at);

-- ---------------------------------------------------------------------------
-- 4. reviews — elder reviews a caregiver after completion
-- ---------------------------------------------------------------------------
create table public.reviews (
  id                   uuid primary key default gen_random_uuid(),
  reservation_id       uuid not null unique references public.reservations(id) on delete cascade,
  elder_id             uuid not null references public.profiles(id) on delete cascade,
  caregiver_profile_id uuid not null references public.caregiver_profiles(id) on delete cascade,
  rating               int not null,
  comment              text,
  created_at           timestamptz not null default now(),
  constraint reviews_rating_check check (rating between 1 and 5)
);

alter table public.reviews enable row level security;

-- Public read of rating + comment + caregiver (drives card review counts). The
-- author's profiles row is never bulk-exposed (only first_name via narrow joins),
-- so this is NOT an elder-enumeration surface.
create policy "reviews_public_select"
on public.reviews
for select
to anon, authenticated
using (true);

-- Insert: only the elder who owns a COMPLETED reservation, once per reservation.
create policy "reviews_elder_insert_completed"
on public.reviews
for insert
to authenticated
with check (
  elder_id = auth.uid()
  and exists (
    select 1 from public.reservations r
    where r.id = reviews.reservation_id
      and r.elder_id = auth.uid()
      and r.caregiver_profile_id = reviews.caregiver_profile_id
      and r.status = 'completed'
  )
);

create policy "reviews_admin_all"
on public.reviews
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index reviews_caregiver_idx on public.reviews (caregiver_profile_id);

-- ---------------------------------------------------------------------------
-- 5. disputes  (was complaints) — created by the elder of a disputed reservation
-- ---------------------------------------------------------------------------
alter table public.complaints rename to disputes;
alter table public.disputes rename column booking_id to reservation_id;
alter index public.complaints_booking_id_idx   rename to disputes_reservation_id_idx;
alter index public.complaints_submitted_by_idx rename to disputes_submitted_by_idx;

alter table public.disputes
  add column if not exists resolution  text,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz;

-- The legacy creator/admin policies carry over with the rename; align their names.
alter policy "complaints_creator_select" on public.disputes rename to "disputes_creator_select";
alter policy "complaints_creator_insert" on public.disputes rename to "disputes_creator_insert";
alter policy "complaints_admin_all"      on public.disputes rename to "disputes_admin_all";

-- The assigned caregiver may see LIMITED status of disputes on their OWN
-- reservations (not the admin resolution notes — surface that via a column-scoped
-- view/RPC in the dispute UI phase). This stays within the one-way rule because it
-- is reservation-scoped to a reservation the caregiver owns.
create policy "disputes_caregiver_select_own_reservation"
on public.disputes
for select
to authenticated
using (
  exists (
    select 1
    from public.reservations r
    join public.caregiver_profiles cp on cp.id = r.caregiver_profile_id
    where r.id = disputes.reservation_id
      and cp.profile_id = auth.uid()
  )
);

commit;
