import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireDutchieManager } from '@/lib/auth/dutchie'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { clearDutchieConfigCache } from '@/lib/dutchie/configLoader'
import { logger } from '@/lib/utils/logger'

const UpdateDutchieConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  apiKey: z.string().optional(),
  syncEmployees: z.boolean().optional(),
  syncCustomers: z.boolean().optional(),
  syncProducts: z.boolean().optional(),
  syncInventory: z.boolean().optional(),
  syncRooms: z.boolean().optional(),
  syncTransactions: z.boolean().optional(),
  syncLoyalty: z.boolean().optional(),
  designatedLoyaltyLocationId: z.uuid().nullable().optional(),
})

const DEFAULT_CONFIG = {
  isEnabled: false,
  hasApiKey: false,
  apiKeyTail: '',
  dutchieLocationId: '',
  dutchieLocationName: '',
  syncEmployees: true,
  syncCustomers: true,
  syncProducts: true,
  syncInventory: true,
  syncRooms: true,
  syncTransactions: true,
  syncLoyalty: true,
  lastSyncedEmployeesAt: null as string | null,
  lastSyncedCustomersAt: null as string | null,
  lastSyncedProductsAt: null as string | null,
  lastSyncedInventoryAt: null as string | null,
  lastSyncedRoomsAt: null as string | null,
  lastSyncedReferenceAt: null as string | null,
  lastSyncedTransactionsAt: null as string | null,
  lastSyncedLoyaltyAt: null as string | null,
  designatedLoyaltyLocationId: null as string | null,
}

/** Mask API key: show last 4 chars as ****...xxxx */
function maskApiKey(key: string | null): string {
  if (!key || key.length < 4) return ''
  return '****...' + key.slice(-4)
}

/** Map DB row to frontend camelCase */
export function dbRowToFrontend(row: Record<string, unknown>, loyaltyState?: Record<string, unknown> | null) {
  const rawKey = (row.api_key_encrypted as string) ?? ''
  return {
    isEnabled: row.is_enabled ?? DEFAULT_CONFIG.isEnabled,
    hasApiKey: rawKey.length > 0,
    apiKeyTail: maskApiKey(rawKey),
    dutchieLocationId: (row.dutchie_location_id as string) ?? '',
    dutchieLocationName: (row.dutchie_location_name as string) ?? '',
    syncEmployees: row.sync_employees ?? DEFAULT_CONFIG.syncEmployees,
    syncCustomers: row.sync_customers ?? DEFAULT_CONFIG.syncCustomers,
    syncProducts: row.sync_products ?? DEFAULT_CONFIG.syncProducts,
    syncInventory: row.sync_inventory ?? DEFAULT_CONFIG.syncInventory,
    syncRooms: row.sync_rooms ?? DEFAULT_CONFIG.syncRooms,
    syncTransactions: row.sync_transactions ?? DEFAULT_CONFIG.syncTransactions,
    syncLoyalty: loyaltyState?.is_enabled ?? row.sync_loyalty ?? DEFAULT_CONFIG.syncLoyalty,
    lastSyncedEmployeesAt: (row.last_synced_employees_at as string) ?? null,
    lastSyncedCustomersAt: (row.last_synced_customers_at as string) ?? null,
    lastSyncedProductsAt: (row.last_synced_products_at as string) ?? null,
    lastSyncedInventoryAt: (row.last_synced_inventory_at as string) ?? null,
    lastSyncedRoomsAt: (row.last_synced_rooms_at as string) ?? null,
    lastSyncedReferenceAt: (row.last_synced_reference_at as string) ?? null,
    lastSyncedTransactionsAt: (row.last_synced_transactions_at as string) ?? null,
    lastSyncedLoyaltyAt: (loyaltyState?.last_synced_at as string) ?? (row.last_synced_loyalty_at as string) ?? null,
    designatedLoyaltyLocationId: (loyaltyState?.designated_location_id as string) ?? null,
  }
}

/** Map frontend camelCase to DB snake_case for upsert */
export function frontendToDbRow(data: Record<string, unknown>, locationId: string) {
  const row: Record<string, unknown> = { location_id: locationId, updated_at: new Date().toISOString() }

  if (data.isEnabled !== undefined) row.is_enabled = data.isEnabled
  if (data.syncEmployees !== undefined) row.sync_employees = data.syncEmployees
  if (data.syncCustomers !== undefined) row.sync_customers = data.syncCustomers
  if (data.syncProducts !== undefined) row.sync_products = data.syncProducts
  if (data.syncInventory !== undefined) row.sync_inventory = data.syncInventory
  if (data.syncRooms !== undefined) row.sync_rooms = data.syncRooms
  if (data.syncTransactions !== undefined) row.sync_transactions = data.syncTransactions
  if (data.syncLoyalty !== undefined) row.sync_loyalty = data.syncLoyalty

  // Only update API key if it's a real value (not the masked version)
  if (data.apiKey !== undefined && typeof data.apiKey === 'string' && !data.apiKey.startsWith('****')) {
    row.api_key_encrypted = data.apiKey
  }

  return row
}

