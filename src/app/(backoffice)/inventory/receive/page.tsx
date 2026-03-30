'use client'

import { useState } from 'react'
import ManualReceiveForm from '@/components/backoffice/ManualReceiveForm'

export default function ReceiveInventoryPage() {
  const [showManual, setShowManual] = useState(false)
  const [manifests, setManifests] = useState<Array<{ manifest_id: string; sender_name: string; transfer_date: string; items: unknown[]; status: string }>>([])
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  const checkManifests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory/manifests')
      if (res.ok) {
        const data = await res.json()
        setManifests(data.manifests ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
    setChecked(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Receive Inventory</h1>
        <button onClick={() => setShowManual(true)} className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">
          Manual Receive
        </button>
      </div>

      {showManual && <ManualReceiveForm onClose={() => setShowManual(false)} />}

      {/* BioTrack Manifests */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase mb-4">BioTrack Manifests</h2>
        <button onClick={checkManifests} disabled={loading}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 disabled:opacity-50 mb-4">
          {loading ? 'Checking...' : 'Check for Pending Manifests'}
        </button>

        {checked && manifests.length === 0 && (
          <p className="text-gray-500 text-sm">No pending manifests found. Use Manual Receive for non-manifest inventory.</p>
        )}

        {manifests.length > 0 && (
          <div className="space-y-3">
            {manifests.map((m) => (
              <div key={m.manifest_id} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-gray-50 font-medium">{m.sender_name}</p>
                  <p className="text-xs text-gray-400">
                    Manifest #{m.manifest_id} — {new Date(m.transfer_date).toLocaleDateString()} — {(m.items as unknown[]).length} items
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${m.status === 'pending' ? 'bg-amber-600/20 text-amber-400' : 'bg-gray-700 text-gray-400'}`}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
