# VnukPodNaem UX Direction V2

## 1. Product direction summary

VnukPodNaem should use a universal user profile model. Everyone signs up as a normal user first, without choosing client/helper/caregiver role during signup. A user can later apply to become a caregiver from profile/account surfaces. Admin approval is required before caregiver-specific functionality becomes available.

The public experience should feel like a simple trusted-service marketplace: choose what help is needed, where it is needed, and when it is needed. Safety and legal boundaries remain important, but they should be calm, contextual, and concentrated in the right places instead of repeated defensively across every page.

## 2. Homepage booking/search module

The homepage should move toward a direct booking/search module with:

- City/location.
- Date or date range.
- Service type.
- Primary button: “Find caregiver” or “Browse caregivers.”

Initial service type examples:

- Stay at home.
- Quick visit.
- Shopping.
- House work.
- Accompaniment.

The homepage should prioritize copy such as “Book trusted everyday support” and “Choose a date, city, and service type.”

## 3. Universal signup model

Signup should create a standard user account only. It should not ask users to choose whether they are a client, helper, caregiver, or applicant.

Planned signup fields:

- First name.
- Last name.
- Phone number.
- Gender.
- Email.
- Password.
- Repeat password.
- Acceptance of Terms, Privacy Policy, and required platform policies.

Internally, the app may continue to use roles for authorization. New users should default to `client` or an equivalent normal-user role.

## 4. Profile/avatar menu model

After login, account actions should primarily live in a profile/avatar menu and profile page rather than crowding the top navigation.

The profile experience should include:

- Avatar or initials.
- Basic profile information.
- Bio.
- Browse caregivers action.
- Become a caregiver action.
- Clean side/account navigation.
- Admin link only for admin users.

Top navigation should stay simple, public-facing, and user-friendly.

## 5. Become caregiver flow

Users can apply to become a caregiver from:

- Profile avatar menu.
- Profile page.
- Profile banner.
- Relevant public call-to-action sections.

The application form should later include:

- Experience.
- Certifications/training.
- Familiarity with terms and service boundaries.
- Availability/service preferences.
- File attachment placeholder for documents such as a criminal record statement, subject to legal review.

After submission, show a success screen with:

> We will get back to you within 48–72 hours.

Application data should be visible only to admins.

## 6. Caregiver approval/admin flow

Admin approval is required before caregiver functionality becomes available.

Role interpretation:

- Default new user: `client` or equivalent normal user internally.
- Submitted caregiver application: `helper_applicant` or equivalent applicant state.
- Approved caregiver: `verified_helper` or equivalent approved caregiver state.
- Admin: manually controlled and hidden from normal UI.

The existing `helper_applications` and admin approval foundation should be adapted rather than discarded.

## 7. Marketplace filters

The helpers/caregivers listing should become a marketplace with filters for:

- City.
- Radius in km.
- Date/date range.
- Service type.
- Visible approved caregivers only.

The marketplace must not expose unapproved caregivers, hidden caregivers, helper applications, private profile ownership IDs, or public email addresses.

## 8. Helper detail/profile direction

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

Approved caregivers should later manage bio, profile photo, cover photo, city, service radius, fixed offered service types, availability/schedule, current reservations/duties, previous ratings/reviews later, and ongoing jobs later.

## 9. Reservation/payment placeholder direction

For now, reserve/request actions should show a clear message that payment/reservation finalization is not active yet. The message should be concise and should not make the entire product feel inactive.

Later, users may be directed into a payment/reservation flow. Stripe or another provider may be integrated only after explicit product confirmation and a dedicated implementation task. Do not implement payment now.

## 10. Copywriting rules

Use service-first, trust-building copy.

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

Keep safety boundaries present in dedicated safety, terms, caregiver application, and booking confirmation areas. Do not make every public section defensive or alarming.

## 11. What not to build yet

Do not build these without a future explicit product-approved task:

- Runtime app changes as part of documentation-only tasks.
- Database schema changes or SQL migrations for this V2 direction note.
- Payments.
- Stripe.
- Native mobile app work.
- Bulgarian localization.
- Helper acceptance workflow.
- Scheduling logic.
- Ratings logic.
- File upload logic.
- Admin booking management.
- Large feature leaps before updating documentation and asking for product confirmation.

