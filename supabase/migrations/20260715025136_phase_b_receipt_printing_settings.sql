-- Register values become nullable overrides. Existing booleans remain explicit
-- overrides; newly created registers inherit the effective location default.
ALTER TABLE IF EXISTS public.registers
  ALTER COLUMN auto_print_receipts DROP NOT NULL,
  ALTER COLUMN auto_print_receipts DROP DEFAULT,
  ALTER COLUMN auto_print_labels DROP NOT NULL,
  ALTER COLUMN auto_print_labels DROP DEFAULT;

-- Older writers did not enforce one row per location/config type. Retain the
-- most recently updated canonical row before adding the conflict target used
-- by the atomic patch RPC below.
WITH ranked_receipt_configs AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY location_id, config_type
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_number
  FROM public.receipt_config
)
DELETE FROM public.receipt_config AS receipt
USING ranked_receipt_configs AS ranked
WHERE receipt.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS receipt_config_location_type_key
  ON public.receipt_config (location_id, config_type);

-- The Phase A JSON model allowed organization defaults and location overrides.
-- Fan those values out to the per-location receipt_config target. Location JSON
-- wins over organization JSON, while an existing canonical table value wins
-- over both legacy JSON sources.
INSERT INTO public.receipt_config (
  location_id,
  config_type,
  header_config,
  line_item_config,
  footer_config,
  additional_config,
  updated_at
)
SELECT
  l.id,
  'receipt',
  jsonb_build_object(
    'show_location_name', COALESCE((ls.settings #>> '{receipt,show_location_name}')::boolean, (os.settings #>> '{receipt,show_location_name}')::boolean, true),
    'show_location_address', COALESCE((ls.settings #>> '{receipt,show_location_address}')::boolean, (os.settings #>> '{receipt,show_location_address}')::boolean, true),
    'show_location_phone', COALESCE((ls.settings #>> '{receipt,show_location_phone}')::boolean, (os.settings #>> '{receipt,show_location_phone}')::boolean, true),
    'show_license_number', COALESCE((ls.settings #>> '{receipt,show_license_number}')::boolean, (os.settings #>> '{receipt,show_license_number}')::boolean, true),
    'show_employee_name', COALESCE((ls.settings #>> '{receipt,show_employee_name}')::boolean, (os.settings #>> '{receipt,show_employee_name}')::boolean, true),
    'show_customer_name', COALESCE((ls.settings #>> '{receipt,show_customer_name}')::boolean, (os.settings #>> '{receipt,show_customer_name}')::boolean, true)
  ),
  jsonb_build_object(
    'show_sku', COALESCE((ls.settings #>> '{receipt,show_sku}')::boolean, (os.settings #>> '{receipt,show_sku}')::boolean, true),
    'show_thc_percentage', COALESCE((ls.settings #>> '{receipt,show_thc_percentage}')::boolean, (os.settings #>> '{receipt,show_thc_percentage}')::boolean, true),
    'show_tax_breakdown', COALESCE((ls.settings #>> '{receipt,show_tax_breakdown}')::boolean, (os.settings #>> '{receipt,show_tax_breakdown}')::boolean, true),
    'show_discount_details', COALESCE((ls.settings #>> '{receipt,show_discount_details}')::boolean, (os.settings #>> '{receipt,show_discount_details}')::boolean, true)
  ),
  jsonb_build_object(
    'show_loyalty_points', COALESCE((ls.settings #>> '{receipt,show_loyalty_points}')::boolean, (os.settings #>> '{receipt,show_loyalty_points}')::boolean, true),
    'show_return_policy', COALESCE((ls.settings #>> '{receipt,show_return_policy}')::boolean, (os.settings #>> '{receipt,show_return_policy}')::boolean, true)
  ),
  jsonb_build_object(
    'show_biotrack_id', COALESCE((ls.settings #>> '{receipt,show_biotrack_id}')::boolean, (os.settings #>> '{receipt,show_biotrack_id}')::boolean, true)
  ),
  now()
FROM public.locations AS l
LEFT JOIN public.location_settings AS ls ON ls.location_id = l.id
LEFT JOIN public.organization_settings AS os ON os.organization_id = l.organization_id
ON CONFLICT (location_id, config_type) DO UPDATE
SET header_config = EXCLUDED.header_config || public.receipt_config.header_config,
    line_item_config = EXCLUDED.line_item_config || public.receipt_config.line_item_config,
    footer_config = EXCLUDED.footer_config || public.receipt_config.footer_config,
    additional_config = EXCLUDED.additional_config || public.receipt_config.additional_config,
    updated_at = now();

UPDATE public.location_settings
SET settings = settings - 'receipt', updated_at = now()
WHERE settings ? 'receipt';

UPDATE public.organization_settings
SET settings = settings - 'receipt', updated_at = now()
WHERE settings ? 'receipt';

CREATE OR REPLACE FUNCTION public.patch_receipt_config(
  p_location_id UUID,
  p_patch JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_section TEXT;
  v_value JSONB;
  v_allowed TEXT[];
  v_result JSONB;
BEGIN
  IF jsonb_typeof(COALESCE(p_patch, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Receipt config patch must be a JSON object';
  END IF;

  FOR v_section, v_value IN SELECT key, value FROM jsonb_each(p_patch)
  LOOP
    v_allowed := CASE v_section
      WHEN 'header_config' THEN ARRAY['show_location_name', 'show_location_address', 'show_location_phone', 'show_license_number', 'show_employee_name', 'show_customer_name']
      WHEN 'line_item_config' THEN ARRAY['show_sku', 'show_thc_percentage', 'show_tax_breakdown', 'show_discount_details']
      WHEN 'footer_config' THEN ARRAY['show_loyalty_points', 'show_return_policy']
      WHEN 'additional_config' THEN ARRAY['show_biotrack_id']
      ELSE NULL
    END;
    IF v_allowed IS NULL OR jsonb_typeof(v_value) <> 'object'
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(v_value) AS entry(key) WHERE entry.key <> ALL(v_allowed))
       OR EXISTS (SELECT 1 FROM jsonb_each(v_value) AS item(key, value) WHERE jsonb_typeof(item.value) <> 'boolean') THEN
      RAISE EXCEPTION 'Unknown or invalid receipt config key in %', v_section;
    END IF;
  END LOOP;

  INSERT INTO public.receipt_config (
    location_id, config_type, header_config, line_item_config,
    footer_config, additional_config, updated_at
  ) VALUES (
    p_location_id, 'receipt',
    public.jsonb_deep_patch('{}'::jsonb, COALESCE(p_patch -> 'header_config', '{}'::jsonb)),
    public.jsonb_deep_patch('{}'::jsonb, COALESCE(p_patch -> 'line_item_config', '{}'::jsonb)),
    public.jsonb_deep_patch('{}'::jsonb, COALESCE(p_patch -> 'footer_config', '{}'::jsonb)),
    public.jsonb_deep_patch('{}'::jsonb, COALESCE(p_patch -> 'additional_config', '{}'::jsonb)),
    now()
  )
  ON CONFLICT (location_id, config_type) DO UPDATE
  SET header_config = public.jsonb_deep_patch(public.receipt_config.header_config, COALESCE(p_patch -> 'header_config', '{}'::jsonb)),
      line_item_config = public.jsonb_deep_patch(public.receipt_config.line_item_config, COALESCE(p_patch -> 'line_item_config', '{}'::jsonb)),
      footer_config = public.jsonb_deep_patch(public.receipt_config.footer_config, COALESCE(p_patch -> 'footer_config', '{}'::jsonb)),
      additional_config = public.jsonb_deep_patch(public.receipt_config.additional_config, COALESCE(p_patch -> 'additional_config', '{}'::jsonb)),
      updated_at = now()
  RETURNING jsonb_build_object(
    'header_config', header_config,
    'line_item_config', line_item_config,
    'footer_config', footer_config,
    'additional_config', additional_config
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.patch_receipt_config(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.patch_receipt_config(UUID, JSONB) TO service_role;
