'use client'

import { StatCard } from '@/components/shared/StatCard'

interface KPICardProps {
  label: string
  value: string | number
  format?: 'number' | 'currency'
}

export function KPICard({ label, value, format = 'number' }: KPICardProps) {
  const formatted = format === 'currency'
    ? Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : Number(value).toLocaleString()

  return <StatCard label={label} value={formatted} />
}
