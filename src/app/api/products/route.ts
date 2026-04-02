import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ProductQuerySchema, ProductCreateSchema } from '@/lib/validators/products'
import { createProduct } from '@/lib/services/productManagementService'
import { getEmployeePermissions, hasPermission } from '@/lib/services/permissionService'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

// Only select columns needed for the list view — skip heavy text fields
const PRODUCT_LIST_SELECT = `
  id, name, slug, sku, barcode,
  rec_price, med_price, cost_price,
  is_cannabis, is_active, is_on_sale, sale_price,
  product_type, default_unit, strain_type,
  thc_percentage, cbd_percentage, thc_content_mg, cbd_content_mg,
  weight_grams, flower_equivalent,
  available_online, available_on_pos,
  created_at, updated_at,
  product_categories!inner ( id, name, master_category ),
  brands ( id, name ),
  vendors ( id, name ),
  strains ( id, name, strain_type ),
  product_images ( is_primary, image_url ),
  product_tags ( tag_id, tags ( id, name, color ) )
`

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()

    const params = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = ProductQuerySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { page, limit, search, categoryId, brandId, strainId, vendorId, sortBy, sortOrder, isActive, isCannabis, tagId, onlineAvailable } = parsed.data
    const offset = (page - 1) * limit

    const sb = await createSupabaseServerClient()
    const inventoryLocationId = request.nextUrl.searchParams.get('location_id') ?? session.locationId

    // Run pre-filter queries in parallel (not sequential)
    const [tagFilterResult, onlineFilterResult] = await Promise.all([
      tagId
        ? sb.from('product_tags').select('product_id').eq('tag_id', tagId)
        : Promise.resolve({ data: null }),
      onlineAvailable
        ? sb.from('location_product_prices').select('product_id').eq('available_online', true)
        : Promise.resolve({ data: null }),
    ])

    const tagFilterProductIds = tagFilterResult.data?.map((tp) => tp.product_id) ?? null
    if (tagId && tagFilterProductIds?.length === 0) {
      return NextResponse.json({ products: [], pagination: { page, limit, total: 0, totalPages: 0 } })
    }

    const onlineFilterProductIds = onlineFilterResult.data?.map((op) => op.product_id) ?? null
    if (onlineAvailable && onlineFilterProductIds?.length === 0) {
      return NextResponse.json({ products: [], pagination: { page, limit, total: 0, totalPages: 0 } })
    }

    // Build the main query
    let query = sb
      .from('products')
      .select(PRODUCT_LIST_SELECT, { count: 'exact' })
      .eq('organization_id', session.organizationId)

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,online_title.ilike.%${search}%`)
    }
    if (categoryId) query = query.eq('category_id', categoryId)
    if (brandId) query = query.eq('brand_id', brandId)
    if (strainId) query = query.eq('strain_id', strainId)
    if (vendorId) query = query.eq('vendor_id', vendorId)
    if (isActive !== undefined) query = query.eq('is_active', isActive)
    if (isCannabis !== undefined) query = query.eq('is_cannabis', isCannabis)
    if (tagFilterProductIds) query = query.in('id', tagFilterProductIds)
    if (onlineFilterProductIds) query = query.in('id', onlineFilterProductIds)

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    const { data: products, count, error } = await query

    if (error) {
      logger.error('Product list query failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    const total = count ?? 0
    const productList = products ?? []
    const productIds = productList.map((p) => p.id)

    // Fetch inventory counts in parallel — only if we have products
    let inventoryMap: Record<string, number> = {}
    let skuCountMap: Record<string, number> = {}

    if (productIds.length > 0 && inventoryLocationId) {
      const { data: inventoryItems } = await sb
        .from('inventory_items')
        .select('product_id, quantity, quantity_reserved')
        .in('product_id', productIds)
        .eq('location_id', inventoryLocationId)
        .eq('is_active', true)

      for (const item of inventoryItems ?? []) {
        const available = item.quantity - (item.quantity_reserved ?? 0)
        inventoryMap[item.product_id] = (inventoryMap[item.product_id] ?? 0) + available
        skuCountMap[item.product_id] = (skuCountMap[item.product_id] ?? 0) + 1
      }
    }

    return NextResponse.json({
      products: productList.map((row) => formatProduct(row, inventoryMap, skuCountMap)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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

    const perms = await getEmployeePermissions(session.employeeId)
    if (!hasPermission(perms, PERMISSIONS.CREATE_PRODUCT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

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
      external_category: parsed.data.externalCategory,
      is_on_sale: parsed.data.isOnSale,
      sale_price: parsed.data.salePrice,
      alternate_name: parsed.data.alternateName,
      producer_id: parsed.data.producerId,
      size: parsed.data.size,
      flavor: parsed.data.flavor,
      available_for: parsed.data.availableFor,
      is_taxable: parsed.data.isTaxable,
      allow_automatic_discounts: parsed.data.allowAutomaticDiscounts,
      dosage: parsed.data.dosage,
      net_weight: parsed.data.netWeight,
      net_weight_unit: parsed.data.netWeightUnit,
      gross_weight_grams: parsed.data.grossWeightGrams,
      unit_thc_dose: parsed.data.unitThcDose,
      unit_cbd_dose: parsed.data.unitCbdDose,
      administration_method: parsed.data.administrationMethod,
      package_size: parsed.data.packageSize,
      external_sub_category: parsed.data.externalSubCategory,
      allergens: parsed.data.allergens,
      ingredients: parsed.data.ingredients,
      instructions: parsed.data.instructions,
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
function formatProduct(row: any, inventoryMap: Record<string, number>, skuCountMap?: Record<string, number>) {
  const { product_categories, brands, vendors, strains, product_images, product_tags, ...product } = row
  return {
    ...product,
    category: product_categories ?? null,
    brand: brands ?? null,
    vendor: vendors ?? null,
    strain: strains ?? null,
    images: product_images ?? [],
    tags: (product_tags ?? []).map((pt: { tags: unknown }) => pt.tags),
    inventoryAvailable: inventoryMap[product.id] ?? 0,
    skuCount: skuCountMap?.[product.id] ?? 0,
  }
}
