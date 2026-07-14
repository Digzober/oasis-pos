'use client'

import type { ReactNode } from 'react'
import { StatCard } from '@/components/shared/StatCard'

interface KPICardProps {
  label: string
  value: string | number
  format?: 'number' | 'currency'
  delta?: number | null
  icon?: ReactNode
}

export function KPICard({ label, value, format = 'number', delta, icon }: KPICardProps) {
  const formatted = format === 'currency'
    ? Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : Number(value).toLocaleString()

  return <StatCard label={label} value={formatted} delta={delta} icon={icon} />
}
