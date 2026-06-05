-- payments (was payment_records) — Stripe Connect escrow-ready, DESIGN ONLY.
--
-- One escrow record per reservation. No card data ever — provider references and
-- statuses only. No Stripe code in this phase. Money state only ever changes
-- through the reservation state machine via SECURITY DEFINER RPCs: there is NO
-- client insert/update policy on this table.

begin;

alter table public.payment_records rename to payments;

-- Re-point the record at a reservation and make it one-per-reservation.
alter table public.payments rename column booking_id to reservation_id;
alter table public.payments add constraint payments_reservation_unique unique (reservation_id);

-- Provider + reference columns (Stripe-ready).
alter table public.payments alter column provider set default 'stripe';
alter table public.payments rename column provider_payment_id to payment_intent_id;
alter table public.payments
  add column if not exists connected_account_id text,
  add column if not exists transfer_id          text,
  add column if not exists captured_amount      int;

-- Money columns -> escrow vocabulary (minor units).
alter table public.payments rename column amount_cents       to held_amount;
alter table public.payments rename column platform_fee_cents to platform_fee;
alter table public.payments drop constraint if exists payment_records_amount_check;
alter table public.payments drop constraint if exists payment_records_platform_fee_check;
alter table public.payments
  add constraint payments_held_amount_check  check (held_amount >= 0),
  add constraint payments_captured_check     check (captured_amount is null or captured_amount >= 0),
  add constraint payments_platform_fee_check check (platform_fee is null or platform_fee >= 0);

-- currency stays 'EUR' (existing default retained per product decision).

-- Status enums for the escrow lifecycle.
alter table public.payments alter column payment_status set default 'requires_authorization';
alter table public.payments alter column payout_status  set default 'pending';
update public.payments set payment_status = 'requires_authorization'
  where payment_status not in ('requires_authorization','authorized_held','captured','released','refunded','void');
update public.payments set payout_status = 'pending'
  where payout_status not in ('pending','paid','failed','reversed');
alter table public.payments
  add constraint payments_payment_status_check check (payment_status in (
    'requires_authorization', 'authorized_held', 'captured', 'released', 'refunded', 'void'
  )),
  add constraint payments_payout_status_check check (payout_status in (
    'pending', 'paid', 'failed', 'reversed'
  ));

alter index public.payment_records_booking_id_idx rename to payments_reservation_id_idx;

-- RLS: replace the legacy related-user policy with reservation-party visibility.
drop policy if exists "payment_records_related_user_select" on public.payments;
drop policy if exists "payment_records_admin_all"           on public.payments;

-- The reservation's elder and assigned caregiver can READ the escrow status of
-- their own reservation (a caregiver sees only their own payouts). No public read.
create policy "payments_parties_select"
on public.payments
for select
to authenticated
using (public.owns_reservation(auth.uid(), reservation_id));

-- Admin may read/manage for support. NOTE: there is deliberately NO client
-- insert/update policy — money state is written only by trusted SECURITY DEFINER
-- RPCs (the reservation state machine), never by a direct client write.
create policy "payments_admin_all"
on public.payments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

commit;
