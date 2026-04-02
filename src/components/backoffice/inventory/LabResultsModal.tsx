'use client'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LabResultsItem {
  thc_percentage: number | null
  cbd_percentage: number | null
  lab_test_date: string | null
  lab_test_results: Record<string, unknown> | null
}

interface LabResultsModalProps {
  item: LabResultsItem
  onClose: () => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '\u2014'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LabResultsModal({ item, onClose }: LabResultsModalProps) {
  const results = item.lab_test_results ?? {}
  const entries = Object.entries(results)
  const hasData = entries.length > 0 || item.thc_percentage != null || item.cbd_percentage != null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
            <h2 className="text-lg font-semibold text-gray-50">Lab Results</h2>
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
            {!hasData ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">No lab results available for this item.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Primary potency values */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4 text-center border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase mb-1">THC %</p>
                    <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                      {item.thc_percentage != null ? item.thc_percentage.toFixed(2) : '\u2014'}
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 text-center border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase mb-1">CBD %</p>
                    <p className="text-2xl font-bold text-blue-400 tabular-nums">
                      {item.cbd_percentage != null ? item.cbd_percentage.toFixed(2) : '\u2014'}
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 text-center border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase mb-1">Test Date</p>
                    <p className="text-sm font-medium text-gray-200">
                      {item.lab_test_date
                        ? new Date(item.lab_test_date).toLocaleDateString()
                        : '\u2014'}
                    </p>
                  </div>
                </div>

                {/* JSONB key-value pairs */}
                {entries.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Detailed Results
                    </h3>
                    <div className="bg-gray-900 rounded-lg border border-gray-700 divide-y divide-gray-700">
                      {entries.map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-gray-300">{formatKey(key)}</span>
                          <span className="text-sm text-gray-50 font-medium tabular-nums">
                            {formatValue(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
