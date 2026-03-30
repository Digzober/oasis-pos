import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { updateProduct, deactivateProduct } from '@/lib/services/productManagementService'
import { logger } from '@/lib/utils/logger'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params

    const sb = await createSupabaseServerClient()

    const { data: product, error } = await sb
      .from('products')
      .select(`
        *,
        product_categories ( id, name, master_category, slug, purchase_limit_category, tax_category, regulatory_category, available_for ),
        brands ( id, name ),
        vendors ( id, name ),
        strains ( id, name, strain_type ),
        product_images ( id, image_url, is_primary, sort_order ),
        product_tags ( tag_id, tags ( id, name, color ) )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      logger.error('Product detail query failed', { error: error.message, id })
      return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get location price overrides
    const { data: priceOverride } = await sb
      .from('location_product_prices')
      .select('*')
      .eq('product_id', id)
      .eq('location_id', session.locationId)
      .maybeSingle()

    // Get inventory summary for session location
    const { data: inventoryItems } = await sb
      .from('inventory_items')
      .select('id, quantity, quantity_reserved')
      .eq('product_id', id)
      .eq('location_id', session.locationId)
      .eq('is_active', true)

    const totalQuantity = (inventoryItems ?? []).reduce((sum, i) => sum + (i.quantity - i.quantity_reserved), 0)

    const { product_categories, brands, vendors, strains, product_images, product_tags, ...rest } = product

    return NextResponse.json({
      product: {
        ...rest,
        category: product_categories ?? null,
        brand: brands ?? null,
        vendor: vendors ?? null,
        strain: strains ?? null,
        images: product_images ?? [],
        tags: (product_tags ?? []).map((pt: { tags: unknown }) => pt.tags),
        locationPricing: priceOverride ?? null,
        inventory: {
          totalAvailable: totalQuantity,
          itemCount: inventoryItems?.length ?? 0,
        },
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product detail error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await request.json()
    const product = await updateProduct(id, body, session.employeeId)
    return NextResponse.json({ product })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Product update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession()
    const { id } = await params
    await deactivateProduct(id, session.employeeId)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Product deactivate error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
