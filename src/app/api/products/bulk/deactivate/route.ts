import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getEmployeePermissions, hasPermission } from '@/lib/services/permissionService'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { logger } from '@/lib/utils/logger'

const MAX_BULK_ITEMS = 100

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()

    const perms = await getEmployeePermissions(session.employeeId)
    if (!hasPermission(perms, PERMISSIONS.CREATE_PRODUCT)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { product_ids } = body

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        { error: 'product_ids must be a non-empty array' },
        { status: 400 },
      )
    }

    if (product_ids.length > MAX_BULK_ITEMS) {
      return NextResponse.json(
        { error: `Cannot process more than ${MAX_BULK_ITEMS} items at once` },
        { status: 400 },
      )
    }

    const sb = await createSupabaseServerClient()

    const deactivated: string[] = []
    const skipped: Array<{ id: string; reason: string }> = []

    for (const productId of product_ids) {
      // Check for active inventory
      const { count: inventoryCount } = await sb
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId)
        .eq('is_active', true)
        .gt('quantity', 0)

      if (inventoryCount && inventoryCount > 0) {
        skipped.push({
          id: productId,
          reason: `${inventoryCount} active inventory item(s) exist`,
        })
        continue
      }

      // Check for active discount references
      const { count: discountCount } = await sb
        .from('discount_constraint_filters')
        .select('id', { count: 'exact', head: true })
        .eq('filter_type', 'product')
        .contains('filter_value_ids', [productId])

      const { count: rewardCount } = await sb
        .from('discount_reward_filters')
        .select('id', { count: 'exact', head: true })
        .eq('filter_type', 'product')
        .contains('filter_value_ids', [productId])

      const totalDiscountRefs = (discountCount ?? 0) + (rewardCount ?? 0)
      if (totalDiscountRefs > 0) {
        skipped.push({
          id: productId,
          reason: `${totalDiscountRefs} active discount rule(s) reference this product`,
        })
        continue
      }

      // Deactivate the product
      const { error } = await sb
        .from('products')
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('id', productId)

      if (error) {
        logger.error('Bulk deactivate failed for product', {
          error: error.message,
          productId,
        })
        skipped.push({ id: productId, reason: 'Database error during deactivation' })
        continue
      }

      deactivated.push(productId)

      // Audit log
      const { data: product } = await sb
        .from('products')
        .select('organization_id')
        .eq('id', productId)
        .single()

      if (product) {
        await sb.from('audit_log').insert({
          organization_id: product.organization_id,
          employee_id: session.employeeId,
          entity_type: 'product',
          event_type: 'deactivate',
          entity_id: productId,
        })
      }
    }

    logger.info('Bulk deactivate completed', {
      deactivatedCount: deactivated.length,
      skippedCount: skipped.length,
      employeeId: session.employeeId,
    })

    return NextResponse.json({ deactivated, skipped })
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'UNAUTHORIZED'
    ) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }
    logger.error('Bulk deactivate error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
