'use client'
import { useState, useEffect } from 'react'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any

export default function InventoryReportsPage() {
  const [tab, setTab] = useState<'valuation' | 'low' | 'expiring' | 'shrinkage'>('valuation')
  const [valuation, setValuation] = useState<R>(null)
  const [lowStock, setLowStock] = useState<R[]>([])
  const [expiring, setExpiring] = useState<R[]>([])
  const [shrinkage, setShrinkage] = useState<R>(null)

  useEffect(() => {
    if (tab === 'valuation') fetch('/api/reports/valuation').then(r => r.json()).then(setValuation)
    if (tab === 'low') fetch('/api/reports/low-stock').then(r => r.json()).then(d => setLowStock(d.items ?? []))
    if (tab === 'expiring') fetch('/api/reports/expiring?window_days=30').then(r => r.json()).then(d => setExpiring(d.items ?? []))
    if (tab === 'shrinkage') fetch(`/api/reports/shrinkage?date_from=${new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)}&date_to=${new Date().toISOString().slice(0, 10)}`).then(r => r.json()).then(setShrinkage)
  }, [tab])

  const tabs = [{ key: 'valuation', label: 'Valuation' }, { key: 'low', label: 'Low Stock' }, { key: 'expiring', label: 'Expiring' }, { key: 'shrinkage', label: 'Shrinkage' }] as const

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-50 mb-6">Inventory Reports</h1>
      <div className="flex gap-2 mb-6">{tabs.map(t => (
        <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-sm ${tab === t.key ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{t.label}</button>
      ))}</div>

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
