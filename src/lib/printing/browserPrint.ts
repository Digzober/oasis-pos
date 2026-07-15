'use client'

import { buildReceiptDocumentHtml, type ReceiptData } from '@/lib/receipts/render'
import type { EffectivePrintPreferences } from './preferences'

interface SaleInventoryItem {
  id: string
  quantity: number
}

interface AutoPrintInput {
  transactionId: string
  inventoryItems: SaleInventoryItem[]
  preferences: EffectivePrintPreferences
}

function openPrintDocument(html: string, features: string): void {
  const printWindow = window.open('', '_blank', features)
  if (!printWindow) throw new Error('The browser blocked the print window')
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

async function printReceipt(transactionId: string): Promise<void> {
  const response = await fetch(`/api/terminal/receipt/${transactionId}`)
  if (!response.ok) throw new Error('Receipt could not be loaded for printing')
  const body = await response.json() as { receipt?: ReceiptData }
  if (!body.receipt) throw new Error('Receipt response was incomplete')
  openPrintDocument(buildReceiptDocumentHtml(body.receipt), 'width=400,height=600')
}

async function getDefaultLabelTemplateId(): Promise<string> {
  const response = await fetch('/api/labels/templates')
  if (!response.ok) throw new Error('Label templates could not be loaded')
  const body = await response.json() as {
    templates?: Array<{ id: string; is_default: boolean }>
  }
  const templates = body.templates ?? []
  const template = templates.find(({ is_default }) => is_default) ?? templates[0]
  if (!template) throw new Error('No active label template is available')
  return template.id
}

async function generateLabelHtml(templateId: string, inventoryItemId: string): Promise<string> {
  const response = await fetch('/api/labels/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: templateId, inventory_item_id: inventoryItemId }),
  })
  if (!response.ok) throw new Error('A sale label could not be generated')
  const body = await response.json() as { html?: string }
  if (!body.html) throw new Error('Label response was incomplete')
  return body.html
}

async function printLabels(items: SaleInventoryItem[]): Promise<void> {
  if (items.length === 0) return
  const templateId = await getDefaultLabelTemplateId()
  const generated = await Promise.all(items.map(async (item) => ({
    html: await generateLabelHtml(templateId, item.id), quantity: item.quantity,
  })))
  const labels = generated.flatMap(({ html, quantity }) => Array(quantity).fill(html))
  const separator = '<div style="page-break-after:always"></div>'
  const document = `<html><head><title>Sale labels</title><style>@media print{body{margin:0}}</style></head><body>${labels.join(separator)}</body></html>`
  openPrintDocument(document, 'width=600,height=600')
}

export async function runAutoPrintJobs(input: AutoPrintInput): Promise<void> {
  if (input.preferences.autoPrintReceipt) await printReceipt(input.transactionId)
  if (input.preferences.autoPrintLabels) await printLabels(input.inventoryItems)
}
