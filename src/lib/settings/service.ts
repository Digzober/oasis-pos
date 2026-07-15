import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'
import type { Json } from '@/types/database'
import {
  CanonicalSettingPathSchema,
  CanonicalSettingsSchema,
  DEFAULT_SETTINGS,
  LocationSettingsOverrideSchema,
  OrganizationSettingsOverrideSchema,
  pickCanonicalOverride,
  type EffectiveSettings,
  type LocationSettingsOverride,
  type OrganizationSettingsOverride,
} from './schema'

interface CacheEntry {
  settings: EffectiveSettings
  fetchedAt: number
}

const CACHE_TTL_MS = 60_000
const effectiveCache = new Map<string, CacheEntry>()

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge(
  target: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...target }
  for (const [key, value] of Object.entries(override)) {
    const current = merged[key]
    merged[key] = isObject(current) && isObject(value) ? deepMerge(current, value) : value
  }
  return merged
}

function parseLocationOverride(value: Json | undefined): LocationSettingsOverride {
  const knownEntries = isObject(value)
    ? Object.entries(value).filter(([key]) => Object.hasOwn(LocationSettingsOverrideSchema.shape, key))
    : []
  const parsed = LocationSettingsOverrideSchema.safeParse(Object.fromEntries(knownEntries))
  if (!parsed.success) throw new AppError('INVALID_SETTINGS', 'Stored location settings are invalid', parsed.error, 500)
  return parsed.data
}

function parseOrganizationOverride(value: Json | undefined): OrganizationSettingsOverride {
  const parsed = OrganizationSettingsOverrideSchema.safeParse(value ?? {})
  if (!parsed.success) throw new AppError('INVALID_SETTINGS', 'Stored organization settings are invalid', parsed.error, 500)
  return parsed.data
}

export async function getSettingsSnapshot(locationId: string) {
  const sb = await createSupabaseServerClient()
  const { data: location, error: locationError } = await sb.from('locations')
    .select('organization_id').eq('id', locationId).single()
  if (locationError || !location) {
    throw new AppError('LOCATION_NOT_FOUND', 'Location not found', locationError, 404)
  }
  const [locationResult, organizationResult] = await Promise.all([
    sb.from('location_settings').select('settings').eq('location_id', locationId).maybeSingle(),
    sb.from('organization_settings').select('settings').eq('organization_id', location.organization_id).maybeSingle(),
  ])
  if (locationResult.error) throw new AppError('SETTINGS_LOAD_FAILED', locationResult.error.message, locationResult.error, 500)
  if (organizationResult.error) throw new AppError('SETTINGS_LOAD_FAILED', organizationResult.error.message, organizationResult.error, 500)
  return {
    organizationId: location.organization_id,
    organization: parseOrganizationOverride(organizationResult.data?.settings),
    location: parseLocationOverride(locationResult.data?.settings),
  }
}

export async function getEffectiveSettings(locationId: string): Promise<EffectiveSettings> {
  const cached = effectiveCache.get(locationId)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.settings
  const snapshot = await getSettingsSnapshot(locationId)
  const organizationMerged = deepMerge(DEFAULT_SETTINGS, snapshot.organization)
  const effective = CanonicalSettingsSchema.parse(
    deepMerge(organizationMerged, pickCanonicalOverride(snapshot.location)),
  )
  effectiveCache.set(locationId, { settings: effective, fetchedAt: Date.now() })
  return effective
}

export function clearEffectiveSettingsCache(locationId?: string): void {
  if (locationId) effectiveCache.delete(locationId)
  else effectiveCache.clear()
}

export async function patchLocationSettings(locationId: string, patch: unknown) {
  const parsed = LocationSettingsOverrideSchema.safeParse(patch)
  if (!parsed.success) throw new AppError('INVALID_SETTINGS_PATCH', 'Invalid settings patch', parsed.error, 400)
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.rpc('patch_location_settings', {
    p_location_id: locationId,
    p_patch: parsed.data as Json,
  })
  if (error) throw new AppError('SETTINGS_UPDATE_FAILED', error.message, error, 500)
  clearEffectiveSettingsCache(locationId)
  return parseLocationOverride(data as Json)
}

export async function patchOrganizationSettings(organizationId: string, patch: unknown) {
  const parsed = OrganizationSettingsOverrideSchema.safeParse(patch)
  if (!parsed.success) throw new AppError('INVALID_SETTINGS_PATCH', 'Invalid settings patch', parsed.error, 400)
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.rpc('patch_organization_settings', {
    p_organization_id: organizationId,
    p_patch: parsed.data as Json,
  })
  if (error) throw new AppError('SETTINGS_UPDATE_FAILED', error.message, error, 500)
  clearEffectiveSettingsCache()
  return parseOrganizationOverride(data as Json)
}

function buildSettingsRemovalPatch(path: string): Record<string, unknown> {
  return path.split('.').reduceRight<Record<string, unknown>>(
    (patch, key) => ({ [key]: Object.keys(patch).length === 0 ? null : patch }),
    {},
  )
}

function parseRemovalPath(path: string) {
  const parsed = CanonicalSettingPathSchema.safeParse(path)
  if (!parsed.success) {
    throw new AppError('INVALID_SETTINGS_PATH', 'Invalid settings path', parsed.error, 400)
  }
  return buildSettingsRemovalPatch(parsed.data) as Json
}

export async function removeLocationSetting(locationId: string, path: string) {
  const patch = parseRemovalPath(path)
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.rpc('patch_location_settings', {
    p_location_id: locationId,
    p_patch: patch,
  })
  if (error) throw new AppError('SETTINGS_UPDATE_FAILED', error.message, error, 500)
  clearEffectiveSettingsCache(locationId)
  return parseLocationOverride(data as Json)
}

export async function removeOrganizationSetting(organizationId: string, path: string) {
  const patch = parseRemovalPath(path)
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.rpc('patch_organization_settings', {
    p_organization_id: organizationId,
    p_patch: patch,
  })
  if (error) throw new AppError('SETTINGS_UPDATE_FAILED', error.message, error, 500)
  clearEffectiveSettingsCache()
  return parseOrganizationOverride(data as Json)
}
