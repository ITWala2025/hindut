# Architecture.md — System Architecture & Multi-Tenant Blueprint

> **CRITICAL INSTRUCTION FOR ALL AI AGENTS & DEVELOPERS:**  
> Read this document completely before modifying or assuming anything about the database, authentication, storage, or codebase layout. The Hindu Association of Ireland (HAI) web platform operates on a **shared multi-tenant Supabase PostgreSQL database**. Every architectural layer described here is actively enforced in production.

---

## 1. High-Level System Architecture

The **Hindu Association of Ireland (HAI) Web Platform** is an enterprise single-page application (SPA) built with React 19, TypeScript, and Vite, deployed on **Netlify** (CDN edge + serverless functions), backed by **Supabase PostgreSQL 16**, and integrated with **Stripe** for payments and subscriptions.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                            │
│           Public Views (HAI Portal)  │  Admin Portal (/admin)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (React 19 / Vite 7 / React Router v7)
┌───────────────────────────────────▼────────────────────────────────────┐
│                             NETLIFY PLATFORM                           │
│  - Static Asset Edge CDN (dist/ publish directory)                     │
│  - Client Auth Layer (src/lib/auth.tsx)                                │
│    * Checks session token + app_metadata.project_id == 'hindutemple'   │
│    * Verifies role in public.user_roles (super_admin / admin / editor) │
│  - Netlify Serverless Functions (netlify/functions/)                   │
│    * admin-users.ts, activate-role.ts, stripe-webhook.ts               │
│    * contact-submit.ts, rsvp-submit.ts, ticket-submit.ts               │
└──────────────┬──────────────────────────────────────────┬──────────────┘
               │ Supabase JS SDK (public schema)          │ Stripe API
┌──────────────▼────────────────────────────────────────┐ ┌──────────────▼─────────────┐
│             SHARED SUPABASE INSTANCE                  │ │         STRIPE CLOUD        │
│     https://gsqfaguqsmnuoeuhpxro.supabase.co          │ │ Checkout, Subscriptions,    │
│ ┌───────────────────────────────────────────────────┐ │ │ Webhooks, Customer Portal   │
│ │ Shared Auth Engine: auth.users                    │ │ └─────────────────────────────┘
│ │ JWT Claims: app_metadata.project_id               │ │
│ ├─────────────────────────┬─────────────────────────┤ │
│ │  Schema: public         │  Schema: sfportal       │ │
│ │  (Hindu Temple Ireland) │  (Seamus Foy & Sons)    │ │
│ │  - 27 isolated tables   │  - 13 isolated tables   │ │
│ │  - Custom RLS policies  │  - Independent policies │ │
│ ├─────────────────────────┴─────────────────────────┤ │
│ │  Schema: shared                                   │ │
│ │  - shared.user_project_binding (user_id PK)       │ │
│ ├───────────────────────────────────────────────────┤ │
│ │  Storage Buckets:                                 │ │
│ │  - media (Public event/cause assets)              │ │
│ │  - receipts (Private PDF receipts)                │ │
│ │  - public-gallery (Community photography)         │ │
│ └───────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

---

## 2. Shared Multi-Tenant Database Architecture

The application co-exists with **Seamus Foy & Sons Portal (SFPortal)** and future projects on a single Supabase PostgreSQL 16 database instance (`gsqfaguqsmnuoeuhpxro`). Complete data and authentication segregation is guaranteed by a **3-Layer Zero-Trust Isolation Architecture**.

```
Layer 1: Schema Namespace Isolation (public vs sfportal)
       ▼
Layer 2: Cryptographic JWT Claim (app_metadata.project_id = 'hindutemple')
       ▼
Layer 3: Database & Storage Row-Level Security (RLS) Air-Gap
```

### Layer 1: Schema Namespace Isolation
- **Hindu Temple Application Tables:** Reside strictly within the **`public`** schema (e.g. `public.events`, `public.donations`, `public.members`, `public.user_roles`).
- **SFPortal Application Tables:** Reside strictly within the **`sfportal`** schema.
- Default PostgREST queries from the Hindu Temple client target `public` tables exclusively. They have zero visibility into `sfportal` tables.

### Layer 2: Irreversible 1-to-1 User Project Binding (`app_metadata`)
- A single Supabase Auth engine (`auth.users`) manages all identity credentials.
- **Tamper-Proof Project Claim:** Every Hindu Temple user has an immutable claim in `auth.users.raw_app_meta_data`:
  ```json
  {
    "project_id": "hindutemple",
    "role": "super_admin"
  }
  ```
  *(Clients cannot modify `app_metadata` from the browser; only service role calls or database triggers can write to it).*
- **Shared Binding Table (`shared.user_project_binding`):**
  - Table: `shared.user_project_binding (user_id UUID PRIMARY KEY, project_id TEXT)`
  - Enforces that a user account can belong to **exactly one project**.
- **Automated Signup Trigger (`shared.handle_user_project_binding_before` & `_after`):**
  - Automatically stamps `project_id = 'hindutemple'` on all incoming temple user registrations and records them in the shared registry.
