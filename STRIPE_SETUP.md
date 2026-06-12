# STRIPE_SETUP.md — getting the Stripe side ready

This guide walks you, step by step, through preparing Stripe for VnukPodNaem's
escrow payments. It assumes **no payments knowledge**. Follow it in order; each
step takes a few minutes.

> **Where the app stands today:** the codebase is *scaffolded* for Stripe but
> **nothing charges money yet**. No card is ever asked for, no hold is placed,
> no payout happens. Completing this guide just means that when the live
> integration phase starts, everything on the Stripe side is already in place.

---

## 1. How the money will flow (1-minute version)

VnukPodNaem is a **marketplace**: families pay, caregivers get paid, and the
platform sits in the middle. Stripe's product for exactly this is **Stripe
Connect**. The flow we will build:

1. A family books a caregiver. When the caregiver **approves**, the family's
   payment is **authorized and held** (like a hotel deposit — reserved on the
   card, not yet taken).
2. When the family **marks the visit complete**, the held money is **captured
   and released** to the caregiver (minus any platform fee).
3. If the family **reports an issue**, the money **stays held** until an admin
   decides: release to the caregiver, or refund the family.

Stripe handles the cards, the holding, the payout to the caregiver's bank
account, and the identity/bank verification of caregivers — so the platform
never touches card numbers or holds client money itself.

---

## 2. Create a Stripe account

1. Go to <https://dashboard.stripe.com/register>.
2. Sign up with the company email you want to manage payments with.
3. Choose **Bulgaria** as the country. (Stripe supports Bulgarian businesses;
   the country is fixed after signup, so pick it correctly here.)
4. Verify your email address.

You do **not** need to "activate" the account (fill in full business details)
to start developing — **test mode** works immediately. You will need to
activate before any real payment, so it's worth starting early: activation asks
for business/legal details (sole trader or company, ID, bank account) and can
take a few days to review.

---

## 3. Test mode and where the API keys live

Stripe has two parallel worlds:

- **Test mode** — fake money, fake cards (e.g. card number `4242 4242 4242
  4242`). Everything we build is tried here first. Free, safe, unlimited.
- **Live mode** — real cards, real money. Switched on only at launch.

The toggle between them is a switch in the top-right of the Stripe Dashboard.

**Finding your API keys:**

1. In the Stripe Dashboard, make sure the **Test mode** toggle is ON.
2. Go to **Developers → API keys** (or search "API keys" in the dashboard
   search bar).
3. You'll see two keys:
   - **Publishable key** — starts with `pk_test_…`. Safe to expose in the
     browser; it can only start payments, never move money.
   - **Secret key** — starts with `sk_test_…`. **Treat like a password.** It
     can move money. Click "Reveal" to see it.

These map to the app's environment variables (see section 7). The live-mode
keys (`pk_live_…` / `sk_live_…`) live in the same place with the toggle off —
you'll only need those at launch.

> **Never** paste keys into the code, the repo, a chat, or the Supabase SQL
> editor. They go only into `.env.local` (local) and Vercel's environment
> variables (deployed).

---

## 4. Enable Stripe Connect — and which type to choose

1. In the Dashboard, go to **Connect** in the left menu (or search "Connect").
2. Click **Get started** and follow the prompts to enable Connect for your
   platform. Stripe will ask a few questions about your platform (marketplace,
   you control the user experience, etc.).
3. When asked what kind of connected accounts you want, choose **Express**.

### Express vs Standard — our recommendation: **Express**

| | **Express** (recommended) | Standard |
| --- | --- | --- |
| What the caregiver sees | A short, Stripe-hosted onboarding form (ID + bank details), then nothing — they live inside *our* app | A full Stripe account they must create and manage themselves |
| Who handles the experience | The platform (we control branding, payouts UI) | Stripe Dashboard, self-serve |
| Suited for | Marketplaces paying out many individuals (our caregivers) | Businesses that already have/want their own Stripe account |
| Effort for a non-technical caregiver | Low — a few minutes, guided | High — confusing for individuals |
| Fees | Small per-account fee to the platform | No extra Connect fee |

