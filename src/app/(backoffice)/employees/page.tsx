'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Emp = any
const ROLES = ['budtender', 'shift_lead', 'manager', 'admin', 'owner']
const PER_PAGE = 25

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState<Emp[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ status: 'active', page: String(page), per_page: String(PER_PAGE) })
    if (search) params.set('search', search)
    if (role) params.set('role', role)
    const res = await fetch(`/api/employees?${params}`)
    if (res.ok) { const d = await res.json(); setEmployees(d.employees ?? []); setTotal(d.total ?? 0) }
    setLoading(false)
  }, [search, role, page])

  useEffect(() => { void Promise.resolve().then(fetch_) }, [fetch_])
  useEffect(() => { void Promise.resolve().then(() => setPage(1)) }, [search, role])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Employees</h1>
        <div className="flex gap-2">
          <Link href="/employees/permissions" className="text-sm px-3 py-1.5 bg-raised text-secondary rounded-lg hover:bg-raised">Permissions</Link>
          <Link href="/employees/time-clock" className="text-sm px-3 py-1.5 bg-raised text-secondary rounded-lg hover:bg-raised">Time Clock</Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..."
          className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary w-64" />
        <select value={role} onChange={e => setRole(e.target.value)} className="bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-primary">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
        <span className="ml-auto text-sm text-muted self-center">{total} employee{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-edge text-secondary text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th>
            <th className="text-left px-4 py-3">Role</th>
            <th className="text-left px-4 py-3">Email</th>
            <th className="text-left px-4 py-3">Locations</th>
            <th className="text-left px-4 py-3">Groups</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="text-center py-8 text-muted">Loading...</td></tr>
            : employees.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-muted">No employees</td></tr>
            : employees.map((e: Emp) => (
              <tr key={e.id} className="border-b border-edge/50 hover:bg-raised/30">
                <td className="px-4 py-2.5">
                  <Link href={`/employees/${e.id}`} className="text-primary hover:text-accent">{e.first_name} {e.last_name}</Link>
                </td>
                <td className="px-4 py-2.5 text-secondary capitalize">{e.role?.replace('_', ' ')}</td>
                <td className="px-4 py-2.5 text-secondary text-xs">{e.email ?? '—'}</td>
                <td className="px-4 py-2.5 text-secondary text-xs">{e.employee_locations?.length ?? 0} locations</td>
                <td className="px-4 py-2.5 text-secondary text-xs">
                  {(e.user_permission_groups ?? []).map((g: Emp) => g.permission_groups?.name).filter(Boolean).join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-secondary">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1 bg-raised text-secondary rounded-lg text-xs disabled:opacity-30 hover:bg-raised">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1 bg-raised text-secondary rounded-lg text-xs disabled:opacity-30 hover:bg-raised">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
