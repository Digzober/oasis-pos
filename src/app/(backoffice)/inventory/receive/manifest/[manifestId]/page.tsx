'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ReceivingHeader, type ReceivingHeaderData } from '@/components/backoffice/receiving/ReceivingHeader'
import { ReceivingItemsTable, type ReceivingItem } from '@/components/backoffice/receiving/ReceivingItemsTable'
import { ReceivePackageModal } from '@/components/backoffice/receiving/ReceivePackageModal'
import type { ProductMatch } from '@/components/backoffice/receiving/ProductMatcher'
import type { BioTrackManifest, BioTrackManifestItem } from '@/lib/biotrack/inventoryTypes'
import { LoadingState } from '@/components/shared/LoadingState'
import { logger } from '@/lib/utils/logger'

interface DropdownOption {
  value: string
  label: string
}

const WEIGHT_CATEGORIES = ['flower', 'concentrate', 'shake_trim', 'kief', 'hash', 'rosin', 'resin']

function determineItemType(category: string): 'quantity' | 'weight' {
  const lower = category.toLowerCase().replace(/[^a-z_]/g, '')
  return WEIGHT_CATEGORIES.some((wc) => lower.includes(wc)) ? 'weight' : 'quantity'
}

function generateItemId(barcode: string, idx: number): string {
  return `${barcode}-${idx}`
}

function buildReceivingItem(
  mi: BioTrackManifestItem,
  idx: number,
  headerRoomId: string | null,
  headerRoomName: string | null,
  headerVendorId: string | null,
  headerVendorName: string | null,
  headerStatus: string,
): ReceivingItem {
  const itemType = determineItemType(mi.category)
  return {
    id: generateItemId(mi.barcode, idx),
    barcode: mi.barcode,
    biotrack_name: mi.product_name,
    quantity: itemType === 'weight' ? mi.weight : mi.quantity,
    original_quantity: itemType === 'weight' ? mi.weight : mi.quantity,
    weight: mi.weight,
    category: mi.category,
    batch_number: mi.batch_number,
    item_type: itemType,
    product_id: null,
    product_name: null,
    vendor_id: headerVendorId,
    vendor_name: headerVendorName,
    room_id: headerRoomId,
    room_name: headerRoomName,
    subroom_id: null,
    cost_per_unit: null,
    confidence: 0,
    match: null,
    strain_id: null,
    lot_number: mi.batch_number || null,
    expiration_date: null,
    packaging_date: null,
    external_package_id: null,
    package_ndc: null,
    tax_per_unit: null,
    med_price: null,
    rec_price: null,
    flower_equivalent: null,
    inventory_status: headerStatus,
    tags: [],
    thc_percentage: mi.thc_percentage ?? null,
    cbd_percentage: mi.cbd_percentage ?? null,
    lab_results: mi.lab_results ?? null,
    use_biotrack_lab: true,
    grams: mi.weight > 0 ? mi.weight : null,
    producer_id: null,
    is_complete: false,
    user_edited_fields: new Set<string>(),
  }
}

function checkItemComplete(item: ReceivingItem): boolean {
  return !!(item.product_id && item.room_id && item.quantity > 0 && item.barcode)
}

