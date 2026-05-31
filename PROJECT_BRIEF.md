# PROJECT_BRIEF.md

## App name

VnukPodNaem

## Initial language

English first.

## Later language requirement

Bulgarian language support should be planned for a later phase after the English MVP foundation exists. The first scaffold should prepare for future localization only if explicitly requested later, but it should not build the Bulgarian UI in the initial MVP.

## One-sentence description

VnukPodNaem is an elderly everyday-support marketplace that helps people book trusted caregivers/helpers for visits, errands, shopping, companionship, home tasks, technology help, and accompaniment.

## Current product direction

The product has shifted to a universal user profile model. Everyone registers as a normal user first. Signup must not ask people to choose whether they are a client, caregiver, helper, or applicant. A user can later apply to become a caregiver from account/profile surfaces, and admin approval is required before caregiver-specific functionality becomes available.

Public copy should focus on services offered, booking, trust, and ease of use. Safety and legal boundaries must remain accurate and visible in the right places, but they should not dominate every page or make the site feel defensive.

## Target users

1. People who need everyday support, companionship, or help with practical tasks.
2. Family members or caregivers who book help on behalf of an elderly person.
3. Users who later apply to become approved caregivers/helpers.
4. Admin/support team members who review caregiver applications, monitor safety, and manage sensitive platform decisions.

## Problem

Families often need flexible, trustworthy help for elderly relatives. Current options can be informal, hard to verify, agency-based, or limited. VnukPodNaem should make it easier to find reviewed caregivers, choose a service type, request a date/location, and understand the next step.

## Platform positioning

VnukPodNaem is a technology/intermediary marketplace. It provides user profiles, caregiver application and approval flows, booking/request tools, safety guidance, terms/privacy acceptance, and admin moderation. The platform should not imply that it guarantees absolute safety, and caregivers/helpers should not be positioned as employees of the platform.

Safety/legal limits still apply. The product should keep restricted-service language in dedicated safety, terms, caregiver application, and booking confirmation areas rather than repeating alarming language in every visible section.

## MVP goal

Build the smallest deployable English-first responsive web app that proves the core marketplace direction: a standard user can create an account, browse approved caregivers, request everyday support, and later apply to become a caregiver through an admin-reviewed application flow.

## Main user action

A standard user finds or requests a trusted caregiver for a specific everyday support service.

## Core user flow

1. A visitor creates a standard account without selecting a role.
2. The user can browse caregivers or start a booking/request flow.
3. The user chooses a city/location, date or date range, and service type.
4. The user selects or requests an approved caregiver.
5. For now, reserve/request actions should explain that payment/reservation finalization is not active yet.
6. If the user wants to offer services, they apply later through “Become a caregiver.”
7. Admin reviews caregiver applications and approves eligible users.
8. Approved caregivers receive caregiver-specific profile options in later phases.

## Universal account model

Everyone signs up as a normal user first. Signup should not include account type or role selection.

Planned signup fields:

- First name.
- Last name.
- Phone number.
- Gender.
- Email.
- Password.
- Repeat password.
- Acceptance of Terms, Privacy Policy, and required platform policies.

Internal role data may still exist for authorization, but it should not be exposed as a signup choice. New users should be treated as standard users/client-capable users by default.

## Become caregiver flow

Users can apply to become a caregiver from:

- Profile avatar menu.
- Profile page.
- Profile banner.
- Relevant public call-to-action sections.

The caregiver application form should later include:

- Experience.
- Certifications/training.
- Familiarity with terms and service boundaries.
- Availability/service preferences.
- File attachment placeholder for documents such as a criminal record statement, subject to legal review.

Application submission should show a success screen with this message:

> We will get back to you within 48–72 hours.

Application data is visible only to admins. Admin approval unlocks caregiver options.

## Caregiver profile after approval

Approved caregivers should later manage:

- Bio.
- Profile photo.
- Cover photo.
- City.
- Service radius.
- Offered service types from fixed options.
- Availability/schedule.
- Current reservations/duties.
- Previous ratings/reviews later.
- Ongoing jobs later.

