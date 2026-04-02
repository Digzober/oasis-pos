import type { DutchieProduct } from '../types'

type ProductType = 'quantity' | 'weight'
type DefaultUnit = 'each' | 'gram' | 'eighth' | 'quarter' | 'half' | 'ounce'
type StrainType = 'indica' | 'sativa' | 'hybrid' | 'cbd'
type NetWeightUnit = 'g' | 'mg' | 'oz' | 'ml'

const PRODUCT_TYPE_MAP: Record<string, ProductType> = {
  quantity: 'quantity',
  each: 'quantity',
  unit: 'quantity',
  weight: 'weight',
  gram: 'weight',
  grams: 'weight',
  bulk: 'weight',
}

const UNIT_MAP: Record<string, DefaultUnit> = {
  each: 'each',
  unit: 'each',
  units: 'each',
  gram: 'gram',
  grams: 'gram',
  g: 'gram',
  eighth: 'eighth',
  '3.5g': 'eighth',
  quarter: 'quarter',
  '7g': 'quarter',
  half: 'half',
  '14g': 'half',
  ounce: 'ounce',
  oz: 'ounce',
  '28g': 'ounce',
}

const STRAIN_TYPE_MAP: Record<string, StrainType> = {
  indica: 'indica',
  sativa: 'sativa',
  hybrid: 'hybrid',
  cbd: 'cbd',
  'indica dominant': 'indica',
  'sativa dominant': 'sativa',
  'indica-dominant': 'indica',
  'sativa-dominant': 'sativa',
  'high cbd': 'cbd',
}

const NET_WEIGHT_UNIT_MAP: Record<string, NetWeightUnit> = {
  g: 'g',
  grams: 'g',
  gram: 'g',
  mg: 'mg',
  milligrams: 'mg',
  oz: 'oz',
  ounce: 'oz',
  ml: 'ml',
  milliliters: 'ml',
}

