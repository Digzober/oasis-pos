import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export type FieldVisibility = 'required' | 'show' | 'hide'

export interface CatalogFieldDefinition {
  key: string
  label: string
  default: FieldVisibility
  lockRequired?: boolean
}

export const CATALOG_FIELDS: CatalogFieldDefinition[] = [
  { key: 'name', label: 'Product Name', default: 'required', lockRequired: true },
  { key: 'sku', label: 'SKU', default: 'show' },
  { key: 'barcode', label: 'Barcode', default: 'show' },
  { key: 'description', label: 'Description', default: 'show' },
  { key: 'category', label: 'Category', default: 'required', lockRequired: true },
  { key: 'brand', label: 'Brand', default: 'show' },
  { key: 'vendor', label: 'Vendor', default: 'show' },
  { key: 'strain', label: 'Strain', default: 'show' },
  { key: 'rec_price', label: 'Rec Price', default: 'required', lockRequired: true },
  { key: 'med_price', label: 'Med Price', default: 'show' },
  { key: 'cost_price', label: 'Cost', default: 'show' },
  { key: 'weight_grams', label: 'Weight (g)', default: 'show' },
  { key: 'thc_percentage', label: 'THC %', default: 'show' },
  { key: 'cbd_percentage', label: 'CBD %', default: 'show' },
  { key: 'thc_content_mg', label: 'THC (mg)', default: 'show' },
  { key: 'cbd_content_mg', label: 'CBD (mg)', default: 'show' },
  { key: 'flower_equivalent', label: 'Flower Equivalent', default: 'show' },
  { key: 'external_category', label: 'External Category', default: 'show' },
  { key: 'regulatory_category', label: 'Regulatory Category', default: 'show' },
  { key: 'online_title', label: 'Online Title', default: 'show' },
  { key: 'online_description', label: 'Online Description', default: 'show' },
  { key: 'alternate_name', label: 'Alternate Name', default: 'show' },
  { key: 'producer', label: 'Producer / Manufacturer', default: 'show' },
  { key: 'size', label: 'Size', default: 'show' },
  { key: 'flavor', label: 'Flavor', default: 'show' },
  { key: 'available_for', label: 'Available For', default: 'show' },
  { key: 'is_taxable', label: 'Taxable?', default: 'show' },
  { key: 'allow_automatic_discounts', label: 'Allow Automatic Discounts', default: 'show' },
  { key: 'dosage', label: 'Dosage', default: 'show' },
  { key: 'net_weight', label: 'Net Weight', default: 'show' },
  { key: 'gross_weight', label: 'Gross Weight', default: 'show' },
  { key: 'unit_thc_dose', label: 'Unit THC Dose', default: 'show' },
  { key: 'unit_cbd_dose', label: 'Unit CBD Dose', default: 'show' },
  { key: 'administration_method', label: 'Administration Method', default: 'show' },
  { key: 'package_size', label: 'Package Size', default: 'show' },
  { key: 'external_sub_category', label: 'External Sub Category', default: 'show' },
  { key: 'allergens', label: 'Allergens', default: 'show' },
  { key: 'ingredients', label: 'Ingredients', default: 'show' },
  { key: 'instructions', label: 'Instructions', default: 'show' },
]

const SETTINGS_KEY = 'product_field_config'

function buildDefaults(): Record<string, FieldVisibility> {
  const defaults: Record<string, FieldVisibility> = {}
  for (const field of CATALOG_FIELDS) {
    defaults[field.key] = field.default
  }
  return defaults
}

function validateConfig(config: Record<string, string>): Record<string, FieldVisibility> {
  const validValues = new Set<string>(['required', 'show', 'hide'])
  const validKeys = new Set(CATALOG_FIELDS.map(f => f.key))
  const lockedKeys = new Set(CATALOG_FIELDS.filter(f => f.lockRequired).map(f => f.key))
  const defaults = buildDefaults()
  const validated: Record<string, FieldVisibility> = {}

  for (const field of CATALOG_FIELDS) {
    const value = config[field.key]
    if (!validKeys.has(field.key)) {
      continue
    }
    if (!value || !validValues.has(value)) {
      validated[field.key] = defaults[field.key] ?? field.default
      continue
    }
    if (lockedKeys.has(field.key) && value === 'hide') {
      validated[field.key] = defaults[field.key] ?? field.default
      continue
    }
    validated[field.key] = value as FieldVisibility
  }

  return validated
}

export async function getFieldConfig(locationId: string): Promise<Record<string, FieldVisibility>> {
  const defaults = buildDefaults()

  try {
    const sb = await createSupabaseServerClient()
    const { data } = await sb
      .from('location_settings')
      .select('settings')
      .eq('location_id', locationId)
      .maybeSingle()

    if (!data?.settings) {
      return defaults
    }

    const settings = data.settings as Record<string, unknown>
    const stored = settings[SETTINGS_KEY]

    if (!stored || typeof stored !== 'object') {
      return defaults
    }

    return { ...defaults, ...validateConfig(stored as Record<string, string>) }
  } catch (err) {
    logger.error('Failed to read product field config', { error: String(err), locationId })
    return defaults
  }
}

export async function saveFieldConfig(
  locationId: string,
  config: Record<string, string>,
): Promise<Record<string, FieldVisibility>> {
  const validated = validateConfig(config)
  const sb = await createSupabaseServerClient()

  const { data: existing } = await sb
    .from('location_settings')
    .select('id, settings')
    .eq('location_id', locationId)
    .maybeSingle()

  if (existing) {
    const merged = {
      ...(existing.settings as Record<string, unknown> ?? {}),
      [SETTINGS_KEY]: validated,
    }
    const { error } = await sb
      .from('location_settings')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ settings: merged as any })
      .eq('id', existing.id)

    if (error) {
      logger.error('Failed to update product field config', { error: error.message, locationId })
      throw error
    }
  } else {
    const { error } = await sb
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('location_settings' as any)
      .insert({ location_id: locationId, settings: { [SETTINGS_KEY]: validated } })

    if (error) {
      logger.error('Failed to insert product field config', { error: error.message, locationId })
      throw error
    }
  }

  logger.info('Product field config saved', { locationId })
  return validated
}
