'use client'

import { useState, useEffect } from 'react'
import { useOnlineCart } from '@/stores/onlineCartStore'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  slug: string
  master_category: string | null
}

interface Product {
  id: string
  name: string
  rec_price: number
  brand_name: string | null
  category_name: string | null
  strain_name: string | null
  thc_percentage: number | null
  quantity_available: number
  is_cannabis: boolean
}

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const { addItem, items } = useOnlineCart()

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search.length >= 2) params.set('query', search)
    if (selectedCategory) params.set('category_id', selectedCategory)
    if (!search && !selectedCategory) { setProducts([]); setLoading(false); return }

    fetch(`/api/products/search?${params}`)
      .then(r => r.json())
      .then(d => setProducts(d.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, selectedCategory])

  const handleAddToCart = (p: Product) => {
    addItem({ product_id: p.id, name: p.name, price: p.rec_price, image_url: null })
    setToast(`Added ${p.name}`)
    setTimeout(() => setToast(null), 2000)
  }

  const cartCount = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Menu</h1>
        <Link href="/cart" className="relative px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium">
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>
          )}
        </Link>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search products..."
        className="w-full h-10 px-4 border rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {/* Categories */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors ${!selectedCategory ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >All</button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${selectedCategory === cat.id ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >{cat.name}</button>
        ))}
      </div>

      {/* Products */}
      {!search && !selectedCategory ? (
        <p className="text-center text-gray-500 py-12">Select a category or search to browse products</p>
      ) : loading ? (
        <p className="text-center text-gray-500 py-8">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No products found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="border rounded-xl p-4 flex flex-col">
              <h3 className="font-medium mb-1">{p.name}</h3>
              <p className="text-xs text-gray-500 mb-2">
                {[p.brand_name, p.category_name, p.strain_name].filter(Boolean).join(' · ')}
              </p>
              {p.thc_percentage != null && (
                <p className="text-xs text-gray-400 mb-2">THC: {p.thc_percentage}%</p>
              )}
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-lg font-bold">{fmt(p.rec_price)}</span>
                {p.quantity_available > 0 ? (
                  <button onClick={() => handleAddToCart(p)} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500">
                    Add to Cart
                  </button>
                ) : (
                  <span className="text-sm text-red-500">Out of Stock</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
