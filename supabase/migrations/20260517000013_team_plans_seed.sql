-- =============================================================================
-- Migration: 20260517000013_team_plans_seed.sql
-- Purpose : Add missing columns, create team_members + membership_plans tables,
--           extend user_roles for admin UI, fix constraints, add public-insert
--           policies for membership signup, seed all static data into DB.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend public.events with category, time_display, ticket_tiers
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists category     text check (category in ('festival','prayer','celebration','community','cultural')),
  add column if not exists time_display text,
  add column if not exists ticket_tiers jsonb;

-- ---------------------------------------------------------------------------
-- 2. Extend public.members with email (needed for admin display + joins)
-- ---------------------------------------------------------------------------
alter table public.members
  add column if not exists email text;

-- ---------------------------------------------------------------------------
-- 3. Extend public.memberships with gateway + payment reference
-- ---------------------------------------------------------------------------
alter table public.memberships
  add column if not exists gateway   text check (gateway in ('stripe','paypal','sumup','manual')) default 'manual',
  add column if not exists reference text;

-- Fix plan check constraint to allow 'semi-annual' (matches frontend)
alter table public.memberships
  drop constraint if exists memberships_plan_check;
alter table public.memberships
  add constraint memberships_plan_check
  check (plan in ('annual','semi-annual','monthly'));

-- ---------------------------------------------------------------------------
-- 4. Extend public.user_roles with full_name + email for admin users list
-- ---------------------------------------------------------------------------
alter table public.user_roles
  add column if not exists full_name text,
  add column if not exists email     text;

-- ---------------------------------------------------------------------------
-- 5. Make receipts.related_id nullable (manual admin receipts have no FK)
-- ---------------------------------------------------------------------------
alter table public.receipts
  alter column related_id drop not null;

-- ---------------------------------------------------------------------------
-- 6. Public insert policies (membership signup without auth)
-- ---------------------------------------------------------------------------
drop policy if exists members_public_insert on public.members;
create policy members_public_insert on public.members
  for insert
  with check (user_id is null);

drop policy if exists memberships_public_insert on public.memberships;
create policy memberships_public_insert on public.memberships
  for insert
  with check (true);

-- ---------------------------------------------------------------------------
-- 7. public.team_members
-- ---------------------------------------------------------------------------
create table if not exists public.team_members (
  id          text primary key,
  name        text not null,
  origin      text,
  role        text,
  bio         text,
  sort_order  int not null default 0,
  active      boolean not null default true
);

alter table public.team_members enable row level security;

drop policy if exists team_members_public_read on public.team_members;
create policy team_members_public_read on public.team_members
  for select using (active = true);

