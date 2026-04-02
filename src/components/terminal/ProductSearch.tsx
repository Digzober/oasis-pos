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

export default function ProductSearch({ onSelect, onBarcodeScan, locationId, categoryId }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
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

      // If dropdown result selected, use it
      if (selectedIndex >= 0 && results[selectedIndex]) {
        selectResult(results[selectedIndex])
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
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
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

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div
          className={`absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-medium z-50 shadow-lg transition-opacity ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="relative">
        {/* Icon: barcode or search */}
        {isScanning ? (
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M8 4v16M12 4v16M16 4v16" />
          </svg>
        ) : (
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search products, scan barcode..."
          className="w-full h-12 pl-12 pr-4 bg-gray-800 border border-gray-700 rounded-xl text-gray-50 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto">
            {results.map((r, idx) => (
              <button
                key={r.id}
                onClick={() => selectResult(r)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                  idx === selectedIndex ? 'bg-gray-700' : 'hover:bg-gray-700/50'
                } ${idx > 0 ? 'border-t border-gray-700/50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-50 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {[r.brand_name, r.category_name, r.strain_name].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-gray-50 font-medium tabular-nums">
                    ${r.rec_price.toFixed(2)}
                  </p>
                  {r.quantity_available > 0 ? (
                    <p className="text-xs text-gray-400 tabular-nums">{r.quantity_available} avail</p>
                  ) : (
                    <p className="text-xs text-red-400">Out of Stock</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {isOpen && results.length === 0 && query.length >= 2 && !isLoading && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-40 p-6 text-center text-gray-500 text-sm">
            No products found
          </div>
        </>
      )}
    </div>
  )
}
