# Test.md — Functional Test Suites & Execution Guidelines

> **Project:** Hindu Association of Ireland (HAI) Website (`hindu-association-ireland-web`)  
> **Database:** Single Shared Supabase PostgreSQL Database (Production)  
> **Notice:** All engineers and AI agents MUST follow the Test Safety & Cleanup Protocol without exception.

---

## 🚨 CRITICAL TEST SAFETY & CLEANUP PROTOCOL

> [!CAUTION]
> **THERE IS ONLY ONE DATABASE AND IT IS THE PRODUCTION DATABASE.**
> - **NEVER** delete, modify, or truncate existing production data.
> - **ALWAYS** clean up and purge test records (RSVPs, ticket bookings, members, donations, test events) from the database immediately after running tests.
> - **ALWAYS** tag test records with identifiable test prefixes (e.g., email `test-agent-suite@hindutemple.ie` or name `Test_Automated_User`) so cleanup queries strictly target test records.

---

## 📋 Table of Functional Test Suites

1. [Suite 1: Event RSVP Flow (Free Events & Multi-Slot Selection)](#suite-1-event-rsvp-flow-free-events--multi-slot-selection)
2. [Suite 2: Paid Ticket Booking Flow & Multi-Slot Aggregation](#suite-2-paid-ticket-booking-flow--multi-slot-aggregation)
3. [Suite 3: Donations & Special Causes Flow](#suite-3-donations--special-causes-flow)
4. [Suite 4: Membership Registration & Stripe Subscriptions](#suite-4-membership-registration--stripe-subscriptions)
5. [Suite 5: Contact Form & Nodemailer Email Dispatch](#suite-5-contact-form--nodemailer-email-dispatch)
6. [Suite 6: Admin Portal, Event Management & RBAC](#suite-6-admin-portal-event-management--rbac)
7. [Suite 7: Role Activation & Permission Management](#suite-7-role-activation--permission-management)
8. [Suite 8: Analytics Event Tracking & Aggregation](#suite-8-analytics-event-tracking--aggregation)
9. [Suite 9: Dedicated /donate Route, Modal Trigger, & QR Code Generation](#suite-9-dedicated-donate-route-modal-trigger--qr-code-generation)

---

## Suite 1: Event RSVP Flow (Free Events & Multi-Slot Selection)

### Objective
Verify free event RSVP submission, multi-day/multi-slot selection default state (unselected by default) and validation enforcement, attendance conditions acknowledgment, GDPR compliance, encryption of PII, and per-slot email/calendar invite dispatch.

### Pre-conditions
- Public event exists in `public.events` (either single-day or multi-day with schedules).

### Test Cases

#### 1.1 Single-Day Event Free RSVP
- **Steps:**
  1. Navigate to `/events/:slug` for a single-day free event.
  2. Click "RSVP — Free entry".
  3. Fill form: First Name: `TestFirst`, Last Name: `TestLast`, Phone: `+353851112222`, Email: `test-rsvp-single@hindutemple.ie`, Adults: `2`, Children: `1`.
  4. Check GDPR consent box.
  5. Click "Confirm RSVP".
- **Expected Result:**
  - Form submits successfully, displaying the reference number `HAI-XXXX-XXXX`.
  - Record inserted into `public.event_rsvps` with PII encrypted via `pgcrypto`.
  - Confirmation email sent containing calendar attachment (`.ics`).

#### 1.2 Multi-Day / Multi-Slot Event RSVP — Default Unselected & Mandatory Selection Validation
- **Steps:**
  1. Open RSVP modal for a multi-day event with time slots (`schedules`).
  2. **Verify:** None of the time slots/days are pre-selected by default (all checkboxes are unchecked).
  3. Leave all slots unchecked, fill attendee details + GDPR consent, and click "Confirm RSVP".
  4. **Verify:** Submission is blocked. Toast error appears (*"Please select at least one event day or time slot before proceeding."*) and the time slot section shows an inline red error.
  5. Check 1 or more time slots. Inline error clears.
  6. Click "Confirm RSVP".
- **Expected Result:**
  - Mandatory slot selection is strictly enforced.
  - Upon selecting at least 1 slot, RSVP submits successfully with `selected_schedules` stored in DB.
  - Separate email confirmation and individual `.ics` files dispatched per selected slot.

#### 1.3 Attendance Conditions & Guidelines Validation
- **Steps:**
  1. Open RSVP modal for an event with `attendanceConditions.enabled = true` and `requireAcknowledgment = true`.
  2. Attempt submission without checking the attendance conditions agreement.
- **Expected Result:**
  - Submission is blocked with toast error: *"Please accept the event attendance conditions to proceed."*
  - Checking the box allows submission.

### Cleanup Commands (Database)
```sql
DELETE FROM public.event_rsvps 
WHERE email_hash = digest('test-rsvp-single@hindutemple.ie', 'sha256')
   OR first_name_encrypted LIKE '%TestFirst%';
```

---

## Suite 2: Paid Ticket Booking Flow & Multi-Slot Aggregation

### Objective
Verify ticket tier selection, multi-slot total price calculation (`baseSingleSlotTotal * selectedSlotIds.size`), validation of 0 selected slots, Stripe Checkout session creation, and post-payment webhook fulfillment.

### Test Cases

#### 2.1 Multi-Slot Ticket Booking & Price Multiplier Validation
- **Steps:**
  1. Navigate to `/events/:slug` for a paid multi-day event.
  2. Click "Book tickets".
  3. **Verify:** Time slots are unselected by default. Total price displays `€0.00` (or `€0.00` until slots are checked).
  4. Attempt submission with 0 slots selected.
  5. **Verify:** Submission blocked with warning: *"Please select at least one event day or time slot before proceeding."*
  6. Select 2 time slots and 1 adult ticket (€20 base).
  7. **Verify:** Live order total dynamically calculates to `€40.00` (2 slots × €20).
  8. Fill attendee details and consent, click "Continue to Payment".
- **Expected Result:**
  - Netlify function `create-checkout-session` (kind='ticket') returns a Stripe Checkout URL with aggregated total `€40.00`.
  - Browser redirects to Stripe Checkout.

#### 2.2 Stripe Webhook Ticket Booking Fulfillment
- **Steps:**
  1. Trigger test Stripe Checkout completion event for ticket session (`payment_intent.succeeded`).
- **Expected Result:**
  - Stripe webhook invokes `insert_ticket_booking_encrypted` RPC.
  - Record created in `public.ticket_bookings`.
  - Per-slot email confirmation and `.ics` files sent to buyer.

### Cleanup Commands (Database)
```sql
DELETE FROM public.ticket_bookings 
WHERE email_hash = digest('test-ticket-user@hindutemple.ie', 'sha256');
```

---

## Suite 3: Donations & Special Causes Flow

### Objective
Verify one-off and recurring donation processing, cause tracking, Stripe Checkout creation, and receipt generation metadata.

### Test Cases

#### 3.1 One-Off Donation Submission
- **Steps:**
  1. Open Donation Dialog on `/causes` or Hero CTA.
  2. Select amount (e.g. `€51`), enter Donor Name: `Test Donor`, Email: `test-donor@hindutemple.ie`.
  3. Click "Donate €51".
- **Expected Result:**
  - Pending row created in `public.donations`.
  - Redirected to Stripe Checkout.
  - Webhook updates status to `completed` on payment success.

#### 3.2 Recurring Donation Setup
- **Steps:**
  1. Select "Monthly recurring donation" option.
  2. Complete details and proceed to payment.
- **Expected Result:**
  - Stripe Checkout session created in subscription mode.

### Cleanup Commands (Database)
```sql
DELETE FROM public.donations 
WHERE donor_email = 'test-donor@hindutemple.ie';
```

---

## Suite 4: Membership Registration & Stripe Subscriptions

### Objective
Verify annual membership selection, monthly tier additions (Shraddha, Seva, Bhakti), auto-generation of `member_code` (`HAI-MMYYY-XXXX`), and membership record creation upon payment.

### Test Cases

#### 4.1 Annual Membership + Monthly Contribution
- **Steps:**
  1. Navigate to `/membership`.
  2. Select Annual Plan (€20) + Seva Tier (€51/mo).
  3. Fill registration form: Full Name: `Test Member`, Email: `test-member@hindutemple.ie`, Phone: `+353859998888`.
  4. Click "Proceed to Stripe Checkout".
- **Expected Result:**
  - Pending member record inserted into `public.members` and `public.memberships`.
  - Stripe Checkout session created.
  - Webhook sets status to `active` and trigger generates `member_code` matching `HAI-MMYYY-XXXX`.

### Cleanup Commands (Database)
```sql
DELETE FROM public.memberships WHERE member_id IN (SELECT id FROM public.members WHERE email = 'test-member@hindutemple.ie');
DELETE FROM public.members WHERE email = 'test-member@hindutemple.ie';
```

---

## Suite 5: Contact Form & Nodemailer Email Dispatch

### Objective
Verify contact form input validation, sanitisation, database logging (if applicable), and serverless email dispatch via `contact-submit.ts`.

### Test Cases

#### 5.1 Public Contact Submission
- **Steps:**
  1. Navigate to `/contact`.
  2. Fill Name: `Test Contact`, Email: `test-contact@hindutemple.ie`, Subject: `Inquiry`, Message: `Automated functional test inquiry message.`.
  3. Click "Send Message".
- **Expected Result:**
  - Netlify function `contact-submit` validates input and sends email notification via SMTP/Nodemailer.
  - Success message shown on frontend: *"Thank you! Your message has been sent."*

### Cleanup Commands (Database)
- (No persistent DB table for contact entries, or delete test logs from `analytics_events` if logged).

---

## Suite 6: Admin Portal, Event Management & RBAC

### Objective
Verify admin login, role-gated section rendering, event creation/editing (including multi-day schedules and attendance conditions), RSVP inspection, PII masking, and CSV exports.

### Test Cases

#### 6.1 Admin Event Creation (Multi-Day with Time Slots)
- **Steps:**
  1. Log in to `/admin` as `super_admin` or `admin`.
  2. Navigate to "Events" section → Click "Add New Event".
  3. Fill Title: `Test Automated Festival 2026`, Category: `festival`, Date: `2026-10-15`.
  4. Toggle "Multi-Day Event" -> Add 2 Time Slots (Day 1 Morning, Day 2 Evening).
  5. Enable Attendance Conditions & check "Require mandatory agreement".
  6. Click "Save Event".
- **Expected Result:**
  - Event created in `public.events` with `is_multi_day = true`, `schedules` JSONB populated, and `attendance_conditions` set.
  - Appears in public `/events` listing.

#### 6.2 RSVP Inspection & CSV Export
- **Steps:**
  1. Navigate to `/admin/rsvps`.
  2. Verify attendee PII (email, phone) is masked by default in table view.
  3. Click "Export CSV".
- **Expected Result:**
  - `rsvp-export` Netlify function generates a valid CSV file containing reference numbers, slot selections, and attendee details.

### Cleanup Commands (Database)
```sql
DELETE FROM public.event_rsvps WHERE event_id IN (SELECT id FROM public.events WHERE title = 'Test Automated Festival 2026');
DELETE FROM public.ticket_bookings WHERE event_id IN (SELECT id FROM public.events WHERE title = 'Test Automated Festival 2026');
DELETE FROM public.events WHERE title = 'Test Automated Festival 2026';
```

---

## Suite 7: Role Activation & Permission Management

### Objective
Verify RBAC invite generation, invitation link token verification, role activation via `/activate-role`, and role permission matrix updates.

### Test Cases

#### 7.1 Role Invitation & Acceptance
- **Steps:**
  1. In `/admin/roles`, send role invitation to `test-invite@hindutemple.ie` for role `community_manager`.
  2. Open invite URL `/activate-role?token=...`.
  3. Complete account setup / password set.
- **Expected Result:**
  - `activate-role` Netlify function updates user `app_metadata.role` to `community_manager`.
  - User can log in to `/admin` and view only community management tabs.

### Cleanup Commands (Database)
```sql
DELETE FROM public.role_invitations WHERE email = 'test-invite@hindutemple.ie';
-- Delete test auth user via Supabase dashboard / auth API if created.
```

---

## Suite 8: Analytics Event Tracking & Aggregation

### Objective
Verify page view and CTA click tracking, sanitisation of tracking payloads, and daily analytics aggregation.

### Test Cases

#### 8.1 Analytics Track Function
- **Steps:**
  1. Trigger page view or event CTA click on client.
- **Expected Result:**
  - Payload POSTed to `/.netlify/functions/analytics-track`.
  - Row inserted into `public.analytics_events` with category, action, and path.

### Cleanup Commands (Database)
```sql
DELETE FROM public.analytics_events WHERE event_category = 'test_execution';
```

---

## Suite 9: Dedicated /donate Route, Modal Trigger, & QR Code Generation

### Objective
Verify that navigating directly to `/donate` immediately triggers the `DonationDialog` modal, that closing the modal displays the rich `DonatePage` with functional preset chips, that live QR codes generate and download correctly, and that preset query parameters (`/donate?amount=108`) preselect donation amounts.

### Test Cases

#### 9.1 Direct Route Navigation & Modal Auto-Open
- **Steps:**
  1. Navigate directly to `/donate`.
  2. **Verify:** `DonationDialog` modal ("Support Our Temple") appears automatically without needing user clicks.
  3. Click close button ('X') on the modal.
  4. **Verify:** Modal dismisses cleanly and user is presented with the `DonatePage` view (showing hero, preset donation cards, Irish tax relief info, and QR code card).

#### 9.2 Amount Preset via Query Parameters
- **Steps:**
  1. Navigate to `/donate?amount=108`.
  2. **Verify:** `DonationDialog` modal opens automatically with the €108 preset button highlighted and pre-selected.
  3. Advance to details step and verify the amount displays €108.

#### 9.3 Preset Buttons & Re-Opening Modal
- **Steps:**
  1. On `/donate` with dialog closed, click any preset chip (e.g., €51 "Puja Seva").
  2. **Verify:** `DonationDialog` opens immediately with €51 selected.
  3. Close dialog, click "Donate Now".
  4. **Verify:** `DonationDialog` opens smoothly.

#### 9.4 QR Code Generation & Download
- **Steps:**
  1. On `/donate`, inspect the "Scan to Donate" QR Code card.
  2. Switch between "General" and "€108" preset tabs.
  3. **Verify:** QR image updates to reflect the active URL.
  4. Click "Copy Route Link" and verify clipboard notification.
  5. Click "Download QR" and verify image file downloads (`HAI-Donation-QR-*.png`).

---

20. 10. [Suite 10: Media Library & Photo Album Featured Cover Image Management](#suite-10-media-library--photo-album-featured-cover-image-management)

---

## Suite 10: Media Library & Photo Album Featured Cover Image Management

### Objective
Verify that admins can add photo albums, set or update featured cover images (`thumbnail_url`) via URL input, pick an image from the Media Library using `MediaPickerDialog`, upload a new cover image file, or auto-fetch OG cover images.

### Test Cases

#### 10.1 Add Photo Album with Custom / Picked Featured Image
- **Steps:**
  1. Open `/admin` -> Media section.
  2. Click "Add photo album".
  3. Enter Album URL: `https://photos.app.goo.gl/testalbum123`, Album Title: `Test Album 2026`.
  4. Click "Pick from Media Library" -> Choose an existing media image (or enter a custom Cover Image URL).
  5. Click "Add photo album".
- **Expected Result:**
  - Album is created in `public.media` with `media_type = 'album'` and `thumbnail_url` populated with the selected cover image.
  - Album card displays the selected featured cover image in the admin grid and public photo gallery.

#### 10.2 Edit Album Details & Update Featured Cover Image
- **Steps:**
  1. On any album card in `/admin` Media Library, click "Edit cover" or pencil icon.
  2. Modify album title / link, and choose/upload a new featured cover image.
  3. Click "Save changes".
- **Expected Result:**
  - `useMedia.update` patches `thumbnail_url`, `path`, and `title` in `public.media`.
  - Grid card updates immediately with the new cover preview.

### Cleanup Commands (Database)
```sql
DELETE FROM public.media WHERE title = 'Test Album 2026' OR path = 'https://photos.app.goo.gl/testalbum123';
```

---

## 🛠️ Execution Checklist for Engineers & AI Agents

Before declaring any feature complete:
1. Run `npx tsc --noEmit` and confirm **Exit Code 0**.
2. Run relevant test suite(s) from `Test.md`.
3. Execute the database cleanup queries for all created test data.
4. Verify no production records were touched or deleted.
