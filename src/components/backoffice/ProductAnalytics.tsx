'use client'

import { useState, useEffect, useCallback } from 'react'

interface AnalyticsData {
  total_units_sold: number
  total_revenue: number
  total_cost: number
  gross_margin: number
  margin_percentage: number
  avg_sale_price: number
  transaction_count: number
  last_sold_at: string | null
  period_days: number
}

const PERIOD_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '1 year', value: 365 },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isAllZeros(data: AnalyticsData): boolean {
  return (
    data.total_units_sold === 0 &&
    data.total_revenue === 0 &&
    data.transaction_count === 0
  )
}

export default function ProductAnalytics({ productId }: { productId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/products/${productId}/analytics?days=${days}`)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to load analytics')
        setLoading(false)
        return
      }
      const d = await res.json()
      setData(d.analytics)
    } catch {
      setError('Connection error')
    }
    setLoading(false)
  }, [productId, days])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Sales Analytics
        </h3>
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                days === opt.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm py-4">{error}</p>
      )}

      {!loading && !error && data && isAllZeros(data) && (
        <p className="text-gray-500 text-sm py-6 text-center">
          No sales data yet for the last {days} days.
        </p>
      )}

      {!loading && !error && data && !isAllZeros(data) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(data.total_revenue)}
          />
          <StatCard
            label="Units Sold"
            value={String(data.total_units_sold)}
          />
          <StatCard
            label="Gross Margin"
            value={formatCurrency(data.gross_margin)}
            subValue={`${data.margin_percentage.toFixed(1)}%`}
            subColor={data.margin_percentage >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
          <StatCard
            label="Avg Sale Price"
            value={formatCurrency(data.avg_sale_price)}
          />
          <StatCard
            label="Transactions"
            value={String(data.transaction_count)}
          />
          <StatCard
            label="Last Sold"
            value={data.last_sold_at ? formatDate(data.last_sold_at) : 'Never'}
            small
          />
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  subValue,
  subColor,
  small,
}: {
  label: string
  value: string
  subValue?: string
  subColor?: string
  small?: boolean
}) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`font-semibold text-gray-50 ${small ? 'text-sm' : 'text-lg'}`}>
        {value}
      </p>
      {subValue && (
        <p className={`text-xs mt-0.5 ${subColor ?? 'text-gray-400'}`}>
          {subValue}
        </p>
      )}
    </div>
  )
}
