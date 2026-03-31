'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any

const REDEMPTION_METHODS = [
  { value: 'discount', label: 'Apply loyalty as discounts' },
  { value: 'payment_pretax', label: 'Apply as payment (pre-tax)' },
  { value: 'payment_posttax', label: 'Apply as payment (post-tax)' },
]

export default function LoyaltyConfigPage() {
  const [tab, setTab] = useState('settings')
  const [config, setConfig] = useState<R>(null)
  const [tiers, setTiers] = useState<R[]>([])
  const [saving, setSaving] = useState(false)
  const [newTier, setNewTier] = useState({ name: '', min_points: '', multiplier: '1.0' })
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    fetch('/api/loyalty/config').then(r => r.json()).then(d => setConfig(d.config))
    fetch('/api/loyalty/tiers').then(r => r.json()).then(d => setTiers(d.tiers ?? []))
  }, [])

  const updateField = (key: string, value: unknown) => {
    setConfig((prev: R) => ({ ...prev, [key]: value }))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await fetch('/api/loyalty/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) })
      setSaving(false)
    }, 500)
  }

  const addTier = async () => {
    if (!newTier.name) return
    await fetch('/api/loyalty/tiers', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTier.name, min_points: parseInt(newTier.min_points) || 0, multiplier: parseFloat(newTier.multiplier) || 1.0 }) })
    setNewTier({ name: '', min_points: '', multiplier: '1.0' })
    fetch('/api/loyalty/tiers').then(r => r.json()).then(d => setTiers(d.tiers ?? []))
  }

  const deleteTier = async (id: string) => {
    await fetch(`/api/loyalty/tiers/${id}`, { method: 'DELETE' })
    setTiers(prev => prev.filter((t: R) => t.id !== id))
  }

  const inputCls = "w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Loyalty Program</h1>
        {saving && <span className="text-xs text-gray-400">Saving...</span>}
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-700">
        {['settings', 'adjustment-reasons', 'referrals'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm capitalize ${tab === t ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400'}`}>{t.replace('-', ' ')}</button>
        ))}
      </div>

      {tab === 'settings' && config && (
        <div className="space-y-6">
          <Section title="General">
            <div className="grid grid-cols-2 gap-4">
              <label className="block"><span className="text-xs text-gray-400">Accrual Rate (pts per $1)</span>
                <input type="number" step="0.1" value={config.accrual_rate ?? 1} onChange={e => updateField('accrual_rate', parseFloat(e.target.value))} className={inputCls} /></label>
              <label className="block"><span className="text-xs text-gray-400">Signup Bonus Points</span>
                <input type="number" value={config.initial_signup_reward ?? 0} onChange={e => updateField('initial_signup_reward', parseInt(e.target.value))} className={inputCls} /></label>
            </div>
            <label className="block"><span className="text-xs text-gray-400">Enrollment Type</span>
              <select value={config.enrollment_type ?? 'opt_in'} onChange={e => updateField('enrollment_type', e.target.value)} className={inputCls}>
                <option value="opt_in">Opt-in</option><option value="auto_enroll">Auto-enroll</option>
              </select></label>
            <label className="block"><span className="text-xs text-gray-400">Online Description (144 chars max)</span>
              <textarea value={config.online_description ?? ''} maxLength={144} onChange={e => updateField('online_description', e.target.value)} className={inputCls + ' h-16'} /></label>
          </Section>

          <Section title="Redemptions">
            <div className="space-y-2">
              {REDEMPTION_METHODS.map(m => (
                <label key={m.value} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="radio" name="redemption" checked={config.redemption_method === m.value} onChange={() => updateField('redemption_method', m.value)} className="text-emerald-500" />
                  {m.label}
                </label>
              ))}
            </div>
            <label className="block mt-3"><span className="text-xs text-gray-400">Point Expiration (days, 0 = never)</span>
              <input type="number" value={config.point_expiration_days ?? 365} onChange={e => updateField('point_expiration_days', parseInt(e.target.value) || null)} className={inputCls + ' w-32'} /></label>
          </Section>

          <Section title="Tiers">
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-3">
              <input type="checkbox" checked={config.tiers_enabled ?? false} onChange={e => updateField('tiers_enabled', e.target.checked)} className="rounded" /> Enable loyalty tiers
            </label>
            {config.tiers_enabled && (
              <>
                <table className="w-full text-sm mb-3">
                  <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                    <th className="text-left py-2">Name</th><th className="text-right py-2">Min Points</th><th className="text-right py-2">Multiplier</th><th className="text-right py-2" />
                  </tr></thead>
                  <tbody>{tiers.map((t: R) => (
                    <tr key={t.id} className="border-b border-gray-700/50">
                      <td className="py-2 text-gray-50">{t.name}</td>
                      <td className="py-2 text-right text-gray-300 tabular-nums">{t.min_points}</td>
                      <td className="py-2 text-right text-gray-300 tabular-nums">{t.multiplier}x</td>
                      <td className="py-2 text-right"><button onClick={() => deleteTier(t.id)} className="text-xs text-gray-400 hover:text-red-400">Remove</button></td>
                    </tr>
                  ))}</tbody>
                </table>
                <div className="flex gap-2">
                  <input value={newTier.name} onChange={e => setNewTier(p => ({ ...p, name: e.target.value }))} placeholder="Tier name" className={inputCls + ' w-32'} />
                  <input type="number" value={newTier.min_points} onChange={e => setNewTier(p => ({ ...p, min_points: e.target.value }))} placeholder="Min pts" className={inputCls + ' w-24'} />
                  <input type="number" step="0.1" value={newTier.multiplier} onChange={e => setNewTier(p => ({ ...p, multiplier: e.target.value }))} placeholder="Mult" className={inputCls + ' w-20'} />
                  <button onClick={addTier} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm">Add</button>
                </div>
              </>
            )}
          </Section>
        </div>
      )}

      {tab === 'adjustment-reasons' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 text-center">
          <p className="text-gray-400 mb-2">Manage loyalty adjustment reasons</p>
          <Link href="/customers/segments" className="text-emerald-400 text-sm">Go to Adjustment Reasons</Link>
        </div>
      )}

      {tab === 'referrals' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 text-center">
          <p className="text-gray-400 mb-2">Manage referral program settings</p>
          <Link href="/customers/referrals" className="text-emerald-400 text-sm">Go to Referral Config</Link>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
