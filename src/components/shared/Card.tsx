import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-sm border border-edge bg-surface p-3 shadow-sm', className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('-mx-3 -mt-3 mb-3 border-b border-edge px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-muted', className)}
      {...props}
    />
  )
}
