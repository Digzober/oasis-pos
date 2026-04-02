import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { roundMoney } from '@/lib/utils/money'
import { calculateTaxes } from '@/lib/calculations/taxCalculator'
import { evaluateDiscounts } from '@/lib/calculations/discountEvaluator'
import { checkPurchaseLimit } from '@/lib/calculations/purchaseLimitCalculator'
import type { TaxRateConfig, TaxCalculationResult } from '@/lib/calculations/tax.types'
import type { DiscountWithRules, DiscountApplicationResult, DiscountableItem, DiscountEvaluationContext } from '@/lib/calculations/discount.types'
import type { PurchaseLimitConfig, PurchaseLimitResult, PurchaseLimitItem } from '@/lib/calculations/purchaseLimit.types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeldCart {
  id: string
  heldAt: string
  heldBy: string
  customerName: string | null
  items: CartItem[]
  itemCount: number
  total: number
}

export interface CartItem {
  id: string
  productId: string
  inventoryItemId: string | null
  productName: string
  categoryId: string
  categoryName: string | null
  brandId: string | null
  brandName: string | null
  vendorId: string | null
  strainId: string | null
  strainName: string | null
  sku: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  taxAmount: number
  lineTotal: number
  isCannabis: boolean
  isMedical: boolean
  weightGrams: number | null
  flowerEquivalent: number | null
  thcMg: number | null
  biotrackBarcode: string | null
  purchaseLimitCategory: string | null
  productTagIds: string[]
  inventoryTagIds: string[]
  pricingTierId: string | null
  weightDescriptor: string | null
}

export type CartItemInput = Omit<CartItem, 'id' | 'discountAmount' | 'taxAmount' | 'lineTotal'>

interface CartState {
  items: CartItem[]
  customerId: string | null
  customerName: string
  customerType: 'recreational' | 'medical'
  customerGroupIds: string[]
  segmentIds: string[]
  isFirstTimeCustomer: boolean

  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  taxBreakdown: TaxCalculationResult | null
  discountResult: DiscountApplicationResult | null
  purchaseLimit: PurchaseLimitResult | null

  locationId: string
  organizationId: string
  employeeId: string
  registerId: string

  taxRates: TaxRateConfig[]
  activeDiscounts: DiscountWithRules[]
  purchaseLimits: PurchaseLimitConfig[]
  configLoaded: boolean
  manualDiscountIds: string[]
  heldCarts: HeldCart[]

