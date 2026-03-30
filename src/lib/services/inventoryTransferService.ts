import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'

export interface TransferInput {
  source_location_id: string
  destination_location_id: string
  items: Array<{ inventory_item_id: string; quantity: number }>
  employee_id: string
  notes: string | null
}

export interface TransferRecord {
  id: string
  source_location_id: string
  destination_location_id: string
  status: string
  items: Array<{ inventory_item_id: string; quantity: number; product_name: string }>
  created_at: string
}

export async function initiateTransfer(input: TransferInput): Promise<TransferRecord> {
  if (input.source_location_id === input.destination_location_id) {
    throw new AppError('SAME_LOCATION', 'Cannot transfer to the same location', undefined, 400)
  }

  if (input.items.length === 0) {
    throw new AppError('NO_ITEMS', 'At least one item is required', undefined, 400)
  }

  const sb = await createSupabaseServerClient()

  // Validate locations are same org
  const { data: locs } = await sb
    .from('locations')
    .select('id, organization_id, name')
    .in('id', [input.source_location_id, input.destination_location_id])

  if (!locs || locs.length !== 2) {
    throw new AppError('INVALID_LOCATIONS', 'One or both locations not found', undefined, 400)
  }

  if (locs[0]!.organization_id !== locs[1]!.organization_id) {
    throw new AppError('DIFFERENT_ORG', 'Cannot transfer between organizations', undefined, 400)
  }

  const orgId = locs[0]!.organization_id

  // Validate and decrement each item
  const transferItems: TransferRecord['items'] = []

  for (const transferItem of input.items) {
    const { data: invItem, error: fetchErr } = await sb
      .from('inventory_items')
      .select('id, quantity, quantity_reserved, product_id, products ( name )')
      .eq('id', transferItem.inventory_item_id)
      .eq('location_id', input.source_location_id)
      .single()

    if (fetchErr || !invItem) {
      throw new AppError('ITEM_NOT_FOUND', `Inventory item ${transferItem.inventory_item_id} not found at source`, fetchErr, 400)
    }

    const available = invItem.quantity - invItem.quantity_reserved
    if (transferItem.quantity > available) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new AppError('INSUFFICIENT_QUANTITY', `Insufficient available quantity for ${(invItem.products as any)?.name ?? 'item'}. Available: ${available}, requested: ${transferItem.quantity}`, undefined, 400)
    }

    // Decrement source
    const { error: updateErr } = await sb
      .from('inventory_items')
      .update({
        quantity: invItem.quantity - transferItem.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transferItem.inventory_item_id)

    if (updateErr) {
      throw new AppError('DECREMENT_FAILED', 'Failed to decrement source inventory', updateErr, 500)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transferItems.push({ inventory_item_id: transferItem.inventory_item_id, quantity: transferItem.quantity, product_name: (invItem.products as any)?.name ?? '' })
  }

  // Create transfer record in audit_log
  const transferId = crypto.randomUUID()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await sb.from('audit_log').insert({
    organization_id: orgId,
    location_id: input.source_location_id,
    employee_id: input.employee_id,
    entity_type: 'inventory_transfer',
    event_type: 'create',
    entity_id: transferId,
    metadata: {
      source_location_id: input.source_location_id,
      destination_location_id: input.destination_location_id,
      items: transferItems,
      notes: input.notes,
      status: 'in_transit',
    },
  } as any)

  logger.info('Transfer initiated', {
    transferId,
    source: input.source_location_id,
    destination: input.destination_location_id,
    itemCount: transferItems.length,
  })

  // Fire-and-forget BioTrack manifest creation
  import('@/lib/biotrack/client').then(({ getBioTrackClient }) => {
    getBioTrackClient().call('inventory/manifest/create', {
      source_location: input.source_location_id,
      destination_location: input.destination_location_id,
      items: transferItems.map((i) => ({ inventory_item_id: i.inventory_item_id, quantity: i.quantity })),
    }, { organizationId: orgId, entityType: 'manifest_create', entityId: transferId })
      .catch((err) => logger.error('BioTrack manifest creation failed', { error: String(err) }))
  }).catch(() => {})

  return {
    id: transferId,
    source_location_id: input.source_location_id,
    destination_location_id: input.destination_location_id,
    status: 'in_transit',
    items: transferItems,
    created_at: new Date().toISOString(),
  }
}

export async function listPendingTransfers(locationId: string): Promise<TransferRecord[]> {
  const sb = await createSupabaseServerClient()

  const { data } = await sb
    .from('audit_log')
    .select('entity_id, metadata, created_at')
    .eq('entity_type', 'inventory_transfer')
    .eq('event_type', 'create')
    .or(`location_id.eq.${locationId}`)
    .order('created_at', { ascending: false })
    .limit(50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => {
    const meta = row.metadata ?? {}
    return {
      id: row.entity_id ?? '',
      source_location_id: meta.source_location_id ?? '',
      destination_location_id: meta.destination_location_id ?? '',
      status: meta.status ?? 'unknown',
      items: meta.items ?? [],
      created_at: row.created_at,
    }
  })
}
