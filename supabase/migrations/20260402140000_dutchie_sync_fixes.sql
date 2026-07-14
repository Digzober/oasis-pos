-- Make product_id nullable on inventory_items.
-- During Dutchie sync, inventory may arrive before products are synced.
-- The FK is resolved post-sync or on subsequent product sync.
ALTER TABLE inventory_items ALTER COLUMN product_id DROP NOT NULL;

-- Reload PostgREST schema cache to pick up new constraints from prior migration
NOTIFY pgrst, 'reload schema';
