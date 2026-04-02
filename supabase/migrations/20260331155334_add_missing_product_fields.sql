-- Add missing product columns to the products table
-- These columns support additional product metadata, sale pricing,
-- discount control, and availability scoping.

ALTER TABLE products ADD COLUMN IF NOT EXISTS allergens TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_automatic_discounts BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS alternate_name TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_for TEXT DEFAULT 'all' CHECK (available_for IN ('all', 'recreational', 'medical'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS dosage TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS external_sub_category TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS flavor TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS instructions TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS producer TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS size TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12,2) DEFAULT NULL;

-- Indexes for columns used in filtering and discount engine queries
CREATE INDEX IF NOT EXISTS idx_products_available_for
  ON products (available_for)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_allow_automatic_discounts
  ON products (allow_automatic_discounts)
  WHERE is_active = TRUE AND allow_automatic_discounts = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_sale_price
  ON products (sale_price)
  WHERE is_active = TRUE AND sale_price IS NOT NULL;
