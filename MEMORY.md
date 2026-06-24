# MEMORY.md — Hindu Association of Ireland (HAI) Website

> Agent reference file. Keep this up to date as the project evolves.

---

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | Hindu Association of Ireland – Website |
| **Short name** | HinduT / HAI Web |
| **Organisation** | Hindu Association of Ireland (HAI), Limerick |
| **Reference site** | https://www.hindutemple.ie/ |
| **Package name** | `hindu-association-ireland-web` |

---

## Tech Stack (Actual — not the Plan docs)

> The `Plan/` docs describe a Next.js + Vercel architecture that was **never built**. The real implementation below is what exists in the repo.

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite 7, React Router v7 |
| **UI library** | shadcn/ui (Radix UI primitives) + Tailwind CSS v4 |
| **State / data** | TanStack React Query v5, custom hooks |
| **Forms** | react-hook-form + zod |
| **Rich text** | TinyMCE (via `@tinymce/tinymce-react`) |
| **Charts** | Recharts, D3 |
| **Animations** | Framer Motion |
| **PDF generation** | jsPDF + html2canvas |
| **Hosting** | **Netlify** (SPA with `dist/` publish dir) |
| **Serverless functions** | **Netlify Functions** (TypeScript, esbuild, `netlify/functions/`) |
| **Database + Auth** | **Supabase** (PostgreSQL + Row Level Security + Auth) |
| **Storage** | Supabase Storage (buckets: `gallery`, `media`) |
| **Payments** | **Stripe** — Checkout, Subscriptions, Webhooks |
| **Email** | Nodemailer (via Netlify Functions) |
| **Build tool** | Vite with `@vitejs/plugin-react-swc` |

---

## Repository Layout

