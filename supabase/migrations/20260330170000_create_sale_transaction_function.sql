CREATE OR REPLACE FUNCTION create_sale_transaction(
  p_location_id UUID,
  p_employee_id UUID,
  p_register_id UUID,
  p_customer_id UUID,
  p_cash_drawer_id UUID,
  p_is_medical BOOLEAN,
  p_subtotal NUMERIC(12,2),
  p_discount_total NUMERIC(12,2),
  p_tax_total NUMERIC(12,2),
  p_total NUMERIC(12,2),
  p_lines JSONB,
  p_payments JSONB,
  p_taxes JSONB,
  p_discounts JSONB,
  p_loyalty_points INTEGER DEFAULT 0,
  p_organization_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx_id UUID;
  v_tx_number INTEGER;
  v_line JSONB;
  v_payment JSONB;
  v_tax JSONB;
  v_discount JSONB;
  v_rows_affected INTEGER;
  v_org_id UUID;
  v_balance_after INTEGER;
BEGIN
  -- Resolve organization_id from location if not provided
  IF p_organization_id IS NULL THEN
    SELECT organization_id INTO v_org_id FROM locations WHERE id = p_location_id;
  ELSE
    v_org_id := p_organization_id;
  END IF;

  -- Generate next transaction number for this location (with lock)
  SELECT COALESCE(MAX(transaction_number), 0) + 1
    INTO v_tx_number
    FROM transactions
    WHERE location_id = p_location_id
    FOR UPDATE;

  -- Verify cash drawer is open
  PERFORM 1 FROM cash_drawers
    WHERE id = p_cash_drawer_id AND status = 'open'
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cash drawer is not open';
  END IF;

  -- Insert transaction header
  INSERT INTO transactions (
    location_id, employee_id, register_id, customer_id,
    transaction_number, transaction_type, status,
    is_medical, subtotal, discount_amount, tax_amount, total
  ) VALUES (
    p_location_id, p_employee_id, p_register_id, p_customer_id,
    v_tx_number, 'sale', 'completed',
    p_is_medical, p_subtotal, p_discount_total, p_tax_total, p_total
  ) RETURNING id INTO v_tx_id;

  -- Insert lines and decrement inventory
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO transaction_lines (
      transaction_id, product_id, inventory_item_id,
      product_name, category_name, quantity, unit_price,
      discount_amount, tax_amount, line_total,
      is_cannabis, is_medical, weight_grams,
      flower_equivalent_grams, biotrack_barcode
    ) VALUES (
      v_tx_id,
      (v_line->>'product_id')::UUID,
      (v_line->>'inventory_item_id')::UUID,
      v_line->>'product_name',
      v_line->>'category_name',
      (v_line->>'quantity')::INTEGER,
      (v_line->>'unit_price')::NUMERIC(12,2),
      (v_line->>'discount_amount')::NUMERIC(12,2),
      (v_line->>'tax_amount')::NUMERIC(12,2),
      (v_line->>'line_total')::NUMERIC(12,2),
      COALESCE((v_line->>'is_cannabis')::BOOLEAN, true),
      p_is_medical,
      (v_line->>'weight_grams')::NUMERIC(8,3),
      (v_line->>'flower_equivalent_grams')::NUMERIC(8,3),
      v_line->>'biotrack_barcode'
    );

    -- Decrement inventory
    IF v_line->>'inventory_item_id' IS NOT NULL THEN
      UPDATE inventory_items
        SET quantity = quantity - (v_line->>'quantity')::INTEGER,
            updated_at = NOW()
        WHERE id = (v_line->>'inventory_item_id')::UUID
          AND quantity >= (v_line->>'quantity')::INTEGER;

      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
      IF v_rows_affected = 0 THEN
        RAISE EXCEPTION 'Insufficient inventory for product %', v_line->>'product_name';
      END IF;
    END IF;
  END LOOP;

  -- Insert payments
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO transaction_payments (
      transaction_id, payment_method, amount, tendered, change_given, reference_number
    ) VALUES (
      v_tx_id,
      v_payment->>'payment_method',
      (v_payment->>'amount')::NUMERIC(12,2),
      (v_payment->>'tendered')::NUMERIC(12,2),
      (v_payment->>'change_given')::NUMERIC(12,2),
      v_payment->>'reference_number'
    );
  END LOOP;

  -- Insert taxes
  FOR v_tax IN SELECT * FROM jsonb_array_elements(p_taxes)
  LOOP
    INSERT INTO transaction_taxes (
      transaction_id, tax_name, tax_rate, taxable_amount, tax_amount, is_excise
    ) VALUES (
      v_tx_id,
      v_tax->>'tax_name',
      (v_tax->>'tax_rate')::NUMERIC(8,6),
      (v_tax->>'taxable_amount')::NUMERIC(12,2),
      (v_tax->>'tax_amount')::NUMERIC(12,2),
      COALESCE((v_tax->>'is_excise')::BOOLEAN, false)
    );
  END LOOP;

  -- Insert discounts
  FOR v_discount IN SELECT * FROM jsonb_array_elements(p_discounts)
  LOOP
    INSERT INTO transaction_discounts (
      transaction_id, discount_id, discount_name, discount_amount
    ) VALUES (
      v_tx_id,
      NULLIF(v_discount->>'discount_id', '')::UUID,
      v_discount->>'discount_name',
      (v_discount->>'discount_amount')::NUMERIC(12,2)
    );
  END LOOP;

  -- Update customer stats
  IF p_customer_id IS NOT NULL THEN
    UPDATE customers
      SET last_visit_at = NOW(),
          lifetime_spend = lifetime_spend + p_total,
          visit_count = visit_count + 1,
          updated_at = NOW()
      WHERE id = p_customer_id;

    -- Award loyalty points
    IF p_loyalty_points > 0 THEN
      UPDATE loyalty_balances
        SET current_points = current_points + p_loyalty_points,
            lifetime_points = lifetime_points + p_loyalty_points,
            updated_at = NOW()
        WHERE customer_id = p_customer_id
        RETURNING current_points INTO v_balance_after;

      IF v_balance_after IS NOT NULL THEN
        INSERT INTO loyalty_transactions (
          customer_id, organization_id, points_change,
          balance_after, reason, transaction_id
        ) VALUES (
          p_customer_id, v_org_id, p_loyalty_points,
          v_balance_after, 'earn', v_tx_id
        );
      END IF;
    END IF;
  END IF;

  -- Update cash drawer
  UPDATE cash_drawers
    SET total_sales = total_sales + p_total,
        updated_at = NOW()
    WHERE id = p_cash_drawer_id;

  -- Audit log
  INSERT INTO audit_log (
    organization_id, location_id, employee_id,
    entity_type, event_type, entity_id
  ) VALUES (
    v_org_id, p_location_id, p_employee_id,
    'transaction', 'create', v_tx_id::TEXT
  );

  RETURN jsonb_build_object(
    'transaction_id', v_tx_id,
    'transaction_number', v_tx_number
  );
END;
$$;
