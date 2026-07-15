'use client'

import { useEffect, useState } from 'react'

export default function LoyaltyConfigPage() {
  const [accrualRate, setAccrualRate] = useState('1')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/loyalty/config', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => setAccrualRate(String(body.config?.accrual_rate ?? 1)))
      .catch(() => setMessage('Unable to load loyalty settings.'))
  }, [])

  const save = async () => {
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/loyalty/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accrual_rate: Number(accrualRate) }),
    })
    setMessage(response.ok ? 'Accrual rate saved.' : 'Unable to save accrual rate.')
    setSaving(false)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-primary mb-6">Loyalty Program</h1>
      <div className="bg-surface rounded-xl border border-edge p-5 space-y-4">
        <label className="block">
          <span className="block text-xs text-secondary mb-1.5">Accrual rate (points per $1)</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={accrualRate}
            onChange={(event) => setAccrualRate(event.target.value)}
            className="w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary"
          />
        </label>
        <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-lg bg-accent text-primary disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        {message && <p className="text-sm text-secondary">{message}</p>}
      </div>
    </div>
  )
}
