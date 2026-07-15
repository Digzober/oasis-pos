import type { SessionPayload } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

export interface AccessibleLocation {
  id: string
  name: string
  city: string
  state: string
}

export async function listAccessibleLocations(
  session: SessionPayload,
): Promise<AccessibleLocation[]> {
  const sb = await createSupabaseServerClient()
  let allowedIds: string[] | undefined

  if (session.role !== 'admin' && session.role !== 'owner') {
    const { data, error } = await sb.from('employee_locations')
      .select('location_id').eq('employee_id', session.employeeId)
    if (error) throw new AppError('LOCATION_ACCESS_FAILED', error.message, error, 500)
    allowedIds = (data ?? []).map((assignment) => assignment.location_id)
    if (allowedIds.length === 0) return []
  }

  let query = sb.from('locations').select('id, name, city, state')
    .eq('organization_id', session.organizationId).eq('is_active', true)
  if (allowedIds) query = query.in('id', allowedIds)
  const { data, error } = await query.order('name')
  if (error) throw new AppError('LOCATION_ACCESS_FAILED', error.message, error, 500)
  return data ?? []
}

export async function requireAccessibleLocation(
  session: SessionPayload,
  requestedLocationId: string,
): Promise<AccessibleLocation> {
  const locations = await listAccessibleLocations(session)
  const location = locations.find(({ id }) => id === requestedLocationId)
  if (!location) throw new AppError('LOCATION_NOT_FOUND', 'Location not found', undefined, 404)
  return location
}
