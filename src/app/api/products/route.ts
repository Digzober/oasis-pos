import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ProductQuerySchema } from '@/lib/validators/products'
import { logger } from '@/lib/utils/logger'

const PRODUCT_SELECT = `
  *,
  product_categories!inner ( id, name, master_category ),
  brands ( id, name ),
  vendors ( id, name ),
  strains ( id, name, strain_type )
`

export async function GET(request: NextRequest) {
  try {
    await requireSession()

    const params = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = ProductQuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { page, limit, search, categoryId, brandId, strainId, vendorId, sortBy, sortOrder, isActive, isCannabis } = parsed.data
    const offset = (page - 1) * limit

    const sb = await createSupabaseServerClient()

    let query = sb
      .from('products')
      .select(PRODUCT_SELECT, { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,online_title.ilike.%${search}%`)
    }
    if (categoryId) query = query.eq('category_id', categoryId)
    if (brandId) query = query.eq('brand_id', brandId)
    if (strainId) query = query.eq('strain_id', strainId)
    if (vendorId) query = query.eq('vendor_id', vendorId)
    if (isActive !== undefined) query = query.eq('is_active', isActive)
    if (isCannabis !== undefined) query = query.eq('is_cannabis', isCannabis)

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    const { data: products, count, error } = await query

    if (error) {
      logger.error('Product list query failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    const total = count ?? 0

    return NextResponse.json({
      products: (products ?? []).map(formatProduct),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Product list error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatProduct(row: any) {
  const { product_categories, brands, vendors, strains, ...product } = row
  return {
    ...product,
    category: product_categories ?? null,
    brand: brands ?? null,
    vendor: vendors ?? null,
    strain: strains ?? null,
  }
}
