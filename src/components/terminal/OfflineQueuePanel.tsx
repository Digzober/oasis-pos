'use client'

import { useState, useEffect } from 'react'
import { getAll, type OfflineTransaction } from '@/lib/offline/transactionQueue'
import { syncAll } from '@/lib/offline/syncWorker'

function fmt(n: number) { return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }

const STATUS_COLORS: Record<string, string> = { pending: 'text-amber-400', syncing: 'text-blue-400', synced: 'text-emerald-400', failed: 'text-red-400' }

export default function OfflineQueuePanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<OfflineTransaction[]>([])
  const [syncing, setSyncing] = useState(false)

  const refresh = async () => { try { setItems(await getAll()) } catch { /* */ } }
  useEffect(() => { refresh() }, [])

  const handleSyncAll = async () => { setSyncing(true); await syncAll(); await refresh(); setSyncing(false) }

  const pending = items.filter(i => i.sync_status === 'pending' || i.sync_status === 'failed')
  const oldItems = pending.filter(i => Date.now() - new Date(i.created_at).getTime() > 3600000)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[70vh]">
        <div className="px-4 pt-4 pb-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-gray-50 font-semibold">Offline Transaction Queue</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">✕</button>
        </div>

        {oldItems.length > 0 && (
          <div className="mx-4 mt-3 px-3 py-2 bg-red-900/30 text-red-300 text-xs rounded-lg">
            {oldItems.length} transaction{oldItems.length > 1 ? 's' : ''} older than 1 hour — sync ASAP
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Queue is empty</p>
          ) : items.map(tx => (
            <div key={tx.id} className="bg-gray-900 rounded-lg p-3 mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 tabular-nums">{tx.id.slice(0, 8)}</span>
                <span className={`text-xs font-medium capitalize ${STATUS_COLORS[tx.sync_status] ?? 'text-gray-400'}`}>{tx.sync_status}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">{new Date(tx.created_at).toLocaleTimeString()}</span>
                <span className="text-gray-50 tabular-nums">{fmt((tx.data as { amount_tendered?: number }).amount_tendered ?? 0)}</span>
              </div>
              {tx.last_error && <p className="text-red-400 text-xs mt-1">{tx.last_error}</p>}
              {tx.retry_count > 0 && <p className="text-gray-500 text-xs">Retries: {tx.retry_count}/5</p>}
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-gray-700 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 bg-gray-700 text-gray-300 rounded-lg text-sm">Close</button>
          <button onClick={handleSyncAll} disabled={syncing || pending.length === 0}
            className="flex-1 h-10 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">
            {syncing ? 'Syncing...' : `Sync All (${pending.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
