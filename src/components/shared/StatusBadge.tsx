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
  success: 'bg-emerald-600/20 text-emerald-400',
  warning: 'bg-amber-600/20 text-amber-400',
  error: 'bg-red-600/20 text-red-400',
  info: 'bg-blue-600/20 text-blue-400',
  default: 'bg-gray-600/20 text-gray-400',
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