- **Frontend & Function Air-Gap:**
  - `src/lib/auth.tsx` (`fetchAdminUser` & `login`): If an SFPortal account logs in, the session is cleared (`auth.signOut()`) and rejected with `"Access denied. Account belongs to a different project."`
  - `netlify/functions/admin-users.ts`: Rejects non-Hindu Temple tokens and filters `listUsers` so SFPortal accounts (`admin@seamusfoy.com`) are **never** displayed in Hindu Temple's user directory.

### Layer 3: Database & Storage Row-Level Security (RLS) Air-Gap
- **Table Air-Gap:** Tables in `public` (`donations`, `receipts`, `members`, `ticket_bookings`) have RLS enabled and verify `auth.uid()` against `public.user_roles`. Users without a row in `public.user_roles` receive 0 rows.
- **Storage Buckets Isolation:**
  - `media`: Public read for event banners and cause photography.
  - `receipts`: Private bucket for official donation and membership PDF receipts. Write/read restricted to Hindu Temple admins.

---

## 3. Database Schema Reference (`public`)

Key tables residing in `public`:

| Table Name | Description | Key Security / Access Model |
|:---|:---|:---|
| `public.events` | Temple calendar events & multi-slot schedules | Public read `is_active = true`; admin write |
| `public.event_rsvps` | RSVP attendee registrations | Anon insert; encrypted PII (`pgcrypto`); admin export |
| `public.ticket_bookings` | Paid event ticket bookings & attendee slots | Anon insert via Stripe webhook; encrypted PII |
| `public.donations` | General and cause-specific donations | Public checkout; admin-only financial view |
| `public.special_causes` | Fundraising appeals & relief funds | Public read `is_active = true`; admin write |
| `public.members` | Registered temple members | Admin-only view; encrypted contact info |
| `public.memberships` | Active membership records & subscriptions | Linked to Stripe subscriptions; admin view |
| `public.membership_plans`| Membership tiers & annual/monthly pricing | Public read; synced with Stripe products |
| `public.receipts` | Tax-deductible donation & membership receipts | Private PDF generation; admin/member access |
| `public.user_roles` | Staff & administrator role assignments | RBAC source of truth (`super_admin`, `admin`, `editor`) |
| `public.role_permissions`| Granular capability permission map | Admin-module action matrix |
| `public.role_invitations`| Pending staff activation tokens | Time-limited tokens; Netlify activation |
| `public.services` | Temple pujas, rituals, and priest bookings | Public catalog; admin write |
| `public.team_members` | Board of directors & operational committee | Public read; admin write |
| `public.site_settings` | Dynamic metadata, notices, and payment modes | Public read; admin write |

---

## 4. Authentication, Roles & Permissions (RBAC)

Authentication is handled via `src/lib/auth.tsx` (`useAuth` hook):

### Roles
1. **`super_admin`:** Unrestricted access across all modules. Can invite, promote, and delete users.
2. **`admin`:** Full operational access; permissions dynamically governed by `public.role_permissions`.
3. **`editor`:** Content management (Events, Media, Services, News); restricted from financial records and user access.

### Capability Matrix
Permissions are represented as `<module>:<action>` strings across 13 modules:
`analytics`, `members`, `receipts`, `events`, `rsvps`, `tickets`, `donations`, `causes`, `media`, `services`, `team`, `users`, `settings`.

---

## 5. Netlify Serverless Functions Architecture (`netlify/functions/`)

Privileged and third-party operations run inside TypeScript serverless functions on Netlify:

| Function | Route | Purpose | Security |
|:---|:---|:---|:---|
| `admin-users.ts` | `/.netlify/functions/admin-users` | List, invite, and delete admin users | `requirePermission(token, 'view'\|'create'\|'delete')` + `app_metadata.project_id == 'hindutemple'` |
| `activate-role.ts` | `/.netlify/functions/activate-role` | Validates invite token, sets role, updates `app_metadata` | Token validation + one-time activation |
| `stripe-webhook.ts`| `/.netlify/functions/stripe-webhook` | Listens for Stripe payments, issues receipts, inserts bookings | Stripe cryptographic webhook signature check |
| `create-checkout-session.ts` | `/.netlify/functions/create-checkout-session` | Creates Stripe Checkout session for tickets/donations | Input validation via Zod |
| `rsvp-submit.ts` | `/.netlify/functions/rsvp-submit` | Saves RSVP and dispatches multi-slot calendar `.ics` emails | Rate limiting + input validation |
| `ticket-resend-confirmation.ts` | `/.netlify/functions/ticket-resend-confirmation` | Resends ticket confirmation and PDF receipts | Bearer token + admin permission |

---

## 6. Security, PII & Compliance Standards

- **PII Encryption at Rest:** Contact phone numbers and email addresses in `event_rsvps` and `ticket_bookings` are encrypted using PostgreSQL `pgcrypto` functions.
- **Admin PII Masking:** Contact fields in admin tables display masked values (`jo***@domain.com`) unless viewed via an authorized decrypted export.
- **Timezone Standardization:** All event schedules, ticket booking slots, and receipt issuance timestamps are formatted strictly in Irish Standard Time (**`Europe/Dublin`** / `en-IE`).
- **Currency:** All financial transactions, Stripe Checkout sessions, and receipts are denominated strictly in Euros (**EUR €**).
- **Environment Isolation:** Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`) reside exclusively in Netlify environment variables and are **never** bundled into the client build.