export async function GET() {
  try {
    const session = await requireDutchieManager()
    const sb = await createSupabaseServerClient()

    const [configResult, loyaltyResult, locationsResult] = await Promise.all([
      (sb as any).from('dutchie_config')
        .select('*, locations!inner(organization_id)')
        .eq('location_id', session.locationId)
        .eq('locations.organization_id', session.organizationId)
        .maybeSingle(),
      (sb as any).from('dutchie_sync_state')
        .select('is_enabled, last_synced_at, designated_location_id')
        .eq('organization_id', session.organizationId)
        .eq('entity_type', 'loyalty')
        .is('location_id', null)
        .maybeSingle(),
      sb.from('locations')
        .select('id, name')
        .eq('organization_id', session.organizationId)
        .order('name'),
    ])
    const { data: config, error } = configResult

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      config: config ? dbRowToFrontend(config, loyaltyResult.data) : {
        ...DEFAULT_CONFIG,
        syncLoyalty: loyaltyResult.data?.is_enabled ?? DEFAULT_CONFIG.syncLoyalty,
        lastSyncedLoyaltyAt: loyaltyResult.data?.last_synced_at ?? null,
        designatedLoyaltyLocationId: loyaltyResult.data?.designated_location_id ?? null,
      },
      availableLocations: locationsResult.data ?? [],
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Dutchie config get error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireDutchieManager()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = UpdateDutchieConfigSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { data: location, error: locationError } = await sb.from('locations')
      .select('id')
      .eq('id', session.locationId)
      .eq('organization_id', session.organizationId)
      .maybeSingle()

    if (locationError) return NextResponse.json({ error: locationError.message }, { status: 500 })
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const dbRow = frontendToDbRow(parsed.data as Record<string, unknown>, session.locationId)

    const { data: config, error } = await (sb as any).from('dutchie_config')
      .upsert(dbRow, { onConflict: 'location_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let loyaltyState: Record<string, unknown> | null = null
    if (parsed.data.syncLoyalty !== undefined || parsed.data.designatedLoyaltyLocationId !== undefined) {
      if (parsed.data.designatedLoyaltyLocationId) {
        const { data: designated } = await sb.from('locations')
          .select('id')
          .eq('id', parsed.data.designatedLoyaltyLocationId)
          .eq('organization_id', session.organizationId)
          .maybeSingle()
        if (!designated) return NextResponse.json({ error: 'Designated location not found' }, { status: 404 })
      }

      const existing = await (sb as any).from('dutchie_sync_state')
        .select('id')
        .eq('organization_id', session.organizationId)
        .eq('entity_type', 'loyalty')
        .is('location_id', null)
        .maybeSingle()
      const statePatch = {
        organization_id: session.organizationId,
        location_id: null,
        entity_type: 'loyalty',
        ...(parsed.data.syncLoyalty !== undefined ? { is_enabled: parsed.data.syncLoyalty } : {}),
        ...(parsed.data.designatedLoyaltyLocationId !== undefined
          ? { designated_location_id: parsed.data.designatedLoyaltyLocationId }
          : {}),
        updated_at: new Date().toISOString(),
      }
      const stateResult = existing.data?.id
        ? await (sb as any).from('dutchie_sync_state').update(statePatch).eq('id', existing.data.id).select().single()
        : await (sb as any).from('dutchie_sync_state').insert(statePatch).select().single()
      if (stateResult.error) return NextResponse.json({ error: stateResult.error.message }, { status: 500 })
      loyaltyState = stateResult.data
    }

    if (!loyaltyState) {
      const stateResult = await (sb as any).from('dutchie_sync_state')
        .select('is_enabled, last_synced_at, designated_location_id')
        .eq('organization_id', session.organizationId)
        .eq('entity_type', 'loyalty')
        .is('location_id', null)
        .maybeSingle()
      if (stateResult.error) return NextResponse.json({ error: stateResult.error.message }, { status: 500 })
      loyaltyState = stateResult.data
    }

    clearDutchieConfigCache(session.locationId)

    return NextResponse.json({ config: dbRowToFrontend(config, loyaltyState) })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const appErr = err as { code: string; message: string; statusCode?: number }
      if (appErr.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      return NextResponse.json({ error: appErr.message }, { status: appErr.statusCode ?? 500 })
    }
    logger.error('Dutchie config update error', { error: String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
