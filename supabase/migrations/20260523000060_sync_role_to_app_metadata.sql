-- =============================================================================
-- Migration: 20260523000060_sync_role_to_app_metadata.sql
-- Purpose : Copy each user's role from public.user_roles into
--           auth.users.raw_app_meta_data so that the JWT access-token issued
--           on the NEXT login/refresh carries the role claim.
--
-- This is what the frontend and the Netlify edge functions use as a fallback
-- when the DB role-lookup fails (network hiccup, RLS edge-case, etc.).
-- Idempotent: runs only when the stored value differs from the table value.
-- =============================================================================

update auth.users u
set    raw_app_meta_data =
         u.raw_app_meta_data || jsonb_build_object('role', ur.role)
from   public.user_roles ur
where  ur.user_id = u.id
  and  (u.raw_app_meta_data ->> 'role') is distinct from ur.role;
