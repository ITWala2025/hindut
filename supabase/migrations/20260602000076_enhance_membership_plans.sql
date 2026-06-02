-- Migration: Enhance membership_plans table with additional attributes
-- Date: 2026-06-02
-- Purpose: Add columns for icon, gradient, subtitle, category, cadence, and Stripe IDs to support full plan details

-- Add new columns if they don't exist
alter table public.membership_plans
  add column if not exists stripe_product_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_mode text,
  add column if not exists subtitle text,
  add column if not exists icon text,
  add column if not exists gradient text,
  add column if not exists bg_gradient text,
  add column if not exists border_color text,
  add column if not exists category text not null default 'membership',
  add column if not exists cadence text not null default 'annual',
  add column if not exists active boolean not null default true;

-- Add index for active plans and Stripe lookups
create index if not exists idx_membership_plans_active on public.membership_plans(active);
create index if not exists idx_membership_plans_category on public.membership_plans(category);
create index if not exists idx_membership_plans_stripe_price on public.membership_plans(stripe_price_id, stripe_mode);
