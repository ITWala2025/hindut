# Configuration Guide

## Netlify environment variables (current architecture)

The app runs on **Netlify Functions + Supabase**. Both **test** and **live**
Stripe keys are stored simultaneously — the server picks the right pair at
request-time based on the hostname (see `netlify/functions/lib/stripe.ts`).

| Variable                          | Required | Purpose                                          |
| --------------------------------- | -------- | ------------------------------------------------ |
| `STRIPE_SECRET_KEY_TEST`          | ✅       | Server secret for sandbox (`sk_test_…`)          |
| `STRIPE_PUBLISHABLE_KEY_TEST`     | ✅       | Sent to browser when in test mode (`pk_test_…`)  |
| `STRIPE_WEBHOOK_SECRET_TEST`      | ✅       | Verifies signatures from the test webhook        |
| `STRIPE_SECRET_KEY_LIVE`          | ✅\*     | Server secret for production (`sk_live_…`)       |
| `STRIPE_PUBLISHABLE_KEY_LIVE`     | ✅\*     | Sent to browser when in live mode (`pk_live_…`)  |
| `STRIPE_WEBHOOK_SECRET_LIVE`      | ✅\*     | Verifies signatures from the live webhook        |
| `STRIPE_MODE`                     | optional | Force `test` or `live` regardless of host        |
| `PRODUCTION_HOSTS`                | optional | Comma-separated hostnames that count as live. Defaults to `limerickhindutemple.netlify.app`. |
| `SUPABASE_URL` / `VITE_SUPABASE_URL`             | ✅ | Supabase project URL                |
| `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`   | ✅ | Public anon key                     |
| `SUPABASE_SERVICE_ROLE_KEY`        | ✅       | Server-only key for Netlify Functions            |

\* Live values only required once you flip the production domain into live mode.

### Mode resolution order
1. `STRIPE_MODE` env var (if set, wins).
2. `payment_settings.mode_override` row in Supabase (set via Admin → Settings → Stripe payments).
3. Host detection: hostname matches `PRODUCTION_HOSTS` → `live`, otherwise → `test`.

### Stripe Dashboard setup
1. **Create two webhook endpoints** in the Stripe Dashboard pointing to
   `https://<your-site>/.netlify/functions/stripe-webhook` — one in **test**
   mode and one in **live** mode. Subscribe each to the following events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
2. Copy each webhook's signing secret into `STRIPE_WEBHOOK_SECRET_TEST` /
   `STRIPE_WEBHOOK_SECRET_LIVE`. The function automatically tries both
   secrets when verifying signatures so a single endpoint code path works
   for either mode.
3. **No product objects required** — donations use ad-hoc `price_data` and
   memberships use `price_data` with the cadence from `membership_plans`.

### Admin override
Authorised admins can visit **Admin → Settings → Stripe payments** to:
- See the current mode + Stripe account snapshot.
- Verify all six environment variables are present (without exposing values).
- Force test or live mode for end-to-end rehearsal without redeploying.

Secret keys themselves are **never editable from the UI** — they live only in
Netlify environment variables.

## Supabase Project Setup
1. **Create a new Supabase project** – choose a region close to your primary audience (e.g., EU‑West).
2. **Enable Auth** – enable Email‑Password and Magic Link providers.
3. **Create tables** – run the SQL migration script from `DATABASE_SCHEMA.md` via the Supabase SQL editor.
4. **Add RLS policies** – the policies are included in the migration script; enable them after table creation.
5. **Storage buckets** – create two public buckets:
   * `public-gallery` – for photo gallery images.
   * `videos` – for video assets.
6. **API keys** – copy the `anon` and `service_role` keys into the `.env` file.

---

*Generated on {{date}}*

