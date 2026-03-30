import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface BarcodeLookupResult {
  product: {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    rec_price: number
    med_price: number | null
    is_cannabis: boolean
    thc_percentage: number | null
    weight_grams: number | null
    flower_equivalent: number | null
    brand_name: string | null
    category_name: string | null
    strain_name: string | null
  }
  inventory_item: {
    id: string
    biotrack_barcode: string | null
    quantity: number
    quantity_reserved: number
  }
  match_type: 'biotrack' | 'product_barcode' | 'sku'
}

const INVENTORY_SELECT = `
  id, biotrack_barcode, quantity, quantity_reserved,
  products!inner (
    id, name, sku, barcode, rec_price, med_price,
    is_cannabis, thc_percentage, weight_grams, flower_equivalent,
    brands ( name ),
    product_categories ( name ),
    strains ( name )
  )
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatResult(row: any, matchType: BarcodeLookupResult['match_type']): BarcodeLookupResult {
  const p = row.products
  return {
    product: {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      rec_price: p.rec_price,
      med_price: p.med_price,
      is_cannabis: p.is_cannabis,
      thc_percentage: p.thc_percentage,
      weight_grams: p.weight_grams,
      flower_equivalent: p.flower_equivalent,
      brand_name: p.brands?.name ?? null,
      category_name: p.product_categories?.name ?? null,
      strain_name: p.strains?.name ?? null,
    },
    inventory_item: {
      id: row.id,
      biotrack_barcode: row.biotrack_barcode,
      quantity: row.quantity,
      quantity_reserved: row.quantity_reserved,
    },
    match_type: matchType,
  }
}

export async function lookupBarcode(
  barcode: string,
  locationId: string,
): Promise<BarcodeLookupResult | null> {
  const sb = await createSupabaseServerClient()
  const code = barcode.trim()

  // 1. BioTrack barcode on inventory
  const { data: biotrack } = await sb
    .from('inventory_items')
    .select(INVENTORY_SELECT)
    .eq('location_id', locationId)
    .eq('biotrack_barcode', code)
    .eq('is_active', true)
    .gt('quantity', 0)
    .order('quantity', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (biotrack) return formatResult(biotrack, 'biotrack')

  // 2. Product-level barcode → find inventory at location
  const { data: prodBarcode } = await sb
    .from('inventory_items')
    .select(INVENTORY_SELECT)
    .eq('location_id', locationId)
    .eq('products.barcode', code)
    .eq('is_active', true)
    .gt('quantity', 0)
    .order('quantity', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (prodBarcode) return formatResult(prodBarcode, 'product_barcode')

  // 4. SKU match
  const { data: skuMatch } = await sb
    .from('inventory_items')
    .select(INVENTORY_SELECT)
    .eq('location_id', locationId)
    .eq('products.sku', code)
    .eq('is_active', true)
    .gt('quantity', 0)
    .order('quantity', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (skuMatch) return formatResult(skuMatch, 'sku')

  logger.info('Barcode not found', { barcode: code, locationId })
  return null
}
