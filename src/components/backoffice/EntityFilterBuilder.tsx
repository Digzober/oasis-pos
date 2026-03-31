'use client'

import { useState, useEffect } from 'react'

interface EntityFilters {
  strain_ids: string[]; category_ids: string[]; brand_ids: string[]; vendor_ids: string[]
  weight_ids: string[]; product_tag_ids: string[]; inventory_tag_ids: string[]
  pricing_tier_ids: string[]; product_ids: string[]
}

const EMPTY: EntityFilters = { strain_ids: [], category_ids: [], brand_ids: [], vendor_ids: [], weight_ids: [], product_tag_ids: [], inventory_tag_ids: [], pricing_tier_ids: [], product_ids: [] }
const WEIGHT_OPTIONS = ['0.5g', '1g', '2g', '3.5g', '7g', '14g', '28g']

interface Props { value: EntityFilters; onChange: (f: EntityFilters) => void }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Opt = { id: string; name: string }

export default function EntityFilterBuilder({ value, onChange }: Props) {
  const [tab, setTab] = useState('categories')
  const [options, setOptions] = useState<Record<string, Opt[]>>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/brands').then(r => r.json()),
      fetch('/api/strains').then(r => r.json()),
      fetch('/api/vendors').then(r => r.json()),
    ]).then(([c, b, s, v]) => {
      setOptions({
        categories: (c.categories ?? []).map((x: Opt) => ({ id: x.id, name: x.name })),
        brands: (b.brands ?? []).map((x: Opt) => ({ id: x.id, name: x.name })),
        strains: (s.strains ?? []).map((x: Opt) => ({ id: x.id, name: x.name })),
        vendors: (v.vendors ?? []).map((x: Opt) => ({ id: x.id, name: x.name })),
      })
    })
  }, [])

  const TABS: Array<{ key: string; label: string; filterKey: keyof EntityFilters }> = [
    { key: 'categories', label: 'Categories', filterKey: 'category_ids' },
    { key: 'brands', label: 'Brands', filterKey: 'brand_ids' },
    { key: 'strains', label: 'Strains', filterKey: 'strain_ids' },
    { key: 'vendors', label: 'Vendors', filterKey: 'vendor_ids' },
    { key: 'weights', label: 'Weights', filterKey: 'weight_ids' },
  ]

  const toggleItem = (filterKey: keyof EntityFilters, itemId: string) => {
    const current = value[filterKey] as string[]
    const next = current.includes(itemId) ? current.filter(i => i !== itemId) : [...current, itemId]
    onChange({ ...value, [filterKey]: next })
  }

  const currentTab = TABS.find(t => t.key === tab)
  const currentItems = currentTab ? (tab === 'weights' ? WEIGHT_OPTIONS.map(w => ({ id: w, name: w })) : options[tab] ?? []) : []
  const selectedIds = currentTab ? value[currentTab.filterKey] as string[] : []

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-700 overflow-x-auto">
        {TABS.map(t => {
          const count = (value[t.filterKey] as string[]).length
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs whitespace-nowrap ${tab === t.key ? 'bg-gray-700 text-emerald-400' : 'text-gray-400 hover:bg-gray-700/50'}`}>
              {t.label}{count > 0 && <span className="ml-1 bg-emerald-600 text-white px-1 rounded text-[10px]">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="p-3 max-h-48 overflow-y-auto">
        {currentItems.length === 0 ? (
          <p className="text-gray-500 text-xs">No options available</p>
        ) : (
          <div className="space-y-1">
            {currentItems.map(item => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-gray-50">
                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => currentTab && toggleItem(currentTab.filterKey, item.id)} className="rounded border-gray-600" />
                {item.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {selectedIds.map(id => {
            const item = currentItems.find(i => i.id === id)
            return (
              <span key={id} className="inline-flex items-center gap-1 text-[10px] bg-emerald-600/20 text-emerald-400 px-1.5 py-0.5 rounded">
                {item?.name ?? id}
                <button onClick={() => currentTab && toggleItem(currentTab.filterKey, id)} className="hover:text-red-400">×</button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export type { EntityFilters }
export { EMPTY as EMPTY_FILTERS }
