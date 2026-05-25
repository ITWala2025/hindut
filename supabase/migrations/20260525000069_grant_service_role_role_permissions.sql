-- =============================================================================
-- Migration: 20260525000069_grant_service_role_role_permissions.sql
-- Purpose : Grant SELECT, INSERT, UPDATE on role_permissions to service_role.
--           Migration 045 only granted SELECT to `authenticated`. The Netlify
--           function uses the service_role key (bypasses RLS) but still needs
--           table-level privileges in PostgreSQL.
-- =============================================================================

grant select, insert, update on public.role_permissions to service_role;
