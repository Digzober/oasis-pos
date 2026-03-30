'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Emp = any
const ROLES = ['budtender', 'shift_lead', 'manager', 'admin', 'owner']

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState<Emp[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ status: 'active' })
    if (search) params.set('search', search)
    if (role) params.set('role', role)
    const res = await fetch(`/api/employees?${params}`)
    if (res.ok) { const d = await res.json(); setEmployees(d.employees ?? []); setTotal(d.total ?? 0) }
    setLoading(false)
  }, [search, role])

  useEffect(() => { fetch_() }, [fetch_])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Employees</h1>
        <div className="flex gap-2">
          <Link href="/employees/permissions" className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Permissions</Link>
          <Link href="/employees/time-clock" className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Time Clock</Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..."
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50 w-64" />
        <select value={role} onChange={e => setRole(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-50">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th>
            <th className="text-left px-4 py-3">Role</th>
            <th className="text-left px-4 py-3">Email</th>
            <th className="text-left px-4 py-3">Locations</th>
            <th className="text-left px-4 py-3">Groups</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading...</td></tr>
            : employees.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">No employees</td></tr>
            : employees.map((e: Emp) => (
              <tr key={e.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-4 py-2.5">
                  <Link href={`/employees/${e.id}`} className="text-gray-50 hover:text-emerald-400">{e.first_name} {e.last_name}</Link>
                </td>
                <td className="px-4 py-2.5 text-gray-300 capitalize">{e.role?.replace('_', ' ')}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{e.email ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{e.employee_locations?.length ?? 0} locations</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">
                  {(e.user_permission_groups ?? []).map((g: Emp) => g.permission_groups?.name).filter(Boolean).join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
