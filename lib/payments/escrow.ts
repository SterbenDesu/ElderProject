// Escrow contract for the live Stripe Connect integration (Phase 11).
//
// EVERY function in this file is a documented, SAFE NO-OP STUB: it makes no
// network call, charges nothing, holds nothing, and moves no money. The stubs
// exist so the reservation state machine and UI are already wired to the right
// moments — the live phase only fills in the bodies (behind server-side
// endpoints), it does not have to touch the call sites again.
//
// Escrow model (PRODUCT_SPEC §8 + this phase's product direction):
//   caregiver APPROVES a booking  -> authorizeHold()   — hold the elder's payment
//   elder MARKS COMPLETE          -> capturePayment()  — capture + release to caregiver
//   reject / cancel / admin refund-> refundPayment()   — void the hold or refund
//   admin resolves dispute        -> capturePayment() or refundPayment()
//
// NOTE — escrow timing (open decision, DATABASE_SCHEMA.md §13.5): the database
// state machine currently RECORDS the hold at submit (create_reservation sets
// payments.payment_status = 'authorized_held' on the pending reservation), while
// the live-integration direction is to place the REAL Stripe hold at caregiver
// approval. Phase 11 must reconcile the recorded status with the actual hold
// moment (likely: pending = 'requires_authorization', approve = real hold).
//
// SECURITY (AGENTS.md backend rules): the live implementations must run in
// SERVER code (route handlers / server actions) using STRIPE_SECRET_KEY, must
// re-verify the caller and the reservation state before acting, and must write
// payment state only through the SECURITY DEFINER state-machine RPCs — never a
// direct client UPDATE on `payments`. Never store card numbers, CVCs, or PINs;
// provider references and statuses only.

import { logPaymentsStubCall } from "@/lib/payments/env";
import {
  PAYMENT_STUB_RESULT,
  type PaymentStubResult,
  type ReservationPaymentRef,
} from "@/lib/payments/types";

/**
 * Authorize & HOLD the elder's payment for a reservation (escrow start).
 *
 * Called when the caregiver APPROVES a booking (wired in
 * `transitionReservation`, lib/supabase/reservations.ts).
 *
 * Live phase will (server-side):
 *  1. Load the reservation + payments row; verify status and amounts.
 *  2. Create a Stripe PaymentIntent for `payments.held_amount` with
 *     `capture_method: 'manual'` (authorize without capturing), on behalf of the
 *     caregiver's Connect account, with `payments.platform_fee` as the
 *     application fee.
 *  3. Store `payments.payment_intent_id` + `payments.connected_account_id` and
 *     set `payment_status = 'authorized_held'` via the trusted RPC path.
 *
 * Today: safe no-op — logs once and returns `{ ok: true, implemented: false }`.
 */
export async function authorizeHold(
  reservation: ReservationPaymentRef,
): Promise<PaymentStubResult> {
  void reservation;
  logPaymentsStubCall("authorizeHold");
  return PAYMENT_STUB_RESULT;
}

/**
 * CAPTURE the held payment and RELEASE the funds to the caregiver.
 *
 * Called when the elder MARKS the reservation COMPLETE, or when an admin
 * resolves a dispute as "release" (wired in `transitionReservation` and
 * `resolveDispute`). The database already marks these reservations
 * `payout_status = 'ready_for_release'` — that status is this function's work
 * queue in the live phase.
 *
 * Live phase will (server-side):
 *  1. Verify the reservation is completed / resolved-as-release and the payment
 *     is still 'authorized_held' with payout 'ready_for_release'.
 *  2. Capture the PaymentIntent (`payments.captured_amount`), letting Stripe
 *     transfer the captured amount minus `platform_fee` to the caregiver's
 *     Connect account; store `payments.transfer_id`.
 *  3. Advance `payment_status` -> 'captured'/'released' and
 *     `payout_status` -> 'paid' via the trusted RPC path.
 *
 * Today: safe no-op — logs once and returns `{ ok: true, implemented: false }`.
 */
export async function capturePayment(
  reservation: ReservationPaymentRef,
): Promise<PaymentStubResult> {
  void reservation;
  logPaymentsStubCall("capturePayment");
  return PAYMENT_STUB_RESULT;
}

/**
 * Return the money to the elder: VOID an uncaptured hold, or REFUND.
 *
 * Called when the caregiver REJECTS, the elder CANCELS, or an admin resolves a
 * dispute as "refund" (wired in `transitionReservation` and `resolveDispute`).
 * The database already marks admin-decided refunds
 * `payment_status = 'to_be_refunded'` — that status is this function's work
 * queue in the live phase.
 *
 * Live phase will (server-side):
 *  1. Verify the reservation reached a refundable terminal state.
 *  2. If the PaymentIntent is still uncaptured: cancel it (the hold simply
 *     drops off the elder's card — no refund object needed).
 *     If it was captured: create a Stripe Refund and store
 *     `payments.refund_id` + `payments.refunded_amount`.
 *  3. Advance `payment_status` -> 'void' (reject) or 'refunded' and
 *     `payout_status` -> 'reversed' via the trusted RPC path. Partial refunds
 *     (cancellation-policy fees — open decision #8) plug in here.
 *
 * Today: safe no-op — logs once and returns `{ ok: true, implemented: false }`.
 */
export async function refundPayment(
  reservation: ReservationPaymentRef,
): Promise<PaymentStubResult> {
  void reservation;
  logPaymentsStubCall("refundPayment");
  return PAYMENT_STUB_RESULT;
}
