import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/utils/money'

export interface RegisterStatus {
  register_id: string; register_name: string; drawer_status: 'open' | 'closed' | 'no_drawer'
  opened_by: string | null; opened_at: string | null; current_cash: number | null
  transaction_count: number; total_sales: number; total_drops: number
}

export interface DailyTotals {
  total_sales: number; discounted: number; net_sales: number; total_voids: number
  total_returns: number; total_tax: number; paid_in_cash: number; paid_in_debit: number
  paid_in_credit: number; total_items_sold: number; total_customers: number; new_customers: number
}

export async function getRegisterOverview(locationId: string, date: string) {
  const sb = await createSupabaseServerClient()
  const dateFrom = `${date}T00:00:00`; const dateTo = `${date}T23:59:59`

  // Registers
  const { data: registers } = await sb.from('registers').select('id, name').eq('location_id', locationId).eq('is_active', true).order('name')

  // Today's drawers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: drawers } = await (sb.from('cash_drawers') as any).select('register_id, status, opened_at, opening_amount, total_sales, total_drops, employees:opened_by ( first_name, last_name )').eq('location_id', locationId).gte('opened_at', dateFrom).lte('opened_at', dateTo)

  const drawerMap = new Map<string, typeof drawers extends Array<infer T> ? T : never>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const d of (drawers ?? []) as any[]) {
    if (!drawerMap.has(d.register_id) || d.status === 'open') drawerMap.set(d.register_id, d)
  }

  // Today's transactions per register
  const { data: txns } = await sb.from('transactions').select('register_id, total, discount_amount, tax_amount, status, transaction_type, customer_id, is_medical, transaction_lines ( quantity, is_cannabis ), transaction_payments ( payment_method, amount )')
    .eq('location_id', locationId).gte('created_at', dateFrom).lte('created_at', dateTo)

  const txByReg = new Map<string, { count: number; sales: number }>()
  let totalSales = 0, discounted = 0, totalTax = 0, totalVoids = 0, totalReturns = 0
  let cashPaid = 0, debitPaid = 0, creditPaid = 0, totalItems = 0
  const customers = new Set<string>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const tx of (txns ?? []) as any[]) {
    if (tx.status === 'voided') { totalVoids = roundMoney(totalVoids + Math.abs(tx.total)); continue }
    if (tx.transaction_type === 'return') { totalReturns = roundMoney(totalReturns + Math.abs(tx.total)); continue }
    totalSales = roundMoney(totalSales + tx.total)
    discounted = roundMoney(discounted + tx.discount_amount)
    totalTax = roundMoney(totalTax + tx.tax_amount)
    if (tx.customer_id) customers.add(tx.customer_id)
    const regData = txByReg.get(tx.register_id) ?? { count: 0, sales: 0 }
    regData.count++
    regData.sales = roundMoney(regData.sales + tx.total)
    txByReg.set(tx.register_id, regData)
    for (const line of tx.transaction_lines ?? []) totalItems += line.quantity
    for (const pay of tx.transaction_payments ?? []) {
      if (pay.payment_method === 'cash') cashPaid = roundMoney(cashPaid + pay.amount)
      else if (pay.payment_method === 'debit') debitPaid = roundMoney(debitPaid + pay.amount)
      else if (pay.payment_method === 'credit') creditPaid = roundMoney(creditPaid + pay.amount)
    }
  }

  const registerStatuses: RegisterStatus[] = (registers ?? []).map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drawer = drawerMap.get(r.id) as any
    return {
      register_id: r.id, register_name: r.name,
      drawer_status: drawer ? drawer.status : 'no_drawer',
      opened_by: drawer?.employees ? `${drawer.employees.first_name} ${drawer.employees.last_name}` : null,
      opened_at: drawer?.opened_at ?? null,
      current_cash: drawer ? roundMoney(drawer.opening_amount + (drawer.total_sales ?? 0) - (drawer.total_drops ?? 0)) : null,
      transaction_count: txByReg.get(r.id)?.count ?? 0,
      total_sales: roundMoney(txByReg.get(r.id)?.sales ?? 0), total_drops: drawer?.total_drops ?? 0,
    }
  })

  return {
    registers: registerStatuses,
    daily_totals: {
      total_sales: totalSales, discounted, net_sales: roundMoney(totalSales - discounted - totalReturns),
      total_voids: totalVoids, total_returns: totalReturns, total_tax: totalTax,
      paid_in_cash: cashPaid, paid_in_debit: debitPaid, paid_in_credit: creditPaid,
      total_items_sold: totalItems, total_customers: customers.size, new_customers: 0,
    },
  }
}

export async function getClosingReport(locationId: string, startDate: string, endDate: string) {
  const sb = await createSupabaseServerClient()

  const { data: registers } = await sb.from('registers').select('id, name').eq('location_id', locationId).eq('is_active', true).order('name')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: drawers } = await (sb.from('cash_drawers') as any).select('*, employees_opened:opened_by ( first_name, last_name ), employees_closed:closed_by ( first_name, last_name )')
    .eq('location_id', locationId).gte('opened_at', `${startDate}T00:00:00`).lte('opened_at', `${endDate}T23:59:59`).order('opened_at')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawersByReg = new Map<string, any[]>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const d of (drawers ?? []) as any[]) {
    const list = drawersByReg.get(d.register_id) ?? []
    list.push({
      opened_by: d.employees_opened ? `${d.employees_opened.first_name} ${d.employees_opened.last_name}` : '—',
      opened_at: d.opened_at, closed_by: d.employees_closed ? `${d.employees_closed.first_name} ${d.employees_closed.last_name}` : null,
      closed_at: d.closed_at, opening_amount: d.opening_amount,
      total_sales: d.total_sales, total_drops: d.total_drops, total_returns: d.total_returns,
      expected_cash: roundMoney(d.opening_amount + (d.total_sales ?? 0) - (d.total_drops ?? 0) - (d.total_returns ?? 0)),
      actual_cash: d.actual_amount, variance: d.variance, transaction_count: 0,
    })
    drawersByReg.set(d.register_id, list)
  }

  return {
    registers: (registers ?? []).map(r => ({ register_name: r.name, drawers: drawersByReg.get(r.id) ?? [] })),
  }
}
