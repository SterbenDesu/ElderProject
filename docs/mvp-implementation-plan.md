# MVP Implementation Plan

## 1. Product summary

VnukPodNaem is an English-first, non-medical elderly support marketplace for families, caregivers, elderly people, and verified helpers. The product connects clients with helpers for companionship, errands, shopping, walks, check-ins, technology help, and accompaniment. The platform is positioned as a technology marketplace, not a medical provider, licensed care provider, or direct employer. The MVP should prove the core flow: a caregiver can request a safe, clearly scoped non-medical service from a verified helper, completion can be confirmed or disputed, and admin users can review helper verification and safety issues.

## 2. Recommended stack

Use the recommended beginner-friendly production stack from `PROJECT_BRIEF.md`:

- **Next.js App Router** for a modern web app structure, server-rendered pages, route-based organization, and easy Vercel deployment.
- **TypeScript** for safer beginner development, clearer data models, and fewer runtime mistakes as marketplace logic grows.
- **Tailwind CSS** for a calm, accessible, responsive interface without needing a large component library at the start.
- **Supabase Auth and Database** for managed authentication, PostgreSQL storage, role-related data, and row-level security when the database phase begins.
- **Vercel** for simple deployment of the Next.js app with preview deployments.
- **Stripe Connect later** for marketplace-capable payment processing, payout handling, and payment-provider-managed card data.

This stack is suitable because it is common, well-documented, deployable in small steps, and practical for a beginner working with Codex. It also keeps the first deployable version small while leaving a path toward authentication, role-based dashboards, secure database rules, admin workflows, and future marketplace payments.

## 3. MVP phases

Each phase should be implemented as a small Codex task. Do not start a later phase until the current phase is committed, deployed or previewed, and manually checked.

### Phase 1: Project scaffold and static app shell

**Status:** Completed in the first static Next.js scaffold. Visual/mobile polish pass completed for the static shell: stronger homepage structure, responsive navigation, clearer public pages, and more explicit placeholder messaging while keeping authentication, Supabase, Stripe, database, payment, and admin logic inactive.

**Goal:** Create the smallest deployable web app shell without database, authentication, payment logic, or complex state.

**Scope:**

- Scaffold a Next.js App Router app with TypeScript and Tailwind CSS.
- Add a simple global layout with navigation and footer.
- Add static placeholder pages for the core public and dashboard routes.
- Create a trust-focused visual foundation: readable typography, high-contrast buttons, calm colors, large tap targets, and mobile-first spacing.
- Update deployment notes after the scaffold exists.

**Do not include yet:**

- Supabase setup.
- Real authentication.
- Database migrations.
- Stripe or payment code.
- Bulgarian UI.
- Medical service wording.

**Beginner acceptance checks:**

- App runs locally.
- Home page loads on desktop and mobile widths.
- Main navigation links do not lead to missing pages.
- Static safety, terms, privacy, dashboard, helper, and admin placeholders exist.
- Deployment notes explain the current scaffold commands.

### Phase 2: Landing page, legal/safety pages, service category pages

**Goal:** Make the public website useful and safe before adding accounts.

**Scope:**

- Build a clear landing page explaining non-medical support.
- Add service category content for companionship, errands, shopping, walks, check-ins, technology help, and accompaniment.
- Add `/services`, `/safety`, `/allowed-services`, and `/prohibited-services` pages.
- Add `/terms` and `/privacy` with placeholder legal copy warnings that require legal review before launch.
- Use careful language: no guarantee of absolute safety, no medical care, helpers are independent marketplace participants.

**Do not include yet:**

- Legal claims that have not been reviewed.
- Real helper search.
- Real booking forms.
- Payment promises beyond future provider-ready language.

**Beginner acceptance checks:**

- Visitors understand what the platform does and does not do.
- Prohibited activities are easy to find.
- Terms and privacy pages clearly say they are placeholders pending legal review.

### Phase 3: Authentication and role foundation

**Goal:** Add basic account access using Supabase, while keeping role logic simple and secure.

**Scope:**

