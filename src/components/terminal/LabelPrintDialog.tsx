'use client'

import { useState, useEffect } from 'react'

interface LabelPrintDialogProps {
  inventoryItemId: string
  onClose: () => void
}

export default function LabelPrintDialog({ inventoryItemId, onClose }: LabelPrintDialogProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [labelHtml, setLabelHtml] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/labels/templates').then(r => r.json()).then(d => {
      const tpls = d.templates ?? []
      setTemplates(tpls)
      const defaultTpl = tpls.find((t: { is_default: boolean }) => t.is_default) ?? tpls[0]
      if (defaultTpl) setSelectedTemplateId(defaultTpl.id)
    })
  }, [])

  useEffect(() => {
    if (!selectedTemplateId || !inventoryItemId) return
    void Promise.resolve().then(async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/labels/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template_id: selectedTemplateId, inventory_item_id: inventoryItemId }),
        })
        const data = await response.json()
        setLabelHtml(data.html ?? '')
      } finally {
        setLoading(false)
      }
    })
  }, [selectedTemplateId, inventoryItemId])

  const handlePrint = () => {
    const labels = Array(quantity).fill(labelHtml).join('<div style="page-break-after:always"></div>')
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Label</title><style>@media print{body{margin:0}}</style></head><body>${labels}</body></html>`)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="fixed inset-0 bg-bg/60 z-50 flex items-center justify-center">
      <div className="bg-surface border border-edge rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Print Label</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary">✕</button>
        </div>

        <label className="block">
          <span className="text-xs text-secondary">Template</span>
          <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}
            className="w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm">
            {templates.map((t: { id: string; name: string }) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-secondary">Quantity</span>
          <input type="number" min={1} max={50} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)}
            className="w-full h-10 px-3 bg-bg border border-edge-strong rounded-lg text-primary text-sm" />
        </label>

        {/* Preview */}
        <div className="bg-surface rounded-lg p-3 flex items-center justify-center min-h-[80px]">
          {loading ? <p className="text-muted text-sm">Loading...</p>
            : labelHtml ? <div dangerouslySetInnerHTML={{ __html: labelHtml }} />
            : <p className="text-secondary text-sm">No preview</p>}
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 bg-raised text-secondary rounded-lg text-sm">Cancel</button>
          <button onClick={handlePrint} disabled={!labelHtml} className="px-4 py-1.5 bg-accent text-primary rounded-lg text-sm disabled:opacity-50">Print {quantity > 1 ? `(${quantity})` : ''}</button>
        </div>
      </div>
    </div>
  )
}
