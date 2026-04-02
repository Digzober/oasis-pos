'use client'
import { useState, useEffect } from 'react'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any

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

export default function InventoryReportsPage() {
  const { locationId, hydrated } = useSelectedLocation()
  const [tab, setTab] = useState<'valuation' | 'low' | 'expiring' | 'shrinkage'>('valuation')
  const [valuation, setValuation] = useState<R>(null)
  const [lowStock, setLowStock] = useState<R[]>([])
  const [expiring, setExpiring] = useState<R[]>([])
  const [shrinkage, setShrinkage] = useState<R>(null)

  useEffect(() => {
    if (!hydrated) return
    const locParam = locationId ? `?location_id=${locationId}` : ''
    const locAmp = locationId ? `&location_id=${locationId}` : ''
    if (tab === 'valuation') fetch(`/api/reports/valuation${locParam}`).then(r => r.json()).then(setValuation)
    if (tab === 'low') fetch(`/api/reports/low-stock${locParam}`).then(r => r.json()).then(d => setLowStock(d.items ?? []))
    if (tab === 'expiring') fetch(`/api/reports/expiring?window_days=30${locAmp}`).then(r => r.json()).then(d => setExpiring(d.items ?? []))
    if (tab === 'shrinkage') fetch(`/api/reports/shrinkage?date_from=${new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)}&date_to=${new Date().toISOString().slice(0, 10)}${locAmp}`).then(r => r.json()).then(setShrinkage)
  }, [tab, locationId, hydrated])

  const tabs = [{ key: 'valuation', label: 'Valuation' }, { key: 'low', label: 'Low Stock' }, { key: 'expiring', label: 'Expiring' }, { key: 'shrinkage', label: 'Shrinkage' }] as const

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-50 mb-6">Inventory Reports</h1>
      <div className="flex items-center justify-between mb-6">
      <div className="flex gap-2">{tabs.map(t => (
        <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-sm ${tab === t.key ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{t.label}</button>
      ))}</div>
      <button onClick={() => {
        const date = new Date().toISOString().slice(0, 10)
        if (tab === 'valuation' && valuation) {
          exportCSV(['Metric', 'Value'], [['Total Units', String(valuation.total_units)], ['Cost Value', String(valuation.total_cost_value)], ['Retail Value', String(valuation.total_retail_value)], ['Potential Margin %', String(valuation.potential_margin)]], `inventory-report-${date}.csv`)
        } else if (tab === 'low' && lowStock.length > 0) {
          exportCSV(['Product Name', 'SKU', 'Available'], lowStock.map((i: R) => [i.product_name, i.sku, String(i.available)]), `inventory-report-${date}.csv`)
        } else if (tab === 'expiring' && expiring.length > 0) {
          exportCSV(['Product Name', 'Quantity', 'Expiration Date', 'Days Left'], expiring.map((i: R) => [i.product_name, String(i.quantity), i.expiration_date, String(i.days_until_expiry)]), `inventory-report-${date}.csv`)
        } else if (tab === 'shrinkage' && shrinkage) {
          exportCSV(['Reason', 'Units Lost', 'Event Count'], (shrinkage.items ?? []).map((i: R) => [i.reason, String(i.units_lost), String(i.count)]), `inventory-report-${date}.csv`)
        }
      }} className="px-4 py-2 text-sm bg-gray-700 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        Export CSV
      </button>
      </div>

      {tab === 'valuation' && valuation && (
        <div className="grid grid-cols-4 gap-4">
          <Card label="Total Units" value={String(valuation.total_units)} /><Card label="Cost Value" value={fmt(valuation.total_cost_value)} />
          <Card label="Retail Value" value={fmt(valuation.total_retail_value)} /><Card label="Potential Margin" value={`${valuation.potential_margin}%`} />
        </div>
      )}

      {tab === 'low' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm"><thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left px-4 py-3">Product</th><th className="text-left px-4 py-3">SKU</th><th className="text-right px-4 py-3">Available</th>
          </tr></thead><tbody>{lowStock.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-gray-500">No low stock items</td></tr>
            : lowStock.map((i: R) => (
            <tr key={i.id} className="border-b border-gray-700/50"><td className="px-4 py-2.5 text-gray-50">{i.product_name}</td><td className="px-4 py-2.5 text-gray-400 text-xs">{i.sku}</td>
              <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${i.available <= 0 ? 'text-red-400' : 'text-amber-400'}`}>{i.available}</td></tr>
          ))}</tbody></table>
        </div>
      )}

      {tab === 'expiring' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm"><thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left px-4 py-3">Product</th><th className="text-right px-4 py-3">Qty</th><th className="text-left px-4 py-3">Expires</th><th className="text-right px-4 py-3">Days Left</th>
          </tr></thead><tbody>{expiring.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-500">No expiring items</td></tr>
            : expiring.map((i: R) => (
            <tr key={i.id} className="border-b border-gray-700/50"><td className="px-4 py-2.5 text-gray-50">{i.product_name}</td><td className="px-4 py-2.5 text-right tabular-nums">{i.quantity}</td>
              <td className="px-4 py-2.5 text-gray-400 text-xs">{i.expiration_date}</td><td className={`px-4 py-2.5 text-right font-medium ${i.days_until_expiry <= 7 ? 'text-red-400' : 'text-amber-400'}`}>{i.days_until_expiry}d</td></tr>
          ))}</tbody></table>
        </div>
      )}

      {tab === 'shrinkage' && shrinkage && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <p className="text-lg font-bold text-gray-50 mb-3">Total Units Lost: {shrinkage.total_units_lost}</p>
          {(shrinkage.items ?? []).map((i: R) => (
            <div key={i.reason} className="flex justify-between py-1 text-sm"><span className="text-gray-300 capitalize">{i.reason.replace('_', ' ')}</span><span className="text-red-400 tabular-nums">{i.units_lost} units ({i.count} events)</span></div>
          ))}
        </div>
      )}
    </div>
  )
}
function Card({ label, value }: { label: string; value: string }) { return <div className="bg-gray-800 rounded-xl border border-gray-700 p-4"><p className="text-xs text-gray-400 uppercase">{label}</p><p className="text-2xl font-bold text-gray-50 mt-1 tabular-nums">{value}</p></div> }
