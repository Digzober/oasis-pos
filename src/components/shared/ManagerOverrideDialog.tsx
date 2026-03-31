'use client'

import { useState, useRef, useEffect } from 'react'

interface ManagerOverrideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  permission: string
  description: string
  onApproved: (managerId: string) => void
  onDenied: () => void
}

export function ManagerOverrideDialog({ open, onOpenChange, permission, description, onApproved, onDenied }: ManagerOverrideDialogProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (open) {
      setPin('')
      setError('')
      inputRef.current?.focus()
      // Auto-close after 60s
      timeoutRef.current = setTimeout(() => { onDenied(); onOpenChange(false) }, 60000)
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [open, onDenied, onOpenChange])

  if (!open) return null

  const handleSubmit = async () => {
    if (pin.length !== 4) { setError('Enter 4-digit PIN'); return }
    setLoading(true)
    setError('')

    try {
      // Validate PIN against employees
      const res = await fetch('/api/auth/manager-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, permission }),
      })

      if (res.ok) {
        const data = await res.json()
        onApproved(data.employee_id)
        onOpenChange(false)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Invalid PIN or insufficient permissions')
        setPin('')
      }
    } catch {
      setError('Connection error')
    }
    setLoading(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={() => { onDenied(); onOpenChange(false) }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-50">Manager Override</h2>
          <p className="text-sm text-gray-400">{description}</p>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Manager PIN</label>
            <input ref={inputRef} type="password" maxLength={4} value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full h-12 text-center text-2xl tracking-widest bg-gray-900 border border-gray-600 rounded-lg text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2">
            <button onClick={() => { onDenied(); onOpenChange(false) }}
              className="flex-1 h-10 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">Cancel</button>
            <button onClick={handleSubmit} disabled={loading || pin.length !== 4}
              className="flex-1 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-emerald-500">
              {loading ? 'Verifying...' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
