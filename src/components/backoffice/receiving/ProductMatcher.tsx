'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export interface ProductMatch {
  product_id: string
  product_name: string
  confidence: number
  match_method: 'barcode' | 'exact_name' | 'fuzzy_name' | 'brand_strain' | 'manual'
  sku?: string
  brand_name?: string
  strain_name?: string
}

interface ProductMatcherProps {
  matches: ProductMatch[]
  selectedProductId: string | null
  onSelect: (productId: string, match: ProductMatch) => void
  onSearch: (query: string) => void
  biotrackName: string
  loading?: boolean
  disabled?: boolean
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return 'bg-emerald-600/20 text-emerald-400'
  if (c >= 0.5) return 'bg-amber-600/20 text-amber-400'
  return 'bg-red-600/20 text-red-400'
}

function confidenceLabel(c: number): string {
  if (c >= 0.8) return 'High'
  if (c >= 0.5) return 'Medium'
  return 'Low'
}

function methodLabel(m: string): string {
  switch (m) {
    case 'barcode': return 'Barcode'
    case 'exact_name': return 'Exact'
    case 'fuzzy_name': return 'Fuzzy'
    case 'brand_strain': return 'Brand+Strain'
    case 'manual': return 'Manual'
    default: return m
  }
}

export function ProductMatcher({
  matches, selectedProductId, onSelect, onSearch, biotrackName, loading, disabled,
}: ProductMatcherProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selected = matches.find((m) => m.product_id === selectedProductId)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleSearch = useCallback((q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (q.length >= 2) onSearch(q)
    }, 300)
  }, [onSearch])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const displayed = query.length >= 2
    ? matches.filter((m) =>
        m.product_name.toLowerCase().includes(query.toLowerCase()) ||
        m.sku?.toLowerCase().includes(query.toLowerCase())
      )
    : matches

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="w-full min-h-[40px] px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-left flex items-center justify-between text-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate">{selected.product_name}</span>
            <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${confidenceColor(selected.confidence)}`}>
              {Math.round(selected.confidence * 100)}%
            </span>
          </span>
        ) : (
          <span className="text-gray-500">Select catalog product...</span>
        )}
        <span className="text-gray-500 text-xs ml-2 shrink-0">&#9662;</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-700">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search products by name or SKU..."
                className="w-full h-8 px-2 bg-gray-900 border border-gray-600 rounded text-sm text-gray-50 focus:outline-none"
              />
            </div>

            {biotrackName && (
              <div className="px-3 py-1.5 border-b border-gray-700/50 bg-gray-900/50">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">BioTrack Name</p>
                <p className="text-xs text-gray-400 truncate">{biotrackName}</p>
              </div>
            )}

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-700 border-t-emerald-400 rounded-full animate-spin" />
                </div>
              ) : displayed.length === 0 ? (
                <p className="p-3 text-gray-500 text-xs">No matching products found</p>
              ) : (
                displayed.map((match) => (
                  <button
                    key={match.product_id}
                    onClick={() => {
                      onSelect(match.product_id, match)
                      setOpen(false)
                      setQuery('')
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-700 border-b border-gray-700/30 ${
                      match.product_id === selectedProductId ? 'bg-gray-700/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={match.product_id === selectedProductId ? 'text-emerald-400' : 'text-gray-200'}>
                        {match.product_name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${confidenceColor(match.confidence)}`}>
                          {confidenceLabel(match.confidence)} {Math.round(match.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {match.sku && <span className="text-[10px] text-gray-500">SKU: {match.sku}</span>}
                      {match.brand_name && <span className="text-[10px] text-gray-500">{match.brand_name}</span>}
                      <span className="text-[10px] text-gray-600">{methodLabel(match.match_method)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
