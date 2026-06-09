-- =====================================================================
-- VnukPodNaem — SUPABASE_FIX_NOTIFICATIONS.sql
-- Idempotent patch for the Phase 8 notification center + reservation reads.
-- ---------------------------------------------------------------------
-- WHY THIS FILE EXISTS
--   The notifications / chat_threads / reservations tables, their RLS, and the
--   state-machine RPCs (create_reservation / transition_reservation) already
--   ship in supabase/migrations. Phase 8 only ADDS read paths the UI needs:
--     * get_my_notifications(p_limit)   — the bell panel (recipient-scoped)
--     * mark_notifications_read(p_ids)   — flip read flag on own rows only
--     * get_caregiver_requests()         — incoming requests for a caregiver
--     * get_elder_reservations()         — an elder's own reservations
--   ...and enables Supabase Realtime on public.notifications.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file
--   -> Run. Safe to run more than once (create-or-replace + guarded ADD TABLE).
--
-- SAFETY (AGENTS.md / DATABASE_SCHEMA.md)
--   * No DROP. Only CREATE OR REPLACE FUNCTION and a guarded publication add.
--   * RLS stays ON. Every function is SECURITY DEFINER and re-scopes each row to
--     auth.uid(): a caregiver reads elder data ONLY through a reservation it
--     owns, and only the elder's FIRST NAME + district — never phone/email.
--   * This file is identical to the migration
--     supabase/migrations/20260610120000_notification_center_rpcs.sql.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. get_my_notifications — the bell panel, recipient-scoped + name-enriched
-- ---------------------------------------------------------------------------
create or replace function public.get_my_notifications(p_limit int default 30)
returns table (
  id                 uuid,
  type               text,
  reservation_id     uuid,
  chat_thread_id     uuid,
  is_read            boolean,
  created_at         timestamptz,
  counterparty_name  text,
  reservation_status text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    n.id,
    n.type,
    n.reservation_id,
    n.chat_thread_id,
    n.is_read,
    n.created_at,
    -- The counterparty is the OTHER party of the related reservation. We expose
    -- only a public-safe name: the caregiver's display name to the elder, or the
    -- elder's FIRST NAME to the caregiver. Never phone/email/last name.
    case
      when r.id is null then null
      when r.elder_id = auth.uid() then cp.display_name
      else e.first_name
    end as counterparty_name,
    r.status as reservation_status
  from public.notifications n
  left join public.reservations r       on r.id  = n.reservation_id
  left join public.caregiver_profiles cp on cp.id = r.caregiver_profile_id
  left join public.profiles e           on e.id  = r.elder_id
  where n.recipient_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

revoke all on function public.get_my_notifications(int) from public;
grant execute on function public.get_my_notifications(int) to authenticated;
comment on function public.get_my_notifications(int) is
  'Caller''s own notifications (recipient_id = auth.uid()), newest first, enriched with the counterparty''s public-safe name. Never returns phone/email.';

-- ---------------------------------------------------------------------------
-- 2. mark_notifications_read — flip read flag on the caller's OWN rows only
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
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

  update public.notifications
     set is_read = true
   where recipient_id = auth.uid()
     and is_read = false
     and (p_ids is null or id = any(p_ids));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
comment on function public.mark_notifications_read(uuid[]) is
  'Marks the caller''s own unread notifications as read (all, or the given ids). Cannot touch other users'' notifications.';

-- ---------------------------------------------------------------------------
-- 3. get_caregiver_requests — incoming + active reservations for THIS caregiver
-- ---------------------------------------------------------------------------
-- One-way rule: scoped to reservations whose caregiver_profile belongs to the
-- caller. Returns the elder's FIRST NAME + district only; the precise address is
-- surfaced only once the reservation is approved (or later). Never phone/email.
create or replace function public.get_caregiver_requests()
returns table (
  reservation_id     uuid,
  status             text,
  elder_first_name   text,
  region_name        text,
  address_snapshot   text,
  start_at           timestamptz,
  end_at             timestamptz,
  total_amount       int,
  currency           text,
  created_at         timestamptz,
  services           jsonb,
  slots              jsonb,
  has_chat           boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.id,
    r.status,
    e.first_name,
    reg.name,
    -- Precise address is private until the caregiver has approved the request.
    case
      when r.status in ('approved', 'in_progress', 'awaiting_confirmation', 'completed')
        then r.address_snapshot
      else null
    end as address_snapshot,
    r.start_at,
    r.end_at,
    r.total_amount,
    r.currency,
    r.created_at,
    coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'label', rs.label_snapshot,
                 'unit_price', rs.unit_price_snapshot,
                 'quantity', rs.quantity,
                 'is_extra', rs.extra_id is not null
               ) order by rs.created_at
             )
      from public.reservation_services rs
      where rs.reservation_id = r.id
    ), '[]'::jsonb) as services,
    coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'date', s.slot_date,
                 'start', s.start_time,
                 'end', s.end_time
               ) order by s.slot_date, s.start_time
             )
      from public.reservation_slots rl
      join public.availability_slots s on s.id = rl.availability_slot_id
      where rl.reservation_id = r.id
    ), '[]'::jsonb) as slots,
    exists (select 1 from public.chat_threads ct where ct.reservation_id = r.id) as has_chat
  from public.reservations r
  join public.caregiver_profiles cp on cp.id = r.caregiver_profile_id
  join public.profiles e            on e.id  = r.elder_id
  left join public.regions reg      on reg.id = r.region_id
  where cp.profile_id = auth.uid()
  order by
    case r.status when 'pending' then 0 when 'approved' then 1 else 2 end,
    r.created_at desc;
