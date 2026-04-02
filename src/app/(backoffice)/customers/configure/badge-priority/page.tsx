'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BadgeItem {
  id: string
  name: string
  color: string
}

const TABS = [
  { label: 'Doctors', href: '/customers/configure/doctors' },
  { label: 'Qualifying Conditions', href: '/customers/configure/qualifying-conditions' },
  { label: 'Fields', href: '/customers/configure/fields' },
  { label: 'Badge Priority', href: '/customers/configure/badge-priority' },
  { label: 'Badges', href: '/customers/configure/badges' },
]

function ConfigureTabs() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-6 border-b border-gray-700 mb-6">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default function BadgePriorityPage() {
  const [badges, setBadges] = useState<BadgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function fetchBadges() {
      try {
        const res = await fetch('/api/customers/configure/badge-priority', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          setBadges(json.badges ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchBadges()
  }, [])

  function moveUp(index: number) {
    if (index <= 0) return
    setBadges((prev) => {
      const next = [...prev]
      const temp = next[index - 1]
      next[index - 1] = next[index]
      next[index] = temp
      return next
    })
    setSaved(false)
  }

  function moveDown(index: number) {
    if (index >= badges.length - 1) return
    setBadges((prev) => {
      const next = [...prev]
      const temp = next[index + 1]
      next[index + 1] = next[index]
      next[index] = temp
      return next
    })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const segment_ids = badges.map((b) => b.id)
      const res = await fetch('/api/customers/configure/badge-priority', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment_ids }),
        cache: 'no-store',
      })
      if (res.ok) {
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h1 className="text-2xl font-bold text-gray-50 mb-6">Customer Configuration</h1>
      <ConfigureTabs />

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-50 mb-1">Badge Priority</h2>
        <p className="text-sm text-gray-400">
          Set the display priority for customer segment badges. When a customer belongs to multiple segments,
          the badge with the highest priority (lowest number) will be shown on the POS terminal.
        </p>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading badge configuration...</div>
      ) : badges.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-sm">No segment badges configured yet. Create segments first to set badge priority.</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-700">
              {badges.map((badge, index) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-750 transition-colors"
                >
                  {/* Priority number */}
                  <span className="w-8 text-center text-sm font-mono text-gray-400">
                    {index + 1}
                  </span>

                  {/* Badge pill */}
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: badge.color || '#6b7280' }}
                  >
                    {badge.name}
                  </span>

                  {/* Segment name */}
                  <span className="flex-1 text-sm text-gray-200">{badge.name}</span>

                  {/* Reorder buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === badges.length - 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Priority'}
            </button>
            {saved && (
              <span className="text-sm text-emerald-400">Priority saved successfully.</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
