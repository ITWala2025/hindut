-- =============================================================================
-- Migration: 20260517000007_create_receipts.sql
-- Purpose : Receipt metadata for memberships, donations, and event tickets.
--           PDF files themselves live in the `receipts` Storage bucket.
-- =============================================================================

create table if not exists public.receipts (
  id                  uuid primary key default uuid_generate_v4(),
  receipt_number      text unique,
  related_id          uuid not null,
  type                text not null check (type in ('membership', 'donation', 'event')),
  recipient_name      text not null,
  recipient_email     text not null,
  amount_eur          numeric(12, 2) not null,
  currency            text not null default 'EUR',
  description         text,
  pdf_url             text,
  template_id         text,
  email_status        text not null default 'pending'
                        check (email_status in ('pending', 'sent', 'failed', 'skipped')),
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);

create unique index if not exists receipts_type_related_idx
  on public.receipts (type, related_id);

create index if not exists receipts_created_at_idx
  on public.receipts (created_at desc);

create index if not exists receipts_email_status_idx
  on public.receipts (email_status);

-- Receipt templates (HTML stored inline; binary templates live in Storage).
create table if not exists public.receipt_templates (
  id          text primary key,
  name        text not null,
  body        text not null,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

drop trigger if exists receipt_templates_set_updated_at on public.receipt_templates;
create trigger receipt_templates_set_updated_at
  before update on public.receipt_templates
  for each row execute function public.set_updated_at();

-- Row-Level Security ----------------------------------------------------------
alter table public.receipts          enable row level security;
alter table public.receipt_templates enable row level security;

drop policy if exists receipts_admin_all on public.receipts;
create policy receipts_admin_all on public.receipts
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Editors: read-only.
drop policy if exists receipts_editor_read on public.receipts;
create policy receipts_editor_read on public.receipts
  for select
  using (public.current_user_role() in ('admin', 'editor'));

-- End-users: can read receipts addressed to their email.
drop policy if exists receipts_self_read on public.receipts;
create policy receipts_self_read on public.receipts
  for select
  using (
    recipient_email = (select email from auth.users where id = auth.uid())
  );

drop policy if exists receipt_templates_admin_all on public.receipt_templates;
create policy receipt_templates_admin_all on public.receipt_templates
  for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists receipt_templates_editor_read on public.receipt_templates;
create policy receipt_templates_editor_read on public.receipt_templates
  for select
  using (public.current_user_role() in ('admin', 'editor'));
