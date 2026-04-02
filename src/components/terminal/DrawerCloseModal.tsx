'use client'

import { useState, useEffect, useCallback } from 'react'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function fmtHours(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (hrs === 0) return `${mins}m`
  return `${hrs}h ${mins}m`
}

interface Props {
  isOpen: boolean
  onClose: () => void
  cashDrawerId: string
  onSuccess?: () => void
}

interface CloseSummary {
  opening_amount: number
  total_sales: number
  total_refunds: number
  total_drops: number
  expected_cash: number
  actual_cash: number
  variance: number
  transaction_count: number
  drawer_duration_hours: number
}

type Step = 'count' | 'review' | 'confirm' | 'success'

const DENOMINATIONS = [
  { label: '$100', value: 100 },
  { label: '$50', value: 50 },
  { label: '$20', value: 20 },
  { label: '$10', value: 10 },
  { label: '$5', value: 5 },
  { label: '$1', value: 1 },
  { label: '25\u00A2', value: 0.25 },
  { label: '10\u00A2', value: 0.10 },
  { label: '5\u00A2', value: 0.05 },
  { label: '1\u00A2', value: 0.01 },
]

const ALLOWED_ROLES = ['shift_lead', 'manager', 'admin', 'owner']

export default function DrawerCloseModal({ isOpen, onClose, cashDrawerId, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('count')
  const [countedCash, setCountedCash] = useState(0)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualValue, setManualValue] = useState('')
  const [notes, setNotes] = useState('')
  const [summary, setSummary] = useState<CloseSummary | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [autoCloseTimer, setAutoCloseTimer] = useState(10)

  // Fetch session role on mount
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    async function fetchRole() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setUserRole(data.role ?? data.employee?.role ?? '')
        }
      } catch {
        // Role check will fail gracefully; server also enforces
      }
    }
    fetchRole()
    return () => { cancelled = true }
  }, [isOpen])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('count')
      setCountedCash(0)
      setManualEntry(false)
      setManualValue('')
      setNotes('')
      setSummary(null)
      setError('')
      setSubmitting(false)
      setAutoCloseTimer(10)
    }
  }, [isOpen])

  // Auto-close countdown on success
  useEffect(() => {
    if (step !== 'success') return
    if (autoCloseTimer <= 0) {
      onSuccess?.()
      onClose()
      return
    }
    const interval = setInterval(() => {
      setAutoCloseTimer(prev => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [step, autoCloseTimer, onClose, onSuccess])

  const addDenomination = useCallback((value: number) => {
    setCountedCash(prev => Math.round((prev + value) * 100) / 100)
  }, [])

  const handleManualSet = useCallback(() => {
    const parsed = parseFloat(manualValue)
    if (!isNaN(parsed) && parsed >= 0) {
      setCountedCash(Math.round(parsed * 100) / 100)
    }
  }, [manualValue])

  const handleClose = useCallback(async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/terminal/drawer/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cash_drawer_id: cashDrawerId,
          actual_cash: countedCash,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to close drawer')
        setSubmitting(false)
        return
      }
      setSummary(data.summary)
      setStep('success')
    } catch {
      setError('Network error. Please try again.')
    }
    setSubmitting(false)
  }, [cashDrawerId, countedCash, notes])

  if (!isOpen) return null

  // Permission gate
  if (userRole && !ALLOWED_ROLES.includes(userRole)) {
    return (
      <>
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-8 text-center">
            <div className="w-16 h-16 bg-amber-600/20 border border-amber-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-50 mb-2">Permission Required</h2>
            <p className="text-gray-400 mb-6">Ask your shift lead to close the drawer.</p>
            <button
              onClick={onClose}
              className="px-8 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </>
    )
  }

  const varianceColor = (v: number) => {
    const abs = Math.abs(v)
    if (abs < 5) return 'text-emerald-400'
    if (abs <= 20) return 'text-amber-400'
    return 'text-red-400'
  }

  const varianceBg = (v: number) => {
    const abs = Math.abs(v)
    if (abs < 5) return 'bg-emerald-900/20 border-emerald-700/30'
    if (abs <= 20) return 'bg-amber-900/20 border-amber-700/30'
    return 'bg-red-900/20 border-red-700/30'
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-gray-50">Close Drawer</h2>
            <div className="flex items-center gap-3">
              {step !== 'success' && (
                <div className="flex gap-1">
                  {(['count', 'review', 'confirm'] as const).map((s, i) => (
                    <div
                      key={s}
                      className={`w-2 h-2 rounded-full ${
                        ['count', 'review', 'confirm'].indexOf(step) >= i
                          ? 'bg-emerald-500'
                          : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              )}
              {step !== 'success' && (
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Step 1: Count */}
            {step === 'count' && (
              <div>
                <p className="text-sm text-gray-400 mb-4">Count the cash in your drawer.</p>

                {/* Running total */}
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-5 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Counted Cash</p>
                  <p className="text-4xl font-bold text-gray-50 tabular-nums">{fmt(countedCash)}</p>
                </div>

                {/* Toggle */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-400">Manual Entry</span>
                  <button
                    onClick={() => setManualEntry(!manualEntry)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      manualEntry ? 'bg-emerald-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        manualEntry ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {manualEntry ? (
                  <div className="flex gap-2 mb-5">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={manualValue}
                        onChange={e => setManualValue(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-12 pl-7 pr-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-lg tabular-nums focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      onClick={handleManualSet}
                      className="px-5 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Set
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2 mb-5">
                    {DENOMINATIONS.map(d => (
                      <button
                        key={d.label}
                        onClick={() => addDenomination(d.value)}
                        className="h-12 bg-gray-900 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 rounded-lg text-gray-50 text-sm font-medium transition-colors"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                )}

                {!manualEntry && countedCash > 0 && (
                  <button
                    onClick={() => setCountedCash(0)}
                    className="text-xs text-gray-500 hover:text-gray-400 transition-colors mb-4"
                  >
                    Reset count
                  </button>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={onClose}
                    className="flex-1 h-11 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep('review')}
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 'review' && (
              <div>
                <p className="text-sm text-gray-400 mb-5">Review the drawer summary before closing.</p>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Counted Cash</span>
                    <span className="text-gray-50 font-semibold text-lg tabular-nums">{fmt(countedCash)}</span>
                  </div>
                  <div className="border-t border-gray-700" />
                  <p className="text-xs text-gray-500">
                    The expected amount and variance will be calculated when you confirm.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('count')}
                    className="flex-1 h-11 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && (
              <div>
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 mb-5">
                  <p className="text-sm text-amber-300 font-medium">Confirm Drawer Close</p>
                  <p className="text-xs text-amber-400 mt-1">
                    This will close the drawer with {fmt(countedCash)} counted. This action cannot be undone.
                  </p>
                </div>

                <label className="block mb-4">
                  <span className="text-xs text-gray-400 mb-1 block">Notes (optional)</span>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Explain any variance..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm resize-none focus:outline-none focus:border-emerald-500 placeholder-gray-600"
                  />
                </label>

                {error && (
                  <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setStep('review'); setError('') }}
                    className="flex-1 h-11 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={submitting}
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Closing...' : 'Close Drawer'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && summary && (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-50 mb-1">Drawer Closed</h3>
                <p className="text-sm text-gray-400 mb-6">
                  {summary.transaction_count} transaction{summary.transaction_count !== 1 ? 's' : ''} over {fmtHours(summary.drawer_duration_hours)}
                </p>

                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Opening Amount</span>
                    <span className="text-gray-50 tabular-nums">{fmt(summary.opening_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Cash Sales</span>
                    <span className="text-emerald-400 tabular-nums">+{fmt(summary.total_sales)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Cash Refunds</span>
                    <span className="text-red-400 tabular-nums">-{fmt(summary.total_refunds)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Safe Drops</span>
                    <span className="text-amber-400 tabular-nums">-{fmt(summary.total_drops)}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between text-sm">
                    <span className="text-gray-400">Expected Cash</span>
                    <span className="text-gray-50 font-semibold tabular-nums">{fmt(summary.expected_cash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Actual Cash</span>
                    <span className="text-gray-50 font-semibold tabular-nums">{fmt(summary.actual_cash)}</span>
                  </div>
                  <div className={`border rounded-lg p-2 mt-1 ${varianceBg(summary.variance)}`}>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Variance</span>
                      <span className={`font-bold tabular-nums ${varianceColor(summary.variance)}`}>
                        {summary.variance >= 0 ? '+' : ''}{fmt(summary.variance)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  Returning to login in {autoCloseTimer}s...
                </p>
                <button
                  onClick={() => { onSuccess?.(); onClose() }}
                  className="px-8 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
