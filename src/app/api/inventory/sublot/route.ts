import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const SublotEntrySchema = z.object({
  quantity: z.number().gt(0),
  lot_number: z.string().min(1),
})

const SublotSchema = z.object({
  item_id: z.uuid(),
  sublots: z.array(SublotEntrySchema).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()

    if (!hasPermission(session, PERMISSIONS.CREATE_PACKAGES) && !hasPermission(session, PERMISSIONS.ADMINISTRATOR)) {
      return NextResponse.json({ error: 'Create packages permission required' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = SublotSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { item_id, sublots } = parsed.data
    const sb = await createSupabaseServerClient()

    // Fetch parent item
    const { data: parent, error: fetchErr } = await sb
      .from('inventory_items')
      .select('*')
      .eq('id', item_id)
      .eq('is_active', true)
      .single()

    if (fetchErr || !parent) {
      return NextResponse.json({ error: 'Parent inventory item not found' }, { status: 404 })
    }

    const parentQty = Number(parent.quantity)
    const totalSublotQty = sublots.reduce((sum, s) => sum + s.quantity, 0)

    if (totalSublotQty > parentQty) {
      return NextResponse.json(
        { error: `Total sublot quantity (${totalSublotQty}) exceeds parent quantity (${parentQty})` },
        { status: 400 }
      )
    }

    const remainingQty = parentQty - totalSublotQty

    // Create new inventory items for each sublot, copying from parent
    const newItems = sublots.map((sublot) => {
      // Copy relevant fields from parent, excluding system fields
      const {
        id: _id,
        created_at: _ca,
        updated_at: _ua,
        quantity: _q,
        lot_number: _ln,
        is_active: _ia,
        deactivated_at: _da,
        ...parentFields
      } = parent

      return {
        ...parentFields,
        quantity: sublot.quantity,
        lot_number: sublot.lot_number,
        is_active: true,
      }
    })

    const { data: createdItems, error: insertErr } = await sb
      .from('inventory_items')
      .insert(newItems)
      .select('id, quantity, lot_number')

    if (insertErr) {
      logger.error('Sublot creation error', { error: insertErr.message })
      return NextResponse.json({ error: 'Failed to create sublots' }, { status: 500 })
    }

    // Update or deactivate parent
    if (remainingQty === 0) {
      const { error: deactivateErr } = await sb
        .from('inventory_items')
        .update({
          quantity: 0,
          is_active: false,
          deactivated_at: new Date().toISOString(),
        })
        .eq('id', item_id)

      if (deactivateErr) {
        logger.error('Sublot parent deactivate error', { error: deactivateErr.message })
        return NextResponse.json({ error: 'Failed to deactivate parent item' }, { status: 500 })
      }
    } else {
      const { error: decrementErr } = await sb
        .from('inventory_items')
        .update({ quantity: remainingQty })
        .eq('id', item_id)

      if (decrementErr) {
        logger.error('Sublot parent decrement error', { error: decrementErr.message })
        return NextResponse.json({ error: 'Failed to update parent quantity' }, { status: 500 })
      }
    }

    // Audit log
    const auditEntries = [
      {
        organization_id: session.organizationId,
        entity_type: 'inventory_item',
        entity_id: item_id,
        event_type: 'sublot_parent',
        field_edited: 'quantity',
        previous_value: String(parentQty),
        new_value: String(remainingQty),
        employee_id: session.employeeId,
      },
      ...(createdItems ?? []).map((ci) => ({
        organization_id: session.organizationId,
        entity_type: 'inventory_item',
        entity_id: ci.id,
        event_type: 'sublot_created',
        field_edited: 'quantity',
        previous_value: null as string | null,
        new_value: `${String(ci.quantity)} | from parent ${item_id}`,
        employee_id: session.employeeId,
      })),
    ]

    const { error: auditErr } = await sb.from('audit_log').insert(auditEntries)
    if (auditErr) {
      logger.warn('Failed to write sublot audit log', { error: auditErr.message })
    }

    return NextResponse.json({
      success: true,
      parent_id: item_id,
      parent_remaining_quantity: remainingQty,
      parent_deactivated: remainingQty === 0,
      sublots: createdItems ?? [],
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Sublot inventory error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
