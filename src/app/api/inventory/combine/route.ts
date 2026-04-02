import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const CombineSchema = z.object({
  item_ids: z.array(z.uuid()).min(2),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()

    if (!hasPermission(session, PERMISSIONS.ADJUST_INVENTORY) && !hasPermission(session, PERMISSIONS.ADMINISTRATOR)) {
      return NextResponse.json({ error: 'Adjust permission required' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CombineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { item_ids } = parsed.data
    const sb = await createSupabaseServerClient()

    // Fetch all items
    const { data: items, error: fetchErr } = await sb
      .from('inventory_items')
      .select('id, product_id, location_id, quantity')
      .in('id', item_ids)
      .eq('is_active', true)

    if (fetchErr) {
      logger.error('Combine fetch error', { error: fetchErr.message })
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    if (!items || items.length !== item_ids.length) {
      const foundIds = new Set((items ?? []).map((i) => i.id))
      const missing = item_ids.filter((id) => !foundIds.has(id))
      return NextResponse.json(
        { error: 'Some items not found or inactive', missing_ids: missing },
        { status: 404 }
      )
    }

    // Validate all items share the same product_id and location_id
    const productIds = new Set(items.map((i) => i.product_id))
    if (productIds.size > 1) {
      return NextResponse.json(
        { error: 'All items must belong to the same product' },
        { status: 400 }
      )
    }

    const locationIds = new Set(items.map((i) => i.location_id))
    if (locationIds.size > 1) {
      return NextResponse.json(
        { error: 'All items must be at the same location' },
        { status: 400 }
      )
    }

    // Use the first item in the provided order as the target
    const targetId = item_ids[0] as string
    const sourceIds = item_ids.slice(1)
    const totalQuantity = items.reduce((sum, i) => sum + Number(i.quantity), 0)
    const targetItem = items.find((i) => i.id === targetId)
    const oldTargetQty = Number(targetItem?.quantity ?? 0)

    // Update target with combined quantity
    const { error: updateErr } = await sb
      .from('inventory_items')
      .update({ quantity: totalQuantity })
      .eq('id', targetId)

    if (updateErr) {
      logger.error('Combine update target error', { error: updateErr.message })
      return NextResponse.json({ error: 'Failed to update target item' }, { status: 500 })
    }

    // Deactivate source items
    const { error: deactivateErr } = await sb
      .from('inventory_items')
      .update({ is_active: false, deactivated_at: new Date().toISOString(), quantity: 0 })
      .in('id', sourceIds)

    if (deactivateErr) {
      logger.error('Combine deactivate error', { error: deactivateErr.message })
      return NextResponse.json({ error: 'Failed to deactivate source items' }, { status: 500 })
    }

    // Audit log entries
    const auditEntries = [
      {
        organization_id: session.organizationId,
        entity_type: 'inventory_item',
        entity_id: targetId,
        event_type: 'combine_target',
        field_edited: 'quantity',
        previous_value: String(oldTargetQty),
        new_value: String(totalQuantity),
        employee_id: session.employeeId,
      },
      ...sourceIds.map((sourceId) => {
        const sourceItem = items.find((i) => i.id === sourceId)
        return {
          organization_id: session.organizationId,
          entity_type: 'inventory_item',
          entity_id: sourceId,
          event_type: 'combine_source',
          field_edited: 'quantity',
          previous_value: String(Number(sourceItem?.quantity ?? 0)),
          new_value: `0 | combined into ${targetId}`,
          employee_id: session.employeeId,
        }
      }),
    ]

    const { error: auditErr } = await sb.from('audit_log').insert(auditEntries)
    if (auditErr) {
      logger.warn('Failed to write combine audit log', { error: auditErr.message })
    }

    return NextResponse.json({
      success: true,
      target_id: targetId,
      combined_quantity: totalQuantity,
      deactivated_ids: sourceIds,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Combine inventory error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
