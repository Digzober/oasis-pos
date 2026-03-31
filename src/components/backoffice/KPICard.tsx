'use client'

interface KPICardProps {
  label: string
  value: string | number
  format?: 'number' | 'currency'
}

export function KPICard({ label, value, format = 'number' }: KPICardProps) {
  const formatted = format === 'currency'
    ? Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : Number(value).toLocaleString()

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-50 mt-1 tabular-nums">{formatted}</p>
    </div>
  )
}
