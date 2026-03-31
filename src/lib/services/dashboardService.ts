import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/utils/money'

export interface DashboardKPIs {
  transactions: number
  gross_sales: number
  net_sales: number
  total_discounts: number
  total_tax: number
  total_revenue: number
  customer_count: number
  average_cart: number
  products_sold: number
  total_returns: number
  total_voids: number
  new_customers: number
  pending_online_orders: number
  pending_transfers: number
  open_drawers: number
  low_stock_count: number
}

export async function getDashboardKPIs(locationId: string | null, date: string): Promise<DashboardKPIs> {
  const sb = await createSupabaseServerClient()
  const dateFrom = `${date}T00:00:00`
  const dateTo = `${date}T23:59:59`

  let txQuery = sb.from('transactions').select('id, transaction_type, status, subtotal, discount_amount, tax_amount, total, customer_id, is_medical, transaction_lines ( quantity )').gte('created_at', dateFrom).lte('created_at', dateTo)
  if (locationId) txQuery = txQuery.eq('location_id', locationId)

  const { data: txns } = await txQuery

  let grossSales = 0, netSales = 0, totalDisc = 0, totalTax = 0, totalReturns = 0, totalVoids = 0, productsSold = 0, saleCount = 0
  const customers = new Set<string>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const tx of (txns ?? []) as any[]) {
    if (tx.status === 'voided') { totalVoids = roundMoney(totalVoids + Math.abs(tx.total)); continue }
    if (tx.transaction_type === 'return') { totalReturns = roundMoney(totalReturns + Math.abs(tx.total)); continue }
    grossSales = roundMoney(grossSales + tx.subtotal)
    totalDisc = roundMoney(totalDisc + tx.discount_amount)
    totalTax = roundMoney(totalTax + tx.tax_amount)
    saleCount++
    if (tx.customer_id) customers.add(tx.customer_id)
    for (const line of tx.transaction_lines ?? []) productsSold += line.quantity
  }

  netSales = roundMoney(grossSales - totalDisc - totalReturns)
  const avgCart = saleCount > 0 ? roundMoney(netSales / saleCount) : 0

  // Counts
  let onlineQuery = sb.from('online_orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'confirmed'])
  if (locationId) onlineQuery = onlineQuery.eq('location_id', locationId)
  const { count: pendingOnline } = await onlineQuery

  let drawerQuery = sb.from('cash_drawers').select('id', { count: 'exact', head: true }).eq('status', 'open')
  if (locationId) drawerQuery = drawerQuery.eq('location_id', locationId)
  const { count: openDrawers } = await drawerQuery

  let lowStockQuery = sb.from('inventory_items').select('id', { count: 'exact', head: true }).eq('is_active', true).lte('quantity', 5).gt('quantity', 0)
  if (locationId) lowStockQuery = lowStockQuery.eq('location_id', locationId)
  const { count: lowStock } = await lowStockQuery

  return {
    transactions: saleCount, gross_sales: grossSales, net_sales: netSales,
    total_discounts: totalDisc, total_tax: totalTax, total_revenue: roundMoney(netSales + totalTax),
    customer_count: customers.size, average_cart: avgCart, products_sold: productsSold,
    total_returns: totalReturns, total_voids: totalVoids, new_customers: 0,
    pending_online_orders: pendingOnline ?? 0, pending_transfers: 0,
    open_drawers: openDrawers ?? 0, low_stock_count: lowStock ?? 0,
  }
}

export async function getSalesByHour(locationId: string | null, date: string) {
  const sb = await createSupabaseServerClient()
  const dateFrom = `${date}T00:00:00`
  const dateTo = `${date}T23:59:59`

  let query = sb.from('transactions').select('total, created_at').eq('status', 'completed').neq('transaction_type', 'return').gte('created_at', dateFrom).lte('created_at', dateTo)
  if (locationId) query = query.eq('location_id', locationId)

  const { data: txns } = await query

  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, sales: 0, transactions: 0 }))
  for (const tx of txns ?? []) {
    const h = new Date(tx.created_at).getHours()
    hours[h]!.sales = roundMoney(hours[h]!.sales + tx.total)
    hours[h]!.transactions++
  }
  return hours
}

export async function getTopProducts(locationId: string | null, date: string, limit = 10) {
  const sb = await createSupabaseServerClient()
  const dateFrom = `${date}T00:00:00`
  const dateTo = `${date}T23:59:59`

  let query = sb.from('transaction_lines').select('product_name, quantity, line_total, transactions!inner ( status, created_at, location_id )').eq('transactions.status', 'completed').gte('transactions.created_at', dateFrom).lte('transactions.created_at', dateTo)
  if (locationId) query = query.eq('transactions.location_id', locationId)

  const { data: lines } = await query

  const map = new Map<string, { quantity: number; revenue: number }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (lines ?? []) as any[]) {
    const e = map.get(l.product_name) ?? { quantity: 0, revenue: 0 }
    e.quantity += l.quantity
    e.revenue = roundMoney(e.revenue + l.line_total)
    map.set(l.product_name, e)
  }

  return Array.from(map.entries())
    .map(([product_name, v]) => ({ product_name, quantity_sold: v.quantity, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export async function getPaymentBreakdown(locationId: string | null, date: string) {
  const sb = await createSupabaseServerClient()
  const dateFrom = `${date}T00:00:00`
  const dateTo = `${date}T23:59:59`

  let query = sb.from('transaction_payments').select('payment_method, amount, transactions!inner ( status, created_at, location_id )').eq('transactions.status', 'completed').gte('transactions.created_at', dateFrom).lte('transactions.created_at', dateTo)
  if (locationId) query = query.eq('transactions.location_id', locationId)

  const { data: payments } = await query

  const map = new Map<string, { total: number; count: number }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (payments ?? []) as any[]) {
    const e = map.get(p.payment_method) ?? { total: 0, count: 0 }
    e.total = roundMoney(e.total + p.amount)
    e.count++
    map.set(p.payment_method, e)
  }

  return Array.from(map.entries())
    .map(([method, v]) => ({ method, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total)
}