- Configure Supabase Auth.
- Add `/login` and `/signup` forms.
- Add a `profiles` concept connected to authenticated users.
- Add role values for `client_caregiver`, `helper_applicant`, `verified_helper`, and `admin`.
- Add route protection for dashboard and admin areas.
- Add basic empty/loading/error states.

**Do not include yet:**

- Helper approval automation.
- Payment integration.
- Complex admin permissions.
- Collection of sensitive health data.

**Beginner acceptance checks:**

- A user can sign up and log in.
- A logged-out visitor cannot view protected dashboard pages.
- A normal user cannot access admin routes.
- Role checks are server-side where required.

### Phase 4: Client/caregiver dashboard and elderly profile

**Goal:** Let a client/caregiver manage the minimum information needed to request non-medical help.

**Scope:**

- Build `/dashboard` with a simple overview.
- Build `/dashboard/elderly-profiles` for managed elderly profiles.
- Store only essential non-sensitive profile details.
- Add clear warnings not to enter medical instructions, medication requests, bank card PINs, passwords, or access-to-valuables requests.
- Add empty, loading, and error states.

**Do not include yet:**

- Separate elderly person login.
- Detailed health records.
- Medical needs forms.
- Real-time location or check-in features.

**Beginner acceptance checks:**

- A caregiver can create, edit, and view an elderly profile.
- The UI discourages unnecessary health data.
- Profile records are owned by the caregiver account.

### Phase 5: Helper application flow and helper profile

**Goal:** Let potential helpers apply, while preventing unverified helpers from appearing publicly or accepting bookings.

**Scope:**

- Build `/helper/apply` for helper applications.
- Add helper application statuses: `applicant`, `under_review`, `approved`, `rejected`, `suspended`, `banned`.
- Build helper profile data for approved helpers only.
- Build `/helpers` and `/helpers/[id]` so only verified helper profiles are visible.
- Add admin-review dependency before helper activation.

**Do not include yet:**

- Real ID verification integration.
- Criminal record document storage unless legally reviewed and approved.
- Automatic helper activation.
- Ratings or reviews.

**Beginner acceptance checks:**

- A helper applicant can submit an application.
- Submitted helpers are not publicly listed until admin approval.
- Helper profile pages use non-medical service descriptions only.

### Phase 6: Admin panel foundation

**Goal:** Give admins basic oversight tools before bookings become active.

**Scope:**

- Build `/admin` overview.
- Build `/admin/helpers` for application review and verification status management.
- Build `/admin/bookings` as a placeholder or read-only list until booking creation exists.
- Build `/admin/disputes` as a placeholder or read-only list until complaints exist.
- Add account suspension/ban status fields.
- Add careful admin-only route protection.

**Do not include yet:**

- Complex analytics.
- Payment provider actions.
- Automated payout decisions.

**Beginner acceptance checks:**

- Only admin users can access admin routes.
- Admin can approve, reject, suspend, or ban a helper record.
- Every admin decision is designed to create an audit log in a later phase.

### Phase 7: Booking/request flow without real payment capture

**Goal:** Prove the main marketplace flow without collecting payment.

**Scope:**

- Build `/dashboard/bookings` for clients/caregivers.
- Allow a client/caregiver to request a service from a verified helper or choose a category for manual matching.
- Store booking status values.
- Add payment-provider-ready placeholder fields such as `payment_status`, `payment_provider`, `provider_payment_reference`, `platform_commission_percent`, and `payout_status`.
- Show clear messaging that live payment processing is not active yet.

**Do not include yet:**

- Stripe SDK.
- Card collection.
- Cash payment handling.
- Off-platform payment instructions.
- Real payout release.

**Beginner acceptance checks:**

- A client can create a booking request.
- Unverified helpers cannot be booked.
- Booking status can move through non-payment placeholder states for testing.
- UI clearly says payments are not live.

### Phase 8: Dispute/complaint flow

**Goal:** Let clients report a problem and pause the payout state for admin review.

**Scope:**

- Add complaint creation from a booking.
- Add statuses such as `open`, `under_review`, `resolved_release`, `resolved_refund`, `resolved_partial_refund`, and `closed_no_action` as draft values for legal/payment review.
- When a complaint is opened, set a payment/payout placeholder hold state.
- Add `/admin/disputes` review views.

