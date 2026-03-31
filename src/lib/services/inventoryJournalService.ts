import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getInventoryJournal(filters: {
  location_id?: string; event_type?: string; date_from?: string; date_to?: string; page?: number; per_page?: number
}) {
  const sb = await createSupabaseServerClient()
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? 50

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = sb.from('audit_log').select('*, employees ( first_name, last_name )', { count: 'exact' }).eq('entity_type', 'inventory_item')

  if (filters.location_id) query = query.eq('location_id', filters.location_id)
  if (filters.event_type) query = query.eq('event_type', filters.event_type)
  if (filters.date_from) query = query.gte('created_at', `${filters.date_from}T00:00:00`)
  if (filters.date_to) query = query.lte('created_at', `${filters.date_to}T23:59:59`)

  const { data, count } = await query.order('created_at', { ascending: false }).range((page - 1) * perPage, page * perPage - 1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = (data ?? []).map((entry: any) => {
    const meta = (entry.metadata ?? {}) as Record<string, unknown>
    const emp = entry.employees
    return {
      id: entry.id,
      timestamp: entry.created_at,
      action: entry.event_type,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
      entity_id: entry.entity_id,
      delta: meta.delta ?? (meta.quantity ?? null),
      previous_quantity: meta.previous_quantity ?? null,
      new_quantity: meta.new_quantity ?? null,
      reason: meta.adjustment_type ?? meta.reason ?? null,
      notes: meta.notes ?? meta.discrepancy_reason ?? null,
    }
  })

  return { entries, total: count ?? 0 }
}