```
HinduT/
├── src/                        # Frontend source
│   ├── App.tsx                 # Root router (React Router)
│   ├── main.tsx                # Vite entry point
│   ├── components/
│   │   ├── pages/              # One file per route/page
│   │   ├── admin/              # Admin-only UI components & sections
│   │   └── ui/                 # shadcn/ui components
│   ├── hooks/                  # Data hooks (Supabase queries via React Query)
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   ├── auth.tsx            # Auth context/provider
│   │   ├── stripeClient.ts     # Stripe.js loader
│   │   ├── receiptPdf.ts       # PDF receipt generation
│   │   ├── analytics.ts        # Analytics helpers
│   │   ├── seo.tsx             # SEO meta helpers
│   │   └── types.ts            # Shared TypeScript types
│   ├── data/                   # Static seed / mapping data
│   └── styles/theme.css        # CSS design tokens
├── netlify/
│   └── functions/              # Netlify serverless functions (TypeScript)
│       ├── lib/                # Shared helpers (email templates, Supabase admin client)
│       ├── stripe-webhook.ts   # Stripe event handler
│       ├── create-checkout-session.ts
│       ├── create-payment-intent.ts
│       ├── contact-submit.ts
│       ├── rsvp-submit.ts
│       ├── rsvp-export.ts
│       ├── ticket-submit.ts
│       ├── admin-users.ts
│       ├── activate-role.ts
│       ├── analytics-track.ts
│       ├── role-permissions.ts
│       ├── payment-config.ts
│       ├── payment-settings.ts
│       ├── stripe-products.ts
│       ├── stripe-mappings.ts
│       ├── sync-membership-plans.ts
│       ├── sync-plans-from-mappings.ts
│       └── fetch-og-image.ts
├── supabase/
│   └── migrations/             # 84 numbered SQL migration files
├── Plan/                       # Specification docs (reference only — may be outdated)
├── public/                     # Static assets (logo, favicon, robots.txt, sitemap.xml)
├── dist/                       # Vite build output (Netlify publish dir)
├── netlify.toml                # Netlify build + redirect + headers config
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Pages (React Router)

| Route | Component | Notes |
|-------|-----------|-------|
| `/` | `HomePage` | Hero carousel, news ticker, events strip |
| `/about` | `AboutPage` | Organisation info, team |
| `/events` | `EventsPage` | Event listings |
| `/events/:id` | `EventDetailPage` | RSVP + ticket booking |
| `/services` | `ServicesPage` | Temple services by category |
| `/services/:id` | `ServiceDetailPage` | Single service detail |
| `/membership` | `MembershipPage` | Membership plans + Stripe checkout |
| `/causes` | `CausesPage` | Special causes / fundraising |
| `/causes/:id` | `CauseDetailPage` | Donation dialog |
| `/news` | `NewsPage` | News & updates |
| `/news/:id` | `NewsDetailPage` | Single news article |
| `/contact` | `ContactPage` | Contact form |
| `/payment-success` | `PaymentSuccessPage` | Post-Stripe redirect |
| `/admin` | `AdminPage` + `AdminLayout` | Protected; role-gated |
| `/activate-role` | `ActivateRolePage` | Role invite acceptance |
| `/privacy-policy` | `PrivacyPolicyPage` | |
| `/terms` | `TermsAndConditionsPage` | |
| `/refund-policy` | `RefundPolicyPage` | |
| `/cookies-policy` | `CookiesPolicyPage` | |

---

## Database (Supabase — Key Tables)

| Table | Purpose |
|-------|---------|
| `members` | Registered members (name, email, phone, member_code, family_size, area) |
| `membership` | Membership records (annual / monthly, status, Stripe IDs) |
| `membership_plans` | Plan definitions synced from Stripe |
| `monthly_contribution` | Recurring donation records |
| `donations` | One-off donations |
| `events` | Event listings |
| `event_rsvps` | RSVP registrations |
| `ticket_bookings` | Paid event ticket purchases |
| `services` | Temple services |
| `service_categories` | Service category groupings |
| `receipts` | Auto-generated payment receipts (PDF metadata) |
| `media` | Gallery/media items (Supabase Storage) |
| `team` | Team/committee member profiles |
| `operational_committee` | Operational committee members |
| `special_causes` | Fundraising causes |
| `news_updates` | News & announcements |
| `analytics_events` | Page-view / interaction analytics |
| `analytics_daily` | Aggregated daily analytics |
| `payment_settings` | Admin-configurable payment options |
| `role_permissions` | RBAC permission matrix |
| `role_invitations` | Pending role invitations |
| `seo_meta` | Per-page SEO overrides |
| `stripe_product_mappings` | Stripe product ↔ internal plan mapping |

**Member code format:** `HAI-MMYYY-XXXX` (auto-generated via trigger, migration 084).

**RLS:** All tables use Row Level Security. Anonymous users get read-only access on public content. Admin operations require `service_role` key (used in Netlify Functions only — never exposed to the browser).

---

## Netlify Functions — API Surface

Functions are called from the frontend as `/.netlify/functions/<name>`.

| Function | Method | Purpose |
|----------|--------|---------|
| `stripe-webhook` | POST | Handle Stripe events (checkout complete, invoice paid, subscription events) |
| `create-checkout-session` | POST | Create Stripe Checkout session for membership/donations |
| `create-payment-intent` | POST | Create Stripe PaymentIntent for direct payments |
| `contact-submit` | POST | Send contact form email via Nodemailer |
| `rsvp-submit` | POST | Submit event RSVP (free) |
| `rsvp-export` | GET | Admin: export RSVPs as CSV |
| `ticket-submit` | POST | Submit paid ticket booking |
| `admin-users` | GET/POST | Admin: list/manage users |
| `activate-role` | POST | Activate a role invitation |
| `role-permissions` | GET/POST | Get/update RBAC permissions |
| `analytics-track` | POST | Track analytics event |
| `payment-config` | GET | Get payment configuration |
| `payment-settings` | GET/PUT | Admin: manage payment settings |
| `stripe-products` | GET | Fetch Stripe products |
| `stripe-mappings` | GET/POST | Manage Stripe product mappings |
| `sync-membership-plans` | POST | Sync membership plans from Stripe |
| `sync-plans-from-mappings` | POST | Sync plans using mapping table |
| `fetch-og-image` | GET | Proxy OG image fetch (CORS workaround) |

---

## Stripe Integration

- **Modes:** `STRIPE_MODE=live` in production, `STRIPE_MODE=test` in deploy previews (set in `netlify.toml`)
- **Membership:** Annual plan (€20) + optional monthly contribution tiers (Shraddha €21, Seva €51, Bhakti €108, Custom)
- **Donations:** One-off and recurring via Checkout Sessions
- **Tickets:** Paid event tickets via PaymentIntent
- **Webhook secret:** `STRIPE_WEBHOOK_SECRET` env var — verified in `stripe-webhook.ts`

---

## Authentication & Roles

- **Auth provider:** Supabase Auth (email/password)
- **Roles (stored in `app_metadata.role`):**
  - `super_admin` — full access
  - `admin` — most admin access
  - `finance` — payment/receipt views
  - `community_manager` — member CRUD
- **Role activation:** Via invite link → `/activate-role` page → `activate-role` function
- **Admin guard:** `src/lib/auth.tsx` provides `AuthContext`; admin pages check role before rendering

---

## Design System

| Token | Value |
|-------|-------|
| Primary colour | `#C75B12` (warm brown/orange) |
| Secondary colour | `#6B6B6B` (neutral gray) |
| Border radius | `8px` default |
| Box shadow | `0px 2px 4px rgba(0,0,0,0.1)` |
| H1 | 48px / weight 700 / Merriweather serif |
| H2 | 36px / weight 600 |
| Body | 18px / weight 400 / Inter sans-serif |
| Small | 14px |

