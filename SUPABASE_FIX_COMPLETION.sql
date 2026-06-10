-- =============================================================================
-- SUPABASE_FIX_COMPLETION.sql
-- Phase 10 — Completion & dispute flow (runnable patch).
--
-- Apply this in the Supabase SQL editor if the Phase 10 migration
-- (supabase/migrations/20260612120000_completion_and_disputes.sql) has not yet
-- been applied to your database. It is IDEMPOTENT — safe to run more than once.
--
-- It ONLY sets STATUS fields. No money is captured, released, or refunded here;
-- Phase 11's Stripe integration will act on the states this patch introduces
-- (payout 'ready_for_release' / 'held_review', payment 'to_be_refunded').
--
-- This file is intentionally identical to the migration body below.
-- =============================================================================


begin;

-- ---------------------------------------------------------------------------
-- 1. reservations: completion / dispute timestamps
-- ---------------------------------------------------------------------------
alter table public.reservations
  add column if not exists completed_at timestamptz,
  add column if not exists disputed_at  timestamptz;

-- ---------------------------------------------------------------------------
-- 2. payments: intermediate escrow states Phase 11 will act on (no money moved)
-- ---------------------------------------------------------------------------
-- payment_status += 'to_be_refunded' (admin chose to refund the elder; the actual
-- refund happens in Phase 11). payout_status += 'ready_for_release' (elder/admin
-- confirmed the service; Phase 11 captures + transfers) and 'held_review' (an
-- issue was reported; funds stay held until an admin resolves).
alter table public.payments drop constraint if exists payments_payment_status_check;
alter table public.payments
  add constraint payments_payment_status_check check (payment_status in (
    'requires_authorization', 'authorized_held', 'captured', 'released',
    'refunded', 'void', 'to_be_refunded'
  ));

alter table public.payments drop constraint if exists payments_payout_status_check;
alter table public.payments
  add constraint payments_payout_status_check check (payout_status in (
    'pending', 'paid', 'failed', 'reversed', 'ready_for_release', 'held_review'
  ));

-- ---------------------------------------------------------------------------
-- 3. notifications: a "marked complete" type for the caregiver
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check check (type in (
    'reservation_requested', 'reservation_approved', 'reservation_rejected',
    'reservation_cancelled', 'chat_message', 'completion_ready',
    'dispute_update', 'reservation_completed'
  ));

