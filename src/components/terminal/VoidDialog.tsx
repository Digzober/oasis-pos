'use client'

import { useState } from 'react'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

const VOID_REASONS = ['Customer Changed Mind', 'Wrong Items', 'Cashier Error', 'System Error', 'Manager Override', 'Other']

interface Props {
  transactionId: string
  transactionNumber: number
  total: number
  onClose: () => void
  onVoided: () => void
}

export default function VoidDialog({ transactionId, transactionNumber, total, onClose, onVoided }: Props) {
  const [reason, setReason] = useState('')
  const [step, setStep] = useState<'reason' | 'confirm' | 'processing' | 'done'>('reason')
  const [error, setError] = useState('')

  const processVoid = async () => {
    setStep('processing'); setError('')
    const res = await fetch(`/api/transactions/${transactionId}/void`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ void_reason: reason }),
    })
    if (res.ok) { setStep('done') }
    else { const d = await res.json(); setError(d.error ?? 'Void failed'); setStep('confirm') }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6">
          {step === 'done' ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-3"><span className="text-2xl text-white">✓</span></div>
              <h2 className="text-lg font-bold text-gray-50 mb-1">Transaction Voided</h2>
              <p className="text-gray-400 text-sm mb-4">#{transactionNumber} — {fmt(total)} reversed</p>
              <button onClick={() => { onVoided(); onClose() }} className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Done</button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-red-400 mb-1">Void Transaction #{transactionNumber}</h2>
              <p className="text-sm text-gray-400 mb-4">This will reverse {fmt(total)} and return all items to inventory.</p>

              {step === 'reason' && (
                <>
                  <label className="block mb-4">
                    <span className="text-xs text-gray-400">Reason *</span>
                    <select value={reason} onChange={e => setReason(e.target.value)}
                      className="w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm">
                      <option value="">Select reason...</option>
                      {VOID_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 h-10 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
                    <button onClick={() => setStep('confirm')} disabled={!reason}
                      className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-40">Continue</button>
                  </div>
                </>
              )}

              {step === 'confirm' && (
                <>
                  <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-300 font-medium">Are you sure?</p>
                    <p className="text-xs text-red-400 mt-1">This action cannot be undone. The entire transaction of {fmt(total)} will be voided.</p>
                  </div>
                  {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setStep('reason')} className="flex-1 h-10 bg-gray-700 text-gray-300 rounded-lg text-sm">Back</button>
                    <button onClick={processVoid} className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-bold">Void Transaction</button>
                  </div>
                </>
              )}

              {step === 'processing' && <p className="text-center text-gray-400 py-4">Processing void...</p>}
            </>
          )}
        </div>
      </div>
    </>
  )
}
