import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

const MAX_BULK_ITEMS = 100

const MoveAction = z.object({
  action: z.literal('move'),
  item_ids: z.array(z.uuid()).min(1).max(MAX_BULK_ITEMS),
  room_id: z.uuid(),
  subroom_id: z.uuid().nullable().optional(),
})

const AssignStatusAction = z.object({
  action: z.literal('assign_status'),
  item_ids: z.array(z.uuid()).min(1).max(MAX_BULK_ITEMS),
  status: z.string().min(1),
})

const ChangeVendorAction = z.object({
  action: z.literal('change_vendor'),
  item_ids: z.array(z.uuid()).min(1).max(MAX_BULK_ITEMS),
  vendor_id: z.uuid(),
})

const EditTagsAction = z.object({
  action: z.literal('edit_tags'),
  item_ids: z.array(z.uuid()).min(1).max(MAX_BULK_ITEMS),
  add_tags: z.array(z.uuid()).optional().default([]),
  remove_tags: z.array(z.uuid()).optional().default([]),
})

const AdjustAction = z.object({
  action: z.literal('adjust'),
  item_ids: z.array(z.uuid()).min(1).max(MAX_BULK_ITEMS),
  quantity_delta: z.number(),
  reason: z.string().min(1),
  notes: z.string().nullable().optional(),
})

const AssignBatchAction = z.object({
  action: z.literal('assign_batch'),
  item_ids: z.array(z.uuid()).min(1).max(MAX_BULK_ITEMS),
  batch_id: z.string().min(1),
})

const DestroyAction = z.object({
  action: z.literal('destroy'),
  item_ids: z.array(z.uuid()).min(1).max(MAX_BULK_ITEMS),
  reason: z.string().min(1),
  notes: z.string().nullable().optional(),
})

