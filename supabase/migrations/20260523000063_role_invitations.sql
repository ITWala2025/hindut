-- ---------------------------------------------------------------------------
-- Migration: role_invitations table
--
-- Tracks pending and activated role assignments / invitations for the
-- admin portal.  Used by the admin-users and activate-role Netlify functions.
-- ---------------------------------------------------------------------------

-- Create the table
create table if not exists public.role_invitations (
  id            uuid        primary key default gen_random_uuid(),
  email         text        not null,
  user_id       uuid,                             -- auth.users.id (set immediately for invites, or on activation for role-change)
  role          text        not null,
  kind          text        not null default 'invite',  -- 'invite' | 'role-change'
  token         text        unique not null default encode(gen_random_bytes(32), 'hex'),
  invited_by    text,                             -- email of the admin who sent this
  activated_at  timestamptz,                      -- null = pending, non-null = activated
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

-- Indexes for lookups
create index if not exists role_invitations_token_idx   on public.role_invitations (token);
create index if not exists role_invitations_email_idx   on public.role_invitations (email);
create index if not exists role_invitations_user_id_idx on public.role_invitations (user_id);

-- Row-level security: block all direct client access.
-- Backend functions use the service-role key which bypasses RLS.
alter table public.role_invitations enable row level security;

-- Drop existing policy first to allow re-running the migration
drop policy if exists "no direct client access" on public.role_invitations;

create policy "no direct client access"
  on public.role_invitations
  using (false)
  with check (false);
