-- ===========================================================================
-- Migration: payment_settings (Stripe mode override)
--
-- A single-row table that lets an admin override the automatic test/live
-- mode detection. Secret keys are NEVER stored here — they live exclusively
-- in Netlify environment variables. This table only stores:
--   * mode_override:  'auto' (default — use host detection) | 'test' | 'live'
--   * updated_at / updated_by audit fields
--
-- RLS: admins (user_roles.role = 'admin') may read & write; nobody else.
-- ===========================================================================

create table if not exists public.payment_settings (
  id              smallint primary key default 1 check (id = 1),
  mode_override   text    not null default 'auto'
                  check (mode_override in ('auto', 'test', 'live')),
  notes           text,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id) on delete set null
);

-- Seed the singleton row if it doesn't already exist
insert into public.payment_settings (id, mode_override)
values (1, 'auto')
on conflict (id) do nothing;

alter table public.payment_settings enable row level security;

drop policy if exists "payment_settings_admin_read" on public.payment_settings;
create policy "payment_settings_admin_read"
  on public.payment_settings
  for select
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

drop policy if exists "payment_settings_admin_write" on public.payment_settings;
create policy "payment_settings_admin_write"
  on public.payment_settings
  for update
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

grant select, update on public.payment_settings to authenticated;
-- The Netlify functions read this table via service_role, which bypasses RLS.
-- Anonymous users should not see the override.
