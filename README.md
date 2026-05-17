# Hindu Temple Website Documentation

This repository contains a complete, implementation‑ready set of markdown documents that describe the development of the Hindu Temple website (modeled after https://www.hindutemple.ie/).  The documentation is organized for a **Next.js** public site deployed on **Vercel** and a **Supabase** backend (auth, storage, database, and Phase‑2 edge functions).

## Documentation Index

| File | Description |
|------|-------------|
| [`PUBLIC_SITE.md`](PUBLIC_SITE.md) | Specification of the public‑facing site – pages, CTA, Stripe integration, media galleries, SEO, and UI wireframes |
| [`ADMIN_PORTAL.md`](ADMIN_PORTAL.md) | Admin portal requirements – auth, dashboard, membership & receipt management, event handling, role matrix |
| [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) | Supabase schema, ER diagram, column definitions, indexes, RLS policies and migration scripts |
| [`API_ENDPOINTS.md`](API_ENDPOINTS.md) | REST/Edge Function design, auth middleware, request/response examples, error handling |
| [`CODE_SNIPPETS.md`](CODE_SNIPPETS.md) | Ready‑to‑copy Next.js page templates, Stripe checkout, webhook handler, email receipt function, media upload component, admin UI components |
| [`CONFIGURATION.md`](CONFIGURATION.md) | .env example, Supabase project setup steps, Stripe dashboard configuration |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Vercel project creation, linking, CI/CD notes, SEO validation checklist |
| [`PHASE2_PLAN.md`](PHASE2_PLAN.md) | Roadmap for moving webhook & receipt logic to Supabase Edge Functions, data sync migrations |
| [`TESTING_QA.md`](TESTING_QA.md) | Unit, end‑to‑end, and accessibility testing guidelines |
| [`APPENDICES.md`](APPENDICES.md) | Full site copy, email receipt template, glossary |

All files are self‑contained, include code fences, Mermaid diagrams, and are ready to be committed to version control.

---

*Generated on {{date}}*

