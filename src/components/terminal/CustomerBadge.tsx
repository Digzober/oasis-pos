'use client'

import { useCart } from '@/hooks/useCart'

export default function CustomerBadge({ onViewProfile }: { onViewProfile?: () => void }) {
  const { customerId, customerName, isMedical } = useCart()
  const setCustomer = useCart((s) => s.setCustomer)

  if (!customerId) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-lg">
      <button onClick={onViewProfile} className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-gray-50 truncate">{customerName}</span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isMedical ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
          }`}
        >
          {isMedical ? 'MED' : 'REC'}
        </span>
      </button>
      <button
        onClick={() => setCustomer(null, 'Walk-in Customer', false)}
        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors shrink-0"
        aria-label="Remove customer"
      >
        ✕
      </button>
    </div>
  )
}
