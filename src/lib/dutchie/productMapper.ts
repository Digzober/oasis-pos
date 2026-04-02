import { logger } from '@/lib/utils/logger'
import type { DutchieProduct } from './client'

/**
 * Maps a Dutchie product record to our products table schema.
 *
 * FK lookups (brand_id, vendor_id, strain_id, category_id) must be resolved
 * by the sync orchestrator BEFORE calling this mapper. This mapper only handles
 * scalar field mapping and data type transformations.
 *
 * CHECK constraints enforced:
 * - product_type: 'quantity' | 'weight'
 * - net_weight_unit: 'g' | 'mg' | 'oz' | 'ml'
 * - slug: NOT NULL (generated from name + dutchie_product_id)
 */

export interface MappedProduct {
  name: string
  slug: string
  sku: string | null
  description: string | null
  is_cannabis: boolean
  is_active: boolean
  rec_price: number | null
  med_price: number | null
  cost_price: number | null
  thc_percentage: number | null
  thc_content_mg: number | null
  cbd_percentage: number | null
  cbd_content_mg: number | null
  weight_grams: number | null
  flower_equivalent: number | null
  product_type: 'quantity' | 'weight'
  default_unit: string
  online_title: string | null
  online_description: string | null
  available_online: boolean
  available_on_pos: boolean
  flavor: string | null
  alternate_name: string | null
  dosage: string | null
  instructions: string | null
  allergens: string | null
  standard_allergens: Record<string, boolean> | null
  is_taxable: boolean
  regulatory_category: string | null
  external_category: string | null
  administration_method: string | null
  unit_cbd_dose: number | null
  unit_thc_dose: number | null
  ingredients: string | null
  allow_automatic_discounts: boolean
  gross_weight_grams: number | null
  net_weight: number | null
  net_weight_unit: 'g' | 'mg' | 'oz' | 'ml' | null
  size: string | null
  oil_volume: number | null
  serving_size: string | null
  serving_size_per_unit: number | null
  is_coupon: boolean
  max_per_transaction: number | null
  is_on_sale: boolean
  sale_price: number | null
  available_for: string | null
  dutchie_product_id: number
}

/**
 * Parses THC/CBD content strings from Dutchie into percentage and mg values.
 */
function parseCannaContent(content: string | null, unit: string | null): {
  percentage: number | null
  mg: number | null
} {
  if (!content) return { percentage: null, mg: null }

  const value = parseFloat(content)
  if (isNaN(value)) return { percentage: null, mg: null }

  if (unit === '%' || unit === 'percent' || unit === 'PERCENT') {
    return { percentage: value, mg: null }
  }
  if (unit === 'mg' || unit === 'MG') {
    return { percentage: null, mg: value }
  }

  if (value > 100) {
    return { percentage: null, mg: value }
  }
  return { percentage: value, mg: null }
}

/**
 * Generates a URL-safe slug from a product name + dutchie ID for uniqueness.
 */
function generateSlug(name: string, dutchieProductId: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)

  return `${base || 'product'}-d${dutchieProductId}`
}

/**
 * Maps Dutchie unitType to our CHECK constraint: 'quantity' | 'weight'.
 */
function mapProductType(unitType: string | null): 'quantity' | 'weight' {
  if (!unitType) return 'quantity'
  const lower = unitType.toLowerCase()
  if (lower === 'weight' || lower === 'gram' || lower === 'grams' || lower === 'g'
    || lower === 'oz' || lower === 'ounce' || lower === 'eighth' || lower === 'half'
    || lower === 'quarter' || lower === 'bulk') {
    return 'weight'
  }
  return 'quantity'
}

/**
 * Maps Dutchie unit to our default_unit CHECK: 'each' | 'gram' | 'eighth' | 'quarter' | 'half' | 'ounce'.
 */
function mapDefaultUnit(dutchieUnit: string | null, productType: 'quantity' | 'weight'): string {
  if (!dutchieUnit) return productType === 'weight' ? 'gram' : 'each'
  const lower = dutchieUnit.toLowerCase()
  if (lower === 'each' || lower === 'ea' || lower === 'unit') return 'each'
  if (lower === 'gram' || lower === 'g') return 'gram'
  if (lower === 'eighth' || lower === '3.5g' || lower === '3.5') return 'eighth'
  if (lower === 'quarter' || lower === '7g' || lower === '7') return 'quarter'
  if (lower === 'half' || lower === '14g' || lower === '14') return 'half'
  if (lower === 'ounce' || lower === 'oz' || lower === '28g' || lower === '28') return 'ounce'
  return productType === 'weight' ? 'gram' : 'each'
}

/**
 * Maps Dutchie netWeightUnit to our CHECK constraint: 'g' | 'mg' | 'oz' | 'ml'.
 */
