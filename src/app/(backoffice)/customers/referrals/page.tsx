'use client'

import { useState, useEffect } from 'react'

export default function ReferralsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<any>(null)
  const [form, setForm] = useState({ referrer_reward_points: '', referee_reward_points: '', min_purchase_amount: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/referrals/config').then(r => r.json()).then(d => {
      if (d.config) {
        setConfig(d.config)
        setForm({ referrer_reward_points: String(d.config.referrer_reward_points ?? 50), referee_reward_points: String(d.config.referee_reward_points ?? 25), min_purchase_amount: String(d.config.min_purchase_amount ?? 20) })
      }
    })
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/referrals/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrer_reward_points: parseInt(form.referrer_reward_points), referee_reward_points: parseInt(form.referee_reward_points), min_purchase_amount: parseFloat(form.min_purchase_amount), is_active: true }) })
    setSaving(false)
  }

  const inputCls = "w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm"

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-50 mb-6">Referral Program</h1>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase">Configuration</h3>
        <label className="block"><span className="text-xs text-gray-400">Referrer Reward (points)</span>
          <input type="number" value={form.referrer_reward_points} onChange={e => setForm(p => ({ ...p, referrer_reward_points: e.target.value }))} className={inputCls} /></label>
        <label className="block"><span className="text-xs text-gray-400">Referee Reward (points)</span>
          <input type="number" value={form.referee_reward_points} onChange={e => setForm(p => ({ ...p, referee_reward_points: e.target.value }))} className={inputCls} /></label>
        <label className="block"><span className="text-xs text-gray-400">Min Purchase Amount ($)</span>
          <input type="number" step="0.01" value={form.min_purchase_amount} onChange={e => setForm(p => ({ ...p, min_purchase_amount: e.target.value }))} className={inputCls} /></label>
        <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Config'}</button>
      </div>
    </div>
  )
}
