# PROJECT_BRIEF.md

## App name

VnukPodNaem

## Initial language

English first.

## Later language requirement

Bulgarian language support should be planned for a later phase after the English MVP foundation exists. The first scaffold should prepare for future localization only if explicitly requested later, but it should not build the Bulgarian UI in the initial MVP.

## One-sentence description

VnukPodNaem is a non-medical elderly support marketplace connecting elderly people and family caregivers with verified helpers for companionship, errands, shopping, walks, check-ins, technology help, and accompaniment.

## Target users

1. Elderly people who need non-medical support or companionship.
2. Family members or caregivers who book help on behalf of an elderly person.
3. Helpers or companions who apply to provide non-medical services.
4. Admin/support team members who verify helpers, review complaints, manage disputes, and monitor safety.

## Problem

Families often need flexible, trustworthy, non-medical help for elderly relatives. Current options can be informal, hard to verify, agency-based, or limited. VnukPodNaem helps families find verified helpers with clearer booking, payment, safety, and dispute processes.

## Platform positioning

VnukPodNaem is a technology/intermediary marketplace. It does not provide medical care, licensed social care, or direct employment. It provides user profiles, verification flows, booking tools, secure payment handling through an external payment provider, service confirmation, complaint/dispute handling, and admin moderation.

The platform should not imply that it guarantees absolute safety. Helpers should not be positioned as employees of the platform.

## MVP goal

Build the smallest deployable English-first responsive web app that proves the core marketplace flow: a client or caregiver can book a verified helper for a specific non-medical service, payment can be represented through payment-provider-ready statuses, and completion or dispute can be handled through clear admin-reviewed workflows.

## Main user action

A client or caregiver books a verified helper for a specific non-medical service.

## Core user flow

1. Client/caregiver creates an account.
2. Client/caregiver searches for or requests a service.
3. Client/caregiver selects or requests a verified helper.
4. Client/caregiver pays through the platform using an external payment provider.
5. Helper performs the service.
6. Helper marks the service as completed.
7. Client confirms completion or reports a problem.
8. Payment is released automatically if no complaint is submitted within the confirmation/dispute window.

## MVP account roles

### Client/caregiver

A person who books non-medical support for themselves or on behalf of an elderly person.

### Helper/companion

A person who applies to provide non-medical services. Helpers must be approved by an admin before they can appear in search or accept bookings.

### Admin

A platform/support team role responsible for helper verification, user and booking oversight, complaint/dispute review, account safety actions, payment/dispute status updates, and audit review.

## Elderly person profile

For the MVP, the elderly person can be represented as a profile managed by the client/caregiver. The elderly person does not need a separate login in the initial MVP.

## MVP features

1. English-first responsive web app.
2. User registration and login.
3. Role-based accounts: client/caregiver, helper, and admin.
4. Managed elderly profile connected to a caregiver account.
5. Helper application flow.
6. Helper verification statuses:
   - Applicant
   - Verified Basic
   - Trusted
   - Suspended
   - Banned
7. Helper profile pages.
8. Service categories.
9. Allowed services and prohibited activities pages.
10. Booking/request flow.
11. Booking statuses:
    - Requested
    - Accepted
    - Paid / Payment secured
    - In progress
    - Completed by helper
    - Pending client confirmation
    - Completed / Released
    - Disputed
    - Cancelled
    - No-show
12. Payment-provider-ready architecture.
13. Platform commission/take-rate field.
14. Client confirmation or complaint after service.
15. Complaint/dispute flow.
16. Admin panel for:
    - Reviewing helper applications.
    - Approving/rejecting helpers.
    - Viewing users.
    - Viewing bookings.
    - Viewing complaints/disputes.
    - Changing booking/payment status.
    - Suspending/banning accounts.
17. Audit logs for important actions:
    - Accepted terms.
    - Booking status changes.
    - Payment/dispute actions.
    - Admin decisions.
18. Terms acceptance logging:
    - User ID.
    - Timestamp.
    - Accepted Terms version.
    - Accepted Privacy Policy version.
19. Terms page.
20. Privacy Policy page.
21. Basic email notification architecture.
22. Basic security expectations:
    - No plain-text passwords.
    - Role-based access.
    - Secure database rules.
    - No full card data stored by the app.

## Payment requirements

Payments are central to the business model, but the first code scaffold should only include payment-provider-ready placeholders and status fields unless real Stripe integration is explicitly requested later.

1. Client pays before the service.
2. Payment must be processed by a regulated external payment provider.
3. The app must not manually hold user funds in its own bank account.
4. Payment should be held/secured until service completion when supported by the payment provider.
5. Helper marks service as completed.
6. Client has a confirmation/dispute window. MVP default: 24 hours.
7. If no complaint is submitted, payment is released to the helper.
8. If a complaint is submitted, payout is paused until admin review.
9. Platform takes a percentage commission.
10. Off-platform payments are prohibited.
11. The app must not store full card data.

