'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ManualReceiveForm from '@/components/backoffice/ManualReceiveForm'
import { LoadingState } from '@/components/shared/LoadingState'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

interface ManifestSummary {
  manifest_id: string
  sender_name: string
  sender_license: string
  transfer_date: string
  items: unknown[]
  status: string
}

export default function ReceiveInventoryPage() {
  const router = useRouter()
  const { locationId, hydrated } = useSelectedLocation()
  const [showManual, setShowManual] = useState(false)
  const [manifests, setManifests] = useState<ManifestSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchManifests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (locationId) params.set('location_id', locationId)
      const qs = params.toString()
      const res = await fetch(`/api/inventory/manifests${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Failed to fetch manifests')
      const data = await res.json()
      setManifests(data.manifests ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch manifests')
    } finally {
      setLoading(false)
    }
  }, [locationId])

  // Auto-fetch manifests on mount and when location changes
  useEffect(() => {
    if (hydrated) fetchManifests()
  }, [hydrated, fetchManifests])

  const handleRefresh = async () => {
    await fetchManifests()
  }

  const pendingManifests = manifests.filter((m) => m.status === 'pending' || m.status === 'in_transit' || m.status === 'delivered')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-50">Receive Inventory</h1>
          <p className="text-xs text-gray-500 mt-0.5">Accept BioTrack manifests or manually receive inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowManual(true)}
            className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
          >
            Manual Receive
          </button>
        </div>
      </div>

      {showManual && <ManualReceiveForm onClose={() => setShowManual(false)} />}

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* BioTrack Manifests */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Pending BioTrack Manifests</h2>
          <span className="text-xs text-gray-500">
            {pendingManifests.length} pending
          </span>
        </div>

        {loading ? (
          <LoadingState message="Checking for pending manifests..." />
        ) : pendingManifests.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm font-medium">No Pending Manifests</p>
            <p className="text-gray-500 text-xs mt-1">
              When vendors send manifests via BioTrack, they will appear here automatically.
            </p>
            <p className="text-gray-600 text-xs mt-2">
              Use Manual Receive for non-manifest inventory.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingManifests.map((m) => {
              const itemCount = (m.items as unknown[]).length
              const transferDate = new Date(m.transfer_date)
              const statusColor = m.status === 'pending'
                ? 'bg-amber-600/20 text-amber-400'
                : m.status === 'in_transit'
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'bg-emerald-600/20 text-emerald-400'

              return (
                <button
                  key={m.manifest_id}
                  onClick={() => router.push(`/inventory/receive/manifest/${m.manifest_id}`)}
                  className="w-full bg-gray-900 rounded-lg p-4 flex items-center justify-between hover:bg-gray-850 hover:border-gray-600 border border-gray-700/50 transition-colors text-left group"
                >
                  <div className="min-w-0">
                    <p className="text-gray-50 font-medium group-hover:text-emerald-400 transition-colors">
                      {m.sender_name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        Manifest #{m.manifest_id}
                      </span>
                      <span className="text-xs text-gray-600">|</span>
                      <span className="text-xs text-gray-500">
                        {transferDate.toLocaleDateString()} {transferDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs text-gray-600">|</span>
                      <span className="text-xs text-gray-500">
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {m.sender_license && (
                      <p className="text-[10px] text-gray-600 mt-0.5">License: {m.sender_license}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}>
                      {m.status.replace(/_/g, ' ')}
                    </span>
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
