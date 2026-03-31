import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

export async function listEvents(orgId: string, filters?: { location_id?: string; status?: string }) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('events') as any).select('*').eq('organization_id', orgId)
  if (filters?.location_id) query = query.eq('location_id', filters.location_id)
  if (filters?.status) query = query.eq('status', filters.status)
  const { data } = await query.order('start_date', { ascending: true })
  return data ?? []
}

export async function createEvent(input: Record<string, unknown>) {
  if (input.end_date && input.start_date && new Date(input.end_date as string) < new Date(input.start_date as string)) {
    throw new AppError('INVALID_DATES', 'End date must be after start date', undefined, 400)
  }
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('events') as any).insert({ ...input, status: 'upcoming' }).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateEvent(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('events') as any).update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}
