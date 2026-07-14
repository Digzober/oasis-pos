'use client'

import { useState } from 'react'

interface BaseActionModalProps {
  title: string
  onClose: () => void
  onSubmit: () => Promise<void>
  submitLabel?: string
  submitColor?: 'emerald' | 'red'
  submitDisabled?: boolean
  children: React.ReactNode
  wide?: boolean
}

export default function BaseActionModal({
  title,
  onClose,
  onSubmit,
  submitLabel = 'Submit',
  submitColor = 'emerald',
  submitDisabled = false,
  children,
  wide = false,
}: BaseActionModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
    setSubmitting(false)
  }

  const btnCls = submitColor === 'red'
    ? 'px-4 py-2 text-sm font-medium bg-danger text-primary rounded-lg hover:bg-danger disabled:opacity-50 transition-colors'
    : 'px-4 py-2 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent disabled:opacity-50 transition-colors'

  return (
    <>
      <div className="fixed inset-0 bg-bg/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`bg-surface border border-edge rounded-xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[85vh] flex flex-col`}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-edge shrink-0">
            <h2 className="text-lg font-semibold text-primary">{title}</h2>
            <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {children}
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-edge shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm bg-raised text-secondary rounded-lg hover:bg-raised transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting || submitDisabled} className={btnCls}>
              {submitting ? 'Processing...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
