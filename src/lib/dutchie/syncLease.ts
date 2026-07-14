import { ORG_WIDE_ENTITIES, SyncConflictError, isSyncConflict } from './syncPolicy'
import type { EntityType, SyncResult } from './types'

type SupabaseClientLike = ReturnType<typeof Object>

const STALE_AFTER_MS = 5 * 60 * 1000

export async function acquireSyncLease(
  sb: SupabaseClientLike,
  input: {
    organizationId: string
    locationId: string
    entityType: EntityType
    syncType: 'full' | 'incremental'
    now?: Date
  },
): Promise<string> {
  const now = input.now ?? new Date()
  const cutoff = new Date(now.getTime() - STALE_AFTER_MS).toISOString()
  let stale = (sb as any).from('dutchie_sync_log')
    .update({
      status: 'failed',
      completed_at: now.toISOString(),
      error_details: ['stale: heartbeat lease exceeded five minutes'],
    })
    .eq('status', 'running')
    .eq('entity_type', input.entityType)
    .lt('heartbeat_at', cutoff)
  stale = ORG_WIDE_ENTITIES.has(input.entityType)
    ? stale.eq('organization_id', input.organizationId)
    : stale.eq('location_id', input.locationId)
  const { error: staleError } = await stale
  if (staleError) throw new Error(`Failed to reap stale ${input.entityType} sync lease: ${staleError.message}`)

  const { data, error } = await (sb as any).from('dutchie_sync_log').insert({
    organization_id: input.organizationId,
    location_id: input.locationId,
    entity_type: input.entityType,
    sync_type: input.syncType,
    status: 'running',
    started_at: now.toISOString(),
    heartbeat_at: now.toISOString(),
  }).select('id').single()

  if (error) {
    if (isSyncConflict(error)) throw new SyncConflictError(input.entityType)
    throw new Error(`Failed to acquire ${input.entityType} sync lease: ${error.message}`)
  }
  if (!data?.id) throw new Error(`Failed to acquire ${input.entityType} sync lease`)
  return data.id
}

export async function heartbeatSyncLease(sb: SupabaseClientLike, leaseId: string): Promise<void> {
  if (!leaseId) return
  const { error } = await (sb as any).from('dutchie_sync_log')
    .update({ heartbeat_at: new Date().toISOString() })
    .eq('id', leaseId)
    .eq('status', 'running')
  if (error) throw new Error(`Failed to heartbeat Dutchie sync lease: ${error.message}`)
}

export async function completeSyncLease(
  sb: SupabaseClientLike,
  leaseId: string,
  result: SyncResult,
): Promise<void> {
  if (!leaseId) return
  const { error } = await (sb as any).from('dutchie_sync_log').update({
    status: result.errored > 0 ? 'failed' : 'completed',
    completed_at: new Date().toISOString(),
    heartbeat_at: new Date().toISOString(),
    records_fetched: result.fetched,
    records_created: result.created,
    records_updated: result.updated,
    records_skipped: result.skipped,
    records_errored: result.errored,
    error_details: result.errors.length > 0 ? result.errors.slice(0, 100) : null,
    duration_ms: result.durationMs,
  }).eq('id', leaseId).eq('status', 'running')
  if (error) throw new Error(`Failed to complete Dutchie sync lease: ${error.message}`)
}
