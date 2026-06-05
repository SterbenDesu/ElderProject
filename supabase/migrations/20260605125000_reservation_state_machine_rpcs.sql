-- Reservation state machine RPCs — the single choke point for status + money.
--
-- DESIGN ONLY for Stripe: these functions move escrow STATUS fields only; no
-- Stripe API calls exist yet. They are SECURITY DEFINER and re-check the caller's
-- identity and role on every transition, so the browser never needs a service-role
-- key and clients never UPDATE reservations or payments directly.
--
-- Escrow <-> state mapping (from DATABASE_SCHEMA.md §7):
--   submit  -> pending                : payment authorized_held
--   approve -> approved               : stays authorized_held; slots booked; chat opens
--   reject  -> rejected               : payment void; slots released
--   cancel  -> cancelled              : payment refunded; slots released
--   complete-> completed              : captured then released; payout paid
--   report  -> disputed               : stays authorized_held until admin resolves

begin;

-- ---------------------------------------------------------------------------
-- create_reservation: the "submit" transition (atomic booking + escrow hold).
-- Only an elder, for themselves, against a visible+verified caregiver.
-- ---------------------------------------------------------------------------
create or replace function public.create_reservation(
  p_caregiver_profile_id uuid,
  p_region_id uuid,
  p_slot_ids uuid[],
  p_service_ids uuid[],
  p_extra_ids uuid[],
  p_address_snapshot text default null,
  p_recipient_first_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_elder uuid := auth.uid();
  v_reservation_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_total int := 0;
  v_sid uuid;
  v_eid uuid;
  v_slot uuid;
  v_price int;
  v_label text;
  v_slot_count int;
begin
  if v_elder is null then
    raise exception 'Authentication required to create a reservation.' using errcode = '28000';
  end if;

  -- Caregiver must be visible + verified (mirrors the elder-insert RLS guard).
  if not exists (
    select 1 from public.caregiver_profiles cp
    where cp.id = p_caregiver_profile_id
      and cp.is_visible = true
      and cp.verification_status in ('verified_basic', 'trusted')
  ) then
    raise exception 'Caregiver is not available for booking.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.regions where id = p_region_id and is_active = true) then
    raise exception 'Region is not available.' using errcode = '22023';
  end if;

  if p_slot_ids is null or array_length(p_slot_ids, 1) is null then
    raise exception 'At least one time slot is required.' using errcode = '22023';
  end if;

  -- All chosen slots must belong to this caregiver and still be open. Lock them,
  -- then count how many qualified (FOR UPDATE cannot be combined with count()).
  perform s.id
  from public.availability_slots s
  where s.id = any(p_slot_ids)
    and s.caregiver_profile_id = p_caregiver_profile_id
    and s.status = 'open'
  for update;
  get diagnostics v_slot_count = row_count;

  if v_slot_count <> array_length(p_slot_ids, 1) then
    raise exception 'One or more selected slots are no longer available.' using errcode = '40001';
  end if;

  select min(s.slot_date + s.start_time), max(s.slot_date + s.end_time)
    into v_start, v_end
  from public.availability_slots s
  where s.id = any(p_slot_ids);

  -- Create the reservation in pending. (RLS would also allow a direct elder insert,
  -- but routing through this RPC keeps the escrow hold atomic with the booking.)
  insert into public.reservations (
    elder_id, caregiver_profile_id, region_id, address_snapshot, recipient_first_name,
    status, start_at, end_at, total_amount, currency
  ) values (
    v_elder, p_caregiver_profile_id, p_region_id, p_address_snapshot, p_recipient_first_name,
    'pending', v_start, v_end, 0, 'EUR'
  ) returning id into v_reservation_id;

  -- Snapshot service line items at the caregiver's current price.
  if p_service_ids is not null then
    foreach v_sid in array p_service_ids loop
      select cs.price_amount, sv.name into v_price, v_label
      from public.caregiver_services cs
      join public.services sv on sv.id = cs.service_id
      where cs.caregiver_profile_id = p_caregiver_profile_id
        and cs.service_id = v_sid
        and cs.is_active = true;
      if v_price is null then
        raise exception 'Service % is not offered by this caregiver.', v_sid using errcode = '22023';
      end if;
      insert into public.reservation_services (reservation_id, service_id, label_snapshot, unit_price_snapshot, quantity)
      values (v_reservation_id, v_sid, v_label, v_price, 1);
      v_total := v_total + v_price;
    end loop;
  end if;

  -- Snapshot optional extras.
  if p_extra_ids is not null then
    foreach v_eid in array p_extra_ids loop
      select se.price_amount, se.label into v_price, v_label
      from public.service_extras se
      where se.id = v_eid
        and se.caregiver_profile_id = p_caregiver_profile_id
        and se.is_active = true;
      if v_price is null then
        raise exception 'Extra % is not offered by this caregiver.', v_eid using errcode = '22023';
      end if;
      insert into public.reservation_services (reservation_id, extra_id, label_snapshot, unit_price_snapshot, quantity)
      values (v_reservation_id, v_eid, v_label, v_price, 1);
      v_total := v_total + v_price;
    end loop;
  end if;

  -- Link slots and hold them so the caregiver is not double-booked.
  foreach v_slot in array p_slot_ids loop
    insert into public.reservation_slots (reservation_id, availability_slot_id)
    values (v_reservation_id, v_slot);
  end loop;
  update public.availability_slots set status = 'held' where id = any(p_slot_ids);

  update public.reservations set total_amount = v_total where id = v_reservation_id;

  -- Authorize/hold the escrow at submit (status only; no Stripe call yet).
  insert into public.payments (reservation_id, provider, held_amount, currency, payment_status, payout_status)
  values (v_reservation_id, 'stripe', v_total, 'EUR', 'authorized_held', 'pending');

  -- Notify the caregiver of the incoming request (no private contact data in body).
  insert into public.notifications (recipient_id, type, reservation_id, body)
  select cp.profile_id, 'reservation_requested', v_reservation_id, 'New reservation request'
  from public.caregiver_profiles cp where cp.id = p_caregiver_profile_id;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  values (v_elder, 'reservation_created', 'reservations', v_reservation_id,
          jsonb_build_object('total_amount', v_total, 'caregiver_profile_id', p_caregiver_profile_id));

  return jsonb_build_object('ok', true, 'reservation_id', v_reservation_id,
                            'status', 'pending', 'total_amount', v_total);
end;
$$;

revoke all on function public.create_reservation(uuid, uuid, uuid[], uuid[], uuid[], text, text) from public;
grant execute on function public.create_reservation(uuid, uuid, uuid[], uuid[], uuid[], text, text) to authenticated;
comment on function public.create_reservation(uuid, uuid, uuid[], uuid[], uuid[], text, text) is
  'Elder-only RPC: atomically create a pending reservation, snapshot line-item prices, hold the chosen slots, and authorize/hold the escrow payment. No Stripe call yet.';

-- ---------------------------------------------------------------------------
-- transition_reservation: approve | reject | cancel | complete | report
-- ---------------------------------------------------------------------------
create or replace function public.transition_reservation(
  p_reservation_id uuid,
  p_action text
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
    if not (v_is_elder or public.is_admin()) then raise exception 'Only the elder can mark complete.' using errcode = '42501'; end if;
    if v_res.end_at > now() then raise exception 'Reservation cannot be completed before its end time.' using errcode = '22023'; end if;
    v_new_status := 'completed';

  elsif v_action = 'report' then
    if v_res.status not in ('approved', 'in_progress', 'awaiting_confirmation') then raise exception 'Reservation cannot be disputed from %.', v_res.status using errcode = '22023'; end if;
    if not (v_is_elder or public.is_admin()) then raise exception 'Only the elder can report an issue.' using errcode = '42501'; end if;
    v_new_status := 'disputed';
  end if;

  -- Apply status + record cancel actor.
  update public.reservations
     set status = v_new_status,
         cancelled_by = case when v_new_status = 'cancelled' then v_uid else cancelled_by end
   where id = v_res.id;

  -- Money + slots + side effects per transition (escrow status only).
  if v_new_status = 'approved' then
    update public.availability_slots s set status = 'booked'
      from public.reservation_slots rs
      where rs.reservation_id = v_res.id and rs.availability_slot_id = s.id;
    -- Open the in-platform chat thread (created only on approval).
    insert into public.chat_threads (reservation_id, elder_id, caregiver_profile_id)
    values (v_res.id, v_res.elder_id, v_res.caregiver_profile_id)
    on conflict (reservation_id) do nothing
    returning id into v_thread_id;
    insert into public.notifications (recipient_id, type, reservation_id, chat_thread_id, body)
    values (v_res.elder_id, 'reservation_approved', v_res.id, v_thread_id, 'Your reservation was approved');

  elsif v_new_status in ('rejected', 'cancelled') then
    -- Release the held slots back to open.
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
    -- Capture + release the escrow to the caregiver; payout marked paid.
    update public.payments
       set payment_status = 'released',
           captured_amount = held_amount,
           payout_status = 'paid'
     where reservation_id = v_res.id;
    insert into public.notifications (recipient_id, type, reservation_id, body)
    select cp.profile_id, 'dispute_update', v_res.id, 'Reservation completed and funds released'
    from public.caregiver_profiles cp where cp.id = v_res.caregiver_profile_id;

  elsif v_new_status = 'disputed' then
    -- Funds stay authorized_held until an admin resolves the dispute.
    insert into public.notifications (recipient_id, type, reservation_id, body)
    select cp.profile_id, 'dispute_update', v_res.id, 'An issue was reported on a reservation'
    from public.caregiver_profiles cp where cp.id = v_res.caregiver_profile_id;
  end if;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  values (v_uid, 'reservation_transitioned', 'reservations', v_res.id,
          jsonb_build_object('action', v_action, 'old_status', v_res.status, 'new_status', v_new_status));

  return jsonb_build_object('ok', true, 'reservation_id', v_res.id, 'status', v_new_status);
end;
$$;

revoke all on function public.transition_reservation(uuid, text) from public;
grant execute on function public.transition_reservation(uuid, text) to authenticated;
comment on function public.transition_reservation(uuid, text) is
  'The single choke point for reservation status + escrow status changes. Re-checks the caller and validates each transition against the state machine. No Stripe API calls yet — status fields only.';

commit;
