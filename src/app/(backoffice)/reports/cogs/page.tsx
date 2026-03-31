'use client'
import { useState, useEffect, useCallback } from 'react'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any

export default function COGSPage() {
  const [data, setData] = useState<R>(null)
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [groupBy, setGroupBy] = useState('product')
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/reports/cogs?date_from=${dateFrom}&date_to=${dateTo}&group_by=${groupBy}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [dateFrom, dateTo, groupBy])

  useEffect(() => { fetch_() }, [fetch_])

  const exportCsv = () => {
    if (!data?.items) return
    const csv = [['Name', 'Revenue', 'COGS', 'Profit', 'Margin'], ...data.items.map((i: R) => [i.name, i.revenue, i.cogs, i.gross_profit, `${i.margin}%`])].map((r: string[]) => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv])); a.download = 'cogs.csv'; a.click()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Cost of Goods Sold</h1>
        <button onClick={exportCsv} className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Export CSV</button>
      </div>
      <div className="flex gap-3 mb-4">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50" />
        <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50">
          <option value="product">By Product</option><option value="category">By Category</option>
        </select>
      </div>
      {data?.summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card label="Revenue" value={fmt(data.summary.total_revenue)} /><Card label="COGS" value={fmt(data.summary.total_cogs)} />
          <Card label="Gross Profit" value={fmt(data.summary.total_profit)} /><Card label="Avg Margin" value={`${data.summary.avg_margin}%`} />
        </div>
      )}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th><th className="text-right px-4 py-3">Revenue</th><th className="text-right px-4 py-3">COGS</th><th className="text-right px-4 py-3">Profit</th><th className="text-right px-4 py-3">Margin</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading...</td></tr>
            : (data?.items ?? []).map((i: R) => (
            <tr key={i.name} className="border-b border-gray-700/50">
              <td className="px-4 py-2.5 text-gray-50">{i.name}</td>
              <td className="px-4 py-2.5 text-right text-gray-50 tabular-nums">{fmt(i.revenue)}</td>
              <td className="px-4 py-2.5 text-right text-gray-300 tabular-nums">{fmt(i.cogs)}</td>
              <td className="px-4 py-2.5 text-right text-emerald-400 tabular-nums">{fmt(i.gross_profit)}</td>
              <td className="px-4 py-2.5 text-right text-gray-300 tabular-nums">{i.margin}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
function Card({ label, value }: { label: string; value: string }) { return <div className="bg-gray-800 rounded-xl border border-gray-700 p-4"><p className="text-xs text-gray-400 uppercase">{label}</p><p className="text-2xl font-bold text-gray-50 mt-1 tabular-nums">{value}</p></div> }