**Do not include yet:**

- Real refunds.
- Real payment holds.
- Legal promises about dispute outcomes.

**Beginner acceptance checks:**

- Client can submit a complaint for a booking.
- Admin can review complaints.
- Complaint state is visible on the booking.
- Payment/payout placeholder status reflects a hold when disputed.

### Phase 9: Audit logs and terms acceptance logging

**Goal:** Create accountability records for important actions.

**Scope:**

- Add audit logging for terms acceptance, booking status changes, payment/dispute placeholder actions, helper approval decisions, suspensions, and bans.
- Add `terms_acceptances` records with user ID, timestamp, Terms version, and Privacy Policy version.
- Build `/admin/audit-logs` for admin review.
- Keep logs focused and avoid storing unnecessary sensitive details.

**Do not include yet:**

- Advanced analytics.
- Sensitive document retention.
- Unnecessary personal data snapshots.

**Beginner acceptance checks:**

- New users must accept Terms and Privacy versions during sign-up or before using protected features.
- Admin can see important event history.
- Logs do not expose secrets or full payment data.

### Phase 10: Payment-provider-ready architecture

**Goal:** Prepare for Stripe Connect or another marketplace provider without implementing real payments yet.

**Scope:**

- Finalize payment status fields.
- Finalize provider reference fields.
- Finalize commission and payout status fields.
- Add service-layer boundaries or placeholder functions where future payment integration will attach.
- Document what a future Stripe Connect integration must do.

**Do not include yet:**

- Live Stripe keys.
- Stripe SDK calls.
- Webhooks.
- Payment capture.
- Payout release.

**Beginner acceptance checks:**

- Code has a clear place for future provider integration.
- UI still says live payment processing is unavailable.
- No card data is requested or stored.

### Phase 11: Deployment preparation

**Goal:** Prepare the MVP for safe preview or production deployment.

**Scope:**

- Update `docs/deployment-notes.md` with current commands and environment variable names only.
- Configure Vercel project settings after the app exists.
- Configure Supabase project settings after authentication/database exists.
- Confirm build, lint, typecheck, and basic manual route testing.
- Add a deployment verification checklist.

**Do not include yet:**

- Secret values in documentation.
- Payment production credentials.
- Production launch claims before legal review.

**Beginner acceptance checks:**

- Vercel deployment succeeds.
- Environment variable names are documented without secret values.
- Public pages and protected-route behavior are manually checked.

### Phase 12: User testing and bug-fix loop

**Goal:** Improve the MVP through real feedback without expanding scope too early.

**Scope:**

- Test with a small number of caregivers, elderly users where appropriate, helper applicants, and admins.
- Record issues in `docs/known-bugs.md`.
- Fix the highest-severity usability, safety, and access-control issues first.
- Keep each bug fix small and traceable.

**Do not include yet:**

- Large redesigns.
- New feature families such as chat, ratings, recurring bookings, location sharing, or mobile apps.

**Beginner acceptance checks:**

- Testers can explain the product boundaries.
- Testers can complete the intended flow without staff coaching.
- Safety and prohibited-service messaging is understood.
- Known bugs are documented and prioritized.

## 4. First deployable version

The smallest deployable version should be intentionally limited:

- English-only web app.
- Landing page.
- Service categories.
- Allowed/prohibited services page.
- Terms and Privacy pages with placeholder legal copy warnings.
- Basic dashboard placeholders.
- No live payment processing.
- No unreviewed legal claims.
- No medical service functionality.
- No Bulgarian UI yet.

This version should prove that the product can be deployed, navigated, reviewed for safety/legal language, and used as a foundation for later authentication and database work.

## 5. Suggested routes

Start with static placeholders for these routes, then add real functionality phase by phase:

