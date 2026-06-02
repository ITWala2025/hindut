-- ============================================================================
-- Stripe Product Mappings
-- ============================================================================
-- Stores mappings between Stripe products/prices and application entities
-- (memberships, donations, special causes, tickets). Enables admin UI to
-- manage which Stripe price IDs are used for each feature.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_product_mappings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe identifiers
  stripe_product_id   text NOT NULL,
  stripe_price_id     text NOT NULL UNIQUE,
  stripe_mode         text NOT NULL CHECK (stripe_mode IN ('test', 'live')),
  
  -- Application mapping
  entity_type         text NOT NULL CHECK (entity_type IN ('membership', 'donation', 'special_cause', 'ticket')),
  entity_id           text NOT NULL, -- Plan ID, donation type, cause ID, etc.
  
  -- Metadata for display
  product_name        text NOT NULL,
  price_amount        integer, -- Amount in cents
  price_currency      text DEFAULT 'eur',
  price_interval      text, -- 'month', 'year', 'one_time', etc.
  
  -- Status
  is_active           boolean DEFAULT true,
  
  -- Audit
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  created_by          uuid REFERENCES auth.users(id),
  updated_by          uuid REFERENCES auth.users(id)
);

-- Index for fast lookups
CREATE INDEX idx_stripe_product_mappings_entity ON public.stripe_product_mappings(entity_type, entity_id);
CREATE INDEX idx_stripe_product_mappings_stripe_price ON public.stripe_product_mappings(stripe_price_id, stripe_mode);
CREATE INDEX idx_stripe_product_mappings_active ON public.stripe_product_mappings(is_active) WHERE is_active = true;

-- Updated timestamp trigger
CREATE TRIGGER stripe_product_mappings_updated_at
  BEFORE UPDATE ON public.stripe_product_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
ALTER TABLE public.stripe_product_mappings ENABLE ROW LEVEL SECURITY;

-- Admins can view all mappings
CREATE POLICY "Admins can view stripe mappings"
  ON public.stripe_product_mappings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- Super admins can manage mappings
CREATE POLICY "Super admins can insert stripe mappings"
  ON public.stripe_product_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update stripe mappings"
  ON public.stripe_product_mappings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete stripe mappings"
  ON public.stripe_product_mappings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- Grant permissions
GRANT SELECT ON public.stripe_product_mappings TO authenticated;
GRANT ALL ON public.stripe_product_mappings TO service_role;

-- Comments
COMMENT ON TABLE public.stripe_product_mappings IS 'Maps Stripe products/prices to application entities (memberships, donations, etc.)';
COMMENT ON COLUMN public.stripe_product_mappings.entity_type IS 'Type of application entity: membership, donation, special_cause, or ticket';
COMMENT ON COLUMN public.stripe_product_mappings.entity_id IS 'Application-specific ID (e.g., plan ID like "bronze", donation type, cause ID)';
COMMENT ON COLUMN public.stripe_product_mappings.stripe_mode IS 'Stripe mode: test or live';
