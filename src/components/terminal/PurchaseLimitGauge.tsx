'use client'

import type { PurchaseLimitResult } from '@/lib/calculations/purchaseLimit.types'

export default function PurchaseLimitGauge({ limit }: { limit: PurchaseLimitResult | null }) {
  if (!limit || limit.limit_oz === 0) return null

  const pct = Math.min(limit.percentage_used, 100)
  const color =
    pct <= 50 ? 'bg-emerald-500' :
    pct <= 75 ? 'bg-yellow-500' :
    pct <= 95 ? 'bg-orange-500' :
    'bg-red-500'

  return (
    <div className="px-4 py-2 border-b border-gray-700">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-400">Purchase Limit</span>
        <span className={`font-medium ${pct > 95 ? 'text-red-400' : 'text-gray-300'}`}>
          {limit.current_flower_equivalent_oz.toFixed(2)} / {limit.limit_oz} oz
        </span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!limit.allowed && (
        <p className="text-red-400 text-[10px] mt-1 font-medium">Exceeds limit — cannot complete sale</p>
      )}
    </div>
  )
}
