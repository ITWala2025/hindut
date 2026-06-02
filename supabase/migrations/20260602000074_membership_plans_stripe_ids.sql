-- =============================================================================
-- Migration: 20260602000074_membership_plans_stripe_ids.sql
-- Purpose : Add Stripe product-catalogue columns to membership_plans so each
--           plan can be linked to a pre-created Stripe Product + Price in both
--           test and live modes.
--
--   stripe_product_id_test  — prod_xxx  (Stripe test-mode Product ID)
--   stripe_price_id_test    — price_xxx (Stripe test-mode Price ID)
--   stripe_product_id_live  — prod_xxx  (Stripe live-mode Product ID)
--   stripe_price_id_live    — price_xxx (Stripe live-mode Price ID)
--
-- When create-checkout-session runs it picks stripe_price_id_test or
-- stripe_price_id_live depending on the active Stripe mode, and passes
-- { price: priceId, quantity: 1 } instead of inline price_data.
-- Falls back to inline price_data when the column is NULL (backward compat).
--
-- IDs are written by /.netlify/functions/sync-membership-plans (POST).
-- =============================================================================

alter table public.membership_plans
  add column if not exists stripe_product_id_test  text,
  add column if not exists stripe_price_id_test     text,
  add column if not exists stripe_product_id_live   text,
  add column if not exists stripe_price_id_live     text;

-- Fast reverse-lookup: given a Stripe price_id find the plan (used by webhook).
create index if not exists idx_mp_stripe_price_test
  on public.membership_plans (stripe_price_id_test)
  where stripe_price_id_test is not null;

create index if not exists idx_mp_stripe_price_live
  on public.membership_plans (stripe_price_id_live)
  where stripe_price_id_live is not null;

-- Grant service_role write access (used by sync function via supabaseAdmin).
grant select, insert, update on public.membership_plans to service_role;
