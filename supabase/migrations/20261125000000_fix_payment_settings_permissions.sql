-- ===========================================================================
-- Migration: Fix payment_settings Permissions & RLS Policies
-- Target Database: Shared Supabase (https://gsqfaguqsmnuoeuhpxro.supabase.co)
-- Schema: public
--
-- Description:
-- Fixes PostgreSQL error 42501 ("permission denied for table payment_settings")
-- encountered when administrators access Settings -> Stripe payments.
--
-- Root Cause:
-- 1. Table grants were missing for anon and service_role.
-- 2. The legacy RLS policy strictly checked `ur.role = 'admin'`, blocking
--    `super_admin` users (and not checking app_metadata.role).
-- 3. In multi-tenant shared database setup, cross-project checks need to
--    ensure only hindutemple admins or unbound legacy admins can update.
-- ===========================================================================

-- 1. Ensure table exists with singleton row
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode_override   TEXT NOT NULL DEFAULT 'auto' CHECK (mode_override IN ('auto', 'test', 'live')),
  notes           TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.payment_settings (id, mode_override)
VALUES (1, 'auto')
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure RLS is enabled
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- 3. Explicitly GRANT table privileges to roles
GRANT ALL ON public.payment_settings TO postgres;
GRANT ALL ON public.payment_settings TO service_role;
GRANT SELECT, UPDATE ON public.payment_settings TO authenticated;
GRANT SELECT ON public.payment_settings TO anon;

-- 4. Clean up legacy policies
DROP POLICY IF EXISTS "payment_settings_admin_read" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_admin_write" ON public.payment_settings;
DROP POLICY IF EXISTS "payment_settings_public_read" ON public.payment_settings;

-- 5. Create robust SELECT policy
-- Admins (super_admin, admin) of Hindu Temple can read the full record.
CREATE POLICY "payment_settings_admin_read"
  ON public.payment_settings
  FOR SELECT TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('super_admin', 'admin')
      )
      OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'admin')
    )
    AND (
      auth.jwt()->'app_metadata'->>'project_id' IS NULL
      OR auth.jwt()->'app_metadata'->>'project_id' = 'hindutemple'
    )
  );

-- Public read for payment mode resolution (safe: contains no secret keys)
CREATE POLICY "payment_settings_public_read"
  ON public.payment_settings
  FOR SELECT TO anon
  USING (id = 1);

-- 6. Create robust UPDATE policy
CREATE POLICY "payment_settings_admin_write"
  ON public.payment_settings
  FOR UPDATE TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('super_admin', 'admin')
      )
      OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'admin')
    )
    AND (
      auth.jwt()->'app_metadata'->>'project_id' IS NULL
      OR auth.jwt()->'app_metadata'->>'project_id' = 'hindutemple'
    )
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('super_admin', 'admin')
      )
      OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'admin')
    )
    AND (
      auth.jwt()->'app_metadata'->>'project_id' IS NULL
      OR auth.jwt()->'app_metadata'->>'project_id' = 'hindutemple'
    )
  );
