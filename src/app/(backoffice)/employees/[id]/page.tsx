'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyR = Record<string, any>

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [emp, setEmp] = useState<AnyR | null>(null)
  const [loading, setLoading] = useState(true)
  const [newPin, setNewPin] = useState('')
  const [pinMsg, setPinMsg] = useState('')

  useEffect(() => {
    fetch(`/api/employees/${id}`).then(r => r.json()).then(d => { setEmp(d.employee); setLoading(false) })
  }, [id])

  const resetPin = async () => {
    if (!/^\d{4}$/.test(newPin)) { setPinMsg('PIN must be 4 digits'); return }
    const res = await fetch(`/api/employees/${id}/pin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: newPin }) })
    setPinMsg(res.ok ? 'PIN updated' : (await res.json()).error ?? 'Failed')
    setNewPin('')
  }

  const deactivate = async () => {
    if (!confirm('Deactivate this employee?')) return
    await fetch(`/api/employees/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Deactivated by admin' }) })
    router.push('/employees')
  }

  if (loading) return <p className="text-muted">Loading...</p>
  if (!emp) return <p className="text-muted">Employee not found</p>

  const inputCls = "w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">{emp.first_name} {emp.last_name}</h1>
        <button onClick={deactivate} className="text-sm px-3 py-1.5 bg-danger/20 text-danger rounded-lg hover:bg-danger/30">Deactivate</button>
      </div>

      <div className="bg-surface rounded-xl border border-edge p-4 space-y-3">
        <h3 className="text-sm font-semibold text-secondary uppercase">Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-secondary">Role: </span><span className="text-primary capitalize">{emp.role?.replace('_', ' ')}</span></div>
          <div><span className="text-secondary">Email: </span><span className="text-primary">{emp.email ?? '—'}</span></div>
          <div><span className="text-secondary">Phone: </span><span className="text-primary">{emp.phone ?? '—'}</span></div>
          <div><span className="text-secondary">Status: </span><span className={emp.is_active ? 'text-accent' : 'text-danger'}>{emp.is_active ? 'Active' : 'Inactive'}</span></div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-edge p-4 space-y-3">
        <h3 className="text-sm font-semibold text-secondary uppercase">Locations</h3>
        <div className="space-y-1">
          {(emp.employee_locations ?? []).map((el: AnyR) => (
            <div key={el.location_id} className="flex items-center gap-2 text-sm">
              <span className="text-primary">{el.locations?.name ?? el.location_id}</span>
              {el.is_primary && <span className="text-[10px] bg-accent text-primary px-1.5 py-0.5 rounded">Primary</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-edge p-4 space-y-3">
        <h3 className="text-sm font-semibold text-secondary uppercase">Permission Groups</h3>
        <div className="flex flex-wrap gap-2">
          {(emp.user_permission_groups ?? []).map((g: AnyR) => (
            <span key={g.permission_group_id} className="text-xs bg-raised text-secondary px-2 py-1 rounded">{g.permission_groups?.name ?? g.permission_group_id}</span>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-edge p-4 space-y-3">
        <h3 className="text-sm font-semibold text-secondary uppercase">Reset PIN</h3>
        <div className="flex gap-2">
          <input type="password" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New 4-digit PIN" className={inputCls + ' w-40'} />
          <button onClick={resetPin} className="px-3 py-1.5 bg-raised text-secondary rounded-lg text-sm hover:bg-raised">Reset</button>
        </div>
        {pinMsg && <p className={`text-sm ${pinMsg === 'PIN updated' ? 'text-accent' : 'text-danger'}`}>{pinMsg}</p>}
      </div>
    </div>
  )
}
