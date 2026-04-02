-- Dutchie Live Sync — Config, dedup indexes, sync log
-- Replaces migration-only approach with permanent per-location sync infrastructure

-- dutchie_config: per-location sync configuration
CREATE TABLE IF NOT EXISTS dutchie_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  api_key_encrypted TEXT,
  dutchie_location_id TEXT,
  dutchie_location_name TEXT,

  -- Per-entity sync timestamps (set to when sync STARTED, not finished)
  last_synced_employees_at TIMESTAMPTZ,
  last_synced_customers_at TIMESTAMPTZ,
  last_synced_products_at TIMESTAMPTZ,
  last_synced_inventory_at TIMESTAMPTZ,
  last_synced_rooms_at TIMESTAMPTZ,
  last_synced_reference_at TIMESTAMPTZ,

  -- Sync toggles
  sync_employees BOOLEAN NOT NULL DEFAULT true,
  sync_customers BOOLEAN NOT NULL DEFAULT true,
  sync_products BOOLEAN NOT NULL DEFAULT true,
  sync_inventory BOOLEAN NOT NULL DEFAULT true,
  sync_rooms BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id)
);

ALTER TABLE dutchie_config ENABLE ROW LEVEL SECURITY;

-- Employees: dedup column + unique index
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dutchie_employee_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_dutchie_uniq
  ON employees(dutchie_employee_id) WHERE dutchie_employee_id IS NOT NULL;

-- Products: unique index on existing dutchie_product_id
DROP INDEX IF EXISTS idx_products_dutchie_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_dutchie_uniq
  ON products(dutchie_product_id) WHERE dutchie_product_id IS NOT NULL;

-- Customers: unique index on existing dutchie_customer_id
DROP INDEX IF EXISTS idx_customers_dutchie_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_dutchie_uniq
  ON customers(dutchie_customer_id) WHERE dutchie_customer_id IS NOT NULL;

-- Inventory items: dedup by external_package_id + location
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS external_package_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_external_pkg
  ON inventory_items(external_package_id, location_id) WHERE external_package_id IS NOT NULL;

-- Rooms: external_id for Dutchie room matching
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_external_id
  ON rooms(external_id, location_id) WHERE external_id IS NOT NULL;

-- Registers: external_id for terminal matching
ALTER TABLE registers ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_registers_external_id
  ON registers(external_id, location_id) WHERE external_id IS NOT NULL;

-- Reference entities: external_id columns
ALTER TABLE brands ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE pricing_tiers ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Sync log table
CREATE TABLE IF NOT EXISTS dutchie_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  entity_type TEXT NOT NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_errored INTEGER DEFAULT 0,
  error_details TEXT[],
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

ALTER TABLE dutchie_sync_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_dutchie_sync_log_location ON dutchie_sync_log(location_id, started_at DESC);

-- Seed dutchie_config from existing dutchie_locations data
INSERT INTO dutchie_config (location_id, is_enabled, api_key_encrypted, dutchie_location_id, dutchie_location_name)
SELECT
  dl.location_id,
  dl.is_active,
  dl.api_key,
  dl.dutchie_location_id::text,
  dl.dutchie_location_name
FROM dutchie_locations dl
WHERE dl.location_id IS NOT NULL
ON CONFLICT (location_id) DO UPDATE SET
  api_key_encrypted = EXCLUDED.api_key_encrypted,
  is_enabled = EXCLUDED.is_enabled;
