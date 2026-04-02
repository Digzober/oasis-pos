import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const MAX_BULK_ITEMS = 100

// All product fields that can be bulk-edited
const ALLOWED_FIELDS = new Set([
  // Pricing
  'rec_price', 'med_price', 'cost_price', 'sale_price', 'is_on_sale',
  // Classification
  'category_id', 'brand_id', 'vendor_id', 'strain_id',
  'is_cannabis', 'product_type', 'default_unit', 'available_for',
  'is_taxable', 'allow_automatic_discounts',
  'available_online', 'available_on_pos',
  // Cannabis
  'weight_grams', 'thc_percentage', 'cbd_percentage',
  'thc_content_mg', 'cbd_content_mg', 'flower_equivalent',
  'dosage', 'net_weight', 'net_weight_unit', 'gross_weight_grams',
  'unit_thc_dose', 'unit_cbd_dose', 'administration_method', 'package_size',
  'strain_type',
  // Details
  'description', 'alternate_name', 'producer_id', 'size', 'flavor',
  'regulatory_category', 'external_category', 'external_sub_category',
  'online_title', 'online_description',
  'allergens', 'ingredients', 'instructions',
  'barcode',
])

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()

    const body = await request.json()
    const { product_ids, updates } = body as {
      product_ids: unknown
      updates: unknown
    }

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json({ error: 'product_ids must be a non-empty array' }, { status: 400 })
    }

    if (product_ids.length > MAX_BULK_ITEMS) {
      return NextResponse.json({ error: `Cannot process more than ${MAX_BULK_ITEMS} items at once` }, { status: 400 })
    }

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return NextResponse.json({ error: 'updates must be an object with at least one field' }, { status: 400 })
    }

    // Filter to only allowed fields
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates as Record<string, unknown>)) {
      if (ALLOWED_FIELDS.has(key)) {
        sanitized[key] = value
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    const { data, error } = await sb
      .from('products')
      .update(sanitized)
      .in('id', product_ids)
      .select('id, organization_id')

    if (error) {
      logger.error('Bulk update failed', { error: error.message })
      return NextResponse.json({ error: 'Failed to update products' }, { status: 500 })
    }

    const updatedProducts = data ?? []

    // Audit log
    if (updatedProducts.length > 0) {
      const auditEntries = updatedProducts.map((product) => ({
        organization_id: product.organization_id,
        employee_id: session.employeeId,
        entity_type: 'product' as const,
        event_type: 'update' as const,
        entity_id: product.id,
        field_edited: 'bulk_update',
        new_value: JSON.stringify(sanitized),
      }))

      await sb.from('audit_log').insert(auditEntries).then(({ error: auditError }) => {
        if (auditError) logger.error('Bulk update audit failed', { error: auditError.message })
      })
    }

    return NextResponse.json({ updated_count: updatedProducts.length, fields: Object.keys(sanitized) })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    logger.error('Bulk update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
