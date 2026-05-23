-- =============================================================================
-- Migration: 20260523000061_remove_pending_monthly_contribution_donations.sql
-- Purpose : Delete the phantom "pending" donation rows that were pre-created
--           during monthly-contribution subscription setup before the webhook
--           logic was fixed to only create donation records when Stripe
--           actually charges the card (invoice.paid with amount_paid > 0).
--
--           These rows have recurring=true, status='pending', and a
--           stripe_subscription_id but no stripe_payment_intent_id.
--           Safe to re-run (idempotent).
-- =============================================================================

delete from public.donations
where  recurring     = true
  and  status        = 'pending'
  and  stripe_subscription_id is not null
  and  stripe_payment_intent_id is null;
