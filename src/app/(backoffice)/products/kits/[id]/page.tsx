'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, Plus, Search, X, GripVertical } from 'lucide-react'

interface KitItem {
  id: string
  product_id: string
  quantity: number
  sort_order: number
  product_name: string
  product_sku: string | null
  product_price: number | null
}

interface Kit {
  id: string
  name: string
  description: string | null
  sku: string | null
  price: number | null
  is_active: boolean
  items: KitItem[]
}

interface ProductSearchResult {
  id: string
  name: string
  sku: string | null
  rec_price: number | null
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function KitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [kit, setKit] = useState<Kit | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const [form, setForm] = useState({ name: '', description: '', sku: '', price: '' })

  const [showAddProduct, setShowAddProduct] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [addQuantity, setAddQuantity] = useState('1')
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null)
  const [addingItem, setAddingItem] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)

  const fetchKit = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/product-kits/${id}`)
      if (!res.ok) throw new Error('Failed to fetch kit')
      const data = await res.json()
      setKit(data.kit)
      setForm({
        name: data.kit.name ?? '',
        description: data.kit.description ?? '',
        sku: data.kit.sku ?? '',
        price: data.kit.price != null ? String(data.kit.price) : '',
      })
    } catch {
      setKit(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchKit()
  }, [fetchKit])

  // Product search
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearchingProducts(true)
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(productSearch)}&limit=10`)
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        setProductResults(
          (data.products ?? []).map((p: { id: string; name: string; sku: string | null; rec_price: number | null }) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            rec_price: p.rec_price,
          }))
        )
      } catch {
        setProductResults([])
      } finally {
        setSearchingProducts(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSaveMessage('Name is required')
      return
    }
    setSaving(true)
    setSaveMessage('')
    try {
      const res = await fetch(`/api/product-kits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          sku: form.sku.trim() || null,
          price: form.price ? parseFloat(form.price) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
      setSaveMessage('Saved successfully')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleAddItem = async () => {
    if (!selectedProduct) return
    const qty = parseFloat(addQuantity)
    if (!qty || qty <= 0) return

    setAddingItem(true)
    try {
      const res = await fetch(`/api/product-kits/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          quantity: qty,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to add item')
      }
      setShowAddProduct(false)
      setSelectedProduct(null)
      setProductSearch('')
      setAddQuantity('1')
      fetchKit()
    } catch {
      // Error handled by UI state
    } finally {
      setAddingItem(false)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    setRemovingItemId(itemId)
    try {
      const res = await fetch(`/api/product-kits/${id}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      })
      if (!res.ok) throw new Error('Failed to remove item')
      fetchKit()
    } catch {
      // Error handled by UI state
    } finally {
      setRemovingItemId(null)
    }
  }

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this kit?')) return
    try {
      const res = await fetch(`/api/product-kits/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to deactivate')
      window.location.href = '/products/kits'
    } catch {
      setSaveMessage('Failed to deactivate kit')
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-800/50 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!kit) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center text-gray-400">
        <p>Kit not found</p>
        <Link href="/products/kits" className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block">
          Back to kits
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/products/kits"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-50">{kit.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {kit.items.length} item{kit.items.length !== 1 ? 's' : ''} in kit
            </p>
          </div>
        </div>
        <button
          onClick={handleDeactivate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 size={14} />
          Deactivate
        </button>
      </div>

      {/* Kit Info Form */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Kit Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saveMessage && (
            <span className={`text-sm ${saveMessage.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
              {saveMessage}
            </span>
          )}
        </div>
      </div>

      {/* Kit Items */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Kit Items</h2>
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>

        {kit.items.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>No items in this kit yet</p>
            <button
              onClick={() => setShowAddProduct(true)}
              className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 transition-colors"
            >
              Add your first product
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                <th className="w-8 px-2 py-3" />
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">SKU</th>
                <th className="text-right px-4 py-3">Unit Price</th>
                <th className="text-center px-4 py-3">Qty</th>
                <th className="text-right px-4 py-3">Subtotal</th>
                <th className="w-12 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="text-gray-200">
              {kit.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                  <td className="px-2 py-3 text-center text-gray-600">
                    <GripVertical size={14} />
                  </td>
                  <td className="px-4 py-3 font-medium">{item.product_name}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {item.product_sku ?? '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(item.product_price)}</td>
                  <td className="px-4 py-3 text-center">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">
                    {item.product_price != null ? fmt(item.product_price * item.quantity) : '\u2014'}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removingItemId === item.id}
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-600">
                <td colSpan={5} className="px-4 py-3 text-right font-medium text-gray-300">
                  Items Total
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-50">
                  {fmt(
                    kit.items.reduce(
                      (sum, item) => sum + (item.product_price != null ? item.product_price * item.quantity : 0),
                      0,
                    )
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-50">Add Product to Kit</h2>
              <button
                onClick={() => { setShowAddProduct(false); setSelectedProduct(null); setProductSearch(''); setAddQuantity('1') }}
                className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Product Search */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Search Product</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setSelectedProduct(null) }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Type to search products..."
                    autoFocus
                  />
                </div>
                {/* Search Results */}
                {productSearch.trim() && !selectedProduct && (
                  <div className="mt-2 max-h-48 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg">
                    {searchingProducts && (
                      <div className="px-4 py-3 text-xs text-gray-500">Searching...</div>
                    )}
                    {!searchingProducts && productResults.length === 0 && (
                      <div className="px-4 py-3 text-xs text-gray-500">No products found</div>
                    )}
                    {productResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setProductSearch(p.name) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0"
                      >
                        <div className="text-sm text-gray-200 font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                          {p.sku && <span>SKU: {p.sku}</span>}
                          <span>{fmt(p.rec_price)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {/* Selected Product */}
                {selectedProduct && (
                  <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-emerald-300 font-medium">{selectedProduct.name}</div>
                      <div className="text-xs text-gray-400">
                        {selectedProduct.sku && <span>SKU: {selectedProduct.sku} | </span>}
                        {fmt(selectedProduct.rec_price)}
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedProduct(null); setProductSearch('') }}
                      className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  className="w-32 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowAddProduct(false); setSelectedProduct(null); setProductSearch(''); setAddQuantity('1') }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!selectedProduct || addingItem || !addQuantity || parseFloat(addQuantity) <= 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingItem ? 'Adding...' : 'Add to Kit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
