'use client'

import { SearchableSelect } from '@/components/shared/SearchableSelect'

interface DropdownOption {
  value: string
  label: string
}

export interface ReceivingHeaderData {
  vendor_id: string | null
  producer_id: string | null
  delivered_by: string
  vendor_license: string
  order_title: string
  delivered_on: string
  manifest_id: string
  room_id: string | null
  inventory_status: string
  total_credits: string
  shipping_charges: string
  cost_option: 'none' | 'divide_equally' | 'by_weight'
  notes: string
}

interface ReceivingHeaderProps {
  data: ReceivingHeaderData
  vendors: DropdownOption[]
  rooms: DropdownOption[]
  statuses: DropdownOption[]
  onChange: (field: keyof ReceivingHeaderData, value: string | null) => void
  onSave: () => void
  onReceive: () => void
  receiving: boolean
  canReceive: boolean
  itemCount: number
  totalCost: number
}

export function ReceivingHeader({
  data, vendors, rooms, statuses, onChange, onSave, onReceive,
  receiving, canReceive, itemCount, totalCost,
}: ReceivingHeaderProps) {
  const inputCls = 'w-full h-9 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Receiving Details</h2>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{itemCount} items</span>
          <span className="text-gray-600">|</span>
          <span>Total: ${totalCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-3">
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">Vendor</span>
          <SearchableSelect
            options={vendors}
            value={data.vendor_id}
            onChange={(v) => onChange('vendor_id', v)}
            placeholder="Select vendor..."
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">Producer</span>
          <SearchableSelect
            options={vendors}
            value={data.producer_id}
            onChange={(v) => onChange('producer_id', v)}
            placeholder="Select producer..."
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">Delivered by</span>
          <input
            value={data.delivered_by}
            onChange={(e) => onChange('delivered_by', e.target.value)}
            className={inputCls}
            placeholder="Driver name"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">Vendor License #</span>
          <input
            value={data.vendor_license}
            onChange={(e) => onChange('vendor_license', e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">Order Title</span>
          <input
            value={data.order_title}
            onChange={(e) => onChange('order_title', e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">Delivered on</span>
          <input
            type="datetime-local"
            value={data.delivered_on}
            onChange={(e) => onChange('delivered_on', e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">BioTrack Manifest ID</span>
          <input value={data.manifest_id} readOnly className={inputCls + ' opacity-60 cursor-not-allowed'} />
        </label>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">Room</span>
          <SearchableSelect
            options={rooms}
            value={data.room_id}
            onChange={(v) => onChange('room_id', v)}
            placeholder="Select room..."
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">Inventory Status</span>
          <select
            value={data.inventory_status}
            onChange={(e) => onChange('inventory_status', e.target.value)}
            className={inputCls}
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">Total Credits</span>
          <input
            type="number"
            step="0.01"
            value={data.total_credits}
            onChange={(e) => onChange('total_credits', e.target.value)}
            className={inputCls}
            placeholder="$0.00"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">Shipping Charges</span>
          <input
            type="number"
            step="0.01"
            value={data.shipping_charges}
            onChange={(e) => onChange('shipping_charges', e.target.value)}
            className={inputCls}
            placeholder="$0.00"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-400 mb-1 block">Apply Cost Options</span>
          <select
            value={data.cost_option}
            onChange={(e) => onChange('cost_option', e.target.value)}
            className={inputCls}
          >
            <option value="none">Don&apos;t apply</option>
            <option value="divide_equally">Divide equally</option>
            <option value="by_weight">By weight</option>
          </select>
        </label>
        <label className="block lg:col-span-2">
          <span className="text-[11px] text-gray-400 mb-1 block">Notes</span>
          <input
            value={data.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            className={inputCls}
            placeholder="Receiving notes..."
          />
        </label>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <div className="relative">
            <details className="group">
              <summary className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-600 list-none flex items-center gap-1">
                Actions
                <span className="text-xs">&#9662;</span>
              </summary>
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[180px]">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg"
                >
                  Print receiving report
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg"
                >
                  Export CSV
                </button>
              </div>
            </details>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={onReceive}
            disabled={!canReceive || receiving}
            className="px-5 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {receiving ? 'Receiving...' : 'Receive All'}
          </button>
        </div>
      </div>
    </div>
  )
}
