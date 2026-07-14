'use client'

import { cn } from '@/lib/utils/cn'

interface SwitchProps { checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; label: string; className?: string }

export function Switch({ checked, onCheckedChange, disabled, label, className }: SwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onCheckedChange(!checked)}
      className={cn('relative h-6 w-11 rounded-full border transition disabled:opacity-50', checked ? 'border-accent bg-accent' : 'border-edge-strong bg-raised', className)}>
      <span className={cn('absolute top-0.5 h-4.5 w-4.5 rounded-full bg-accent-fg shadow-sm transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  )
}
