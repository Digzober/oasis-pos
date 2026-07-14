'use client'

import { cn } from '@/lib/utils/cn'

const STATUS_MAP: Record<string, string> = {
  active: 'success', completed: 'success', passed: 'success', synced: 'success', ready: 'success', delivered: 'success',
  pending: 'warning', preparing: 'warning', in_transit: 'warning', scheduled: 'warning', syncing: 'warning',
  cancelled: 'error', failed: 'error', banned: 'error', expired: 'error', voided: 'error', rejected: 'error',
  draft: 'default', inactive: 'default', paused: 'default',
  medical: 'info', confirmed: 'info',
}

const VARIANT_STYLES: Record<string, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  default: 'bg-raised text-muted',
}

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, variant, size = 'sm' }: StatusBadgeProps) {
  const resolved = variant ?? STATUS_MAP[status.toLowerCase()] ?? 'default'
  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-medium capitalize',
      size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      VARIANT_STYLES[resolved],
    )}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
