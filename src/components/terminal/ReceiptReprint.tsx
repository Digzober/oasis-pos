'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'
import {
  buildReceiptBodyHtml,
  buildReceiptDocumentHtml,
  type ReceiptData,
} from '@/lib/receipts/render'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

interface RecentTransaction {
  id: string
  receipt_number: string
  created_at: string
  total: number
  customer_name: string
}

interface Props {
  registerId: string
  locationId: string
  isOpen: boolean
  onClose: () => void
}

export default function ReceiptReprint({ registerId, isOpen, onClose }: Props) {
  const [view, setView] = useState<'list' | 'preview'>('list')
  const [recent, setRecent] = useState<RecentTransaction[]>([])
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchRecent = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/terminal/receipt/recent?register_id=${registerId}`)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to load transactions')
        return
      }
      const d = await res.json()
      setRecent(d.transactions ?? [])
    } catch {
      setError('Network error loading transactions')
    } finally {
      setLoading(false)
    }
  }, [registerId])

  useEffect(() => {
    if (isOpen) {
      setView('list')
      setReceipt(null)
      setError('')
      fetchRecent()
    }
  }, [isOpen, fetchRecent])

  const fetchReceipt = async (txnId: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/terminal/receipt/${txnId}`)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to load receipt')
        return
      }
      const d = await res.json()
      setReceipt(d.receipt)
      setView('preview')
    } catch {
      setError('Network error loading receipt')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!receipt) return
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) return
    printWindow.document.write(buildReceiptDocumentHtml(receipt, true))
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  const handleEmailStub = () => {
    logger.info('Email receipt stub triggered', {
      transactionId: receipt?.transaction_id,
    })
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-bg/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-bg border border-edge rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-edge">
            <h2 className="text-lg font-bold text-primary">
              {view === 'list' ? 'Reprint Receipt' : 'Receipt Preview'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-secondary hover:text-primary hover:bg-raised transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mt-4 px-3 py-2 bg-danger/30 border border-danger/40 rounded-lg">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-secondary">Loading...</span>
              </div>
            )}

            {/* Transaction List */}
            {!loading && view === 'list' && (
              <>
                {recent.length === 0 && !error && (
                  <p className="text-center text-muted py-8 text-sm">
                    No recent transactions for this register.
                  </p>
                )}
                <div className="space-y-2">
                  {recent.map((txn) => (
                    <button
                      key={txn.id}
                      onClick={() => fetchReceipt(txn.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-edge rounded-xl hover:border-accent/50 hover:bg-surface/80 transition-all group text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">
                            #{txn.receipt_number}
                          </span>
                          <span className="text-xs text-muted">
                            {relativeTime(txn.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-secondary mt-0.5 truncate">
                          {txn.customer_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-accent">
                          {fmt(txn.total)}
                        </span>
                        <svg className="w-4 h-4 text-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Receipt Preview */}
            {!loading && view === 'preview' && receipt && (
              <>
                <div
                  className="bg-surface border border-edge rounded-xl p-5 font-mono text-xs text-primary leading-relaxed [&_.center]:text-center [&_.bold]:font-bold [&_.divider]:border-t [&_.divider]:border-dashed [&_.divider]:border-edge-strong [&_.divider]:my-2 [&_.row]:flex [&_.row]:justify-between [&_.total-row]:flex [&_.total-row]:justify-between [&_.total-row]:font-bold [&_.detail]:pl-2 [&_.detail]:text-muted"
                  dangerouslySetInnerHTML={{ __html: buildReceiptBodyHtml(receipt, true) }}
                />

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => { setView('list'); setReceipt(null) }}
                    className="flex-1 h-11 bg-surface border border-edge text-secondary rounded-xl text-sm font-medium hover:bg-raised transition-colors"
                  >
                    Back to List
                  </button>
                  {receipt.customer_name && (
                    <button
                      onClick={handleEmailStub}
                      className="flex-1 h-11 bg-surface border border-edge text-secondary rounded-xl text-sm font-medium hover:bg-raised transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </button>
                  )}
                  <button
                    onClick={handlePrint}
                    className="flex-1 h-11 bg-accent text-primary rounded-xl text-sm font-bold hover:bg-accent transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
