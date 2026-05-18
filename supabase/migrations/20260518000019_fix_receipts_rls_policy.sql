-- =============================================================================
-- Migration: 20260518000019_fix_receipts_rls_policy.sql
-- Purpose : Fix receipts_self_read RLS policy which subqueried auth.users
--           directly — the `authenticated` role has no SELECT on auth.users,
--           causing the policy evaluation to throw an error.
--           Use auth.email() instead (reads from the JWT, no table access needed).
--
--           Also ensures table-level SELECT grant exists for authenticated role.
-- =============================================================================

-- Fix the broken self-read policy
drop policy if exists receipts_self_read on public.receipts;
create policy receipts_self_read on public.receipts
  for select
  using (
    recipient_email = auth.email()
  );

-- Ensure table-level grants exist (idempotent)
grant select, insert, update, delete on public.receipts          to authenticated;
grant select, insert, update, delete on public.receipt_templates to authenticated;
grant select, insert, update, delete on public.receipts          to service_role;
grant select, insert, update, delete on public.receipt_templates to service_role;