**Why Express fits VnukPodNaem:** our caregivers are individuals, not
businesses. They should never have to understand Stripe — they fill in a short
Stripe-hosted form once (identity + bank account, which Stripe legally must
collect), and after that payouts just arrive. Express gives exactly that, while
Stripe carries the identity-verification (KYC) burden. Standard would force
every caregiver to run their own Stripe account — unrealistic for this
audience. (The third type, Custom, means building all onboarding UI ourselves —
unnecessary work for no benefit here.)

A practical consequence: with Express we **don't** need the OAuth
`STRIPE_CONNECT_CLIENT_ID` env var — it exists in the list below only in case
the decision ever changes to Standard.

---

## 5. What a webhook is (and why we're not setting it up yet)

A **webhook** is how Stripe *calls us back*. When something happens on Stripe's
side — a hold succeeds, a payout fails, a caregiver finishes onboarding —
Stripe sends a message to a URL of ours so the app can update its records.

Why it matters: without webhooks the app would only know what *it* asked for,
not what actually happened afterwards (e.g. a bank rejecting a payout days
later).

**Nothing to do now.** The webhook endpoint is part of the live integration
phase, because the URL must point at deployed code that exists. During that
phase we will:

1. Add a webhook endpoint in **Developers → Webhooks** pointing at the deployed
   app (e.g. `https://<our-domain>/api/stripe/webhook`).
2. Copy the endpoint's **signing secret** (starts with `whsec_…`) into the
   `STRIPE_WEBHOOK_SECRET` env var — it's how the app verifies messages really
   came from Stripe.

---

## 6. Bulgaria, EUR, and VAT — what to know now

- **Currency:** Bulgaria adopted the **euro on 1 January 2026**, and the app
  already stores all amounts in **EUR** — which Stripe fully supports for both
  charges and payouts to Bulgarian bank accounts. So there is no currency
  conversion problem to solve.
- **BGN display:** if the product wants to *show* prices in both EUR and BGN
  during the transition period (a common courtesy in 2026), that is a
  display-only concern handled in the live phase — money itself stays EUR.
- **VAT / invoicing:** how VAT applies to the platform fee, whether caregivers
  are private individuals or registered self-employed, and what receipts/
  invoices must be issued are **legal/accounting questions, not Stripe
  questions**. They will be addressed in the live phase — ideally with an
  accountant's input before launch. Stripe has a "Stripe Tax" add-on if
  automated tax calculation is ever needed, but don't enable anything now.
- **Payouts:** caregivers will need a bank account (IBAN) that can receive EUR
  — any Bulgarian bank account qualifies after the euro switch.

---

## 7. Environment variables you will add (names only — values never in git)

| Variable | What it is | Where you get it | When |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | Server-only secret key (`sk_test_…`, later `sk_live_…`) | Dashboard → Developers → API keys | Live phase |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser-safe publishable key (`pk_test_…`) | Same page | Live phase |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) | Dashboard → Developers → Webhooks, after the endpoint is created | Live phase |
| `STRIPE_CONNECT_CLIENT_ID` | OAuth client id (`ca_…`) — **only if we ever switch to Standard Connect; not needed for Express** | Connect settings | Probably never |

They go into `.env.local` locally and **Vercel → Project → Settings →
Environment Variables** for deployments. The app already references them
defensively: with none of them set (today's state), everything works and the
payment placeholders just log a console note.

---

## 8. Checklist

- [ ] Stripe account created (country: Bulgaria), email verified
- [ ] Test mode confirmed on; found the `pk_test_…` and `sk_test_…` keys
- [ ] Connect enabled with **Express** accounts
- [ ] (Can wait) Business activation started for live mode
- [ ] (Live phase) Keys added to `.env.local` / Vercel — never to git
- [ ] (Live phase) Webhook endpoint + `STRIPE_WEBHOOK_SECRET`
- [ ] (Live phase, with accountant) VAT/invoicing decisions
