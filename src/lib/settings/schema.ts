import { z } from 'zod/v4'
import { CARD_FIELD_KEYS, CARD_STATUS_KEYS } from '@/lib/customers/cardFields'

export const ROUNDING_METHODS = [
  'none', 'round_up_025', 'round_up_050', 'round_up_100',
  'round_down_025', 'round_down_050', 'round_down_100',
  'round_nearest_005', 'round_nearest_010', 'round_nearest_025',
  'round_nearest_050',
] as const

export const PRODUCT_FIELD_KEYS = [
  'name', 'sku', 'barcode', 'description', 'category', 'brand', 'vendor',
  'strain', 'rec_price', 'med_price', 'cost_price', 'weight_grams',
  'thc_percentage', 'cbd_percentage', 'thc_content_mg', 'cbd_content_mg',
  'flower_equivalent', 'external_category', 'regulatory_category',
  'online_title', 'online_description', 'alternate_name', 'producer', 'size',
  'flavor', 'available_for', 'is_taxable', 'allow_automatic_discounts',
  'dosage', 'net_weight', 'gross_weight', 'unit_thc_dose', 'unit_cbd_dose',
  'administration_method', 'package_size', 'external_sub_category',
  'allergens', 'ingredients', 'instructions',
] as const

const CheckoutSchema = z.object({
  rounding_method: z.enum(ROUNDING_METHODS),
  require_customer: z.boolean(),
}).strict()

const ComplianceSchema = z.object({ require_id_scan: z.boolean() }).strict()
const PrintingSchema = z.object({
  auto_print_receipt_default: z.boolean(),
  auto_print_label_default: z.boolean(),
}).strict()
const InventorySchema = z.object({
  low_stock_threshold: z.number().int().min(0).max(1_000_000),
}).strict()
const OnlineSchema = z.object({
  reserve_inventory: z.boolean(),
  pickup_window_minutes: z.number().int().min(1).max(1440),
  max_advance_order_days: z.number().int().min(0).max(365),
}).strict()

export const CanonicalSettingsSchema = z.object({
  checkout: CheckoutSchema,
  compliance: ComplianceSchema,
  printing: PrintingSchema,
  inventory: InventorySchema,
  online: OnlineSchema,
}).strict()

const canonicalOverrideShape = {
  checkout: CheckoutSchema.partial().optional(),
  compliance: ComplianceSchema.partial().optional(),
  printing: PrintingSchema.partial().optional(),
  inventory: InventorySchema.partial().optional(),
  online: OnlineSchema.partial().optional(),
}

export const OrganizationSettingsOverrideSchema = z.object(canonicalOverrideShape).strict()

const FieldVisibilitySchema = z.enum(['required', 'show', 'hide'])
const productFieldShape = Object.fromEntries(
  PRODUCT_FIELD_KEYS.map((key) => [key, FieldVisibilitySchema]),
) as Record<typeof PRODUCT_FIELD_KEYS[number], typeof FieldVisibilitySchema>
export const ProductFieldConfigSchema = z.object(productFieldShape).strict()

const cardFieldShape = Object.fromEntries(
  CARD_FIELD_KEYS.map((key) => [key, z.boolean().optional()]),
) as Record<typeof CARD_FIELD_KEYS[number], z.ZodOptional<z.ZodBoolean>>
const cardStatusShape = Object.fromEntries(
  CARD_STATUS_KEYS.map((key) => [key, z.object(cardFieldShape).strict().optional()]),
) as Record<typeof CARD_STATUS_KEYS[number], z.ZodOptional<z.ZodObject<typeof cardFieldShape>>>
export const CustomerCardFieldsSchema = z.object(cardStatusShape).strict()

export const POS_CUSTOMER_FIELD_KEYS = ['phone', 'email', 'mmj_id', 'mmj_id_exp'] as const
export const BACKEND_CUSTOMER_FIELD_KEYS = [
  'name', 'id_expiration', 'address1', 'address2', 'city', 'state', 'zip',
  'status', 'dob', 'drivers_license', 'drivers_license_exp', 'phone',
  'mobile_phone', 'email', 'middle_name', 'suffix', 'gender', 'notes',
  'caregiver_first', 'caregiver_last', 'caregiver_phone', 'caregiver_email',
  'prefix', 'mmj_id', 'last_name',
] as const

function visibilityShape<const T extends readonly string[]>(keys: T) {
  return Object.fromEntries(
    keys.map((key) => [key, FieldVisibilitySchema.optional()]),
  ) as Record<T[number], z.ZodOptional<typeof FieldVisibilitySchema>>
}

export const CustomerFieldVisibilitySchema = z.object({
  pos: z.object(visibilityShape(POS_CUSTOMER_FIELD_KEYS)).strict().optional(),
  backend: z.object(visibilityShape(BACKEND_CUSTOMER_FIELD_KEYS)).strict().optional(),
}).strict()

export const LocationSettingsOverrideSchema = z.object({
  ...canonicalOverrideShape,
  customer_card_fields: CustomerCardFieldsSchema.optional(),
  customer_field_visibility: CustomerFieldVisibilitySchema.optional(),
  product_field_config: ProductFieldConfigSchema.optional(),
}).strict()

export type EffectiveSettings = z.infer<typeof CanonicalSettingsSchema>
export type OrganizationSettingsOverride = z.infer<typeof OrganizationSettingsOverrideSchema>
export type LocationSettingsOverride = z.infer<typeof LocationSettingsOverrideSchema>

export const DEFAULT_SETTINGS = CanonicalSettingsSchema.parse({
  checkout: { rounding_method: 'none', require_customer: false },
  compliance: { require_id_scan: false },
  printing: { auto_print_receipt_default: true, auto_print_label_default: false },
  inventory: { low_stock_threshold: 5 },
  online: { reserve_inventory: false, pickup_window_minutes: 30, max_advance_order_days: 1 },
})

export const CANONICAL_NAMESPACES = [
  'checkout', 'compliance', 'printing', 'inventory', 'online',
] as const

export const CANONICAL_SETTING_PATHS = [
  'checkout.rounding_method',
  'checkout.require_customer',
  'compliance.require_id_scan',
  'printing.auto_print_receipt_default',
  'printing.auto_print_label_default',
  'inventory.low_stock_threshold',
  'online.reserve_inventory',
  'online.pickup_window_minutes',
  'online.max_advance_order_days',
] as const

export const CanonicalSettingPathSchema = z.enum(CANONICAL_SETTING_PATHS)
export type CanonicalSettingPath = z.infer<typeof CanonicalSettingPathSchema>

export const LOCATION_SETTINGS_REGISTRY_PATHS = [
  ...CANONICAL_SETTING_PATHS,
  ...Object.keys(LocationSettingsOverrideSchema.shape).flatMap((key) => {
    if ((CANONICAL_NAMESPACES as readonly string[]).includes(key)) return []
    if (key === 'product_field_config') {
      return PRODUCT_FIELD_KEYS.map((field) => `product_field_config.${field}`)
    }
    return [key]
  }),
].sort()

export function pickCanonicalOverride(settings: LocationSettingsOverride): OrganizationSettingsOverride {
  return Object.fromEntries(
    CANONICAL_NAMESPACES.flatMap((key) => settings[key] ? [[key, settings[key]]] : []),
  ) as OrganizationSettingsOverride
}