Unapproved or hidden caregivers must not appear publicly.

## Homepage direction

The homepage should move toward a direct booking/search module inspired by marketplace flows.

Search inputs should include:

- City/location.
- Date or date range.
- Service type.

Example service types:

- Stay at home.
- Quick visit.
- Shopping.
- House work.
- Accompaniment.

Primary button options:

- Find caregiver.
- Browse caregivers.

Preferred homepage tone examples:

- “Book trusted everyday support.”
- “Find help for visits, errands, shopping, companionship, and home tasks.”
- “Choose a date, city, and service type.”

## Public marketplace direction

The helpers/caregivers listing should become a marketplace with filters:

- City.
- Radius in km.
- Date/date range.
- Service type.
- Visible approved caregivers only.

The public listing should not expose helper application data, unapproved caregivers, hidden caregivers, private owner IDs, or public email addresses.

## Helper detail direction

Helper detail pages should become public caregiver profile pages with:

- Public caregiver bio.
- Photos later.
- Cover photo later.
- Service types.
- City/radius.
- Availability preview later.
- Reserve/request button.
- No public email exposure.
- No hidden/unapproved caregiver exposure.

## Request/reservation direction

For now, clicking reserve/request should show a clear message that payment/reservation finalization is not active yet.

Later, the user will be directed to a payment/reservation flow. Stripe may be integrated later only after explicit product confirmation and a dedicated implementation task. Do not implement payment now.

## Dashboard/profile direction

The dashboard should evolve toward “My profile” for all users.

It should include:

- Avatar/initials.
- Profile info.
- Bio.
- Buttons for:
  - Browse caregivers.
  - Become a caregiver.
- A side menu inspired by clean marketplace account navigation.
- Admin link hidden unless the signed-in user has an admin role.

Prefer profile/avatar menus for account actions after login. Keep top navigation simple and user-facing.

## Role interpretation

Roles are internal authorization states, not signup choices.

- Default new user role: `client` or equivalent normal-user role.
- Caregiver applicant role/state: assigned only after the user submits a caregiver application.
- Verified caregiver role/state: assigned only after admin approval.
- Admin role: manually controlled and hidden from normal user navigation.

## Elderly person profile

The existing `elderly_profiles` concept may remain for now, but the UX needs reconsideration after the universal profile model is implemented. Future product decisions should clarify whether bookings are tied mostly to the signed-in user profile first or to a separate elderly profile object.

## MVP features

1. English-first responsive web app.
2. Universal user registration and login.
3. Profile-first account experience.
4. Terms/privacy/policy acceptance.
5. Browse approved visible caregivers.
6. Caregiver application flow available after signup.
7. Admin caregiver application review and approval.
8. Approved caregiver profile management in later phases.
9. Service categories and marketplace filters.
10. Booking/request placeholder flow.
11. Calm safety and legal boundary pages.
12. Admin-only controls hidden from normal navigation.
13. Audit logs for important admin and policy actions where already planned.
14. Basic security expectations:
    - No plain-text passwords.
    - Role-based access enforced internally.
    - Secure database rules.
    - No full card data stored by the app.

## Admin panel requirements

1. Admin access must be hidden from normal navigation and visible only to admin users.
2. Admins review caregiver applications.
3. Admins approve/reject caregiver applications.
4. Admin approval unlocks caregiver functionality.
5. Admins manage helper/caregiver visibility where applicable.
6. Admin roles must remain manually controlled and not self-assignable.
7. Broader booking management, payment actions, and advanced admin workflows should not be added without explicit product confirmation.

## Design direction

1. Trustworthy.
2. Calm.
3. Clean.
4. Accessible.
5. Warm but professional.
6. Not hospital-like.
7. Clear UX for older users and family caregivers.
8. Large readable typography.
9. High-contrast buttons.
10. Mobile-first responsive design.
11. Trust-focused UI: reviewed caregivers, safety explanations, clear booking steps.
12. Avoid clutter.
13. Avoid flashy startup visuals.
14. Product should feel safe, human, and reliable.

