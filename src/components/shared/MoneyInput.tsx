'use client'

import { useState } from 'react'
import { roundMoney } from '@/lib/utils/money'

interface MoneyInputProps {
  value: number | null
  onChange: (value: number | null) => void
  label?: string
  error?: string
  placeholder?: string
  min?: number
  max?: number
  disabled?: boolean
}

export function MoneyInput({ value, onChange, placeholder = '0.00', min, max, disabled }: MoneyInputProps) {
  const [display, setDisplay] = useState(value != null ? value.toFixed(2) : '')

  const handleChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '')
    setDisplay(cleaned)
  }

  const handleBlur = () => {
    const num = parseFloat(display)
    if (isNaN(num)) { setDisplay(''); onChange(null); return }
    let rounded = roundMoney(num)
    if (min != null && rounded < min) rounded = min
    if (max != null && rounded > max) rounded = max
    setDisplay(rounded.toFixed(2))
    onChange(rounded)
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">$</span>
      <input type="text" inputMode="decimal" value={display} onChange={(e) => handleChange(e.target.value)} onBlur={handleBlur}
        placeholder={placeholder} disabled={disabled}
        className="h-9 w-full rounded-sm border border-edge bg-surface pl-7 pr-3 text-right text-[13px] tabular-nums text-primary focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-50" />
    </div>
  )
}
