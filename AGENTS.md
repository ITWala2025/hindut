# AGENTS.md — Development Guidelines for AI & Human Engineers

> **Project:** Hindu Association of Ireland (HAI) Website (`hindu-association-ireland-web`)  
> **Tech Stack:** React 19, TypeScript, Vite, Supabase (PostgreSQL + Auth + RLS), Netlify Functions, Stripe, Tailwind CSS v4.

---

## 🎯 Primary Directives

All engineers and AI coding agents working on this codebase must adhere strictly to these operational guidelines, repository patterns, and architecture rules.

---

## ✅ THE DOs (Best Practices & Mandatory Rules)

### 1. Code Quality & Type Safety
- **DO** run `npx tsc --noEmit` to verify type safety after making code changes.
- **DO** keep interfaces in `src/data/events.ts` and `src/lib/types.ts` strictly typed.
- **DO** mirror server-side Zod validation schemas in `netlify/functions/` with client-side schemas in `src/components/`.
- **DO** preserve docstrings and comments when modifying existing utility functions.

### 2. Architecture & Data Flow
- **DO** route all Supabase database reads/writes through custom React hooks located in `src/hooks/`.
- **DO** keep administrative and privileged writes (such as email sending, Stripe session creation, or RLS bypass) strictly inside **Netlify Functions** (`netlify/functions/`).
- **DO** create clean, idempotent numbered migration files in `supabase/migrations/` whenever database tables, columns, triggers, or RLS policies are added or updated (using `ADD COLUMN IF NOT EXISTS`).

### 3. Event Management & Multi-Slot Features
- **DO** support both single-day and multi-day / multi-slot events cleanly across UI dialogs (`RsvpDialog.tsx`, `TicketBookingDialog.tsx`), detail pages (`EventDetailPage.tsx`), and admin portals (`EventsSection.tsx`).
- **DO** aggregate total prices across all selected time slots into a single unified payment transaction at Stripe Checkout for paid events.
- **DO** generate and dispatch **separate confirmation emails** and **individual `.ics` calendar files** for each reserved slot post-purchase/RSVP.
- **DO** display attendance conditions and guidelines clearly on public event pages and enforce mandatory agreement checkboxes when required by event configuration.

### 4. Security & Privacy
- **DO** mask contact PII (email, phone) in admin views and use server-side `pgcrypto` encryption for storing sensitive contact info.
- **DO** format dates and times explicitly using Ireland time (`Europe/Dublin` / `en-IE`).

### 5. Documentation, Testing & Test Data Cleanup
- **DO** keep both `MEMORY.md` and `Test.md` updated after **every** code change, feature addition, or schema update.
- **DO** execute the relevant functional test suites from `Test.md` to verify feature correctness.
- **DO** immediately delete and clean up all test data (test RSVPs, tickets, members, donations, test events) created during test execution.

---

## ❌ THE DONTs (Strict Restrictions)

### 1. Security & Secrets
- **NEVER** expose sensitive keys (such as `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY`) in frontend `src/` code or client bundles.
- **NEVER** hardcode live or test Stripe keys directly in component code; always read from environment variables or Netlify config (`STRIPE_MODE`).

### 2. Database & Schema Safety
- **NEVER** alter or drop existing database columns without a proper migration script in `supabase/migrations/`.
- **NEVER** bypass Row Level Security (RLS) directly in frontend queries; use service role calls strictly within Netlify serverless functions.
- **NEVER** break backward compatibility with existing single-day events or legacy RSVP data.

### 3. Production Database Safety & Test Cleanup Protocol
- **NEVER** leave test data in the database after running tests. Because there is only 1 database (the Production database), all test records MUST be removed immediately after test runs.
- **NEVER** delete, modify, or truncate original production data during test runs. All test execution cleanup queries MUST strictly target test record IDs/emails created during the test run.

### 4. UI & User Experience
- **NEVER** replace established shadcn/ui components or custom CSS tokens in `src/styles/theme.css` with arbitrary ad-hoc inline styles.
- **NEVER** send a single merged calendar invite when an attendee reserves multiple distinct time slots (each slot must have its own calendar invite).
- **NEVER** leave non-functional placeholder buttons or broken links on public pages.

### 5. Project Documentation
- **NEVER** treat specification docs in `Plan/` as ground truth if they contradict `MEMORY.md` or actual workspace source code. `Plan/` contains initial designs for a Next.js app that was replaced by Vite + Netlify.

---

## 📁 Key File Map

| Purpose | File Path |
|---------|-----------|
| **Project Memory** | [`MEMORY.md`](file:///Users/prashant/Documents/Application%20directory/HinduT/MEMORY.md) |
| **Agent Guidelines** | [`AGENTS.md`](file:///Users/prashant/Documents/Application%20directory/HinduT/AGENTS.md) |
| **Test Suites & Protocol** | [`Test.md`](file:///Users/prashant/Documents/Application%20directory/HinduT/Test.md) |
| **Event Types** | [`src/data/events.ts`](file:///Users/prashant/Documents/Application%20directory/HinduT/src/data/events.ts) |
| **Event Data Hook** | [`src/hooks/useEvents.ts`](file:///Users/prashant/Documents/Application%20directory/HinduT/src/hooks/useEvents.ts) |
| **RSVP Data Hook** | [`src/hooks/useRsvps.ts`](file:///Users/prashant/Documents/Application%20directory/HinduT/src/hooks/useRsvps.ts) |
| **Admin Events Section** | [`src/components/admin/sections/EventsSection.tsx`](file:///Users/prashant/Documents/Application%20directory/HinduT/src/components/admin/sections/EventsSection.tsx) |
| **Free RSVP Dialog** | [`src/components/RsvpDialog.tsx`](file:///Users/prashant/Documents/Application%20directory/HinduT/src/components/RsvpDialog.tsx) |
| **Paid Ticket Booking** | [`src/components/TicketBookingDialog.tsx`](file:///Users/prashant/Documents/Application%20directory/HinduT/src/components/TicketBookingDialog.tsx) |
| **RSVP Netlify Function** | [`netlify/functions/rsvp-submit.ts`](file:///Users/prashant/Documents/Application%20directory/HinduT/netlify/functions/rsvp-submit.ts) |
| **Latest SQL Migration** | [`supabase/migrations/20260907000091_add_multi_day_events_and_rsvp_slots.sql`](file:///Users/prashant/Documents/Application%20directory/HinduT/supabase/migrations/20260907000091_add_multi_day_events_and_rsvp_slots.sql) |

---

## 🛠️ Essential Verification Command

Before finishing any task or submitting changes, run:

```bash
npx tsc --noEmit
```

Ensure the command exits with **code 0 (zero errors)**.
