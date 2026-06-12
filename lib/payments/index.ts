// lib/payments — Stripe Connect escrow scaffolding (Phase 11 prerequisites).
//
// Everything exported here is a documented, safe no-op stub: no Stripe calls,
// no charges, no holds, no transfers, no refunds. The module defines the
// contract the reservation state machine and UI call so the live integration
// only fills in the bodies. See STRIPE_SETUP.md for the Stripe-side setup.

export {
  authorizeHold,
  capturePayment,
  refundPayment,
} from "@/lib/payments/escrow";
export { createOrGetCaregiverConnectAccount } from "@/lib/payments/connect";
export {
  getStripeEnvStatus,
  STRIPE_ENV_VARS,
  type StripeEnvStatus,
  type StripeEnvVar,
} from "@/lib/payments/env";
export type {
  CaregiverConnectRef,
  PaymentStubResult,
  ReservationPaymentRef,
} from "@/lib/payments/types";
