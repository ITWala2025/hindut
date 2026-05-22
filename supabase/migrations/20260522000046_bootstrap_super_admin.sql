-- =============================================================================
-- Migration: 20260522000046_bootstrap_super_admin.sql
-- Purpose : Promote existing 'admin' users to 'super_admin' so the new
--           Roles & Permissions UI is accessible.
--
-- This is IDEMPOTENT: it only runs when there is no super_admin in the
-- system. Once any super_admin exists, the block is a no-op so it's safe
-- to re-run.
--
-- Pre-migration 20260522000045, every 'admin' had full unrestricted access.
-- This bootstrap preserves that capability for them while giving at least
-- one super_admin who can manage role permissions going forward.
-- =============================================================================

do $$
declare
  promoted int;
begin
  if not exists (select 1 from public.user_roles where role = 'super_admin') then
    update public.user_roles
       set role = 'super_admin'
     where role = 'admin';

    get diagnostics promoted = row_count;
    raise notice 'Bootstrap: promoted % existing admin(s) to super_admin.', promoted;

    -- If there were no admins at all to promote, leave a clear breadcrumb so
    -- the operator knows they need to insert a row manually. We don't fail
    -- the migration in that case because the table may legitimately be empty
    -- on a fresh install where seed data has not yet been loaded.
    if promoted = 0 then
      raise notice 'Bootstrap: no admin rows found to promote. Insert a row into public.user_roles with role = ''super_admin'' for your account manually.';
    end if;
  else
    raise notice 'Bootstrap: at least one super_admin already exists. No changes made.';
  end if;
end$$;
