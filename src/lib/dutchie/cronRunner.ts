import type { EntityType } from './types'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { syncEntity } from './syncEngine'
import { SyncConflictError } from './syncPolicy'

export interface CronLocation {
  organizationId: string
  locationId: string
  enabled: boolean
  designated?: boolean
  toggles?: Partial<Record<EntityType, boolean>>
}

export interface CronState {
  organizationId: string
  locationId: string | null
  entityType: EntityType
  lastSyncedAt: string | null
  enabled?: boolean
  designatedLocationId?: string | null
  cursor?: Record<string, unknown> | null
}

export interface CronWorkItem {
  organizationId: string
  locationId: string
  entityType: EntityType
  lastSyncedAt: string | null
  cursor: Record<string, unknown> | null
  skipReason?: string
}

const ORG_ENTITIES: EntityType[] = ['reference', 'customers', 'loyalty']
const LOCATION_ENTITIES: EntityType[] = ['rooms', 'employees', 'products', 'inventory', 'registers', 'transactions']

export function buildCronWorkQueue(input: {
  now: Date
  locations: CronLocation[]
  states: CronState[]
  pendingLoyaltyOrganizations?: ReadonlySet<string>
}): CronWorkItem[] {
  const stateKey = (org: string, location: string | null, entity: EntityType) =>
    `${org}:${location ?? 'org'}:${entity}`
  const states = new Map(input.states.map(state => [
    stateKey(state.organizationId, state.locationId, state.entityType),
    state,
  ]))
  const enabledLocations = input.locations.filter(location => location.enabled)
  const byOrg = new Map<string, CronLocation[]>()
  for (const location of enabledLocations) {
    const group = byOrg.get(location.organizationId) ?? []
    group.push(location)
    byOrg.set(location.organizationId, group)
  }

  const queue: CronWorkItem[] = []
  for (const [organizationId, locations] of byOrg) {
    for (const entityType of ORG_ENTITIES) {
      const state = states.get(stateKey(organizationId, null, entityType))
      // Location configuration is authoritative for reference/customer eligibility.
      // Loyalty is the only org-scoped entity with a dedicated state toggle.
      if (entityType === 'loyalty' && state?.enabled === false) continue
      const eligibleLocations = entityType === 'reference'
        ? locations
        : locations.filter(location => location.toggles?.[entityType] !== false)
      if (eligibleLocations.length === 0) continue
      const hasPendingLoyalty = entityType === 'loyalty'
        && input.pendingLoyaltyOrganizations?.has(organizationId)
      if (entityType === 'loyalty' && state?.lastSyncedAt && !hasPendingLoyalty) {
        const age = input.now.getTime() - new Date(state.lastSyncedAt).getTime()
        if (age < 20 * 60 * 60 * 1000) continue
      }
      const designated = eligibleLocations.find(location => location.locationId === state?.designatedLocationId)
        ?? eligibleLocations.find(location => location.designated)
        ?? eligibleLocations[0]
      if (!designated) continue
      queue.push({
        organizationId,
        locationId: designated.locationId,
        entityType,
        lastSyncedAt: state?.lastSyncedAt ?? null,
        cursor: state?.cursor ?? null,
        ...(state?.lastSyncedAt || entityType === 'loyalty'
          ? {}
          : { skipReason: 'needs initial manual sync' }),
      })
    }
  }

  for (const location of enabledLocations) {
    for (const entityType of LOCATION_ENTITIES) {
      if (location.toggles?.[entityType] === false) continue
      const state = states.get(stateKey(location.organizationId, location.locationId, entityType))
      queue.push({
        organizationId: location.organizationId,
        locationId: location.locationId,
        entityType,
        lastSyncedAt: state?.lastSyncedAt ?? null,
        cursor: state?.cursor ?? null,
        ...(!state?.lastSyncedAt ? { skipReason: 'needs initial manual sync' } : {}),
      })
    }
  }

  return queue.sort((a, b) => {
    if (a.skipReason !== b.skipReason) return a.skipReason ? 1 : -1
    const aTime = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0
    const bTime = b.lastSyncedAt ? new Date(b.lastSyncedAt).getTime() : 0
    return aTime - bTime
  })
}

