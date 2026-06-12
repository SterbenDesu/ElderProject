// Stripe Connect onboarding contract for caregivers (Phase 11 stub — no live
// calls). Caregivers receive payouts, so each approved caregiver becomes a
// Stripe Connect EXPRESS connected account (recommendation + rationale in
// STRIPE_SETUP.md).

import { logPaymentsStubCall } from "@/lib/payments/env";
import {
  PAYMENT_STUB_RESULT,
  type CaregiverConnectRef,
  type PaymentStubResult,
} from "@/lib/payments/types";

/**
 * Create — or look up — the Stripe Connect account for a caregiver.
 *
 * Called when an admin APPROVES a caregiver application (wired in
 * `changeHelperApplicationStatus`, lib/supabase/adminReview.ts). The live phase
 * will also need a caregiver-dashboard entry point so the caregiver can finish
 * onboarding (Stripe-hosted Express flow) before their first payout.
 *
 * Live phase will (server-side):
 *  1. Read `caregiver_profiles.stripe_account_id` for the caregiver.
 *  2. If absent: create an Express connected account (country BG, EUR) and
 *     store its id in `caregiver_profiles.stripe_account_id` via a trusted
 *     server path (the column is revoked from client reads/writes).
 *  3. Generate a Stripe Account Link (onboarding URL) and return it so the UI
 *     can send the caregiver to Stripe's hosted identity/bank-details flow.
 *
 * SECURITY: `stripe_account_id` is private (column-level revoke + owner/admin
 * RLS). The live implementation must keep all Stripe calls server-side with
 * STRIPE_SECRET_KEY and must never expose another user's account id.
 *
 * Today: safe no-op — logs once and returns `{ ok: true, implemented: false }`.
 */
export async function createOrGetCaregiverConnectAccount(
  caregiver: CaregiverConnectRef,
): Promise<PaymentStubResult> {
  void caregiver;
  logPaymentsStubCall("createOrGetCaregiverConnectAccount");
  return PAYMENT_STUB_RESULT;
}
