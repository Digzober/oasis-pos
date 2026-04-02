import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getInventoryJournal(filters: {
  location_id?: string; event_type?: string; date_from?: string; date_to?: string; search?: string; page?: number; per_page?: number
}) {
  const sb = await createSupabaseServerClient()
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? 50

  // When searching, we need to find inventory_items matching the search term,
  // then filter audit_log entries by those entity_ids
  let entityIds: string[] | null = null

  if (filters.search) {
    const searchTerm = filters.search.trim()
    const { data: matchedItems } = await sb
      .from('inventory_items')
      .select('id, products ( sku )')
      .or(`biotrack_barcode.ilike.%${searchTerm}%,batch_id.ilike.%${searchTerm}%`)

    // Also search by product SKU
    const { data: skuItems } = await sb
      .from('inventory_items')
      .select('id, products!inner ( sku )')
      .ilike('products.sku', `%${searchTerm}%`)

    const ids = new Set<string>()
    if (matchedItems) matchedItems.forEach(item => ids.add(item.id))
    if (skuItems) skuItems.forEach(item => ids.add(item.id))

    entityIds = [...ids]
    if (entityIds.length === 0) {
      return { entries: [], total: 0 }
    }
  }

  let query = sb.from('audit_log').select('*, employees ( first_name, last_name )', { count: 'exact' }).eq('entity_type', 'inventory_item')

  if (filters.location_id) query = query.eq('location_id', filters.location_id)
  if (filters.event_type) query = query.eq('event_type', filters.event_type)
  if (filters.date_from) query = query.gte('created_at', `${filters.date_from}T00:00:00`)
  if (filters.date_to) query = query.lte('created_at', `${filters.date_to}T23:59:59`)
  if (entityIds) query = query.in('entity_id', entityIds)

  const { data, count } = await query.order('created_at', { ascending: false }).range((page - 1) * perPage, page * perPage - 1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = (data ?? []).map((entry: any) => {
    const meta = (entry.metadata ?? {}) as Record<string, unknown>
    const emp = entry.employees
    return {
      id: entry.id,
      timestamp: entry.created_at,
      action: entry.event_type,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '\u2014',
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
