-- Void a completed same-day transaction
CREATE OR REPLACE FUNCTION void_transaction(
  p_transaction_id UUID,
  p_employee_id UUID,
  p_void_reason TEXT,
  p_cash_drawer_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx RECORD;
  v_line RECORD;
  v_org_id UUID;
  v_earned_points INTEGER;
  v_rows INTEGER;
BEGIN
  -- Load and lock the transaction
  SELECT * INTO v_tx FROM transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  IF v_tx.status != 'completed' THEN
    RAISE EXCEPTION 'Transaction status is %, expected completed', v_tx.status;
  END IF;
  IF v_tx.created_at::date != CURRENT_DATE THEN
    RAISE EXCEPTION 'Can only void same-day transactions';
  END IF;

  SELECT organization_id INTO v_org_id FROM locations WHERE id = v_tx.location_id;

  -- Mark as voided
  UPDATE transactions
    SET status = 'voided',
        voided_by = p_employee_id,
        voided_at = NOW(),
        void_reason = p_void_reason,
        updated_at = NOW()
    WHERE id = p_transaction_id;

  -- Restore inventory for each line
  FOR v_line IN SELECT * FROM transaction_lines WHERE transaction_id = p_transaction_id
  LOOP
    IF v_line.inventory_item_id IS NOT NULL THEN
      UPDATE inventory_items
        SET quantity = quantity + v_line.quantity,
            updated_at = NOW()
        WHERE id = v_line.inventory_item_id;
    END IF;
  END LOOP;

  -- Reverse customer stats
  IF v_tx.customer_id IS NOT NULL THEN
    UPDATE customers
      SET lifetime_spend = GREATEST(0, lifetime_spend - v_tx.total),
          visit_count = GREATEST(0, visit_count - 1),
          updated_at = NOW()
      WHERE id = v_tx.customer_id;

    -- Reverse loyalty points
    SELECT COALESCE(SUM(points_change), 0) INTO v_earned_points
      FROM loyalty_transactions
      WHERE transaction_id = p_transaction_id AND reason = 'earn';

    IF v_earned_points > 0 THEN
      UPDATE loyalty_balances
        SET current_points = GREATEST(0, current_points - v_earned_points),
            lifetime_points = GREATEST(0, lifetime_points - v_earned_points),
            updated_at = NOW()
        WHERE customer_id = v_tx.customer_id;

      INSERT INTO loyalty_transactions (
        customer_id, organization_id, points_change,
        balance_after, reason, transaction_id
      ) VALUES (
        v_tx.customer_id, v_org_id, -v_earned_points,
        (SELECT current_points FROM loyalty_balances WHERE customer_id = v_tx.customer_id),
        'void_reversal', p_transaction_id
      );
    END IF;
  END IF;

  -- Reverse cash drawer
  IF p_cash_drawer_id IS NOT NULL THEN
    UPDATE cash_drawers
      SET total_sales = GREATEST(0, total_sales - v_tx.total),
          updated_at = NOW()
      WHERE id = p_cash_drawer_id;
  END IF;

  -- Audit log
  INSERT INTO audit_log (
    organization_id, location_id, employee_id,
    entity_type, event_type, entity_id, metadata
  ) VALUES (
    v_org_id, v_tx.location_id, p_employee_id,
    'transaction', 'void', p_transaction_id::TEXT,
    jsonb_build_object('void_reason', p_void_reason, 'original_total', v_tx.total)
  );

  RETURN jsonb_build_object(
    'transaction_id', p_transaction_id,
    'transaction_number', v_tx.transaction_number,
    'voided_total', v_tx.total,
    'items_restored', (SELECT COUNT(*) FROM transaction_lines WHERE transaction_id = p_transaction_id AND inventory_item_id IS NOT NULL)
  );
END;
$$;

-- Process a return (full or partial)
CREATE OR REPLACE FUNCTION create_return_transaction(
  p_organization_id UUID,
  p_location_id UUID,
  p_employee_id UUID,
  p_register_id UUID,
  p_customer_id UUID,
  p_cash_drawer_id UUID,
  p_original_transaction_id UUID,
  p_return_reason TEXT,
  p_return_lines JSONB,
  p_refund_amount NUMERIC(12,2)
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_orig RECORD;
  v_tx_id UUID;
  v_tx_number INTEGER;
  v_rline JSONB;
  v_orig_line RECORD;
  v_already_returned INTEGER;
  v_earned_points INTEGER;
  v_proportional_points INTEGER;
  v_org_id UUID;
BEGIN
  v_org_id := p_organization_id;

  -- Load and verify original transaction
  SELECT * INTO v_orig FROM transactions WHERE id = p_original_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original transaction not found';
  END IF;
  IF v_orig.status != 'completed' THEN
    RAISE EXCEPTION 'Original transaction status is %, expected completed', v_orig.status;
  END IF;
  IF v_orig.created_at < NOW() - INTERVAL '14 days' THEN
    RAISE EXCEPTION 'Return window expired (14 days)';
  END IF;

  -- Generate next transaction number
  SELECT COALESCE(MAX(transaction_number), 0) + 1
    INTO v_tx_number
    FROM transactions
    WHERE location_id = p_location_id
    FOR UPDATE;

  -- Create the return transaction
  INSERT INTO transactions (
    location_id, employee_id, register_id, customer_id,
    transaction_number, transaction_type, status,
    original_transaction_id, notes,
    is_medical, subtotal, discount_amount, tax_amount, total
  ) VALUES (
    p_location_id, p_employee_id, p_register_id, p_customer_id,
    v_tx_number, 'return', 'completed',
    p_original_transaction_id, p_return_reason,
    v_orig.is_medical, -p_refund_amount, 0, 0, -p_refund_amount
  ) RETURNING id INTO v_tx_id;

  -- Process each return line
  FOR v_rline IN SELECT * FROM jsonb_array_elements(p_return_lines)
  LOOP
    -- Load original line
    SELECT * INTO v_orig_line
      FROM transaction_lines
      WHERE id = (v_rline->>'transaction_line_id')::UUID;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Original transaction line not found: %', v_rline->>'transaction_line_id';
    END IF;

    -- Check for double-return: count already returned qty for this line
    SELECT COALESCE(SUM(ABS(tl.quantity)), 0) INTO v_already_returned
      FROM transaction_lines tl
      JOIN transactions t ON t.id = tl.transaction_id
      WHERE t.original_transaction_id = p_original_transaction_id
        AND t.transaction_type = 'return'
        AND t.status = 'completed'
        AND tl.product_id = v_orig_line.product_id
        AND tl.inventory_item_id = v_orig_line.inventory_item_id;

    IF v_already_returned + (v_rline->>'quantity')::INTEGER > v_orig_line.quantity THEN
      RAISE EXCEPTION 'Return quantity exceeds available for product %', v_orig_line.product_name;
    END IF;

    -- Insert return line (negative quantity)
    INSERT INTO transaction_lines (
      transaction_id, product_id, inventory_item_id,
      product_name, category_name, quantity, unit_price,
      discount_amount, tax_amount, line_total,
      is_cannabis, is_medical, weight_grams, biotrack_barcode
    ) VALUES (
      v_tx_id, v_orig_line.product_id, v_orig_line.inventory_item_id,
      v_orig_line.product_name, v_orig_line.category_name,
      -(v_rline->>'quantity')::INTEGER, v_orig_line.unit_price,
      0, 0,
      -(v_orig_line.line_total / v_orig_line.quantity * (v_rline->>'quantity')::INTEGER),
      v_orig_line.is_cannabis, v_orig_line.is_medical,
      v_orig_line.weight_grams, v_orig_line.biotrack_barcode
    );

    -- Restore inventory if flagged
    IF COALESCE((v_rline->>'restore_to_inventory')::BOOLEAN, true) AND v_orig_line.inventory_item_id IS NOT NULL THEN
      UPDATE inventory_items
        SET quantity = quantity + (v_rline->>'quantity')::INTEGER,
            updated_at = NOW()
        WHERE id = v_orig_line.inventory_item_id;
    END IF;
  END LOOP;

  -- Refund payment
  INSERT INTO transaction_payments (
    transaction_id, payment_method, amount, tendered, change_given
  ) VALUES (
    v_tx_id, 'cash', -p_refund_amount, NULL, NULL
  );

  -- Reverse customer stats
  IF p_customer_id IS NOT NULL THEN
    UPDATE customers
      SET lifetime_spend = GREATEST(0, lifetime_spend - p_refund_amount),
          updated_at = NOW()
      WHERE id = p_customer_id;

    -- Reverse proportional loyalty points
    IF v_orig.total > 0 THEN
      SELECT COALESCE(SUM(points_change), 0) INTO v_earned_points
        FROM loyalty_transactions
        WHERE transaction_id = p_original_transaction_id AND reason = 'earn';

      v_proportional_points := ROUND(v_earned_points * (p_refund_amount / v_orig.total));

      IF v_proportional_points > 0 THEN
        UPDATE loyalty_balances
          SET current_points = GREATEST(0, current_points - v_proportional_points),
              lifetime_points = GREATEST(0, lifetime_points - v_proportional_points),
              updated_at = NOW()
          WHERE customer_id = p_customer_id;

        INSERT INTO loyalty_transactions (
          customer_id, organization_id, points_change,
          balance_after, reason, transaction_id
        ) VALUES (
          p_customer_id, v_org_id, -v_proportional_points,
          (SELECT current_points FROM loyalty_balances WHERE customer_id = p_customer_id),
          'return_reversal', v_tx_id
        );
      END IF;
    END IF;
  END IF;

  -- Update cash drawer
  IF p_cash_drawer_id IS NOT NULL THEN
    UPDATE cash_drawers
      SET total_returns = total_returns + p_refund_amount,
          updated_at = NOW()
      WHERE id = p_cash_drawer_id;
  END IF;

  -- Audit log
  INSERT INTO audit_log (
    organization_id, location_id, employee_id,
    entity_type, event_type, entity_id, metadata
  ) VALUES (
    v_org_id, p_location_id, p_employee_id,
    'transaction', 'return', v_tx_id::TEXT,
    jsonb_build_object('original_transaction_id', p_original_transaction_id, 'refund_amount', p_refund_amount, 'return_reason', p_return_reason)
  );

  RETURN jsonb_build_object(
    'transaction_id', v_tx_id,
    'transaction_number', v_tx_number,
    'refund_amount', p_refund_amount,
    'original_transaction_id', p_original_transaction_id
  );
END;
$$;
