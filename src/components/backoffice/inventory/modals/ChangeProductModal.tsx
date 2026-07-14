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
        <div className="rounded-lg bg-warning/30 border border-warning/50 p-3">
          <p className="text-sm text-warning">
            Changing the product assignment will update pricing, category, and
            compliance data for this inventory item. This cannot be undone.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-secondary uppercase mb-1">
            Current Product
          </label>
          <div className="w-full px-3 py-2 bg-bg border border-edge-strong rounded-lg text-sm text-primary opacity-60">
            {currentProduct ? (
              <div className="space-y-0.5">
                <p className="font-medium">{currentProduct.name}</p>
                <p className="text-xs text-secondary">
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
              <span className="text-muted">No product assigned</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-secondary uppercase mb-1">
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
            className="w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          {loading && (
            <p className="mt-1 text-xs text-muted">Searching...</p>
          )}
          {!loading && products.length > 0 && !selectedProductId && (
            <div className="mt-1 bg-surface border border-edge rounded-lg max-h-48 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProductId(p.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-raised text-secondary"
                >
                  <span className="font-medium text-primary">{p.name}</span>
                  <span className="text-xs text-muted ml-2">
                    {[p.sku && `SKU: ${p.sku}`, p.brand && p.brand]
                      .filter(Boolean)
                      .join(' | ')}
                  </span>
                </button>
              ))}
            </div>
          )}
          {selectedProduct && (
            <div className="mt-2 px-3 py-2 bg-accent/20 border border-accent/40 rounded-lg text-sm text-accent">
              Selected: {selectedProduct.name}
              {selectedProduct.sku && (
                <span className="text-xs text-accent/70 ml-2">
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
            className="mt-0.5 rounded border-edge-strong bg-bg text-accent focus:ring-accent"
          />
          <span className="text-sm text-secondary">
            I understand this changes the product assignment for this package
          </span>
        </label>
      </div>
    </BaseActionModal>
  )
}