  // Actions
  initializeCart: (ctx: { locationId: string; organizationId: string; employeeId: string; registerId: string }) => Promise<void>
  addItem: (input: CartItemInput) => void
  removeItem: (cartLineId: string) => void
  updateQuantity: (cartLineId: string, quantity: number) => void
  setCustomer: (customer: { id: string; name: string; type: 'recreational' | 'medical'; groupIds: string[]; segmentIds: string[]; isFirstTime: boolean } | null) => void
  applyManualDiscount: (discountId: string) => void
  removeManualDiscount: (discountId: string) => void
  clearCart: () => void
  holdCart: (employeeName: string) => void
  resumeCart: (heldCartId: string) => void
  deleteHeldCart: (heldCartId: string) => void
  refreshConfig: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Recalculate
// ---------------------------------------------------------------------------

function recalculate(state: CartState): Partial<CartState> {
  const { items, taxRates, activeDiscounts, purchaseLimits, customerType, customerGroupIds, segmentIds, isFirstTimeCustomer, customerId, locationId, manualDiscountIds } = state

  if (items.length === 0) {
    return {
      items: [],
      subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0,
      taxBreakdown: null, discountResult: null,
      purchaseLimit: checkPurchaseLimit([], purchaseLimits, customerType),
    }
  }

  // Subtotal
  const subtotal = items.reduce((s, i) => roundMoney(s + i.unitPrice * i.quantity), 0)

  // Discounts
  const discountableItems: DiscountableItem[] = items.map((i) => ({
    cart_line_id: i.id,
    product_id: i.productId,
    inventory_item_id: i.inventoryItemId ?? '',
    brand_id: i.brandId,
    vendor_id: i.vendorId,
    strain_id: i.strainId,
    category_id: i.categoryId,
    pricing_tier_id: i.pricingTierId,
    product_tag_ids: i.productTagIds,
    inventory_tag_ids: i.inventoryTagIds,
    weight_descriptor: i.weightDescriptor,
    weight_grams: i.weightGrams,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    is_medical: customerType === 'medical',
  }))

  const discountContext: DiscountEvaluationContext = {
    location_id: locationId,
    customer_type: customerType,
    customer_group_ids: customerGroupIds,
    segment_ids: segmentIds,
    is_first_time: isFirstTimeCustomer,
    customer_id: customerId,
    customer_use_counts: new Map(),
    now: new Date(),
  }

  // Include manual discounts in the automatic evaluation
  const discountsToEvaluate = activeDiscounts.map((d) => {
    if (manualDiscountIds.includes(d.id) && (d.discount_type === 'manual' || d.discount_type === 'coupon')) {
      return { ...d, discount_type: 'automatic' as const }
    }
    return d
  })

  const discountResult = evaluateDiscounts(discountableItems, discountsToEvaluate, discountContext)

  // Apply per-item discounts
  const updatedItems = items.map((item) => {
    const perUnitDiscount = discountResult.item_discounts.get(item.id) ?? 0
    return { ...item, discountAmount: perUnitDiscount }
  })

  const discountTotal = roundMoney(
    updatedItems.reduce((s, i) => s + i.discountAmount * i.quantity, 0),
  )

  // Tax (on post-discount amounts)
  const taxItems = updatedItems.map((i) => ({
    product_id: i.productId,
    tax_category_id: i.isCannabis ? findTaxCategoryId(taxRates, true) : findTaxCategoryId(taxRates, false),
    is_medical: customerType === 'medical',
    taxable_amount: roundMoney(i.unitPrice - i.discountAmount),
    quantity: i.quantity,
  }))

  const taxBreakdown = calculateTaxes(taxItems, taxRates)
  const taxTotal = taxBreakdown.summary.total_tax

  // Apply per-item tax
  const finalItems = updatedItems.map((item, idx) => {
    const lineTax = taxBreakdown.line_taxes[idx]
    return {
      ...item,
      taxAmount: lineTax?.total_tax ?? 0,
      lineTotal: roundMoney(item.unitPrice * item.quantity - item.discountAmount * item.quantity + (lineTax?.total_tax ?? 0)),
    }
  })

  // Purchase limits
  const limitItems: PurchaseLimitItem[] = finalItems.map((i) => ({
    product_id: i.productId,
    purchase_limit_category: (i.purchaseLimitCategory ?? 'non_cannabis') as PurchaseLimitItem['purchase_limit_category'],
    quantity: i.quantity,
    weight_grams: i.weightGrams ?? 0,
    thc_mg: i.thcMg,
    is_medical: customerType === 'medical',
  }))

  const purchaseLimitResult = checkPurchaseLimit(limitItems, purchaseLimits, customerType)

  const total = roundMoney(subtotal - discountTotal + taxTotal)

  return {
    items: finalItems,
    subtotal,
    discountTotal,
    taxTotal,
    total,
    taxBreakdown,
    discountResult,
    purchaseLimit: purchaseLimitResult,
  }
}

function findTaxCategoryId(rates: TaxRateConfig[], isCannabis: boolean): string | null {
  // Find a rate that matches and return its tax_category_id
  const rate = rates.find((r) => r.tax_category_id !== null && r.is_excise === isCannabis)
  return rate?.tax_category_id ?? null
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCart = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: 'Walk-in Customer',
  customerType: 'recreational',
  customerGroupIds: [],
  segmentIds: [],
  isFirstTimeCustomer: false,

  subtotal: 0,
  discountTotal: 0,
  taxTotal: 0,
  total: 0,
  taxBreakdown: null,
  discountResult: null,
  purchaseLimit: null,

  locationId: '',
  organizationId: '',
  employeeId: '',
  registerId: '',

  taxRates: [],
  activeDiscounts: [],
  purchaseLimits: [],
  configLoaded: false,
  manualDiscountIds: [],
  heldCarts: [],

  initializeCart: async (ctx) => {
    set({
      locationId: ctx.locationId,
      organizationId: ctx.organizationId,
      employeeId: ctx.employeeId,
      registerId: ctx.registerId,
    })

    try {
      const res = await fetch(`/api/cart/config?location_id=${ctx.locationId}`)
      if (res.ok) {
        const data = await res.json()
        set({
          taxRates: data.taxRates ?? [],
          activeDiscounts: data.discounts ?? [],
          purchaseLimits: data.purchaseLimits ?? [],
          configLoaded: true,
        })
        set((state) => recalculate(state))
      } else {
        set({ configLoaded: true })
      }
    } catch {
      set({ configLoaded: true })
    }
  },

  addItem: (input) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === input.productId && i.inventoryItemId === input.inventoryItemId,
      )

