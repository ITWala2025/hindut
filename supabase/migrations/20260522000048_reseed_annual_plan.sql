-- =============================================================================
-- Migration: 20260522000048_reseed_annual_plan.sql
-- Purpose : Re-insert the Annual Membership row into public.membership_plans
--           after it was accidentally deleted from the table.
--           Idempotent — uses ON CONFLICT DO UPDATE so re-running is safe and
--           also repairs the row if it exists with stale values.
-- =============================================================================

insert into public.membership_plans
  (id, name, duration_label, duration_months, price_eur, description, benefits, popular, sort_order)
values
  ('annual',
   'Annual Membership',
   'year',
   12,
   20.00,
   'A full year of spiritual community membership — directly supporting the Hindu Temple Project in Limerick.',
   '["Monthly Nama-Nakshatra Archana","Annual special-occasion Archana","Karpaga Vriksham leaf entry","Community newsletter & event invitations","Full AGM voting rights","Annual report and tax receipt"]'::jsonb,
   true,
   1)
on conflict (id) do update set
  name            = excluded.name,
  duration_label  = excluded.duration_label,
  duration_months = excluded.duration_months,
  price_eur       = excluded.price_eur,
  description     = excluded.description,
  benefits        = excluded.benefits,
  popular         = excluded.popular,
  sort_order      = excluded.sort_order;
