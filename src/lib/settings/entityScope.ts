import type { SessionPayload } from '@/lib/auth/session'
import { requireAccessibleLocation } from '@/lib/settings/access'

type LocationInput = { location_id?: string }

export async function withAccessibleLocation<T extends LocationInput>(
  session: SessionPayload,
  input: T,
): Promise<Omit<T, 'location_id'> & { location_id: string }> {
  const requestedLocationId = input.location_id ?? session.locationId
  const location = await requireAccessibleLocation(session, requestedLocationId)
  return { ...input, location_id: location.id }
}