export default function ManifestReceivingPage() {
  const params = useParams()
  const router = useRouter()
  const manifestId = params.manifestId as string

  const [manifest, setManifest] = useState<BioTrackManifest | null>(null)
  const [items, setItems] = useState<ReceivingItem[]>([])
  const [headerData, setHeaderData] = useState<ReceivingHeaderData>({
    vendor_id: null,
    producer_id: null,
    delivered_by: '',
    vendor_license: '',
    order_title: '',
    delivered_on: '',
    manifest_id: '',
    room_id: null,
    inventory_status: 'Available',
    total_credits: '0',
    shipping_charges: '0',
    cost_option: 'none',
    notes: '',
  })

  const [vendors, setVendors] = useState<DropdownOption[]>([])
  const [rooms, setRooms] = useState<DropdownOption[]>([])
  const [subrooms, setSubrooms] = useState<DropdownOption[]>([])
  const [strains, setStrains] = useState<DropdownOption[]>([])
  const [tagsOptions, setTagsOptions] = useState<DropdownOption[]>([])
  const [statuses, setStatuses] = useState<DropdownOption[]>([{ value: 'Available', label: 'Available' }])

  const [loading, setLoading] = useState(true)
  const [receiving, setReceiving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [itemMatches, setItemMatches] = useState<Map<number, ProductMatch[]>>(new Map())
  const [matchLoading, setMatchLoading] = useState(false)

  const matchedRef = useRef(false)

  // Load dropdown data
  useEffect(() => {
    const loadDropdowns = async () => {
      const [vendorsRes, roomsRes, strainsRes, tagsRes, statusesRes] = await Promise.all([
        fetch('/api/vendors').then((r) => r.json()).catch(() => ({ vendors: [] })),
        fetch('/api/rooms').then((r) => r.json()).catch(() => ({ rooms: [] })),
        fetch('/api/strains').then((r) => r.json()).catch(() => ({ strains: [] })),
        fetch('/api/tags?type=inventory').then((r) => r.json()).catch(() => ({ tags: [] })),
        fetch('/api/settings/inventory-statuses').then((r) => r.json()).catch(() => ({ statuses: [] })),
      ])

      const vendorOpts = (vendorsRes.vendors ?? []).map((v: { id: string; name: string }) => ({
        value: v.id,
        label: v.name,
      }))
      const roomOpts = (roomsRes.rooms ?? []).map((r: { id: string; name: string }) => ({
        value: r.id,
        label: r.name,
      }))
      const strainOpts = (strainsRes.strains ?? []).map((s: { id: string; name: string }) => ({
        value: s.id,
        label: s.name,
      }))
      const tagOpts = (tagsRes.tags ?? []).map((t: { id: string; name: string }) => ({
        value: t.id,
        label: t.name,
      }))
      const statusOpts = (statusesRes.statuses ?? []).map((s: { name: string }) => ({
        value: s.name,
        label: s.name,
      }))

      setVendors(vendorOpts)
      setRooms(roomOpts)
      setStrains(strainOpts)
      setTagsOptions(tagOpts)
      if (statusOpts.length > 0) setStatuses(statusOpts)

      return { vendorOpts, roomOpts }
    }

    const loadManifest = async () => {
      const res = await fetch('/api/inventory/manifests')
      if (!res.ok) throw new Error('Failed to fetch manifests')
      const data = await res.json()
      const found = (data.manifests ?? []).find(
        (m: BioTrackManifest) => m.manifest_id === manifestId
      )
      if (!found) throw new Error(`Manifest ${manifestId} not found`)
      return found as BioTrackManifest
    }

    Promise.all([loadDropdowns(), loadManifest()])
      .then(([{ vendorOpts, roomOpts }, foundManifest]) => {
        setManifest(foundManifest)

        // Auto-match vendor by sender_name
        const matchedVendor = vendorOpts.find(
          (v: DropdownOption) => v.label.toLowerCase() === foundManifest.sender_name.toLowerCase()
        ) ?? vendorOpts.find(
          (v: DropdownOption) => foundManifest.sender_name.toLowerCase().includes(v.label.toLowerCase())
        )

        // Find default receiving room
        const defaultRoom = roomOpts[0] ?? null

        const hd: ReceivingHeaderData = {
          vendor_id: matchedVendor?.value ?? null,
          producer_id: null,
          delivered_by: '',
          vendor_license: foundManifest.sender_license,
          order_title: `${foundManifest.transfer_date} - ${foundManifest.sender_name}`,
          delivered_on: foundManifest.transfer_date,
          manifest_id: foundManifest.manifest_id,
          room_id: defaultRoom?.value ?? null,
          inventory_status: 'Available',
          total_credits: '0',
          shipping_charges: '0',
          cost_option: 'none',
          notes: '',
        }
        setHeaderData(hd)

        // Build items
        const receivingItems = foundManifest.items.map((mi, idx) =>
          buildReceivingItem(
            mi, idx,
            defaultRoom?.value ?? null,
            defaultRoom?.label ?? null,
            matchedVendor?.value ?? null,
            matchedVendor?.label ?? null,
            'Available',
          )
        )
        setItems(receivingItems)
        setLoading(false)
      })
      .catch((err) => {
        logger.error('Failed to load manifest', { error: String(err) })
        setError(String(err))
        setLoading(false)
      })
  }, [manifestId])

  // Auto-match products when items are loaded
  useEffect(() => {
    if (items.length === 0 || matchedRef.current) return
    matchedRef.current = true

    const matchItems = async () => {
      const newMatches = new Map<number, ProductMatch[]>()
      const updatedItems = [...items]

      for (let i = 0; i < items.length; i++) {
        const item = items[i] as ReceivingItem
        const current = updatedItems[i] as ReceivingItem
        try {
          const searchParams = new URLSearchParams({
            biotrack_name: item.biotrack_name,
            biotrack_barcode: item.barcode,
            biotrack_category: item.category,
          })
          const res = await fetch(`/api/products/match?${searchParams.toString()}`)
          if (res.ok) {
            const data = await res.json()
            const matches: ProductMatch[] = data.matches ?? []
            newMatches.set(i, matches)

            const best = matches[0]
            if (best) {
              current.product_id = best.product_id
              current.product_name = best.product_name
              current.confidence = best.confidence
              current.match = best
              current.is_complete = checkItemComplete({ ...current, product_id: best.product_id })

              // Auto-populate from product if high confidence
              if (best.confidence >= 0.5) {
                try {
                  const prodRes = await fetch(`/api/products/${best.product_id}?include=brand,vendor,strain,category`)
                  if (prodRes.ok) {
                    const prodData = await prodRes.json()
                    const product = prodData.product ?? prodData

                    if (product.vendor_id && !current.user_edited_fields.has('vendor_id')) {
                      current.vendor_id = product.vendor_id
                      const vn = vendors.find((v) => v.value === product.vendor_id)
                      current.vendor_name = vn?.label ?? product.vendor?.name ?? null
                    }
                    if (product.strain_id && !current.user_edited_fields.has('strain_id')) {
                      current.strain_id = product.strain_id
                    }
                    if (product.med_price && !current.user_edited_fields.has('med_price')) {
                      current.med_price = product.med_price
                    }
                    if (product.rec_price && !current.user_edited_fields.has('rec_price')) {
                      current.rec_price = product.rec_price
                    }
                    if (product.category?.default_flower_equivalent && !current.user_edited_fields.has('flower_equivalent')) {
                      current.flower_equivalent = product.category.default_flower_equivalent
                    }

                    // Fetch last cost
                    try {
                      const costRes = await fetch(`/api/inventory/last-cost/${best.product_id}`)
                      if (costRes.ok) {
                        const costData = await costRes.json()
                        if (costData.cost_per_unit && !current.user_edited_fields.has('cost_per_unit')) {
                          current.cost_per_unit = costData.cost_per_unit
                        }
                      }
                    } catch {
                      // last cost not available, skip
                    }
                  }
                } catch {
                  // product detail fetch failed, skip auto-populate
                }
              }

              current.is_complete = checkItemComplete(current)
              updatedItems[i] = { ...current }
            }
          }
        } catch (err) {
          logger.error('Product match failed for item', { barcode: item.barcode, error: String(err) })
        }
      }

      setItemMatches(newMatches)
      setItems(updatedItems)
    }

    matchItems()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once when items first load
  }, [items.length, vendors])

  // Header field change
  const handleHeaderChange = useCallback((field: keyof ReceivingHeaderData, value: string | null) => {
    setHeaderData((prev) => ({ ...prev, [field]: value }))

    // Propagate room and vendor changes to items that haven't been manually edited
    if (field === 'room_id') {
      const roomName = rooms.find((r) => r.value === value)?.label ?? null
      setItems((prev) => prev.map((item) => {
        if (item.user_edited_fields.has('room_id')) return item
        return { ...item, room_id: value, room_name: roomName }
      }))
    }
    if (field === 'vendor_id') {
      const vendorName = vendors.find((v) => v.value === value)?.label ?? null
      setItems((prev) => prev.map((item) => {
        if (item.user_edited_fields.has('vendor_id')) return item
        return { ...item, vendor_id: value, vendor_name: vendorName }
      }))
    }
    if (field === 'inventory_status') {
      setItems((prev) => prev.map((item) => {
        if (item.user_edited_fields.has('inventory_status')) return item
        return { ...item, inventory_status: value }
      }))
    }
  }, [rooms, vendors])

  // Item update from modal
  const handleItemSave = useCallback((index: number, updates: Partial<ReceivingItem>) => {
    setItems((prev) => {
      const next = [...prev]
      const existing = next[index]
      if (!existing) return prev
      const updated = { ...existing, ...updates }
      updated.is_complete = checkItemComplete(updated)
      next[index] = updated
      return next
    })
    setEditingIndex(null)
  }, [])

  // Item delete
  const handleItemDelete = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    const newMatches = new Map(itemMatches)
    newMatches.delete(index)
    setItemMatches(newMatches)
  }, [itemMatches])

  // Product search from modal
  const handleProductSearch = useCallback(async (query: string) => {
    if (query.length < 2) return
    setMatchLoading(true)
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        const searchMatches: ProductMatch[] = (data.products ?? []).map((p: {
          id: string; name: string; sku?: string; brand?: { name: string }; strain?: { name: string }
        }) => ({
          product_id: p.id,
          product_name: p.name,
          confidence: 0.5,
          match_method: 'manual' as const,
          sku: p.sku,
          brand_name: p.brand?.name,
          strain_name: p.strain?.name,
        }))

        if (editingIndex !== null) {
          setItemMatches((prev) => {
            const next = new Map(prev)
            const existing = next.get(editingIndex) ?? []
            // Merge keeping existing high-confidence matches at top
            const existingIds = new Set(existing.map((m) => m.product_id))
            const newOnes = searchMatches.filter((m: ProductMatch) => !existingIds.has(m.product_id))
            next.set(editingIndex, [...existing, ...newOnes])
            return next
          })
        }
      }
    } catch {
      // search failed
    }
    setMatchLoading(false)
  }, [editingIndex])

  // Product selected in modal => auto-populate
  const handleProductSelect = useCallback(async (index: number, productId: string, match: ProductMatch) => {
    setItems((prev) => {
      const next = [...prev]
      const existing = next[index]
      if (!existing) return prev
      const updated: ReceivingItem = {
        ...existing,
        product_id: productId,
        product_name: match.product_name,
        confidence: match.confidence,
        match,
      }
      updated.is_complete = checkItemComplete(updated)
      next[index] = updated
      return next
    })

    // Auto-populate from product
    try {
      const res = await fetch(`/api/products/${productId}?include=brand,vendor,strain,category`)
      if (res.ok) {
        const prodData = await res.json()
        const product = prodData.product ?? prodData

        setItems((prev) => {
          const next = [...prev]
          const item = next[index]
          if (!item) return prev
          const copy = { ...item }
          if (product.vendor_id && !copy.user_edited_fields.has('vendor_id')) {
            copy.vendor_id = product.vendor_id
            const vn = vendors.find((v) => v.value === product.vendor_id)
            copy.vendor_name = vn?.label ?? null
          }
          if (product.strain_id && !copy.user_edited_fields.has('strain_id')) {
            copy.strain_id = product.strain_id
          }
          if (product.med_price != null && !copy.user_edited_fields.has('med_price')) {
            copy.med_price = product.med_price
          }
          if (product.rec_price != null && !copy.user_edited_fields.has('rec_price')) {
            copy.rec_price = product.rec_price
          }
          if (product.category?.default_flower_equivalent && !copy.user_edited_fields.has('flower_equivalent')) {
            copy.flower_equivalent = product.category.default_flower_equivalent
          }
          next[index] = copy
          return next
        })

        // Fetch last cost
        try {
          const costRes = await fetch(`/api/inventory/last-cost/${productId}`)
          if (costRes.ok) {
            const costData = await costRes.json()
            if (costData.cost_per_unit) {
              setItems((prev) => {
                const next = [...prev]
                const existing = next[index]
                if (!existing) return prev
                if (!existing.user_edited_fields.has('cost_per_unit')) {
                  next[index] = { ...existing, cost_per_unit: costData.cost_per_unit }
                }
                return next
              })
            }
          }
        } catch {
          // skip
        }
      }
    } catch {
      // skip
    }
  }, [vendors])

  // Load subrooms when room changes
  const handleRoomChange = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/subrooms`)
      if (res.ok) {
        const data = await res.json()
        setSubrooms(
          (data.subrooms ?? []).map((s: { id: string; name: string }) => ({
            value: s.id,
            label: s.name,
          }))
        )
      }
    } catch {
      setSubrooms([])
    }
  }, [])

  // Save draft to localStorage
  const handleSaveDraft = useCallback(() => {
    const draft = {
      headerData,
      items: items.map((item) => ({
        ...item,
        user_edited_fields: Array.from(item.user_edited_fields),
      })),
    }
    localStorage.setItem(`manifest-draft-${manifestId}`, JSON.stringify(draft))
  }, [headerData, items, manifestId])

  // Receive all
  const handleReceive = useCallback(async () => {
    if (!manifest) return

    const incomplete = items.filter((item) => !item.is_complete)
    if (incomplete.length > 0) {
      setError(`${incomplete.length} item(s) are incomplete. Please fill required fields for all items.`)
      return
    }

    setReceiving(true)
    setError(null)

    try {
      const payload = {
        manifest: {
          manifest_id: manifest.manifest_id,
          sender_license: manifest.sender_license,
          sender_name: manifest.sender_name,
          transfer_date: manifest.transfer_date,
          items: manifest.items,
          status: manifest.status,
        },
        items: items.map((item) => ({
          barcode: item.barcode,
          accepted_quantity: item.quantity,
          actual_quantity: item.quantity,
          product_id: item.product_id,
          room_id: item.room_id,
          subroom_id: item.subroom_id || null,
          cost_per_unit: item.cost_per_unit,
          discrepancy_reason: item.quantity !== item.original_quantity ? 'Quantity adjusted during receiving' : null,
          strain_id: item.strain_id || null,
          lot_number: item.lot_number || null,
          expiration_date: item.expiration_date || null,
          packaging_date: item.packaging_date || null,
          external_package_id: item.external_package_id || null,
          package_ndc: item.package_ndc || null,
          tax_per_unit: item.tax_per_unit,
          med_price: item.med_price,
          rec_price: item.rec_price,
          flower_equivalent: item.flower_equivalent,
          inventory_status: item.inventory_status || headerData.inventory_status,
          tags: item.tags,
        })),
        vendor_id: headerData.vendor_id || null,
        producer_id: headerData.producer_id || null,
        delivered_by: headerData.delivered_by || null,
        vendor_license: headerData.vendor_license || null,
        order_title: headerData.order_title || null,
        delivered_on: headerData.delivered_on || null,
        total_credits: parseFloat(headerData.total_credits) || null,
        shipping_charges: parseFloat(headerData.shipping_charges) || null,
        cost_option: headerData.cost_option,
        notes: headerData.notes || null,
      }

      const res = await fetch(`/api/inventory/manifests/${manifestId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to receive manifest')
      }

      // Clear draft
      localStorage.removeItem(`manifest-draft-${manifestId}`)
      router.push('/inventory/receive')
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setReceiving(false)
    }
  }, [manifest, items, headerData, manifestId, router])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingIndex !== null) {
        setEditingIndex(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editingIndex])

  // Total cost computation
  const totalCost = items.reduce((sum, item) => sum + (item.cost_per_unit ?? 0) * item.quantity, 0)
  const canReceive = items.length > 0 && items.every((item) => item.is_complete)

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Loading manifest..." />
      </div>
    )
  }

  if (error && !manifest) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => router.push('/inventory/receive')}
          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600"
        >
          Back to Receive Inventory
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-50">Receive Manifest</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {manifest?.sender_name} &mdash; {manifest?.manifest_id} &mdash; {manifest?.items.length} items
          </p>
        </div>
        <button
          onClick={() => router.push('/inventory/receive')}
          className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      <ReceivingHeader
        data={headerData}
        vendors={vendors}
        rooms={rooms}
        statuses={statuses}
        onChange={handleHeaderChange}
        onSave={handleSaveDraft}
        onReceive={handleReceive}
        receiving={receiving}
        canReceive={canReceive}
        itemCount={items.length}
        totalCost={totalCost}
      />

      <ReceivingItemsTable
        items={items}
        onEditItem={setEditingIndex}
        onDeleteItem={handleItemDelete}
        selectedIndex={editingIndex}
      />

      {!canReceive && items.length > 0 && (
        <div className="mt-3 px-4 py-2 bg-amber-900/20 border border-amber-700/30 rounded-lg">
          <p className="text-xs text-amber-400">
            {items.filter((i) => !i.is_complete).length} item(s) need attention before receiving.
            Items need a catalog product, room, and quantity.
          </p>
        </div>
      )}

      {editingIndex !== null && items[editingIndex] && (
        <ReceivePackageModal
          item={items[editingIndex]}
          index={editingIndex}
          productMatches={itemMatches.get(editingIndex) ?? []}
          vendors={vendors}
          rooms={rooms}
          subrooms={subrooms}
          strains={strains}
          tags={tagsOptions}
          statuses={statuses}
          onSave={handleItemSave}
          onRemove={(idx) => {
            handleItemDelete(idx)
            setEditingIndex(null)
          }}
          onClose={() => setEditingIndex(null)}
          onProductSearch={handleProductSearch}
          onProductSelect={handleProductSelect}
          onRoomChange={handleRoomChange}
          matchLoading={matchLoading}
        />
      )}
    </div>
  )
}
