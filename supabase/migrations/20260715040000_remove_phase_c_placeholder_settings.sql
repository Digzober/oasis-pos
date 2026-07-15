-- Phase C placeholder disposition cleanup.
-- These keys no longer have a runtime consumer and are intentionally removed from
-- both scopes. The statement is idempotent: removing a missing JSON key is a no-op.

UPDATE public.location_settings
SET settings = settings - ARRAY[
  'enabled_order_types',
  'workflow_type',
  'default_order_source',
  'restrict_transaction_hours',
  'transaction_hours_start',
  'transaction_hours_end',
  'badge_priority',
  'package_id_formats',
  'default_store_url'
]::text[];

UPDATE public.organization_settings
SET settings = settings - ARRAY[
  'enabled_order_types',
  'workflow_type',
  'default_order_source',
  'restrict_transaction_hours',
  'transaction_hours_start',
  'transaction_hours_end',
  'badge_priority',
  'package_id_formats',
  'default_store_url',
  'customer_card_fields',
  'customer_field_visibility',
  'product_field_config'
]::text[];

-- Keep only POS leaves that have a real terminal form consumer and remove the
-- prescription group, for which no form exists. Backend leaves are all consumed.
UPDATE public.location_settings
SET settings = jsonb_set(
  settings,
  '{customer_field_visibility}',
  jsonb_set(
    COALESCE(settings->'customer_field_visibility', '{}'::jsonb) - 'prescription',
    '{pos}',
    COALESCE((
      SELECT jsonb_object_agg(entry.key, entry.value)
      FROM jsonb_each(COALESCE(settings#>'{customer_field_visibility,pos}', '{}'::jsonb)) AS entry
      WHERE entry.key = ANY (ARRAY['phone', 'email', 'mmj_id', 'mmj_id_exp'])
    ), '{}'::jsonb),
    true
  ),
  true
)
WHERE settings ? 'customer_field_visibility';
