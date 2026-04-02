-- Dutchie vs Oasis Gap Analysis migration
-- Adds missing medium-priority columns identified by field-by-field API comparison
-- See: DUTCHIE-VS-OASIS-GAP-ANALYSIS.md

-- PRODUCTS: Add missing medium-priority columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_per_transaction INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS standard_allergens JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS oil_volume NUMERIC(8,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS serving_size TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS serving_size_per_unit NUMERIC(8,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_coupon BOOLEAN DEFAULT FALSE;

-- CUSTOMERS: Add missing medium-priority columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS other_referral_source TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at_location_id UUID REFERENCES locations(id);

-- CUSTOMERS: Temporary migration columns (drop after Dutchie cutover)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dutchie_customer_id INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS springbig_member_id TEXT;
CREATE INDEX IF NOT EXISTS idx_customers_dutchie_id ON customers(dutchie_customer_id) WHERE dutchie_customer_id IS NOT NULL;

-- PRODUCTS: Temporary migration column
ALTER TABLE products ADD COLUMN IF NOT EXISTS dutchie_product_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_products_dutchie_id ON products(dutchie_product_id) WHERE dutchie_product_id IS NOT NULL;

-- CASH DRAWER DROPS: Add structured adjustment reason
ALTER TABLE cash_drawer_drops ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- DUTCHIE MIGRATION: Location API key storage
-- Stores per-location Dutchie API keys for data migration
CREATE TABLE IF NOT EXISTS dutchie_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  location_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  dutchie_location_id INTEGER,
  dutchie_location_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id)
);

ALTER TABLE dutchie_locations ENABLE ROW LEVEL SECURITY;

-- DUTCHIE MIGRATION: Sync job tracking
CREATE TABLE IF NOT EXISTS dutchie_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id),
  job_type TEXT NOT NULL CHECK (job_type IN ('full', 'products', 'customers', 'inventory', 'brands', 'vendors', 'strains', 'transactions')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  products_fetched INTEGER DEFAULT 0,
  products_created INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  customers_fetched INTEGER DEFAULT 0,
  customers_created INTEGER DEFAULT 0,
  customers_updated INTEGER DEFAULT 0,
  customers_skipped_dupes INTEGER DEFAULT 0,
  inventory_fetched INTEGER DEFAULT 0,
  inventory_created INTEGER DEFAULT 0,
  lookups_created JSONB DEFAULT '{}',
  error_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dutchie_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_dutchie_sync_jobs_location ON dutchie_sync_jobs(location_id);
CREATE INDEX IF NOT EXISTS idx_dutchie_sync_jobs_status ON dutchie_sync_jobs(status) WHERE status IN ('pending', 'running');
