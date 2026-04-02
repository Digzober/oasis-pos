'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'
import { KPICard } from '@/components/backoffice/KPICard'
import { DashboardAlerts } from '@/components/backoffice/DashboardAlerts'
import type { DashboardKPIs } from '@/lib/services/dashboardService'

const SalesByHourChart = dynamic(() => import('@/components/backoffice/charts/SalesByHourChart'), { ssr: false })

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any

export default function DashboardPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [salesByHour, setSalesByHour] = useState<Array<{ hour: number; total: number; count: number }>>([])
  const [topProducts, setTopProducts] = useState<R[]>([])
  const [payments, setPayments] = useState<R[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ date })
    if (locationId) params.set('location_id', locationId)

    const res = await fetch(`/api/dashboard?${params}`)
    if (res.ok) {
      const data = await res.json()
      setKpis(data.kpis)
      setSalesByHour(data.salesByHour ?? [])
      setTopProducts(data.topProducts ?? [])
      setPayments(data.payments ?? [])
      setLastUpdated(new Date())
    }
    setLoading(false)
  }, [date, locationId])

  useEffect(() => { if (hydrated) fetchData() }, [hydrated, fetchData])

  // Refresh every 60 seconds
  useEffect(() => {
    if (!hydrated) return
    const id = setInterval(fetchData, 60000)
    return () => clearInterval(id)
  }, [hydrated, fetchData])

  const isToday = date === new Date().toISOString().slice(0, 10)
  const paymentTotal = payments.reduce((s: number, p: R) => s + p.total, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-50">Dashboard</h1>
          {lastUpdated && <p className="text-xs text-gray-500">Updated {lastUpdated.toLocaleTimeString()}</p>}
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button onClick={() => setDate(new Date().toISOString().slice(0, 10))} className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg">Today</button>
          )}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)}
            className="h-9 px-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-50" />
        </div>
      </div>

      {loading && !kpis ? (
        <div className="text-center py-12 text-gray-500">Loading dashboard...</div>
      ) : kpis ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <KPICard label="Transactions" value={kpis.transactions} />
            <KPICard label="Gross Sales" value={kpis.gross_sales} format="currency" />
            <KPICard label="Net Sales" value={kpis.net_sales} format="currency" />
            <KPICard label="Customers" value={kpis.customer_count} />
            <KPICard label="Avg Cart" value={kpis.average_cart} format="currency" />
          </div>

          {/* Chart */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">Sales by Hour</h3>
            <SalesByHourChart data={salesByHour} />
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Products */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">Top Products</h3>
              {topProducts.length === 0 ? <p className="text-gray-500 text-sm">No sales yet</p> : (
                <div className="space-y-2">
                  {topProducts.map((p: R, i: number) => (
                    <div key={p.product_name} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-5 text-right">{i + 1}.</span>
                      <span className="text-gray-50 flex-1 truncate">{p.product_name}</span>
                      <span className="text-gray-400 text-xs tabular-nums">{p.quantity_sold}u</span>
                      <span className="text-gray-50 tabular-nums">{fmt(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Breakdown */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">Payments</h3>
              {payments.length === 0 ? <p className="text-gray-500 text-sm">No payments yet</p> : (
                <div className="space-y-2">
                  {payments.map((p: R) => {
                    const pct = paymentTotal > 0 ? Math.round(p.total / paymentTotal * 100) : 0
                    return (
                      <div key={p.method} className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-300 capitalize">{p.method}</span>
                          <span className="text-gray-50 tabular-nums">{fmt(p.total)} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Alerts */}
            <DashboardAlerts kpis={kpis} />
          </div>
        </>
      ) : null}
    </div>
  )
}
