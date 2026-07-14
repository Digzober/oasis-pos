import type { ReactNode } from 'react'
import { Card } from './Card'
import { cn } from '@/lib/utils/cn'

interface StatCardProps { label: string; value: ReactNode; detail?: ReactNode; icon?: ReactNode; className?: string }

export function StatCard({ label, value, detail, icon, className }: StatCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{value}</p>
          {detail && <p className="mt-2 text-xs text-secondary">{detail}</p>}
        </div>
        {icon && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">{icon}</div>}
      </div>
    </Card>
  )
}
