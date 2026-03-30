import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface CartItem {
  id: string
  productId: string
  inventoryItemId: string | null
  productName: string
  categoryName: string | null
  brandName: string | null
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
  biotrackBarcode: string | null
}

interface CartState {
  items: CartItem[]
  customerId: string | null
  customerName: string
  isMedical: boolean
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  addItem: (item: Omit<CartItem, 'id' | 'discountAmount' | 'taxAmount' | 'lineTotal'>) => void
  removeItem: (cartLineId: string) => void
  updateQuantity: (cartLineId: string, quantity: number) => void
  setCustomer: (customerId: string | null, name: string, isMedical: boolean) => void
  clearCart: () => void
}

function recalculate(items: CartItem[]) {
  let subtotal = 0
  let discountTotal = 0
  let taxTotal = 0
  for (const item of items) {
    subtotal += item.unitPrice * item.quantity
    discountTotal += item.discountAmount
    taxTotal += item.taxAmount
  }
  const total = Math.round((subtotal - discountTotal + taxTotal) * 100) / 100
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    total,
  }
}

export const useCart = create<CartState>((set) => ({
  items: [],
  customerId: null,
  customerName: 'Walk-in Customer',
  isMedical: false,
  subtotal: 0,
  discountTotal: 0,
  taxTotal: 0,
  total: 0,

  addItem: (input) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === input.productId && i.inventoryItemId === input.inventoryItemId,
      )
      let items: CartItem[]
      if (existing) {
        items = state.items.map((i) =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + input.quantity, lineTotal: (i.quantity + input.quantity) * i.unitPrice }
            : i,
        )
      } else {
        const newItem: CartItem = {
          ...input,
          id: uuidv4(),
          discountAmount: 0,
          taxAmount: 0,
          lineTotal: input.unitPrice * input.quantity,
        }
        items = [...state.items, newItem]
      }
      return { items, ...recalculate(items) }
    })
  },

  removeItem: (cartLineId) => {
    set((state) => {
      const items = state.items.filter((i) => i.id !== cartLineId)
      return { items, ...recalculate(items) }
    })
  },

  updateQuantity: (cartLineId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        const items = state.items.filter((i) => i.id !== cartLineId)
        return { items, ...recalculate(items) }
      }
      const items = state.items.map((i) =>
        i.id === cartLineId ? { ...i, quantity, lineTotal: i.unitPrice * quantity } : i,
      )
      return { items, ...recalculate(items) }
    })
  },

  setCustomer: (customerId, name, isMedical) => {
    set({ customerId, customerName: name, isMedical })
  },

  clearCart: () => {
    set({
      items: [],
      customerId: null,
      customerName: 'Walk-in Customer',
      isMedical: false,
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      total: 0,
    })
  },
}))
