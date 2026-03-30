'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useCart } from '@/hooks/useCart'

interface SearchResult {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  is_medical: boolean
  status: string
  last_visit_at: string | null
  lifetime_spend: number
  loyalty_points: number
}

interface CustomerSearchPanelProps {
  onClose: () => void
  onNewCustomer: () => void
}

export default function CustomerSearchPanel({ onClose, onNewCustomer }: CustomerSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const setCustomer = useCart((s) => s.setCustomer)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearched(false); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.customers ?? [])
      }
    } catch { /* ignore */ }
    setIsLoading(false)
    setSearched(true)
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(value), 300)
  }

  const selectCustomer = (c: SearchResult) => {
    if (c.status === 'banned') return
    setCustomer({ id: c.id, name: c.full_name, type: c.is_medical ? 'medical' : 'recreational', groupIds: [], segmentIds: [], isFirstTime: false })
    onClose()
  }

  const skipCustomer = () => {
    setCustomer(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[70vh]">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-gray-50 font-semibold">Customer Lookup</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-lg">✕</button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Name, phone, email, or medical card..."
            className="w-full h-11 px-4 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-2">
          {isLoading && (
            <p className="text-center text-gray-500 text-sm py-6">Searching...</p>
          )}
          {!isLoading && searched && results.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-6">No customers found</p>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCustomer(c)}
              disabled={c.status === 'banned'}
              className={`w-full text-left px-3 py-3 rounded-lg mb-1 transition-colors ${
                c.status === 'banned'
                  ? 'opacity-50 cursor-not-allowed bg-red-900/20'
                  : 'hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-gray-50 font-medium truncate">{c.full_name}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      c.is_medical ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {c.is_medical ? 'MED' : 'REC'}
                  </span>
                  {c.status === 'banned' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white">BANNED</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 tabular-nums shrink-0">
                  {c.loyalty_points} pts
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                {c.phone && <span>{c.phone}</span>}
                {c.email && <span className="truncate">{c.email}</span>}
                {c.last_visit_at && (
                  <span>Last: {new Date(c.last_visit_at).toLocaleDateString()}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-gray-700 flex gap-2">
          <button
            onClick={skipCustomer}
            className="flex-1 h-11 rounded-lg bg-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-600 transition-colors"
          >
            No Customer
          </button>
          <button
            onClick={onNewCustomer}
            className="flex-1 h-11 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors"
          >
            New Customer
          </button>
        </div>
      </div>
    </div>
  )
}
