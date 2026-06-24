-- =============================================================================
-- Migration: 20260624000085_seed_pre_migration_members.sql
-- Purpose : Seed pre-migration founding members who were onboarded before the
--           online membership system existed. These members have no Supabase
--           auth account and no Stripe/payment records.
--           member_code is auto-assigned by the auto_generate_member_code
--           trigger (HAI-MMYYYY-XXXX format) on each INSERT.
-- =============================================================================

DO $$
DECLARE
  -- Fixed UUIDs — ensures the seed is idempotent (safe to re-run)
  m_jagan  uuid := 'f1000001-0000-0000-0000-000000000002';
  m_bhaga  uuid := 'f1000001-0000-0000-0000-000000000003';
  m_radha  uuid := 'f1000001-0000-0000-0000-000000000004';
  m_abhi   uuid := 'f1000001-0000-0000-0000-000000000005';

  mb_jagan uuid := 'f2000001-0000-0000-0000-000000000002';
  mb_bhaga uuid := 'f2000001-0000-0000-0000-000000000003';
  mb_radha uuid := 'f2000001-0000-0000-0000-000000000004';
  mb_abhi  uuid := 'f2000001-0000-0000-0000-000000000005';
BEGIN

  -- ── Members ────────────────────────────────────────────────────────────────
  -- user_id is NULL — no Supabase auth account for pre-migration members.
  -- member_code is left NULL so the BEFORE INSERT trigger generates it.
  INSERT INTO public.members
    (id, full_name, email, phone, area, family_size, joined_at)
  VALUES
    (m_jagan, 'Jagannadh Meda',    'jaganmeda@zohomail.eu',       '+353899402652', 'Castletroy',  '2', '2026-06-24'),
    (m_bhaga, 'Bhagavan Boopa',    'BHAGAVAN.B@gmail.com',        '+353892371140', 'Castletroy',  '4', '2026-06-24'),
    (m_radha, 'Radhakrishna Donthu', 'kitmuk@gmail.com',          '+353899731574', 'Castletroy',  '4', '2026-06-24'),
    (m_abhi,  'Abhimanyu Singh',   'abhimanyu.iitt@gmail.com',    '+353894609263', 'Dooradoyle',  '3', '2026-06-24')
  ON CONFLICT (id) DO NOTHING;

  -- ── Annual Memberships ─────────────────────────────────────────────────────
  -- gateway = 'manual', no Stripe IDs — pre-migration / cash onboarding.
  -- status = 'active', annual plan, valid for one year from onboarding date.
  INSERT INTO public.memberships
    (id, member_id, plan, status, gateway, started_at, expires_at)
  VALUES
    (mb_jagan, m_jagan, 'annual', 'active', 'manual', '2026-06-24', '2027-06-24'),
    (mb_bhaga, m_bhaga, 'annual', 'active', 'manual', '2026-06-24', '2027-06-24'),
    (mb_radha, m_radha, 'annual', 'active', 'manual', '2026-06-24', '2027-06-24'),
    (mb_abhi,  m_abhi,  'annual', 'active', 'manual', '2026-06-24', '2027-06-24')
  ON CONFLICT (id) DO NOTHING;

END $$;

-- Confirm codes were generated
SELECT id, full_name, email, member_code, area, family_size
FROM public.members
WHERE id IN (
  'f1000001-0000-0000-0000-000000000002',
  'f1000001-0000-0000-0000-000000000003',
  'f1000001-0000-0000-0000-000000000004',
  'f1000001-0000-0000-0000-000000000005'
)
ORDER BY joined_at, full_name;
