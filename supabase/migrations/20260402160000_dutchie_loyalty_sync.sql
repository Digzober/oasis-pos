-- Phase B: Dutchie loyalty, durable cursors, and DB-backed single-flight.
-- This migration is intentionally drift-defensive because dev has constraints
-- that are absent from the historical migration chain.

-- Dutchie loyalty values are decimal. Keep balances and their journal aligned.
ALTER TABLE IF EXISTS loyalty_balances
  ALTER COLUMN current_points TYPE NUMERIC(12,2) USING current_points::NUMERIC(12,2),
  ALTER COLUMN lifetime_points TYPE NUMERIC(12,2) USING lifetime_points::NUMERIC(12,2);

ALTER TABLE IF EXISTS loyalty_transactions
  ALTER COLUMN points_change TYPE NUMERIC(12,2) USING points_change::NUMERIC(12,2),
  ALTER COLUMN balance_after TYPE NUMERIC(12,2) USING balance_after::NUMERIC(12,2);

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_balances_customer_org_uniq
  ON loyalty_balances(customer_id, organization_id);

ALTER TABLE IF EXISTS loyalty_transactions
  ADD COLUMN IF NOT EXISTS dutchie_run_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_transactions_customer_run_uniq
  ON loyalty_transactions(customer_id, dutchie_run_id)
  WHERE dutchie_run_id IS NOT NULL;

-- Repair every Dutchie config column used by the application mapping.
ALTER TABLE IF EXISTS dutchie_config
  ADD COLUMN IF NOT EXISTS sync_transactions BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sync_loyalty BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_synced_transactions_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_loyalty_at TIMESTAMPTZ;

-- Durable state supports both NULL-location org scopes and location scopes.
CREATE TABLE IF NOT EXISTS dutchie_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id),
  entity_type TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  cursor JSONB,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  designated_location_id UUID REFERENCES locations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dutchie_sync_state ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS dutchie_sync_state_scope_uniq
  ON dutchie_sync_state(
    organization_id,
    entity_type,
    (COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::UUID))
  );

CREATE INDEX IF NOT EXISTS dutchie_sync_state_schedule_idx
  ON dutchie_sync_state(is_enabled, last_synced_at NULLS FIRST);

-- Seed durable state from historical config checkpoints. NULL checkpoints are
-- retained deliberately so cron can label them as requiring a manual initial sync.
INSERT INTO dutchie_sync_state (
  organization_id, location_id, entity_type, last_synced_at, is_enabled, designated_location_id
)
SELECT
  locations.organization_id,
  config.location_id,
  entity.entity_type,
  CASE entity.entity_type
    WHEN 'employees' THEN config.last_synced_employees_at
    WHEN 'products' THEN config.last_synced_products_at
    WHEN 'inventory' THEN config.last_synced_inventory_at
    WHEN 'rooms' THEN config.last_synced_rooms_at
    WHEN 'registers' THEN config.last_synced_reference_at
    WHEN 'transactions' THEN config.last_synced_transactions_at
  END,
  CASE entity.entity_type
    WHEN 'employees' THEN config.sync_employees
    WHEN 'products' THEN config.sync_products
    WHEN 'inventory' THEN config.sync_inventory
    WHEN 'rooms' THEN config.sync_rooms
    WHEN 'registers' THEN config.is_enabled
    WHEN 'transactions' THEN config.sync_transactions
  END,
  NULL
FROM dutchie_config AS config
JOIN locations ON locations.id = config.location_id
CROSS JOIN (VALUES
  ('employees'), ('products'), ('inventory'), ('rooms'), ('registers'), ('transactions')
) AS entity(entity_type)
ON CONFLICT (
  organization_id,
  entity_type,
  (COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::UUID))
) DO NOTHING;

