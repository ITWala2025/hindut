-- Migration: Seed membership plans with full catalog data
-- Date: 2026-06-02
-- Purpose: Update all plans with proper categories, benefits, icons, gradients, etc.

-- Update Annual Plan
update public.membership_plans
set
  name = 'Annual Membership',
  description = 'A full year of spiritual community membership — directly supporting the Hindu Temple Project in Limerick.',
  benefits = '["Monthly Nama-Nakshatra Archana","Annual special-occasion Archana","Karpaga Vriksham leaf entry","Community newsletter & event invitations","Full AGM voting rights","Annual report and tax receipt"]',
  popular = true,
  sort_order = 1,
  category = 'membership',
  cadence = 'annual',
  subtitle = 'Core membership',
  icon = 'Crown',
  gradient = 'from-orange-500 to-amber-500',
  bg_gradient = 'from-orange-50 to-amber-50',
  border_color = 'border-orange-200',
  active = true
where id = 'annual';

-- Update/Insert Shraddha (Monthly Giving)
insert into public.membership_plans (
  id, name, duration_label, duration_months, price_eur,
  description, benefits, popular, sort_order,
  category, cadence, subtitle, icon, gradient, bg_gradient, border_color, active
) values (
  'shraddha',
  'Shraddha',
  '1 Month',
  1,
  22.00,
  'Support weekly prayers and monthly community satsang.',
  '["Monthly Nama-Nakshatra Archana","Community newsletter","Satsang invitations"]',
  false,
  10,
  'giving',
  'monthly',
  'Faith',
  'Flame',
  'from-orange-500 to-rose-500',
  'from-orange-50 to-rose-50',
  'border-orange-200',
  true
)
on conflict (id) do update set
  name = excluded.name,
  duration_label = excluded.duration_label,
  duration_months = excluded.duration_months,
  price_eur = excluded.price_eur,
  description = excluded.description,
  benefits = excluded.benefits,
  popular = excluded.popular,
  sort_order = excluded.sort_order,
  category = excluded.category,
  cadence = excluded.cadence,
  subtitle = excluded.subtitle,
  icon = excluded.icon,
  gradient = excluded.gradient,
  bg_gradient = excluded.bg_gradient,
  border_color = excluded.border_color,
  active = excluded.active;

-- Update/Insert Seva (Monthly Giving)
insert into public.membership_plans (
  id, name, duration_label, duration_months, price_eur,
  description, benefits, popular, sort_order,
  category, cadence, subtitle, icon, gradient, bg_gradient, border_color, active
) values (
  'seva',
  'Seva',
  '1 Month',
  1,
  50.00,
  'Help maintain our community hall and support weekly cultural programs.',
  '["All Shraddha tier benefits","Monthly special puja dedication","Quarterly donor report","Recognition in community newsletter"]',
  true,
  11,
  'giving',
  'monthly',
  'Service',
  'HandCoins',
  'from-emerald-500 to-teal-500',
  'from-emerald-50 to-teal-50',
  'border-emerald-200',
  true
)
on conflict (id) do update set
  name = excluded.name,
  duration_label = excluded.duration_label,
  duration_months = excluded.duration_months,
  price_eur = excluded.price_eur,
  description = excluded.description,
  benefits = excluded.benefits,
  popular = excluded.popular,
  sort_order = excluded.sort_order,
  category = excluded.category,
  cadence = excluded.cadence,
  subtitle = excluded.subtitle,
  icon = excluded.icon,
  gradient = excluded.gradient,
  bg_gradient = excluded.bg_gradient,
  border_color = excluded.border_color,
  active = excluded.active;

-- Update/Insert Bhakti (Monthly Giving)
insert into public.membership_plans (
  id, name, duration_label, duration_months, price_eur,
  description, benefits, popular, sort_order,
  category, cadence, subtitle, icon, gradient, bg_gradient, border_color, active
) values (
  'bhakti',
  'Bhakti',
  '1 Month',
  1,
  100.00,
  'Champion supporter of the Limerick Hindu Temple project.',
  '["All Seva tier benefits","Founding donor recognition plaque","Priority event seating","Invitation to annual donor appreciation dinner","Direct updates from temple committee"]',
  false,
  12,
  'giving',
  'monthly',
  'Devotion',
  'Star',
  'from-violet-500 to-purple-500',
  'from-violet-50 to-purple-50',
  'border-violet-200',
  true
)
on conflict (id) do update set
  name = excluded.name,
  duration_label = excluded.duration_label,
  duration_months = excluded.duration_months,
  price_eur = excluded.price_eur,
  description = excluded.description,
  benefits = excluded.benefits,
  popular = excluded.popular,
  sort_order = excluded.sort_order,
  category = excluded.category,
  cadence = excluded.cadence,
  subtitle = excluded.subtitle,
  icon = excluded.icon,
  gradient = excluded.gradient,
  bg_gradient = excluded.bg_gradient,
  border_color = excluded.border_color,
  active = excluded.active;

-- Update/Insert Custom Amount (Giving)
insert into public.membership_plans (
  id, name, duration_label, duration_months, price_eur,
  description, benefits, popular, sort_order,
  category, cadence, subtitle, icon, gradient, bg_gradient, border_color, active
) values (
  'custom',
  'Custom Amount',
  '1 Month',
  1,
  0,
  'Choose your own monthly contribution amount.',
  '["Flexible contribution amount","All standard membership benefits","Monthly tax receipt"]',
  false,
  20,
  'giving',
  'monthly',
  'Your choice',
  'Sparkle',
  'from-slate-500 to-slate-600',
  'from-slate-50 to-slate-100',
  'border-slate-200',
  true
)
on conflict (id) do update set
  name = excluded.name,
  duration_label = excluded.duration_label,
  duration_months = excluded.duration_months,
  price_eur = excluded.price_eur,
  description = excluded.description,
  benefits = excluded.benefits,
  popular = excluded.popular,
  sort_order = excluded.sort_order,
  category = excluded.category,
  cadence = excluded.cadence,
  subtitle = excluded.subtitle,
  icon = excluded.icon,
  gradient = excluded.gradient,
  bg_gradient = excluded.bg_gradient,
  border_color = excluded.border_color,
  active = excluded.active;
