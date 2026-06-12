// Stripe environment configuration — Phase 11 prerequisites. NO live Stripe
// calls exist anywhere in the app yet. This module only names the env vars the
// live integration will need and reads them defensively, so their absence (the
// normal state today) never crashes the app.
//
// Env vars the live phase will need (names only — never commit values):
//
//   STRIPE_SECRET_KEY                  — server-only API secret (sk_test_… first,
//                                        sk_live_… at launch).
//   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — browser-safe publishable key (pk_test_…).
//   STRIPE_WEBHOOK_SECRET              — server-only webhook signing secret
//                                        (whsec_…), created when the webhook
//                                        endpoint is configured in the live phase.
//   STRIPE_CONNECT_CLIENT_ID           — OAuth client id (ca_…). Only needed if
//                                        we choose Standard/OAuth onboarding;
//                                        Express onboarding (recommended, see
//                                        STRIPE_SETUP.md) does not use it.
//
// SECURITY: only the publishable key may carry the NEXT_PUBLIC_ prefix. The
// secret key and webhook secret must be read exclusively in server code (route
// handlers / server actions) in the live phase — the same rule as the Supabase
// service-role key, which never reaches the browser.

export const STRIPE_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_CONNECT_CLIENT_ID",
] as const;

export type StripeEnvVar = (typeof STRIPE_ENV_VARS)[number];

// STRIPE_CONNECT_CLIENT_ID is optional (Express onboarding does not need it),
// so it never counts towards "configured".
const REQUIRED_STRIPE_ENV_VARS: readonly StripeEnvVar[] = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

export type StripeEnvStatus = {
  /** True once every required var is present in this runtime. */
  configured: boolean;
  present: StripeEnvVar[];
  missing: StripeEnvVar[];
};

// Reads each var defensively. NOTE: Next.js inlines env reads at build time, so
// each var must be referenced literally (process.env[name] would always be
// undefined in the browser bundle). Server-only vars always read as missing in
// the browser — expected and safe: the browser never needs them.
export function getStripeEnvStatus(): StripeEnvStatus {
  const values: Record<StripeEnvVar, string | undefined> = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_CONNECT_CLIENT_ID: process.env.STRIPE_CONNECT_CLIENT_ID,
  };

  const present = STRIPE_ENV_VARS.filter((name) => Boolean(values[name]));
  const missing = STRIPE_ENV_VARS.filter((name) => !values[name]);
  const configured = REQUIRED_STRIPE_ENV_VARS.every((name) =>
    Boolean(values[name]),
  );

  return { configured, present, missing };
}

const loggedStubs = new Set<string>();

// Developer-console note emitted by every payment stub. Logged once per stub
// name to keep the console quiet; warns louder if someone has already set the
// Stripe keys, because the keys alone do nothing until the live phase ships.
export function logPaymentsStubCall(stubName: string): void {
  if (loggedStubs.has(stubName)) {
    return;
  }
  loggedStubs.add(stubName);

  const status = getStripeEnvStatus();
  if (status.configured) {
    console.warn(
      `[payments] ${stubName}: Stripe env vars are set, but the live Stripe integration is not implemented yet (Phase 11). This call is a safe no-op — no charge, hold, transfer, or refund was made.`,
    );
  } else {
    console.info(
      `[payments] ${stubName}: placeholder only — Stripe is not integrated yet (Phase 11). No money moves. Missing env vars: ${status.missing.join(", ")}.`,
    );
  }
}
