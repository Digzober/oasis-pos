'use client'

import { buildReceiptBodyHtml, type ReceiptData } from '@/lib/receipts/render'
import { PREVIEW_RECEIPT } from './receiptSettings'

export function ReceiptPreview({ config }: { config: Record<string, boolean> }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-secondary uppercase mb-3">Preview</h2>
      <div
        className="bg-surface text-inverse rounded-lg p-4 text-xs font-mono leading-relaxed max-w-[300px] [&_.center]:text-center [&_.bold]:font-bold [&_.divider]:border-t [&_.divider]:border-dashed [&_.divider]:border-edge-strong [&_.divider]:my-2 [&_.row]:flex [&_.row]:justify-between [&_.total-row]:flex [&_.total-row]:justify-between [&_.total-row]:font-bold [&_.detail]:pl-2 [&_.detail]:text-muted"
        dangerouslySetInnerHTML={{
          __html: buildReceiptBodyHtml({
            ...PREVIEW_RECEIPT,
            config: config as ReceiptData['config'],
          }),
        }}
      />
    </div>
  )
}
