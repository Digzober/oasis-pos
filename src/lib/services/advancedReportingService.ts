import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/utils/money'

export async function getCOGSReport(filters: { date_from: string; date_to: string; location_id?: string; group_by?: string }) {
  const sb = await createSupabaseServerClient()

  let query = sb.from('transaction_lines')
    .select('product_id, product_name, category_name, quantity, unit_price, discount_amount, inventory_item_id, transactions!inner ( status, created_at, location_id )')
    .gte('transactions.created_at', `${filters.date_from}T00:00:00`)
    .lte('transactions.created_at', `${filters.date_to}T23:59:59`)
    .eq('transactions.status', 'completed')

  if (filters.location_id) query = query.eq('transactions.location_id', filters.location_id)

  const { data: lines } = await query

  // Load costs for inventory items
  const invIds = [...new Set((lines ?? []).map((l) => l.inventory_item_id).filter(Boolean))]
  const costMap = new Map<string, number>()
  if (invIds.length > 0) {
    const { data: invItems } = await sb.from('inventory_items').select('id, cost_per_unit').in('id', invIds as string[])
    for (const i of invItems ?? []) costMap.set(i.id, i.cost_per_unit ?? 0)
  }

  const groupKey = filters.group_by ?? 'product'
  const groups = new Map<string, { name: string; revenue: number; cogs: number; units: number }>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const line of (lines ?? []) as any[]) {
    const key = groupKey === 'category' ? (line.category_name ?? 'Uncategorized') : (line.product_name ?? 'Unknown')
    const entry = groups.get(key) ?? { name: key, revenue: 0, cogs: 0, units: 0 }
    const lineRevenue = roundMoney((line.unit_price - (line.discount_amount ?? 0)) * line.quantity)
    const lineCost = roundMoney((costMap.get(line.inventory_item_id) ?? 0) * line.quantity)
    entry.revenue = roundMoney(entry.revenue + lineRevenue)
    entry.cogs = roundMoney(entry.cogs + lineCost)
    entry.units += line.quantity
    groups.set(key, entry)
  }

  const items = Array.from(groups.values()).map((g) => ({
    name: g.name, revenue: g.revenue, cogs: g.cogs, units: g.units,
    gross_profit: roundMoney(g.revenue - g.cogs),
    margin: g.revenue > 0 ? roundMoney((g.revenue - g.cogs) / g.revenue * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = items.reduce((s, i) => roundMoney(s + i.revenue), 0)
  const totalCogs = items.reduce((s, i) => roundMoney(s + i.cogs), 0)

  return {
    items,
    summary: {
      total_revenue: totalRevenue,
      total_cogs: totalCogs,
      total_profit: roundMoney(totalRevenue - totalCogs),
      avg_margin: totalRevenue > 0 ? roundMoney((totalRevenue - totalCogs) / totalRevenue * 100) : 0,
    },
  }
}

export async function getShrinkageReport(filters: { date_from: string; date_to: string; location_id?: string }) {
  const sb = await createSupabaseServerClient()

  let query = sb.from('audit_log').select('entity_id, metadata, created_at')
    .eq('entity_type', 'inventory_item').eq('event_type', 'adjust')
    .gte('created_at', `${filters.date_from}T00:00:00`)
    .lte('created_at', `${filters.date_to}T23:59:59`)

  if (filters.location_id) query = query.eq('location_id', filters.location_id)

  const { data } = await query

  const byReason = new Map<string, { units: number; value: number; count: number }>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const entry of (data ?? []) as any[]) {
    const meta = entry.metadata ?? {}
    const delta = meta.delta ?? 0
    if (delta >= 0) continue // Only negative adjustments = shrinkage
    const reason = meta.adjustment_type ?? 'unknown'
    const r = byReason.get(reason) ?? { units: 0, value: 0, count: 0 }
    r.units += Math.abs(delta)
    r.count++
    byReason.set(reason, r)
  }

  return {
    items: Array.from(byReason.entries()).map(([reason, v]) => ({ reason, units_lost: v.units, count: v.count })),
    total_units_lost: Array.from(byReason.values()).reduce((s, v) => s + v.units, 0),
  }
}

export async function getExpiringInventoryReport(locationId: string | null, windowDays: number) {
  const sb = await createSupabaseServerClient()
  const cutoff = new Date(Date.now() + windowDays * 86400000).toISOString().split('T')[0]!

  let query = sb.from('inventory_items').select('id, biotrack_barcode, quantity, expiration_date, products ( name )').eq('is_active', true).gt('quantity', 0).lte('expiration_date', cutoff).gte('expiration_date', new Date().toISOString().split('T')[0]!)
  if (locationId) query = query.eq('location_id', locationId)

  const { data } = await query.order('expiration_date')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((i: any) => ({
    id: i.id, product_name: i.products?.name ?? '', barcode: i.biotrack_barcode,
    quantity: i.quantity, expiration_date: i.expiration_date,
    days_until_expiry: Math.ceil((new Date(i.expiration_date).getTime() - Date.now()) / 86400000),
  }))
}

export async function getLowStockReport(locationId: string | null) {
  const sb = await createSupabaseServerClient()

  let query = sb.from('inventory_items').select('id, product_id, quantity, quantity_reserved, products ( name, sku )').eq('is_active', true)
  if (locationId) query = query.eq('location_id', locationId)

  const { data } = await query

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).filter((i: any) => (i.quantity - (i.quantity_reserved ?? 0)) <= 5).map((i: any) => ({
    id: i.id, product_name: i.products?.name ?? '', sku: i.products?.sku ?? '',
    quantity: i.quantity, reserved: i.quantity_reserved ?? 0, available: i.quantity - (i.quantity_reserved ?? 0),
  }))
}

export async function getInventoryValuationReport(locationId: string | null) {
  const sb = await createSupabaseServerClient()

  let query = sb.from('inventory_items').select('quantity, cost_per_unit, products ( rec_price )').eq('is_active', true).gt('quantity', 0)
  if (locationId) query = query.eq('location_id', locationId)

  const { data } = await query

  let totalCost = 0, totalRetail = 0, totalUnits = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const i of (data ?? []) as any[]) {
    totalUnits += i.quantity
    totalCost = roundMoney(totalCost + (i.cost_per_unit ?? 0) * i.quantity)
    totalRetail = roundMoney(totalRetail + (i.products?.rec_price ?? 0) * i.quantity)
  }

  return {
    total_units: totalUnits,
    total_cost_value: totalCost,
    total_retail_value: totalRetail,
    potential_margin: totalRetail > 0 ? roundMoney((totalRetail - totalCost) / totalRetail * 100) : 0,
  }
}
