-- Phase 11 prep — Stripe Connect escrow scaffolding (DB part). NO money moves.
--
-- The payments model from earlier phases already carries almost everything the
-- live Stripe Connect escrow integration needs:
--   payments.payment_intent_id     (Stripe PaymentIntent ref — the hold)
--   payments.connected_account_id  (caregiver's Connect account the funds go to)
--   payments.transfer_id           (transfer/payout ref on release)
--   payments.held_amount           (authorized/held, minor units)
--   payments.captured_amount       (captured on completion, minor units)
--   payments.platform_fee          (commission, minor units)
--   payments.payment_status / payout_status (escrow state machine)
--   caregiver_profiles.stripe_account_id    (Connect account, column-revoked)
--
-- This migration adds the few missing references so Phase 11 needs no further
-- re-modelling:
--   1. payments.refund_id / payments.refunded_amount — the Stripe Refund
--      reference + amount when the elder is refunded (cancel, or a dispute
--      resolved as refund). Until now refunds were a status with no provider ref.
--   2. profiles.stripe_customer_id — the booker's Stripe Customer reference so
--      the live phase can save/reuse payment methods. PRIVATE: profiles has no
--      public/cross-user select policy, so RLS already keeps it owner+admin only.
--
-- Additive only (ADD COLUMN IF NOT EXISTS): no data is removed or changed, no
-- policy is weakened, and nothing here calls Stripe or moves money.

begin;

-- 1. Refund references on the escrow record.
alter table public.payments
  add column if not exists refund_id       text,
  add column if not exists refunded_amount int;

alter table public.payments drop constraint if exists payments_refunded_amount_check;
alter table public.payments
  add constraint payments_refunded_amount_check
  check (refunded_amount is null or refunded_amount >= 0);

-- 2. The booker's Stripe Customer reference (saved payment methods, Phase 11).
alter table public.profiles
  add column if not exists stripe_customer_id text;

-- Document the escrow columns so the payment-readiness contract is in the DB.
comment on column public.payments.payment_intent_id    is 'Stripe PaymentIntent reference for the escrow hold. Reference only — never card data.';
comment on column public.payments.connected_account_id is 'The caregiver''s Stripe Connect account the funds release to (copied from caregiver_profiles.stripe_account_id at authorization time).';
comment on column public.payments.transfer_id          is 'Stripe Transfer/Payout reference written when funds are released to the caregiver.';
comment on column public.payments.refund_id            is 'Stripe Refund reference written when the elder is refunded (cancel, or dispute resolved as refund).';
comment on column public.payments.refunded_amount      is 'Amount actually refunded to the elder, in minor units. Null until a refund happens.';
comment on column public.payments.held_amount          is 'Authorized/held escrow amount in minor units.';
comment on column public.payments.captured_amount      is 'Amount captured on completion, in minor units. Null until capture.';
comment on column public.payments.platform_fee         is 'Platform commission in minor units (the application fee on the Stripe charge, if any).';
comment on column public.profiles.stripe_customer_id   is 'PRIVATE. The account''s Stripe Customer reference for saved payment methods. profiles RLS (owner+admin select only) keeps it private; never expose on public surfaces.';

commit;
