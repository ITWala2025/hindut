-- =============================================================================
-- Migration: 20260517000001_init_extensions_and_user_role.sql
-- Purpose : Enable required Postgres extensions and create a user_roles table
--           for RBAC. auth.users is owned by supabase_auth_admin and cannot
--           be altered directly — roles are stored in a separate table.
-- Phase   : Phase 2 – Supabase backend bootstrap.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- RBAC: user_roles table -------------------------------------------------------
-- Roles used by the Admin Portal: 'admin' | 'editor'.
-- service_role bypasses RLS and can insert/update rows here.
create table if not exists public.user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'editor'
               check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Authenticated users can read their own role row.
drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles
  for select
  using (user_id = auth.uid());

-- Helper: return the role of the currently authenticated user. Used by RLS.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

grant execute on function public.current_user_role() to anon, authenticated;
