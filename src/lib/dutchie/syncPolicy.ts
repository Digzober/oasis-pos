import type { EntityType } from './types'

export const ORG_WIDE_ENTITIES: ReadonlySet<EntityType> = new Set([
  'reference',
  'customers',
  'loyalty',
])

export const LOCATION_SCOPED_ENTITIES: ReadonlySet<EntityType> = new Set([
  'rooms',
  'employees',
  'products',
  'inventory',
  'registers',
  'transactions',
])

export const ENTITY_ENABLED_KEY: Record<EntityType, string> = {
  reference: 'isEnabled',
  rooms: 'syncRooms',
  employees: 'syncEmployees',
  products: 'syncProducts',
  customers: 'syncCustomers',
  inventory: 'syncInventory',
  registers: 'isEnabled',
  transactions: 'syncTransactions',
  loyalty: 'syncLoyalty',
}

export const INCREMENTAL_OVERLAP_MS = 15 * 60 * 1000
export const TRANSACTION_WINDOW_MS = 55 * 24 * 60 * 60 * 1000

export function incrementalSince(checkpoint: Date): Date {
  return new Date(checkpoint.getTime() - INCREMENTAL_OVERLAP_MS)
}

export function utcDayStart(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

export function utcDayEndExclusive(value: Date): Date {
  return new Date(utcDayStart(value).getTime() + 24 * 60 * 60 * 1000)
}

export function checkpointAfterRun(
  previous: Date | null,
  startedAt: Date,
  outcome: { errored: number; completed: boolean },
): Date | null {
  return outcome.completed && outcome.errored === 0 ? startedAt : previous
}

export function isSyncConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string }
  return candidate.code === '23505'
    && Boolean(candidate.message?.includes('dutchie_sync_log_'))
}

export class SyncConflictError extends Error {
  readonly code = 'SYNC_ALREADY_RUNNING'
  readonly statusCode = 409

  constructor(entityType: string) {
    super(`A ${entityType} sync is already running`)
  }
}
