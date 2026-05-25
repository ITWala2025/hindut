-- =============================================================================
-- Migration: 20260525000068_add_role_permissions_audit_columns.sql
-- Purpose : Ensure the role_permissions table has the audit columns
--           (updated_at, updated_by) that were introduced in migration 045
--           using CREATE TABLE IF NOT EXISTS. If the table already existed
--           before migration 045 ran, these columns would have been skipped.
-- =============================================================================

alter table public.role_permissions
  add column if not exists updated_at timestamptz not null default now();

alter table public.role_permissions
  add column if not exists updated_by uuid references auth.users(id) on delete set null;
