-- Price a reservation by SLOT COUNT, completing the intended pricing model.
--
-- WHY: PRODUCT_SPEC §9 + the booking flow price a visit as
--   total = (number of 2-hour slots) × (per-slot service price) + extras.
-- The reservation_services.quantity column exists for exactly this, but the
-- original create_reservation() inserted every service line with quantity = 1
-- and summed each service price once, ignoring how many slots were chosen. That
-- left the authoritative (stored) total out of step with the live UI total.
--
-- This migration is a CREATE OR REPLACE of the money/state choke-point RPC, so
-- it touches a high-risk area (AGENTS.md). It is intentionally minimal: the
-- caller checks, slot locking, escrow hold, notification, and audit log are all
-- unchanged. Only the line-item quantity + total math change, and they stay on
-- the trusted SECURITY DEFINER server so a client can never tamper with price.
--
--   service line:  quantity = slot_count, unit_price_snapshot = per-slot price
--   extra line:    quantity = 1
--   total          = slot_count × Σ(service prices) + Σ(extra prices)
--
-- Idempotent: safe to run repeatedly (CREATE OR REPLACE + re-grant).

begin;

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

  -- Snapshot service line items at the caregiver's current PER-SLOT price, with
  -- quantity = the number of slots booked (so total scales with duration).
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
      values (v_reservation_id, v_sid, v_label, v_price, v_slot_count);
      v_total := v_total + (v_price * v_slot_count);
    end loop;
  end if;

  -- Snapshot optional extras (charged once per booking, quantity 1).
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
          jsonb_build_object('total_amount', v_total, 'caregiver_profile_id', p_caregiver_profile_id,
                             'slot_count', v_slot_count));

  return jsonb_build_object('ok', true, 'reservation_id', v_reservation_id,
                            'status', 'pending', 'total_amount', v_total);
end;
$$;

revoke all on function public.create_reservation(uuid, uuid, uuid[], uuid[], uuid[], text, text) from public;
grant execute on function public.create_reservation(uuid, uuid, uuid[], uuid[], uuid[], text, text) to authenticated;
comment on function public.create_reservation(uuid, uuid, uuid[], uuid[], uuid[], text, text) is
  'Elder-only RPC: atomically create a pending reservation, snapshot line-item prices (services priced per 2-hour slot × slot count, extras once), hold the chosen slots, and authorize/hold the escrow payment. No Stripe call yet.';

commit;
