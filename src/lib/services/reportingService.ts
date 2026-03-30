import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/utils/money'
import { logger } from '@/lib/utils/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionLogFilters {
  location_id?: string | null
  employee_id?: string | null
  register_id?: string | null
  date_from: string
  date_to: string
  transaction_type?: string | null
  status?: string | null
  min_amount?: number | null
  max_amount?: number | null
  customer_id?: string | null
  page?: number
  per_page?: number
}

export interface TransactionSummary {
  id: string
  transaction_number: number
  transaction_type: string
  status: string
  location_name: string
  employee_name: string
  customer_name: string | null
  is_medical: boolean
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  item_count: number
  biotrack_synced: boolean
  created_at: string
}

export interface TransactionDetail {
  id: string
  transaction_number: number
  transaction_type: string
  status: string
  is_medical: boolean
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  notes: string | null
  void_reason: string | null
  voided_at: string | null
  voided_by_name: string | null
  biotrack_synced: boolean
  biotrack_transaction_id: string | null
  created_at: string
  location: { id: string; name: string }
  employee: { id: string; name: string }
  register: { id: string; name: string } | null
  customer: { id: string; name: string } | null
  lines: Array<{
    id: string
    product_name: string
    category_name: string | null
    quantity: number
    unit_price: number
    discount_amount: number
    tax_amount: number
    line_total: number
    biotrack_barcode: string | null
    is_cannabis: boolean
    weight_grams: number | null
  }>
  payments: Array<{
    id: string
    payment_method: string
    amount: number
    tendered: number | null
    change_given: number | null
    reference_number: string | null
  }>
  taxes: Array<{
    id: string
    tax_name: string
    tax_rate: number
    taxable_amount: number
    tax_amount: number
    is_excise: boolean
  }>
  discounts: Array<{
    id: string
    discount_name: string
    discount_amount: number
  }>
  original_transaction_id: string | null
}

export interface SalesSummaryFilters {
  location_id?: string | null
  date_from: string
  date_to: string
}

export interface SalesSummary {
  total_sales: number
  total_returns: number
  total_voids_count: number
  total_voids_amount: number
  net_sales: number
  total_transactions: number
  average_transaction: number
  total_tax_collected: number
  total_discounts_given: number
  top_products: Array<{ product_name: string; units_sold: number; revenue: number }>
  sales_by_hour: Array<{ hour: number; total: number; count: number }>
  sales_by_category: Array<{ category: string; total: number; count: number }>
  sales_by_employee: Array<{ employee_name: string; total: number; count: number; average: number }>
}

// ---------------------------------------------------------------------------
// Transaction Log
// ---------------------------------------------------------------------------

