# Deployment Guide

## 1. Vercel Project Setup
1. Sign in to **Vercel** and click **New Project**.
2. Connect the GitHub repository that contains this documentation and the codebase.
3. In the **Framework Preset** select **Next.js**.
4. Set the **Root Directory** to the repository root (or `./` if the site lives in a sub‑folder).
5. Add the environment variables from `CONFIGURATION.md` under **Environment Variables** – make sure to mark the **Secret** ones (e.g., `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SENDGRID_API_KEY`).
6. Enable **Automatic Static Optimization** – Vercel will prerender pages at build time and serve them via the edge network.
7. Deploy – Vercel will create a preview URL for each push and a production URL for the `main` branch.

## 2. Supabase Project Provisioning
1. Create a new Supabase project and note the **URL** and **anon key**.
2. In the Supabase dashboard, go to **SQL editor** and run the migration script from `DATABASE_SCHEMA.md`.
3. Enable **Row‑Level Security** for each table (the script includes `enable rls`).
4. Add the **service_role** key to Vercel environment variables (`SUPABASE_SERVICE_ROLE_KEY`).
5. Create storage buckets `public-gallery` and `videos` (public read access).
6. Configure **Auth** – enable Email‑Password and Magic Link, set redirect URLs to your Vercel domain.

## 3. CI/CD Pipeline Notes
* **Preview Deployments** – every pull request automatically creates a preview URL on Vercel. Use this to run Lighthouse audits.
* **Linting & Type‑checking** – add a GitHub Action that runs `npm run lint && npm run type-check` on each push.
* **Testing** – the `test` script runs Jest unit tests and Cypress e2e tests (see `TESTING_QA.md`).
* **Database Migrations** – store migration SQL files in `supabase/migrations/`. After each change, run `supabase db push` locally and commit the new migration.

## 4. SEO Validation Checklist
* Run **Lighthouse** (Performance, SEO, Accessibility) on the production URL.
* Verify **structured data** using Google’s Rich Results Test for each page.
* Submit the generated `sitemap.xml` (created by `scripts/generate-sitemap.js`) to **Google Search Console**.
* Check **canonical URLs** and ensure no duplicate content.

---

*Generated on {{date}}*

