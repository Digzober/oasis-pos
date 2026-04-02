import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const TESTING_STATUS_VALUES = ['untested', 'pending', 'passed', 'failed'] as const

const SearchSchema = z.object({
  query: z.string().min(2).optional(),
  category_id: z.string().uuid().optional(),
  package_id: z.string().optional(),
  batch: z.string().optional(),
  testing_status: z.enum(TESTING_STATUS_VALUES).optional(),
}).refine(d => d.query || d.category_id || d.package_id || d.batch, {
  message: 'Query, category_id, package_id, or batch required',
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()

    const params = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = SearchSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Query, category_id, package_id, or batch required' },
        { status: 400 },
      )
    }

    const { query, category_id, package_id, batch, testing_status } = parsed.data
    const locationId = session.locationId
    const sb = await createSupabaseServerClient()

    // -----------------------------------------------------------
    // Path 1: Inventory-field search (package_id or batch)
    // These search directly against inventory_items fields.
    // -----------------------------------------------------------
    if (package_id || batch) {
      return await handleInventoryFieldSearch(sb, locationId, {
        package_id,
        batch,
        testing_status,
        category_id,
      })
    }

    // -----------------------------------------------------------
    // Path 2: Category-only browse (no text search)
    // -----------------------------------------------------------
    if (!query && category_id) {
      return await handleCategoryBrowse(sb, locationId, category_id, testing_status)
    }

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 })
    }

    // -----------------------------------------------------------
    // Path 3: Barcode scan detection (all digits, 8+ chars)
    // Now also searches inventory_items.biotrack_barcode
    // -----------------------------------------------------------
    const isBarcode = /^\d{8,}$/.test(query)

    if (isBarcode) {
      return await handleBarcodeSearch(sb, locationId, query, testing_status)
    }

    // -----------------------------------------------------------
    // Path 4: General text search across multiple fields
    // Searches: product.name, product.sku, product.barcode,
    //           brand.name, strain.name
    // -----------------------------------------------------------
    return await handleTextSearch(sb, locationId, query, category_id, testing_status)
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product search error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ----------------------------------------------------------------
// Inventory field search: package_id (biotrack_barcode) and batch
// ----------------------------------------------------------------
async function handleInventoryFieldSearch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  locationId: string,
  filters: {
    package_id?: string
    batch?: string
    testing_status?: string
    category_id?: string
  },
) {
  let inventoryQuery = sb
    .from('inventory_items')
    .select(`
      quantity, quantity_reserved, biotrack_barcode, batch_id, lot_number, testing_status,
      products!inner (
        id, name, sku, barcode, rec_price, med_price,
        is_cannabis, thc_percentage, weight_grams, category_id,
        brands ( name ),
        product_categories ( name ),
        strains ( name )
      )
    `)
    .eq('location_id', locationId)
    .eq('is_active', true)
    .gt('quantity', 0)

  if (filters.package_id) {
    const pattern = `%${filters.package_id}%`
    inventoryQuery = inventoryQuery.ilike('biotrack_barcode', pattern)
  }

  if (filters.batch) {
    const batchPattern = `%${filters.batch}%`
    inventoryQuery = inventoryQuery.or(
      `batch_id.ilike.${batchPattern},lot_number.ilike.${batchPattern}`,
    )
  }

  if (filters.testing_status) {
    inventoryQuery = inventoryQuery.eq('testing_status', filters.testing_status)
  }

  const { data: rows } = await inventoryQuery.limit(50)

  let results = formatSearchResults(rows ?? [])

  if (filters.category_id) {
    results = results.filter(
      (r: SearchResult) => r.category_id === filters.category_id,
    )
  }

  return NextResponse.json({ results })
}