      let newItems: CartItem[]
      if (existing) {
        newItems = state.items.map((i) =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + input.quantity }
            : i,
        )
      } else {
        newItems = [...state.items, {
          ...input,
          id: uuidv4(),
          discountAmount: 0,
          taxAmount: 0,
          lineTotal: roundMoney(input.unitPrice * input.quantity),
        }]
      }

      return recalculate({ ...state, items: newItems })
    })
  },

  removeItem: (cartLineId) => {
    set((state) => {
      const newItems = state.items.filter((i) => i.id !== cartLineId)
      return recalculate({ ...state, items: newItems })
    })
  },

  updateQuantity: (cartLineId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        const newItems = state.items.filter((i) => i.id !== cartLineId)
        return recalculate({ ...state, items: newItems })
      }
      const newItems = state.items.map((i) =>
        i.id === cartLineId ? { ...i, quantity } : i,
      )
      return recalculate({ ...state, items: newItems })
    })
  },

  setCustomer: (customer) => {
    set((state) => {
      const customerFields = {
        customerId: customer?.id ?? null,
        customerName: customer?.name ?? 'Walk-in Customer',
        customerType: (customer?.type ?? 'recreational') as 'recreational' | 'medical',
        customerGroupIds: customer?.groupIds ?? [],
        segmentIds: customer?.segmentIds ?? [],
        isFirstTimeCustomer: customer?.isFirstTime ?? false,
      }
      const updated = { ...state, ...customerFields }
      return { ...customerFields, ...recalculate(updated) }
    })
  },

  applyManualDiscount: (discountId) => {
    set((state) => {
      if (state.manualDiscountIds.includes(discountId)) return state
      const updated = { ...state, manualDiscountIds: [...state.manualDiscountIds, discountId] }
      return recalculate(updated)
    })
  },

  removeManualDiscount: (discountId) => {
    set((state) => {
      const updated = { ...state, manualDiscountIds: state.manualDiscountIds.filter((id) => id !== discountId) }
      return recalculate(updated)
    })
  },

  clearCart: () => {
    const state = get()
    set({
      items: [],
      customerId: null,
      customerName: 'Walk-in Customer',
      customerType: 'recreational',
      customerGroupIds: [],
      segmentIds: [],
      isFirstTimeCustomer: false,
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      total: 0,
      taxBreakdown: null,
      discountResult: null,
      purchaseLimit: null,
      manualDiscountIds: [],
      // Keep config
      taxRates: state.taxRates,
      activeDiscounts: state.activeDiscounts,
      purchaseLimits: state.purchaseLimits,
      configLoaded: state.configLoaded,
      locationId: state.locationId,
      organizationId: state.organizationId,
      employeeId: state.employeeId,
      registerId: state.registerId,
    })
  },

  holdCart: (employeeName: string) => {
    const state = get()
    if (state.items.length === 0) return
    if (state.heldCarts.length >= 10) return

    const held: HeldCart = {
      id: uuidv4(),
      heldAt: new Date().toISOString(),
      heldBy: employeeName,
      customerName: state.customerName !== 'Walk-in Customer' ? state.customerName : null,
      items: [...state.items],
      itemCount: state.items.reduce((s, i) => s + i.quantity, 0),
      total: state.total,
    }

    set((s) => ({ heldCarts: [...s.heldCarts, held] }))

    // Clear current cart (keep config)
    get().clearCart()
  },

  resumeCart: (heldCartId: string) => {
    const state = get()
    const held = state.heldCarts.find((h) => h.id === heldCartId)
    if (!held) return

    // Remove from held list
    set((s) => ({
      heldCarts: s.heldCarts.filter((h) => h.id !== heldCartId),
      items: held.items,
    }))

    // Recalculate with restored items
    set((s) => recalculate(s))
  },

  deleteHeldCart: (heldCartId: string) => {
    set((s) => ({ heldCarts: s.heldCarts.filter((h) => h.id !== heldCartId) }))
  },

  refreshConfig: async () => {
    const state = get()
    if (!state.locationId) return
    try {
      const res = await fetch(`/api/cart/config?location_id=${state.locationId}`)
      if (res.ok) {
        const data = await res.json()
        set((s) => recalculate({
          ...s,
          taxRates: data.taxRates ?? s.taxRates,
          activeDiscounts: data.discounts ?? s.activeDiscounts,
          purchaseLimits: data.purchaseLimits ?? s.purchaseLimits,
        }))
      }
    } catch {
      // Keep existing config on failure
    }
  },
}))