INSERT INTO dutchie_sync_state (
  organization_id, location_id, entity_type, last_synced_at, is_enabled, designated_location_id
)
SELECT
  grouped.organization_id,
  NULL,
  entity.entity_type,
  CASE entity.entity_type
    WHEN 'reference' THEN grouped.last_reference
    WHEN 'customers' THEN grouped.last_customers
    WHEN 'loyalty' THEN grouped.last_loyalty
  END,
  CASE entity.entity_type
    WHEN 'reference' THEN grouped.any_enabled
    WHEN 'customers' THEN grouped.sync_customers
    WHEN 'loyalty' THEN grouped.sync_loyalty
  END,
  grouped.designated_location_id
FROM (
  SELECT
    locations.organization_id,
    MAX(config.last_synced_reference_at) AS last_reference,
    MAX(config.last_synced_customers_at) AS last_customers,
    MAX(config.last_synced_loyalty_at) AS last_loyalty,
    BOOL_OR(config.is_enabled) AS any_enabled,
    BOOL_OR(config.sync_customers) AS sync_customers,
    BOOL_OR(config.sync_loyalty) AS sync_loyalty,
    (ARRAY_AGG(config.location_id ORDER BY config.is_enabled DESC, config.created_at))[1] AS designated_location_id
  FROM dutchie_config AS config
  JOIN locations ON locations.id = config.location_id
  GROUP BY locations.organization_id
) AS grouped
CROSS JOIN (VALUES ('reference'), ('customers'), ('loyalty')) AS entity(entity_type)
ON CONFLICT (
  organization_id,
  entity_type,
  (COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::UUID))
) DO NOTHING;

CREATE TABLE IF NOT EXISTS dutchie_loyalty_staging (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  run_id UUID NOT NULL,
  run_fingerprint TEXT NOT NULL,
  dutchie_customer_id INTEGER NOT NULL,
  balance NUMERIC(12,2) NOT NULL,
  earned NUMERIC(12,2) NOT NULL,
  spent NUMERIC(12,2) NOT NULL,
  staging_complete BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, run_id, dutchie_customer_id)
);

ALTER TABLE dutchie_loyalty_staging ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS dutchie_loyalty_staging_pending_idx
  ON dutchie_loyalty_staging(organization_id, run_id, id)
  WHERE applied_at IS NULL;

CREATE INDEX IF NOT EXISTS dutchie_loyalty_staging_fingerprint_idx
  ON dutchie_loyalty_staging(organization_id, run_fingerprint)
  WHERE applied_at IS NULL;

-- Backfill and harden the sync log without assuming a pristine schema.
ALTER TABLE IF EXISTS dutchie_sync_log
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ;

UPDATE dutchie_sync_log AS log
SET organization_id = locations.organization_id
FROM locations
WHERE log.location_id = locations.id
  AND log.organization_id IS NULL;

UPDATE dutchie_sync_log
SET heartbeat_at = COALESCE(heartbeat_at, started_at, NOW());

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dutchie_sync_log WHERE organization_id IS NULL) THEN
    ALTER TABLE dutchie_sync_log ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END
$$;

-- Resolve historical duplicate running rows deterministically before indexes.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY organization_id, entity_type ORDER BY heartbeat_at DESC NULLS LAST, started_at DESC, id
  ) AS position
  FROM dutchie_sync_log
  WHERE status = 'running'
    AND entity_type IN ('reference', 'customers', 'loyalty')
)
UPDATE dutchie_sync_log AS log
SET status = 'failed',
    completed_at = NOW(),
    error_details = ARRAY['stale: duplicate org-wide lease removed during Phase B migration']
FROM ranked
WHERE log.id = ranked.id AND ranked.position > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY location_id, entity_type ORDER BY heartbeat_at DESC NULLS LAST, started_at DESC, id
  ) AS position
  FROM dutchie_sync_log
  WHERE status = 'running'
    AND entity_type NOT IN ('reference', 'customers', 'loyalty')
)
UPDATE dutchie_sync_log AS log
SET status = 'failed',
    completed_at = NOW(),
    error_details = ARRAY['stale: duplicate location lease removed during Phase B migration']
