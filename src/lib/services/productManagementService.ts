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
  external_category?: string | null
  is_on_sale?: boolean
  sale_price?: number | null
  alternate_name?: string | null
  producer_id?: string | null
  size?: string | null
  flavor?: string | null
  available_for?: string
  is_taxable?: boolean
  allow_automatic_discounts?: boolean
  dosage?: string | null
  net_weight?: number | null
  net_weight_unit?: string | null
  gross_weight_grams?: number | null
  unit_thc_dose?: number | null
  unit_cbd_dose?: number | null
  administration_method?: string | null
  package_size?: number | null
  external_sub_category?: string | null
  allergens?: string | null
  ingredients?: string | null
  instructions?: string | null
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

const AUDITED_PRODUCT_FIELDS = [
  'rec_price',
  'med_price',
  'cost_price',
  'category_id',
  'online_title',
  'online_description',
  'is_on_sale',
  'is_active',
  'name',
] as const

const AUDITED_LOCATION_PRICE_FIELDS = [
  'rec_price',
  'med_price',
  'cost_price',
  'available_on_pos',
  'available_online',
  'max_purchase_per_transaction',
  'low_inventory_threshold',
  'pricing_tier_id',
] as const

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
  const { data: current } = await sb
    .from('products')
    .select('rec_price, med_price, cost_price, category_id, online_title, online_description, is_on_sale, is_active, name')
    .eq('id', id)
    .single()

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

  // Audit log for tracked field changes
  if (current && employeeId) {
    for (const field of AUDITED_PRODUCT_FIELDS) {
      const inputValue = input[field as keyof UpdateProductInput]
      if (inputValue === undefined) {
        continue
      }
      const currentValue = current[field as keyof typeof current]
      if (String(inputValue ?? '') !== String(currentValue ?? '')) {
        await logAudit(
          sb,
          product,
          employeeId,
          field,
          String(currentValue ?? ''),
          String(inputValue ?? ''),
        )
      }
    }
  }

  return product
}