export async function getTransactionLog(
  filters: TransactionLogFilters,
): Promise<{ transactions: TransactionSummary[]; total_count: number }> {
  const sb = await createSupabaseServerClient()
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? 50
  const offset = (page - 1) * perPage

  let query = sb
    .from('transactions')
    .select(
      `id, transaction_number, transaction_type, status, is_medical,
       subtotal, discount_amount, tax_amount, total, biotrack_synced, created_at,
       locations!inner ( name ),
       employees!inner ( first_name, last_name ),
       customers ( first_name, last_name ),
       transaction_lines ( id )`,
      { count: 'exact' },
    )
    .gte('created_at', `${filters.date_from}T00:00:00`)
    .lte('created_at', `${filters.date_to}T23:59:59`)

  if (filters.location_id) query = query.eq('location_id', filters.location_id)
  if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
  if (filters.register_id) query = query.eq('register_id', filters.register_id)
  if (filters.transaction_type) query = query.eq('transaction_type', filters.transaction_type)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.customer_id) query = query.eq('customer_id', filters.customer_id)
  if (filters.min_amount != null) query = query.gte('total', filters.min_amount)
  if (filters.max_amount != null) query = query.lte('total', filters.max_amount)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (error) {
    logger.error('Transaction log query failed', { error: error.message })
    return { transactions: [], total_count: 0 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions: TransactionSummary[] = (data ?? []).map((tx: any) => {
    const emp = tx.employees
    const loc = tx.locations
    const cust = tx.customers
    return {
      id: tx.id,
      transaction_number: tx.transaction_number,
      transaction_type: tx.transaction_type,
      status: tx.status,
      location_name: loc?.name ?? '',
      employee_name: [emp?.first_name, emp?.last_name].filter(Boolean).join(' '),
      customer_name: cust ? [cust.first_name, cust.last_name].filter(Boolean).join(' ') : null,
      is_medical: tx.is_medical,
      subtotal: tx.subtotal,
      discount_amount: tx.discount_amount,
      tax_amount: tx.tax_amount,
      total: tx.total,
      item_count: Array.isArray(tx.transaction_lines) ? tx.transaction_lines.length : 0,
      biotrack_synced: tx.biotrack_synced,
      created_at: tx.created_at,
    }
  })

  return { transactions, total_count: count ?? 0 }
}

// ---------------------------------------------------------------------------
// Transaction Detail
// ---------------------------------------------------------------------------

export async function getTransactionDetail(
  transactionId: string,
): Promise<TransactionDetail | null> {
  const sb = await createSupabaseServerClient()

  const { data: tx, error } = await sb
    .from('transactions')
    .select(`
      *,
      locations ( id, name ),
      employees ( id, first_name, last_name ),
      registers ( id, name ),
      customers ( id, first_name, last_name ),
      transaction_lines ( id, product_name, category_name, quantity, unit_price, discount_amount, tax_amount, line_total, biotrack_barcode, is_cannabis, weight_grams ),
      transaction_payments ( id, payment_method, amount, tendered, change_given, reference_number ),
      transaction_taxes ( id, tax_name, tax_rate, taxable_amount, tax_amount, is_excise ),
      transaction_discounts ( id, discount_name, discount_amount )
    `)
    .eq('id', transactionId)
    .single()

  if (error || !tx) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emp = tx.employees as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loc = tx.locations as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reg = tx.registers as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cust = tx.customers as any

  // Get voided_by name if applicable
  let voidedByName: string | null = null
  if (tx.voided_by) {
    const { data: voidEmp } = await sb
      .from('employees')
      .select('first_name, last_name')
      .eq('id', tx.voided_by)
      .single()
    if (voidEmp) voidedByName = `${voidEmp.first_name} ${voidEmp.last_name}`
  }

  return {
    id: tx.id,
    transaction_number: tx.transaction_number,
    transaction_type: tx.transaction_type,
    status: tx.status,
    is_medical: tx.is_medical,
    subtotal: tx.subtotal,
    discount_amount: tx.discount_amount,
    tax_amount: tx.tax_amount,
    total: tx.total,
    notes: tx.notes,
    void_reason: tx.void_reason,
    voided_at: tx.voided_at,
    voided_by_name: voidedByName,
    biotrack_synced: tx.biotrack_synced,
    biotrack_transaction_id: tx.biotrack_transaction_id,
    created_at: tx.created_at,
    location: { id: loc?.id ?? '', name: loc?.name ?? '' },
    employee: { id: emp?.id ?? '', name: [emp?.first_name, emp?.last_name].filter(Boolean).join(' ') },
    register: reg ? { id: reg.id, name: reg.name } : null,
    customer: cust ? { id: cust.id, name: [cust.first_name, cust.last_name].filter(Boolean).join(' ') } : null,
    lines: (tx.transaction_lines ?? []) as TransactionDetail['lines'],
    payments: (tx.transaction_payments ?? []) as TransactionDetail['payments'],
    taxes: (tx.transaction_taxes ?? []) as TransactionDetail['taxes'],
    discounts: (tx.transaction_discounts ?? []) as TransactionDetail['discounts'],
    original_transaction_id: tx.original_transaction_id,
  }
}

// ---------------------------------------------------------------------------
// Sales Summary
// ---------------------------------------------------------------------------

export async function getSalesSummary(
  filters: SalesSummaryFilters,
): Promise<SalesSummary> {
  const sb = await createSupabaseServerClient()

  const dateFrom = `${filters.date_from}T00:00:00`
  const dateTo = `${filters.date_to}T23:59:59`

  let baseQuery = sb
    .from('transactions')
    .select('id, transaction_type, status, total, subtotal, discount_amount, tax_amount, is_medical, created_at, employee_id, employees ( first_name, last_name ), transaction_lines ( product_name, category_name, quantity, line_total )')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo)

  if (filters.location_id) baseQuery = baseQuery.eq('location_id', filters.location_id)

  const { data: txns, error } = await baseQuery

  if (error) {
    logger.error('Sales summary query failed', { error: error.message })
  }

  const rows = txns ?? []

  let totalSales = 0
  let totalReturns = 0
  let totalVoidsCount = 0
  let totalVoidsAmount = 0
  let totalTax = 0
  let totalDiscounts = 0
  let saleCount = 0

  const hourlyMap = new Map<number, { total: number; count: number }>()
  const categoryMap = new Map<string, { total: number; count: number }>()
  const employeeMap = new Map<string, { name: string; total: number; count: number }>()
  const productMap = new Map<string, { units: number; revenue: number }>()

  for (let h = 0; h < 24; h++) hourlyMap.set(h, { total: 0, count: 0 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const tx of rows as any[]) {
    if (tx.status === 'voided') {
      totalVoidsCount++
      totalVoidsAmount = roundMoney(totalVoidsAmount + Math.abs(tx.total))
      continue
    }

    if (tx.transaction_type === 'return') {
      totalReturns = roundMoney(totalReturns + Math.abs(tx.total))
    } else {
      totalSales = roundMoney(totalSales + tx.total)
      saleCount++
    }

    totalTax = roundMoney(totalTax + tx.tax_amount)
    totalDiscounts = roundMoney(totalDiscounts + tx.discount_amount)

    // Hourly
    const hour = new Date(tx.created_at).getHours()
    const h = hourlyMap.get(hour) ?? { total: 0, count: 0 }
    h.total = roundMoney(h.total + tx.total)
    h.count++
    hourlyMap.set(hour, h)

    // Employee
    const emp = tx.employees
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'
    const empKey = tx.employee_id
    const e = employeeMap.get(empKey) ?? { name: empName, total: 0, count: 0 }
    e.total = roundMoney(e.total + tx.total)
    e.count++
    employeeMap.set(empKey, e)

    // Lines → products + categories
    const lines = tx.transaction_lines ?? []
    for (const line of lines) {
      const pName = line.product_name ?? 'Unknown'
      const p = productMap.get(pName) ?? { units: 0, revenue: 0 }
      p.units += line.quantity
      p.revenue = roundMoney(p.revenue + line.line_total)
      productMap.set(pName, p)

      const catName = line.category_name ?? 'Uncategorized'
      const c = categoryMap.get(catName) ?? { total: 0, count: 0 }
      c.total = roundMoney(c.total + line.line_total)
      c.count += line.quantity
      categoryMap.set(catName, c)
    }
  }

  const netSales = roundMoney(totalSales - totalReturns)
  const totalTransactions = saleCount
  const avgTx = totalTransactions > 0 ? roundMoney(netSales / totalTransactions) : 0

  return {
    total_sales: totalSales,
    total_returns: totalReturns,
    total_voids_count: totalVoidsCount,
    total_voids_amount: totalVoidsAmount,
    net_sales: netSales,
    total_transactions: totalTransactions,
    average_transaction: avgTx,
    total_tax_collected: totalTax,
    total_discounts_given: totalDiscounts,
    top_products: Array.from(productMap.entries())
      .map(([product_name, v]) => ({ product_name, units_sold: v.units, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    sales_by_hour: Array.from(hourlyMap.entries())
      .map(([hour, v]) => ({ hour, total: v.total, count: v.count }))
      .sort((a, b) => a.hour - b.hour),
    sales_by_category: Array.from(categoryMap.entries())
      .map(([category, v]) => ({ category, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total),
    sales_by_employee: Array.from(employeeMap.entries())
      .map(([, v]) => ({
        employee_name: v.name,
        total: v.total,
        count: v.count,
        average: v.count > 0 ? roundMoney(v.total / v.count) : 0,
      }))
      .sort((a, b) => b.total - a.total),
  }
}
