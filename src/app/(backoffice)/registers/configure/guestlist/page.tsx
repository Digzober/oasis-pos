'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { GuestlistWorkflowEvent } from '@/lib/guestlist/workflowMappings'

const inputCls = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'
const labelCls = 'block text-xs font-medium text-secondary uppercase mb-1'

const TABS = [
  { label: 'Guestlist Status', href: '/registers/configure/guestlist' },
  { label: 'Cards', href: '/registers/configure/cards' },
]

const PRESET_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

interface GuestlistStatus {
  id: string
  name: string
  color: string
  sort_order: number
}

const STATUS_MAPPINGS = [
  { event: 'default', label: 'Default Status' },
  { event: 'preorder_notify', label: 'Pre-order Notify' },
  { event: 'online_pickup', label: 'Online Pickup' },
  { event: 'online_delivery', label: 'Online Delivery' },
  { event: 'in_store_order', label: 'In-store Order' },
  { event: 'curbside', label: 'Curbside' },
  { event: 'drive_thru', label: 'Drive-thru' },
  { event: 'skipped_delivery', label: 'Skipped Delivery' },
  { event: 'ready_for_delivery', label: 'Ready for Delivery' },
  { event: 'start_delivery_route', label: 'Start Delivery Route' },
] satisfies Array<{ event: GuestlistWorkflowEvent; label: string }>

const EMPTY_MAPPINGS = Object.fromEntries(
  STATUS_MAPPINGS.map(({ event }) => [event, '']),
) as Record<GuestlistWorkflowEvent, string>

function SortableStatusCard({ status, onEdit, onDelete }: { status: GuestlistStatus; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-surface border border-edge rounded-lg px-4 py-3">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted hover:text-secondary shrink-0" aria-label="Drag to reorder">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" /></svg>
      </button>
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
      <span className="text-sm text-primary flex-1">{status.name}</span>
      <div className="flex items-center gap-1">
        <button onClick={onEdit} className="p-1 text-secondary hover:text-accent" aria-label="Edit">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <button onClick={onDelete} className="p-1 text-secondary hover:text-danger" aria-label="Delete">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )
}

export default function GuestlistStatusPage() {
  const pathname = usePathname()
  const [statuses, setStatuses] = useState<GuestlistStatus[]>([])
  const [mappings, setMappings] = useState(EMPTY_MAPPINGS)
  const [savedMappings, setSavedMappings] = useState(EMPTY_MAPPINGS)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingStatus, setEditingStatus] = useState<GuestlistStatus | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [statusRes, mappingsRes] = await Promise.all([
      fetch('/api/registers/configure/guestlist-statuses', { cache: 'no-store' }),
      fetch('/api/registers/configure/guestlist-workflow-mappings', { cache: 'no-store' }),
    ])
    if (statusRes.ok) {
      const data = await statusRes.json()
      setStatuses(data.statuses ?? [])
    }
    if (mappingsRes.ok) {
      const data = await mappingsRes.json()
      const next = Object.fromEntries(STATUS_MAPPINGS.map(({ event }) => [
        event,
        typeof data.mappings?.[event] === 'string' ? data.mappings[event] : '',
      ])) as Record<GuestlistWorkflowEvent, string>
      setMappings(next)
      setSavedMappings(next)
    } else {
      setError('Unable to load workflow mappings')
    }
    setLoading(false)
  }, [])

  useEffect(() => { void Promise.resolve().then(fetchData) }, [fetchData])

  const openAddModal = () => {
    setEditingStatus(null)
    setNewName('')
    setNewColor(PRESET_COLORS[0])
    setShowModal(true)
  }

  const openEditModal = (status: GuestlistStatus) => {
    setEditingStatus(status)
    setNewName(status.name)
    setNewColor(status.color)
    setShowModal(true)
  }

  const saveStatus = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const method = editingStatus ? 'PATCH' : 'POST'
    const body = editingStatus
      ? { id: editingStatus.id, name: newName.trim(), color: newColor }
      : { name: newName.trim(), color: newColor }
    const res = await fetch('/api/registers/configure/guestlist-statuses', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setShowModal(false)
      await fetchData()
    }
    setSaving(false)
  }

  const deleteStatus = async (id: string) => {
    const res = await fetch(`/api/registers/configure/guestlist-statuses/${id}`, {
      method: 'DELETE',
    })
    if (res.ok) await fetchData()
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = statuses.findIndex(s => s.id === active.id)
    const newIndex = statuses.findIndex(s => s.id === over.id)
    const reordered = arrayMove(statuses, oldIndex, newIndex).map((s, i) => ({ ...s, sort_order: i }))
    setStatuses(reordered)
    for (const s of reordered) {
      await fetch(`/api/registers/configure/guestlist-statuses/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: s.sort_order }),
      })
    }
  }

  const saveMappings = async () => {
    setSaving(true)
    setError(null)
    const patch = Object.fromEntries(STATUS_MAPPINGS
      .filter(({ event }) => mappings[event] !== savedMappings[event])
      .map(({ event }) => [event, mappings[event] || null]))
    const res = await fetch('/api/registers/configure/guestlist-workflow-mappings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      setSavedMappings(mappings)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(typeof data.error === 'string' ? data.error : 'Unable to save workflow mappings')
    }
    setSaving(false)
  }

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-edge mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              pathname === tab.href
                ? 'border-accent text-accent'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-primary">Guestlist Statuses</h1>
        <button onClick={openAddModal} className="px-4 py-2 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent">
          Add Status
        </button>
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <>
          {/* Status Cards — Drag and Drop */}
          <div className="space-y-2 mb-8">
            {statuses.length === 0 ? (
              <div className="bg-surface border border-edge rounded-lg p-6 text-center text-muted">
                No statuses configured yet
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={statuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {statuses.map(status => (
                    <SortableStatusCard
                      key={status.id}
                      status={status}
                      onEdit={() => openEditModal(status)}
                      onDelete={() => deleteStatus(status.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Status Mappings */}
          <h2 className="text-lg font-semibold text-primary mb-4">Event Status Mappings</h2>
          {error && (
            <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {STATUS_MAPPINGS.map(mapping => (
              <div key={mapping.event}>
                <label htmlFor={`workflow-${mapping.event}`} className={labelCls}>{mapping.label}</label>
                <select
                  id={`workflow-${mapping.event}`}
                  value={mappings[mapping.event]}
                  onChange={e => setMappings(prev => ({ ...prev, [mapping.event]: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">-- Select --</option>
                  {statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button onClick={saveMappings} disabled={saving} className="px-6 py-2.5 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Mappings'}
          </button>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60">
          <div className="bg-surface border border-edge rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-primary mb-4">
              {editingStatus ? 'Edit Status' : 'Add Status'}
            </h3>
            <div className="mb-4">
              <label className={labelCls}>Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className={inputCls}
                placeholder="e.g. Checked In"
              />
            </div>
            <div className="mb-6">
              <label className={labelCls}>Color</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${newColor === c ? 'border-edge scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-secondary hover:text-primary">
                Cancel
              </button>
              <button onClick={saveStatus} disabled={saving || !newName.trim()} className="px-4 py-2 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent disabled:opacity-50">
                {saving ? 'Saving...' : editingStatus ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
