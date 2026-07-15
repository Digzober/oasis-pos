-- Canonical data always wins. When no canonical value exists, the current
-- location-hub (Surface A) alias wins over the retired Surface B alias. This
-- avoids resurrecting a stale value from the page being removed.

-- Typed BioTrack rows are authoritative. Only locations without a config row
-- are backfilled from JSON; the compliance-safe table default remains ON.
INSERT INTO public.biotrack_config (location_id, is_enabled)
SELECT
  ls.location_id,
  COALESCE(
    CASE WHEN jsonb_typeof(ls.settings -> 'auto_sync_biotrack') = 'boolean'
      THEN (ls.settings ->> 'auto_sync_biotrack')::boolean END,
    CASE WHEN jsonb_typeof(ls.settings -> 'biotrack_auto_sync') = 'boolean'
      THEN (ls.settings ->> 'biotrack_auto_sync')::boolean END,
    true
  )
FROM public.location_settings ls
WHERE ls.settings ? 'auto_sync_biotrack'
   OR ls.settings ? 'biotrack_auto_sync'
ON CONFLICT (location_id) DO NOTHING;

-- A previously enabled typed value is never disabled by a stale JSON alias.
-- A true alias promotes the typed flag for rows that still have its old default.
UPDATE public.locations AS l
SET allows_online_orders = true,
    updated_at = now()
FROM public.location_settings AS ls
WHERE ls.location_id = l.id
  AND jsonb_typeof(ls.settings -> 'enable_online_ordering') = 'boolean'
  AND (ls.settings ->> 'enable_online_ordering')::boolean = true
  AND l.allows_online_orders = false;

WITH migrated AS (
  SELECT
    ls.location_id,
    public.jsonb_deep_patch(
      ls.settings,
      jsonb_build_object(
        'checkout', jsonb_strip_nulls(jsonb_build_object(
          'rounding_method', COALESCE(
            ls.settings #> '{checkout,rounding_method}',
            ls.settings -> 'rounding_method'
          ),
          'require_customer', COALESCE(
            ls.settings #> '{checkout,require_customer}',
            ls.settings -> 'require_customer_checkout',
            ls.settings -> 'require_customer'
          )
        )),
        'compliance', jsonb_strip_nulls(jsonb_build_object(
          'require_id_scan', COALESCE(
            ls.settings #> '{compliance,require_id_scan}',
            ls.settings -> 'require_id_scan',
            ls.settings -> 'require_id_verification'
          )
        )),
        'printing', jsonb_strip_nulls(jsonb_build_object(
          'auto_print_receipt_default', COALESCE(
            ls.settings #> '{printing,auto_print_receipt_default}',
            ls.settings -> 'auto_print_receipt',
            ls.settings -> 'print_receipt_auto'
          ),
          'auto_print_label_default', COALESCE(
            ls.settings #> '{printing,auto_print_label_default}',
            ls.settings -> 'auto_print_label'
          )
        )),
        'inventory', jsonb_strip_nulls(jsonb_build_object(
          'low_stock_threshold', COALESCE(
            ls.settings #> '{inventory,low_stock_threshold}',
            ls.settings -> 'low_stock_threshold'
          )
        )),
        'online', jsonb_strip_nulls(jsonb_build_object(
          'reserve_inventory', COALESCE(
            ls.settings #> '{online,reserve_inventory}',
            ls.settings -> 'enable_reservations'
          ),
          'pickup_window_minutes', COALESCE(
            ls.settings #> '{online,pickup_window_minutes}',
            ls.settings -> 'pickup_window_minutes'
          ),
          'max_advance_order_days', COALESCE(
            ls.settings #> '{online,max_advance_order_days}',
            ls.settings -> 'max_advance_order_days'
          )
        ))
      )
    ) AS settings
  FROM public.location_settings ls
)
UPDATE public.location_settings AS ls
SET settings = migrated.settings - ARRAY[
      -- Retired aliases that were coalesced above or into typed tables.
      'rounding_method',
      'require_customer_checkout', 'require_customer',
      'require_id_scan', 'require_id_verification',
      'auto_print_receipt', 'print_receipt_auto', 'auto_print_label',
      'auto_sync_biotrack', 'biotrack_auto_sync',
      'enable_online_ordering', 'enable_reservations',
      'low_stock_threshold', 'pickup_window_minutes', 'max_advance_order_days',
      -- Misleading invariant toggles and Surface A/B placeholders.
      'enforce_purchase_limits', 'auto_deduct_on_sale',
      'show_customer_dob_checkout', 'show_product_notes', 'auto_close_drawer',
      'allow_partial_payments', 'enable_tips', 'show_loyalty_in_pos',
      'require_manager_discount_approval', 'allow_price_overrides',
      'show_cost_in_pos', 'enable_product_bundles', 'quick_add_customer',
      'show_allotment_warning', 'auto_apply_discounts', 'allow_zero_price',
      'enable_batch_tracking', 'enable_lot_tracking', 'show_testing_status',
      'require_lab_before_sale', 'enable_quarantine_workflow',
      'show_flower_equivalent', 'enable_inventory_alerts',
      -- Unsupported integration controls.
      'sync_weedmaps', 'sync_leafly', 'sync_springbig', 'sync_headset',
      -- Mobile checkout controls whose behavior is intentionally invariant.
      'enable_mobile_pos', 'require_wifi', 'allow_offline_mode',
      'auto_sync_reconnect',
      -- Security controls with no authentication-policy consumer.
      'password_min_length', 'password_expiration_days',
      -- Admin/report controls with no runtime consumer.
      'show_cost_on_reports', 'enable_audit_trail', 'allow_bulk_operations',
      'enable_export', 'show_margin_on_reports', 'enable_scheduled_reports',
      -- Pricing toggles with no keeper mapping.
      'show_original_price_discounted', 'apply_loyalty_before_tax',
      'apply_discounts_before_tax', 'enable_price_scheduling'
    ],
    updated_at = now()
FROM migrated
WHERE migrated.location_id = ls.location_id;
