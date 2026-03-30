import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const SearchSchema = z.object({
  query: z.string().min(2),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()

    const params = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = SearchSchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 },
      )
    }

    const { query } = parsed.data
    const locationId = session.locationId
    const sb = await createSupabaseServerClient()

    // Check if query looks like a barcode (all digits, 8+ chars)
    const isBarcode = /^\d{8,}$/.test(query)

    if (isBarcode) {
      // Search by barcode or biotrack_barcode on inventory items
      const { data: barcodeResults } = await sb
        .from('inventory_items')
        .select(`
          quantity, quantity_reserved,
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
        .limit(20)

      return NextResponse.json({
        results: formatSearchResults(barcodeResults ?? []),
      })
    }

    // Text search: join products with inventory to only return in-stock items
    const searchPattern = `%${query}%`

    const { data: results } = await sb
      .from('inventory_items')
      .select(`
        quantity, quantity_reserved,
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
      .or(`products.name.ilike.${searchPattern},products.sku.ilike.${searchPattern}`, { referencedTable: undefined })
      .limit(20)

    // If Supabase nested filter doesn't work well, fall back to a two-step approach
    if (results && results.length > 0) {
      return NextResponse.json({ results: formatSearchResults(results) })
    }

    // Fallback: search products first, then check inventory
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
      .or(`name.ilike.${searchPattern},sku.ilike.${searchPattern}`)
      .limit(20)

    if (!products || products.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const productIds = products.map((p) => p.id)
    const { data: inventory } = await sb
      .from('inventory_items')
      .select('product_id, quantity, quantity_reserved')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .gt('quantity', 0)
      .in('product_id', productIds)

    const inventoryMap = new Map<string, number>()
    for (const item of inventory ?? []) {
      const current = inventoryMap.get(item.product_id) ?? 0
      inventoryMap.set(item.product_id, current + item.quantity - item.quantity_reserved)
    }

    const inStockProducts = products
      .filter((p) => (inventoryMap.get(p.id) ?? 0) > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        rec_price: p.rec_price,
        med_price: p.med_price,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        brand_name: (p.brands as any)?.name ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        category_name: (p.product_categories as any)?.name ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        strain_name: (p.strains as any)?.name ?? null,
        quantity_available: inventoryMap.get(p.id) ?? 0,
        thc_percentage: p.thc_percentage,
        is_cannabis: p.is_cannabis,
        weight_grams: p.weight_grams,
      }))

    return NextResponse.json({ results: inStockProducts })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product search error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatSearchResults(rows: any[]): any[] {
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
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    rec_price: p.rec_price,
    med_price: p.med_price,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    brand_name: (p.brands as any)?.name ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    category_name: (p.product_categories as any)?.name ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strain_name: (p.strains as any)?.name ?? null,
    quantity_available: qty,
    thc_percentage: p.thc_percentage,
    is_cannabis: p.is_cannabis,
    weight_grams: p.weight_grams,
  }))
}
