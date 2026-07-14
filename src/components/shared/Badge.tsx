import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' }
const styles = {
  neutral: 'bg-raised text-secondary', accent: 'bg-accent-soft text-accent', success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger', info: 'bg-info-soft text-info',
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', styles[variant], className)} {...props} />
}
