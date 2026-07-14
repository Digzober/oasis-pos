'use client'

import { useState, useEffect, useCallback } from 'react'

const inputCls = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'
const labelCls = 'block text-xs font-medium text-secondary uppercase mb-1'

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
    if (res.ok) { const d = await res.json(); setTags(d.tags ?? []) }
  }, [])

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/registers/configure/settings', { cache: 'no-store' })
    if (res.ok) { const d = await res.json(); setStoreUrl((d.settings?.default_store_url as string) ?? '') }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => Promise.all([fetchTags(), fetchSettings()]))
  }, [fetchTags, fetchSettings])

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
    await fetch('/api/marketing-tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
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

  const tabCls = (active: boolean) => `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`

  return (
    <div>
      <h1 className="text-xl font-bold text-primary mb-4">Marketing Configure</h1>
      <div className="flex gap-1 border-b border-edge mb-6">
        <button onClick={() => setTab('tags')} className={tabCls(tab === 'tags')}>Tags</button>
        <button onClick={() => setTab('misc')} className={tabCls(tab === 'misc')}>Miscellaneous</button>
      </div>

      {tab === 'tags' && (
        <div className="bg-surface rounded-xl border border-edge p-5">
          <h2 className="text-sm font-semibold text-secondary uppercase mb-3">Marketing Tags</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.length === 0 && <p className="text-sm text-muted">No tags yet</p>}
            {tags.map(t => (
              <span key={t.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-raised border border-edge-strong rounded-full text-sm text-primary">
                {t.name}
                <button onClick={() => removeTag(t.id)} className="text-secondary hover:text-danger">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm">
            <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTag() }} placeholder="New tag name" className={inputCls} />
            <button onClick={addTag} disabled={!newTag.trim()} className="px-4 py-2 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent disabled:opacity-50 whitespace-nowrap">Add Tag</button>
          </div>
        </div>
      )}

      {tab === 'misc' && (
        <div className="bg-surface rounded-xl border border-edge p-5">
          <h2 className="text-sm font-semibold text-secondary uppercase mb-3">Miscellaneous</h2>
          <div className="max-w-md space-y-4">
            <div>
              <label className={labelCls}>Default Store URL</label>
              <input value={storeUrl} onChange={e => setStoreUrl(e.target.value)} placeholder="https://oasiscannabis.com" className={inputCls} />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={saveStoreUrl} disabled={saving} className="px-6 py-2.5 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              {saveMsg && <span className={`text-sm ${saveMsg === 'Saved' ? 'text-accent' : 'text-danger'}`}>{saveMsg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
