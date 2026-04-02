import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const DestroySchema = z.object({
  item_id: z.uuid(),
  quantity: z.number().gt(0),
  reason: z.enum(['Expired', 'Damaged', 'Failed Testing', 'Regulatory Hold', 'Other']),
  notes: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!hasPermission(session, PERMISSIONS.ADJUST_INVENTORY) && !hasPermission(session, PERMISSIONS.ADMINISTRATOR)) {
      return NextResponse.json({ error: 'Permission required' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = DestroySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })

    const data = parsed.data
    const sb = await createSupabaseServerClient()

    const { data: item, error: fetchErr } = await sb
      .from('inventory_items')
      .select('*')
      .eq('id', data.item_id)
      .single()

    if (fetchErr || !item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    if (!item.is_active) {
      return NextResponse.json({ error: 'Item is inactive' }, { status: 400 })
    }

    if (data.quantity > item.quantity) {
      return NextResponse.json({ error: 'Destroy quantity exceeds available quantity' }, { status: 400 })
    }

    const fullyDestroyed = data.quantity === item.quantity
    const remainingQty = item.quantity - data.quantity

    const { error: updateErr } = await sb
      .from('inventory_items')
      .update({
        quantity: fullyDestroyed ? 0 : remainingQty,
        ...(fullyDestroyed ? { is_active: false, deactivated_at: new Date().toISOString() } : {}),
      })
      .eq('id', data.item_id)

    if (updateErr) {
      logger.error('Failed to update destroyed item', { error: updateErr.message })
      return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 })
    }

    await sb.from('audit_log').insert({
      organization_id: session.organizationId,
      entity_type: 'inventory_item',
      entity_id: data.item_id,
      event_type: 'destroy',
      employee_id: session.employeeId,
      new_value: `${data.quantity} | reason: ${data.reason} | notes: ${data.notes}`,
    })

    return NextResponse.json({
      success: true,
      item_id: data.item_id,
      quantity_destroyed: data.quantity,
      remaining_quantity: remainingQty,
      fully_destroyed: fullyDestroyed,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Inventory destroy error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
