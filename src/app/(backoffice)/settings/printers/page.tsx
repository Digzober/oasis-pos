'use client'

import { useState, useEffect, useCallback } from 'react'
import { DENSE_BESPOKE_TABLE_CLASS } from '@/lib/constants/tableDensity'

const inputCls = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent'

interface Printer {
  id: string
  name: string
  printer_id: string
  printer_type: string
  computer_name: string
  connection_type: string
  ip_address: string | null
  port: number | null
  supports_labels: boolean
  supports_receipts: boolean
  is_active: boolean
}

interface PrintService {
  service_type: string
  apiKey: string
  account_email: string
  hasApiKey: boolean
  apiKeyTail: string | null
}

const EMPTY_FORM = {
  name: '',
  printer_id: '',
  printer_type: 'esc_pos',
  computer_name: '',
  supports_labels: false,
  supports_receipts: true,
  connection_type: 'usb',
  ip_address: '',
  port: '',
}

const TYPE_COLORS: Record<string, string> = {
  esc_pos: 'bg-info/50 text-info border-info',
  zpl: 'bg-info/50 text-info border-info',
  brother: 'bg-warning/50 text-warning border-warning',
  pdf: 'bg-raised text-secondary border-edge-strong',
}

const CONN_COLORS: Record<string, string> = {
  usb: 'bg-accent/50 text-accent border-accent',
  network: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
  bluetooth: 'bg-indigo-900/50 text-indigo-300 border-indigo-700',
  serial: 'bg-orange-900/50 text-orange-300 border-orange-700',
}

