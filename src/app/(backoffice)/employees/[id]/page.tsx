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

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (!emp) return <p className="text-gray-500">Employee not found</p>

  const inputCls = "w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-50">{emp.first_name} {emp.last_name}</h1>
        <button onClick={deactivate} className="text-sm px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">Deactivate</button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase">Info</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400">Role: </span><span className="text-gray-50 capitalize">{emp.role?.replace('_', ' ')}</span></div>
          <div><span className="text-gray-400">Email: </span><span className="text-gray-50">{emp.email ?? '—'}</span></div>
          <div><span className="text-gray-400">Phone: </span><span className="text-gray-50">{emp.phone ?? '—'}</span></div>
          <div><span className="text-gray-400">Status: </span><span className={emp.is_active ? 'text-emerald-400' : 'text-red-400'}>{emp.is_active ? 'Active' : 'Inactive'}</span></div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase">Locations</h3>
        <div className="space-y-1">
          {(emp.employee_locations ?? []).map((el: AnyR) => (
            <div key={el.location_id} className="flex items-center gap-2 text-sm">
              <span className="text-gray-50">{el.locations?.name ?? el.location_id}</span>
              {el.is_primary && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">Primary</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase">Permission Groups</h3>
        <div className="flex flex-wrap gap-2">
          {(emp.user_permission_groups ?? []).map((g: AnyR) => (
            <span key={g.permission_group_id} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{g.permission_groups?.name ?? g.permission_group_id}</span>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase">Reset PIN</h3>
        <div className="flex gap-2">
          <input type="password" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New 4-digit PIN" className={inputCls + ' w-40'} />
          <button onClick={resetPin} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">Reset</button>
        </div>
        {pinMsg && <p className={`text-sm ${pinMsg === 'PIN updated' ? 'text-emerald-400' : 'text-red-400'}`}>{pinMsg}</p>}
      </div>
    </div>
  )
}