function generateSlug(name: string, dutchieId: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base}-d${dutchieId}`
}

function parseContentToPercentage(content: string | null, unit: string | null): number | null {
  if (!content) return null
  const num = parseFloat(content)
  if (isNaN(num)) return null
  const normalizedUnit = unit?.toLowerCase().trim() ?? ''
  if (normalizedUnit === '%' || normalizedUnit === 'percent' || normalizedUnit === 'percentage') {
    return num
  }
  if (normalizedUnit === 'mg' || normalizedUnit === 'mg/g') {
    return num / 10
  }
  return num
}

function parseContentToMg(content: string | null, unit: string | null): number | null {
  if (!content) return null
  const num = parseFloat(content)
  if (isNaN(num)) return null
  const normalizedUnit = unit?.toLowerCase().trim() ?? ''
  if (normalizedUnit === 'mg') return num
  if (normalizedUnit === 'g' || normalizedUnit === 'grams') return num * 1000
  if (normalizedUnit === '%' || normalizedUnit === 'percent') return null
  return num
}

export interface MappedProductRow {
  organization_id: string
  category_id: string | null
  name: string
  slug: string
  internal_name: string | null
  description: string | null
  sku: string | null
  upc: string | null
  product_type: ProductType
  default_unit: DefaultUnit
  strain_type: StrainType | null
  brand_id: string | null
  vendor_id: string | null
  strain_id: string | null
  is_cannabis: boolean
  is_active: boolean
  rec_price: number | null
  med_price: number | null
  unit_cost: number | null
  thc_percentage: number | null
  cbd_percentage: number | null
  thc_mg: number | null
  cbd_mg: number | null
  thc_content_dose: number | null
  cbd_content_dose: number | null
  flower_equivalent: number | null
  net_weight: number | null
  net_weight_unit: NetWeightUnit | null
  gross_weight: number | null
  online_title: string | null
  online_description: string | null
  is_online: boolean
  is_pos: boolean
  is_on_sale: boolean
  sale_price: number | null
  flavor: string | null
  dosage: string | null
  instructions: string | null
  allergens: string | null
  ingredient_list: string | null
  allow_automatic_discounts: boolean
  max_per_transaction: number | null
  image_url: string | null
  dutchie_product_id: number
}

export interface MappedLocationPriceRow {
  product_id: string | null
  location_id: string
  rec_price: number | null
  med_price: number | null
  unit_cost: number | null
  is_pos_available: boolean
  is_online_available: boolean
}

export interface MappedProductResult {
  product: MappedProductRow
  locationPrice: MappedLocationPriceRow
}

export function mapProduct(
  source: DutchieProduct,
  organizationId: string,
  locationId: string,
): MappedProductResult {
  const normalizedUnitType = source.unitType?.toLowerCase().trim() ?? ''
  const productType: ProductType = PRODUCT_TYPE_MAP[normalizedUnitType] ?? 'quantity'
  const defaultUnit: DefaultUnit = UNIT_MAP[normalizedUnitType] ?? 'each'

  const normalizedStrainType = source.strainType?.toLowerCase().trim() ?? ''
  const strainType: StrainType | null = STRAIN_TYPE_MAP[normalizedStrainType] ?? null

  const normalizedNetWeightUnit = source.netWeightUnit?.toLowerCase().trim() ?? ''
  const netWeightUnit: NetWeightUnit | null = NET_WEIGHT_UNIT_MAP[normalizedNetWeightUnit] ?? null

  const thcPercentage = parseContentToPercentage(source.thcContent, source.thcContentUnit)
  const cbdPercentage = parseContentToPercentage(source.cbdContent, source.cbdContentUnit)
  const thcMg = parseContentToMg(source.thcContent, source.thcContentUnit)
  const cbdMg = parseContentToMg(source.cbdContent, source.cbdContentUnit)

  const product: MappedProductRow = {
    organization_id: organizationId,
    category_id: null,
    name: source.productName,
    slug: generateSlug(source.productName, source.productId),
    internal_name: source.internalName ?? null,
    description: source.description ?? null,
    sku: source.sku ?? null,
    upc: source.upc ?? null,
    product_type: productType,
    default_unit: defaultUnit,
    strain_type: strainType,
    brand_id: null,
    vendor_id: null,
    strain_id: null,
    is_cannabis: source.isCannabis,
    is_active: source.isActive,
    rec_price: source.recPrice ?? source.price ?? null,
    med_price: source.medPrice ?? source.price ?? null,
    unit_cost: source.unitCost ?? null,
    thc_percentage: thcPercentage,
    cbd_percentage: cbdPercentage,
    thc_mg: thcMg,
    cbd_mg: cbdMg,
    thc_content_dose: source.unitTHCContentDose ?? null,
    cbd_content_dose: source.unitCBDContentDose ?? null,
    flower_equivalent: source.flowerEquivalent ?? null,
    net_weight: source.netWeight ?? null,
    net_weight_unit: netWeightUnit,
    gross_weight: source.grossWeight ?? null,
    online_title: source.onlineTitle ?? null,
    online_description: source.onlineDescription ?? null,
    is_online: source.onlineProduct,
    is_pos: source.posProducts,
    is_on_sale: source.isOnSale,
    sale_price: source.salePrice ?? null,
    flavor: source.flavor ?? null,
    dosage: source.dosage ?? null,
    instructions: source.instructions ?? null,
    allergens: source.allergens ?? null,
    ingredient_list: source.ingredientList ?? null,
    allow_automatic_discounts: source.allowAutomaticDiscounts,
    max_per_transaction: source.maxPurchaseablePerTransaction ?? null,
    image_url: source.imageUrl ?? null,
    dutchie_product_id: source.productId,
  }

  const locationPrice: MappedLocationPriceRow = {
    product_id: null,
    location_id: locationId,
    rec_price: source.recPrice ?? source.price ?? null,
    med_price: source.medPrice ?? source.price ?? null,
    unit_cost: source.unitCost ?? null,
    is_pos_available: source.posProducts,
    is_online_available: source.onlineAvailable,
  }

  return { product, locationPrice }
}
