'use client'

import { useCart } from '@/hooks/useCart'

export default function CustomerBadge({ onViewProfile }: { onViewProfile?: () => void }) {
  const customerId = useCart((s) => s.customerId)
  const customerName = useCart((s) => s.customerName)
  const customerType = useCart((s) => s.customerType)
  const setCustomer = useCart((s) => s.setCustomer)

  if (!customerId) return null

  const isMedical = customerType === 'medical'

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-raised/50 rounded-lg">
      <button onClick={onViewProfile} className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-primary truncate">{customerName}</span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isMedical ? 'bg-info text-primary' : 'bg-raised text-secondary'
          }`}
        >
          {isMedical ? 'MED' : 'REC'}
        </span>
      </button>
      <button
        onClick={() => setCustomer(null)}
        className="w-5 h-5 flex items-center justify-center text-secondary hover:text-danger transition-colors shrink-0"
        aria-label="Remove customer"
      >
        ✕
      </button>
    </div>
  )
}
