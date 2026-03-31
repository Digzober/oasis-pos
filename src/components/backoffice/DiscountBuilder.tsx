'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import EntityFilterBuilder, { EMPTY_FILTERS, type EntityFilters } from './EntityFilterBuilder'
import DiscountPreview from './DiscountPreview'

const REWARD_TYPES = [
  { value: 'percentage', label: 'Percentage Off' }, { value: 'fixed_amount', label: 'Dollar Amount Off' },
  { value: 'price_to_amount', label: 'Price To Amount' }, { value: 'free_item', label: 'Free Item' }, { value: 'bogo', label: 'Buy One Get One' },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DiscountBuilder({ discountId }: { discountId?: string }) {
  const router = useRouter()
  const isEdit = !!discountId
  const [tab, setTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [appMethod, setAppMethod] = useState('automatic')
  const [isStackable, setIsStackable] = useState(false)

  // Schedule
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [recDays, setRecDays] = useState<number[]>([])

  // Constraint
  const [constraintType, setConstraintType] = useState('min_quantity')
  const [constraintValue, setConstraintValue] = useState('')
  const [constraintFilters, setConstraintFilters] = useState<EntityFilters>(EMPTY_FILTERS)

  // Reward
  const [rewardType, setRewardType] = useState('percentage')
  const [rewardValue, setRewardValue] = useState('')
  const [rewardApplyTo, setRewardApplyTo] = useState('each_item')
  const [rewardFilters, setRewardFilters] = useState<EntityFilters>(EMPTY_FILTERS)

  // Targeting
  const [customerTypes, setCustomerTypes] = useState<string[]>(['all'])
  const [locationIds, setLocationIds] = useState<string[]>([])
  const [firstTimeOnly, setFirstTimeOnly] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(false)

  useEffect(() => {
    if (!discountId) return
    fetch(`/api/discounts/${discountId}`).then(r => r.json()).then(d => {
      const disc = d.discount
      if (!disc) return
      setName(disc.name ?? ''); setDescription(disc.description ?? ''); setCode(disc.code ?? '')
      setAppMethod(disc.application_method ?? 'automatic')
      setIsStackable(disc.discount_stacking ?? false)
      setStartDate(disc.start_date?.slice(0, 16) ?? ''); setEndDate(disc.end_date?.slice(0, 16) ?? '')
      setRecurring((disc.weekly_recurrence ?? []).length > 0)
      setRecDays(disc.weekly_recurrence ?? [])
      setCustomerTypes(disc.customer_types ?? ['all'])
      setLocationIds(disc.location_ids ?? [])
      setFirstTimeOnly(disc.first_time_customer_only ?? false)
      setRequiresApproval(disc.requires_manager_approval ?? false)
    })
  }, [discountId])

  const toggleDay = (d: number) => setRecDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleSave = async (status: string) => {
    if (!name) { setError('Name is required'); return }
    setSaving(true); setError('')

    const body = {
      discount: {
        name, description: description || null, code: code || null,
        application_method: appMethod, discount_stacking: isStackable,
        start_date: startDate || null, end_date: endDate || null,
        weekly_recurrence: recurring ? recDays : null,
        customer_types: customerTypes, location_ids: locationIds,
        first_time_customer_only: firstTimeOnly,
        requires_manager_approval: requiresApproval, status,
      },
      constraints: constraintValue ? [{
        threshold: { [constraintType === 'min_quantity' ? 'min_value' : 'min_value']: parseFloat(constraintValue), group_by_sku: false },
        filters: hasFilters(constraintFilters) ? [mapFilters(constraintFilters)] : [],
      }] : [],
      rewards: [{
        reward: { discount_method: rewardType, discount_value: parseFloat(rewardValue) || 0 },
        filters: hasFilters(rewardFilters) ? [mapFilters(rewardFilters)] : [],
      }],
    }

    const url = isEdit ? `/api/discounts/${discountId}` : '/api/discounts'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    if (res.ok) router.push('/marketing/discounts')
    else { const d = await res.json(); setError(d.error ?? 'Save failed') }
    setSaving(false)
  }

  const inputCls = "w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  const TABS = ['details', 'schedule', 'constraints', 'rewards', 'targeting']

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">{isEdit ? 'Edit Discount' : 'New Discount'}</h1>
        <div className="flex gap-2">
          <button onClick={() => router.push('/marketing/discounts')} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
          <button onClick={() => handleSave('draft')} disabled={saving} className="px-3 py-1.5 bg-gray-600 text-gray-200 rounded-lg text-sm disabled:opacity-50">Save Draft</button>
          <button onClick={() => handleSave('active')} disabled={saving} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save & Activate'}</button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Preview */}
      <div className="mb-4">
        <DiscountPreview name={name} applicationMethod={appMethod} rewardType={rewardType} rewardValue={parseFloat(rewardValue) || 0}
          constraintType={constraintType} constraintValue={parseFloat(constraintValue) || 0} recurrenceDays={recDays}
          customerTypes={customerTypes} isStackable={isStackable} locationCount={locationIds.length} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-gray-700">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm capitalize ${tab === t ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-4">
        {tab === 'details' && <>
          <label className="block"><span className="text-xs text-gray-400">Name *</span><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></label>
          <label className="block"><span className="text-xs text-gray-400">Description</span><textarea value={description} onChange={e => setDescription(e.target.value)} className={inputCls + ' h-16'} /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="text-xs text-gray-400">Application Method</span>
              <select value={appMethod} onChange={e => setAppMethod(e.target.value)} className={inputCls}><option value="automatic">Automatic</option><option value="manual">Manual</option><option value="coupon">Coupon</option></select></label>
            {appMethod === 'coupon' && <label className="block"><span className="text-xs text-gray-400">Code</span><input value={code} onChange={e => setCode(e.target.value)} className={inputCls} /></label>}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={isStackable} onChange={e => setIsStackable(e.target.checked)} className="rounded" /> Can stack with other discounts</label>
        </>}

        {tab === 'schedule' && <>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="text-xs text-gray-400">Start Date</span><input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} /></label>
            <label className="block"><span className="text-xs text-gray-400">End Date</span><input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} className="rounded" /> Weekly recurrence</label>
          {recurring && (
            <div className="flex gap-2">{DAYS.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)} className={`w-10 h-10 rounded-lg text-xs font-medium ${recDays.includes(i) ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400'}`}>{d}</button>
            ))}</div>
          )}
        </>}

        {tab === 'constraints' && <>
          <p className="text-xs text-gray-400">What must be true in the cart for this discount to activate?</p>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="text-xs text-gray-400">Threshold Type</span>
              <select value={constraintType} onChange={e => setConstraintType(e.target.value)} className={inputCls}>
                <option value="min_quantity">Minimum Items</option><option value="min_spend">Minimum Spend ($)</option><option value="min_weight">Minimum Weight (g)</option>
              </select></label>
            <label className="block"><span className="text-xs text-gray-400">Minimum Value</span>
              <input type="number" value={constraintValue} onChange={e => setConstraintValue(e.target.value)} className={inputCls} placeholder="Leave empty for no minimum" /></label>
          </div>
          <div><p className="text-xs text-gray-400 mb-2">Filter qualifying products (empty = all products)</p>
            <EntityFilterBuilder value={constraintFilters} onChange={setConstraintFilters} /></div>
        </>}

        {tab === 'rewards' && <>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="text-xs text-gray-400">Reward Type</span>
              <select value={rewardType} onChange={e => setRewardType(e.target.value)} className={inputCls}>
                {REWARD_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
              </select></label>
            <label className="block"><span className="text-xs text-gray-400">Value</span>
              <input type="number" step="0.01" value={rewardValue} onChange={e => setRewardValue(e.target.value)} className={inputCls}
                placeholder={rewardType === 'percentage' ? 'e.g. 10 for 10%' : 'e.g. 5.00'} /></label>
          </div>
          <label className="block"><span className="text-xs text-gray-400">Apply To</span>
            <select value={rewardApplyTo} onChange={e => setRewardApplyTo(e.target.value)} className={inputCls}>
              <option value="each_item">Each Matching Item</option><option value="cheapest">Cheapest Item</option><option value="most_expensive">Most Expensive</option><option value="cart_total">Cart Total</option>
            </select></label>
          <div><p className="text-xs text-gray-400 mb-2">Filter which products get the reward (empty = same as constraint)</p>
            <EntityFilterBuilder value={rewardFilters} onChange={setRewardFilters} /></div>
        </>}

        {tab === 'targeting' && <>
          <label className="block"><span className="text-xs text-gray-400">Customer Type</span>
            <select value={customerTypes[0] ?? 'all'} onChange={e => setCustomerTypes([e.target.value])} className={inputCls}>
              <option value="all">All Customers</option><option value="recreational">Recreational Only</option><option value="medical">Medical Only</option>
            </select></label>
          <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={firstTimeOnly} onChange={e => setFirstTimeOnly(e.target.checked)} className="rounded" /> First-time customers only</label>
          <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={requiresApproval} onChange={e => setRequiresApproval(e.target.checked)} className="rounded" /> Requires manager approval</label>
        </>}
      </div>
    </div>
  )
}

function hasFilters(f: EntityFilters) {
  return Object.values(f).some(arr => arr.length > 0)
}

function mapFilters(f: EntityFilters) {
  // Map to the constraint/reward filter format
  const result: Record<string, unknown> = {}
  if (f.category_ids.length) result.filter_type = 'category', result.filter_value_ids = f.category_ids
  if (f.brand_ids.length) result.filter_type = 'brand', result.filter_value_ids = f.brand_ids
  if (f.strain_ids.length) result.filter_type = 'strain', result.filter_value_ids = f.strain_ids
  return result
}