function mapNetWeightUnit(unit: string | null): 'g' | 'mg' | 'oz' | 'ml' | null {
  if (!unit) return null
  const lower = unit.toLowerCase().trim()
  if (lower === 'g' || lower === 'gram' || lower === 'grams') return 'g'
  if (lower === 'mg' || lower === 'milligram' || lower === 'milligrams') return 'mg'
  if (lower === 'oz' || lower === 'ounce' || lower === 'ounces') return 'oz'
  if (lower === 'ml' || lower === 'milliliter' || lower === 'milliliters') return 'ml'
  return 'g' // default unknown to grams
}

export function mapDutchieProduct(dp: DutchieProduct): MappedProduct {
  const thc = parseCannaContent(dp.thcContent, dp.thcContentUnit)
  const cbd = parseCannaContent(dp.cbdContent, dp.cbdContentUnit)
  const name = dp.productName || dp.internalName || `Unknown Product ${dp.productId}`

  return {
    name,
    slug: generateSlug(name, dp.productId),
    sku: dp.sku || null,
    description: dp.description || null,
    is_cannabis: dp.isCannabis ?? false,
    is_active: dp.isActive ?? true,
    rec_price: dp.recPrice ?? dp.price ?? null,
    med_price: dp.medPrice ?? dp.price ?? null,
    cost_price: dp.unitCost ?? null,
    thc_percentage: thc.percentage,
    thc_content_mg: thc.mg,
    cbd_percentage: cbd.percentage,
    cbd_content_mg: cbd.mg,
    weight_grams: dp.productGrams ?? null,
    flower_equivalent: dp.flowerEquivalent ?? null,
    product_type: mapProductType(dp.unitType),
    default_unit: mapDefaultUnit(dp.unitType, mapProductType(dp.unitType)),
    online_title: dp.onlineTitle ?? null,
    online_description: dp.onlineDescription ?? null,
    available_online: dp.onlineProduct ?? false,
    available_on_pos: dp.posProducts ?? true,
    flavor: dp.flavor ?? null,
    alternate_name: dp.alternateName ?? null,
    dosage: dp.dosage ?? null,
    instructions: dp.instructions ?? null,
    allergens: dp.allergens ?? null,
    standard_allergens: dp.standardAllergens ?? null,
    is_taxable: dp.isTaxable ?? true,
    regulatory_category: dp.regulatoryCategory ?? null,
    external_category: dp.externalCategory ?? null,
    administration_method: dp.administrationMethod ?? null,
    unit_cbd_dose: dp.unitCBDContentDose ?? null,
    unit_thc_dose: dp.unitTHCContentDose ?? null,
    ingredients: dp.ingredientList ?? null,
    allow_automatic_discounts: dp.allowAutomaticDiscounts ?? true,
    gross_weight_grams: dp.grossWeight ?? null,
    net_weight: dp.netWeight ?? null,
    net_weight_unit: mapNetWeightUnit(dp.netWeightUnit),
    size: dp.size ?? null,
    oil_volume: dp.oilVolume ?? null,
    serving_size: dp.servingSize ?? null,
    serving_size_per_unit: dp.servingSizePerUnit ?? null,
    is_coupon: dp.isCoupon ?? false,
    max_per_transaction: dp.maxPurchaseablePerTransaction ?? null,
    is_on_sale: dp.isOnSale ?? false,
    sale_price: dp.salePrice ?? null,
    available_for: dp.availableFor ?? null,
    dutchie_product_id: dp.productId,
  }
}

/**
 * Extracts unique brand names, vendor names, strain names, and category names
 * from a batch of Dutchie products.
 */
export function extractLookupEntities(products: DutchieProduct[]): {
  brands: Set<string>
  vendors: Set<string>
  strains: Set<string>
  categories: Set<string>
  tags: Set<string>
} {
  const brands = new Set<string>()
  const vendors = new Set<string>()
  const strains = new Set<string>()
  const categories = new Set<string>()
  const tags = new Set<string>()

  for (const p of products) {
    if (p.brandName) brands.add(p.brandName.trim())
    if (p.vendorName) vendors.add(p.vendorName.trim())
    if (p.strain) strains.add(p.strain.trim())
    if (p.category) categories.add(p.category.trim())
    if (p.masterCategory) categories.add(p.masterCategory.trim())
    if (p.tags) {
      for (const tag of p.tags) {
        if (tag.trim()) tags.add(tag.trim())
      }
    }
  }

  logger.info('Extracted lookup entities from Dutchie products', {
    brands: brands.size,
    vendors: vendors.size,
    strains: strains.size,
    categories: categories.size,
    tags: tags.size,
  })

  return { brands, vendors, strains, categories, tags }
}