export async function runDutchieCron(input: {
  deadline: number
  now?: Date
}): Promise<{
  processed: Array<{ organizationId: string; locationId: string; entityType: EntityType; fetched: number; errors: number }>
  skipped: Array<{ organizationId: string; locationId: string; entityType: EntityType; reason: string }>
  deadlineReached: boolean
}> {
  const sb = await createSupabaseServerClient()
  const [configResult, stateResult, pendingLoyaltyResult] = await Promise.all([
    (sb as any).from('dutchie_config')
      .select('location_id, is_enabled, sync_employees, sync_customers, sync_products, sync_inventory, sync_rooms, sync_transactions, sync_loyalty, locations!inner(organization_id)'),
    (sb as any).from('dutchie_sync_state')
      .select('organization_id, location_id, entity_type, last_synced_at, cursor, is_enabled, designated_location_id'),
    (sb as any).rpc('list_pending_dutchie_loyalty_orgs'),
  ])
  if (configResult.error) throw new Error(`Failed to load Dutchie cron configs: ${configResult.error.message}`)
  if (stateResult.error) throw new Error(`Failed to load Dutchie cron state: ${stateResult.error.message}`)
  if (pendingLoyaltyResult.error) throw new Error(`Failed to load loyalty staging: ${pendingLoyaltyResult.error.message}`)

  const locations: CronLocation[] = (configResult.data ?? []).flatMap((row: Record<string, unknown>) => {
    const relation = Array.isArray(row.locations) ? row.locations[0] : row.locations
    const organizationId = (relation as { organization_id?: string } | null)?.organization_id
    if (!organizationId) return []
    return [{
      organizationId,
      locationId: row.location_id as string,
      enabled: row.is_enabled === true,
      toggles: {
        employees: row.sync_employees !== false,
        customers: row.sync_customers !== false,
        products: row.sync_products !== false,
        inventory: row.sync_inventory !== false,
        registers: true,
        rooms: row.sync_rooms !== false,
        transactions: row.sync_transactions !== false,
        loyalty: row.sync_loyalty !== false,
      },
    }]
  })
  const validEntities = new Set<EntityType>([
    'reference', 'rooms', 'employees', 'products', 'customers', 'inventory', 'registers', 'transactions', 'loyalty',
  ])
  const states: CronState[] = (stateResult.data ?? []).flatMap((row: Record<string, unknown>) => {
    const entityType = row.entity_type as EntityType
    if (!validEntities.has(entityType)) return []
    return [{
      organizationId: row.organization_id as string,
      locationId: (row.location_id as string | null) ?? null,
      entityType,
      lastSyncedAt: (row.last_synced_at as string | null) ?? null,
      cursor: (row.cursor as Record<string, unknown> | null) ?? null,
      enabled: row.is_enabled !== false,
      designatedLocationId: (row.designated_location_id as string | null) ?? null,
    }]
  })
  const pendingLoyaltyOrganizations = new Set<string>(
    (pendingLoyaltyResult.data ?? []).map((row: { organization_id: string }) => row.organization_id),
  )
  const queue = buildCronWorkQueue({
    now: input.now ?? new Date(),
    locations,
    states,
    pendingLoyaltyOrganizations,
  })
  const processed: Array<{ organizationId: string; locationId: string; entityType: EntityType; fetched: number; errors: number }> = []
  const skipped: Array<{ organizationId: string; locationId: string; entityType: EntityType; reason: string }> = []

  for (const item of queue) {
    if (item.skipReason) {
      skipped.push({ ...item, reason: item.skipReason })
      continue
    }
    if (Date.now() >= input.deadline) break
    try {
      const result = await syncEntity(item.locationId, item.organizationId, item.entityType, {
        deadline: input.deadline,
      })
      processed.push({
        organizationId: item.organizationId,
        locationId: item.locationId,
        entityType: item.entityType,
        fetched: result.fetched,
        errors: result.errored,
      })
    } catch (error) {
      if (error instanceof SyncConflictError) {
        skipped.push({ ...item, reason: error.message })
        continue
      }
      throw error
    }
  }

  return { processed, skipped, deadlineReached: Date.now() >= input.deadline }
}
