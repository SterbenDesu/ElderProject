-- =============================================================================
-- SUPABASE_FIX_PAYMENTS.sql
-- Phase 11 prep — Stripe Connect escrow scaffolding (runnable patch).
--
-- Apply this in the Supabase SQL Editor if the migration
-- (supabase/migrations/20260612130000_payments_stripe_scaffold.sql) has not yet
-- been applied to your database. It is IDEMPOTENT — safe to run more than once.
--
-- It is ADDITIVE ONLY: two refund-reference columns on `payments`, one private
-- Stripe Customer column on `profiles`, and documentation comments. It removes
-- nothing, changes no existing data, weakens no RLS policy, and — like every
-- payments change so far — calls no Stripe API and moves no money.
--
-- This file is intentionally identical to the migration body, plus VERIFY
-- queries at the end.
-- =============================================================================

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
--    PRIVATE: profiles has no public/cross-user select policy, so RLS already
--    keeps this column owner+admin only.
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

-- =============================================================================
-- VERIFY — both queries should return the listed columns.
-- =============================================================================

-- Expect: refund_id (text), refunded_amount (integer)
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'payments'
  and column_name in ('refund_id', 'refunded_amount')
order by column_name;

-- Expect: stripe_customer_id (text)
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name = 'stripe_customer_id';
