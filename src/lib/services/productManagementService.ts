import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export interface CreateProductInput {
  organization_id: string
  name: string
  slug: string
  sku?: string
  barcode?: string
  description?: string
  category_id: string
  brand_id?: string | null
  vendor_id?: string | null
  strain_id?: string | null
  rec_price: number
  med_price?: number | null
  cost_price?: number | null
  is_cannabis?: boolean
  product_type?: string
  default_unit?: string
  weight_grams?: number | null
  thc_percentage?: number | null
  cbd_percentage?: number | null
  thc_content_mg?: number | null
  cbd_content_mg?: number | null
  flower_equivalent?: number | null
  strain_type?: string | null
  regulatory_category?: string | null
  online_title?: string | null
  online_description?: string | null
  tag_ids?: string[]
}

export interface UpdateProductInput {
  name?: string
  slug?: string
  sku?: string
  barcode?: string | null
  description?: string | null
  category_id?: string
  brand_id?: string | null
  vendor_id?: string | null
  strain_id?: string | null
  rec_price?: number
  med_price?: number | null
  cost_price?: number | null
  weight_grams?: number | null
  thc_percentage?: number | null
  cbd_percentage?: number | null
  thc_content_mg?: number | null
  cbd_content_mg?: number | null
  flower_equivalent?: number | null
  strain_type?: string | null
  online_title?: string | null
  online_description?: string | null
  is_on_sale?: boolean
  is_active?: boolean
}

export async function createProduct(input: CreateProductInput) {
  const sb = await createSupabaseServerClient()

  // Validate category exists
  const { data: cat } = await sb.from('product_categories').select('id').eq('id', input.category_id).single()
  if (!cat) throw new AppError('INVALID_CATEGORY', 'Category not found', undefined, 400)

  // Generate SKU if not provided
  const sku = input.sku || await generateSku(sb, input.organization_id)

  const { tag_ids, ...productData } = input

  const { data: product, error } = await sb
    .from('products')
    .insert({ ...productData, sku })
    .select()
    .single()

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      throw new AppError('DUPLICATE_SKU', 'A product with this SKU already exists', error, 409)
    }
    logger.error('Create product failed', { error: error.message })
    throw new AppError('CREATE_FAILED', 'Failed to create product', error, 500)
  }

  // Add tags
  if (tag_ids && tag_ids.length > 0) {
    await sb.from('product_tags').insert(
      tag_ids.map((tag_id) => ({ product_id: product.id, tag_id })),
    )
  }

  return product
}

export async function updateProduct(id: string, input: UpdateProductInput, employeeId?: string) {
  const sb = await createSupabaseServerClient()

  // Load current product for audit comparison
  const { data: current } = await sb.from('products').select('rec_price, med_price, category_id').eq('id', id).single()

  const { data: product, error } = await sb
    .from('products')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('Update product failed', { error: error.message, id })
    throw new AppError('UPDATE_FAILED', 'Failed to update product', error, 500)
  }

  // Audit log for price or category changes
  if (current && employeeId) {
    if (input.rec_price !== undefined && input.rec_price !== current.rec_price) {
      await logAudit(sb, product, employeeId, 'rec_price', String(current.rec_price), String(input.rec_price))
    }
    if (input.category_id !== undefined && input.category_id !== current.category_id) {
      await logAudit(sb, product, employeeId, 'category_id', current.category_id, input.category_id)
    }
  }

  return product
}

export async function deactivateProduct(id: string, employeeId?: string) {
  const sb = await createSupabaseServerClient()

  const { error } = await sb
    .from('products')
    .update({ is_active: false, deactivated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new AppError('DEACTIVATE_FAILED', 'Failed to deactivate product', error, 500)
  }

  if (employeeId) {
    const { data: product } = await sb.from('products').select('organization_id').eq('id', id).single()
    if (product) {
      await sb.from('audit_log').insert({
        organization_id: product.organization_id,
        employee_id: employeeId,
        entity_type: 'product',
        event_type: 'deactivate',
        entity_id: id,
      })
    }
  }
}

export async function setLocationPrice(
  productId: string,
  locationId: string,
  data: { rec_price?: number; med_price?: number | null; cost_price?: number | null; is_active?: boolean },
) {
  const sb = await createSupabaseServerClient()

  const { data: existing } = await sb
    .from('location_product_prices')
    .select('id')
    .eq('product_id', productId)
    .eq('location_id', locationId)
    .maybeSingle()

  if (existing) {
    const { error } = await sb
      .from('location_product_prices')
      .update(data)
      .eq('id', existing.id)
    if (error) throw new AppError('PRICE_UPDATE_FAILED', error.message, error, 500)
  } else {
    const { error } = await sb
      .from('location_product_prices')
      .insert({ product_id: productId, location_id: locationId, ...data })
    if (error) throw new AppError('PRICE_CREATE_FAILED', error.message, error, 500)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateSku(sb: any, orgId: string): Promise<string> {
  const { count } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  return `PRD-${String((count ?? 0) + 1).padStart(5, '0')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(sb: any, product: any, employeeId: string, field: string, prev: string, next: string) {
  await sb.from('audit_log').insert({
    organization_id: product.organization_id,
    employee_id: employeeId,
    entity_type: 'product',
    event_type: 'update',
    entity_id: product.id,
    field_edited: field,
    previous_value: prev,
    new_value: next,
  })
}
