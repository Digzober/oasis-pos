import { createSupabaseServerClient } from '@/lib/supabase/server'

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
  lastSyncedEmployeesAt: Date | null
  lastSyncedCustomersAt: Date | null
  lastSyncedProductsAt: Date | null
  lastSyncedInventoryAt: Date | null
  lastSyncedRoomsAt: Date | null
  lastSyncedReferenceAt: Date | null
}

const cache = new Map<string, { config: DutchieLocationConfig; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

export async function loadDutchieConfig(locationId: string): Promise<DutchieLocationConfig | null> {
  const cached = cache.get(locationId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.config

  const sb = await createSupabaseServerClient()
  const { data } = await (sb as any).from('dutchie_config')
    .select('*')
    .eq('location_id', locationId)
    .maybeSingle()

  if (!data) return null

  const config: DutchieLocationConfig = {
    locationId: data.location_id,
    isEnabled: data.is_enabled,
    apiKey: data.api_key_encrypted || '',
    dutchieLocationId: data.dutchie_location_id,
    dutchieLocationName: data.dutchie_location_name,
    syncEmployees: data.sync_employees,
    syncCustomers: data.sync_customers,
    syncProducts: data.sync_products,
    syncInventory: data.sync_inventory,
    syncRooms: data.sync_rooms,
    lastSyncedEmployeesAt: data.last_synced_employees_at ? new Date(data.last_synced_employees_at) : null,
    lastSyncedCustomersAt: data.last_synced_customers_at ? new Date(data.last_synced_customers_at) : null,
    lastSyncedProductsAt: data.last_synced_products_at ? new Date(data.last_synced_products_at) : null,
    lastSyncedInventoryAt: data.last_synced_inventory_at ? new Date(data.last_synced_inventory_at) : null,
    lastSyncedRoomsAt: data.last_synced_rooms_at ? new Date(data.last_synced_rooms_at) : null,
    lastSyncedReferenceAt: data.last_synced_reference_at ? new Date(data.last_synced_reference_at) : null,
  }

  cache.set(locationId, { config, timestamp: Date.now() })
  return config
}

export function clearDutchieConfigCache(locationId?: string): void {
  if (locationId) cache.delete(locationId)
  else cache.clear()
}

export async function updateSyncTimestamp(
  locationId: string,
  entityType: 'employees' | 'customers' | 'products' | 'inventory' | 'rooms' | 'reference',
  timestamp: Date,
): Promise<void> {
  const sb = await createSupabaseServerClient()
  const col = `last_synced_${entityType}_at`
  await (sb as any).from('dutchie_config')
    .update({ [col]: timestamp.toISOString() })
    .eq('location_id', locationId)
  clearDutchieConfigCache(locationId)
}
