'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Package } from 'lucide-react'

interface Kit {
  id: string
  name: string
  sku: string | null
  price: number | null
  is_active: boolean
  item_count: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function SkeletonRow() {
  return (
    <tr className="border-b border-edge/50 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-raised rounded w-3/4" />
        </td>
      ))}
    </tr>
  )
}

export default function PackingListsTab() {
  const [kits, setKits] = useState<Kit[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', sku: '', price: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const fetchKits = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (searchTerm) params.set('search', searchTerm)

      const res = await fetch(`/api/product-kits?${params}`)
      if (!res.ok) throw new Error('Failed to fetch kits')

      const data = await res.json()
      setKits(data.kits)
      setPagination(data.pagination)
    } catch {
      setKits([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchKits(1, search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, fetchKits])

  const handlePageChange = (newPage: number) => {
    fetchKits(newPage, search)
  }

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setCreateError('Name is required')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/product-kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
          sku: createForm.sku.trim() || null,
          price: createForm.price ? parseFloat(createForm.price) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create kit')
      }
      setShowCreate(false)
      setCreateForm({ name: '', description: '', sku: '', price: '' })
      fetchKits(1, search)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create kit')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-primary">Product Kits / Packing Lists</h2>
          <p className="text-sm text-secondary mt-1">
            Bundle products into kits and packing lists
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-accent hover:bg-accent text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Create Kit
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search kits by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-edge rounded-lg pl-10 pr-4 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-surface/50 border border-edge rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-secondary text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">SKU</th>
              <th className="text-right px-4 py-3">Price</th>
              <th className="text-center px-4 py-3"># Items</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-primary">
            {loading && kits.length === 0 && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}
            {!loading && kits.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No product kits found</p>
                  {search && (
                    <p className="text-xs mt-1">Try adjusting your search term</p>
                  )}
                </td>
              </tr>
            )}
            {kits.map((kit) => (
              <tr
                key={kit.id}
                className="border-b border-edge/50 hover:bg-raised/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/products/kits/${kit.id}`}
                    className="text-accent hover:text-accent font-medium transition-colors"
                  >
                    {kit.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-secondary font-mono text-xs">
                  {kit.sku ?? '\u2014'}
                </td>
                <td className="px-4 py-3 text-right">{fmt(kit.price)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 bg-raised rounded text-xs font-medium">
                    {kit.item_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    kit.is_active
                      ? 'bg-accent/10 text-accent'
                      : 'bg-danger/10 text-danger'
                  }`}>
                    {kit.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-secondary">
          <span>
            Showing {((pagination.page - 1) * pagination.limit) + 1}
            {'\u2013'}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 bg-surface border border-edge rounded text-secondary hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 bg-surface border border-edge rounded text-secondary hover:bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 backdrop-blur-sm">
          <div className="bg-surface border border-edge rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-edge">
              <h3 className="text-lg font-semibold text-primary">Create Product Kit</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {createError && (
                <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-bg border border-edge rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="Kit name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-bg border border-edge rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">SKU</label>
                  <input
                    type="text"
                    value={createForm.sku}
                    onChange={(e) => setCreateForm(f => ({ ...f, sku: e.target.value }))}
                    className="w-full bg-bg border border-edge rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.price}
                    onChange={(e) => setCreateForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full bg-bg border border-edge rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-edge flex justify-end gap-3">
              <button
                onClick={() => { setShowCreate(false); setCreateError('') }}
                className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 bg-accent hover:bg-accent text-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Kit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
