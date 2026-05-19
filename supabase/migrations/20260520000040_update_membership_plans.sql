-- =============================================================================
-- Migration: 20260520000040_update_membership_plans.sql
-- Purpose : Align membership_plans table with the new MembershipPage
--           implementation.
--           • Remove the old monthly (€4) and semi-annual (€12) plans that
--             are no longer offered on the membership page.
--           • Update the annual (€20) plan with the correct benefits as per
--             the new membership page specification.
-- =============================================================================

-- ── 1. Remove deprecated plans ───────────────────────────────────────────────
delete from public.membership_plans
  where id in ('monthly', 'semi-annual');

-- ── 2. Update annual plan to match new membership page ───────────────────────
update public.membership_plans
set
  name            = 'Annual Membership',
  duration_label  = 'year',
  duration_months = 12,
  price_eur       = 20.00,
  description     = 'A full year of spiritual community membership — directly supporting the Hindu Temple Project in Limerick.',
  benefits        = '["Monthly Nama-Nakshatra Archana","Annual special-occasion Archana","Karpaga Vriksham leaf entry","Community newsletter & event invitations","Full AGM voting rights","Annual report and tax receipt"]',
  popular         = true,
  sort_order      = 1
where id = 'annual';