## 12. Open questions for Ivan

- Should “elderly profiles” remain as a separate object, or should booking be tied mostly to the user profile first?
- Which exact service types should appear in the homepage search box?
- Should the public term be “caregiver”, “helper”, “companion”, or another label?
- Should gender be required or optional?
- Should phone number be required before email verification or after?
- Should profile photos be required or optional?
- What documents should caregivers upload, pending legal review?
- What are the exact policies users must accept before applying as caregiver?

## V2 first visible UI refactor implemented (2026-05-31)

The first visible V2 app refactor is now implemented in the Next.js shell.

- The homepage now leads with service-first booking/search copy instead of making safety warnings the dominant message.
- The homepage now uses a warmer marketplace-style visual direction with softer backgrounds, rounded cards, human service copy, and stronger visual hierarchy.
- Homepage emphasis is trust, clarity, elder-friendly readability, and a clear central search action rather than internal system status.
- The homepage includes a simple visual search module with city/location, date or date range, service type, and a Browse caregivers button.
- The homepage search module is visual/query-based only for now. It sends users to `/helpers` and preserves simple values in URL query parameters through the browser's normal GET form behavior.
- Real caregiver filtering, scheduling, final reservation, helper acceptance, and payment processing are not implemented yet.
- Safety/legal boundaries still exist, but the homepage now links to `/safety` and uses calmer supporting copy.
- Top navigation now uses simpler public links: Services, Caregivers, Safety, and Become a caregiver for signed-out users.
- Logged-in users now see an avatar/initials account menu with My profile, Browse caregivers, Become a caregiver, Sign out, and Admin only when the current profile role is `admin`.
- `/dashboard` is now framed as My profile / account hub instead of an internal development dashboard.
- The visible caregiver entry point uses the existing `/helper/apply` application flow; no new caregiver application schema was added.
- The forgot-password experience on `/login` is a placeholder only and intentionally does not send Supabase reset emails yet.

## Homepage structured search correction implemented (2026-05-31)

The homepage search has been corrected to behave like a structured marketplace entry point instead of an open text form.

- The hero now uses a controlled warm layout with clear copy, a prominent search card, and no accidental decorative badge overlapping functional content.
- Service, city, and date range are the primary search entry points.
- Service selection uses tap-friendly selectable cards for Stay at home, Quick visit, Shopping, House work, Companionship, and Accompaniment.
- City selection uses a dropdown backed by a maintainable Bulgaria city data file. The list includes major cities and regional centers, but it should not be treated as a complete national city dataset yet.
- Date range selection uses native browser date inputs for start date and end date.
- Submitting the homepage search navigates to `/helpers` with `city`, `service`, `startDate`, and `endDate` URL query parameters.
- `/helpers` can display selected query criteria at the top of the listing page.
- `/helpers` may filter visible caregiver profiles by city because `helper_profiles.city` already exists.
- Real service availability and date availability filtering are not implemented yet and must not be implied until caregiver service/availability data exists.
- The header now includes an EN/BG language selector foundation near the account/avatar area and stores the selected language in localStorage.
- The language selector is a foundation only. Full-site Bulgarian/English translation remains a later task.


## UI and i18n refinement pass implemented (2026-05-31)

The current UI refinement keeps the V2 marketplace direction but makes the first search and shared shell feel more polished and complete.

