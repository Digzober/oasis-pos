'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { isBarcodeInput } from '@/lib/utils/barcodeDetector'

interface SearchResult {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  rec_price: number
  med_price: number | null
  brand_name: string | null
  category_name: string | null
  strain_name: string | null
  quantity_available: number
  thc_percentage: number | null
  is_cannabis: boolean
  weight_grams: number | null
}

interface BarcodeScanResult {
  product: {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    rec_price: number
    med_price: number | null
    is_cannabis: boolean
    weight_grams: number | null
    flower_equivalent: number | null
    brand_name: string | null
    category_name: string | null
    strain_name: string | null
  }
  inventory_item: {
    id: string
    biotrack_barcode: string | null
    quantity: number
    quantity_reserved: number
  }
  match_type: string
}

interface ProductSearchProps {
  onSelect: (product: SearchResult) => void
  onBarcodeScan?: (result: BarcodeScanResult) => void
  locationId?: string
  categoryId?: string
}

const QUICK_CATEGORIES = ['All', 'Flower', 'Concentrates', 'Edibles', 'Vapes', 'Pre-Rolls', 'Tinctures', 'Topicals', 'Accessories']

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 800
    gain.gain.value = 0.15
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
    setTimeout(() => ctx.close(), 300)
  } catch {
    // Web Audio not available
  }
}

function StockBar({ quantity }: { quantity: number }) {
  const max = 50
  const pct = Math.min((quantity / max) * 100, 100)
  const color =
    quantity === 0
      ? 'bg-danger'
      : quantity <= 10
        ? 'bg-warning'
        : 'bg-accent'
  const trackColor =
    quantity === 0
      ? 'bg-danger/20'
      : quantity <= 10
        ? 'bg-warning/20'
        : 'bg-accent/20'

  return (
    <div className={`w-full h-0.5 rounded-full ${trackColor}`}>
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-bg border border-edge rounded-xl p-3 animate-pulse">
      <div className="flex items-center justify-between mb-1.5">
        <div className="h-3 w-16 bg-surface rounded" />
        <div className="h-4 w-12 bg-surface rounded" />
      </div>
      <div className="h-4 w-full bg-surface rounded mb-1" />
      <div className="h-3 w-3/4 bg-surface rounded mb-2.5" />
      <div className="h-3 w-2/3 bg-surface rounded mb-2" />
      <div className="h-0.5 w-full bg-surface rounded" />
    </div>
  )
}