FROM ranked
WHERE log.id = ranked.id AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS dutchie_sync_log_org_running_uniq
  ON dutchie_sync_log(organization_id, entity_type)
  WHERE status = 'running'
    AND entity_type IN ('reference', 'customers', 'loyalty');

CREATE UNIQUE INDEX IF NOT EXISTS dutchie_sync_log_location_running_uniq
  ON dutchie_sync_log(location_id, entity_type)
  WHERE status = 'running'
    AND entity_type NOT IN ('reference', 'customers', 'loyalty');

CREATE OR REPLACE FUNCTION checkpoint_dutchie_sync_state(
  p_org UUID,
  p_location UUID,
  p_entity TEXT,
  p_checkpoint TIMESTAMPTZ,
  p_cursor JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO dutchie_sync_state (
    organization_id, location_id, entity_type, last_synced_at, cursor, updated_at
  ) VALUES (
    p_org, p_location, p_entity, p_checkpoint, p_cursor, NOW()
  )
  ON CONFLICT (
    organization_id,
    entity_type,
    (COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::UUID))
  ) DO UPDATE SET
    last_synced_at = COALESCE(EXCLUDED.last_synced_at, dutchie_sync_state.last_synced_at),
    cursor = EXCLUDED.cursor,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION count_dutchie_loyalty_matches(
  p_org UUID,
  p_run UUID
) RETURNS TABLE(total_count BIGINT, matched_count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COUNT(*) AS total_count,
    COUNT(customers.id) AS matched_count
  FROM dutchie_loyalty_staging AS staging
  LEFT JOIN customers
    ON customers.organization_id = staging.organization_id
   AND customers.dutchie_customer_id = staging.dutchie_customer_id
  WHERE staging.organization_id = p_org
    AND staging.run_id = p_run
    AND staging.staging_complete = TRUE;
$$;

CREATE OR REPLACE FUNCTION list_pending_dutchie_loyalty_orgs()
RETURNS TABLE(organization_id UUID)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT staging.organization_id
  FROM dutchie_loyalty_staging AS staging
  WHERE staging.applied_at IS NULL
    AND staging.staging_complete = TRUE;
$$;

CREATE OR REPLACE FUNCTION apply_dutchie_loyalty_chunk(
  p_org UUID,
  p_run UUID,
  p_limit INTEGER DEFAULT 1000
) RETURNS TABLE(processed INTEGER, journaled INTEGER, unmatched INTEGER)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  staged RECORD;
  current_balance NUMERIC(12,2);
  delta NUMERIC(12,2);
  inserted_rows INTEGER;
  processed_count INTEGER := 0;
  journaled_count INTEGER := 0;
  unmatched_count INTEGER := 0;
BEGIN
  IF p_limit < 1 OR p_limit > 5000 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 5000';
  END IF;

  FOR staged IN
    SELECT staging.*, customers.id AS local_customer_id
    FROM dutchie_loyalty_staging AS staging
    LEFT JOIN customers
      ON customers.organization_id = staging.organization_id
     AND customers.dutchie_customer_id = staging.dutchie_customer_id
    WHERE staging.organization_id = p_org
      AND staging.run_id = p_run
      AND staging.staging_complete = TRUE
      AND staging.applied_at IS NULL
    ORDER BY staging.id
    FOR UPDATE OF staging SKIP LOCKED
    LIMIT p_limit
  LOOP
    processed_count := processed_count + 1;

    IF staged.local_customer_id IS NULL THEN
      unmatched_count := unmatched_count + 1;
      UPDATE dutchie_loyalty_staging SET applied_at = NOW() WHERE id = staged.id;
      CONTINUE;
    END IF;

    INSERT INTO loyalty_balances (
      customer_id, organization_id, current_points, lifetime_points
    ) VALUES (
      staged.local_customer_id, p_org, 0, 0
    )
    ON CONFLICT (customer_id, organization_id) DO NOTHING;

    SELECT current_points
    INTO current_balance
    FROM loyalty_balances
    WHERE customer_id = staged.local_customer_id
      AND organization_id = p_org
    FOR UPDATE;

    delta := staged.balance - current_balance;

    UPDATE loyalty_balances
    SET current_points = current_points + delta,
        lifetime_points = staged.earned,
        updated_at = NOW()
    WHERE customer_id = staged.local_customer_id
      AND organization_id = p_org;

    IF delta <> 0 THEN
      INSERT INTO loyalty_transactions (
        customer_id, organization_id, points_change, balance_after,
        reason, dutchie_run_id
      ) VALUES (
        staged.local_customer_id, p_org, delta, staged.balance,
        'dutchie_sync', p_run
      )
      ON CONFLICT (customer_id, dutchie_run_id)
        WHERE dutchie_run_id IS NOT NULL
        DO NOTHING;
      GET DIAGNOSTICS inserted_rows = ROW_COUNT;
      journaled_count := journaled_count + inserted_rows;
    END IF;

    UPDATE dutchie_loyalty_staging SET applied_at = NOW() WHERE id = staged.id;
  END LOOP;

  RETURN QUERY SELECT processed_count, journaled_count, unmatched_count;
END;
$$;

CREATE OR REPLACE FUNCTION adjust_loyalty_points(
  p_customer UUID,
  p_org UUID,
  p_delta NUMERIC(12,2) DEFAULT NULL,
  p_reason TEXT DEFAULT 'adjustment',
  p_lifetime_delta NUMERIC(12,2) DEFAULT NULL,
  p_adjustment_reason UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_transaction UUID DEFAULT NULL,
  p_reference UUID DEFAULT NULL,
  p_source_customer UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  actual_delta NUMERIC(12,2);
  actual_lifetime_delta NUMERIC(12,2);
  current_balance NUMERIC(12,2);
  source_balance NUMERIC(12,2) := 0;
  source_lifetime NUMERIC(12,2) := 0;
  new_balance NUMERIC(12,2);
BEGIN
  IF p_source_customer = p_customer THEN
    RAISE EXCEPTION 'Source and target customers must differ';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM customers WHERE id = p_customer AND organization_id = p_org
  ) THEN
    RAISE EXCEPTION 'Customer does not belong to organization';
  END IF;
  IF p_source_customer IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM customers WHERE id = p_source_customer AND organization_id = p_org
  ) THEN
    RAISE EXCEPTION 'Source customer does not belong to organization';
  END IF;

  INSERT INTO loyalty_balances (customer_id, organization_id, current_points, lifetime_points)
  VALUES (p_customer, p_org, 0, 0)
  ON CONFLICT (customer_id, organization_id) DO NOTHING;

  IF p_source_customer IS NOT NULL THEN
    INSERT INTO loyalty_balances (customer_id, organization_id, current_points, lifetime_points)
    VALUES (p_source_customer, p_org, 0, 0)
    ON CONFLICT (customer_id, organization_id) DO NOTHING;
  END IF;

  -- Deterministic lock ordering prevents winner/loser merge deadlocks.
  PERFORM 1
  FROM loyalty_balances
  WHERE organization_id = p_org
    AND customer_id IN (p_customer, COALESCE(p_source_customer, p_customer))
  ORDER BY customer_id
  FOR UPDATE;

  SELECT current_points INTO current_balance
  FROM loyalty_balances
  WHERE customer_id = p_customer AND organization_id = p_org;

  IF p_reference IS NOT NULL AND EXISTS (
    SELECT 1 FROM loyalty_transactions
    WHERE customer_id = p_customer AND dutchie_run_id = p_reference
  ) THEN
    RETURN jsonb_build_object('new_balance', current_balance, 'delta', 0);
  END IF;

  IF p_source_customer IS NOT NULL THEN
    SELECT current_points, lifetime_points
    INTO source_balance, source_lifetime
    FROM loyalty_balances
    WHERE customer_id = p_source_customer AND organization_id = p_org;
    actual_delta := source_balance;
    actual_lifetime_delta := source_lifetime;

    UPDATE loyalty_balances
    SET current_points = 0, lifetime_points = 0, updated_at = NOW()
    WHERE customer_id = p_source_customer AND organization_id = p_org;

    IF source_balance <> 0 THEN
      INSERT INTO loyalty_transactions (
        customer_id, organization_id, points_change, balance_after, reason, dutchie_run_id
      ) VALUES (
        p_source_customer, p_org, -source_balance, 0, 'merge_out', p_reference
      )
      ON CONFLICT (customer_id, dutchie_run_id)
        WHERE dutchie_run_id IS NOT NULL
        DO NOTHING;
    END IF;
  ELSE
    actual_delta := COALESCE(p_delta, 0);
    actual_lifetime_delta := COALESCE(p_lifetime_delta, GREATEST(actual_delta, 0));
  END IF;

  new_balance := current_balance + actual_delta;
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Adjustment would make balance negative';
  END IF;

  UPDATE loyalty_balances
  SET current_points = current_points + actual_delta,
      lifetime_points = GREATEST(0, lifetime_points + actual_lifetime_delta),
      updated_at = NOW()
  WHERE customer_id = p_customer AND organization_id = p_org
  RETURNING current_points INTO new_balance;

  INSERT INTO loyalty_transactions (
    customer_id, organization_id, points_change, balance_after, reason,
    adjustment_reason_id, created_by, transaction_id, dutchie_run_id
  ) VALUES (
    p_customer, p_org, actual_delta, new_balance, p_reason,
    p_adjustment_reason, p_created_by, p_transaction, p_reference
  )
  ON CONFLICT (customer_id, dutchie_run_id)
    WHERE dutchie_run_id IS NOT NULL
    DO NOTHING;

  RETURN jsonb_build_object('new_balance', new_balance, 'delta', actual_delta);
