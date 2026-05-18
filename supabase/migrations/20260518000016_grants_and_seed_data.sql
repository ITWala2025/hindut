-- =============================================================================
-- Migration: 20260518000016_grants_and_seed_data.sql
-- Purpose : (1) Ensure current_user_role() helper exists.
--           (2) Add missing columns from migration 013 (safe if already done).
--           (3) Grant table-level permissions to authenticated + anon roles.
--           (4) Seed members, memberships, receipts, and media with sample data.
-- Run this in the Supabase SQL Editor. Fully idempotent — safe to re-run.
-- =============================================================================

-- ─── 1. current_user_role() ──────────────────────────────────────────────────
-- Required by all RLS policies. SECURITY DEFINER so it bypasses RLS when
-- reading user_roles.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

grant execute on function public.current_user_role() to anon, authenticated;

-- ─── 2. Schema additions (idempotent) ────────────────────────────────────────

-- events extras (migration 013)
alter table public.events
  add column if not exists category     text check (category in ('festival','prayer','celebration','community','cultural')),
  add column if not exists time_display text,
  add column if not exists ticket_tiers jsonb;

-- members: add email column
alter table public.members
  add column if not exists email text;

-- memberships: add gateway + reference; fix plan constraint
alter table public.memberships
  add column if not exists gateway   text check (gateway in ('stripe','paypal','sumup','manual')) default 'manual',
  add column if not exists reference text;

alter table public.memberships
  drop constraint if exists memberships_plan_check;
alter table public.memberships
  add constraint memberships_plan_check
  check (plan in ('annual','semi-annual','monthly'));

-- receipts: make related_id nullable (manual receipts have no FK)
alter table public.receipts
  alter column related_id drop not null;

-- user_roles: add full_name + email (migration 013)
alter table public.user_roles
  add column if not exists full_name text,
  add column if not exists email     text;

