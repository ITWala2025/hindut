-- =============================================================================
-- Migration: 20260520000039_members_add_member_code.sql
-- Purpose : Add human-readable member_code column (HAI-M-XXXX format).
--           One code per email — code is assigned once on first successful
--           membership payment and never regenerated for repeat payments.
-- =============================================================================

alter table public.members
  add column if not exists member_code text unique;

create index if not exists members_member_code_idx
  on public.members (member_code)
  where member_code is not null;

-- Grant the service-role (used by Netlify functions) full access
grant select, update on public.members to service_role;