$$;

revoke all on function public.get_caregiver_requests() from public;
grant execute on function public.get_caregiver_requests() to authenticated;
comment on function public.get_caregiver_requests() is
  'Reservations directed at the caller''s caregiver profile, with the elder''s first name + district + line items + slots. Address only after approval. Never phone/email — honours the one-way rule.';

-- ---------------------------------------------------------------------------
-- 4. get_elder_reservations — the elder's own reservations + caregiver name
-- ---------------------------------------------------------------------------
create or replace function public.get_elder_reservations()
returns table (
  reservation_id  uuid,
  status          text,
  caregiver_name  text,
  region_name     text,
  start_at        timestamptz,
  end_at          timestamptz,
  total_amount    int,
  currency        text,
  created_at      timestamptz,
  services        jsonb,
  slots           jsonb,
  has_chat        boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.id,
    r.status,
    cp.display_name,
    reg.name,
    r.start_at,
    r.end_at,
    r.total_amount,
    r.currency,
    r.created_at,
    coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'label', rs.label_snapshot,
                 'unit_price', rs.unit_price_snapshot,
                 'quantity', rs.quantity,
                 'is_extra', rs.extra_id is not null
               ) order by rs.created_at
             )
      from public.reservation_services rs
      where rs.reservation_id = r.id
    ), '[]'::jsonb) as services,
    coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'date', s.slot_date,
                 'start', s.start_time,
                 'end', s.end_time
               ) order by s.slot_date, s.start_time
             )
      from public.reservation_slots rl
      join public.availability_slots s on s.id = rl.availability_slot_id
      where rl.reservation_id = r.id
    ), '[]'::jsonb) as slots,
    exists (select 1 from public.chat_threads ct where ct.reservation_id = r.id) as has_chat
  from public.reservations r
  join public.caregiver_profiles cp on cp.id = r.caregiver_profile_id
  left join public.regions reg      on reg.id = r.region_id
  where r.elder_id = auth.uid()
  order by r.created_at desc;
$$;

revoke all on function public.get_elder_reservations() from public;
grant execute on function public.get_elder_reservations() to authenticated;
comment on function public.get_elder_reservations() is
  'The caller''s own reservations (elder_id = auth.uid()) with the caregiver''s public display name + booking details.';

-- ---------------------------------------------------------------------------
-- 5. Realtime — let a caregiver/elder see new notifications without refreshing.
--    RLS still applies on the realtime stream, so a user only ever receives
--    their OWN rows (notifications_owner_select).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     )
  then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

commit;
