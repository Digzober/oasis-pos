import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return <select ref={ref} className={cn(
    'h-9 w-full rounded-sm border border-edge bg-surface px-3 text-[13px] text-primary transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )} {...props}>{children}</select>
})