drop policy if exists team_members_admin_all on public.team_members;
create policy team_members_admin_all on public.team_members
  for all
  using  (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 8. public.membership_plans
-- ---------------------------------------------------------------------------
create table if not exists public.membership_plans (
  id              text primary key,
  name            text not null,
  duration_label  text not null,
  duration_months int  not null,
  price_eur       numeric(10, 2) not null,
  description     text,
  benefits        jsonb not null default '[]',
  popular         boolean not null default false,
  sort_order      int not null default 0
);

alter table public.membership_plans enable row level security;

drop policy if exists membership_plans_public_read on public.membership_plans;
create policy membership_plans_public_read on public.membership_plans
  for select using (true);

drop policy if exists membership_plans_admin_all on public.membership_plans;
create policy membership_plans_admin_all on public.membership_plans
  for all
  using  (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 9. Security-definer function: list admin users (admin-only)
-- ---------------------------------------------------------------------------
create or replace function public.list_admin_users()
returns table(
  id         uuid,
  email      text,
  full_name  text,
  role       text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select ur.user_id, au.email, ur.full_name, ur.role, ur.created_at
  from   public.user_roles ur
  join   auth.users au on au.id = ur.user_id
  where  public.current_user_role() = 'admin';
$$;

grant execute on function public.list_admin_users() to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Seed: events (only if table is empty)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.events limit 1) then
    insert into public.events
      (title, description, start_date, location, category, time_display, is_paid, ticket_price_eur, published)
    values
      ('Sri Rama Navami',
       'Celebrating the birth of Lord Rama with bhajans, abhishekam and community prasad.',
       '2026-03-21 10:00:00+00', 'Ahane Hall, Limerick',
       'festival', '10:00 AM - 1:00 PM', false, null, true),

      ('Hindu New Year',
       'Ugadi / Gudi Padwa celebration welcoming the new year with prayers and panchanga shravanam.',
       '2026-04-25 11:00:00+00', 'Ahane Hall, Limerick',
       'festival', '11:00 AM - 2:00 PM', false, null, true),

      ('Akshaya Tritiya',
       'Auspicious day of prosperity — special Lakshmi puja and community gathering.',
       '2026-05-09 10:30:00+00', 'Ahane Hall, Limerick',
       'prayer', '10:30 AM - 1:00 PM', false, null, true),

      ('Monthly Community Prayer',
       'Our regular community satsang with bhajans, arati and shared vegetarian meal.',
       '2026-06-06 16:00:00+00', 'Ahane Hall, Limerick',
       'prayer', '4:00 PM - 7:00 PM', false, null, true),

      ('Ahane Yoga Day',
       'International Day of Yoga — open-air yoga session, pranayama and meditation for all ages.',
       '2026-06-21 08:00:00+00', 'Ahane Grounds, Limerick',
       'community', '8:00 AM - 11:00 AM', false, null, true),

      ('Monthly Community Prayer',
       'Our regular community satsang with bhajans, arati and shared vegetarian meal.',
       '2026-07-11 16:00:00+00', 'Ahane Hall, Limerick',
       'prayer', '4:00 PM - 7:00 PM', false, null, true),

      ('Independence Day Celebration',
       'Cultural programme marking Indian Independence Day with patriotic songs, dance and food.',
       '2026-08-15 15:00:00+00', 'Ahane Hall, Limerick',
       'cultural', '3:00 PM - 7:00 PM', false, null, true),

      ('Onam, Varalakshmi Vratam & Krishna Janmashtami',
       'A combined celebration honouring three traditions — pookalam, Varalakshmi puja and midnight Janmashtami arati.',
       '2026-08-22 11:00:00+00', 'Ahane Hall, Limerick',
       'festival', '11:00 AM - 10:00 PM', false, null, true),

      ('Ganesh Chaturthi',
       'Welcoming Lord Ganesha with sthapana, ganapati homam and community celebration.',
       '2026-09-12 10:00:00+00', 'Pallaskenry Community Centre, Co. Limerick',
       'festival', '10:00 AM - 4:00 PM', false, null, true),

      ('Dussehra',
       'Vijayadashami celebration marking the victory of good over evil with Saraswati puja and cultural performances.',
       '2026-10-02 17:00:00+00', 'Ahane Hall, Limerick',
       'festival', '5:00 PM - 9:00 PM', false, null, true),

      ('Diwali Festival Celebration',
       'Annual Diwali cultural night — dance, music, fireworks display and traditional dinner.',
       '2026-11-07 17:00:00+00', 'Ahane Hall, Limerick',
       'celebration', '5:00 PM - 10:00 PM', true, 15.00, true),

      ('Diwali Special Prayer',
       'Lakshmi puja, deep daan and special prayers on the auspicious evening of Diwali.',
       '2026-11-14 18:00:00+00', 'Mungret Community Centre, Limerick',
       'prayer', '6:00 PM - 9:00 PM', false, null, true),

      ('Monthly Community Prayer',
       'Year-end community satsang with bhajans, arati and shared vegetarian meal.',
       '2026-12-12 16:00:00+00', 'Mungret Community Centre, Limerick',
       'prayer', '4:00 PM - 7:00 PM', false, null, true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 11. Seed: team_members
-- ---------------------------------------------------------------------------
insert into public.team_members (id, name, origin, role, bio, sort_order) values
  ('amit-singh',             'Amit Singh',             'Bihar, India',           'Leadership Coach',                'Based in Ireland, providing coaching and support services to a wide range of industries across Ireland and Europe.',                                                                                                                                 1),
  ('babu-baskaran',          'Babu Baskaran',          'Kerala & Tamil Nadu, India', 'Financial System Manager',   'Based in Limerick, serving the Tamil, Malayalam and Irish communities through dedicated community work and cultural initiatives.',                                                                                                             2),
  ('karthik-vashisth',       'Karthik Vashisth',       'Karnataka, India',       'Tech Founder, Avinya Technology','Limerick resident, mentoring international students and serving as an active organiser with Irish Kannadigara Sangha and Indian Cultural Association (ICAL) to support the diaspora.',                                                         3),
  ('krishnam-raju-nimala',   'Krishnam Raju Nimala',   'Telangana, India',       'Business',                        'Living in Limerick, serving the Telugu community and all Indians.',                                                                                                                                                                          4),
  ('namit-sikka',            'Namit Sikka',            'Haryana, India',         'Regional Brand & Sales Head',     'Living in Limerick, serving all the communities in Limerick through ICAL.',                                                                                                                                                                  5),
  ('pradeep-ramnath',        'Pradeep Ramnath',        'Kerala, India',          'CNC Programmer and Operator',     'Based in Shannon, Co. Clare, serving the Malayalam, Hindi, Tamil and Irish communities through dedicated community work and cultural engagement.',                                                                                           6),
  ('dr-parameswaran-iyer',   'Dr. Parameswaran Iyer',  'Kerala, India',          'Consultant Neurologist',          'Living in Limerick, deeply committed to community work. An Indian away from home, guided by the motto: ''Loka Samastha Sukhino Bhavanthu — May peace be with all.''',                                                                      7),
  ('ravichandran-chinnasamy','Ravichandran Chinnasamy','Tamil Nadu, India',      'Delivery Lead',                   'Based in Limerick, actively serving the local Indian community through dedicated community work and cultural initiatives.',                                                                                                                  8),
  ('ramakrishna-mankali',    'Ramakrishna Mankali',    'Andhra Pradesh, India',  'Senior Solutions Engineer',       'Based in Limerick, serving both the Telugu and Irish communities through dedicated community work.',                                                                                                                                         9),
  ('soma-sekhar-nagella',    'Soma Sekhar Nagella',    'Andhra Pradesh, India',  'Healthcare Professional',         'Representative of the Telugu community in Limerick.',                                                                                                                                                                                       10),
  ('soumen-pahari',          'Soumen Pahari',          'West Bengal, India',     'IT Professional',                 'Living in Limerick, with a passion for hiking and community service.',                                                                                                                                                                      11),
  ('sushil-kumar',           'Sushil Kumar',           'Himachal Pradesh, India','Manager',                         'Living in Limerick, with a passion for cooking and community service.',                                                                                                                                                                     12),
  ('utpal-mondal',           'Utpal Mondal',           'West Bengal, India',     'Shop Owner',                      'Living in Limerick, actively serving the Indian community through community engagement and support.',                                                                                                                                        13)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 12. Seed: membership_plans
-- ---------------------------------------------------------------------------
insert into public.membership_plans
  (id, name, duration_label, duration_months, price_eur, description, benefits, popular, sort_order)
values
  ('monthly', 'Monthly', '1 month', 1, 4.00,
   'A flexible way to support the temple month by month.',
   '["Member newsletter","Event invitations","Voting rights at AGM (after 3 consecutive months)"]',
   false, 1),

  ('semi-annual', 'Semi-Annual', '6 months', 6, 12.00,
   'Six months of community membership at a discounted rate.',
   '["All Monthly benefits","Priority booking for paid events","Free entry to one cultural event"]',
   true, 2),

  ('annual', 'Annual', '1 year', 12, 20.00,
   'Our best value — a full year of supporting the Temple Project.',
   '["All Semi-Annual benefits","Full AGM voting rights","Annual report and tax receipt","Recognition on member wall"]',
   false, 3)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 13. Seed: receipt templates (already seeded by migration 12, kept here for
--     completeness — uses ON CONFLICT DO NOTHING so safe to re-run)
-- ---------------------------------------------------------------------------
insert into public.receipt_templates (id, name, body) values
  ('tmpl-membership', 'Membership receipt',
   '<h1>Hindu Association of Ireland</h1><p>Receipt #{{receiptId}}</p><p>Dear {{recipientName}},</p><p>Thank you for your membership contribution of €{{amount}} received on {{date}}.</p><p>{{description}}</p><p>— Hindu Association of Ireland (CHY 12345)</p>'),
  ('tmpl-donation',   'Donation receipt',
   '<h1>Hindu Association of Ireland</h1><p>Receipt #{{receiptId}}</p><p>Dear {{recipientName}},</p><p>We gratefully acknowledge your donation of €{{amount}} on {{date}} towards "{{description}}".</p><p>This receipt may be used for tax purposes.</p><p>— Hindu Association of Ireland (CHY 12345)</p>'),
  ('tmpl-event',      'Event ticket receipt',
   '<h1>Hindu Association of Ireland</h1><p>Receipt #{{receiptId}}</p><p>Dear {{recipientName}},</p><p>Your purchase of €{{amount}} for "{{description}}" on {{date}} is confirmed.</p><p>Please bring this receipt or your email confirmation to the venue.</p>')
on conflict (id) do nothing;