// ----------------------------------------------------------------
// Category-only browse
// ----------------------------------------------------------------
async function handleCategoryBrowse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  locationId: string,
  category_id: string,
  testing_status?: string,
) {
  const { data: products } = await sb
    .from('products')
    .select(`
      id, name, sku, barcode, rec_price, med_price,
      is_cannabis, thc_percentage, weight_grams,
      brands ( name ),
      product_categories ( name ),
      strains ( name )
    `)
    .eq('is_active', true)
    .eq('category_id', category_id)
    .limit(50)

  if (!products || products.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const productIds = products.map((p: { id: string }) => p.id)
  let inventoryQuery = sb
    .from('inventory_items')
    .select('product_id, quantity, quantity_reserved')
    .eq('location_id', locationId)
    .eq('is_active', true)
    .gt('quantity', 0)
    .in('product_id', productIds)

  if (testing_status) {
    inventoryQuery = inventoryQuery.eq('testing_status', testing_status)
  }

  const { data: inventory } = await inventoryQuery

  const inventoryMap = new Map<string, number>()
  for (const item of inventory ?? []) {
    const current = inventoryMap.get(item.product_id) ?? 0
    inventoryMap.set(item.product_id, current + item.quantity - item.quantity_reserved)
  }

  const inStockProducts = products
    .filter((p: { id: string }) => (inventoryMap.get(p.id) ?? 0) > 0)
    .map((p: ProductRow) => ({
      id: p.id, name: p.name, sku: p.sku, barcode: p.barcode,
      rec_price: p.rec_price, med_price: p.med_price,
      brand_name: extractName(p.brands),
      category_name: extractName(p.product_categories),
      strain_name: extractName(p.strains),
      quantity_available: inventoryMap.get(p.id) ?? 0,
      thc_percentage: p.thc_percentage, is_cannabis: p.is_cannabis, weight_grams: p.weight_grams,
    }))

  return NextResponse.json({ results: inStockProducts })
}

// ----------------------------------------------------------------
// Barcode scan search (digits only, 8+ chars)
// Searches products.barcode AND inventory_items.biotrack_barcode
// ----------------------------------------------------------------
async function handleBarcodeSearch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  locationId: string,
  query: string,
  testing_status?: string,
) {
  let barcodeQuery = sb
    .from('inventory_items')
    .select(`
      quantity, quantity_reserved, biotrack_barcode, batch_id, lot_number, testing_status,
      products!inner (
        id, name, sku, barcode, rec_price, med_price,
        is_cannabis, thc_percentage, weight_grams,
        brands ( name ),
        product_categories ( name ),
        strains ( name )
      )
    `)
    .eq('location_id', locationId)
    .eq('is_active', true)
    .gt('quantity', 0)
    .or(`biotrack_barcode.eq.${query},products.barcode.eq.${query}`)

  if (testing_status) {
    barcodeQuery = barcodeQuery.eq('testing_status', testing_status)
  }

  const { data: barcodeResults } = await barcodeQuery.limit(20)

  return NextResponse.json({
    results: formatSearchResults(barcodeResults ?? []),
  })
}

