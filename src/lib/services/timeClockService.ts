import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

export async function clockIn(employeeId: string, locationId: string) {
  const sb = await createSupabaseServerClient()

  // Check no active entry
  const { data: active } = await sb.from('time_clock_entries').select('id').eq('employee_id', employeeId).is('clock_out', null).maybeSingle()
  if (active) throw new AppError('ALREADY_CLOCKED_IN', 'Employee is already clocked in', undefined, 400)

  const { data: loc } = await sb.from('locations').select('organization_id').eq('id', locationId).single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('time_clock_entries') as any).insert({
    employee_id: employeeId,
    location_id: locationId,
    clock_in: new Date().toISOString(),
  }).select().single()

  if (error) throw new AppError('CLOCK_IN_FAILED', error.message, error, 500)
  return data
}

export async function clockOut(entryId: string, notes: string | null) {
  const sb = await createSupabaseServerClient()

  const { data: entry } = await sb.from('time_clock_entries').select('clock_in').eq('id', entryId).single()
  if (!entry) throw new AppError('NOT_FOUND', 'Time clock entry not found', undefined, 404)

  const clockOut = new Date()
  const clockIn = new Date(entry.clock_in)
  const hoursWorked = Math.round(((clockOut.getTime() - clockIn.getTime()) / 3600000) * 100) / 100

  const { data, error } = await sb.from('time_clock_entries')
    .update({ clock_out: clockOut.toISOString(), total_hours: hoursWorked, notes })
    .eq('id', entryId).select().single()

  if (error) throw new AppError('CLOCK_OUT_FAILED', error.message, error, 500)
  return data
}

export async function getActiveClockEntry(employeeId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('time_clock_entries').select('*').eq('employee_id', employeeId).is('clock_out', null).maybeSingle()
  return data
}

export async function getTimeClockHistory(filters: { location_id?: string; employee_id?: string; date_from?: string; date_to?: string; page?: number; per_page?: number }) {
  const sb = await createSupabaseServerClient()
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? 50

  let query = sb.from('time_clock_entries').select('*, employees ( first_name, last_name )', { count: 'exact' })
  if (filters.location_id) query = query.eq('location_id', filters.location_id)
  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.date_from) query = query.gte('clock_in', `${filters.date_from}T00:00:00`)
  if (filters.date_to) query = query.lte('clock_in', `${filters.date_to}T23:59:59`)

  const { data, count, error } = await query.order('clock_in', { ascending: false }).range((page - 1) * perPage, page * perPage - 1)
  if (error) return { entries: [], total: 0 }
  return { entries: data ?? [], total: count ?? 0 }
}
