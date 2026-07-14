import type { ReactNode } from 'react'
import { Card } from './Card'
import { cn } from '@/lib/utils/cn'

interface StatCardProps {
  label: string
  value: ReactNode
  delta?: number | null
  detail?: ReactNode
  icon?: ReactNode
  className?: string
}

export function StatCard({ label, value, delta, detail, icon, className }: StatCardProps) {
  const hasDelta = delta !== null && delta !== undefined
  const positive = hasDelta && delta >= 0
  const deltaText = hasDelta
    ? `${positive ? '▲' : '▼'} ${Math.abs(delta).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    : null

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-accent" />
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        {icon && <span className="shrink-0 text-muted [&_svg]:h-3.5 [&_svg]:w-3.5" aria-hidden="true">{icon}</span>}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="min-w-0 text-[22px] font-bold leading-none tabular-nums text-primary">{value}</p>
        {hasDelta && (
          <span
            data-trend={positive ? 'positive' : 'negative'}
            className={cn(
              'mb-px shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums',
              positive ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
            )}
          >
            {deltaText}
          </span>
        )}
      </div>
      {detail && <p className="mt-2 text-[11px] leading-tight text-secondary">{detail}</p>}
    </Card>
  )
}
