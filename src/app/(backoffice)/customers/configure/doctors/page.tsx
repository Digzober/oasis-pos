'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'

interface Doctor {
  id: string
  first_name: string
  last_name: string
  license_number: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}

interface DoctorsResponse {
  doctors: Doctor[]
  pagination: { page: number; per_page: number; total: number; total_pages: number }
}

const TABS = [
  { label: 'Doctors', href: '/customers/configure/doctors' },
  { label: 'Qualifying Conditions', href: '/customers/configure/qualifying-conditions' },
  { label: 'Fields', href: '/customers/configure/fields' },
  { label: 'Badge Priority', href: '/customers/configure/badge-priority' },
  { label: 'Badges', href: '/customers/configure/badges' },
]

function ConfigureTabs() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-6 border-b border-gray-700 mb-6">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

const EMPTY_FORM = { first_name: '', last_name: '', license_number: '', phone: '', email: '' }

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [openActions, setOpenActions] = useState<string | null>(null)

  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
      if (search) params.set('search', search)
      const res = await fetch(`/api/customers/configure/doctors?${params}`, { cache: 'no-store' })
      if (res.ok) {
        const json: DoctorsResponse = await res.json()
        setDoctors(json.doctors ?? [])
        setTotal(json.pagination?.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search])

  useEffect(() => { fetchDoctors() }, [fetchDoctors])

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  function openAdd() {
    setEditingDoctor(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(doc: Doctor) {
    setEditingDoctor(doc)
    setForm({
      first_name: doc.first_name,
      last_name: doc.last_name,
      license_number: doc.license_number ?? '',
      phone: doc.phone ?? '',
      email: doc.email ?? '',
    })
    setShowModal(true)
    setOpenActions(null)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const url = editingDoctor
        ? `/api/customers/configure/doctors/${editingDoctor.id}`
        : '/api/customers/configure/doctors'
      const method = editingDoctor ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        cache: 'no-store',
      })
      if (res.ok) {
        setShowModal(false)
        fetchDoctors()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/customers/configure/doctors/${deleteTarget.id}`, {
        method: 'DELETE',
        cache: 'no-store',
      })
      if (res.ok) {
        setDeleteTarget(null)
        fetchDoctors()
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h1 className="text-2xl font-bold text-gray-50 mb-6">Customer Configuration</h1>
      <ConfigureTabs />

      {/* Search + Add */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search doctors..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className={`${inputCls} max-w-sm`}
        />
        <button
          onClick={openAdd}
          className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          Add Doctor
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Name</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">License Number</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Phone</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Email</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td>
              </tr>
            ) : doctors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No doctors found.</td>
              </tr>
            ) : (
              doctors.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-gray-50">{doc.first_name} {doc.last_name}</td>
                  <td className="px-4 py-3 text-gray-300">{doc.license_number ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-300">{doc.phone ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-300">{doc.email ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      doc.is_active
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : 'bg-red-900/50 text-red-400'
                    }`}>
                      {doc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setOpenActions(openActions === doc.id ? null : doc.id)}
                      className="text-gray-400 hover:text-gray-200 text-lg leading-none px-2"
                    >
                      ...
                    </button>
                    {openActions === doc.id && (
                      <div className="absolute right-4 top-10 z-10 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                        <button
                          onClick={() => openEdit(doc)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(doc); setOpenActions(null) }}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-50 mb-4">
              {editingDoctor ? 'Edit Doctor' : 'Add Doctor'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>First Name</label>
                <input
                  className={inputCls}
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input
                  className={inputCls}
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>License Number</label>
                <input
                  className={inputCls}
                  value={form.license_number}
                  onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  className={inputCls}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.first_name || !form.last_name}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold text-gray-50 mb-2">Delete Doctor</h2>
            <p className="text-sm text-gray-300 mb-6">
              Are you sure you want to delete{' '}
              <span className="text-gray-50 font-medium">
                {deleteTarget.first_name} {deleteTarget.last_name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-40"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
