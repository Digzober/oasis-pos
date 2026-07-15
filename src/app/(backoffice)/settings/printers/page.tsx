'use client'

import { useCallback, useEffect, useState } from 'react'

interface PrinterEndpoint {
  id: string
  name: string
  ip_address: string | null
  port: number | null
}

export default function PrintersPage() {
  const [printers, setPrinters] = useState<PrinterEndpoint[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [port, setPort] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const selectPrinter = useCallback((rows: PrinterEndpoint[], id: string) => {
    const selected = rows.find((printer) => printer.id === id)
    setSelectedId(selected?.id ?? '')
    setIpAddress(selected?.ip_address ?? '')
    setPort(selected?.port == null ? '' : String(selected.port))
  }, [])

  const load = useCallback(async () => {
    const [printerResponse, serviceResponse] = await Promise.all([
      fetch('/api/settings/printers', { cache: 'no-store' }),
      fetch('/api/settings/print-service', { cache: 'no-store' }),
    ])
    const printerBody = printerResponse.ok ? await printerResponse.json() : null
    const rows = (printerBody?.printers ?? []) as PrinterEndpoint[]
    setPrinters(rows)
    selectPrinter(rows, selectedId || rows[0]?.id || '')
    if (serviceResponse.ok) {
      const serviceBody = await serviceResponse.json()
      setAccountEmail(serviceBody.config?.account_email ?? '')
    }
  }, [selectPrinter, selectedId])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const save = async () => {
    setSaving(true)
    setMessage('')
    const requests: Promise<Response>[] = [fetch('/api/settings/print-service', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_email: accountEmail.trim() || null }),
    })]
    if (selectedId) {
      requests.push(fetch(`/api/settings/printers/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: ipAddress.trim() || null,
          port: port ? Number(port) : null,
        }),
      }))
    }
    const responses = await Promise.all(requests)
    setMessage(responses.every(({ ok }) => ok) ? 'Printer endpoints saved.' : 'Unable to save printer endpoints.')
    setSaving(false)
    if (responses.every(({ ok }) => ok)) await load()
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-primary mb-2">Printer endpoints</h1>
      <p className="text-sm text-secondary mb-6">
        Clear any optional endpoint field to store a database NULL.
      </p>

      <div className="bg-surface border border-edge rounded-xl p-6 space-y-4">
        {printers.length > 0 && (
          <Field label="Configured printer">
            <select
              value={selectedId}
              onChange={(event) => selectPrinter(printers, event.target.value)}
              className={INPUT_CLASS}
            >
              {printers.map((printer) => (
                <option key={printer.id} value={printer.id}>{printer.name}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="IP address">
            <input value={ipAddress} onChange={(event) => setIpAddress(event.target.value)} className={INPUT_CLASS} />
          </Field>
          <Field label="Port">
            <input type="number" min="1" max="65535" value={port} onChange={(event) => setPort(event.target.value)} className={INPUT_CLASS} />
          </Field>
        </div>
        <Field label="Print service account email">
          <input type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} className={INPUT_CLASS} />
        </Field>
        <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-lg bg-accent text-primary disabled:opacity-50">
          {saving ? 'Saving...' : 'Save endpoints'}
        </button>
        {message && <p className="text-sm text-secondary">{message}</p>}
      </div>
    </div>
  )
}

const INPUT_CLASS = 'w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-secondary uppercase space-y-1.5"><span>{label}</span>{children}</label>
}
