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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
      <input type="text" inputMode="decimal" value={display} onChange={(e) => handleChange(e.target.value)} onBlur={handleBlur}
        placeholder={placeholder} disabled={disabled}
        className="w-full h-10 pl-7 pr-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50" />
    </div>
  )
}
