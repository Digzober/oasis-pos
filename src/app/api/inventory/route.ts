import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const p = request.nextUrl.searchParams
    const locationId = p.get('location_id') ?? session.locationId
    const page = Number(p.get('page') || 1)
    const perPage = Math.min(Number(p.get('per_page') || 50), 100)
    const offset = (page - 1) * perPage

    const sb = await createSupabaseServerClient()

    const selectFields = [
      '*',
      'products ( id, name, sku, rec_price, med_price, thc_percentage, cbd_percentage, thc_content_mg, flower_equivalent, brand_id, vendor_id, category_id, strain_id, brands ( id, name ), vendors ( id, name, vendor_code ), strains ( id, name, strain_type ), product_categories ( id, name ) )',
      'rooms ( id, name )',
    ].join(', ')

    let query = sb
      .from('inventory_items')
      .select(selectFields, { count: 'exact' })
      .eq('location_id', locationId)
      .eq('is_active', true)

    const productId = p.get('product_id')
    const roomId = p.get('room_id')
    const brandId = p.get('brand_id')
    const vendorId = p.get('vendor_id')
    const categoryId = p.get('category_id')
    const testingStatus = p.get('testing_status')
    const search = p.get('search')
    const sortBy = p.get('sort_by') || 'created_at'
    const sortDir = p.get('sort_dir') || 'desc'
    const onHold = p.get('on_hold')
    const tagIds = p.get('tag_ids')

    if (productId) query = query.eq('product_id', productId)
    if (roomId) query = query.eq('room_id', roomId)
    if (testingStatus) query = query.eq('testing_status', testingStatus)

    // For brand/category filtering, pre-fetch matching product IDs
    if (brandId || categoryId) {
      let productQuery = sb.from('products').select('id').eq('organization_id', session.organizationId)
      if (brandId) productQuery = productQuery.eq('brand_id', brandId)
      if (categoryId) productQuery = productQuery.eq('category_id', categoryId)
      const { data: filteredProducts } = await productQuery
      if (filteredProducts && filteredProducts.length > 0) {
        query = query.in('product_id', filteredProducts.map(p => p.id))
      } else {
        // No matching products — return empty
        return NextResponse.json({ items: [], pagination: { page, per_page: perPage, total: 0, total_pages: 0 } })
      }
    }
    if (vendorId) query = query.eq('vendor_id', vendorId)

    if (onHold === 'true') {
      query = query.eq('is_on_hold', true)
    }

    // Filter by inventory tags: pre-fetch matching item IDs
    if (tagIds) {
      const tagIdArray = tagIds.split(',').filter(Boolean)
      if (tagIdArray.length > 0) {
        const { data: taggedItems } = await sb
          .from('inventory_item_tags')
          .select('inventory_item_id')
          .in('tag_id', tagIdArray)

        if (taggedItems && taggedItems.length > 0) {
          const uniqueIds = [...new Set(taggedItems.map((t) => t.inventory_item_id))]
          query = query.in('id', uniqueIds)
        } else {
          return NextResponse.json({ items: [], pagination: { page, per_page: perPage, total: 0, total_pages: 0 } })
        }
      }
    }

    if (search) {
      // Search inventory_items direct fields only (nested relation filters not supported in .or())
      // For product name/SKU search, pre-fetch matching product IDs
      const { data: matchingProducts } = await sb
        .from('products')
        .select('id')
        .eq('organization_id', session.organizationId)
        .or(`name.ilike.%${search}%,sku.ilike.%${search}%`)

      const productIds = (matchingProducts ?? []).map(p => p.id)

      if (productIds.length > 0) {
        query = query.or(
          `biotrack_barcode.ilike.%${search}%,batch_id.ilike.%${search}%,lot_number.ilike.%${search}%,product_id.in.(${productIds.join(',')})`
        )
      } else {
        query = query.or(
          `biotrack_barcode.ilike.%${search}%,batch_id.ilike.%${search}%,lot_number.ilike.%${search}%`
        )
      }
    }

    // Validate sort field to prevent injection
    const ALLOWED_SORT_FIELDS = [
      'created_at', 'updated_at', 'quantity', 'cost_per_unit',
      'batch_id', 'lot_number', 'testing_status', 'expiration_date', 'received_at',
    ]
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at'
    const ascending = sortDir === 'asc'

    const { data, count, error } = await query
      .order(safeSortBy, { ascending })
      .range(offset, offset + perPage - 1)

    if (error) {
      logger.error('Inventory list error', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
    }

    return NextResponse.json({
      items: data ?? [],
      pagination: { page, per_page: perPage, total: count ?? 0, total_pages: Math.ceil((count ?? 0) / perPage) },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    logger.error('Inventory error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
