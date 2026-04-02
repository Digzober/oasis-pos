'use client'

import type { ProductMatch } from './ProductMatcher'

export interface ReceivingItem {
  id: string
  barcode: string
  biotrack_name: string
  quantity: number
  original_quantity: number
  weight: number
  category: string
  batch_number: string
  item_type: 'quantity' | 'weight'
  product_id: string | null
  product_name: string | null
  vendor_id: string | null
  vendor_name: string | null
  room_id: string | null
  room_name: string | null
  subroom_id: string | null
  cost_per_unit: number | null
  confidence: number
  match: ProductMatch | null
  strain_id: string | null
  lot_number: string | null
  expiration_date: string | null
  packaging_date: string | null
  external_package_id: string | null
  package_ndc: string | null
  tax_per_unit: number | null
  med_price: number | null
  rec_price: number | null
  flower_equivalent: number | null
  inventory_status: string | null
  tags: string[]
  thc_percentage: number | null
  cbd_percentage: number | null
  lab_results: Record<string, unknown> | null
  use_biotrack_lab: boolean
  grams: number | null
  producer_id: string | null
  is_complete: boolean
  user_edited_fields: Set<string>
}

interface ReceivingItemsTableProps {
  items: ReceivingItem[]
  onEditItem: (index: number) => void
  onDeleteItem: (index: number) => void
  selectedIndex: number | null
}

function statusIcon(item: ReceivingItem): { icon: string; color: string; title: string } {
  if (!item.product_id) {
    return { icon: '\u2716', color: 'text-red-400 bg-red-600/20', title: 'No product match' }
  }
  if (item.confidence >= 0.8 && item.is_complete) {
    return { icon: '\u2714', color: 'text-emerald-400 bg-emerald-600/20', title: 'Matched & complete' }
  }
  return { icon: '\u26A0', color: 'text-amber-400 bg-amber-600/20', title: 'Needs attention' }
}

function confidenceBadge(confidence: number): { label: string; cls: string } {
  if (confidence >= 0.8) return { label: `${Math.round(confidence * 100)}%`, cls: 'bg-emerald-600/20 text-emerald-400' }
  if (confidence >= 0.5) return { label: `${Math.round(confidence * 100)}%`, cls: 'bg-amber-600/20 text-amber-400' }
  return { label: `${Math.round(confidence * 100)}%`, cls: 'bg-red-600/20 text-red-400' }
}

export function ReceivingItemsTable({ items, onEditItem, onDeleteItem, selectedIndex }: ReceivingItemsTableProps) {
  const totalCost = items.reduce((sum, item) => {
    const cost = (item.cost_per_unit ?? 0) * item.quantity
    return sum + cost
  }, 0)

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Items Received</h2>
        <span className="text-xs text-gray-500">{items.length} items</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left">
              <th className="px-3 py-2.5 text-[11px] text-gray-500 font-medium uppercase w-12">Status</th>
              <th className="px-3 py-2.5 text-[11px] text-gray-500 font-medium uppercase min-w-[240px]">Product</th>
              <th className="px-3 py-2.5 text-[11px] text-gray-500 font-medium uppercase w-20">Type</th>
              <th className="px-3 py-2.5 text-[11px] text-gray-500 font-medium uppercase w-20 text-right">Qty</th>
              <th className="px-3 py-2.5 text-[11px] text-gray-500 font-medium uppercase w-16">Units</th>
              <th className="px-3 py-2.5 text-[11px] text-gray-500 font-medium uppercase w-20 text-right">Orig Qty</th>
              <th className="px-3 py-2.5 text-[11px] text-gray-500 font-medium uppercase w-28">Vendor</th>
              <th className="px-3 py-2.5 text-[11px] text-gray-500 font-medium uppercase w-28">Room</th>
              <th className="px-3 py-2.5 text-[11px] text-gray-500 font-medium uppercase min-w-[120px]">Package ID</th>
              <th className="px-3 py-2.5 text-[11px] text-gray-500 font-medium uppercase w-24 text-right">Cost</th>
              <th className="px-3 py-2.5 text-[11px] text-gray-500 font-medium uppercase w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const status = statusIcon(item)
              const badge = item.product_id ? confidenceBadge(item.confidence) : null
              const lineCost = (item.cost_per_unit ?? 0) * item.quantity

              return (
                <tr
                  key={item.id}
                  onClick={() => onEditItem(idx)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onEditItem(idx)
                  }}
                  className={`border-b border-gray-700/50 cursor-pointer hover:bg-gray-750 transition-colors ${
                    selectedIndex === idx ? 'bg-gray-700/40' : ''
                  } ${!item.is_complete ? 'bg-amber-900/5' : ''}`}
                >
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${status.color}`} title={status.title}>
                      {status.icon}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-gray-500 text-xs truncate">{item.biotrack_name}</p>
                    {item.product_name ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-gray-100 truncate">{item.product_name}</span>
                        {badge && (
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-red-400 text-xs mt-0.5">No match - click to assign</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-400">{item.item_type === 'weight' ? 'Weight' : 'Quantity'}</td>
                  <td className="px-3 py-2.5 text-right text-gray-200 font-mono">{item.quantity}</td>
                  <td className="px-3 py-2.5 text-gray-400">{item.item_type === 'weight' ? 'g' : 'qty'}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500 font-mono">{item.original_quantity}</td>
                  <td className="px-3 py-2.5 text-gray-400 truncate">{item.vendor_name ?? '-'}</td>
                  <td className="px-3 py-2.5 text-gray-400 truncate">{item.room_name ?? '-'}</td>
                  <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{item.barcode}</td>
                  <td className="px-3 py-2.5 text-right text-gray-200 font-mono">${lineCost.toFixed(2)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEditItem(idx) }}
                        className="p-1 text-gray-500 hover:text-gray-300 rounded"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDeleteItem(idx) }}
                        className="p-1 text-gray-500 hover:text-red-400 rounded"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-600">
              <td colSpan={9} className="px-3 py-3 text-right text-sm font-medium text-gray-300">Total Cost</td>
              <td className="px-3 py-3 text-right text-sm font-bold text-gray-100 font-mono">${totalCost.toFixed(2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
