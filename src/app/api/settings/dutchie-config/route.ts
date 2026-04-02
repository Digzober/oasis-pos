import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
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
})

const DEFAULT_CONFIG = {
  isEnabled: false,
  apiKey: '',
  dutchieLocationId: '',
  dutchieLocationName: '',
  syncEmployees: true,
  syncCustomers: true,
  syncProducts: true,
  syncInventory: true,
  syncRooms: true,
  lastSyncedEmployeesAt: null as string | null,
  lastSyncedCustomersAt: null as string | null,
  lastSyncedProductsAt: null as string | null,
  lastSyncedInventoryAt: null as string | null,
  lastSyncedRoomsAt: null as string | null,
  lastSyncedReferenceAt: null as string | null,
}

/** Mask API key: show last 4 chars as ****...xxxx */
function maskApiKey(key: string | null): string {
  if (!key || key.length < 4) return ''
  return '****...' + key.slice(-4)
}

/** Map DB row to frontend camelCase */
function dbRowToFrontend(row: Record<string, unknown>) {
  const rawKey = (row.api_key_encrypted as string) ?? ''
  return {
    isEnabled: row.is_enabled ?? DEFAULT_CONFIG.isEnabled,
    apiKey: maskApiKey(rawKey),
    dutchieLocationId: (row.dutchie_location_id as string) ?? '',
    dutchieLocationName: (row.dutchie_location_name as string) ?? '',
    syncEmployees: row.sync_employees ?? DEFAULT_CONFIG.syncEmployees,
    syncCustomers: row.sync_customers ?? DEFAULT_CONFIG.syncCustomers,
    syncProducts: row.sync_products ?? DEFAULT_CONFIG.syncProducts,
    syncInventory: row.sync_inventory ?? DEFAULT_CONFIG.syncInventory,
    syncRooms: row.sync_rooms ?? DEFAULT_CONFIG.syncRooms,
    lastSyncedEmployeesAt: (row.last_synced_employees_at as string) ?? null,
    lastSyncedCustomersAt: (row.last_synced_customers_at as string) ?? null,
    lastSyncedProductsAt: (row.last_synced_products_at as string) ?? null,
    lastSyncedInventoryAt: (row.last_synced_inventory_at as string) ?? null,
    lastSyncedRoomsAt: (row.last_synced_rooms_at as string) ?? null,
    lastSyncedReferenceAt: (row.last_synced_reference_at as string) ?? null,
  }
}

/** Map frontend camelCase to DB snake_case for upsert */
function frontendToDbRow(data: Record<string, unknown>, locationId: string) {
  const row: Record<string, unknown> = { location_id: locationId, updated_at: new Date().toISOString() }

  if (data.isEnabled !== undefined) row.is_enabled = data.isEnabled
  if (data.syncEmployees !== undefined) row.sync_employees = data.syncEmployees
  if (data.syncCustomers !== undefined) row.sync_customers = data.syncCustomers
  if (data.syncProducts !== undefined) row.sync_products = data.syncProducts
  if (data.syncInventory !== undefined) row.sync_inventory = data.syncInventory
  if (data.syncRooms !== undefined) row.sync_rooms = data.syncRooms

  // Only update API key if it's a real value (not the masked version)
  if (data.apiKey !== undefined && typeof data.apiKey === 'string' && !data.apiKey.startsWith('****')) {
    row.api_key_encrypted = data.apiKey
  }

  return row
}

export async function GET() {
  try {
    const session = await requireSession()
    const sb = await createSupabaseServerClient()

    const { data: config, error } = await (sb as any).from('dutchie_config')
      .select('*')
      .eq('location_id', session.locationId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      config: config ? dbRowToFrontend(config) : DEFAULT_CONFIG,
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
    const session = await requireSession()
    const sb = await createSupabaseServerClient()
    const body = await request.json()
    const parsed = UpdateDutchieConfigSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const dbRow = frontendToDbRow(parsed.data as Record<string, unknown>, session.locationId)

    const { data: config, error } = await (sb as any).from('dutchie_config')
      .upsert(dbRow, { onConflict: 'location_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    clearDutchieConfigCache(session.locationId)

    return NextResponse.json({ config: dbRowToFrontend(config) })
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
