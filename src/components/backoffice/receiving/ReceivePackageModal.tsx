'use client'

import { useState, useCallback } from 'react'
import { SearchableSelect } from '@/components/shared/SearchableSelect'
import { ProductMatcher, type ProductMatch } from './ProductMatcher'
import type { ReceivingItem } from './ReceivingItemsTable'

interface DropdownOption {
  value: string
  label: string
}

interface ReceivePackageModalProps {
  item: ReceivingItem
  index: number
  productMatches: ProductMatch[]
  vendors: DropdownOption[]
  rooms: DropdownOption[]
  subrooms: DropdownOption[]
  strains: DropdownOption[]
  tags: DropdownOption[]
  statuses: DropdownOption[]
  onSave: (index: number, updates: Partial<ReceivingItem>) => void
  onRemove: (index: number) => void
  onClose: () => void
  onProductSearch: (query: string) => void
  onProductSelect: (index: number, productId: string, match: ProductMatch) => void
  onRoomChange: (roomId: string) => void
  matchLoading?: boolean
}

export function ReceivePackageModal({
  item, index, productMatches, vendors, rooms, subrooms, strains, tags, statuses,
  onSave, onRemove, onClose, onProductSearch, onProductSelect, onRoomChange, matchLoading,
}: ReceivePackageModalProps) {
  const [draft, setDraft] = useState<ReceivingItem>(() => ({ ...item }))
  const [editedFields] = useState<Set<string>>(() => new Set(item.user_edited_fields))
  const [lastItemId, setLastItemId] = useState(item.id)

  if (item.id !== lastItemId) {
    setLastItemId(item.id)
    setDraft({ ...item })
  }

  const updateField = useCallback((field: keyof ReceivingItem, value: unknown) => {
    editedFields.add(field)
    setDraft((prev) => ({ ...prev, [field]: value }))
  }, [editedFields])

  const handleSave = () => {
    onSave(index, { ...draft, user_edited_fields: editedFields })
  }

  const handleClearAll = () => {
    setDraft({
      ...draft,
      product_id: null,
      product_name: null,
      vendor_id: null,
      vendor_name: null,
      room_id: null,
      room_name: null,
      subroom_id: null,
      cost_per_unit: null,
      confidence: 0,
      match: null,
      strain_id: null,
      lot_number: null,
      expiration_date: null,
      packaging_date: null,
      external_package_id: null,
      package_ndc: null,
      tax_per_unit: null,
      med_price: null,
      rec_price: null,
      flower_equivalent: null,
      inventory_status: null,
      tags: [],
      grams: null,
      producer_id: null,
    })
    editedFields.clear()
  }

  const handleProductSelect = (productId: string, match: ProductMatch) => {
    onProductSelect(index, productId, match)
  }

  const handleRoomChange = (roomId: string | null) => {
    updateField('room_id', roomId)
    if (roomId) onRoomChange(roomId)
  }

  const inputCls = 'w-full h-9 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const readOnlyCls = inputCls + ' opacity-60 cursor-not-allowed'
  const totalCost = (draft.cost_per_unit ?? 0) * draft.quantity

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-3xl shadow-2xl"
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-50">Receive Package</h2>
            <p className="text-xs text-gray-500 mt-0.5">Item {index + 1} - {draft.barcode}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl leading-none">
            &#10005;
          </button>
        </div>

        <div className="px-6 py-4 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Section 1: Product Matching */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Product Matching</h3>
            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Listed product (BioTrack)</span>
                <p className="text-sm text-gray-400 bg-gray-900 rounded-lg px-3 py-2 border border-gray-700">
                  {draft.biotrack_name} &mdash; {draft.original_quantity} {draft.item_type === 'weight' ? 'g' : 'qty'}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Catalog Product *</span>
                <ProductMatcher
                  matches={productMatches}
                  selectedProductId={draft.product_id}
                  onSelect={handleProductSelect}
                  onSearch={onProductSearch}
                  biotrackName={draft.biotrack_name}
                  loading={matchLoading}
                />
              </div>
              {draft.product_id && (
                <a
                  href={`/products/${draft.product_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300"
                >
                  Edit product in new tab &#8599;
                </a>
              )}
            </div>
          </section>

          {/* Section 2: Quantities & Classification */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quantities & Classification</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {tags.length > 0 ? (
                    <select
                      multiple
                      value={draft.tags}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (o) => o.value)
                        updateField('tags', selected)
                      }}
                      className={inputCls + ' h-20'}
                    >
                      {tags.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-600">No tags available</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Type</span>
                <input value={draft.item_type === 'weight' ? 'Weight' : 'Quantity'} readOnly className={readOnlyCls} />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Quantity *</span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.001"
                    value={draft.quantity}
                    onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
                    className={inputCls}
                  />
                  <span className="flex items-center text-xs text-gray-500 px-2 bg-gray-900 border border-gray-600 rounded-lg">
                    {draft.item_type === 'weight' ? 'g' : 'qty'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Vendor *</span>
                <SearchableSelect
                  options={vendors}
                  value={draft.vendor_id}
                  onChange={(v) => {
                    updateField('vendor_id', v)
                    const vn = vendors.find((x) => x.value === v)
                    updateField('vendor_name', vn?.label ?? null)
                  }}
                  placeholder="Select vendor..."
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Grams / Concentration</span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.001"
                    value={draft.grams ?? ''}
                    onChange={(e) => updateField('grams', e.target.value ? parseFloat(e.target.value) : null)}
                    className={inputCls}
                  />
                  <span className="flex items-center text-xs text-gray-500 px-2 bg-gray-900 border border-gray-600 rounded-lg">
                    g
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Producer</span>
                <SearchableSelect
                  options={vendors}
                  value={draft.producer_id}
                  onChange={(v) => updateField('producer_id', v)}
                  placeholder="Select producer..."
                />
              </div>
            </div>
          </section>

          {/* Section 3: Location & Status */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Location & Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Room *</span>
                <SearchableSelect
                  options={rooms}
                  value={draft.room_id}
                  onChange={handleRoomChange}
                  placeholder="Select room..."
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Subroom</span>
                <SearchableSelect
                  options={subrooms}
                  value={draft.subroom_id}
                  onChange={(v) => updateField('subroom_id', v)}
                  placeholder="Select subroom..."
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Flower Equivalent</span>
                <input
                  type="number"
                  step="0.001"
                  value={draft.flower_equivalent ?? ''}
                  onChange={(e) => updateField('flower_equivalent', e.target.value ? parseFloat(e.target.value) : null)}
                  className={inputCls}
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Expiration Date</span>
                <input
                  type="date"
                  value={draft.expiration_date ?? ''}
                  onChange={(e) => updateField('expiration_date', e.target.value || null)}
                  className={inputCls}
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Inventory Status</span>
                <select
                  value={draft.inventory_status ?? ''}
                  onChange={(e) => updateField('inventory_status', e.target.value || null)}
                  className={inputCls}
                >
                  <option value="">Inherit from header</option>
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Section 4: Package & Batch */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Package & Batch</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Package ID *</span>
                <input value={draft.barcode} readOnly className={readOnlyCls} />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Packaging Date</span>
                <input
                  type="date"
                  value={draft.packaging_date ?? ''}
                  onChange={(e) => updateField('packaging_date', e.target.value || null)}
                  className={inputCls}
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">External Package ID</span>
                <input
                  value={draft.external_package_id ?? ''}
                  onChange={(e) => updateField('external_package_id', e.target.value || null)}
                  className={inputCls}
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Lot Name / Batch ID *</span>
                <input
                  value={draft.lot_number ?? ''}
                  onChange={(e) => updateField('lot_number', e.target.value || null)}
                  className={inputCls}
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Package NDC</span>
                <input
                  value={draft.package_ndc ?? ''}
                  onChange={(e) => updateField('package_ndc', e.target.value || null)}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Section 5: Pricing */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pricing</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Strain</span>
                <SearchableSelect
                  options={strains}
                  value={draft.strain_id}
                  onChange={(v) => updateField('strain_id', v)}
                  placeholder="Select strain..."
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Tax per Unit</span>
                <input
                  type="number"
                  step="0.01"
                  value={draft.tax_per_unit ?? ''}
                  onChange={(e) => updateField('tax_per_unit', e.target.value ? parseFloat(e.target.value) : null)}
                  className={inputCls}
                  placeholder="$0.00"
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Cost per Unit *</span>
                <input
                  type="number"
                  step="0.01"
                  value={draft.cost_per_unit ?? ''}
                  onChange={(e) => updateField('cost_per_unit', e.target.value ? parseFloat(e.target.value) : null)}
                  className={inputCls}
                  placeholder="$0.00"
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Med Price per Unit</span>
                <input
                  type="number"
                  step="0.01"
                  value={draft.med_price ?? ''}
                  onChange={(e) => updateField('med_price', e.target.value ? parseFloat(e.target.value) : null)}
                  className={inputCls}
                  placeholder="$0.00"
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Rec Price per Unit</span>
                <input
                  type="number"
                  step="0.01"
                  value={draft.rec_price ?? ''}
                  onChange={(e) => updateField('rec_price', e.target.value ? parseFloat(e.target.value) : null)}
                  className={inputCls}
                  placeholder="$0.00"
                />
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block mb-1">Total Package Cost *</span>
                <input
                  type="number"
                  value={totalCost.toFixed(2)}
                  readOnly
                  className={readOnlyCls + ' font-mono font-bold'}
                />
              </div>
            </div>
          </section>

          {/* Section 6: Lab Results */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Lab Results</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.use_biotrack_lab}
                    onChange={(e) => updateField('use_biotrack_lab', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-300">Get BioTrack lab results</span>
                </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <span className="text-[11px] text-gray-500 block mb-1">THC %</span>
                  <input
                    type="number"
                    step="0.01"
                    value={draft.thc_percentage ?? ''}
                    onChange={(e) => updateField('thc_percentage', e.target.value ? parseFloat(e.target.value) : null)}
                    readOnly={draft.use_biotrack_lab && draft.thc_percentage !== null}
                    className={draft.use_biotrack_lab && draft.thc_percentage !== null ? readOnlyCls : inputCls}
                    placeholder="0.00"
                  />
                  {draft.use_biotrack_lab && draft.thc_percentage !== null && (
                    <span className="text-[10px] text-emerald-500 mt-0.5 block">From BioTrack</span>
                  )}
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 block mb-1">CBD %</span>
                  <input
                    type="number"
                    step="0.01"
                    value={draft.cbd_percentage ?? ''}
                    onChange={(e) => updateField('cbd_percentage', e.target.value ? parseFloat(e.target.value) : null)}
                    readOnly={draft.use_biotrack_lab && draft.cbd_percentage !== null}
                    className={draft.use_biotrack_lab && draft.cbd_percentage !== null ? readOnlyCls : inputCls}
                    placeholder="0.00"
                  />
                  {draft.use_biotrack_lab && draft.cbd_percentage !== null && (
                    <span className="text-[10px] text-emerald-500 mt-0.5 block">From BioTrack</span>
                  )}
                </div>
              </div>

              {draft.lab_results && Object.keys(draft.lab_results).length > 0 && (
                <details className="group">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                    View full lab results JSON ({Object.keys(draft.lab_results).length} fields)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-400 overflow-x-auto max-h-48">
                    {JSON.stringify(draft.lab_results, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Remove package
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500"
            >
              Save package
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