## Preferred payment provider

Stripe Connect, or another marketplace-capable payment service provider. For the initial code scaffold, payment logic should be represented as provider-ready placeholders and status fields unless real Stripe integration is explicitly requested later.

## Admin panel requirements

1. User management.
2. Helper application review.
3. Helper verification status management.
4. Booking overview.
5. Payment/dispute status overview.
6. Complaint/dispute review.
7. Manual payout hold/release/refund decision support.
8. Account suspension/ban controls.
9. Audit logs.
10. Terms/privacy acceptance logs.

## Design direction

1. Trustworthy.
2. Calm.
3. Clean.
4. Accessible.
5. Warm but professional.
6. Not overly medical or hospital-like.
7. Clear UX for older users and family caregivers.
8. Large readable typography.
9. High-contrast buttons.
10. Mobile-first responsive design.
11. Trust-focused UI: verification badges, safety explanations, transparent pricing.
12. Avoid clutter.
13. Avoid flashy startup visuals.
14. Product should feel safe, human, and reliable.

## Non-goals for MVP

These should not be built until the English web MVP foundation is working and a later task explicitly requests them:

1. Mobile apps.
2. In-app chat.
3. Real-time check-in/check-out.
4. Location sharing.
5. Ratings/reviews.
6. Recurring bookings/subscriptions.
7. Referral program.
8. Insurance/protection add-on.
9. ID verification/liveness integration.
10. Helper training/test module.
11. Partner marketplace.
12. Push notifications.
13. Advanced analytics.
14. Marketing blog.
15. Multi-city expansion logic.
16. Bulgarian UI in the first scaffold; prepare architecture for later localization only if explicitly requested.
17. Real payment integration or payment code before explicitly requested.
18. Database implementation before explicitly requested.

## Hard prohibitions

1. Do not build medical service functionality.
2. Do not allow medication management.
3. Do not allow injections.
4. Do not allow wound care.
5. Do not allow clinical tasks.
6. Do not build cash payment handling.
7. Do not allow off-platform payments.
8. Do not store full card details.
9. Do not store plain-text passwords.
10. Do not allow anyone to instantly become an active helper without admin approval.
11. Do not allow unverified helpers to appear in search or accept bookings.
12. Do not build night-visit functionality in MVP.
13. Do not imply the platform guarantees absolute safety.
14. Do not position helpers as employees of the platform.
15. Do not store copies of criminal record certificates unless legally reviewed and approved.
16. Do not collect unnecessary medical/health data in MVP.
17. Do not allow users to enter bank card PINs, passwords, cash-handling requests, or access-to-valuables requests.
18. Do not build mobile apps before the web MVP is validated.

## Recommended beginner stack

Because the repository is currently empty, the recommended simple production-grade web stack for the MVP is:

- Next.js with App Router.
- TypeScript.
- Tailwind CSS.
- Supabase for authentication and database.
- Vercel for deployment.
- Stripe Connect later for marketplace payments.

Do not scaffold this stack yet. Only document it as the recommended stack unless a future task explicitly asks for scaffolding.

## Later features

These can be considered after the MVP validates the core English web marketplace flow:

1. Bulgarian language option.
2. In-app chat.
3. Real-time check-in/check-out.
4. Location sharing.
5. Ratings/reviews.
6. Recurring bookings/subscriptions.
7. Referral program.
8. Insurance/protection add-on.
9. ID verification/liveness integration, after legal and provider review.
10. Helper training/test module.
11. Partner marketplace.
12. Push notifications.
13. Advanced analytics.
14. Marketing blog.
15. Multi-city expansion logic.
16. Native mobile apps after the web MVP is validated.

## Open questions

1. What launch geography should the English MVP target first?
2. Which exact external payment provider and marketplace payout model should be used when real payment integration is requested?
3. What are the exact allowed service categories and prohibited activity examples for launch?
4. What helper verification checks are legally appropriate for the launch geography?
5. What Terms version and Privacy Policy version naming scheme should be used?
6. What email provider should be used for transactional notifications?
7. What admin dispute outcomes should be supported at launch, such as release, refund, partial refund, or continued hold?

## Summary

1. File changed: `PROJECT_BRIEF.md`.
2. Major product decisions captured: VnukPodNaem is an English-first non-medical elderly support marketplace; helpers are verified marketplace participants, not employees; payment handling must use an external marketplace-capable provider; MVP includes role-based accounts, managed elderly profiles, helper verification, booking statuses, payment/dispute statuses, admin moderation, audit logs, and terms/privacy acceptance logging.
3. Remaining open questions: launch geography, payment provider details, service category definitions, legally appropriate helper verification checks, policy versioning, email provider, and exact dispute outcome options.