export async function deactivateProduct(id: string, employeeId?: string) {
  const sb = await createSupabaseServerClient()

  // Safety check: active inventory
  const { count: inventoryCount } = await sb
    .from('inventory_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id)
    .eq('is_active', true)
    .gt('quantity', 0)

  if (inventoryCount && inventoryCount > 0) {
    throw new AppError(
      'HAS_INVENTORY',
      `Cannot deactivate: ${inventoryCount} active inventory item(s) exist. Adjust or transfer inventory first.`,
      undefined,
      409,
    )
  }

  // Safety check: active discounts referencing this product
  const { count: discountCount } = await sb
    .from('discount_constraint_filters')
    .select('id', { count: 'exact', head: true })
    .eq('filter_type', 'product')
    .contains('filter_value_ids', [id])

  const { count: rewardCount } = await sb
    .from('discount_reward_filters')
    .select('id', { count: 'exact', head: true })
    .eq('filter_type', 'product')
    .contains('filter_value_ids', [id])

  const totalDiscountRefs = (discountCount ?? 0) + (rewardCount ?? 0)
  if (totalDiscountRefs > 0) {
    throw new AppError(
      'HAS_DISCOUNTS',
      `Cannot deactivate: ${totalDiscountRefs} active discount rule(s) reference this product. Remove discount references first.`,
      undefined,
      409,
    )
  }

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
  data: {
    rec_price?: number | null
    med_price?: number | null
    cost_price?: number | null
    is_active?: boolean
    available_on_pos?: boolean
    available_online?: boolean
    pricing_tier_id?: string | null
    max_purchase_per_transaction?: number | null
    low_inventory_threshold?: number | null
  },
  employeeId?: string,
) {
  const sb = await createSupabaseServerClient()

  const { data: existing } = await sb
    .from('location_product_prices')
    .select('id, rec_price, med_price, cost_price, available_on_pos, available_online, max_purchase_per_transaction, low_inventory_threshold, pricing_tier_id')
    .eq('product_id', productId)
    .eq('location_id', locationId)
    .maybeSingle()

  if (existing) {
    const { error } = await sb
      .from('location_product_prices')
      .update(data)
      .eq('id', existing.id)
    if (error) throw new AppError('PRICE_UPDATE_FAILED', error.message, error, 500)

    // Audit each changed field
    if (employeeId) {
      const { data: product } = await sb
        .from('products')
        .select('organization_id')
        .eq('id', productId)
        .single()

      if (product) {
        for (const field of AUDITED_LOCATION_PRICE_FIELDS) {
          const newValue = data[field as keyof typeof data]
          if (newValue === undefined) {
            continue
          }
          const oldValue = existing[field as keyof typeof existing]
          if (String(newValue ?? '') !== String(oldValue ?? '')) {
            await sb.from('audit_log').insert({
              organization_id: product.organization_id,
              employee_id: employeeId,
              entity_type: 'location_product_price',
              event_type: 'update',
              entity_id: existing.id,
              field_edited: field,
              previous_value: String(oldValue ?? ''),
              new_value: String(newValue ?? ''),
            })
          }
        }
      }
    }
  } else {
    const { error } = await sb
      .from('location_product_prices')
      .insert({ product_id: productId, location_id: locationId, ...data })
    if (error) throw new AppError('PRICE_CREATE_FAILED', error.message, error, 500)
  }
}

export async function updateProductTags(
  productId: string,
  tagIds: string[],
  employeeId?: string,
) {
  const sb = await createSupabaseServerClient()

  // Fetch current tags
  const { data: currentTags, error: fetchError } = await sb
    .from('product_tags')
    .select('tag_id')
    .eq('product_id', productId)

  if (fetchError) {
    logger.error('Failed to fetch current product tags', { error: fetchError.message, productId })
    throw new AppError('FETCH_TAGS_FAILED', 'Failed to fetch current product tags', fetchError, 500)
  }

  const oldTagIds = (currentTags ?? []).map((row) => row.tag_id).sort()
  const newTagIds = [...tagIds].sort()

  const tagsChanged = oldTagIds.length !== newTagIds.length
    || oldTagIds.some((id, idx) => id !== newTagIds[idx])

  // Delete existing tags
  const { error: deleteError } = await sb
    .from('product_tags')
    .delete()
    .eq('product_id', productId)

  if (deleteError) {
    logger.error('Failed to delete product tags', { error: deleteError.message, productId })
    throw new AppError('DELETE_TAGS_FAILED', 'Failed to delete product tags', deleteError, 500)
  }

  // Insert new tags
  if (tagIds.length > 0) {
    const { error: insertError } = await sb
      .from('product_tags')
      .insert(tagIds.map((tag_id) => ({ product_id: productId, tag_id })))

    if (insertError) {
      logger.error('Failed to insert product tags', { error: insertError.message, productId })
      throw new AppError('INSERT_TAGS_FAILED', 'Failed to insert product tags', insertError, 500)
    }
  }

  // Audit log only if tags actually changed
  if (tagsChanged && employeeId) {
    const { data: product } = await sb
      .from('products')
      .select('organization_id')
      .eq('id', productId)
      .single()

    if (product) {
      await sb.from('audit_log').insert({
        organization_id: product.organization_id,
        employee_id: employeeId,
        entity_type: 'product',
        event_type: 'update',
        entity_id: productId,
        field_edited: 'tags',
        previous_value: JSON.stringify(oldTagIds),
        new_value: JSON.stringify(newTagIds),
      })
    }
  }
}

export async function logImageAudit(
  productId: string,
  action: 'upload' | 'delete' | 'reorder',
  employeeId?: string,
  details?: string,
) {
  if (!employeeId) {
    return
  }

  const sb = await createSupabaseServerClient()

  const { data: product } = await sb
    .from('products')
    .select('organization_id')
    .eq('id', productId)
    .single()

  if (!product) {
    logger.error('logImageAudit: product not found', { productId })
    return
  }

  await sb.from('audit_log').insert({
    organization_id: product.organization_id,
    employee_id: employeeId,
    entity_type: 'product_image',
    event_type: action,
    entity_id: productId,
    new_value: details ?? null,
  })
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
