// Shared types for the payments module (Phase 11 scaffolding — stubs only).

// Minimal reservation reference the escrow functions need. The live phase will
// load the reservation + payments row server-side from this id and re-verify
// the caller, exactly like the SECURITY DEFINER state-machine RPCs do — the
// client is never trusted with amounts.
export type ReservationPaymentRef = {
  reservationId: string;
};

// Minimal caregiver reference for Connect-account onboarding.
export type CaregiverConnectRef = {
  caregiverProfileId: string;
};

// What every stub returns today. `implemented: false` makes it impossible for
// calling code to mistake a stub result for a real Stripe outcome.
export type PaymentStubResult = {
  ok: true;
  implemented: false;
};

export const PAYMENT_STUB_RESULT: PaymentStubResult = {
  ok: true,
  implemented: false,
};