CSS tokens live in `src/styles/theme.css`. Tailwind config extends via `tailwind.config.js`.

Components use shadcn/ui conventions — edit primitives in `src/components/ui/`.

---

## Environment Variables

### Frontend (Vite — prefix `VITE_`)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Netlify Functions (server-side only)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin) |
| `STRIPE_SECRET_KEY_LIVE` | Stripe live secret key |
| `STRIPE_SECRET_KEY_TEST` | Stripe test secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_MODE` | `live` or `test` (set by netlify.toml context) |
| `EMAIL_USER` | SMTP sender address |
| `EMAIL_PASS` | SMTP password |
| `SMTP_HOST` | SMTP host |

> Never expose `SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` to the browser bundle.

---

## Dev Commands

```bash
npm run dev          # Start Vite dev server (port 5000 default)
npm run build        # TypeScript check + Vite build → dist/
npm run preview      # Preview production build
npm run gallery:upload  # Upload gallery images to Supabase Storage
```

To run Netlify Functions locally, use the Netlify CLI:
```bash
netlify dev          # Starts frontend + functions together
```

---

## Key Conventions

- **Hooks pattern:** All Supabase data access goes through custom hooks in `src/hooks/`. Each hook uses `useQuery` / `useMutation` from TanStack React Query and exports typed data + loading/error states.
- **Admin functions use service role:** Netlify Functions that perform admin writes use the `SUPABASE_SERVICE_ROLE_KEY` via a server-side Supabase client — never the anon key.
- **Stripe mode switching:** `STRIPE_MODE` env var controls which Stripe key pair is active. Functions read this at runtime; do not hardcode mode.
- **PDF receipts:** Generated client-side using `jsPDF` + `html2canvas` via `src/lib/receiptPdf.ts`.
- **Analytics:** Custom lightweight analytics table (`analytics_events`, `analytics_daily`) — not GA. Tracked via `analytics-track` function and `src/lib/analytics.ts`.
- **Media/gallery:** Images stored in Supabase Storage. Public read via anonymous grant (migration 023). Upload scripts in `scripts/`.
- **Cookie consent:** Managed via `src/hooks/useCookieConsent.ts` and `src/lib/cookieConsent.ts`. Banner in `CookieConsentBanner.tsx`.
- **CSP:** Strict Content-Security-Policy set in `netlify.toml` headers. Any new external script/style/image domain must be added there.

---

## Plan/ Docs (Reference)

The `Plan/` directory contains specification documents. They are useful for intent and requirements but may describe architecture or features not yet implemented. Always verify against the actual source code.

| Doc | Purpose |
|-----|---------|
| `Plan/PROJECT_OVERVIEW.md` | High-level goals and original architecture diagram |
| `Plan/DATABASE_SCHEMA.md` | Schema spec (compare to `supabase/migrations/` for truth) |
| `Plan/MEMBERSHIP_SYSTEM_SPECIFICATION.md` | Membership feature spec |
| `Plan/DESIGN_DOCUMENT.md` | UI/UX design guidelines and tokens |
| `Plan/API_ENDPOINTS.md` | API design intent |
| `Plan/ADMIN_PORTAL.md` | Admin portal requirements |
| `Plan/PAYMENT_SETUP.md` | Stripe payment setup guide |
| `Plan/PHASE2_PLAN.md` | Future: migrate functions to Supabase Edge Functions |
| `Plan/SECURITY.md` | Security hardening notes |
| `Plan/PRODUCTION_DEPLOYMENT_CHECKLIST.md` | Go-live checklist |

---

*Last updated: 2026-06-24*
