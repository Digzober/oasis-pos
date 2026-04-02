'use client'

import { useState, useEffect, useRef } from 'react'
import BaseActionModal from './BaseActionModal'

interface CurrentProduct {
  id: string
  name: string
  sku: string | null
  brand: string | null
  category: string | null
}

interface ChangeProductModalProps {
  itemId: string
  currentProduct: CurrentProduct | null
  onClose: () => void
  onSuccess: () => void
}

interface ProductResult {
  id: string
  name: string
  sku: string | null
  brand: string | null
}

export default function ChangeProductModal({
  itemId,
  currentProduct,
  onClose,
  onSuccess,
}: ChangeProductModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<ProductResult[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!searchQuery.trim()) {
      setProducts([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(searchQuery)}&per_page=20`
        )
        if (res.ok) {
          const data = await res.json()
          setProducts(data)
        }
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery])

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  async function handleSubmit() {
    const res = await fetch(`/api/inventory/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: selectedProductId }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to change product')
    }
    onSuccess()
    onClose()
  }

  return (
    <BaseActionModal
      title="Change Product Assignment"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Change Product"
      submitDisabled={!selectedProductId || !confirmed}
      wide
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-900/30 border border-amber-700/50 p-3">
          <p className="text-sm text-amber-300">
            Changing the product assignment will update pricing, category, and
            compliance data for this inventory item. This cannot be undone.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Current Product
          </label>
          <div className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 opacity-60">
            {currentProduct ? (
              <div className="space-y-0.5">
                <p className="font-medium">{currentProduct.name}</p>
                <p className="text-xs text-gray-400">
                  {[
                    currentProduct.sku && `SKU: ${currentProduct.sku}`,
                    currentProduct.brand && `Brand: ${currentProduct.brand}`,
                    currentProduct.category &&
                      `Category: ${currentProduct.category}`,
                  ]
                    .filter(Boolean)
                    .join(' | ')}
                </p>
              </div>
            ) : (
              <span className="text-gray-500">No product assigned</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
            Search New Product
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSelectedProductId(null)
              setConfirmed(false)
            }}
            placeholder="Search by name or SKU..."
            className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {loading && (
            <p className="mt-1 text-xs text-gray-500">Searching...</p>
          )}
          {!loading && products.length > 0 && !selectedProductId && (
            <div className="mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProductId(p.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-gray-300"
                >
                  <span className="font-medium text-gray-50">{p.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {[p.sku && `SKU: ${p.sku}`, p.brand && p.brand]
                      .filter(Boolean)
                      .join(' | ')}
                  </span>
                </button>
              ))}
            </div>
          )}
          {selectedProduct && (
            <div className="mt-2 px-3 py-2 bg-emerald-900/20 border border-emerald-700/40 rounded-lg text-sm text-emerald-300">
              Selected: {selectedProduct.name}
              {selectedProduct.sku && (
                <span className="text-xs text-emerald-400/70 ml-2">
                  SKU: {selectedProduct.sku}
                </span>
              )}
            </div>
          )}
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-400">
            I understand this changes the product assignment for this package
          </span>
        </label>
      </div>
    </BaseActionModal>
  )
}
