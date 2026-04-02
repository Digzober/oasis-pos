import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const ConvertSchema = z.object({
  source_item_id: z.uuid(),
  source_quantity: z.number().gt(0),
  new_product_id: z.uuid(),
  new_package_id: z.string().optional(),
  new_quantity: z.number().gt(0),
  vendor_id: z.uuid().nullable().optional(),
  room_id: z.uuid(),
  batch_id: z.string().nullable().optional(),
  package_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  inventory_status: z.string().optional(),
  cost_per_unit: z.number().min(0).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    if (!hasPermission(session, PERMISSIONS.ADJUST_INVENTORY) && !hasPermission(session, PERMISSIONS.ADMINISTRATOR)) {
      return NextResponse.json({ error: 'Permission required' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = ConvertSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })

    const data = parsed.data
    const sb = await createSupabaseServerClient()

    const { data: source, error: fetchErr } = await sb
      .from('inventory_items')
      .select('*')
      .eq('id', data.source_item_id)
      .single()

    if (fetchErr || !source) {
      return NextResponse.json({ error: 'Source inventory item not found' }, { status: 404 })
    }

    if (!source.is_active) {
      return NextResponse.json({ error: 'Source item is inactive' }, { status: 400 })
    }

    if (data.source_quantity > source.quantity) {
      return NextResponse.json({ error: 'Source quantity exceeds available quantity' }, { status: 400 })
    }

    const { data: newItem, error: insertErr } = await sb
      .from('inventory_items')
      .insert({
        organization_id: session.organizationId,
        location_id: source.location_id,
        product_id: data.new_product_id,
        biotrack_barcode: data.new_package_id ?? null,
        quantity: data.new_quantity,
        vendor_id: data.vendor_id ?? null,
        room_id: data.room_id,
        batch_id: data.batch_id ?? null,
        package_date: data.package_date ?? null,
        expiration_date: data.expiration_date ?? null,
        status: data.inventory_status ?? 'available',
        cost_per_unit: data.cost_per_unit ?? 0,
        is_active: true,
      })
      .select()
      .single()

    if (insertErr || !newItem) {
      logger.error('Failed to create converted inventory item', { error: insertErr?.message })
      return NextResponse.json({ error: 'Failed to create new inventory item' }, { status: 500 })
    }

    const remainingQty = source.quantity - data.source_quantity
    const deactivateSource = remainingQty <= 0

    const { error: updateErr } = await sb
      .from('inventory_items')
      .update({
        quantity: deactivateSource ? 0 : remainingQty,
        ...(deactivateSource ? { is_active: false, deactivated_at: new Date().toISOString() } : {}),
      })
      .eq('id', data.source_item_id)

    if (updateErr) {
      logger.error('Failed to update source item', { error: updateErr.message })
      return NextResponse.json({ error: 'Failed to update source item' }, { status: 500 })
    }

    await sb.from('audit_log').insert([
      {
        organization_id: session.organizationId,
        entity_type: 'inventory_item',
        entity_id: data.source_item_id,
        event_type: 'convert',
        employee_id: session.employeeId,
        new_value: `Converted ${data.source_quantity} to new item ${newItem.id}`,
      },
      {
        organization_id: session.organizationId,
        entity_type: 'inventory_item',
        entity_id: newItem.id,
        event_type: 'create',
        employee_id: session.employeeId,
        new_value: `Created from conversion of ${data.source_item_id}`,
      },
    ])

    return NextResponse.json({
      success: true,
      source_id: data.source_item_id,
      new_item_id: newItem.id,
      new_item: newItem,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Inventory convert error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
