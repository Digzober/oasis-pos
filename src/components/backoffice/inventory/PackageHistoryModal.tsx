'use client'

import { useState, useEffect } from 'react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HistoryEntry {
  id: string
  created_at: string
  employee_name: string | null
  event_type: string
  field: string | null
  old_value: string | null
  new_value: string | null
}

interface PackageHistoryModalProps {
  itemId: string
  onClose: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PackageHistoryModal({ itemId, onClose }: PackageHistoryModalProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/inventory/items/${itemId}/history`)
      if (!res.ok) {
        setError('Failed to load history')
        setLoading(false)
        return
      }
      const data = await res.json()
      setEntries(data.history ?? data.entries ?? data.data ?? [])
      setLoading(false)
    }
    load()
  }, [itemId])

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
            <h2 className="text-lg font-semibold text-gray-50">Package History</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-gray-700 border-t-emerald-400 rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">No history entries found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-3 py-2">Employee</th>
                      <th className="text-left px-3 py-2">Event Type</th>
                      <th className="text-left px-3 py-2">Field</th>
                      <th className="text-left px-3 py-2">Old Value</th>
                      <th className="text-left px-3 py-2">New Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => (
                      <tr key={entry.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                        <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                          {entry.employee_name ?? '\u2014'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                            {entry.event_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                          {entry.field ?? '\u2014'}
                        </td>
                        <td className="px-3 py-2 text-red-400 whitespace-nowrap max-w-[150px] truncate">
                          {entry.old_value ?? '\u2014'}
                        </td>
                        <td className="px-3 py-2 text-emerald-400 whitespace-nowrap max-w-[150px] truncate">
                          {entry.new_value ?? '\u2014'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
