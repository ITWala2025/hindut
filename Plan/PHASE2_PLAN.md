# Phase‑2 Supabase Backend Migration Plan

## Goal
Move all Stripe webhook handling, receipt generation and membership sync logic from Vercel Functions to **Supabase Edge Functions** for tighter security, lower latency and unified backend.

## Timeline (Milestones)
| Milestone | Description | Owner |
|-----------|-------------|-------|
| **M1** – Edge Function scaffolding | Create a Supabase Edge Function project, add TypeScript support, configure `supabase/functions` directory. | Backend Lead |
| **M2** – Webhook migration | Replicate `/api/stripe/webhook` logic in `functions/stripe-webhook/index.ts`. Verify signature, update `memberships`, `donations`, and trigger email via Supabase Functions. | Backend Lead |
| **M3** – Receipt generation | Move `sendReceipt` Vercel Function to `functions/email-receipt/index.ts`. Use Supabase Storage for PDF templates. | Backend Lead |
| **M4** – Data sync triggers | Add Postgres **trigger functions** (`pg_notify`) that fire on `INSERT/UPDATE` of `memberships` and `donations` to invoke the Edge Functions automatically. | DB Engineer |
| **M5** – Testing & rollout | Deploy to Supabase preview, run integration tests, switch DNS/webhook endpoint to new URL. | QA Engineer |

## Migration Steps
1. **Create Edge Function repo** – `supabase/functions/` folder, add `deno.json` with required permissions (`--allow-net`, `--allow-read`).
2. **Port webhook code** – copy the Vercel webhook handler, replace `fetch` calls with Supabase client (`supabase.from`). Use `Deno.env.get` for secrets.
3. **Update Stripe webhook URL** – in Stripe Dashboard change endpoint to `https://<project>.supabase.co/functions/v1/stripe-webhook`.
4. **Implement receipt generation** – use `pdf-lib` to generate PDF from HTML template stored in `receipt-templates` bucket, then upload to `receipts` bucket and email via SendGrid (still using the same API key).
5. **Add Postgres triggers**:
   ```sql
   create or replace function notify_membership_change() returns trigger language plpgsql as $$
   begin
     perform pg_notify('membership_change', row_to_json(NEW)::text);
     return NEW;
   end; $$;
   create trigger membership_change after insert or update on memberships
   for each row execute function notify_membership_change();
   ```
   Supabase Edge Function can listen to these notifications via `supabase.realtime`.
6. **Security review** – ensure all Edge Functions verify JWT where needed and have least‑privilege permissions.
7. **Rollback plan** – keep Vercel Functions active until the new Edge Functions are confirmed stable; route webhook to both endpoints during a grace period.

## Risks & Mitigations
* **Signature verification** – Deno runtime differs; test with Stripe test events.
* **Cold start latency** – Edge Functions are warm‑started; add warm‑up ping in CI.
* **Permission errors** – grant `service_role` key only to Edge Functions via Vercel env variables.

---

*Generated on {{date}}*

