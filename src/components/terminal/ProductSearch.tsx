'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

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

interface ProductSearchProps {
  onSelect: (product: SearchResult) => void
}

export default function ProductSearch({ onSelect }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/products/search?query=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results ?? [])
        setIsOpen(true)
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setSelectedIndex(-1)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(value), 300)
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
      if (selectedIndex >= 0 && results[selectedIndex]) {
        selectResult(results[selectedIndex])
      } else if (query.length >= 2) {
        // Immediate search (barcode scanner sends Enter)
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
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
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
                  idx === selectedIndex ? 'bg-gray-700' : 'hover:bg-gray-750 hover:bg-gray-700/50'
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
                    <p className="text-xs text-gray-400 tabular-nums">
                      {r.quantity_available} avail
                    </p>
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
