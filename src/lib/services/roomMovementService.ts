import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export async function moveInventoryToRoom(
  inventoryItemId: string,
  newRoomId: string,
  newSubroomId: string | null,
  employeeId: string,
): Promise<void> {
  const sb = await createSupabaseServerClient()

  const { data: item } = await sb
    .from('inventory_items')
    .select('id, room_id, location_id')
    .eq('id', inventoryItemId)
    .single()

  if (!item) {
    throw new AppError('ITEM_NOT_FOUND', 'Inventory item not found', undefined, 404)
  }

  const previousRoomId = item.room_id

  const { error } = await sb
    .from('inventory_items')
    .update({ room_id: newRoomId, subroom_id: newSubroomId, updated_at: new Date().toISOString() })
    .eq('id', inventoryItemId)

  if (error) {
    throw new AppError('MOVE_FAILED', 'Failed to move inventory', error, 500)
  }

  const { data: loc } = await sb.from('locations').select('organization_id').eq('id', item.location_id).single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await sb.from('audit_log').insert({
    organization_id: loc?.organization_id ?? '',
    location_id: item.location_id,
    employee_id: employeeId,
    entity_type: 'inventory_item',
    event_type: 'room_move',
    entity_id: inventoryItemId,
    metadata: { previous_room_id: previousRoomId, new_room_id: newRoomId, new_subroom_id: newSubroomId },
  } as any)

  logger.info('Inventory moved', { itemId: inventoryItemId, from: previousRoomId, to: newRoomId })
}
