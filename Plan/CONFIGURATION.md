# Configuration Guide

## .env.example
```
# Vercel / Next.js
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Server‑side (Vercel Functions)
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
SENDGRID_API_KEY=<your-sendgrid-api-key>
VERCEL_URL=https://your-project.vercel.app

# Optional – email sender
EMAIL_FROM=no-reply@hindutemple.ie
```

## Supabase Project Setup
1. **Create a new Supabase project** – choose a region close to your primary audience (e.g., EU‑West).
2. **Enable Auth** – enable Email‑Password and Magic Link providers.
3. **Create tables** – run the SQL migration script from `DATABASE_SCHEMA.md` via the Supabase SQL editor.
4. **Add RLS policies** – the policies are included in the migration script; enable them after table creation.
5. **Storage buckets** – create two public buckets:
   * `public-gallery` – for photo gallery images.
   * `videos` – for video assets.
6. **API keys** – copy the `anon` and `service_role` keys into the `.env` file.

## Stripe Dashboard Setup
1. **Create products** for each membership plan and donation tier.
   * Annual Membership – product ID `prod_annual_membership`
   * Semi‑Annual – `prod_semi_annual`
   * Monthly – `prod_monthly`
   * Donation tiers – create separate price objects (e.g., `price_shraddha`, `price_seva`, `price_bhakti`).
2. **Configure webhook** – endpoint URL: `https://<your‑vercel‑url>/api/stripe/webhook`.
   * Add the webhook secret to `STRIPE_WEBHOOK_SECRET`.
3. **Enable email receipts** – set up SendGrid API key and verify sender domain.

---

*Generated on {{date}}*

