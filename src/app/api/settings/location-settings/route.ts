import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { requireSession } from '@/lib/auth/session'
import { listAccessibleLocations, requireAccessibleLocation } from '@/lib/settings/access'
import { CanonicalSettingPathSchema, DEFAULT_SETTINGS } from '@/lib/settings/schema'
import {
  getEffectiveSettings,
  getSettingsSnapshot,
  patchLocationSettings,
  patchOrganizationSettings,
  removeLocationSetting,
  removeOrganizationSetting,
} from '@/lib/settings/service'
import { logger } from '@/lib/utils/logger'

const PatchRequestSchema = z.object({
  scope: z.enum(['organization', 'location']),
  location_id: z.uuid().optional(),
  patch: z.unknown().optional(),
  remove: CanonicalSettingPathSchema.optional(),
}).strict().refine((value) => (value.patch === undefined) !== (value.remove === undefined), {
  message: 'Provide exactly one of patch or remove',
})

function errorResponse(err: unknown, operation: string) {
  if (err && typeof err === 'object' && 'code' in err) {
    const appErr = err as { code: string; message: string; statusCode?: number }
    const message = appErr.code === 'UNAUTHORIZED' ? 'Authentication required' : appErr.message
    return NextResponse.json({ error: message }, { status: appErr.statusCode ?? 500 })
  }
  logger.error(`Settings ${operation} error`, { error: String(err) })
  return NextResponse.json({ error: 'Server error' }, { status: 500 })
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const locations = await listAccessibleLocations(session)
    const requestedId = request.nextUrl.searchParams.get('location_id') ?? session.locationId
    const selected = locations.find(({ id }) => id === requestedId) ?? locations[0]
    if (!selected) return NextResponse.json({ error: 'No accessible locations' }, { status: 404 })
    if (request.nextUrl.searchParams.has('location_id') && selected.id !== requestedId) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }
    const [snapshot, effective] = await Promise.all([
      getSettingsSnapshot(selected.id),
      getEffectiveSettings(selected.id),
    ])
    return NextResponse.json({
      defaults: DEFAULT_SETTINGS,
      effective,
      organization: snapshot.organization,
      location: snapshot.location,
      locations,
      selected_location_id: selected.id,
    })
  } catch (err) {
    return errorResponse(err, 'get')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const parsed = PatchRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }
    const { scope, patch, remove } = parsed.data
    if (scope === 'organization') {
      const settings = remove
        ? await removeOrganizationSetting(session.organizationId, remove)
        : await patchOrganizationSettings(session.organizationId, patch)
      return NextResponse.json({ settings })
    }
    const locationId = parsed.data.location_id ?? session.locationId
    await requireAccessibleLocation(session, locationId)
    const settings = remove
      ? await removeLocationSetting(locationId, remove)
      : await patchLocationSettings(locationId, patch)
    return NextResponse.json({ settings })
  } catch (err) {
    return errorResponse(err, 'update')
  }
}