const BulkActionSchema = z.discriminatedUnion('action', [
  MoveAction,
  AssignStatusAction,
  ChangeVendorAction,
  EditTagsAction,
  AdjustAction,
  AssignBatchAction,
  DestroyAction,
])

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const parsed = BulkActionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const sb = await createSupabaseServerClient()
    const data = parsed.data
    const itemIds = data.item_ids

    // Verify all items exist and are active
    const { data: items, error: fetchErr } = await sb
      .from('inventory_items')
      .select('id, quantity, room_id, vendor_id, testing_status')
      .in('id', itemIds)
      .eq('is_active', true)

    if (fetchErr) {
      logger.error('Bulk fetch error', { error: fetchErr.message })
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    if (!items || items.length !== itemIds.length) {
      const foundIds = new Set((items ?? []).map((i) => i.id))
      const missing = itemIds.filter((id) => !foundIds.has(id))
      return NextResponse.json(
        { error: 'Some items not found or inactive', missing_ids: missing },
        { status: 404 }
      )
    }

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

    switch (data.action) {
      case 'move': {
        if (!hasPermission(session, PERMISSIONS.MOVE_INVENTORY) && !hasPermission(session, PERMISSIONS.ADMINISTRATOR)) {
          return NextResponse.json({ error: 'Move permission required' }, { status: 403 })
        }

        const updatePayload: Record<string, unknown> = { room_id: data.room_id }
        if ('subroom_id' in data) {
          updatePayload.subroom_id = data.subroom_id ?? null
        }

        const { error: updateErr } = await sb
          .from('inventory_items')
          .update(updatePayload)
          .in('id', itemIds)

        if (updateErr) {
          logger.error('Bulk move error', { error: updateErr.message })
          return NextResponse.json({ error: 'Failed to move items' }, { status: 500 })
        }

        for (const item of items) {
          auditEntries.push({
            organization_id: session.organizationId,
            entity_type: 'inventory_item',
            entity_id: item.id,
            event_type: 'bulk_move',
            field_edited: 'room_id',
            previous_value: item.room_id ?? null,
            new_value: data.room_id,
            employee_id: session.employeeId,
          })
        }
        break
      }

      case 'assign_status': {
        const { error: updateErr } = await sb
          .from('inventory_items')
          .update({ testing_status: data.status })
          .in('id', itemIds)

        if (updateErr) {
          logger.error('Bulk assign_status error', { error: updateErr.message })
          return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
        }

        for (const item of items) {
          auditEntries.push({
            organization_id: session.organizationId,
            entity_type: 'inventory_item',
            entity_id: item.id,
            event_type: 'bulk_assign_status',
            field_edited: 'testing_status',
            previous_value: item.testing_status ?? null,
            new_value: data.status,
            employee_id: session.employeeId,
          })
        }
        break
      }

      case 'change_vendor': {
        const { error: updateErr } = await sb
          .from('inventory_items')
          .update({ vendor_id: data.vendor_id })
          .in('id', itemIds)

        if (updateErr) {
          logger.error('Bulk change_vendor error', { error: updateErr.message })
          return NextResponse.json({ error: 'Failed to change vendor' }, { status: 500 })
        }

        for (const item of items) {
          auditEntries.push({
            organization_id: session.organizationId,
            entity_type: 'inventory_item',
            entity_id: item.id,
            event_type: 'bulk_change_vendor',
            field_edited: 'vendor_id',
            previous_value: item.vendor_id ?? null,
            new_value: data.vendor_id,
            employee_id: session.employeeId,
          })
        }
        break
      }

      case 'edit_tags': {
        if (data.remove_tags.length > 0) {
          const { error: delErr } = await sb
            .from('inventory_item_tags')
            .delete()
            .in('inventory_item_id', itemIds)
            .in('tag_id', data.remove_tags)

          if (delErr) {
            logger.error('Bulk remove tags error', { error: delErr.message })
            return NextResponse.json({ error: 'Failed to remove tags' }, { status: 500 })
          }
        }

        if (data.add_tags.length > 0) {
          const tagInserts: Array<{ inventory_item_id: string; tag_id: string }> = []
          for (const itemId of itemIds) {
            for (const tagId of data.add_tags) {
              tagInserts.push({ inventory_item_id: itemId, tag_id: tagId })
            }
          }

          const { error: insErr } = await sb
            .from('inventory_item_tags')
            .upsert(tagInserts, { onConflict: 'inventory_item_id,tag_id', ignoreDuplicates: true })

          if (insErr) {
            logger.error('Bulk add tags error', { error: insErr.message })
            return NextResponse.json({ error: 'Failed to add tags' }, { status: 500 })
          }
        }

        for (const itemId of itemIds) {
          auditEntries.push({
            organization_id: session.organizationId,
            entity_type: 'inventory_item',
            entity_id: itemId,
            event_type: 'bulk_edit_tags',
            field_edited: 'tags',
            previous_value: null,
            new_value: JSON.stringify({ added: data.add_tags, removed: data.remove_tags }),
            employee_id: session.employeeId,
          })
        }
        break
      }

      case 'adjust': {
        if (!hasPermission(session, PERMISSIONS.ADJUST_INVENTORY) && !hasPermission(session, PERMISSIONS.ADMINISTRATOR)) {
          return NextResponse.json({ error: 'Adjust permission required' }, { status: 403 })
        }

        // Adjust each item individually to track old/new quantities
        for (const item of items) {
          const oldQty = Number(item.quantity)
          const newQty = oldQty + data.quantity_delta

          if (newQty < 0) {
            return NextResponse.json(
              { error: `Adjustment would result in negative quantity for item ${item.id}` },
              { status: 400 }
            )
          }

          const { error: updateErr } = await sb
            .from('inventory_items')
            .update({ quantity: newQty })
            .eq('id', item.id)

          if (updateErr) {
            logger.error('Bulk adjust error', { itemId: item.id, error: updateErr.message })
            return NextResponse.json({ error: `Failed to adjust item ${item.id}` }, { status: 500 })
          }

          auditEntries.push({
            organization_id: session.organizationId,
            entity_type: 'inventory_item',
            entity_id: item.id,
            event_type: 'bulk_adjust',
            field_edited: 'quantity',
            previous_value: String(oldQty),
            new_value: `${String(newQty)} | reason: ${data.reason}${data.notes ? ` | notes: ${data.notes}` : ''}`,
            employee_id: session.employeeId,
          })
        }
        break
      }

      case 'assign_batch': {
        const { error: updateErr } = await sb
          .from('inventory_items')
          .update({ batch_id: data.batch_id })
          .in('id', itemIds)

        if (updateErr) {
          logger.error('Bulk assign_batch error', { error: updateErr.message })
          return NextResponse.json({ error: 'Failed to assign batch' }, { status: 500 })
        }

        for (const item of items) {
          auditEntries.push({
            organization_id: session.organizationId,
            entity_type: 'inventory_item',
            entity_id: item.id,
            event_type: 'bulk_assign_batch',
            field_edited: 'batch_id',
            previous_value: null,
            new_value: data.batch_id,
            employee_id: session.employeeId,
          })
        }
        break
      }

      case 'destroy': {
        if (!hasPermission(session, PERMISSIONS.ADJUST_INVENTORY) && !hasPermission(session, PERMISSIONS.ADMINISTRATOR)) {
          return NextResponse.json({ error: 'Destroy permission required' }, { status: 403 })
        }

        const { error: updateErr } = await sb
          .from('inventory_items')
          .update({ is_active: false, deactivated_at: new Date().toISOString(), quantity: 0 })
          .in('id', itemIds)

        if (updateErr) {
          logger.error('Bulk destroy error', { error: updateErr.message })
          return NextResponse.json({ error: 'Failed to destroy items' }, { status: 500 })
        }

        for (const item of items) {
          auditEntries.push({
            organization_id: session.organizationId,
            entity_type: 'inventory_item',
            entity_id: item.id,
            event_type: 'destroy',
            field_edited: 'is_active',
            previous_value: 'true',
            new_value: `false | reason: ${data.reason}${data.notes ? ` | notes: ${data.notes}` : ''}`,
            employee_id: session.employeeId,
          })
        }
        break
      }
    }

    // Write audit log
    if (auditEntries.length > 0) {
      const { error: auditErr } = await sb.from('audit_log').insert(auditEntries)
      if (auditErr) {
        logger.warn('Failed to write bulk audit log', { error: auditErr.message })
      }
    }

    return NextResponse.json({
      success: true,
      action: data.action,
      affected_count: itemIds.length,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const a = err as { code: string; message: string; statusCode?: number }
      if (a.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: a.message }, { status: a.statusCode ?? 500 })
    }
    logger.error('Bulk inventory error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