| Route | Purpose | First implementation level |
| --- | --- | --- |
| `/` | Landing page | Static public page |
| `/services` | Service category overview | Static public page |
| `/safety` | Trust and safety explanation | Static public page |
| `/allowed-services` | Clear list of allowed non-medical services | Static public page |
| `/prohibited-services` | Clear list of prohibited requests | Static public page |
| `/terms` | Terms placeholder pending legal review | Static public page |
| `/privacy` | Privacy placeholder pending legal review | Static public page |
| `/login` | Login | Static placeholder first, Supabase later |
| `/signup` | Signup | Static placeholder first, Supabase later |
| `/dashboard` | Client/caregiver dashboard | Protected placeholder later |
| `/dashboard/elderly-profiles` | Managed elderly profiles | Protected CRUD later |
| `/dashboard/bookings` | Client/caregiver bookings | Protected CRUD later |
| `/helper/apply` | Helper application flow | Form later |
| `/helpers` | Verified helper directory | Verified-only list later |
| `/helpers/[id]` | Verified helper detail page | Verified-only detail later |
| `/admin` | Admin overview | Admin-only placeholder later |
| `/admin/helpers` | Helper application review | Admin-only workflow later |
| `/admin/bookings` | Booking oversight | Admin-only list later |
| `/admin/disputes` | Complaint/dispute review | Admin-only workflow later |
| `/admin/audit-logs` | Audit log review | Admin-only list later |

## 6. Data model draft

Do not create migrations yet. These are draft entities and essential fields only.

### `users` / `profiles`

Use Supabase Auth for the actual authenticated user. Keep application profile fields separate.

Essential fields:

- `id`
- `auth_user_id`
- `email`
- `full_name`
- `phone_number`
- `role`
- `account_status`
- `created_at`
- `updated_at`

Draft role values:

- `client_caregiver`
- `helper_applicant`
- `verified_helper`
- `admin`

Draft account status values:

- `active`
- `suspended`
- `banned`

### `elderly_profiles`

Essential fields:

- `id`
- `caregiver_profile_id`
- `display_name`
- `general_location`
- `mobility_notes`
- `communication_preferences`
- `emergency_contact_name`
- `emergency_contact_phone`
- `created_at`
- `updated_at`

Safety note: avoid collecting diagnosis, medication management needs, or detailed medical history in MVP.

### `helper_applications`

Essential fields:

- `id`
- `profile_id`
- `status`
- `service_categories_requested`
- `experience_summary`
- `availability_summary`
- `general_location`
- `admin_notes`
- `reviewed_by_admin_id`
- `reviewed_at`
- `created_at`
- `updated_at`

Draft status values:

- `applicant`
- `under_review`
- `approved`
- `rejected`
- `suspended`
- `banned`

### `helper_profiles`

Essential fields:

- `id`
- `profile_id`
- `verification_status`
- `display_name`
- `bio`
- `service_categories`
- `general_location`
- `hourly_rate_placeholder`
- `is_public`
- `created_at`
- `updated_at`

Draft verification status values:

- `applicant`
- `verified_basic`
- `trusted`
- `suspended`
- `banned`

### `service_categories`

Essential fields:

- `id`
- `name`
- `slug`
- `short_description`
- `allowed_examples`
- `prohibited_examples`
- `is_active`
- `sort_order`
- `created_at`
- `updated_at`

Initial categories:

- Companionship.
- Errands.
- Shopping.
- Walks.
- Check-ins.
- Technology help.
- Accompaniment.

### `bookings`

Essential fields:

- `id`
- `client_profile_id`
- `elderly_profile_id`
- `helper_profile_id`
- `service_category_id`
- `requested_start_at`
- `requested_duration_minutes`
- `general_location`
- `non_medical_request_details`
- `status`
- `payment_status`
- `payout_status`
- `platform_commission_percent`
- `provider_payment_reference`
- `confirmation_window_ends_at`
- `created_at`
- `updated_at`

Safety note: reject or flag booking requests that include medication management, injections, wound care, clinical tasks, bank card PINs, passwords, cash handling, or access-to-valuables requests.

### `complaints`

Essential fields:

- `id`
- `booking_id`
- `submitted_by_profile_id`
- `status`
- `category`
- `summary`
- `admin_notes`
- `resolved_by_admin_id`
- `resolved_at`
- `created_at`
- `updated_at`

Draft status values:

- `open`
- `under_review`
- `resolved_release`
- `resolved_refund`
- `resolved_partial_refund`
- `closed_no_action`

### `payment_records`

Essential fields:

