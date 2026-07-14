'use client'

import { useState, useEffect } from 'react'

interface PriceHistoryEntry {
  id: string
  field_edited: string
  previous_value: string | null
  new_value: string | null
  event_timestamp: string
  employee_id: string | null
}

const FIELD_LABELS: Record<string, string> = {
  rec_price: 'Rec Price',
  med_price: 'Med Price',
  cost_price: 'Cost Price',
  category_id: 'Category',
}

function formatFieldName(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatValue(field: string, value: string | null): string {
  if (value === null || value === '') {
    return '-'
  }
  const priceFields = ['rec_price', 'med_price', 'cost_price']
  if (priceFields.includes(field)) {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      return `$${num.toFixed(2)}`
    }
  }
  return value
}

export default function ProductPriceHistory({ productId }: { productId: string }) {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/products/${productId}/price-history`)
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? 'Failed to load price history')
          setLoading(false)
          return
        }
        const d = await res.json()
        setHistory(d.history ?? [])
      } catch {
        setError('Connection error')
      }
      setLoading(false)
    }
    fetchHistory()
  }, [productId])

  return (
    <div className="bg-surface rounded-xl border border-edge p-4">
      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">
        Price History
      </h3>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-edge-strong border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-danger text-sm py-4">{error}</p>
      )}

      {!loading && !error && history.length === 0 && (
        <p className="text-muted text-sm py-6 text-center">
          No price changes recorded.
        </p>
      )}

      {!loading && !error && history.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge">
                <th className="text-left text-xs text-secondary font-medium py-2 pr-4">Date</th>
                <th className="text-left text-xs text-secondary font-medium py-2 pr-4">Field</th>
                <th className="text-left text-xs text-secondary font-medium py-2 pr-4">Previous</th>
                <th className="text-left text-xs text-secondary font-medium py-2">New</th>
              </tr>
            </thead>
            <tbody>
              {history.map(entry => (
                <tr key={entry.id} className="border-b border-edge/50 last:border-0">
                  <td className="py-2.5 pr-4 text-secondary whitespace-nowrap">
                    {formatTimestamp(entry.event_timestamp)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="inline-block px-2 py-0.5 rounded bg-raised text-secondary text-xs font-medium">
                      {formatFieldName(entry.field_edited)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-secondary">
                    {formatValue(entry.field_edited, entry.previous_value)}
                  </td>
                  <td className="py-2.5 text-primary font-medium">
                    {formatValue(entry.field_edited, entry.new_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