-- ---------------------------------------------------------------------------
-- 4. refresh_reservation_progress — time-based promotion on page load
-- ---------------------------------------------------------------------------
-- MVP completion detection WITHOUT a cron/background job: the elder + caregiver
-- pages call this on load. It advances ONLY the caller's own reservations by
-- comparing the clock to start_at/end_at:
--   approved            -> in_progress           (window has started)
--   approved/in_progress-> awaiting_confirmation (end time has passed)
-- On entering awaiting_confirmation it notifies the elder once ("ready to
-- confirm"). It never moves money and never closes a reservation by itself —
-- only the elder closes out. Scoped to the caller (elder or assigned caregiver),
-- so it can never touch a stranger's reservation.
create or replace function public.refresh_reservation_progress()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_promoted int := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- approved -> in_progress while the booked window is currently active.
  update public.reservations res
     set status = 'in_progress'
   where res.status = 'approved'
     and res.start_at <= now()
     and res.end_at  > now()
     and (
       res.elder_id = v_uid
       or exists (
         select 1 from public.caregiver_profiles cp
         where cp.id = res.caregiver_profile_id and cp.profile_id = v_uid
       )
     );

  -- approved/in_progress -> awaiting_confirmation once the end time has passed.
  with promoted as (
    update public.reservations res
       set status = 'awaiting_confirmation'
     where res.status in ('approved', 'in_progress')
       and res.end_at <= now()
       and (
         res.elder_id = v_uid
         or exists (
           select 1 from public.caregiver_profiles cp
           where cp.id = res.caregiver_profile_id and cp.profile_id = v_uid
         )
       )
    returning res.id, res.elder_id
  ),
  notified as (
    insert into public.notifications (recipient_id, type, reservation_id, body)
    select p.elder_id, 'completion_ready', p.id, 'Your booking is ready to confirm'
    from promoted p
    where not exists (
      select 1 from public.notifications n
      where n.reservation_id = p.id and n.type = 'completion_ready'
    )
    returning 1
  )
  select count(*) into v_promoted from promoted;

  return v_promoted;
end;
$$;

revoke all on function public.refresh_reservation_progress() from public;
grant execute on function public.refresh_reservation_progress() to authenticated;
comment on function public.refresh_reservation_progress() is
  'MVP completion detection (no cron): promotes the caller''s own reservations approved -> in_progress -> awaiting_confirmation by comparing start_at/end_at to now(), and notifies the elder once when a booking is ready to confirm. Never moves money.';

-- ---------------------------------------------------------------------------
-- 5. transition_reservation — the single choke point (now with optional detail)
-- ---------------------------------------------------------------------------
-- Re-create with a 3rd optional parameter (the elder's issue text for `report`).
-- The old 2-arg signature is dropped so there is exactly one choke point.
drop function if exists public.transition_reservation(uuid, text);

create or replace function public.transition_reservation(
  p_reservation_id uuid,
  p_action text,
  p_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_action text := lower(trim(coalesce(p_action, '')));
  v_res public.reservations%rowtype;
  v_is_elder boolean;
  v_is_caregiver boolean;
  v_new_status text;
  v_thread_id uuid;
  v_admin record;
begin
  if v_uid is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;
  if v_action not in ('approve', 'reject', 'cancel', 'complete', 'report') then
    raise exception 'Invalid action: %.', p_action using errcode = '22023';
  end if;

  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then
    raise exception 'Reservation not found.' using errcode = 'P0002';
  end if;

  v_is_elder := (v_res.elder_id = v_uid);
  v_is_caregiver := exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = v_res.caregiver_profile_id and cp.profile_id = v_uid
  );

  -- Only a party to the reservation (or admin) may transition it.
  if not (v_is_elder or v_is_caregiver or public.is_admin()) then
    raise exception 'You are not a party to this reservation.' using errcode = '42501';
  end if;

  -- Validate the transition + actor against the state machine.
  if v_action = 'approve' then
    if v_res.status <> 'pending' then raise exception 'Only pending reservations can be approved.' using errcode = '22023'; end if;
    if not (v_is_caregiver or public.is_admin()) then raise exception 'Only the caregiver can approve.' using errcode = '42501'; end if;
    v_new_status := 'approved';

  elsif v_action = 'reject' then
    if v_res.status <> 'pending' then raise exception 'Only pending reservations can be rejected.' using errcode = '22023'; end if;
    if not (v_is_caregiver or public.is_admin()) then raise exception 'Only the caregiver can reject.' using errcode = '42501'; end if;
    v_new_status := 'rejected';

  elsif v_action = 'cancel' then
    if v_res.status not in ('pending', 'approved') then raise exception 'Only pending/approved reservations can be cancelled.' using errcode = '22023'; end if;
    if not (v_is_elder or public.is_admin()) then raise exception 'Only the elder can cancel.' using errcode = '42501'; end if;
    v_new_status := 'cancelled';

  elsif v_action = 'complete' then
    if v_res.status not in ('approved', 'in_progress', 'awaiting_confirmation') then raise exception 'Reservation cannot be completed from %.', v_res.status using errcode = '22023'; end if;
    -- ONLY the elder (or admin) closes out — never the caregiver.
    if not (v_is_elder or public.is_admin()) then raise exception 'Only the family can mark a booking complete.' using errcode = '42501'; end if;
    if v_res.end_at > now() then raise exception 'Reservation cannot be completed before its end time.' using errcode = '22023'; end if;
    v_new_status := 'completed';

  elsif v_action = 'report' then
    if v_res.status not in ('approved', 'in_progress', 'awaiting_confirmation') then raise exception 'An issue cannot be reported from %.', v_res.status using errcode = '22023'; end if;
    -- ONLY the elder (or admin) can report an issue — never the caregiver.
    if not (v_is_elder or public.is_admin()) then raise exception 'Only the family can report an issue.' using errcode = '42501'; end if;
    if v_res.end_at > now() then raise exception 'An issue can only be reported after the booking''s end time.' using errcode = '22023'; end if;
    v_new_status := 'disputed';
  end if;

  -- Apply status + the relevant timestamps / cancel actor.
  update public.reservations
     set status = v_new_status,
         cancelled_by = case when v_new_status = 'cancelled' then v_uid else cancelled_by end,
         completed_at = case when v_new_status = 'completed' then now() else completed_at end,
         disputed_at  = case when v_new_status = 'disputed'  then now() else disputed_at  end
   where id = v_res.id;

  -- Side effects per transition (escrow STATUS only — no Stripe call, no money).
  if v_new_status = 'approved' then
    update public.availability_slots s set status = 'booked'
      from public.reservation_slots rs
      where rs.reservation_id = v_res.id and rs.availability_slot_id = s.id;
    insert into public.chat_threads (reservation_id, elder_id, caregiver_profile_id)
    values (v_res.id, v_res.elder_id, v_res.caregiver_profile_id)
    on conflict (reservation_id) do nothing
    returning id into v_thread_id;
    insert into public.notifications (recipient_id, type, reservation_id, chat_thread_id, body)
    values (v_res.elder_id, 'reservation_approved', v_res.id, v_thread_id, 'Your reservation was approved');

  elsif v_new_status in ('rejected', 'cancelled') then
    -- Release the held slots back to open; void/refund the (uncaptured) hold.
    update public.availability_slots s set status = 'open'
      from public.reservation_slots rs
      where rs.reservation_id = v_res.id and rs.availability_slot_id = s.id;
    update public.payments
       set payment_status = case when v_new_status = 'rejected' then 'void' else 'refunded' end,
           payout_status = 'reversed'
     where reservation_id = v_res.id;
    insert into public.notifications (recipient_id, type, reservation_id, body)
    select case when v_is_elder then cp.profile_id else v_res.elder_id end,
           case when v_new_status = 'rejected' then 'reservation_rejected' else 'reservation_cancelled' end,
           v_res.id,
           case when v_new_status = 'rejected' then 'Your reservation was declined' else 'A reservation was cancelled' end
    from public.caregiver_profiles cp where cp.id = v_res.caregiver_profile_id;

  elsif v_new_status = 'completed' then
    -- READY FOR RELEASE — funds STAY held (authorized_held); Phase 11 will
    -- capture + transfer. We do NOT mark captured/released/paid here.
    update public.payments
       set payout_status = 'ready_for_release'
     where reservation_id = v_res.id;
    insert into public.notifications (recipient_id, type, reservation_id, body)
    select cp.profile_id, 'reservation_completed', v_res.id, 'Your booking was marked complete'
    from public.caregiver_profiles cp where cp.id = v_res.caregiver_profile_id;

  elsif v_new_status = 'disputed' then
    -- HELD — UNDER REVIEW. Funds stay held; never auto-resolve. Store the elder's
    -- description and flag the admin queue + notify the caregiver.
    update public.payments
       set payout_status = 'held_review'
     where reservation_id = v_res.id;
    insert into public.disputes (reservation_id, submitted_by, status, reason, details)
    values (v_res.id, v_res.elder_id, 'open', 'service_issue',
            coalesce(nullif(trim(p_detail), ''), 'An issue was reported with this booking.'));
    -- Notify the caregiver…
    insert into public.notifications (recipient_id, type, reservation_id, body)
    select cp.profile_id, 'dispute_update', v_res.id, 'An issue was reported on a booking'
    from public.caregiver_profiles cp where cp.id = v_res.caregiver_profile_id;
    -- …and every admin (the review queue).
    for v_admin in select id from public.profiles where role = 'admin' loop
      insert into public.notifications (recipient_id, type, reservation_id, body)
      values (v_admin.id, 'dispute_update', v_res.id, 'A booking was disputed and needs review');
    end loop;
  end if;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  values (v_uid, 'reservation_transitioned', 'reservations', v_res.id,
          jsonb_build_object('action', v_action, 'old_status', v_res.status, 'new_status', v_new_status));

  return jsonb_build_object('ok', true, 'reservation_id', v_res.id, 'status', v_new_status);
end;
$$;

revoke all on function public.transition_reservation(uuid, text, text) from public;
grant execute on function public.transition_reservation(uuid, text, text) to authenticated;
comment on function public.transition_reservation(uuid, text, text) is
  'The single choke point for reservation status + escrow STATUS changes. Re-checks the caller and validates each transition. complete -> payout_status=ready_for_release (funds stay held); report -> disputed + held_review + stores the issue + flags admins. No Stripe calls, no money moved.';

-- ---------------------------------------------------------------------------
-- 6. resolve_dispute — ADMIN-ONLY (release to caregiver | refund to elder)
-- ---------------------------------------------------------------------------
-- Admin-only via is_admin() re-check inside a SECURITY DEFINER RPC. Normal users
-- can never call this to a useful end (the guard raises). It only sets STATES:
--   release -> reservation completed, payout_status=ready_for_release (Phase 11
--              captures + transfers).
--   refund  -> reservation cancelled, payment_status=to_be_refunded (Phase 11
--              refunds the elder), payout reversed.
-- Both record the resolution on the dispute, write an audit log, and notify both
-- parties. Never moves money now.
create or replace function public.resolve_dispute(
  p_reservation_id uuid,
  p_resolution text,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_resolution text := lower(trim(coalesce(p_resolution, '')));
  v_res public.reservations%rowtype;
  v_new_status text;
begin
  if v_uid is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;
  if not public.is_admin() then
    raise exception 'Only an admin can resolve a dispute.' using errcode = '42501';
  end if;
  if v_resolution not in ('release', 'refund') then
    raise exception 'Invalid resolution: %.', p_resolution using errcode = '22023';
  end if;

  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then
    raise exception 'Reservation not found.' using errcode = 'P0002';
  end if;
  if v_res.status <> 'disputed' then
    raise exception 'Only a disputed reservation can be resolved (current: %).', v_res.status using errcode = '22023';
  end if;

  if v_resolution = 'release' then
    v_new_status := 'completed';
    update public.reservations set status = v_new_status, completed_at = now() where id = v_res.id;
    update public.payments set payout_status = 'ready_for_release' where reservation_id = v_res.id;
  else
    v_new_status := 'cancelled';
    update public.reservations set status = v_new_status, cancelled_by = v_uid where id = v_res.id;
    update public.payments set payment_status = 'to_be_refunded', payout_status = 'reversed'
     where reservation_id = v_res.id;
  end if;

  -- Record the admin's decision on the dispute record.
  update public.disputes
     set status = 'resolved',
         resolution = v_resolution,
         resolved_by = v_uid,
         resolved_at = now(),
         details = case when nullif(trim(p_admin_notes), '') is null then details
                        else details || E'\n\n[Admin] ' || trim(p_admin_notes) end
   where reservation_id = v_res.id
     and status in ('open', 'under_review');

  -- Notify BOTH parties (elder + the caregiver who owns the profile).
  insert into public.notifications (recipient_id, type, reservation_id, body)
  values (
    v_res.elder_id, 'dispute_update', v_res.id,
    case when v_resolution = 'release'
         then 'Your reported booking was reviewed and released to the caregiver'
         else 'Your reported booking was reviewed and a refund is being arranged' end
  );
  insert into public.notifications (recipient_id, type, reservation_id, body)
  select cp.profile_id, 'dispute_update', v_res.id,
         case when v_resolution = 'release'
              then 'A disputed booking was resolved in your favour (release pending)'
              else 'A disputed booking was resolved with a refund to the family' end
  from public.caregiver_profiles cp where cp.id = v_res.caregiver_profile_id;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  values (v_uid, 'dispute_resolved', 'reservations', v_res.id,
          jsonb_build_object('resolution', v_resolution, 'new_status', v_new_status));

  return jsonb_build_object('ok', true, 'reservation_id', v_res.id,
                            'status', v_new_status, 'resolution', v_resolution);
end;
$$;

revoke all on function public.resolve_dispute(uuid, text, text) from public;
grant execute on function public.resolve_dispute(uuid, text, text) to authenticated;
comment on function public.resolve_dispute(uuid, text, text) is
  'ADMIN-ONLY dispute resolution. release -> completed + payout ready_for_release; refund -> cancelled + payment to_be_refunded. Sets STATES only (Phase 11 moves the money), records the resolution, and notifies both parties.';

-- ---------------------------------------------------------------------------
-- 7. get_admin_disputes — ADMIN-ONLY review queue read
-- ---------------------------------------------------------------------------
-- Lists every disputed reservation with both parties, the booking details, the
-- elder's issue description, and the current held escrow state. Admin-only: the
-- function raises for non-admins, so a normal user can never read others'
-- disputes (defence-in-depth alongside the disputes table RLS).
create or replace function public.get_admin_disputes()
returns table (
  reservation_id   uuid,
  dispute_id       uuid,
  dispute_status   text,
  reported_at      timestamptz,
  issue_details    text,
  elder_name       text,
  caregiver_name   text,
  region_name      text,
  start_at         timestamptz,
  end_at           timestamptz,
  total_amount     int,
  currency         text,
  payment_status   text,
  payout_status    text,
  services         jsonb,
  slots            jsonb
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can view the dispute queue.' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    d.id,
    d.status,
    coalesce(d.created_at, r.disputed_at),
    d.details,
    trim(both ' ' from concat_ws(' ', e.first_name, e.last_name)),
    cp.display_name,
    reg.name,
    r.start_at,
    r.end_at,
    r.total_amount,
    r.currency,
    pay.payment_status,
    pay.payout_status,
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
    ), '[]'::jsonb),
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
    ), '[]'::jsonb)
  from public.reservations r
  join public.profiles e             on e.id  = r.elder_id
  join public.caregiver_profiles cp  on cp.id = r.caregiver_profile_id
  left join public.regions reg       on reg.id = r.region_id
  left join public.payments pay      on pay.reservation_id = r.id
  left join public.disputes d        on d.reservation_id = r.id
  where r.status = 'disputed'
  order by coalesce(d.created_at, r.disputed_at) asc nulls last;
end;
$$;

revoke all on function public.get_admin_disputes() from public;
grant execute on function public.get_admin_disputes() to authenticated;
comment on function public.get_admin_disputes() is
  'ADMIN-ONLY review queue: every disputed reservation with both parties, booking details, the elder''s issue description, and the held escrow state. Raises for non-admins.';

commit;