export default function PrintersPage() {
  const [printers, setPrinters] = useState<Printer[]>([])
  const [printService, setPrintService] = useState<PrintService>({ service_type: 'printnode', apiKey: '', account_email: '', hasApiKey: false, apiKeyTail: null })
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [savingService, setSavingService] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      fetch('/api/settings/printers', { cache: 'no-store' }),
      fetch('/api/settings/print-service', { cache: 'no-store' }),
    ])
    if (pRes.ok) {
      const d = await pRes.json()
      setPrinters(d.printers ?? [])
    }
    if (sRes.ok) {
      const d = await sRes.json()
      setPrintService({
        service_type: d.config?.service_type ?? 'printnode',
        apiKey: '',
        account_email: d.config?.account_email ?? '',
        hasApiKey: d.config?.hasApiKey ?? false,
        apiKeyTail: d.config?.apiKeyTail ?? null,
      })
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const openAdd = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (p: Printer) => {
    setEditId(p.id)
    setForm({
      name: p.name,
      printer_id: p.printer_id,
      printer_type: p.printer_type,
      computer_name: p.computer_name,
      supports_labels: p.supports_labels,
      supports_receipts: p.supports_receipts,
      connection_type: p.connection_type,
      ip_address: p.ip_address ?? '',
      port: p.port ? String(p.port) : '',
    })
    setShowModal(true)
  }

  const savePrinter = async () => {
    setSaving(true)
    setMsg(null)
    const body = {
      name: form.name,
      printer_id: form.printer_id,
      printer_type: form.printer_type,
      computer_name: form.computer_name,
      supports_labels: form.supports_labels,
      supports_receipts: form.supports_receipts,
      connection_type: form.connection_type,
      ip_address: form.ip_address || null,
      port: form.port ? parseInt(form.port, 10) : null,
    }
    const url = editId ? `/api/settings/printers/${editId}` : '/api/settings/printers'
    const method = editId ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' })
    setSaving(false)
    if (res.ok) {
      setShowModal(false)
      setMsg({ type: 'ok', text: editId ? 'Printer updated' : 'Printer added' })
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setMsg({ type: 'err', text: d.error ?? 'Failed to save printer' })
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setMsg(null)
    const res = await fetch(`/api/settings/printers/${deleteId}`, { method: 'DELETE', cache: 'no-store' })
    if (res.ok) {
      setMsg({ type: 'ok', text: 'Printer removed' })
      load()
    } else {
      setMsg({ type: 'err', text: 'Failed to delete printer' })
    }
    setDeleteId(null)
  }

  const savePrintService = async () => {
    setSavingService(true)
    setMsg(null)
    const res = await fetch('/api/settings/print-service', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_type: printService.service_type,
        account_email: printService.account_email,
        ...(printService.apiKey ? { apiKey: printService.apiKey } : {}),
      }),
      cache: 'no-store',
    })
    setSavingService(false)
    if (res.ok) {
      const data = await res.json()
      setPrintService((current) => ({
        ...current,
        apiKey: '',
        hasApiKey: data.config?.hasApiKey ?? current.hasApiKey,
        apiKeyTail: data.config?.apiKeyTail ?? current.apiKeyTail,
      }))
      setMsg({ type: 'ok', text: 'Print service configuration saved' })
    } else {
      setMsg({ type: 'err', text: 'Failed to save print service configuration' })
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Printers</h1>
        <button onClick={openAdd} className="text-sm px-3 py-1.5 bg-accent text-primary rounded-lg hover:bg-accent">
          + Add Printer
        </button>
      </div>

      {/* Status message */}
      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-accent/50 text-accent border border-accent' : 'bg-danger/50 text-danger border border-danger'}`}>
          {msg.text}
        </div>
      )}

      {/* Printers Table */}
      <div className="bg-surface rounded-xl border border-edge overflow-hidden mb-8">
          <table data-density="compact" className={`${DENSE_BESPOKE_TABLE_CLASS} w-full`}>
          <thead>
            <tr className="border-b border-edge text-secondary text-xs uppercase">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Computer</th>
              <th className="text-left px-4 py-3">Connection</th>
              <th className="text-center px-4 py-3">Labels</th>
              <th className="text-center px-4 py-3">Receipts</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {printers.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">No printers configured</td></tr>
            )}
            {printers.map(p => (
              <tr key={p.id} className="border-b border-edge/50 hover:bg-raised/30">
                <td className="px-4 py-2.5 text-primary font-medium">{p.name}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs border ${TYPE_COLORS[p.printer_type] ?? 'bg-raised text-secondary border-edge-strong'}`}>
                    {p.printer_type}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-secondary">{p.computer_name}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs border ${CONN_COLORS[p.connection_type] ?? 'bg-raised text-secondary border-edge-strong'}`}>
                    {p.connection_type}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {p.supports_labels
                    ? <span className="text-accent">&#10003;</span>
                    : <span className="text-muted">&#10005;</span>}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {p.supports_receipts
                    ? <span className="text-accent">&#10003;</span>
                    : <span className="text-muted">&#10005;</span>}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${p.is_active ? 'bg-accent/50 text-accent' : 'bg-danger/50 text-danger'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right space-x-2">
                  <button onClick={() => openEdit(p)} className="text-xs text-accent hover:text-accent">Edit</button>
                  <button onClick={() => setDeleteId(p.id)} className="text-xs text-danger hover:text-danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Print Service Configuration */}
      <div className="bg-surface rounded-xl border border-edge p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Print Service Configuration</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-secondary mb-1">Service Type</label>
            <select
              value={printService.service_type}
              onChange={e => setPrintService(s => ({ ...s, service_type: e.target.value }))}
              className={inputCls}
            >
              <option value="printnode">PrintNode</option>
              <option value="google_cloud_print">Google Cloud Print</option>
              <option value="direct">Direct</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">API Key</label>
            <input
              value={printService.apiKey}
              onChange={e => setPrintService(s => ({ ...s, apiKey: e.target.value }))}
              placeholder={printService.hasApiKey ? printService.apiKeyTail ?? 'Stored key' : 'API key'}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Account Email</label>
            <input
              value={printService.account_email}
              onChange={e => setPrintService(s => ({ ...s, account_email: e.target.value }))}
              placeholder="email@example.com"
              className={inputCls}
            />
          </div>
        </div>
        <button onClick={savePrintService} disabled={savingService} className="px-4 py-2 bg-accent text-primary rounded-lg text-sm hover:bg-accent disabled:opacity-50">
          {savingService ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Add/Edit Printer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60">
          <div className="bg-surface rounded-xl border border-edge p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-primary mb-4">{editId ? 'Edit Printer' : 'Add Printer'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-secondary mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Front Register Printer" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-secondary mb-1">Printer ID</label>
                <input value={form.printer_id} onChange={e => setForm(f => ({ ...f, printer_id: e.target.value }))} placeholder="Printer identifier" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-secondary mb-1">Printer Type</label>
                  <select value={form.printer_type} onChange={e => setForm(f => ({ ...f, printer_type: e.target.value }))} className={inputCls}>
                    <option value="esc_pos">ESC/POS</option>
                    <option value="zpl">ZPL</option>
                    <option value="brother">Brother</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">Computer Name</label>
                  <input value={form.computer_name} onChange={e => setForm(f => ({ ...f, computer_name: e.target.value }))} placeholder="POS-01" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-secondary mb-1">Connection Type</label>
                <select value={form.connection_type} onChange={e => setForm(f => ({ ...f, connection_type: e.target.value }))} className={inputCls}>
                  <option value="usb">USB</option>
                  <option value="network">Network</option>
                  <option value="bluetooth">Bluetooth</option>
                  <option value="serial">Serial</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-secondary mb-1">IP Address</label>
                  <input value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} placeholder="192.168.1.100" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">Port</label>
                  <input value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} placeholder="9100" className={inputCls} />
                </div>
              </div>
              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                  <input type="checkbox" checked={form.supports_labels} onChange={e => setForm(f => ({ ...f, supports_labels: e.target.checked }))}
                    className="w-4 h-4 rounded bg-bg border-edge-strong text-accent focus:ring-accent" />
                  Supports Labels
                </label>
                <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                  <input type="checkbox" checked={form.supports_receipts} onChange={e => setForm(f => ({ ...f, supports_receipts: e.target.checked }))}
                    className="w-4 h-4 rounded bg-bg border-edge-strong text-accent focus:ring-accent" />
                  Supports Receipts
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-secondary hover:text-primary">Cancel</button>
              <button onClick={savePrinter} disabled={saving || !form.name} className="px-4 py-2 bg-accent text-primary rounded-lg text-sm hover:bg-accent disabled:opacity-50">
                {saving ? 'Saving...' : editId ? 'Update' : 'Add Printer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60">
          <div className="bg-surface rounded-xl border border-edge p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-primary mb-2">Delete Printer</h2>
            <p className="text-sm text-secondary mb-6">Are you sure you want to remove this printer? This action will deactivate the printer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-secondary hover:text-primary">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-danger text-primary rounded-lg text-sm hover:bg-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