- Homepage service search now supports selecting multiple service types at once using accessible checkbox-card controls.
- Selected homepage services are preserved in `/helpers` with a comma-separated `services` query parameter, for example `services=shopping,companionship,quick-visit`.
- `/helpers` reads the new multi-service query parameter, still supports the older single `service` parameter as a fallback, and displays all selected service filters in the active search summary.
- `/helpers` continues to filter only by city because city is currently available on visible helper profile data. Service and date criteria are displayed clearly without implying real availability filtering that does not exist yet.
- The header logo has been updated from the plain VP circle and removed the small “EVERYDAY SUPPORT” motto. The new lightweight custom SVG mark combines a warm heart/people symbol with the VnukPodNaem wordmark.
- Site typography now uses a cleaner, readable Next font setup with Latin and Cyrillic support so English and Bulgarian share a consistent visual tone.
- The homepage hero removed the nonessential top “EVERYDAY FAMILY SUPPORT” badge, the two small support boxes below the search card, and the explanatory text below the search button about bookings/payments.
- Homepage cards, service selection, CTA buttons, and helper listing cards now use softer shadows, clearer hover/focus states, stronger selected states, refined borders, and more consistent rounded spacing.
- The EN/BG language switch is now active across the currently implemented interface. It uses a lightweight in-repo translation layer, persists the selected language with localStorage and a cookie, updates the document language, and translates shared navigation, footer, homepage, helper filters/listings, public pages, auth/account/admin/helper application surfaces, and common dynamic labels where practical.
- The language switch now shows only the active language at a time and toggles to the other language, avoiding the previous double-state control.
- Current translation scope covers all currently built pages and shared UI. Future refinements may still improve wording, add more granular dynamic error translations, and replace the lightweight phrase map with a fuller route-level i18n structure if the product grows.

## Language and service-card refinement implemented (2026-05-31)

This pass keeps the current visual direction and focuses on language completeness, Bulgarian copy quality, and service selection polish.

- The site display name is localized in visible UI: English uses `Vnuk Pod Naem`, and Bulgarian uses `Внук Под Наем`. The older internal/project identifier may remain in internal files where it is not visible UI.
- The header language control uses two separate compact buttons, `EN` and `BG`, near the sign-in/account area. The active language is visually selected, the control works signed in or signed out, remains available in the mobile menu, and persists through localStorage and a cookie.
- Bulgarian copy should be meaning-based and natural, not literal word-for-word translation from English. Public copy should sound warm, clear, professional, and suitable for Bulgarian families arranging elder support.
- Full visible current-shell translation is expected across implemented pages and shared UI, including homepage, navigation, footer, public service/safety/legal pages, caregiver listings/detail pages, auth pages, account/dashboard pages, helper application/profile pages, bookings, elderly profiles, admin surfaces, buttons, labels, empty states, status labels, and common helper text where practical.
- Emoji use is not allowed in the UI. Service cards use simple professional inline SVG-style icons with consistent sizing, stroke style, container size, and alignment.
- Homepage service cards keep multi-select behavior but use consistent plus/check indicators with matching size, shape, position, selected state, and no layout shift.
- Homepage copy blocks should avoid cramped text. Prefer readable line height, comfortable max widths, and consistent spacing between headings, body text, cards, and calls to action.

## Visual refinement pass (2026-06-01)

- The public caregiver marketplace is now titled “Certified caregivers” / “Сертифицирани помощници” and should read as a user-facing listing page, not an internal marketplace status panel.
- Certified caregivers are presented as a responsive card grid. Cards use a square photo/placeholder area, soft green framing, a certified badge, location, age placeholder when no age field exists, a short profile summary, and a profile link. Longer bio/profile details belong on the individual caregiver detail page.
- Approved caregivers should appear on the public certified caregivers page by default when admin approval creates or updates their verified caregiver profile. Admin visibility controls, where supported, are treated as hide/unpublish controls after approval rather than a second required approval step.
- Marketplace safety and listing guidance should appear as calm top banners above grids or forms, not as competing right-side panels.
- The caregiver application page is a centered application form for admin review. It should explain that users keep a normal account, submit an application, and can appear publicly only after admin approval.
- The footer should stay stable across English and Bulgarian using a column layout: brand/about, navigation, and legal.
- Every current-shell UI pass requires a visible translation audit across shared navigation, footer, public pages, account surfaces, helper/caregiver pages, admin surfaces, empty states, and form helper text.

## Translation coverage and homepage search width refinement (2026-06-01)

- Remaining EN/BG translation gaps were audited across the current public shell, auth pages, dashboard pages, helper pages, admin page, and legal/safety pages.
- Terms, Privacy, and Safety card copy is expected to switch consistently between English and Bulgarian with no mixed-language static UI text.
- Homepage hero/search card desktop width was adjusted so service labels have enough space to display fully or wrap cleanly.
- EN/BG translation coverage is expected to include all current static UI text; user-generated profile, booking, application, and database content remains displayed as entered.
