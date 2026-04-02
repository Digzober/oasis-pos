'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'
import type { SalesSummary } from '@/lib/services/reportingService'

const SalesByHourChart = dynamic(() => import('@/components/backoffice/charts/SalesByHourChart'), { ssr: false })
const SalesByCategoryChart = dynamic(() => import('@/components/backoffice/charts/SalesByCategoryChart'), { ssr: false })

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function exportCSV(headers: string[], rows: string[][], filename: string) {
  const escape = (v: string) => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
  const csv = [headers.join(','), ...rows.map(r => r.map(c => escape(String(c ?? ''))).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const PRESETS: Array<{ label: string; getDates: () => [string, string] }> = [
  { label: 'Today', getDates: () => { const d = todayStr(); return [d, d] } },
  { label: 'Yesterday', getDates: () => { const d = dayOffset(-1); return [d, d] } },
  { label: 'This Week', getDates: () => { const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1); return [isoDate(mon), todayStr()] } },
  { label: 'This Month', getDates: () => { const now = new Date(); return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, todayStr()] } },
]

function todayStr(): string { return new Date().toISOString().slice(0, 10) }
function dayOffset(n: number): string { const d = new Date(); d.setDate(d.getDate() + n); return isoDate(d) }
function isoDate(d: Date): string { return d.toISOString().slice(0, 10) }

export default function SalesDashboardPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [dateFrom, setDateFrom] = useState(todayStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/sales-summary?date_from=${dateFrom}&date_to=${dateTo}${locationId ? `&location_id=${locationId}` : ''}`)
      if (res.ok) setSummary(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [dateFrom, dateTo, locationId])

  useEffect(() => { if (hydrated) fetchData() }, [hydrated, fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Sales Dashboard</h1>
        <div className="flex gap-2 items-center">
          {summary && (
            <button onClick={() => {
              const date = new Date().toISOString().slice(0, 10)
              const metricRows: string[][] = [
                ['Total Sales', String(summary.total_sales)],
                ['Transaction Count', String(summary.total_transactions)],
                ['Average Sale', String(summary.average_transaction)],
                ['Total Tax', String(summary.total_tax_collected)],
                ['Total Discounts', String(summary.total_discounts_given)],
              ]
              const hourRows: string[][] = summary.sales_by_hour.map((h) => [
                String(h.hour), String(h.count), String(h.total),
              ])
              const allRows = [
                ...metricRows,
                ['', ''],
                ['Hour', 'Transactions', 'Revenue'],
                ...hourRows,
              ]
              exportCSV(['Metric', 'Value'], allRows, `sales-dashboard-${date}.csv`)
            }} className="px-4 py-2 text-sm bg-gray-700 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export CSV
            </button>
          )}
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => { const [f, t] = p.getDates(); setDateFrom(f); setDateTo(t) }}
              className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date inputs */}
      <div className="flex gap-3 mb-6">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50" />
      </div>

      {loading && !summary ? (
        <div className="text-center text-gray-500 py-12">Loading...</div>
      ) : !summary ? (
        <div className="text-center text-gray-500 py-12">No data</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card label="Net Sales" value={fmt(summary.net_sales)} />
            <Card label="Transactions" value={String(summary.total_transactions)} />
            <Card label="Avg Transaction" value={fmt(summary.average_transaction)} />
            <Card label="Tax Collected" value={fmt(summary.total_tax_collected)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Sales by Hour */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Sales by Hour</h3>
              <SalesByHourChart data={summary.sales_by_hour} />
            </div>

            {/* Sales by Category */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Sales by Category</h3>
              <SalesByCategoryChart data={summary.sales_by_category.slice(0, 8)} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Products</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2">Units</th>
                    <th className="text-right py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.top_products.map((p) => (
                    <tr key={p.product_name} className="border-b border-gray-700/50">
                      <td className="py-2 text-gray-50 truncate max-w-[200px]">{p.product_name}</td>
                      <td className="py-2 text-right text-gray-300 tabular-nums">{p.units_sold}</td>
                      <td className="py-2 text-right text-gray-50 tabular-nums">{fmt(p.revenue)}</td>
                    </tr>
                  ))}
                  {summary.top_products.length === 0 && (
                    <tr><td colSpan={3} className="py-4 text-center text-gray-500">No sales data</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Sales by Employee */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Sales by Employee</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                    <th className="text-left py-2">Employee</th>
                    <th className="text-right py-2">Txns</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sales_by_employee.map((e) => (
                    <tr key={e.employee_name} className="border-b border-gray-700/50">
                      <td className="py-2 text-gray-50">{e.employee_name}</td>
                      <td className="py-2 text-right text-gray-300 tabular-nums">{e.count}</td>
                      <td className="py-2 text-right text-gray-50 tabular-nums">{fmt(e.total)}</td>
                      <td className="py-2 text-right text-gray-300 tabular-nums">{fmt(e.average)}</td>
                    </tr>
                  ))}
                  {summary.sales_by_employee.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-500">No sales data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <p className="text-xs text-gray-400 uppercase">{label}</p>
      <p className="text-2xl font-bold text-gray-50 mt-1 tabular-nums">{value}</p>
    </div>
  )
}
