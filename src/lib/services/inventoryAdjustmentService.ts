import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export interface InventoryAdjustmentInput {
  inventory_item_id: string
  adjustment_type: 'count_correction' | 'damage' | 'theft' | 'waste' | 'testing' | 'other'
  new_quantity: number
  reason: string
  employee_id: string
}

export interface AdjustmentResult {
  inventory_item_id: string
  previous_quantity: number
  new_quantity: number
  delta: number
}

export async function adjustInventory(input: InventoryAdjustmentInput): Promise<AdjustmentResult> {
  if (!input.reason.trim()) {
    throw new AppError('REASON_REQUIRED', 'Adjustment reason is required', undefined, 400)
  }

  const sb = await createSupabaseServerClient()

  // Load and lock current item
  const { data: item, error: fetchErr } = await sb
    .from('inventory_items')
    .select('id, quantity, quantity_reserved, product_id, location_id, biotrack_barcode')
    .eq('id', input.inventory_item_id)
    .single()

  if (fetchErr || !item) {
    throw new AppError('ITEM_NOT_FOUND', 'Inventory item not found', fetchErr, 404)
  }

  if (input.new_quantity < 0) {
    throw new AppError('INVALID_QUANTITY', 'Quantity cannot be negative', undefined, 400)
  }

  if (input.new_quantity < item.quantity_reserved) {
    logger.warn('Adjustment below reserved quantity', {
      itemId: item.id,
      newQty: input.new_quantity,
      reserved: item.quantity_reserved,
    })
  }

  const delta = input.new_quantity - item.quantity

  const { error: updateErr } = await sb
    .from('inventory_items')
    .update({ quantity: input.new_quantity, updated_at: new Date().toISOString() })
    .eq('id', input.inventory_item_id)

  if (updateErr) {
    throw new AppError('ADJUST_FAILED', 'Failed to adjust inventory', updateErr, 500)
  }

  // Get org for audit
  const { data: loc } = await sb.from('locations').select('organization_id').eq('id', item.location_id).single()

  // Audit log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await sb.from('audit_log').insert({
    organization_id: loc?.organization_id ?? '',
    location_id: item.location_id,
    employee_id: input.employee_id,
    entity_type: 'inventory_item',
    event_type: 'adjust',
    entity_id: input.inventory_item_id,
    metadata: {
      adjustment_type: input.adjustment_type,
      previous_quantity: item.quantity,
      new_quantity: input.new_quantity,
      delta,
      reason: input.reason,
    },
  } as any)

  // Fire-and-forget BioTrack sync
  if (item.biotrack_barcode) {
    import('@/lib/biotrack/client').then(({ getBioTrackClient }) => {
      const client = getBioTrackClient()
      client.call('inventory/adjust', {
        barcode: item.biotrack_barcode,
        quantity: input.new_quantity,
        reason: input.adjustment_type,
        notes: input.reason,
      }, {
        organizationId: loc?.organization_id ?? '',
        locationId: item.location_id,
        entityType: 'inventory_adjust',
        entityId: input.inventory_item_id,
      }).catch((err) => logger.error('BioTrack adjust sync failed', { error: String(err) }))
    }).catch(() => {})
  }

  logger.info('Inventory adjusted', { itemId: item.id, delta, type: input.adjustment_type })

  return {
    inventory_item_id: input.inventory_item_id,
    previous_quantity: item.quantity,
    new_quantity: input.new_quantity,
    delta,
  }
}