- `id`
- `booking_id`
- `provider_name`
- `provider_payment_reference`
- `amount_total`
- `currency`
- `platform_commission_amount`
- `payment_status`
- `payout_status`
- `dispute_hold_status`
- `created_at`
- `updated_at`

Safety note: never store full card numbers, card security codes, bank card PINs, or payment provider secrets.

### `audit_logs`

Essential fields:

- `id`
- `actor_profile_id`
- `target_type`
- `target_id`
- `action`
- `metadata_summary`
- `created_at`

Keep audit metadata minimal and avoid secrets or unnecessary personal data.

### `terms_acceptances`

Essential fields:

- `id`
- `profile_id`
- `terms_version`
- `privacy_version`
- `accepted_at`
- `ip_address`
- `user_agent`

Privacy note: confirm retention and legal requirements before storing IP address and user agent in production.

## 7. Role and permission model

### Visitor

Can:

- View public pages.
- View service categories.
- View safety, allowed services, prohibited services, terms, and privacy pages.
- Start signup or login.

Cannot:

- Create bookings.
- View dashboards.
- View admin pages.
- View private helper, client, or elderly profile data.

### Client/caregiver

Can:

- Manage their own account profile.
- Create and manage elderly profiles they own.
- View verified public helper profiles.
- Create booking requests for allowed non-medical services.
- View their own bookings.
- Confirm completion or submit a complaint for their own bookings.
- Accept current Terms and Privacy versions.

Cannot:

- Access other clients' data.
- Approve helpers.
- Change payment or payout status directly.
- Request medical, clinical, cash-handling, or off-platform services.

### Helper applicant

Can:

- Submit and update their helper application if allowed by status.
- View their own application status.
- View general public pages.

Cannot:

- Appear in public helper search before approval.
- Accept bookings before verification.
- Access client, elderly profile, booking, complaint, payment, or admin data outside their own records.

### Verified helper

Can:

- Maintain their approved helper profile.
- Appear in helper listings if public and active.
- View booking requests assigned to them.
- Accept or decline eligible booking requests.
- Mark a service as completed.
- View their own payout placeholder statuses.

Cannot:

- Change client confirmation status.
- Release payments or payouts.
- View unrelated client data.
- Provide prohibited or medical services through the platform.

### Admin

Can:

- Review helper applications.
- Approve, reject, suspend, or ban helper accounts.
- View user, booking, complaint, payment placeholder, and audit log records needed for support.
- Change booking and dispute statuses according to internal policy.
- Apply account safety actions.
- Review Terms and Privacy acceptance logs.

Cannot:

- View or store full card data.
- Bypass legal/payment provider requirements.
- Use the app to manually hold funds outside a regulated payment provider.
- Store criminal record documents unless legally reviewed and approved.

## 8. Booking status model

Use these booking statuses for the MVP flow:

1. **Requested**: Client/caregiver created a booking request.
2. **Accepted**: Verified helper accepted the request.
3. **Paid / Payment secured**: Future payment provider confirms payment is secured. In early MVP, this is a placeholder only.
4. **In progress**: Service is currently happening or has started.
5. **Completed by helper**: Helper marked the service as completed.
6. **Pending client confirmation**: Client can confirm completion or submit a complaint within the default 24-hour window.
7. **Completed / Released**: Client confirmed, or the confirmation window expired without complaint, and future payout release is allowed by provider rules.
8. **Disputed**: Client submitted a complaint and payout should be held pending admin review.
9. **Cancelled**: Booking was cancelled before completion.
10. **No-show**: One party did not attend, requiring admin review or policy handling.

Beginner implementation advice: represent these statuses visibly in the dashboard before automating transitions. Add automatic transitions only after manual status changes are stable and tested.

## 9. Payment architecture

Do not implement real payments yet. The MVP should prepare for future marketplace payments while avoiding payment handling risk.

Future architecture requirements:

- Use an external marketplace-capable payment provider, preferably Stripe Connect unless another provider is selected after review.
- Store no full card data in the app database.
- Do not request card PINs, passwords, or sensitive banking credentials.
- Do not support cash payments.
- Do not support off-platform payments.
- Store a platform commission field on bookings/payment records.
- Store a payment status field.
- Store a payout status field.
- Store a dispute hold state.
- Store provider reference IDs only, not raw payment credentials.
- Keep payment state changes auditable.

