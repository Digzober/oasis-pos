-- Add dutchie_transaction_id for upsert conflict resolution
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS dutchie_transaction_id TEXT;

-- Make employee_id nullable for Dutchie imports (employee may not be synced yet)
ALTER TABLE transactions ALTER COLUMN employee_id DROP NOT NULL;

-- Unique constraint for upsert (non-partial so PostgREST can use it)
ALTER TABLE transactions
  ADD CONSTRAINT transactions_loc_dutchie_txn_key
  UNIQUE (location_id, dutchie_transaction_id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