-- team_members table
create table if not exists public.team_members (
  id         text primary key,
  name       text not null,
  origin     text,
  role       text,
  bio        text,
  sort_order int  not null default 0,
  active     boolean not null default true
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

-- membership_plans table
create table if not exists public.membership_plans (
  id              text primary key,
  name            text not null,
  duration_label  text not null,
  duration_months int  not null,
  price_eur       numeric(10,2) not null,
  description     text,
  benefits        jsonb not null default '[]',
  popular         boolean not null default false,
  sort_order      int   not null default 0
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

-- ─── 3. Table-level GRANTs ────────────────────────────────────────────────────
-- RLS policies alone are insufficient — the role also needs table-level grants.

grant select, insert, update, delete on public.members          to authenticated;
grant select, insert, update, delete on public.memberships      to authenticated;
grant select, insert, update, delete on public.events           to authenticated;
grant select, insert, update, delete on public.donations        to authenticated;
grant select, insert, update, delete on public.tickets          to authenticated;
grant select, insert, update, delete on public.receipts         to authenticated;
grant select, insert, update, delete on public.receipt_templates to authenticated;
grant select, insert, update, delete on public.media            to authenticated;
grant select, insert, update, delete on public.team_members     to authenticated;
grant select, insert, update, delete on public.membership_plans to authenticated;
grant select                         on public.team_members     to anon;
grant select                         on public.membership_plans to anon;
grant select                         on public.events           to anon;
grant select                         on public.receipt_templates to authenticated;

-- ─── 4. Seed: membership_plans ───────────────────────────────────────────────
insert into public.membership_plans
  (id, name, duration_label, duration_months, price_eur, description, benefits, popular, sort_order)
values
  ('monthly',     'Monthly',     '1 month',  1,  4.00,
   'A flexible way to support the temple month by month.',
   '["Member newsletter","Event invitations","Voting rights at AGM (after 3 consecutive months)"]',
   false, 1),
  ('semi-annual', 'Semi-Annual', '6 months', 6, 12.00,
   'Six months of community membership at a discounted rate.',
   '["All Monthly benefits","Priority booking for paid events","Free entry to one cultural event"]',
   true, 2),
  ('annual',      'Annual',      '1 year',  12, 20.00,
   'Our best value — a full year of supporting the Temple Project.',
   '["All Semi-Annual benefits","Full AGM voting rights","Annual report and tax receipt","Recognition on member wall"]',
   false, 3)
on conflict (id) do nothing;

-- ─── 5. Seed: receipt_templates ──────────────────────────────────────────────
insert into public.receipt_templates (id, name, body) values
  ('tmpl-membership', 'Membership receipt',
   '<h1>Hindu Association of Ireland</h1><p>Receipt #{{receiptId}}</p><p>Dear {{recipientName}},</p><p>Thank you for your membership contribution of €{{amount}} received on {{date}}.</p><p>{{description}}</p><p>— Hindu Association of Ireland</p>'),
  ('tmpl-donation',   'Donation receipt',
   '<h1>Hindu Association of Ireland</h1><p>Receipt #{{receiptId}}</p><p>Dear {{recipientName}},</p><p>We gratefully acknowledge your donation of €{{amount}} on {{date}} towards "{{description}}".</p><p>This receipt may be used for tax purposes.</p><p>— Hindu Association of Ireland</p>'),
  ('tmpl-event',      'Event ticket receipt',
   '<h1>Hindu Association of Ireland</h1><p>Receipt #{{receiptId}}</p><p>Dear {{recipientName}},</p><p>Your purchase of €{{amount}} for "{{description}}" on {{date}} is confirmed.</p><p>Please bring this receipt or your email confirmation to the venue.</p>')
on conflict (id) do nothing;

-- ─── 6. Seed: team_members ───────────────────────────────────────────────────
insert into public.team_members (id, name, origin, role, bio, sort_order) values
  ('amit-singh',              'Amit Singh',             'Bihar, India',               'Leadership Coach',                   'Based in Ireland, providing coaching and support services to a wide range of industries across Ireland and Europe.',                                                                       1),
  ('babu-baskaran',           'Babu Baskaran',          'Kerala & Tamil Nadu, India',  'Financial System Manager',           'Based in Limerick, serving the Tamil, Malayalam and Irish communities through dedicated community work and cultural initiatives.',                                                     2),
  ('karthik-vashisth',        'Karthik Vashisth',       'Karnataka, India',            'Tech Founder, Avinya Technology',    'Limerick resident, mentoring international students and serving as an active organiser with Irish Kannadigara Sangha and ICAL.',                                                        3),
  ('krishnam-raju-nimala',    'Krishnam Raju Nimala',   'Telangana, India',            'Business',                           'Living in Limerick, serving the Telugu community and all Indians.',                                                                                                                    4),
  ('namit-sikka',             'Namit Sikka',            'Haryana, India',              'Regional Brand & Sales Head',        'Living in Limerick, serving all the communities in Limerick through ICAL.',                                                                                                           5),
  ('pradeep-ramnath',         'Pradeep Ramnath',        'Kerala, India',               'CNC Programmer and Operator',        'Based in Shannon, Co. Clare, serving the Malayalam, Hindi, Tamil and Irish communities through dedicated community work.',                                                            6),
  ('dr-parameswaran-iyer',    'Dr. Parameswaran Iyer',  'Kerala, India',               'Consultant Neurologist',             'Living in Limerick, deeply committed to community work. Guided by the motto: Loka Samastha Sukhino Bhavanthu.',                                                                      7),
  ('ravichandran-chinnasamy', 'Ravichandran Chinnasamy','Tamil Nadu, India',           'Delivery Lead',                      'Based in Limerick, actively serving the local Indian community through dedicated community work and cultural initiatives.',                                                            8),
  ('ramakrishna-mankali',     'Ramakrishna Mankali',    'Andhra Pradesh, India',       'Senior Solutions Engineer',          'Based in Limerick, serving both the Telugu and Irish communities through dedicated community work.',                                                                                   9),
  ('soma-sekhar-nagella',     'Soma Sekhar Nagella',    'Andhra Pradesh, India',       'Healthcare Professional',            'Representative of the Telugu community in Limerick.',                                                                                                                                  10),
  ('soumen-pahari',           'Soumen Pahari',          'West Bengal, India',          'IT Professional',                    'Living in Limerick, with a passion for hiking and community service.',                                                                                                                11),
  ('sushil-kumar',            'Sushil Kumar',           'Himachal Pradesh, India',     'Manager',                            'Living in Limerick, with a passion for cooking and community service.',                                                                                                               12),
  ('utpal-mondal',            'Utpal Mondal',           'West Bengal, India',          'Shop Owner',                         'Living in Limerick, actively serving the Indian community through community engagement and support.',                                                                                  13)
on conflict (id) do nothing;

-- ─── 7. Seed: events ─────────────────────────────────────────────────────────
insert into public.events
  (title, description, start_date, location, category, time_display, is_paid, ticket_price_eur)
select title, description, start_date, location, category, time_display, is_paid, ticket_price_eur from (values
  ('Sri Rama Navami',
   'Celebrating the birth of Lord Rama with bhajans, abhishekam and community prasad.',
   '2026-03-21 10:00:00+00'::timestamptz, 'Ahane Hall, Limerick',
   'festival', '10:00 AM - 1:00 PM', false, null::numeric),
  ('Hindu New Year',
   'Ugadi / Gudi Padwa celebration welcoming the new year with prayers and panchanga shravanam.',
   '2026-04-25 11:00:00+00'::timestamptz, 'Ahane Hall, Limerick',
   'festival', '11:00 AM - 2:00 PM', false, null::numeric),
  ('Akshaya Tritiya',
   'Auspicious day of prosperity — special Lakshmi puja and community gathering.',
   '2026-05-09 10:30:00+00'::timestamptz, 'Ahane Hall, Limerick',
   'prayer', '10:30 AM - 1:00 PM', false, null::numeric),
  ('Monthly Community Prayer',
   'Our regular community satsang with bhajans, arati and shared vegetarian meal.',
   '2026-06-06 16:00:00+00'::timestamptz, 'Ahane Hall, Limerick',
   'prayer', '4:00 PM - 7:00 PM', false, null::numeric),
  ('Ahane Yoga Day',
   'International Day of Yoga — open-air yoga session, pranayama and meditation for all ages.',
   '2026-06-21 08:00:00+00'::timestamptz, 'Ahane Grounds, Limerick',
   'community', '8:00 AM - 11:00 AM', false, null::numeric),
  ('Independence Day Celebration',
   'Cultural programme marking Indian Independence Day with patriotic songs, dance and food.',
   '2026-08-15 15:00:00+00'::timestamptz, 'Ahane Hall, Limerick',
   'cultural', '3:00 PM - 7:00 PM', false, null::numeric),
  ('Onam, Varalakshmi Vratam & Krishna Janmashtami',
   'A combined celebration honouring three traditions — pookalam, Varalakshmi puja and midnight Janmashtami arati.',
   '2026-08-22 11:00:00+00'::timestamptz, 'Ahane Hall, Limerick',
   'festival', '11:00 AM - 10:00 PM', false, null::numeric),
  ('Ganesh Chaturthi',
   'Welcoming Lord Ganesha with sthapana, ganapati homam and community celebration.',
   '2026-09-12 10:00:00+00'::timestamptz, 'Pallaskenry Community Centre, Co. Limerick',
   'festival', '10:00 AM - 4:00 PM', false, null::numeric),
  ('Dussehra',
   'Vijayadashami celebration marking the victory of good over evil with Saraswati puja and cultural performances.',
   '2026-10-02 17:00:00+00'::timestamptz, 'Ahane Hall, Limerick',
   'festival', '5:00 PM - 9:00 PM', false, null::numeric),
  ('Diwali Festival Celebration',
   'Annual Diwali cultural night — dance, music, fireworks display and traditional dinner.',
   '2026-11-07 17:00:00+00'::timestamptz, 'Ahane Hall, Limerick',
   'celebration', '5:00 PM - 10:00 PM', true, 15.00),
  ('Diwali Special Prayer',
   'Lakshmi puja, deep daan and special prayers on the auspicious evening of Diwali.',
   '2026-11-14 18:00:00+00'::timestamptz, 'Mungret Community Centre, Limerick',
   'prayer', '6:00 PM - 9:00 PM', false, null::numeric),
  ('Monthly Community Prayer — December',
   'Year-end community satsang with bhajans, arati and shared vegetarian meal.',
   '2026-12-12 16:00:00+00'::timestamptz, 'Mungret Community Centre, Limerick',
   'prayer', '4:00 PM - 7:00 PM', false, null::numeric)
) as v(title, description, start_date, location, category, time_display, is_paid, ticket_price_eur)
where not exists (select 1 from public.events limit 1);

-- ─── 8. Seed: members, memberships, receipts, media ─────────────────────────
do $$
declare
  -- Fixed member UUIDs so the seed is fully idempotent
  m1 uuid := 'a0000001-0000-0000-0000-000000000001';
  m2 uuid := 'a0000001-0000-0000-0000-000000000002';
  m3 uuid := 'a0000001-0000-0000-0000-000000000003';
  m4 uuid := 'a0000001-0000-0000-0000-000000000004';
  m5 uuid := 'a0000001-0000-0000-0000-000000000005';
  m6 uuid := 'a0000001-0000-0000-0000-000000000006';

  -- Fixed membership UUIDs
  mb1 uuid := 'b0000001-0000-0000-0000-000000000001';
  mb2 uuid := 'b0000001-0000-0000-0000-000000000002';
  mb3 uuid := 'b0000001-0000-0000-0000-000000000003';
  mb4 uuid := 'b0000001-0000-0000-0000-000000000004';
  mb5 uuid := 'b0000001-0000-0000-0000-000000000005';
  mb6 uuid := 'b0000001-0000-0000-0000-000000000006';
begin

  -- ── Members ──────────────────────────────────────────────────────────────
  insert into public.members (id, full_name, email, phone, joined_at) values
    (m1, 'Priya Sharma',    'priya.sharma@example.com',    '+353 86 111 2233', '2025-06-01'),
    (m2, 'Raj Patel',       'raj.patel@example.com',       '+353 85 222 3344', '2025-10-01'),
    (m3, 'Anitha Krishnan', 'anitha.krishnan@example.com', '+353 83 333 4455', '2026-04-01'),
    (m4, 'Suresh Nair',     'suresh.nair@example.com',     '+353 87 444 5566', '2024-05-01'),
    (m5, 'Meera Iyer',      'meera.iyer@example.com',      '+353 89 555 6677', '2025-12-01'),
    (m6, 'Vikram Mehta',    'vikram.mehta@example.com',    '+353 86 666 7788', '2026-05-01')
  on conflict (id) do nothing;

  -- ── Memberships ──────────────────────────────────────────────────────────
  insert into public.memberships
    (id, member_id, plan, status, started_at, expires_at, gateway, reference)
  values
    (mb1, m1, 'annual',      'active',  '2025-06-01', '2026-06-01', 'stripe', 'STR-ANN-001'),
    (mb2, m2, 'semi-annual', 'active',  '2025-10-01', '2026-04-01', 'paypal', 'PPL-SEM-001'),
    (mb3, m3, 'monthly',     'active',  '2026-04-01', '2026-05-01', 'manual', 'MAN-MON-001'),
    (mb4, m4, 'annual',      'expired', '2024-05-01', '2025-05-01', 'stripe', 'STR-ANN-002'),
    (mb5, m5, 'semi-annual', 'active',  '2025-12-01', '2026-06-01', 'sumup',  'SUM-SEM-001'),
    (mb6, m6, 'monthly',     'pending', '2026-05-01', '2026-06-01', 'manual', 'MAN-MON-002')
  on conflict (id) do nothing;

  -- ── Receipts ─────────────────────────────────────────────────────────────
  insert into public.receipts
    (id, type, related_id, recipient_name, recipient_email, amount_eur, description, template_id, email_status)
  values
    ('c0000001-0000-0000-0000-000000000001',
     'membership', mb1, 'Priya Sharma',    'priya.sharma@example.com',
     20.00, 'Annual membership 2025–2026',       'tmpl-membership', 'sent'),
    ('c0000001-0000-0000-0000-000000000002',
     'membership', mb2, 'Raj Patel',       'raj.patel@example.com',
     12.00, 'Semi-annual membership Oct 2025',   'tmpl-membership', 'sent'),
    ('c0000001-0000-0000-0000-000000000003',
     'membership', mb3, 'Anitha Krishnan', 'anitha.krishnan@example.com',
      4.00, 'Monthly membership April 2026',     'tmpl-membership', 'pending'),
    ('c0000001-0000-0000-0000-000000000004',
     'membership', mb5, 'Meera Iyer',      'meera.iyer@example.com',
     12.00, 'Semi-annual membership Dec 2025',   'tmpl-membership', 'sent'),
    ('c0000001-0000-0000-0000-000000000005',
     'donation',   null, 'Ravi Kumar',     'ravi.kumar@example.com',
     50.00, 'Diwali festival donation',          'tmpl-donation',   'sent'),
    ('c0000001-0000-0000-0000-000000000006',
     'donation',   null, 'Sunita Reddy',   'sunita.reddy@example.com',
     25.00, 'General temple donation',           'tmpl-donation',   'sent'),
    ('c0000001-0000-0000-0000-000000000007',
     'event',      null, 'Priya Sharma',   'priya.sharma@example.com',
     15.00, 'Diwali Festival Celebration ticket','tmpl-event',      'sent')
  on conflict (id) do nothing;

  -- ── Media ────────────────────────────────────────────────────────────────
  insert into public.media
    (id, bucket, path, filename, folder, size_kb, alt_text, uploaded_at)
  values
    ('d0000001-0000-0000-0000-000000000001',
     'public-gallery', 'events/diwali-2025.jpg',      'diwali-2025.jpg',      'events',    245, 'Diwali Festival 2025',                '2025-11-08'),
    ('d0000001-0000-0000-0000-000000000002',
     'public-gallery', 'events/ganesh-chaturthi.jpg', 'ganesh-chaturthi.jpg', 'events',    312, 'Ganesh Chaturthi celebration',        '2025-09-13'),
    ('d0000001-0000-0000-0000-000000000003',
     'public-gallery', 'temple/main-hall.jpg',        'main-hall.jpg',        'temple',    198, 'Main hall at Ahane',                  '2025-08-01'),
    ('d0000001-0000-0000-0000-000000000004',
     'public-gallery', 'community/yoga-day.jpg',      'yoga-day.jpg',         'community', 267, 'International Yoga Day 2025',         '2025-06-22'),
    ('d0000001-0000-0000-0000-000000000005',
     'public-gallery', 'events/independence-day.jpg', 'independence-day.jpg', 'events',    289, 'Independence Day celebration',        '2025-08-16'),
    ('d0000001-0000-0000-0000-000000000006',
     'public-gallery', 'general/logo-banner.jpg',     'logo-banner.jpg',      'general',   156, 'Hindu Association of Ireland banner', '2025-07-01')
  on conflict (bucket, path) do nothing;

end $$;
