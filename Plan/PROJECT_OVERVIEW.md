# Project Overview

## Brief Description
The Hindu Temple website is a public‑facing portal that showcases the temple’s mission, events, services, and ways to get involved (membership, donations, volunteering).  It is built with **Next.js** (React) and deployed on **Vercel** for instant global CDN delivery.  All dynamic data, authentication, storage and future backend logic are powered by **Supabase** (PostgreSQL, Auth, Storage, Edge Functions).  Payments are processed via **Stripe**, with webhook handling initially in Vercel Functions and later migrated to Supabase Edge Functions (Phase‑2).

## Goals
* Provide a fast, SEO‑optimized public site that mirrors the content and structure of https://www.hindutemple.ie/.
* Enable seamless membership sign‑ups, recurring donations and event ticket purchases.
* Offer an admin portal for staff to manage members, receipts, events and media.
* Keep the architecture server‑less and maintainable, leveraging Vercel and Supabase managed services.

## Tech Stack
| Layer | Technology |
|-------|------------|
| Front‑end | **Next.js 14** (App Router), React 18, Tailwind CSS |
| Hosting | **Vercel** (static & serverless functions) |
| Backend | **Supabase** – PostgreSQL, Auth, Storage, Edge Functions |
| Payments | **Stripe** – Checkout, Products, Prices, Webhooks |
| Email | **SendGrid** (via Vercel Function) – receipt & welcome emails |
| CI/CD | GitHub → Vercel automatic preview & production deployments |

## High‑Level Architecture Diagram (textual)
```mermaid
graph TD
    subgraph Vercel
        A[Next.js Front‑end] --> B[Public API Routes]
        B --> C[Stripe Webhook Handler]
        B --> D[Supabase Client SDK]
    end
    subgraph Supabase
        E[PostgreSQL DB] --> F[Auth Service]
        E --> G[Storage Buckets]
        E --> H[Edge Functions (Phase‑2)]
    end
    A -->|fetches data| D
    D -->|queries| E
    F -->|issues JWT| A
    C -->|writes payment status| E
    H -->|future webhook & receipt logic| E
    style Vercel fill:#f0f0f0,stroke:#333,stroke-width:2px
    style Supabase fill:#e0f7fa,stroke:#333,stroke-width:2px
```

*Requests flow:* The browser loads the Next.js site from Vercel.  API routes call Supabase for content, members and events.  Stripe Checkout is invoked client‑side; the resulting webhook is processed by a Vercel Function that updates the Supabase DB and triggers email receipts via SendGrid.  In Phase‑2 the webhook and receipt generation will be moved to Supabase Edge Functions for tighter integration.

---

*Generated on {{date}}* 

