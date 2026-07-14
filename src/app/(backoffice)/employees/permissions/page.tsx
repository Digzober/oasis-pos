'use client'

import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyR = Record<string, any>

export default function PermissionGroupsPage() {
  const [groups, setGroups] = useState<AnyR[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [groupDetail, setGroupDetail] = useState<AnyR | null>(null)
  const [allPerms, setAllPerms] = useState<AnyR[]>([])
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/permission-groups').then(r => r.json()).then(d => setGroups(d.groups ?? []))
  }, [])

  useEffect(() => {
    void Promise.resolve().then(async () => {
      if (!selectedId) { setGroupDetail(null); return }
      const response = await fetch(`/api/permission-groups/${selectedId}`)
      const d = await response.json()
      setGroupDetail(d.group)
      const permIds = new Set<string>((d.group?.permission_group_permissions ?? []).map((p: AnyR) => p.permission_id as string))
      setSelectedPerms(permIds)
    })
  }, [selectedId])

  const togglePerm = (id: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const savePerms = async () => {
    if (!selectedId) return
    setSaving(true)
    await fetch(`/api/permission-groups/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission_ids: Array.from(selectedPerms) }),
    })
    setSaving(false)
  }

  // Group permissions by category
  const permsByCategory = new Map<string, AnyR[]>()
  const perms = groupDetail?.permission_group_permissions ?? []
  for (const p of perms) {
    const def = p.permission_definitions
    if (!def) continue
    const cat = def.category ?? 'Other'
    if (!permsByCategory.has(cat)) permsByCategory.set(cat, [])
    permsByCategory.get(cat)!.push(def)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-primary mb-6">Permission Groups</h1>

      <div className="grid grid-cols-4 gap-6">
        {/* Group list */}
        <div className="col-span-1 bg-surface rounded-xl border border-edge p-3 space-y-1">
          {groups.map(g => (
            <button key={g.id} onClick={() => setSelectedId(g.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedId === g.id ? 'bg-raised text-accent' : 'text-secondary hover:bg-raised/50'}`}>
              {g.name}
              <span className="text-xs text-muted ml-1">({g.permission_group_permissions?.length ?? 0})</span>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="col-span-3">
          {!groupDetail ? (
            <p className="text-muted text-sm">Select a group to view permissions</p>
          ) : (
            <div className="bg-surface rounded-xl border border-edge p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-primary">{groupDetail.name}</h2>
                <div className="flex gap-2">
                  <span className="text-xs text-secondary">{selectedPerms.size} permissions selected</span>
                  <button onClick={savePerms} disabled={saving} className="px-3 py-1.5 bg-accent text-primary rounded-lg text-sm hover:bg-accent disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {Array.from(permsByCategory.entries()).map(([cat, defs]) => (
                  <div key={cat}>
                    <h4 className="text-xs text-secondary font-semibold uppercase mb-2">{cat} ({defs.length})</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {defs.map((d: AnyR) => (
                        <label key={d.id} className="flex items-center gap-2 text-sm text-secondary py-0.5 cursor-pointer hover:text-primary">
                          <input type="checkbox" checked={selectedPerms.has(d.id)} onChange={() => togglePerm(d.id)} className="rounded border-edge-strong" />
                          {d.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
