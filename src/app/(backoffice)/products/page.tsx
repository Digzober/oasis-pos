'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Product = any

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([])

  const perPage = 25
  const totalPages = Math.ceil(total / perPage)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories ?? []))
    fetch('/api/brands').then(r => r.json()).then(d => setBrands(d.brands ?? []))
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(perPage) })
    if (search) params.set('search', search)
    if (categoryId) params.set('categoryId', categoryId)
    if (brandId) params.set('brandId', brandId)
    if (!showInactive) params.set('isActive', 'true')

    const res = await fetch(`/api/products?${params}`)
    if (res.ok) {
      const data = await res.json()
      setProducts(data.products ?? [])
      setTotal(data.pagination?.total ?? 0)
    }
    setLoading(false)
  }, [page, search, categoryId, brandId, showInactive])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Products</h1>
        <div className="flex gap-2">
          <Link href="/products/brands" className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Brands</Link>
          <Link href="/products/vendors" className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Vendors</Link>
          <Link href="/products/strains" className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Strains</Link>
          <Link href="/products/new" className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">+ New Product</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search name or SKU..." className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 w-64" />
        <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1) }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={brandId} onChange={(e) => { setBrandId(e.target.value); setPage(1) }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50">
          <option value="">All Brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
          Show Inactive
        </label>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">SKU</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Brand</th>
              <th className="text-right px-4 py-3">Rec $</th>
              <th className="text-right px-4 py-3">Med $</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">No products found</td></tr>
            ) : products.map((p: Product) => (
              <tr key={p.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer">
                <td className="px-4 py-2.5">
                  <Link href={`/products/${p.id}/edit`} className="text-gray-50 hover:text-emerald-400">{p.name}</Link>
                </td>
                <td className="px-4 py-2.5 text-gray-400 text-xs tabular-nums">{p.sku}</td>
                <td className="px-4 py-2.5 text-gray-300">{p.category?.name ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-300">{p.brand?.name ?? '—'}</td>
                <td className="px-4 py-2.5 text-right text-gray-50 tabular-nums">{fmt(p.rec_price)}</td>
                <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{p.med_price ? fmt(p.med_price) : '—'}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-xs font-medium ${p.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <span className="text-xs text-gray-400">{total} products</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-xs text-gray-400">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
