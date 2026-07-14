import { ORG_WIDE_ENTITIES } from './syncPolicy'
import type { EntityType } from './types'

type SupabaseClientLike = ReturnType<typeof Object>

export async function checkpointSuccessfulSync(
  sb: SupabaseClientLike,
  input: {
    organizationId: string
    locationId: string
    entityType: EntityType
    checkpoint: Date
    cursor?: Record<string, unknown> | null
  },
): Promise<void> {
  const { error } = await (sb as any).rpc('checkpoint_dutchie_sync_state', {
    p_org: input.organizationId,
    p_location: ORG_WIDE_ENTITIES.has(input.entityType) ? null : input.locationId,
    p_entity: input.entityType,
    p_checkpoint: input.checkpoint.toISOString(),
    p_cursor: input.cursor ?? null,
  })
  if (error) throw new Error(`Failed to checkpoint ${input.entityType}: ${error.message}`)
}

export async function loadSyncState(
  sb: SupabaseClientLike,
  organizationId: string,
  locationId: string | null,
  entityType: EntityType,
): Promise<{ lastSyncedAt: Date | null; cursor: Record<string, unknown> | null } | null> {
  let query = (sb as any).from('dutchie_sync_state')
    .select('last_synced_at, cursor')
    .eq('organization_id', organizationId)
    .eq('entity_type', entityType)
  query = locationId ? query.eq('location_id', locationId) : query.is('location_id', null)
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`Failed to load ${entityType} sync state: ${error.message}`)
  if (!data) return null
  return {
    lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : null,
    cursor: data.cursor ?? null,
  }
}

export async function saveSyncCursor(
  sb: SupabaseClientLike,
  input: {
    organizationId: string
    locationId: string
    entityType: EntityType
    cursor: Record<string, unknown> | null
  },
): Promise<void> {
  const { error } = await (sb as any).rpc('checkpoint_dutchie_sync_state', {
    p_org: input.organizationId,
    p_location: ORG_WIDE_ENTITIES.has(input.entityType) ? null : input.locationId,
    p_entity: input.entityType,
    p_checkpoint: null,
    p_cursor: input.cursor,
  })
  if (error) throw new Error(`Failed to save ${input.entityType} cursor: ${error.message}`)
}
