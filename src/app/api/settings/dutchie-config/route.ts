import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireDutchieManager } from '@/lib/auth/dutchie'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { clearDutchieConfigCache } from '@/lib/dutchie/configLoader'
import {
  persistDutchieDualWrite,
  type DutchieLoyaltyState,
} from '@/lib/dutchie/configPersistence'
import { maskStoredSecret, prepareSecretForWrite } from '@/lib/security/settingsSecrets.server'
import { AppError } from '@/lib/utils/errors'
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

/** Map DB row to frontend camelCase */
export function dbRowToFrontend(row: Record<string, unknown>, loyaltyState?: Record<string, unknown> | null) {
  const storedKey = (row.api_key_encrypted as string) ?? ''
  return {
    isEnabled: row.is_enabled ?? DEFAULT_CONFIG.isEnabled,
    hasApiKey: storedKey.length > 0,
    apiKeyTail: maskStoredSecret(storedKey),
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
export function frontendToDbRow(
  data: Record<string, unknown>,
  locationId: string,
  existing: Record<string, unknown> | null = null,
) {
  const row: Record<string, unknown> = { location_id: locationId, updated_at: new Date().toISOString() }

  if (data.isEnabled !== undefined) row.is_enabled = data.isEnabled
  if (data.syncEmployees !== undefined) row.sync_employees = data.syncEmployees
  if (data.syncCustomers !== undefined) row.sync_customers = data.syncCustomers
  if (data.syncProducts !== undefined) row.sync_products = data.syncProducts
  if (data.syncInventory !== undefined) row.sync_inventory = data.syncInventory
  if (data.syncRooms !== undefined) row.sync_rooms = data.syncRooms
  if (data.syncTransactions !== undefined) row.sync_transactions = data.syncTransactions
  if (data.syncLoyalty !== undefined) row.sync_loyalty = data.syncLoyalty

  const apiKey = prepareSecretForWrite(
    data.apiKey as string | undefined,
    existing?.api_key_encrypted as string | null,
  )
  if (apiKey) row.api_key_encrypted = apiKey

  return row
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
type DutchieUpdate = z.infer<typeof UpdateDutchieConfigSchema>

function toLoyaltyState(row: Record<string, unknown> | null): DutchieLoyaltyState {
  return {
    is_enabled: (row?.is_enabled as boolean | undefined) ?? true,
    last_synced_at: (row?.last_synced_at as string | null | undefined) ?? null,
    designated_location_id: (row?.designated_location_id as string | null | undefined) ?? null,
  }
}

async function readOrganizationLoyaltyState(
  sb: SupabaseServerClient,
  organizationId: string,
) {
  const result = await (sb as any).from('dutchie_sync_state')
    .select('is_enabled, last_synced_at, designated_location_id')
    .eq('organization_id', organizationId).eq('entity_type', 'loyalty')
    .is('location_id', null).maybeSingle()
  if (result.error) {
    throw new AppError('DUTCHIE_STATE_READ_FAILED', result.error.message, result.error, 500)
  }
  return toLoyaltyState(result.data)
}

async function writeOrganizationLoyaltyState(
  sb: SupabaseServerClient,
  organizationId: string,
  input: DutchieUpdate,
) {
  const existing = await (sb as any).from('dutchie_sync_state')
    .select('id').eq('organization_id', organizationId).eq('entity_type', 'loyalty')
    .is('location_id', null).maybeSingle()
  if (existing.error) {
    throw new AppError('DUTCHIE_STATE_READ_FAILED', existing.error.message, existing.error, 500)
  }
  const patch = buildLoyaltyStatePatch(organizationId, input)
  const result = existing.data?.id
    ? await (sb as any).from('dutchie_sync_state').update(patch).eq('id', existing.data.id).select().single()
    : await (sb as any).from('dutchie_sync_state').insert(patch).select().single()
  if (result.error) {
    throw new AppError('DUTCHIE_STATE_WRITE_FAILED', result.error.message, result.error, 500)
  }
  return toLoyaltyState(result.data)
}

function buildLoyaltyStatePatch(organizationId: string, input: DutchieUpdate) {
  return {
    organization_id: organizationId,
    location_id: null,
    entity_type: 'loyalty',
    ...(input.syncLoyalty !== undefined ? { is_enabled: input.syncLoyalty } : {}),
    ...(input.designatedLoyaltyLocationId !== undefined
      ? { designated_location_id: input.designatedLoyaltyLocationId }
      : {}),
    updated_at: new Date().toISOString(),
  }
}

async function validateDesignatedLocation(
  sb: SupabaseServerClient,
  organizationId: string,
  locationId: string | null | undefined,
) {
  if (!locationId) return
  const { data, error } = await sb.from('locations').select('id')
    .eq('id', locationId).eq('organization_id', organizationId).maybeSingle()
  if (error) throw new AppError('LOCATION_LOOKUP_FAILED', error.message, error, 500)
  if (!data) throw new AppError('LOCATION_NOT_FOUND', 'Designated location not found', undefined, 404)
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
    if (loyaltyResult.error) {
      return NextResponse.json({ error: loyaltyResult.error.message }, { status: 500 })
    }
    if (locationsResult.error) {
      return NextResponse.json({ error: locationsResult.error.message }, { status: 500 })
    }

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

    const existingResult = await (sb as any).from('dutchie_config')
      .select('api_key_encrypted')
      .eq('location_id', session.locationId)
      .maybeSingle()
    if (existingResult.error) {
      return NextResponse.json({ error: existingResult.error.message }, { status: 500 })
    }
    await validateDesignatedLocation(
      sb,
      session.organizationId,
      parsed.data.designatedLoyaltyLocationId,
    )
    const hasLoyaltyPatch = parsed.data.syncLoyalty !== undefined
      || parsed.data.designatedLoyaltyLocationId !== undefined
    const baseRow = frontendToDbRow(
      parsed.data as Record<string, unknown>,
      session.locationId,
      existingResult.data,
    )
    const { config, loyaltyState } = await persistDutchieDualWrite({
      readOrganizationState: () => readOrganizationLoyaltyState(sb, session.organizationId),
      writeOrganizationState: hasLoyaltyPatch
        ? () => writeOrganizationLoyaltyState(sb, session.organizationId, parsed.data)
        : undefined,
      writeLocationConfig: async (loyaltyEnabled) => {
        const dbRow = { ...baseRow, sync_loyalty: loyaltyEnabled }
        const result = await (sb as any).from('dutchie_config')
          .upsert(dbRow, { onConflict: 'location_id' }).select().single()
        if (result.error) {
          throw new AppError('DUTCHIE_CONFIG_WRITE_FAILED', result.error.message, result.error, 500)
        }
        return result.data as Record<string, unknown>
      },
      reconcileLocationLoyalty: async (loyaltyEnabled) => {
        const result = await (sb as any).from('dutchie_config')
          .update({ sync_loyalty: loyaltyEnabled, updated_at: new Date().toISOString() })
          .eq('location_id', session.locationId)
        if (result.error) {
          throw new AppError('DUTCHIE_RECONCILE_FAILED', result.error.message, result.error, 500)
        }
      },
    })

    clearDutchieConfigCache(session.locationId)

    return NextResponse.json({
      config: dbRowToFrontend(config, loyaltyState as unknown as Record<string, unknown>),
    })
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
