import { createSupabaseServerClient } from '@/lib/supabase/server'
import { decryptStoredSecret } from '@/lib/security/settingsSecrets.server'

export interface DutchieLocationConfig {
  locationId: string
  isEnabled: boolean
  apiKey: string
  dutchieLocationId: string | null
  dutchieLocationName: string | null
  syncEmployees: boolean
  syncCustomers: boolean
  syncProducts: boolean
  syncInventory: boolean
  syncRooms: boolean
  syncTransactions: boolean
  syncLoyalty: boolean
  lastSyncedEmployeesAt: Date | null
  lastSyncedCustomersAt: Date | null
  lastSyncedProductsAt: Date | null
  lastSyncedInventoryAt: Date | null
  lastSyncedRoomsAt: Date | null
  lastSyncedReferenceAt: Date | null
  lastSyncedTransactionsAt: Date | null
  lastSyncedLoyaltyAt: Date | null
}

const cache = new Map<string, { config: DutchieLocationConfig; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function loadDutchieConfig(locationId: string, organizationId?: string): Promise<DutchieLocationConfig | null> {
  const cacheKey = organizationId ? `${organizationId}:${locationId}` : locationId
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.config

  const sb = await createSupabaseServerClient()
  let query = (sb as any).from('dutchie_config')
    .select(organizationId ? '*, locations!inner(organization_id)' : '*')
    .eq('location_id', locationId)

  if (organizationId) query = query.eq('locations.organization_id', organizationId)
  const { data } = await query.maybeSingle()

  if (!data) return null

  const config: DutchieLocationConfig = {
    locationId: data.location_id,
    isEnabled: data.is_enabled,
    apiKey: decryptStoredSecret(data.api_key_encrypted),
    dutchieLocationId: data.dutchie_location_id,
    dutchieLocationName: data.dutchie_location_name,
    syncEmployees: data.sync_employees,
    syncCustomers: data.sync_customers,
    syncProducts: data.sync_products,
    syncInventory: data.sync_inventory,
    syncRooms: data.sync_rooms,
    syncTransactions: data.sync_transactions ?? true,
    syncLoyalty: data.sync_loyalty ?? true,
    lastSyncedEmployeesAt: data.last_synced_employees_at ? new Date(data.last_synced_employees_at) : null,
    lastSyncedCustomersAt: data.last_synced_customers_at ? new Date(data.last_synced_customers_at) : null,
    lastSyncedProductsAt: data.last_synced_products_at ? new Date(data.last_synced_products_at) : null,
    lastSyncedInventoryAt: data.last_synced_inventory_at ? new Date(data.last_synced_inventory_at) : null,
    lastSyncedRoomsAt: data.last_synced_rooms_at ? new Date(data.last_synced_rooms_at) : null,
    lastSyncedReferenceAt: data.last_synced_reference_at ? new Date(data.last_synced_reference_at) : null,
    lastSyncedTransactionsAt: data.last_synced_transactions_at ? new Date(data.last_synced_transactions_at) : null,
    lastSyncedLoyaltyAt: data.last_synced_loyalty_at ? new Date(data.last_synced_loyalty_at) : null,
  }

  cache.set(cacheKey, { config, timestamp: Date.now() })
  return config
}

export function clearDutchieConfigCache(locationId?: string): void {
  if (!locationId) {
    cache.clear()
    return
  }

  cache.delete(locationId)
  for (const key of cache.keys()) {
    if (key.endsWith(`:${locationId}`)) cache.delete(key)
  }
}

export async function updateSyncTimestamp(
  locationId: string,
  entityType: 'employees' | 'customers' | 'products' | 'inventory' | 'rooms' | 'reference' | 'transactions' | 'loyalty',
  timestamp: Date,
): Promise<void> {
  const sb = await createSupabaseServerClient()
  const col = `last_synced_${entityType}_at`
  await (sb as any).from('dutchie_config')
    .update({ [col]: timestamp.toISOString() })
    .eq('location_id', locationId)
  clearDutchieConfigCache(locationId)
}
