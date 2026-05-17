-- =============================================================================
-- Migration: 20260517000010_storage_buckets.sql
-- Purpose : Create Supabase Storage buckets used by the application and
--           configure their access policies.
-- Buckets :
--   * public-gallery    – public images shown on the website.
--   * receipts          – generated PDF receipts (private).
--   * receipt-templates – HTML templates for receipts (private).
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('public-gallery',    'public-gallery',    true),
  ('receipts',          'receipts',          false),
  ('receipt-templates', 'receipt-templates', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- public-gallery: anyone may read; admins/editors may write.
-- ---------------------------------------------------------------------------
drop policy if exists "public-gallery read" on storage.objects;
create policy "public-gallery read" on storage.objects
  for select
  using (bucket_id = 'public-gallery');

drop policy if exists "public-gallery write" on storage.objects;
create policy "public-gallery write" on storage.objects
  for insert
  with check (
    bucket_id = 'public-gallery'
    and public.current_user_role() in ('admin', 'editor')
  );

drop policy if exists "public-gallery update" on storage.objects;
create policy "public-gallery update" on storage.objects
  for update
  using (
    bucket_id = 'public-gallery'
    and public.current_user_role() in ('admin', 'editor')
  );

drop policy if exists "public-gallery delete" on storage.objects;
create policy "public-gallery delete" on storage.objects
  for delete
  using (
    bucket_id = 'public-gallery'
    and public.current_user_role() = 'admin'
  );

-- ---------------------------------------------------------------------------
-- receipts: admin-only access. Edge Functions use service_role and bypass RLS.
-- ---------------------------------------------------------------------------
drop policy if exists "receipts admin read" on storage.objects;
create policy "receipts admin read" on storage.objects
  for select
  using (
    bucket_id = 'receipts'
    and public.current_user_role() = 'admin'
  );

drop policy if exists "receipts admin write" on storage.objects;
create policy "receipts admin write" on storage.objects
  for all
  using (
    bucket_id = 'receipts'
    and public.current_user_role() = 'admin'
  )
  with check (
    bucket_id = 'receipts'
    and public.current_user_role() = 'admin'
  );

-- ---------------------------------------------------------------------------
-- receipt-templates: admin-only.
-- ---------------------------------------------------------------------------
drop policy if exists "receipt-templates admin all" on storage.objects;
create policy "receipt-templates admin all" on storage.objects
  for all
  using (
    bucket_id = 'receipt-templates'
    and public.current_user_role() = 'admin'
  )
  with check (
    bucket_id = 'receipt-templates'
    and public.current_user_role() = 'admin'
  );
