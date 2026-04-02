import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { updateProduct, deactivateProduct } from '@/lib/services/productManagementService'
import { getEmployeePermissions, hasPermission } from '@/lib/services/permissionService'
import { PERMISSIONS } from '@/lib/auth/permissions'
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
        producers ( id, name ),
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

    // Get label settings with label template join
    const { data: labelSettings } = await sb
      .from('product_label_settings')
      .select('*, label_templates ( id, name, label_type )')
      .eq('product_id', id)

    // Get active pricing tiers for the org
    const { data: pricingTiers } = await sb
      .from('pricing_tiers')
      .select('*')
      .eq('organization_id', session.organizationId)
      .eq('is_active', true)
      .order('name')

    const totalQuantity = (inventoryItems ?? []).reduce((sum, i) => sum + (i.quantity - i.quantity_reserved), 0)

    const { product_categories, brands, vendors, producers, strains, product_images, product_tags, ...rest } = product

    return NextResponse.json({
      product: {
        ...rest,
        category: product_categories ?? null,
        brand: brands ?? null,
        vendor: vendors ?? null,
        producer: producers ?? null,
        strain: strains ?? null,
        images: product_images ?? [],
        tags: (product_tags ?? []).map((pt: { tags: unknown }) => pt.tags),
        locationPricing: priceOverride ?? null,
        inventory: {
          totalAvailable: totalQuantity,
          itemCount: inventoryItems?.length ?? 0,
        },
        labelSettings: labelSettings ?? [],
        pricingTiers: pricingTiers ?? [],
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

    const perms = await getEmployeePermissions(session.employeeId)
    if (!hasPermission(perms, PERMISSIONS.CREATE_PRODUCT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Map camelCase from frontend to snake_case for Supabase
    const mapped: Record<string, unknown> = {}
    const keyMap: Record<string, string> = {
      categoryId: 'category_id', brandId: 'brand_id', vendorId: 'vendor_id', strainId: 'strain_id', producerId: 'producer_id',
      recPrice: 'rec_price', medPrice: 'med_price', costPrice: 'cost_price',
      isCannabis: 'is_cannabis', productType: 'product_type', defaultUnit: 'default_unit',
      weightGrams: 'weight_grams', thcPercentage: 'thc_percentage', cbdPercentage: 'cbd_percentage',
      thcContentMg: 'thc_content_mg', cbdContentMg: 'cbd_content_mg', flowerEquivalent: 'flower_equivalent',
      strainType: 'strain_type', onlineTitle: 'online_title', onlineDescription: 'online_description',
      regulatoryCategory: 'regulatory_category', externalCategory: 'external_category',
      isOnSale: 'is_on_sale', salePrice: 'sale_price', alternateName: 'alternate_name',
      availableFor: 'available_for', isTaxable: 'is_taxable', allowAutomaticDiscounts: 'allow_automatic_discounts',
      netWeight: 'net_weight', netWeightUnit: 'net_weight_unit', grossWeightGrams: 'gross_weight_grams',
      unitThcDose: 'unit_thc_dose', unitCbdDose: 'unit_cbd_dose', administrationMethod: 'administration_method',
      packageSize: 'package_size', externalSubCategory: 'external_sub_category',
      gramsConcentration: 'grams_concentration',
    }
    for (const [k, v] of Object.entries(body)) {
      mapped[keyMap[k] ?? k] = v
    }

    const product = await updateProduct(id, mapped, session.employeeId)
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

    const perms = await getEmployeePermissions(session.employeeId)
    if (!hasPermission(perms, PERMISSIONS.CREATE_PRODUCT)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

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
