'use client'

import { useState, useEffect, useCallback } from 'react'

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'

interface Tag { id: string; name: string }

export default function MarketingConfigurePage() {
  const [tab, setTab] = useState<'tags' | 'misc'>('tags')
  const [tags, setTags] = useState<Tag[]>([])
  const [newTag, setNewTag] = useState('')
  const [storeUrl, setStoreUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/marketing-tags', { cache: 'no-store' })
    if (res.ok) { const d = await res.json(); setTags(d.tags ?? d.data ?? []) }
  }, [])

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/registers/configure/settings', { cache: 'no-store' })
    if (res.ok) { const d = await res.json(); setStoreUrl((d.settings?.default_store_url as string) ?? '') }
  }, [])

  useEffect(() => { fetchTags(); fetchSettings() }, [fetchTags, fetchSettings])

  const addTag = async () => {
    if (!newTag.trim()) return
    await fetch('/api/marketing-tags', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTag.trim() }),
    })
    setNewTag('')
    fetchTags()
  }

  const removeTag = async (id: string) => {
    await fetch(`/api/marketing-tags/${id}`, { method: 'DELETE' })
    fetchTags()
  }

  const saveStoreUrl = async () => {
    setSaving(true); setSaveMsg(null)
    const res = await fetch('/api/registers/configure/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_store_url: storeUrl }),
    })
    setSaveMsg(res.ok ? 'Saved' : 'Failed to save')
    setTimeout(() => setSaveMsg(null), 3000)
    setSaving(false)
  }

  const tabCls = (active: boolean) => `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-50 mb-4">Marketing Configure</h1>
      <div className="flex gap-1 border-b border-gray-700 mb-6">
        <button onClick={() => setTab('tags')} className={tabCls(tab === 'tags')}>Tags</button>
        <button onClick={() => setTab('misc')} className={tabCls(tab === 'misc')}>Miscellaneous</button>
      </div>

      {tab === 'tags' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase mb-3">Marketing Tags</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.length === 0 && <p className="text-sm text-gray-500">No tags yet</p>}
            {tags.map(t => (
              <span key={t.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-full text-sm text-gray-50">
                {t.name}
                <button onClick={() => removeTag(t.id)} className="text-gray-400 hover:text-red-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm">
            <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTag() }} placeholder="New tag name" className={inputCls} />
            <button onClick={addTag} disabled={!newTag.trim()} className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap">Add Tag</button>
          </div>
        </div>
      )}

      {tab === 'misc' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase mb-3">Miscellaneous</h2>
          <div className="max-w-md space-y-4">
            <div>
              <label className={labelCls}>Default Store URL</label>
              <input value={storeUrl} onChange={e => setStoreUrl(e.target.value)} placeholder="https://oasiscannabis.com" className={inputCls} />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={saveStoreUrl} disabled={saving} className="px-6 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              {saveMsg && <span className={`text-sm ${saveMsg === 'Saved' ? 'text-emerald-400' : 'text-red-400'}`}>{saveMsg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
