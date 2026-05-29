# Auth and Roles Plan

This document describes the planned VnukPodNaem authentication and role model for the next Supabase implementation phase.

No live authentication behavior is active yet. This plan is documentation-only and should guide the later Supabase Auth, route protection, database policy, and admin workflow implementation.

## Product boundaries

- VnukPodNaem is a non-medical support marketplace.
- Helpers are independent marketplace participants, not employees of the platform.
- The app must not imply guaranteed safety.
- Real payments, Stripe, live booking payments, and payment processing are out of scope for this phase.
- Bulgarian localization, native mobile apps, and medical-service functionality are out of scope for this phase.

## Planned roles

### Visitor

A person who is not signed in.

Purpose:

- Learn what the platform is.
- Read public safety and service-boundary pages.
- Start login or signup.

### Client/caregiver

A signed-in user who books non-medical help for themselves or on behalf of an elderly person.

Purpose:

- Manage their own profile.
- Manage elderly profiles connected to their account.
- Request allowed non-medical services when booking functionality exists.

### Helper applicant

A signed-in user who has started or submitted an application to provide non-medical support.

Purpose:

- Create and maintain their own helper application.
- Track review status.
- Remain hidden from public helper listings until approved.

### Verified helper

A helper whose application has been approved by an admin and whose account is active.

Purpose:

- Maintain an approved helper profile.
- Appear in helper listings when public and active.
- Later, view assigned or accepted bookings.

### Admin

A trusted platform/support team role for operational review and moderation.

Purpose:

- Review helpers, bookings, complaints/disputes, and audit logs.
- Approve, reject, suspend, or ban helper accounts according to internal policy.
- Support safety, marketplace integrity, and legal/compliance review.

## Planned access rules

| Role | Planned access |
| --- | --- |
| Visitor | Can view public pages only, including landing, services, safety, allowed services, prohibited services, terms, privacy, login, and signup. |
| Client/caregiver | Can manage their own profile, elderly profiles they own, and their own bookings. |
| Helper applicant | Can manage their own helper application and view its status. |
| Verified helper | Can manage their approved helper profile and later view assigned or accepted bookings. |
| Admin | Can review helper applications, bookings, disputes/complaints, payment placeholder records, users needed for support, and audit logs. |

## Route protection plan

Future route protection should be simple and explicit:

- Public pages stay accessible to visitors.
- `/dashboard` and nested client pages require a signed-in client/caregiver or admin as appropriate.
- `/dashboard/elderly-profiles` requires the signed-in client/caregiver to own the elderly profile records being viewed or edited.
- `/dashboard/bookings` requires the signed-in user to be connected to the booking as the client/caregiver, assigned verified helper, or admin.
- `/helper/apply` requires a signed-in helper applicant, verified helper, or admin depending on the workflow step.
- `/helpers` should show only active public verified helper profiles once real data exists.
- `/admin` and nested admin routes require the admin role.

## Database authorization plan

Supabase row-level security should be enabled for all application tables that contain user or operational data.

High-level policy direction:

- Visitors can read only public data that has been intentionally marked public.
- Signed-in users can read and update their own profile fields that are safe for self-service.
- Clients/caregivers can read and update elderly profiles they own.
- Helper applicants can read and update their own application while its status allows edits.
- Verified helpers can read only their own helper profile and booking records assigned or accepted by them.
- Admins can read and update operational records required for review, support, dispute handling, and audit workflows.
- Audit log creation should happen through trusted server-side actions or carefully controlled database functions in a later phase.

## Role assignment notes

- New users should start with the least privileged role needed for their signup path.
- Admin roles must not be self-assignable from the browser.
- Helper verification must require admin approval before a helper becomes public or eligible for bookings.
- Suspended or banned accounts should lose access to protected marketplace actions.
- Role changes and important safety decisions should create audit logs later.

## Open questions for the Supabase phase

- Whether role should live only in `profiles.role`, in Supabase Auth app metadata, or both.
- Which admin actions require server-only logic instead of direct client updates.
- What minimum profile data is required at signup before protected features are available.
- How terms and privacy version acceptance should be enforced before booking or helper application actions.
