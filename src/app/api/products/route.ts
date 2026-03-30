import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ProductQuerySchema, ProductCreateSchema } from '@/lib/validators/products'
import { createProduct } from '@/lib/services/productManagementService'
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

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = ProductCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const product = await createProduct({
      organization_id: session.organizationId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      sku: parsed.data.sku,
      barcode: parsed.data.barcode ?? undefined,
      description: parsed.data.description ?? undefined,
      category_id: parsed.data.categoryId,
      brand_id: parsed.data.brandId,
      vendor_id: parsed.data.vendorId,
      strain_id: parsed.data.strainId,
      rec_price: parsed.data.recPrice,
      med_price: parsed.data.medPrice,
      cost_price: parsed.data.costPrice,
      is_cannabis: parsed.data.isCannabis,
      product_type: parsed.data.productType,
      default_unit: parsed.data.defaultUnit,
      weight_grams: parsed.data.weightGrams,
      thc_percentage: parsed.data.thcPercentage,
      cbd_percentage: parsed.data.cbdPercentage,
      thc_content_mg: parsed.data.thcContentMg,
      cbd_content_mg: parsed.data.cbdContentMg,
      flower_equivalent: parsed.data.flowerEquivalent,
      strain_type: parsed.data.strainType,
      regulatory_category: parsed.data.regulatoryCategory,
      online_title: parsed.data.onlineTitle,
      online_description: parsed.data.onlineDescription,
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message, code: appErr.code }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Product create error', { error: String(err) })
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
