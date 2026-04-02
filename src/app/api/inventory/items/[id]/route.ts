import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const ITEM_SELECT = [
  '*',
  'products ( id, name, sku, rec_price, med_price, thc_percentage, cbd_percentage, brands ( id, name ), vendors ( id, name ), strains ( id, name, strain_type ), product_categories ( id, name ) )',
  'rooms ( id, name )',
  'subrooms ( id, name )',
].join(', ')

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const sb = await createSupabaseServerClient()

    const { data: item, error } = await sb
      .from('inventory_items')
      .select(ITEM_SELECT)
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error || !item) {
      logger.warn('Inventory item not found', { id, error: error?.message })
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    // Fetch tags via inventory_item_tags junction
    const { data: tagRows } = await sb
      .from('inventory_item_tags')
      .select('tags ( id, name, color )')
      .eq('inventory_item_id', id)

    const tags = (tagRows ?? [])
      .map((row) => {
        const t = row.tags as unknown as { id: string; name: string; color: string | null } | null
        return t
      })
      .filter(Boolean)

    return NextResponse.json({ item: { ...(item as unknown as Record<string, unknown>), tags } })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Get inventory item error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

const PatchSchema = z.object({
  room_id: z.uuid().optional(),
  subroom_id: z.uuid().nullable().optional(),
  vendor_id: z.uuid().nullable().optional(),
  lot_number: z.string().nullable().optional(),
  batch_id: z.string().nullable().optional(),
  testing_status: z.string().optional(),
  is_on_hold: z.boolean().optional(),
  hold_reason: z.string().nullable().optional(),
  cost_per_unit: z.number().min(0).optional(),
  notes: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
})

const EDITABLE_FIELDS = [
  'room_id', 'subroom_id', 'vendor_id', 'lot_number', 'batch_id',
  'testing_status', 'is_on_hold', 'hold_reason', 'cost_per_unit',
  'notes', 'expiration_date',
] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await request.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()

    // Fetch existing item to compare changes
    const { data: existing, error: fetchErr } = await sb
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    // Build update payload and audit entries from changed fields
    const updates: Record<string, unknown> = {}
    const auditEntries: Array<{
      organization_id: string
      entity_type: string
      entity_id: string
      event_type: string
      field_edited: string
      previous_value: string | null
      new_value: string | null
      employee_id: string
    }> = []

    for (const field of EDITABLE_FIELDS) {
      if (field in parsed.data) {
        const newVal = parsed.data[field]
        const oldVal = (existing as Record<string, unknown>)[field]
        if (newVal !== oldVal) {
          updates[field] = newVal
          auditEntries.push({
            organization_id: session.organizationId,
            entity_type: 'inventory_item',
            entity_id: id,
            event_type: 'update',
            field_edited: field,
            previous_value: oldVal == null ? null : String(oldVal),
            new_value: newVal == null ? null : String(newVal),
            employee_id: session.employeeId,
          })
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No changes detected' })
    }

    const { data: updated, error: updateErr } = await sb
      .from('inventory_items')
      .update(updates)
      .eq('id', id)
      .select(ITEM_SELECT)
      .single()

    if (updateErr) {
      logger.error('Inventory item update error', { id, error: updateErr.message })
      return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 })
    }

    // Insert audit log entries
    if (auditEntries.length > 0) {
      const { error: auditErr } = await sb
        .from('audit_log')
        .insert(auditEntries)

      if (auditErr) {
        logger.warn('Failed to write audit log entries', { id, error: auditErr.message })
      }
    }

    return NextResponse.json({ item: updated })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Patch inventory item error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
