import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AppError } from '@/lib/utils/errors'

export async function getLocationSettings(locationId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('location_settings').select('*').eq('location_id', locationId).maybeSingle()
  return data?.settings ?? {}
}

export async function updateLocationSettings(locationId: string, settings: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  const { data: existing } = await sb.from('location_settings').select('id, settings').eq('location_id', locationId).maybeSingle()

  if (existing) {
    const merged = { ...(existing.settings as Record<string, unknown> ?? {}), ...settings }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sb.from('location_settings').update({ settings: merged as any }).eq('id', existing.id)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb.from('location_settings') as any).insert({ location_id: locationId, settings })
  }
}

export async function getLocation(locationId: string) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('locations').select('*').eq('id', locationId).single()
  if (error || !data) throw new AppError('NOT_FOUND', 'Location not found', error, 404)
  return data
}

export async function updateLocation(locationId: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('locations').update(input).eq('id', locationId).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}

export async function listRegisters(locationId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('registers').select('*').eq('location_id', locationId).order('name')
  return data ?? []
}

export async function createRegister(input: { location_id: string; name: string; auto_print_receipts?: boolean }) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('registers').insert(input).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateRegister(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('registers').update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}

export async function deactivateRegister(id: string) {
  const sb = await createSupabaseServerClient()
  await sb.from('registers').update({ is_active: false }).eq('id', id)
}

export async function listRooms(locationId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('rooms').select('*, subrooms ( * )').eq('location_id', locationId).eq('is_active', true).order('name')
  return data ?? []
}

export async function createRoom(input: { location_id: string; name: string; room_types?: string[] }) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('rooms').insert(input).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateRoom(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('rooms').update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}

export async function createSubroom(input: { room_id: string; name: string }) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('subrooms').insert(input).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function listTaxRates(locationId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('tax_rates').select('*').eq('location_id', locationId).order('name')
  return data ?? []
}

export async function createTaxRate(input: { location_id: string; name: string; rate_percent: number; is_excise?: boolean; applies_to?: string; tax_category_id?: string | null }) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('tax_rates').insert(input).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateTaxRate(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  const { data, error } = await sb.from('tax_rates').update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}

export async function deactivateTaxRate(id: string) {
  const sb = await createSupabaseServerClient()
  await sb.from('tax_rates').update({ is_active: false }).eq('id', id)
}

export async function listFeesDonations(locationId: string) {
  const sb = await createSupabaseServerClient()
  const { data } = await sb.from('fees_donations').select('*').eq('location_id', locationId).order('name')
  return data ?? []
}

export async function createFeeDonation(input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('fees_donations') as any).insert(input).select().single()
  if (error) throw new AppError('CREATE_FAILED', error.message, error, 500)
  return data
}

export async function updateFeeDonation(id: string, input: Record<string, unknown>) {
  const sb = await createSupabaseServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('fees_donations') as any).update(input).eq('id', id).select().single()
  if (error) throw new AppError('UPDATE_FAILED', error.message, error, 500)
  return data
}
