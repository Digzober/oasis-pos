'use client'

import { cn } from '@/lib/utils/cn'

export interface TabItem<T extends string = string> { id: T; label: string }
interface TabsProps<T extends string> { items: readonly TabItem<T>[]; value: T; onValueChange: (value: T) => void; ariaLabel: string; className?: string }

export function Tabs<T extends string>({ items, value, onValueChange, ariaLabel, className }: TabsProps<T>) {
  return (
    <div className={cn('flex gap-1 border-b border-edge', className)} role="tablist" aria-label={ariaLabel}>
      {items.map(item => <button key={item.id} type="button" role="tab" aria-selected={value === item.id} onClick={() => onValueChange(item.id)}
        className={cn('border-b-2 px-3 py-2 text-sm font-medium transition', value === item.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-primary')}>
        {item.label}
      </button>)}
    </div>
  )
}
