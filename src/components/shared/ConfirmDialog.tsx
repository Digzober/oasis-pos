'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, loading }: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!open) return null

  const handleConfirm = async () => {
    setIsLoading(true)
    try { await onConfirm() } finally { setIsLoading(false) }
  }

  const btnClass = variant === 'destructive'
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-emerald-600 hover:bg-emerald-500 text-white'

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-50">{title}</h2>
          <p className="text-sm text-gray-400">{description}</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => onOpenChange(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">{cancelLabel}</button>
            <button onClick={handleConfirm} disabled={isLoading || loading}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50', btnClass)}>
              {isLoading || loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
