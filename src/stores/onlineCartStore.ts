import { create } from 'zustand'
import { roundMoney } from '@/lib/utils/money'

export interface OnlineCartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
}

interface OnlineCartState {
  items: OnlineCartItem[]
  locationId: string | null
  subtotal: number
  estimatedTax: number
  estimatedTotal: number
  setLocation: (locationId: string) => void
  addItem: (item: Omit<OnlineCartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clear: () => void
}

function recalc(items: OnlineCartItem[]) {
  const subtotal = items.reduce((s, i) => roundMoney(s + i.price * i.quantity), 0)
  const estimatedTax = roundMoney(subtotal * 0.21)
  return { subtotal, estimatedTax, estimatedTotal: roundMoney(subtotal + estimatedTax) }
}

export const useOnlineCart = create<OnlineCartState>((set) => ({
  items: [],
  locationId: null,
  subtotal: 0,
  estimatedTax: 0,
  estimatedTotal: 0,

  setLocation: (locationId) => set({ locationId }),

  addItem: (item) => set((state) => {
    const existing = state.items.find((i) => i.product_id === item.product_id)
    const items = existing
      ? state.items.map((i) => i.product_id === item.product_id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...state.items, { ...item, quantity: 1 }]
    return { items, ...recalc(items) }
  }),

  removeItem: (productId) => set((state) => {
    const items = state.items.filter((i) => i.product_id !== productId)
    return { items, ...recalc(items) }
  }),

  updateQuantity: (productId, quantity) => set((state) => {
    if (quantity <= 0) {
      const items = state.items.filter((i) => i.product_id !== productId)
      return { items, ...recalc(items) }
    }
    const items = state.items.map((i) => i.product_id === productId ? { ...i, quantity } : i)
    return { items, ...recalc(items) }
  }),

  clear: () => set({ items: [], subtotal: 0, estimatedTax: 0, estimatedTotal: 0 }),
}))