END;
$$;

-- Replace imported transaction payments atomically. Any insert error rolls the
-- delete back, so a transaction header can never be stranded without payments.
CREATE OR REPLACE FUNCTION replace_dutchie_transaction_payments(
  p_location UUID,
  p_replacements JSONB
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  replacement JSONB;
  payment JSONB;
  transaction_uuid UUID;
  inserted_count INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_replacements) <> 'array' THEN
    RAISE EXCEPTION 'p_replacements must be an array';
  END IF;

  FOR replacement IN SELECT value FROM jsonb_array_elements(p_replacements)
  LOOP
    transaction_uuid := (replacement->>'transaction_id')::UUID;
    IF NOT EXISTS (
      SELECT 1 FROM transactions WHERE id = transaction_uuid AND location_id = p_location
    ) THEN
      RAISE EXCEPTION 'Transaction is outside the requested location';
    END IF;

    DELETE FROM transaction_payments WHERE transaction_id = transaction_uuid;
    FOR payment IN SELECT value FROM jsonb_array_elements(COALESCE(replacement->'payments', '[]'::JSONB))
    LOOP
      INSERT INTO transaction_payments (transaction_id, payment_method, amount)
      VALUES (
        transaction_uuid,
        payment->>'payment_method',
        (payment->>'amount')::NUMERIC(12,2)
      );
      inserted_count := inserted_count + 1;
    END LOOP;
  END LOOP;

  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION stamp_dutchie_customer_ids(
  p_org UUID,
  p_matches JSONB
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE customers
  SET dutchie_customer_id = matches.dutchie_customer_id,
      updated_at = NOW()
  FROM jsonb_to_recordset(p_matches) AS matches(id UUID, dutchie_customer_id INTEGER)
  WHERE customers.id = matches.id
    AND customers.organization_id = p_org
    AND customers.dutchie_customer_id IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Update dependent function variable/argument types using their live function
-- definitions. This preserves drifted bodies while eliminating integer loyalty
-- truncation. Missing functions are safely ignored on partial schemas.
DO $$
DECLARE
  function_oid OID;
  function_definition TEXT;
  old_identity TEXT;
BEGIN
  SELECT oid INTO function_oid
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname = 'create_sale_transaction'
  ORDER BY oid DESC
  LIMIT 1;

  IF function_oid IS NOT NULL THEN
    function_definition := pg_get_functiondef(function_oid);
    function_definition := regexp_replace(
      function_definition,
      'p_loyalty_points integer',
      'p_loyalty_points numeric(12,2)',
      'i'
    );
    function_definition := regexp_replace(
      function_definition,
      'v_balance_after integer',
      'v_balance_after numeric(12,2)',
      'i'
    );
    old_identity := function_oid::regprocedure::TEXT;
    IF function_definition ~* 'p_loyalty_points numeric' THEN
      EXECUTE format('DROP FUNCTION %s', old_identity);
      EXECUTE function_definition;
    END IF;
  END IF;

  SELECT oid INTO function_oid
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace AND proname = 'void_transaction'
  ORDER BY oid DESC LIMIT 1;
  IF function_oid IS NOT NULL THEN
    function_definition := pg_get_functiondef(function_oid);
    function_definition := regexp_replace(function_definition, 'v_earned_points integer', 'v_earned_points numeric(12,2)', 'i');
    EXECUTE function_definition;
  END IF;

  SELECT oid INTO function_oid
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace AND proname = 'create_return_transaction'
  ORDER BY oid DESC LIMIT 1;
  IF function_oid IS NOT NULL THEN
    function_definition := pg_get_functiondef(function_oid);
    function_definition := regexp_replace(function_definition, 'v_earned_points integer', 'v_earned_points numeric(12,2)', 'i');
    function_definition := regexp_replace(function_definition, 'v_proportional_points integer', 'v_proportional_points numeric(12,2)', 'i');
    EXECUTE function_definition;
  END IF;
END
$$;

REVOKE EXECUTE ON FUNCTION checkpoint_dutchie_sync_state(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION count_dutchie_loyalty_matches(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION list_pending_dutchie_loyalty_orgs() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION apply_dutchie_loyalty_chunk(UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION adjust_loyalty_points(UUID, UUID, NUMERIC, TEXT, NUMERIC, UUID, UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION replace_dutchie_transaction_payments(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION stamp_dutchie_customer_ids(UUID, JSONB) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION checkpoint_dutchie_sync_state(UUID, UUID, TEXT, TIMESTAMPTZ, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION count_dutchie_loyalty_matches(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION list_pending_dutchie_loyalty_orgs() TO service_role;
GRANT EXECUTE ON FUNCTION apply_dutchie_loyalty_chunk(UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION adjust_loyalty_points(UUID, UUID, NUMERIC, TEXT, NUMERIC, UUID, UUID, UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION replace_dutchie_transaction_payments(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION stamp_dutchie_customer_ids(UUID, JSONB) TO service_role;

-- create_sale_transaction is recreated above with the widened loyalty argument;
-- retain the server-only execution boundary after DROP/CREATE resets privileges.
DO $$
BEGIN
  IF to_regprocedure(
    'public.create_sale_transaction(uuid,uuid,uuid,uuid,uuid,boolean,numeric,numeric,numeric,numeric,jsonb,jsonb,jsonb,jsonb,numeric,uuid)'
  ) IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION create_sale_transaction(
      UUID, UUID, UUID, UUID, UUID, BOOLEAN,
      NUMERIC, NUMERIC, NUMERIC, NUMERIC,
      JSONB, JSONB, JSONB, JSONB, NUMERIC, UUID
    ) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION create_sale_transaction(
      UUID, UUID, UUID, UUID, UUID, BOOLEAN,
      NUMERIC, NUMERIC, NUMERIC, NUMERIC,
      JSONB, JSONB, JSONB, JSONB, NUMERIC, UUID
    ) TO service_role;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