// ----------------------------------------------------------------
// General text search
// Two-pass: first try via inventory_items join, then fallback to
// products-first approach. Searches across product name, sku,
// barcode, brand name, and strain name.
// ----------------------------------------------------------------
async function handleTextSearch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  locationId: string,
  query: string,
  category_id?: string,
  testing_status?: string,
) {
  const searchPattern = `%${query}%`

  // --- Pass 1: Search via inventory_items with nested product filters ---
  let inventoryQuery = sb
    .from('inventory_items')
    .select(`
      quantity, quantity_reserved, biotrack_barcode, batch_id, lot_number, testing_status,
      products!inner (
        id, name, sku, barcode, rec_price, med_price,
        is_cannabis, thc_percentage, weight_grams,
        brands ( name ),
        product_categories ( name ),
        strains ( name )
      )
    `)
    .eq('location_id', locationId)
    .eq('is_active', true)
    .gt('quantity', 0)
    .or(
      `products.name.ilike.${searchPattern},products.sku.ilike.${searchPattern}`,
      { referencedTable: undefined },
    )

  if (testing_status) {
    inventoryQuery = inventoryQuery.eq('testing_status', testing_status)
  }

  const { data: results } = await inventoryQuery.limit(50)

  if (results && results.length > 0) {
    let formatted = formatSearchResults(results)
    if (category_id) {
      formatted = formatted.filter((r: SearchResult) => r.category_id === category_id)
    }
    return NextResponse.json({ results: formatted })
  }

  // --- Pass 2: Fallback — search products first, then check inventory ---
  // This pass broadens the search to also match brand name, strain name,
  // and product barcode via separate queries.

  // 2a. Direct product search: name, sku, barcode
  let productQuery = sb
    .from('products')
    .select(`
      id, name, sku, barcode, rec_price, med_price,
      is_cannabis, thc_percentage, weight_grams,
      brands ( name ),
      product_categories ( name ),
      strains ( name )
    `)
    .eq('is_active', true)
    .or(`name.ilike.${searchPattern},sku.ilike.${searchPattern},barcode.ilike.${searchPattern}`)
  if (category_id) productQuery = productQuery.eq('category_id', category_id)
  const { data: directProducts } = await productQuery.limit(50)

  // 2b. Brand name search: find brands matching query, then products
  const { data: matchingBrands } = await sb
    .from('brands')
    .select('id')
    .ilike('name', searchPattern)
    .limit(20)

  let brandProducts: ProductRow[] = []
  if (matchingBrands && matchingBrands.length > 0) {
    const brandIds = matchingBrands.map((b: { id: string }) => b.id)
    let brandQuery = sb
      .from('products')
      .select(`
        id, name, sku, barcode, rec_price, med_price,
        is_cannabis, thc_percentage, weight_grams,
        brands ( name ),
        product_categories ( name ),
        strains ( name )
      `)
      .eq('is_active', true)
      .in('brand_id', brandIds)
    if (category_id) brandQuery = brandQuery.eq('category_id', category_id)
    const { data } = await brandQuery.limit(50)
    brandProducts = data ?? []
  }

  // 2c. Strain name search: find strains matching query, then products
  const { data: matchingStrains } = await sb
    .from('strains')
    .select('id')
    .ilike('name', searchPattern)
    .limit(20)

  let strainProducts: ProductRow[] = []
  if (matchingStrains && matchingStrains.length > 0) {
    const strainIds = matchingStrains.map((s: { id: string }) => s.id)
    let strainQuery = sb
      .from('products')
      .select(`
        id, name, sku, barcode, rec_price, med_price,
        is_cannabis, thc_percentage, weight_grams,
        brands ( name ),
        product_categories ( name ),
        strains ( name )
      `)
      .eq('is_active', true)
      .in('strain_id', strainIds)
    if (category_id) strainQuery = strainQuery.eq('category_id', category_id)
    const { data } = await strainQuery.limit(50)
    strainProducts = data ?? []
  }

  // Merge and deduplicate products from all sources
  const productMap = new Map<string, ProductRow>()
  for (const p of [...(directProducts ?? []), ...brandProducts, ...strainProducts]) {
    if (!productMap.has(p.id)) {
      productMap.set(p.id, p)
    }
  }

  const allProducts = Array.from(productMap.values())

  if (allProducts.length === 0) {
    return NextResponse.json({ results: [] })
  }

  // Fetch inventory for all matched products at this location
  const productIds = allProducts.map((p) => p.id)
  let invQuery = sb
    .from('inventory_items')
    .select('product_id, quantity, quantity_reserved')
    .eq('location_id', locationId)
    .eq('is_active', true)
    .gt('quantity', 0)
    .in('product_id', productIds)

  if (testing_status) {
    invQuery = invQuery.eq('testing_status', testing_status)
  }

  const { data: inventory } = await invQuery

  const inventoryMap = new Map<string, number>()
  for (const item of inventory ?? []) {
    const current = inventoryMap.get(item.product_id) ?? 0
    inventoryMap.set(item.product_id, current + item.quantity - item.quantity_reserved)
  }

  const inStockProducts = allProducts
    .filter((p) => (inventoryMap.get(p.id) ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      rec_price: p.rec_price,
      med_price: p.med_price,
      brand_name: extractName(p.brands),
      category_name: extractName(p.product_categories),
      strain_name: extractName(p.strains),
      quantity_available: inventoryMap.get(p.id) ?? 0,
      thc_percentage: p.thc_percentage,
      is_cannabis: p.is_cannabis,
      weight_grams: p.weight_grams,
    }))

  return NextResponse.json({ results: inStockProducts })
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

interface ProductRow {
  id: string
  name: string
  sku: string
  barcode: string | null
  rec_price: number | null
  med_price: number | null
  is_cannabis: boolean
  thc_percentage: number | null
  weight_grams: number | null
  category_id?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brands: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product_categories: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  strains: any
}

interface SearchResult {
  id: string
  category_id?: string | null
  [key: string]: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractName(relation: any): string | null {
  if (!relation) return null
  if (typeof relation === 'object' && 'name' in relation) return relation.name
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatSearchResults(rows: any[]): SearchResult[] {
  const grouped = new Map<string, { product: Record<string, unknown>; qty: number }>()

  for (const row of rows) {
    const p = row.products
    if (!p) continue
    const existing = grouped.get(p.id)
    const available = row.quantity - row.quantity_reserved
    if (existing) {
      existing.qty += available
    } else {
      grouped.set(p.id, {
        product: p,
        qty: available,
      })
    }
  }

  return Array.from(grouped.values()).map(({ product: p, qty }) => ({
    id: p.id as string,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    rec_price: p.rec_price,
    med_price: p.med_price,
    brand_name: extractName(p.brands),
    category_name: extractName(p.product_categories),
    category_id: p.category_id as string | undefined,
    strain_name: extractName(p.strains),
    quantity_available: qty,
    thc_percentage: p.thc_percentage,
    is_cannabis: p.is_cannabis,
    weight_grams: p.weight_grams,
  }))
}