Draft payment statuses:

- `not_started`
- `provider_pending`
- `secured`
- `failed`
- `cancelled`
- `refunded`
- `partially_refunded`

Draft payout statuses:

- `not_applicable`
- `pending_completion`
- `hold_for_confirmation`
- `hold_for_dispute`
- `ready_for_release`
- `released`
- `cancelled`

## 10. Safety and legal boundaries

Hard product boundaries:

- VnukPodNaem is for non-medical support only.
- No medication management.
- No injections.
- No wound care.
- No clinical tasks.
- No guarantee of absolute safety.
- Helpers are independent marketplace participants, not employees of the platform.
- Criminal record documents should not be stored unless legally reviewed and approved.
- Avoid unnecessary health data.
- Do not collect or process full card data.
- Do not allow cash or off-platform payments.
- Do not allow anyone to become an active helper without admin approval.
- Do not show unverified helpers in public search.
- Do not build night-visit functionality in MVP.

Practical copy guidance:

- Use “non-medical support,” “companionship,” and “everyday assistance.”
- Avoid “care provider,” “medical care,” “nursing,” “treatment,” or “guaranteed safety.”
- Add visible warnings near booking forms that prohibited requests cannot be accepted.
- Keep Terms and Privacy copy clearly marked as placeholder until reviewed by a qualified professional.

## 11. Localization plan

- Build the MVP in English first.
- Add Bulgarian later after the English MVP foundation is stable.
- Prepare the code structure later for translation files only when localization is explicitly requested.
- Do not implement full localization until requested.
- Avoid hardcoding assumptions that would make later localization difficult, but do not add translation libraries in the first scaffold unless a future task asks for them.

## 12. Deployment plan

Recommended deployment approach:

- Use **Vercel** for the Next.js web app.
- Use **Supabase** for authentication and database when those phases begin.
- Use environment variables for Supabase and future payment provider configuration.
- Document environment variable names only; never document secret values.
- Fill in exact deployment configuration after the scaffold exists.

Future deployment notes should include:

- Required services: Vercel and Supabase; Stripe Connect or another marketplace payment provider later.
- Required environment variables by name only.
- Build command after scaffold exists.
- Start command after scaffold exists.
- Database setup steps after Supabase schema exists.
- Migration steps after migrations exist.
- Verification steps for public routes, protected routes, admin access, and safety pages.

Current state: deployment configuration should remain documentation-only until the app scaffold exists.

## 13. Risks

Highest risks to manage throughout the MVP:

1. **Legal/regulatory positioning:** The product must not accidentally become or appear to be medical care, licensed social care, employment, or a safety guarantee.
2. **Payment provider requirements:** Marketplace payments, holds, delayed payouts, refunds, and disputes must follow the provider's rules and local law.
3. **Marketplace payout flows:** Payout release, refund, partial refund, and dispute-hold behavior can be complex and should not be custom-built outside a regulated provider.
4. **User safety:** Elderly users and families are vulnerable; service boundaries, complaint flows, and admin escalation must be clear.
5. **Helper verification:** The platform needs careful review of what verification checks are legal and appropriate in the launch geography.
6. **Admin moderation:** Admins need enough visibility to act, but not so much sensitive data that privacy risk increases unnecessarily.
7. **Database security rules:** Supabase row-level security and role checks must be carefully tested before any real user data is stored.
8. **Scope creep:** Chat, ratings, recurring bookings, location sharing, mobile apps, Bulgarian UI, and real payments should wait until the English web MVP foundation is validated.

## 14. Next Codex task

Recommended next task:

**Scaffold the Next.js TypeScript Tailwind app shell with static routes, trust-focused design foundation, and updated deployment notes.**

Suggested constraints for that task:

- Modify only scaffold and documentation files needed for the static app shell.
- Do not add Supabase yet.
- Do not add Stripe yet.
- Do not create database migrations yet.
- Do not implement real authentication yet.
- Do not implement Bulgarian UI yet.
- Keep pages static, readable, responsive, and deployable.
