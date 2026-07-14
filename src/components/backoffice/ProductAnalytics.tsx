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
    void Promise.resolve().then(fetchAnalytics)
  }, [fetchAnalytics])

  return (
    <div className="bg-surface rounded-xl border border-edge p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">
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
                  ? 'bg-accent text-primary'
                  : 'bg-raised text-secondary hover:text-primary hover:bg-raised'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-edge-strong border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-danger text-sm py-4">{error}</p>
      )}

      {!loading && !error && data && isAllZeros(data) && (
        <p className="text-muted text-sm py-6 text-center">
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
            subColor={data.margin_percentage >= 0 ? 'text-accent' : 'text-danger'}
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
    <div className="bg-bg rounded-lg border border-edge p-3">
      <p className="text-xs text-secondary mb-1">{label}</p>
      <p className={`font-semibold text-primary ${small ? 'text-sm' : 'text-lg'}`}>
        {value}
      </p>
      {subValue && (
        <p className={`text-xs mt-0.5 ${subColor ?? 'text-secondary'}`}>
          {subValue}
        </p>
      )}
    </div>
  )
}
