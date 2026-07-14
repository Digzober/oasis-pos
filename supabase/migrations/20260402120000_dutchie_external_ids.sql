-- Add external_id to reference tables for Dutchie sync FK resolution
ALTER TABLE brands ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE strains ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE pricing_tiers ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE registers ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add dutchie_employee_id to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dutchie_employee_id INTEGER;

-- Unique indexes for upsert conflict resolution
CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_org_name ON brands(organization_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_strains_org_name ON strains(organization_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_org_name ON vendors(organization_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_org_name ON tags(organization_id, name, tag_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_tiers_org_name ON pricing_tiers(organization_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_registers_loc_ext ON registers(location_id, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_org_dutchie ON employees(organization_id, dutchie_employee_id) WHERE dutchie_employee_id IS NOT NULL;
