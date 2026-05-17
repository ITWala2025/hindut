-- =============================================================================
-- Migration: 20260517000001_init_extensions_and_user_role.sql
-- Purpose : Enable required Postgres extensions and add a `role` column to
--           Supabase Auth users so RLS policies can implement RBAC.
-- Phase   : Phase 2 – Supabase backend bootstrap.
-- Notes   : `auth.users` is managed by Supabase. We only add an additive
--           column + index here; do NOT recreate or drop the table.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- RBAC role column on auth.users ---------------------------------------------
-- Roles used by the Admin Portal: 'admin' | 'editor'.
do $$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'auth'
       and table_name   = 'users'
       and column_name  = 'role'
  ) then
    alter table auth.users
      add column role text not null default 'editor'
      check (role in ('admin', 'editor'));
  end if;
end $$;

-- Unique email index (Supabase already enforces this, kept here for parity
-- with the documented schema).
create unique index if not exists users_email_idx on auth.users (email);

-- Helper: return the role of the currently authenticated user. Used by RLS.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select role from auth.users where id = auth.uid();
$$;

grant execute on function public.current_user_role() to anon, authenticated;
