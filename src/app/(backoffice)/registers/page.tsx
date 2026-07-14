'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'
import type { RegisterStatus, DailyTotals } from '@/lib/services/registerOverviewService'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

export default function RegistersOverviewPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [registers, setRegisters] = useState<RegisterStatus[]>([])
  const [totals, setTotals] = useState<DailyTotals | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ date })
    if (locationId) params.set('location_id', locationId)
    const res = await fetch(`/api/registers/overview?${params}`)
    if (res.ok) { const d = await res.json(); setRegisters(d.registers ?? []); setTotals(d.daily_totals ?? null) }
    setLoading(false)
  }, [locationId, date])

  useEffect(() => {
    if (!hydrated) return
    void Promise.resolve().then(fetchData)
    const id = setInterval(fetchData, 30000)
    return () => clearInterval(id)
  }, [hydrated, fetchData])

  const statusDot = (s: string) => s === 'open' ? 'bg-accent' : s === 'closed' ? 'bg-overlay' : 'bg-raised border border-edge-strong'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Registers Overview</h1>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 px-3 bg-surface border border-edge rounded-lg text-sm text-primary" />
          <Link href="/checkout" target="_blank" className="text-sm px-3 py-1.5 bg-accent text-primary rounded-lg hover:bg-accent">Launch POS</Link>
          <Link href="/reports/closing" className="text-sm px-3 py-1.5 bg-raised text-secondary rounded-lg hover:bg-raised">Closing Report</Link>
        </div>
      </div>

      {loading ? <p className="text-muted">Loading...</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Register Cards */}
          <div className="lg:col-span-2 space-y-3">
            {registers.length === 0 ? (
              <div className="bg-surface rounded-xl border border-edge p-8 text-center">
                <p className="text-muted mb-2">No registers configured</p>
                <Link href="/settings/registers" className="text-sm text-accent">Set up registers</Link>
              </div>
            ) : registers.map(r => (
              <div key={r.register_id} className="bg-surface rounded-xl border border-edge p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusDot(r.drawer_status)}`} />
                    <h3 className="text-primary font-semibold">{r.register_name}</h3>
                    <span className="text-xs text-secondary capitalize">{r.drawer_status === 'no_drawer' ? 'No drawer' : r.drawer_status}</span>
                  </div>
                  {r.current_cash != null && <span className="text-sm text-primary tabular-nums font-medium">{fmt(r.current_cash)}</span>}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-secondary">Opened by: </span><span className="text-secondary">{r.opened_by ?? '—'}</span></div>
                  <div><span className="text-secondary">Transactions: </span><span className="text-secondary tabular-nums">{r.transaction_count}</span></div>
                  <div><span className="text-secondary">Drops: </span><span className="text-secondary tabular-nums">{fmt(r.total_drops)}</span></div>
                </div>
                {r.opened_at && <p className="text-xs text-muted mt-1">Since {new Date(r.opened_at).toLocaleTimeString()}</p>}
              </div>
            ))}
          </div>

          {/* Daily Totals */}
          {totals && (
            <div className="bg-surface rounded-xl border border-edge p-4">
              <h3 className="text-sm font-semibold text-secondary uppercase mb-4">Daily Totals</h3>
              <div className="space-y-2 text-sm">
                <Row label="Total Sales" value={fmt(totals.total_sales)} bold />
                <Row label="Discounted" value={`-${fmt(totals.discounted)}`} />
                <Row label="Returns" value={`-${fmt(totals.total_returns)}`} />
                <Row label="Net Sales" value={fmt(totals.net_sales)} bold color="text-accent" />
                <div className="border-t border-edge my-2" />
                <Row label="Tax Collected" value={fmt(totals.total_tax)} />
                <Row label="Voids" value={fmt(totals.total_voids)} color="text-danger" />
                <div className="border-t border-edge my-2" />
                <Row label="Cash" value={fmt(totals.paid_in_cash)} />
                <Row label="Debit" value={fmt(totals.paid_in_debit)} />
                <Row label="Credit" value={fmt(totals.paid_in_credit)} />
                <div className="border-t border-edge my-2" />
                <Row label="Items Sold" value={String(totals.total_items_sold)} />
                <Row label="Customers" value={String(totals.total_customers)} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-secondary">{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold text-primary' : ''} ${color ?? 'text-secondary'}`}>{value}</span>
    </div>
  )
}
