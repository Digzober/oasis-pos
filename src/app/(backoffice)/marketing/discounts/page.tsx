'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/shared'
import { DENSE_BESPOKE_TABLE_CLASS } from '@/lib/constants/tableDensity'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D = any

export default function DiscountListPage() {
  const [discounts, setDiscounts] = useState<D[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    const res = await fetch(`/api/discounts?${params}`)
    if (res.ok) { const d = await res.json(); setDiscounts(d.discounts ?? []); setTotal(d.total ?? 0) }
    setLoading(false)
  }, [page, status, search])

  useEffect(() => { void Promise.resolve().then(fetchData) }, [fetchData])

  const duplicate = async (id: string) => {
    await fetch(`/api/discounts/${id}/duplicate`, { method: 'POST' })
    fetchData()
  }

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this discount?')) return
    await fetch(`/api/discounts/${id}`, { method: 'DELETE' })
    fetchData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Discounts</h1>
        <Link href="/marketing/discounts/new" className="text-sm px-4 py-1.5 bg-accent text-primary rounded-lg hover:bg-accent">+ New Discount</Link>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search discounts..."
          className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary w-64" />
        <div className="flex gap-1">
          {['', 'active', 'draft', 'inactive'].map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1) }}
              className={`px-3 py-2 rounded-lg text-xs ${status === s ? 'bg-accent text-primary' : 'bg-raised text-secondary'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <table data-density="compact" className={`${DENSE_BESPOKE_TABLE_CLASS} w-full`}>
          <thead><tr className="border-b border-edge text-secondary text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th><th className="text-center px-4 py-3">Status</th><th className="text-center px-4 py-3">Type</th>
            <th className="text-left px-4 py-3">Code</th><th className="text-left px-4 py-3">Dates</th><th className="text-right px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="text-center py-8 text-muted">Loading...</td></tr>
            : discounts.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-muted">No discounts found</td></tr>
            : discounts.map((d: D) => (
            <tr key={d.id} className="border-b border-edge/50 hover:bg-raised/30">
              <td className="px-4 py-2.5"><Link href={`/marketing/discounts/${d.id}/edit`} className="text-primary hover:text-accent">{d.name}</Link></td>
              <td className="px-4 py-2.5 text-center"><StatusBadge status={d.status} /></td>
              <td className="px-4 py-2.5 text-center text-secondary text-xs capitalize">{d.application_method}</td>
              <td className="px-4 py-2.5 text-secondary text-xs tabular-nums">{d.code ?? '—'}</td>
              <td className="px-4 py-2.5 text-secondary text-xs">{d.start_date ? new Date(d.start_date).toLocaleDateString() : '—'} → {d.end_date ? new Date(d.end_date).toLocaleDateString() : '∞'}</td>
              <td className="px-4 py-2.5 text-right">
                <button onClick={() => duplicate(d.id)} className="text-xs text-secondary hover:text-accent mr-2">Duplicate</button>
                <button onClick={() => deactivate(d.id)} className="text-xs text-secondary hover:text-danger">Deactivate</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