export default function ProductSearch({ onSelect, onBarcodeScan, locationId, categoryId }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-browse when category changes
  useEffect(() => {
    if (categoryId) {
      search(query, categoryId)
    } else if (query.length < 2) {
      setResults([])
      setIsOpen(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2500)
  }

  const scanBarcode = useCallback(async (code: string) => {
    setIsScanning(true)
    setIsLoading(true)
    try {
      const locParam = locationId ? `?location_id=${locationId}` : ''
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(code)}${locParam}`)
      if (res.ok) {
        const data: BarcodeScanResult = await res.json()
        playBeep()
        if (onBarcodeScan) {
          onBarcodeScan(data)
        }
        showToast(`Added: ${data.product.name}`, 'success')
        setQuery('')
        setResults([])
        setIsOpen(false)
      } else {
        showToast(`Barcode ${code} not found`, 'error')
      }
    } catch {
      showToast('Scan failed — connection error', 'error')
    } finally {
      setIsLoading(false)
      setIsScanning(false)
      inputRef.current?.focus()
    }
  }, [locationId, onBarcodeScan])

  const abortRef = useRef<AbortController | null>(null)

  const search = useCallback(async (q: string, catId?: string) => {
    if (q.length < 2 && !catId) {
      setResults([])
      setIsOpen(false)
      return
    }
    // Cancel previous request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.length >= 2) params.set('query', q)
      if (catId) params.set('category_id', catId)
      const res = await fetch(`/api/products/search?${params}`, { signal: controller.signal })
      if (res.ok) {
        const data = await res.json()
        setResults(data.results ?? [])
        setIsOpen(true)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setSelectedIndex(-1)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(value, categoryId), 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('')
      setResults([])
      setIsOpen(false)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()

      // If grid result selected, use it
      if (selectedIndex >= 0 && filteredResults[selectedIndex]) {
        selectResult(filteredResults[selectedIndex])
        return
      }

      // Check if input looks like a barcode
      if (isBarcodeInput(query.trim())) {
        if (timerRef.current) clearTimeout(timerRef.current)
        scanBarcode(query.trim())
        return
      }

      // Otherwise do text search
      if (query.length >= 2) {
        if (timerRef.current) clearTimeout(timerRef.current)
        search(query)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filteredResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    }
  }

  const selectResult = (product: SearchResult) => {
    onSelect(product)
    setQuery('')
    setResults([])
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  // Client-side category filtering
  const filteredResults = categoryFilter === 'All'
    ? results
    : results.filter((r) => {
        const cat = (r.category_name ?? '').toLowerCase()
        const filter = categoryFilter.toLowerCase()
        // Match category_name containing the filter word (e.g. "Flower" matches "Flower", "Pre-Rolls" matches "Pre-Roll")
        return cat.includes(filter.replace(/-/g, ' ').replace(/s$/, ''))
      })

  return (
    <div className="flex flex-col gap-3">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-50 shadow-xl border transition-opacity ${
            toast.type === 'success'
              ? 'bg-surface border-accent/30 text-primary'
              : 'bg-surface border-danger/30 text-primary'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search products, scan barcode..."
          className="w-full h-12 bg-bg border border-edge rounded-xl px-4 pr-12 text-primary placeholder:text-muted text-sm shadow-inner focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors"
        />
        {isLoading ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-edge-strong border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : isScanning ? (
          <svg
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M8 4v16M12 4v16M16 4v16" />
          </svg>
        ) : (
          <svg
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M8 4v16M12 4v16M16 4v16" />
          </svg>
        )}
      </div>

      {/* Category Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {QUICK_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategoryFilter(cat)
              setSelectedIndex(-1)
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              categoryFilter === cat
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-surface/80 text-secondary border border-edge/50 hover:border-edge-strong'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Card Grid */}
      {isOpen && isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isOpen && !isLoading && filteredResults.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredResults.map((r, idx) => {
            const isOutOfStock = r.quantity_available === 0
            const metaParts = [
              r.strain_name,
              r.category_name,
              r.thc_percentage != null ? `${r.thc_percentage}%` : null,
            ].filter(Boolean)

            return (
              <button
                key={r.id}
                onClick={() => !isOutOfStock && selectResult(r)}
                className={`relative bg-bg border rounded-xl p-3 text-left transition-all duration-150 ${
                  isOutOfStock
                    ? 'opacity-40 pointer-events-none border-edge'
                    : idx === selectedIndex
                      ? 'border-accent/60 bg-surface/60'
                      : 'border-edge cursor-pointer hover:border-accent/40 hover:bg-surface/60 active:scale-[0.97] active:border-accent/60'
                }`}
              >
                {isOutOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className="text-xs font-semibold text-danger bg-bg/80 px-2 py-0.5 rounded">Out of Stock</span>
                  </div>
                )}

                {/* Brand + Price Row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {r.is_cannabis && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    )}
                    <span className="text-[11px] text-muted truncate">
                      {r.brand_name ?? 'Unbranded'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-primary tabular-nums shrink-0 ml-2">
                    ${r.rec_price.toFixed(2)}
                  </span>
                </div>

                {/* Product Name */}
                <p className="text-sm font-medium text-primary line-clamp-2 mb-1.5 leading-snug">
                  {r.name}
                </p>

                {/* Metadata */}
                {metaParts.length > 0 && (
                  <p className="text-[11px] text-muted truncate mb-2.5">
                    {metaParts.join(' \u00b7 ')}
                  </p>
                )}

                {/* Stock Bar + Count */}
                <div className="mt-auto">
                  <StockBar quantity={r.quantity_available} />
                  <p className={`text-[11px] mt-1 tabular-nums ${
                    r.quantity_available === 0
                      ? 'text-danger'
                      : r.quantity_available <= 10
                        ? 'text-warning'
                        : 'text-muted'
                  }`}>
                    {r.quantity_available} in stock
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {isOpen && !isLoading && filteredResults.length === 0 && (query.length >= 2 || categoryFilter !== 'All') && (
        <div className="flex flex-col items-center justify-center py-16 text-muted">
          <svg
            className="w-10 h-10 mb-3 opacity-30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">No products found</p>
          <p className="text-xs mt-1 text-muted">Try a different search or scan a barcode</p>
        </div>
      )}
    </div>
  )
}
