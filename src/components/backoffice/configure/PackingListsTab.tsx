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
    <tr className="border-b border-gray-700/50 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-700 rounded w-3/4" />
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
          <h2 className="text-lg font-semibold text-gray-50">Product Kits / Packing Lists</h2>
          <p className="text-sm text-gray-400 mt-1">
            Bundle products into kits and packing lists
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Create Kit
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search kits by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">SKU</th>
              <th className="text-right px-4 py-3">Price</th>
              <th className="text-center px-4 py-3"># Items</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-gray-200">
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
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
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
                className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/products/kits/${kit.id}`}
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    {kit.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                  {kit.sku ?? '\u2014'}
                </td>
                <td className="px-4 py-3 text-right">{fmt(kit.price)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 bg-gray-700 rounded text-xs font-medium">
                    {kit.item_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    kit.is_active
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
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
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>
            Showing {((pagination.page - 1) * pagination.limit) + 1}
            {'\u2013'}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-gray-50">Create Product Kit</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {createError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Kit name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">SKU</label>
                  <input
                    type="text"
                    value={createForm.sku}
                    onChange={(e) => setCreateForm(f => ({ ...f, sku: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.price}
                    onChange={(e) => setCreateForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreate(false); setCreateError('') }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
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
