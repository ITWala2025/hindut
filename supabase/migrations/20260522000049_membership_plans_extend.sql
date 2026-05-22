-- =============================================================================
-- Migration: 20260522000049_membership_plans_extend.sql
-- Purpose : Make membership_plans the single source of truth for both annual
--           memberships and monthly giving tiers.
--           • Add cadence / category / UI styling columns.
--           • Relax memberships.plan check constraint (allow any plan id).
--           • Seed Shraddha / Seva / Bhakti monthly giving tiers.
--           Idempotent — safe to re-run.
-- =============================================================================

-- ── 1. Extend membership_plans schema ────────────────────────────────────────
alter table public.membership_plans
  add column if not exists cadence      text not null default 'annual',
  add column if not exists category     text not null default 'membership',
  add column if not exists subtitle     text,
  add column if not exists icon         text,
  add column if not exists gradient     text,
  add column if not exists bg_gradient  text,
  add column if not exists border_color text,
  add column if not exists active       boolean not null default true;

-- Replace check constraints (drop-if-exists then re-add)
alter table public.membership_plans
  drop constraint if exists membership_plans_cadence_check;
alter table public.membership_plans
  add  constraint membership_plans_cadence_check
  check (cadence in ('monthly','semi_annual','annual'));

alter table public.membership_plans
  drop constraint if exists membership_plans_category_check;
alter table public.membership_plans
  add  constraint membership_plans_category_check
  check (category in ('membership','giving'));

-- ── 2. Relax memberships.plan constraint ─────────────────────────────────────
-- Allows any plan id present in membership_plans (instead of hard-coded list).
alter table public.memberships
  drop constraint if exists memberships_plan_check;

-- ── 3. Ensure annual row has the right cadence/category ──────────────────────
update public.membership_plans
   set cadence  = 'annual',
       category = 'membership'
 where id = 'annual';

-- ── 4. Seed monthly giving tiers (Shraddha / Seva / Bhakti) ──────────────────
insert into public.membership_plans
  (id, name, duration_label, duration_months, price_eur, description, benefits,
   popular, sort_order, cadence, category, subtitle, icon, gradient,
   bg_gradient, border_color)
values
  ('shraddha',
   'Shraddha',
   'month',
   1,
   22.00,
   'Support weekly prayers and monthly community satsang.',
   '["Monthly Nama-Nakshatra Archana","Community newsletter","Satsang invitations"]'::jsonb,
   false, 10, 'monthly', 'giving',
   'Faith', 'Flame',
   'from-orange-500 to-amber-500',
   'from-orange-50 to-amber-50',
   'border-orange-200'),

  ('seva',
   'Seva',
   'month',
   1,
   35.00,
   'Fund seva activities and temple upkeep initiatives.',
   '["Monthly Nama-Nakshatra Archana","Annual special Archana","Temple seva recognition"]'::jsonb,
   true, 20, 'monthly', 'giving',
   'Service', 'Leaf',
   'from-emerald-500 to-teal-500',
   'from-emerald-50 to-teal-50',
   'border-emerald-200'),

  ('bhakti',
   'Bhakti',
   'month',
   1,
   50.00,
   'Champion our mission to build Limerick''s permanent temple.',
   '["All Seva perks","Karpaga Vriksham leaf entry","Patron recognition"]'::jsonb,
   false, 30, 'monthly', 'giving',
   'Devotion', 'Crown',
   'from-violet-500 to-purple-600',
   'from-violet-50 to-purple-50',
   'border-violet-200')
on conflict (id) do update set
  name            = excluded.name,
  duration_label  = excluded.duration_label,
  duration_months = excluded.duration_months,
  price_eur       = excluded.price_eur,
  description     = excluded.description,
  benefits        = excluded.benefits,
  popular         = excluded.popular,
  sort_order      = excluded.sort_order,
  cadence         = excluded.cadence,
  category        = excluded.category,
  subtitle        = excluded.subtitle,
  icon            = excluded.icon,
  gradient        = excluded.gradient,
  bg_gradient     = excluded.bg_gradient,
  border_color    = excluded.border_color;
