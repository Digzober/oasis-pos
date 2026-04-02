import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { BioTrackConfig } from './types'

interface BioTrackConfigRow {
  id: string
  location_id: string
  is_enabled: boolean
  state_code: string
  xml_api_url: string | null
  rest_api_url: string | null
  username_encrypted: string | null
  password_encrypted: string | null
  ubi: string | null
  biotrack_location_id: string | null
  use_training_mode: boolean
  use_other_plant_material: boolean
  use_allotment_check: boolean
  report_discounted_prices: boolean
  enable_deliveries: boolean
  use_lab_data: boolean
  default_labs_in_receive: boolean
  display_approval_date: boolean
  schedule_returns_for_destruction: boolean
}

/**
 * Extended config that includes all per-location BioTrack settings.
 * The base BioTrackConfig feeds the client constructor.
 * This extended version carries the full settings for business logic decisions.
 */
export interface BioTrackLocationConfig extends BioTrackConfig {
  locationId: string
  isEnabled: boolean
  stateCode: string
  ubi: string
  biotrackLocationId: string
  useTrainingMode: boolean
  useAllotmentCheck: boolean
  reportDiscountedPrices: boolean
  enableDeliveries: boolean
  useLabData: boolean
  defaultLabsInReceive: boolean
  displayApprovalDate: boolean
  scheduleReturnsForDestruction: boolean
}

const configCache = new Map<string, { config: BioTrackLocationConfig; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Loads BioTrack config for a specific location from the biotrack_config table.
 * Falls back to environment variables if no DB config exists (backward compat).
 * Caches config for 5 minutes to avoid repeated DB queries during high-traffic checkout.
 */
export async function loadBioTrackConfig(locationId: string): Promise<BioTrackLocationConfig | null> {
  const cached = configCache.get(locationId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.config
  }

  try {
    const sb = await createSupabaseServerClient()
    const { data, error } = await sb
      .from('biotrack_config')
      .select('*')
      .eq('location_id', locationId)
      .single()

    if (error || !data) {
      logger.warn('No biotrack_config for location, falling back to env vars', { locationId })
      return buildConfigFromEnv(locationId)
    }

    const row = data as unknown as BioTrackConfigRow

    if (!row.is_enabled) {
      logger.info('BioTrack disabled for location', { locationId })
      return null
    }

    if (!row.rest_api_url || !row.username_encrypted || !row.password_encrypted) {
      logger.error('BioTrack config incomplete for location', {
        locationId,
        hasRestUrl: Boolean(row.rest_api_url),
        hasUsername: Boolean(row.username_encrypted),
        hasPassword: Boolean(row.password_encrypted),
      })
      return null
    }

    const config: BioTrackLocationConfig = {
      v1Url: row.xml_api_url ?? '',
      v3Url: row.rest_api_url,
      username: row.username_encrypted,
      password: row.password_encrypted,
      licenseNumber: row.ubi ?? '',
      locationId,
      isEnabled: row.is_enabled,
      stateCode: row.state_code,
      ubi: row.ubi ?? '',
      biotrackLocationId: row.biotrack_location_id ?? '',
      useTrainingMode: row.use_training_mode,
      useAllotmentCheck: row.use_allotment_check,
      reportDiscountedPrices: row.report_discounted_prices,
      enableDeliveries: row.enable_deliveries,
      useLabData: row.use_lab_data,
      defaultLabsInReceive: row.default_labs_in_receive,
      displayApprovalDate: row.display_approval_date,
      scheduleReturnsForDestruction: row.schedule_returns_for_destruction,
    }

    configCache.set(locationId, { config, expiresAt: Date.now() + CACHE_TTL_MS })
    return config
  } catch (err) {
    logger.error('Failed to load BioTrack config', { locationId, error: String(err) })
    return buildConfigFromEnv(locationId)
  }
}

/**
 * Backward compatibility: build config from environment variables.
 * Used when biotrack_config table has no row for this location.
 */
function buildConfigFromEnv(locationId: string): BioTrackLocationConfig | null {
  const v3Url = process.env.BIOTRACK_V3_URL
  const username = process.env.BIOTRACK_USERNAME
  const password = process.env.BIOTRACK_PASSWORD

  if (!v3Url || !username || !password) {
    logger.error('BioTrack env vars not set and no DB config found', { locationId })
    return null
  }

  return {
    v1Url: process.env.BIOTRACK_V1_URL ?? '',
    v3Url,
    username,
    password,
    licenseNumber: process.env.BIOTRACK_LICENSE_NUMBER ?? '',
    locationId,
    isEnabled: true,
    stateCode: 'NM',
    ubi: process.env.BIOTRACK_LICENSE_NUMBER ?? '',
    biotrackLocationId: process.env.BIOTRACK_LOCATION_ID ?? '',
    useTrainingMode: false,
    useAllotmentCheck: true,
    reportDiscountedPrices: false,
    enableDeliveries: false,
    useLabData: true,
    defaultLabsInReceive: true,
    displayApprovalDate: false,
    scheduleReturnsForDestruction: false,
  }
}

/**
 * Clears cached config for a location. Call when config is updated via backoffice.
 */
export function clearBioTrackConfigCache(locationId?: string): void {
  if (locationId) {
    configCache.delete(locationId)
  } else {
    configCache.clear()
  }
}

/**
 * Seeds the biotrack_config table for a location from current Dutchie BioTrack settings.
 * Used during migration to populate config from known values.
 */
export async function seedBioTrackConfig(params: {
  locationId: string
  xmlApiUrl: string
  restApiUrl: string
  username: string
  password: string
  ubi: string
  biotrackLocationId: string
  useTrainingMode?: boolean
  useAllotmentCheck?: boolean
  useLabData?: boolean
  defaultLabsInReceive?: boolean
}): Promise<void> {
  const sb = await createSupabaseServerClient()

  const { error } = await sb.from('biotrack_config').upsert({
    location_id: params.locationId,
    is_enabled: true,
    state_code: 'NM',
    xml_api_url: params.xmlApiUrl,
    rest_api_url: params.restApiUrl,
    username_encrypted: params.username,
    password_encrypted: params.password,
    ubi: params.ubi,
    biotrack_location_id: params.biotrackLocationId,
    use_training_mode: params.useTrainingMode ?? false,
    use_allotment_check: params.useAllotmentCheck ?? true,
    use_lab_data: params.useLabData ?? true,
    default_labs_in_receive: params.defaultLabsInReceive ?? true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any, { onConflict: 'location_id' })

  if (error) {
    logger.error('Failed to seed biotrack_config', { locationId: params.locationId, error: error.message })
    throw new Error(`Failed to seed biotrack_config: ${error.message}`)
  }

  clearBioTrackConfigCache(params.locationId)
  logger.info('BioTrack config seeded', { locationId: params.locationId })
}