## Copy direction

Reduce repetitive defensive wording. Use service-first copy. Safety copy should be calmer and placed in appropriate sections.

Preferred tone examples:

- “Book trusted everyday support.”
- “Find help for visits, errands, shopping, companionship, and home tasks.”
- “Choose a date, city, and service type.”
- “Caregivers are reviewed before they can offer services.”
- “Some services are restricted for safety and legal reasons.”

Avoid overusing:

- “We do not provide medical care.”
- “No clinical tasks.”
- “No medical-service functionality.”
- “This is not active yet.”
- “Static shell.”

Keep the actual restrictions, but write them calmly and only where relevant.

## Non-goals for MVP

These should not be built until the English web MVP foundation is working and a later task explicitly requests them:

1. Native mobile apps.
2. In-app chat.
3. Real-time check-in/check-out.
4. Location sharing.
5. Ratings/reviews logic.
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
18. Stripe integration before a dedicated product-approved task.
19. Helper acceptance workflow.
20. Scheduling logic.
21. File upload logic before legal review and explicit implementation approval.
22. Admin booking management.
23. Large feature leaps without first updating documentation and asking for product confirmation.

## Hard prohibitions

1. Do not ask users to choose client/helper role during signup.
2. Do not allow anyone to instantly become an active caregiver/helper without admin approval.
3. Do not allow unverified or hidden caregivers to appear in public search/listings.
4. Do not expose caregiver email addresses publicly.
5. Do not build medical service functionality.
6. Do not allow medication management.
7. Do not allow injections.
8. Do not allow wound care.
9. Do not allow clinical tasks.
10. Do not build cash payment handling.
11. Do not allow off-platform payment instructions.
12. Do not store full card details.
13. Do not store plain-text passwords.
14. Do not build night-visit functionality in MVP.
15. Do not imply the platform guarantees absolute safety.
16. Do not position caregivers/helpers as employees of the platform.
17. Do not store copies of criminal record certificates unless legally reviewed and approved.
18. Do not collect unnecessary medical/health data in MVP.
19. Do not allow users to enter bank card PINs, passwords, cash-handling requests, or access-to-valuables requests.
20. Do not build mobile apps before the web MVP is validated.

## Recommended beginner stack

Use the existing repository stack and conventions. The documented direction remains:

- Next.js with App Router.
- TypeScript.
- Tailwind CSS.
- Supabase for authentication and database.
- Vercel for deployment.
- Stripe Connect or another marketplace-capable payment provider later only after explicit approval.

Do not change the package manager, deployment provider, or database approach without product confirmation.

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
17. Payment/reservation finalization after explicit product confirmation.

## Open questions

1. Should “elderly profiles” remain as a separate object, or should booking be tied mostly to the user profile first?
2. Which exact service types should appear in the homepage search box?
3. Should the public term be “caregiver”, “helper”, “companion”, or another label?
4. Should gender be required or optional?
5. Should phone number be required before email verification or after?
6. Should profile photos be required or optional?
7. What documents should caregivers upload, pending legal review?
8. What are the exact policies users must accept before applying as caregiver?
9. What launch geography should the English MVP target first?
10. What caregiver verification checks are legally appropriate for the launch geography?
11. What Terms version and Privacy Policy version naming scheme should be used?
12. What email provider should be used for transactional notifications?

## Summary

1. Product direction: universal user signup first, caregiver application later, admin approval before caregiver features, service-first public copy, and calmer safety/legal boundaries.
2. Current implementation memory: existing role/database structures may remain internally until carefully refactored, but future UI should not expose role selection during signup.
3. Remaining open questions: elderly profile model, service type labels, public caregiver/helper terminology, signup requirements, caregiver documents, policy acceptance, launch geography, verification checks, policy versioning, and email provider.
