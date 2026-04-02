'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProductAnalytics from '@/components/backoffice/ProductAnalytics'
import ProductPriceHistory from '@/components/backoffice/ProductPriceHistory'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }

type Tab = 'details' | 'locations' | 'online' | 'labels' | 'analytics' | 'history'

interface ProductImage {
  id: string
  image_url: string
  is_primary: boolean
  sort_order: number
  alt_text?: string | null
}

interface ProductTag {
  id: string
  name: string
  color: string | null
}

interface LocationPrice {
  id: string
  location_id: string
  rec_price: number | null
  med_price: number | null
  cost_price: number | null
  is_pos_available: boolean
  is_online_available: boolean
  pricing_tier_id: string | null
  purchase_cap: number | null
  low_inventory_threshold: number | null
  locations?: { id: string; name: string }
}

interface LabelSetting {
  customer_type: string
  label_template_id: string | null
  print_quantity: number
  enabled: boolean
}

interface LabelTemplate {
  id: string
  name: string
  label_type: string
}

interface PricingTier {
  id: string
  name: string
  multiplier: number
}

type QuickAddTarget = 'brand' | 'vendor' | 'producer' | 'strain' | 'tag' | null

export default function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter()
  const isEdit = !!productId

  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [form, setForm] = useState({
    name: '', slug: '', sku: '', barcode: '', description: '',
    categoryId: '', brandId: '', vendorId: '', strainId: '',
    recPrice: '', medPrice: '', costPrice: '',
    isCannabis: true, productType: 'quantity', defaultUnit: 'each',
    weightGrams: '', thcPercentage: '', cbdPercentage: '',
    thcContentMg: '', cbdContentMg: '', flowerEquivalent: '',
    strainType: '', onlineTitle: '', onlineDescription: '',
    regulatoryCategory: '', externalCategory: '',
    isOnSale: false, salePrice: '',
    alternateName: '', producerId: '', size: '', flavor: '',
    availableFor: 'all', isTaxable: true, allowAutomaticDiscounts: true,
    dosage: '', netWeight: '', netWeightUnit: 'g', grossWeightGrams: '',
    unitThcDose: '', unitCbdDose: '', administrationMethod: '', packageSize: '',
    externalSubCategory: '',
    allergens: '', ingredients: '', instructions: '',
  })

  const [categories, setCategories] = useState<AnyRecord[]>([])
  const [brands, setBrands] = useState<AnyRecord[]>([])
  const [vendors, setVendors] = useState<AnyRecord[]>([])
  const [producers, setProducers] = useState<AnyRecord[]>([])
  const [strains, setStrains] = useState<AnyRecord[]>([])
  const [allTags, setAllTags] = useState<ProductTag[]>([])
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])
  const [dosagePresets, setDosagePresets] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [images, setImages] = useState<ProductImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [locations, setLocations] = useState<AnyRecord[]>([])
  const [locationPrices, setLocationPrices] = useState<LocationPrice[]>([])
  const [labelSettings, setLabelSettings] = useState<LabelSetting[]>([
    { customer_type: 'recreational', label_template_id: null, print_quantity: 1, enabled: false },
    { customer_type: 'medical', label_template_id: null, print_quantity: 1, enabled: false },
  ])
  const [labelTemplates, setLabelTemplates] = useState<LabelTemplate[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deactivateError, setDeactivateError] = useState('')

  // Field config state
  const [fieldConfig, setFieldConfig] = useState<Record<string, string>>({})

  // Quick-add modal state
  const [quickAddTarget, setQuickAddTarget] = useState<QuickAddTarget>(null)
  const [quickAddForm, setQuickAddForm] = useState<Record<string, string>>({})
  const [quickAddSaving, setQuickAddSaving] = useState(false)
  const [quickAddError, setQuickAddError] = useState('')

  // Field visibility/required helpers
  const fieldVisible = (key: string): boolean => {
    if (Object.keys(fieldConfig).length === 0) return true
    const val = fieldConfig[key]
    return val === 'required' || val === 'show' || !val
  }

  const fieldRequired = (key: string): boolean => {
    if (Object.keys(fieldConfig).length === 0) return false
    return fieldConfig[key] === 'required'
  }

  const fieldLabel = (key: string, baseLabel: string): string => {
    return fieldRequired(key) ? `${baseLabel} *` : baseLabel
  }

  // Load lookups
  useEffect(() => {
    const safeFetch = (url: string): Promise<AnyRecord> =>
      fetch(url).then(r => r.ok ? r.json() : {}).catch(() => ({}))

    Promise.all([
      safeFetch('/api/categories'),
      safeFetch('/api/brands'),
      safeFetch('/api/vendors'),
      safeFetch('/api/producers'),
      safeFetch('/api/strains'),
      safeFetch('/api/tags'),
      safeFetch('/api/auth/locations'),
      safeFetch('/api/labels/templates'),
      safeFetch('/api/settings/pricing-tiers'),
      safeFetch('/api/settings/product-fields'),
      safeFetch('/api/settings/dosages'),
    ]).then(([c, b, v, pr, s, t, l, lt, pt, pf, dg]) => {
      setCategories(c.categories ?? [])
      setBrands(b.brands ?? [])
      setVendors(v.vendors ?? [])
      setProducers(pr.producers ?? [])
      setStrains(s.strains ?? [])
      setAllTags(t.tags ?? [])
      setLocations(l.locations ?? [])
      setLabelTemplates(lt.templates ?? [])
      setPricingTiers(pt.tiers ?? [])
      if (pf.config && typeof pf.config === 'object') {
        setFieldConfig(pf.config as Record<string, string>)
      }
      const dosages = dg.dosages ?? []
      if (Array.isArray(dosages) && dosages.length > 0) {
        setDosagePresets(
          dosages
            .filter((d: { is_active?: boolean }) => d.is_active !== false)
            .map((d: { name: string }) => d.name)
        )
      }
    })
  }, [])

  // Load product data for edit
  useEffect(() => {
    if (!productId) return
    fetch(`/api/products/${productId}`)
      .then(r => r.json())
      .then(d => {
        const p = d.product
        if (!p) return
        setForm({
          name: p.name ?? '', slug: p.slug ?? '', sku: p.sku ?? '', barcode: p.barcode ?? '',
          description: p.description ?? '',
          categoryId: p.category_id ?? '', brandId: p.brand_id ?? '', vendorId: p.vendor_id ?? '', strainId: p.strain_id ?? '',
          recPrice: String(p.rec_price ?? ''), medPrice: String(p.med_price ?? ''), costPrice: String(p.cost_price ?? ''),
          isCannabis: p.is_cannabis ?? true, productType: p.product_type ?? 'quantity', defaultUnit: p.default_unit ?? 'each',
          weightGrams: String(p.weight_grams ?? ''), thcPercentage: String(p.thc_percentage ?? ''),
          cbdPercentage: String(p.cbd_percentage ?? ''),
          thcContentMg: String(p.thc_content_mg ?? ''), cbdContentMg: String(p.cbd_content_mg ?? ''),
          flowerEquivalent: String(p.flower_equivalent ?? ''), strainType: p.strain_type ?? '',
          onlineTitle: p.online_title ?? '', onlineDescription: p.online_description ?? '',
          regulatoryCategory: p.regulatory_category ?? '',
          externalCategory: p.external_category ?? '',
          isOnSale: p.is_on_sale ?? false,
          salePrice: String(p.sale_price ?? ''),
          alternateName: p.alternate_name ?? '', producerId: p.producer_id ?? '',
          size: p.size ?? '', flavor: p.flavor ?? '',
          availableFor: p.available_for ?? 'all',
          isTaxable: p.is_taxable ?? true, allowAutomaticDiscounts: p.allow_automatic_discounts ?? true,
          dosage: p.dosage ?? '', netWeight: String(p.net_weight ?? ''),
          netWeightUnit: p.net_weight_unit ?? 'g', grossWeightGrams: String(p.gross_weight_grams ?? ''),
          unitThcDose: String(p.unit_thc_dose ?? ''), unitCbdDose: String(p.unit_cbd_dose ?? ''),
          administrationMethod: p.administration_method ?? '', packageSize: String(p.package_size ?? ''),
          externalSubCategory: p.external_sub_category ?? '',
          allergens: p.allergens ?? '', ingredients: p.ingredients ?? '', instructions: p.instructions ?? '',
        })
        if (p.tags) {
          setSelectedTagIds(new Set(p.tags.map((t: ProductTag) => t.id)))
        }
        if (p.images) {
          setImages(p.images)
        }
      })
  }, [productId])

  // Load location prices and label settings for edit
  useEffect(() => {
    if (!productId) return
    fetch(`/api/products/${productId}/prices`)
      .then(r => r.json())
      .then(d => setLocationPrices(d.prices ?? []))
    fetch(`/api/products/${productId}/label-settings`)
      .then(r => r.json())
      .then(d => {
        const saved = d.settings ?? []
        if (saved.length > 0) {
          const defaultRec: LabelSetting = { customer_type: 'recreational', label_template_id: null, print_quantity: 1, enabled: true }
          const defaultMed: LabelSetting = { customer_type: 'medical', label_template_id: null, print_quantity: 1, enabled: true }
          const recFound = saved.find((s: { customer_type: string }) => s.customer_type === 'recreational')
          const medFound = saved.find((s: { customer_type: string }) => s.customer_type === 'medical')
          setLabelSettings([
            recFound ? { customer_type: recFound.customer_type, label_template_id: recFound.label_template_id, print_quantity: recFound.print_quantity, enabled: recFound.enabled } : defaultRec,
            medFound ? { customer_type: medFound.customer_type, label_template_id: medFound.label_template_id, print_quantity: medFound.print_quantity, enabled: medFound.enabled } : defaultMed,
          ])
        }
      })
  }, [productId])

  const set = (field: string, value: string | boolean) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !isEdit) next.slug = slugify(value as string)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      name: form.name, slug: form.slug, sku: form.sku || undefined, barcode: form.barcode || null,
      description: form.description || null,
      categoryId: form.categoryId, brandId: form.brandId || null, vendorId: form.vendorId || null, strainId: form.strainId || null,
      recPrice: parseFloat(form.recPrice) || 0, medPrice: form.medPrice ? parseFloat(form.medPrice) : null,
      costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
      isCannabis: form.isCannabis, productType: form.productType, defaultUnit: form.defaultUnit,
      weightGrams: form.weightGrams ? parseFloat(form.weightGrams) : null,
      thcPercentage: form.thcPercentage ? parseFloat(form.thcPercentage) : null,
      cbdPercentage: form.cbdPercentage ? parseFloat(form.cbdPercentage) : null,
      thcContentMg: form.thcContentMg ? parseFloat(form.thcContentMg) : null,
      cbdContentMg: form.cbdContentMg ? parseFloat(form.cbdContentMg) : null,
      flowerEquivalent: form.flowerEquivalent ? parseFloat(form.flowerEquivalent) : null,
      strainType: form.strainType || null,
      onlineTitle: form.onlineTitle || null, onlineDescription: form.onlineDescription || null,
      regulatoryCategory: form.regulatoryCategory || null,
      externalCategory: form.externalCategory || null,
      isOnSale: form.isOnSale,
      salePrice: form.salePrice ? parseFloat(form.salePrice) : null,
      alternateName: form.alternateName || null,
      producerId: form.producerId || null,
      size: form.size || null,
      flavor: form.flavor || null,
      availableFor: form.availableFor || 'all',
      isTaxable: form.isTaxable,
      allowAutomaticDiscounts: form.allowAutomaticDiscounts,
      dosage: form.dosage || null,
      netWeight: form.netWeight ? parseFloat(form.netWeight) : null,
      netWeightUnit: form.netWeightUnit || null,
      grossWeightGrams: form.grossWeightGrams ? parseFloat(form.grossWeightGrams) : null,
      unitThcDose: form.unitThcDose ? parseFloat(form.unitThcDose) : null,
      unitCbdDose: form.unitCbdDose ? parseFloat(form.unitCbdDose) : null,
      administrationMethod: form.administrationMethod || null,
      packageSize: form.packageSize ? parseInt(form.packageSize) : null,
      externalSubCategory: form.externalSubCategory || null,
      allergens: form.allergens || null,
      ingredients: form.ingredients || null,
      instructions: form.instructions || null,
    }

    try {
      const url = isEdit ? `/api/products/${productId}` : '/api/products'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to save')
        setSaving(false)
        return
      }

      const result = await res.json()
      const savedId = productId ?? result.product?.id

      // Save tags
      if (savedId) {
        await fetch(`/api/products/${savedId}/tags`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_ids: Array.from(selectedTagIds) }),
        })

        // Save label settings
        await fetch(`/api/products/${savedId}/label-settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: labelSettings }),
        })
      }

      router.push('/products')
    } catch { setError('Connection error') }
    setSaving(false)
  }

  const handleDeactivate = async () => {
    setDeactivateError('')
    const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/products')
    } else {
      const d = await res.json()
      setDeactivateError(d.error ?? 'Failed to deactivate')
    }
  }

  const [imageError, setImageError] = useState('')

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!productId || !e.target.files?.length) return
    setImageError('')
    setUploading(true)
    const file = e.target.files?.[0]
    if (!file) { setUploading(false); return }

    // Client-side validation
    const MAX_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setImageError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 25MB.`)
      setUploading(false)
      e.target.value = ''
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setImageError(`Invalid file type. Allowed: JPEG, PNG, WebP, GIF.`)
      setUploading(false)
      e.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/products/${productId}/images`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const d = await res.json()
        setImages(prev => [...prev, d.image])
      } else {
        const d = await res.json()
        setImageError(d.error ?? 'Failed to upload image')
      }
    } catch {
      setImageError('Network error uploading image')
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleImageDelete = async (imageId: string) => {
    if (!productId) return
    await fetch(`/api/products/${productId}/images?imageId=${imageId}`, { method: 'DELETE' })
    setImages(prev => prev.filter(i => i.id !== imageId))
  }

  const handleImageReorder = async (fromIndex: number, direction: 'up' | 'down') => {
    if (!productId) return
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= images.length) return

    const reordered = [...images]
    const fromItem = reordered[fromIndex]
    const toItem = reordered[toIndex]
    if (!fromItem || !toItem) return
    reordered[fromIndex] = toItem
    reordered[toIndex] = fromItem

    const withUpdatedOrder = reordered.map((img, idx) => ({
      ...img,
      sort_order: idx + 1,
    }))
    setImages(withUpdatedOrder)

    await fetch(`/api/products/${productId}/images/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_ids: withUpdatedOrder.map(img => img.id) }),
    })
  }

  const handleImageAltTextSave = async (imageId: string, altText: string) => {
    if (!productId) return
    setImages(prev => prev.map(img =>
      img.id === imageId ? { ...img, alt_text: altText } : img
    ))
    await fetch(`/api/products/${productId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId, alt_text: altText }),
    })
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  const updateLocationPrice = useCallback((locationId: string, field: keyof LocationPrice, value: unknown) => {
    if (!productId) return
    setLocationPrices(prev => {
      const idx = prev.findIndex(lp => lp.location_id === locationId)
      if (idx >= 0) {
        const updated = [...prev]
        const entry = { ...updated[idx] } as Record<string, unknown>
        entry[field] = value
        updated[idx] = entry as unknown as LocationPrice
        return updated
      }
      const base: Record<string, unknown> = {
        id: '', location_id: locationId,
        rec_price: null, med_price: null, cost_price: null,
        is_pos_available: true, is_online_available: false,
        pricing_tier_id: null, purchase_cap: null, low_inventory_threshold: null,
      }
      base[field] = value
      return [...prev, base as unknown as LocationPrice]
    })
  }, [productId])

  const saveLocationPrice = async (locationId: string) => {
    if (!productId) return
    const lp = locationPrices.find(p => p.location_id === locationId)
    if (!lp) return
    await fetch(`/api/products/${productId}/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_id: locationId,
        rec_price: lp.rec_price,
        med_price: lp.med_price,
        cost_price: lp.cost_price,
        is_pos_available: lp.is_pos_available,
        is_online_available: lp.is_online_available,
        pricing_tier_id: lp.pricing_tier_id,
        purchase_cap: lp.purchase_cap,
        low_inventory_threshold: lp.low_inventory_threshold,
      }),
    })
  }

  const updateLabelSetting = (idx: number, field: keyof LabelSetting, value: unknown) => {
    setLabelSettings(prev => {
      const updated = [...prev]
      const entry = { ...updated[idx] } as Record<string, unknown>
      entry[field] = value
      updated[idx] = entry as unknown as LabelSetting
      return updated
    })
  }

  // Quick-add modal handlers
  const openQuickAdd = (target: QuickAddTarget) => {
    setQuickAddTarget(target)
    setQuickAddError('')
    setQuickAddSaving(false)
    switch (target) {
      case 'brand':
        setQuickAddForm({ name: '' })
        break
      case 'vendor':
        setQuickAddForm({ name: '', license_number: '', contact_name: '', email: '', phone: '' })
        break
      case 'producer':
        setQuickAddForm({ name: '', license_number: '', contact_name: '', email: '', phone: '' })
        break
      case 'strain':
        setQuickAddForm({ name: '', strain_type: '' })
        break
      case 'tag':
        setQuickAddForm({ name: '', color: '' })
        break
      default:
        setQuickAddForm({ name: '' })
    }
  }

  const handleQuickAddSave = async () => {
    if (!quickAddTarget) return
    if (!quickAddForm.name?.trim()) {
      setQuickAddError('Name is required')
      return
    }
    setQuickAddSaving(true)
    setQuickAddError('')

    const apiMap = {
      brand: '/api/brands',
      vendor: '/api/vendors',
      producer: '/api/producers',
      strain: '/api/strains',
      tag: '/api/tags',
    } as const

    const apiUrl = apiMap[quickAddTarget]
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quickAddForm),
    })

    if (!res.ok) {
      const d = await res.json()
      setQuickAddError(d.error ?? 'Failed to create')
      setQuickAddSaving(false)
      return
    }

    const data = await res.json()
    const created = data[quickAddTarget] ?? data.item

    if (created) {
      switch (quickAddTarget) {
        case 'brand':
          setBrands(prev => [...prev, created])
          set('brandId', created.id)
          break
        case 'vendor':
          setVendors(prev => [...prev, created])
          set('vendorId', created.id)
          break
        case 'producer':
          setProducers(prev => [...prev, created])
          set('producerId', created.id)
          break
        case 'strain':
          setStrains(prev => [...prev, created])
          set('strainId', created.id)
          break
        case 'tag':
          setAllTags(prev => [...prev, { id: created.id, name: created.name, color: created.color ?? null }])
          setSelectedTagIds(prev => {
            const next = new Set(prev)
            next.add(created.id)
            return next
          })
          break
      }
    }

    setQuickAddTarget(null)
    setQuickAddSaving(false)
  }

  const inputCls = "w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  const selectCls = inputCls

  const tabs: { key: Tab; label: string }[] = [
    { key: 'details', label: 'Details' },
    { key: 'locations', label: 'Location Pricing' },
    { key: 'online', label: 'Online / Images' },
    { key: 'labels', label: 'Label Settings' },
    ...(isEdit ? [
      { key: 'analytics' as Tab, label: 'BI Dashboard' },
      { key: 'history' as Tab, label: 'Price History' },
    ] : []),
  ]

  // Compute which basic info fields are visible for grid layout
  const basicInfoFields: React.ReactNode[] = []
  if (fieldVisible('name')) {
    basicInfoFields.push(
      <Field key="name" label={fieldLabel('name', 'Name')}>
        <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} required={fieldRequired('name')} />
      </Field>
    )
  }
  basicInfoFields.push(
    <Field key="slug" label="Slug">
      <input value={form.slug} onChange={e => set('slug', e.target.value)} className={inputCls} />
    </Field>
  )
  if (fieldVisible('sku')) {
    basicInfoFields.push(
      <Field key="sku" label={fieldLabel('sku', 'SKU')}>
        <input value={form.sku} onChange={e => set('sku', e.target.value)} className={inputCls} placeholder="Auto-generated if blank" required={fieldRequired('sku')} />
      </Field>
    )
  }
  if (fieldVisible('barcode')) {
    basicInfoFields.push(
      <Field key="barcode" label={fieldLabel('barcode', 'Barcode')}>
        <input value={form.barcode} onChange={e => set('barcode', e.target.value)} className={inputCls} required={fieldRequired('barcode')} />
      </Field>
    )
  }
  if (fieldVisible('alternate_name')) {
    basicInfoFields.push(
      <Field key="alternate_name" label={fieldLabel('alternate_name', 'Alternate Name')}>
        <input value={form.alternateName} onChange={e => set('alternateName', e.target.value)} className={inputCls} required={fieldRequired('alternate_name')} />
      </Field>
    )
  }
  if (fieldVisible('producer')) {
    basicInfoFields.push(
      <Field key="producer" label={fieldLabel('producer', 'Producer / Manufacturer')}>
        <div className="flex gap-2">
          <select value={form.producerId} onChange={e => set('producerId', e.target.value)} className={selectCls} required={fieldRequired('producer')}>
            <option value="">None</option>
            {producers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="button" onClick={() => openQuickAdd('producer')}
            className="shrink-0 px-2 py-1 text-xs bg-gray-700 text-emerald-400 rounded-lg hover:bg-gray-600 border border-gray-600">
            + New
          </button>
        </div>
      </Field>
    )
  }
  if (fieldVisible('size')) {
    basicInfoFields.push(
      <Field key="size" label={fieldLabel('size', 'Size')}>
        <input value={form.size} onChange={e => set('size', e.target.value)} className={inputCls} placeholder="e.g. 1g, 3.5g, 1oz" required={fieldRequired('size')} />
      </Field>
    )
  }
  if (fieldVisible('flavor')) {
    basicInfoFields.push(
      <Field key="flavor" label={fieldLabel('flavor', 'Flavor')}>
        <input value={form.flavor} onChange={e => set('flavor', e.target.value)} className={inputCls} required={fieldRequired('flavor')} />
      </Field>
    )
  }

  // Classification grid fields
  const classificationFields: React.ReactNode[] = []
  if (fieldVisible('category')) {
    classificationFields.push(
      <Field key="category" label={fieldLabel('category', 'Category')}>
        <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className={selectCls} required={fieldRequired('category')}>
          <option value="">Select...</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
    )
  }
  if (fieldVisible('brand')) {
    classificationFields.push(
      <Field key="brand" label={fieldLabel('brand', 'Brand')}>
        <div className="flex gap-2">
          <select value={form.brandId} onChange={e => set('brandId', e.target.value)} className={selectCls} required={fieldRequired('brand')}>
            <option value="">None</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button type="button" onClick={() => openQuickAdd('brand')}
            className="shrink-0 px-2 py-1 text-xs bg-gray-700 text-emerald-400 rounded-lg hover:bg-gray-600 border border-gray-600">
            + New
          </button>
        </div>
      </Field>
    )
  }
  if (fieldVisible('vendor')) {
    classificationFields.push(
      <Field key="vendor" label={fieldLabel('vendor', 'Vendor')}>
        <div className="flex gap-2">
          <select value={form.vendorId} onChange={e => set('vendorId', e.target.value)} className={selectCls} required={fieldRequired('vendor')}>
            <option value="">None</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button type="button" onClick={() => openQuickAdd('vendor')}
            className="shrink-0 px-2 py-1 text-xs bg-gray-700 text-emerald-400 rounded-lg hover:bg-gray-600 border border-gray-600">
            + New
          </button>
        </div>
      </Field>
    )
  }
  if (fieldVisible('strain')) {
    classificationFields.push(
      <Field key="strain" label={fieldLabel('strain', 'Strain')}>
        <div className="flex gap-2">
          <select value={form.strainId} onChange={e => set('strainId', e.target.value)} className={selectCls} required={fieldRequired('strain')}>
            <option value="">None</option>
            {strains.map(s => <option key={s.id} value={s.id}>{s.name}{s.strain_type ? ` (${s.strain_type})` : ''}</option>)}
          </select>
          <button type="button" onClick={() => openQuickAdd('strain')}
            className="shrink-0 px-2 py-1 text-xs bg-gray-700 text-emerald-400 rounded-lg hover:bg-gray-600 border border-gray-600">
            + New
          </button>
        </div>
      </Field>
    )
  }
  if (fieldVisible('external_category')) {
    classificationFields.push(
      <Field key="external_category" label={fieldLabel('external_category', 'External Category')}>
        <input value={form.externalCategory} onChange={e => set('externalCategory', e.target.value)} className={inputCls} placeholder="Third-party category mapping" required={fieldRequired('external_category')} />
      </Field>
    )
  }
  if (fieldVisible('available_for')) {
    classificationFields.push(
      <Field key="available_for" label={fieldLabel('available_for', 'Available For')}>
        <select value={form.availableFor} onChange={e => set('availableFor', e.target.value)} className={selectCls} required={fieldRequired('available_for')}>
          <option value="all">All</option>
          <option value="recreational">Recreational</option>
          <option value="medical">Medical</option>
        </select>
      </Field>
    )
  }

  // Pricing grid fields
  const pricingFields: React.ReactNode[] = []
  if (fieldVisible('rec_price')) {
    pricingFields.push(
      <Field key="rec_price" label={fieldLabel('rec_price', 'Rec Price')}>
        <input type="number" step="0.01" value={form.recPrice} onChange={e => set('recPrice', e.target.value)} className={inputCls} required={fieldRequired('rec_price')} />
      </Field>
    )
  }
  if (fieldVisible('med_price')) {
    pricingFields.push(
      <Field key="med_price" label={fieldLabel('med_price', 'Med Price')}>
        <input type="number" step="0.01" value={form.medPrice} onChange={e => set('medPrice', e.target.value)} className={inputCls} required={fieldRequired('med_price')} />
      </Field>
    )
  }
  if (fieldVisible('cost_price')) {
    pricingFields.push(
      <Field key="cost_price" label={fieldLabel('cost_price', 'Cost')}>
        <input type="number" step="0.01" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} className={inputCls} required={fieldRequired('cost_price')} />
      </Field>
    )
  }

  // Cannabis details grid fields
  const cannabisFields: React.ReactNode[] = []
  if (fieldVisible('weight_grams')) {
    cannabisFields.push(
      <Field key="weight_grams" label={fieldLabel('weight_grams', 'Weight (g)')}>
        <input type="number" step="0.001" value={form.weightGrams} onChange={e => set('weightGrams', e.target.value)} className={inputCls} required={fieldRequired('weight_grams')} />
      </Field>
    )
  }
  if (fieldVisible('thc_percentage')) {
    cannabisFields.push(
      <Field key="thc_percentage" label={fieldLabel('thc_percentage', 'THC %')}>
        <input type="number" step="0.01" value={form.thcPercentage} onChange={e => set('thcPercentage', e.target.value)} className={inputCls} required={fieldRequired('thc_percentage')} />
      </Field>
    )
  }
  if (fieldVisible('cbd_percentage')) {
    cannabisFields.push(
      <Field key="cbd_percentage" label={fieldLabel('cbd_percentage', 'CBD %')}>
        <input type="number" step="0.01" value={form.cbdPercentage} onChange={e => set('cbdPercentage', e.target.value)} className={inputCls} required={fieldRequired('cbd_percentage')} />
      </Field>
    )
  }
  if (fieldVisible('thc_content_mg')) {
    cannabisFields.push(
      <Field key="thc_content_mg" label={fieldLabel('thc_content_mg', 'THC (mg)')}>
        <input type="number" step="0.01" value={form.thcContentMg} onChange={e => set('thcContentMg', e.target.value)} className={inputCls} required={fieldRequired('thc_content_mg')} />
      </Field>
    )
  }
  if (fieldVisible('cbd_content_mg')) {
    cannabisFields.push(
      <Field key="cbd_content_mg" label={fieldLabel('cbd_content_mg', 'CBD (mg)')}>
        <input type="number" step="0.01" value={form.cbdContentMg} onChange={e => set('cbdContentMg', e.target.value)} className={inputCls} required={fieldRequired('cbd_content_mg')} />
      </Field>
    )
  }
  if (fieldVisible('flower_equivalent')) {
    cannabisFields.push(
      <Field key="flower_equivalent" label={fieldLabel('flower_equivalent', 'Flower Equiv (g)')}>
        <input type="number" step="0.001" value={form.flowerEquivalent} onChange={e => set('flowerEquivalent', e.target.value)} className={inputCls} required={fieldRequired('flower_equivalent')} />
      </Field>
    )
  }
  if (fieldVisible('dosage')) {
    cannabisFields.push(
      <Field key="dosage" label={fieldLabel('dosage', 'Dosage')}>
        <input list="dosage-presets" value={form.dosage} onChange={e => set('dosage', e.target.value)} className={inputCls} required={fieldRequired('dosage')} placeholder="Select or type a dosage" />
        <datalist id="dosage-presets">
          {dosagePresets.map(d => <option key={d} value={d} />)}
        </datalist>
      </Field>
    )
  }
  if (fieldVisible('net_weight')) {
    cannabisFields.push(
      <Field key="net_weight" label={fieldLabel('net_weight', 'Net Weight')}>
        <div className="flex gap-2">
          <input type="number" step="0.001" value={form.netWeight} onChange={e => set('netWeight', e.target.value)} className={inputCls} required={fieldRequired('net_weight')} />
          <select value={form.netWeightUnit} onChange={e => set('netWeightUnit', e.target.value)} className={selectCls + ' w-20'}>
            <option value="g">g</option>
            <option value="mg">mg</option>
            <option value="oz">oz</option>
            <option value="ml">ml</option>
          </select>
        </div>
      </Field>
    )
  }
  if (fieldVisible('gross_weight')) {
    cannabisFields.push(
      <Field key="gross_weight" label={fieldLabel('gross_weight', 'Gross Weight (g)')}>
        <input type="number" step="0.001" value={form.grossWeightGrams} onChange={e => set('grossWeightGrams', e.target.value)} className={inputCls} required={fieldRequired('gross_weight')} />
      </Field>
    )
  }
  if (fieldVisible('unit_thc_dose')) {
    cannabisFields.push(
      <Field key="unit_thc_dose" label={fieldLabel('unit_thc_dose', 'Unit THC Dose')}>
        <input type="number" step="0.01" value={form.unitThcDose} onChange={e => set('unitThcDose', e.target.value)} className={inputCls} required={fieldRequired('unit_thc_dose')} />
      </Field>
    )
  }
  if (fieldVisible('unit_cbd_dose')) {
    cannabisFields.push(
      <Field key="unit_cbd_dose" label={fieldLabel('unit_cbd_dose', 'Unit CBD Dose')}>
        <input type="number" step="0.01" value={form.unitCbdDose} onChange={e => set('unitCbdDose', e.target.value)} className={inputCls} required={fieldRequired('unit_cbd_dose')} />
      </Field>
    )
  }
  if (fieldVisible('administration_method')) {
    cannabisFields.push(
      <Field key="administration_method" label={fieldLabel('administration_method', 'Administration Method')}>
        <input value={form.administrationMethod} onChange={e => set('administrationMethod', e.target.value)} className={inputCls} required={fieldRequired('administration_method')} />
      </Field>
    )
  }
  if (fieldVisible('package_size')) {
    cannabisFields.push(
      <Field key="package_size" label={fieldLabel('package_size', 'Package Size')}>
        <input type="number" step="1" value={form.packageSize} onChange={e => set('packageSize', e.target.value)} className={inputCls} required={fieldRequired('package_size')} />
      </Field>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-50">{isEdit ? 'Edit Product' : 'New Product'}</h1>
        <div className="flex gap-2">
          {isEdit && (
            <button type="button" onClick={handleDeactivate}
              className="text-sm px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30">
              Deactivate
            </button>
          )}
          <button type="button" onClick={() => router.push('/products')}
            className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Cancel</button>
          <button type="submit" disabled={saving}
            className="text-sm px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {deactivateError && <p className="text-red-400 text-sm">{deactivateError}</p>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        {tabs.map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <Section title="Basic Info">
            {basicInfoFields.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {basicInfoFields}
              </div>
            )}
            {fieldVisible('description') && (
              <Field label={fieldLabel('description', 'Description')}>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} className={inputCls + ' h-20'} required={fieldRequired('description')} />
              </Field>
            )}
          </Section>

          <Section title="Classification">
            {classificationFields.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {classificationFields}
              </div>
            )}
            <div className="flex gap-4 items-center flex-wrap">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.isCannabis} onChange={e => set('isCannabis', e.target.checked)} className="rounded" />
                Cannabis product
              </label>
              {fieldVisible('is_taxable') && (
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={form.isTaxable} onChange={e => set('isTaxable', e.target.checked)} className="rounded" />
                  {fieldLabel('is_taxable', 'Taxable')}
                </label>
              )}
              {fieldVisible('allow_automatic_discounts') && (
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={form.allowAutomaticDiscounts} onChange={e => set('allowAutomaticDiscounts', e.target.checked)} className="rounded" />
                  {fieldLabel('allow_automatic_discounts', 'Allow Automatic Discounts')}
                </label>
              )}
              <Field label="Type">
                <select value={form.productType} onChange={e => set('productType', e.target.value)} className={selectCls + ' w-32'}>
                  <option value="quantity">Quantity</option>
                  <option value="weight">Weight</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* Tags */}
          <Section title="Tags">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400">Product Tags</span>
              <button type="button" onClick={() => openQuickAdd('tag')}
                className="px-2 py-0.5 text-xs bg-gray-700 text-emerald-400 rounded-lg hover:bg-gray-600 border border-gray-600">
                + New Tag
              </button>
            </div>
            {allTags.length === 0 ? (
              <p className="text-gray-500 text-sm">No product tags defined. Create tags in Products &gt; Tags.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => {
                  const selected = selectedTagIds.has(tag.id)
                  return (
                    <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                      }`}
                      style={tag.color && selected ? { borderColor: tag.color, backgroundColor: `${tag.color}20`, color: tag.color } : undefined}>
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            )}
          </Section>

          {pricingFields.length > 0 && (
            <Section title="Pricing">
              <div className="grid grid-cols-3 gap-4">
                {pricingFields}
              </div>
              <div className="flex gap-4 items-end mt-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={form.isOnSale} onChange={e => set('isOnSale', e.target.checked)} className="rounded" />
                  On Sale
                </label>
                {form.isOnSale && (
                  <Field label="Sale Price">
                    <input type="number" step="0.01" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} className={inputCls + ' w-40'} placeholder="0.00" />
                  </Field>
                )}
              </div>
            </Section>
          )}

          {form.isCannabis && cannabisFields.length > 0 && (
            <Section title="Cannabis Details">
              <div className="grid grid-cols-3 gap-4">
                {cannabisFields}
              </div>
            </Section>
          )}

          {(fieldVisible('allergens') || fieldVisible('ingredients') || fieldVisible('instructions')) && (
            <Section title="Additional Info">
              <div className="space-y-3">
                {fieldVisible('allergens') && (
                  <Field label={fieldLabel('allergens', 'Allergens')}>
                    <textarea value={form.allergens} onChange={e => set('allergens', e.target.value)} className={inputCls + ' h-20'} required={fieldRequired('allergens')} />
                  </Field>
                )}
                {fieldVisible('ingredients') && (
                  <Field label={fieldLabel('ingredients', 'Ingredients')}>
                    <textarea value={form.ingredients} onChange={e => set('ingredients', e.target.value)} className={inputCls + ' h-20'} required={fieldRequired('ingredients')} />
                  </Field>
                )}
                {fieldVisible('instructions') && (
                  <Field label={fieldLabel('instructions', 'Instructions / Usage')}>
                    <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)} className={inputCls + ' h-20'} required={fieldRequired('instructions')} />
                  </Field>
                )}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Location Pricing Tab */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          {!isEdit ? (
            <p className="text-gray-500 text-sm">Save the product first, then configure per-location pricing.</p>
          ) : locations.length === 0 ? (
            <p className="text-gray-500 text-sm">No locations found.</p>
          ) : (
            locations.map(loc => {
              const lp = locationPrices.find(p => p.location_id === loc.id)
              return (
                <Section key={loc.id} title={loc.name}>
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Rec Price Override">
                      <input type="number" step="0.01" value={lp?.rec_price ?? ''}
                        onChange={e => updateLocationPrice(loc.id, 'rec_price', e.target.value ? parseFloat(e.target.value) : null)}
                        className={inputCls} placeholder={form.recPrice || 'Base price'} />
                    </Field>
                    <Field label="Med Price Override">
                      <input type="number" step="0.01" value={lp?.med_price ?? ''}
                        onChange={e => updateLocationPrice(loc.id, 'med_price', e.target.value ? parseFloat(e.target.value) : null)}
                        className={inputCls} placeholder={form.medPrice || 'Base price'} />
                    </Field>
                    <Field label="Cost Override">
                      <input type="number" step="0.01" value={lp?.cost_price ?? ''}
                        onChange={e => updateLocationPrice(loc.id, 'cost_price', e.target.value ? parseFloat(e.target.value) : null)}
                        className={inputCls} placeholder={form.costPrice || 'Base cost'} />
                    </Field>
                    <Field label="Pricing Tier">
                      <select value={lp?.pricing_tier_id ?? ''}
                        onChange={e => updateLocationPrice(loc.id, 'pricing_tier_id', e.target.value || null)}
                        className={selectCls}>
                        <option value="">None</option>
                        {pricingTiers.map(tier => (
                          <option key={tier.id} value={tier.id}>{tier.name} ({tier.multiplier}x)</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Purchase Cap">
                      <input type="number" step="1" value={lp?.purchase_cap ?? ''}
                        onChange={e => updateLocationPrice(loc.id, 'purchase_cap', e.target.value ? parseInt(e.target.value) : null)}
                        className={inputCls} placeholder="No limit" />
                    </Field>
                    <Field label="Low Inventory Threshold">
                      <input type="number" step="1" value={lp?.low_inventory_threshold ?? ''}
                        onChange={e => updateLocationPrice(loc.id, 'low_inventory_threshold', e.target.value ? parseInt(e.target.value) : null)}
                        className={inputCls} placeholder="None" />
                    </Field>
                  </div>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input type="checkbox" checked={lp?.is_pos_available ?? true}
                        onChange={e => updateLocationPrice(loc.id, 'is_pos_available', e.target.checked)} className="rounded" />
                      Available on POS
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300">
                      <input type="checkbox" checked={lp?.is_online_available ?? false}
                        onChange={e => updateLocationPrice(loc.id, 'is_online_available', e.target.checked)} className="rounded" />
                      Available Online
                    </label>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button type="button" onClick={() => saveLocationPrice(loc.id)}
                      className="text-xs px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30">
                      Save Location Pricing
                    </button>
                  </div>
                </Section>
              )
            })
          )}
        </div>
      )}

      {/* Online / Images Tab */}
      {activeTab === 'online' && (
        <div className="space-y-6">
          <Section title="Ecommerce Details">
            {(fieldVisible('online_title') || fieldVisible('regulatory_category') || fieldVisible('external_sub_category')) && (
              <div className="grid grid-cols-2 gap-4">
                {fieldVisible('online_title') && (
                  <Field label={fieldLabel('online_title', 'Online Title')}>
                    <input value={form.onlineTitle} onChange={e => set('onlineTitle', e.target.value)} className={inputCls} placeholder="Defaults to product name" required={fieldRequired('online_title')} />
                  </Field>
                )}
                {fieldVisible('regulatory_category') && (
                  <Field label={fieldLabel('regulatory_category', 'Regulatory Category')}>
                    <input value={form.regulatoryCategory} onChange={e => set('regulatoryCategory', e.target.value)} className={inputCls} required={fieldRequired('regulatory_category')} />
                  </Field>
                )}
                {fieldVisible('external_sub_category') && (
                  <Field label={fieldLabel('external_sub_category', 'External Sub-Category')}>
                    <input value={form.externalSubCategory} onChange={e => set('externalSubCategory', e.target.value)} className={inputCls} required={fieldRequired('external_sub_category')} />
                  </Field>
                )}
              </div>
            )}
            {fieldVisible('online_description') && (
              <Field label={fieldLabel('online_description', 'Online Description')}>
                <textarea value={form.onlineDescription} onChange={e => set('onlineDescription', e.target.value)}
                  className={inputCls + ' h-32'} placeholder="Detailed description shown on the online menu" required={fieldRequired('online_description')} />
              </Field>
            )}
          </Section>

          <Section title="Product Images">
            {imageError && <p className="text-red-400 text-sm mb-2">{imageError}</p>}
            {!isEdit ? (
              <p className="text-gray-500 text-sm">Save the product first, then upload images.</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4">
                  {images.map((img, idx) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-600 bg-gray-900">
                      <img src={img.image_url} alt={img.alt_text ?? ''} className="w-full h-32 object-cover" />
                      {img.is_primary && (
                        <span className="absolute top-1 left-1 text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">Primary</span>
                      )}
                      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] bg-gray-800/80 text-gray-300 px-1.5 py-0.5 rounded">
                        #{img.sort_order}
                      </span>
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {idx > 0 && (
                          <button type="button" onClick={() => handleImageReorder(idx, 'up')}
                            className="w-6 h-6 bg-gray-700/90 text-gray-200 rounded text-xs flex items-center justify-center hover:bg-gray-600">
                            &#x25B2;
                          </button>
                        )}
                        {idx < images.length - 1 && (
                          <button type="button" onClick={() => handleImageReorder(idx, 'down')}
                            className="w-6 h-6 bg-gray-700/90 text-gray-200 rounded text-xs flex items-center justify-center hover:bg-gray-600">
                            &#x25BC;
                          </button>
                        )}
                        <button type="button" onClick={() => handleImageDelete(img.id)}
                          className="w-6 h-6 bg-red-600/80 text-white rounded text-xs flex items-center justify-center">
                          X
                        </button>
                      </div>
                      <div className="p-1">
                        <input
                          type="text"
                          defaultValue={img.alt_text ?? ''}
                          placeholder="Alt text..."
                          onBlur={e => handleImageAltTextSave(img.id, e.target.value)}
                          className="w-full h-7 px-2 bg-gray-800 border border-gray-600 rounded text-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-gray-500 transition-colors">
                    <span className="text-gray-500 text-2xl">+</span>
                    <span className="text-gray-500 text-xs mt-1">{uploading ? 'Uploading...' : 'Add Image'}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </>
            )}
          </Section>
        </div>
      )}

      {/* Label Settings Tab */}
      {activeTab === 'labels' && (
        <div className="space-y-6">
          <Section title="Auto-Print Label Settings">
            <p className="text-xs text-gray-500 mb-4">Configure which label template to use when this product is sold to each customer type.</p>
            {labelSettings.map((ls, idx) => (
              <div key={ls.customer_type} className="flex items-center gap-4 py-3 border-b border-gray-700 last:border-0">
                <label className="flex items-center gap-2 w-24">
                  <input type="checkbox" checked={ls.enabled}
                    onChange={e => updateLabelSetting(idx, 'enabled', e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-300 capitalize">{ls.customer_type}</span>
                </label>
                <Field label="Template">
                  <select value={ls.label_template_id ?? ''}
                    onChange={e => updateLabelSetting(idx, 'label_template_id', e.target.value || null)}
                    className={selectCls + ' w-60'}>
                    <option value="">None</option>
                    {labelTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>
                <Field label="Qty">
                  <input type="number" min="1" max="10" value={ls.print_quantity}
                    onChange={e => updateLabelSetting(idx, 'print_quantity', parseInt(e.target.value) || 1)}
                    className={inputCls + ' w-20'} />
                </Field>
              </div>
            ))}
          </Section>
        </div>
      )}

      {/* BI Dashboard Tab */}
      {activeTab === 'analytics' && isEdit && productId && (
        <ProductAnalytics productId={productId} />
      )}

      {/* Price History Tab */}
      {activeTab === 'history' && isEdit && productId && (
        <ProductPriceHistory productId={productId} />
      )}

      {/* Quick-Add Modal */}
      {quickAddTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-50">
              New {quickAddTarget === 'brand' ? 'Brand' : quickAddTarget === 'vendor' ? 'Vendor' : quickAddTarget === 'producer' ? 'Producer' : quickAddTarget === 'strain' ? 'Strain' : 'Tag'}
            </h2>

            <label className="block">
              <span className="text-xs text-gray-400">Name *</span>
              <input
                value={quickAddForm.name ?? ''}
                onChange={e => setQuickAddForm(prev => ({ ...prev, name: e.target.value }))}
                className={inputCls}
                autoFocus
              />
            </label>

            {quickAddTarget === 'strain' && (
              <label className="block">
                <span className="text-xs text-gray-400">Strain Type</span>
                <select
                  value={quickAddForm.strain_type ?? ''}
                  onChange={e => setQuickAddForm(prev => ({ ...prev, strain_type: e.target.value }))}
                  className={selectCls}>
                  <option value="">Select...</option>
                  <option value="indica">Indica</option>
                  <option value="sativa">Sativa</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="cbd">CBD</option>
                </select>
              </label>
            )}

            {(quickAddTarget === 'vendor' || quickAddTarget === 'producer') && (
              <>
                <label className="block">
                  <span className="text-xs text-gray-400">License Number</span>
                  <input
                    value={quickAddForm.license_number ?? ''}
                    onChange={e => setQuickAddForm(prev => ({ ...prev, license_number: e.target.value }))}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">Contact Name</span>
                  <input
                    value={quickAddForm.contact_name ?? ''}
                    onChange={e => setQuickAddForm(prev => ({ ...prev, contact_name: e.target.value }))}
                    className={inputCls}
                  />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs text-gray-400">Email</span>
                    <input
                      type="email"
                      value={quickAddForm.email ?? ''}
                      onChange={e => setQuickAddForm(prev => ({ ...prev, email: e.target.value }))}
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-400">Phone</span>
                    <input
                      type="tel"
                      value={quickAddForm.phone ?? ''}
                      onChange={e => setQuickAddForm(prev => ({ ...prev, phone: e.target.value }))}
                      className={inputCls}
                    />
                  </label>
                </div>
              </>
            )}

            {quickAddTarget === 'tag' && (
              <label className="block">
                <span className="text-xs text-gray-400">Color (hex)</span>
                <div className="flex gap-2 items-center">
                  <input
                    value={quickAddForm.color ?? ''}
                    onChange={e => setQuickAddForm(prev => ({ ...prev, color: e.target.value }))}
                    className={inputCls}
                    placeholder="#10b981"
                  />
                  {quickAddForm.color && (
                    <div className="w-10 h-10 rounded-lg border border-gray-600 shrink-0" style={{ backgroundColor: quickAddForm.color }} />
                  )}
                </div>
              </label>
            )}

            {quickAddError && <p className="text-red-400 text-sm">{quickAddError}</p>}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setQuickAddTarget(null)}
                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">
                Cancel
              </button>
              <button type="button" onClick={handleQuickAddSave} disabled={quickAddSaving}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-emerald-500">
                {quickAddSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-400 block mb-1">{label}</span>
      {children}
    </label>
  )
}
