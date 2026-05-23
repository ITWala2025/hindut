-- =============================================================================
-- Migration: 20260523000050_monthly_contributions.sql
-- Purpose : Support optional monthly contributions added during annual
--           membership checkout.
--           • memberships: add monthly_contribution_eur + monthly_stripe_sub_id
--             so the admin can see the linked recurring donation at a glance.
--           • donations: add member_id FK + stripe_subscription_id so monthly
--             contribution invoices can be reconciled back to a donation row.
-- =============================================================================

-- ── 1. memberships – monthly contribution columns ────────────────────────────
alter table public.memberships
  add column if not exists monthly_contribution_eur  numeric(12, 2),
  add column if not exists monthly_stripe_sub_id     text;

-- ── 2. donations – member link + subscription tracking ───────────────────────
alter table public.donations
  add column if not exists member_id              uuid references public.members(id) on delete set null,
  add column if not exists stripe_subscription_id text;

create index if not exists donations_member_id_idx      on public.donations (member_id);
create index if not exists donations_stripe_sub_id_idx  on public.donations (stripe_subscription_id);
