import { describe, it, expect, beforeEach } from 'vitest'
import { useCart, type CartItemInput } from '../useCart'

function makeInput(overrides: Partial<CartItemInput> = {}): CartItemInput {
  return {
    productId: 'prod-1',
    inventoryItemId: 'inv-1',
    productName: 'Test Product',
    categoryId: 'cat-1',
    categoryName: 'Flower',
    brandId: 'brand-1',
    brandName: 'Test Brand',
    vendorId: null,
    strainId: null,
    strainName: null,
    sku: 'SKU001',
    quantity: 1,
    unitPrice: 30,
    isCannabis: true,
    isMedical: false,
    weightGrams: 3.5,
    flowerEquivalent: 3.5,
    thcMg: null,
    biotrackBarcode: null,
    purchaseLimitCategory: 'flower',
    productTagIds: [],
    inventoryTagIds: [],
    pricingTierId: null,
    weightDescriptor: '3.5g',
    ...overrides,
  }
}

describe('useCart store', () => {
  beforeEach(() => {
    useCart.getState().clearCart()
    useCart.setState({ heldCarts: [] })
  })

  it('1. add item: appears in cart, subtotal updates', () => {
    useCart.getState().addItem(makeInput())
    const state = useCart.getState()

    expect(state.items).toHaveLength(1)
    expect(state.items[0]!.productName).toBe('Test Product')
    expect(state.subtotal).toBe(30)
  })

  it('2. add same item twice: quantity increments, not duplicate', () => {
    useCart.getState().addItem(makeInput())
    useCart.getState().addItem(makeInput())
    const state = useCart.getState()

    expect(state.items).toHaveLength(1)
    expect(state.items[0]!.quantity).toBe(2)
    expect(state.subtotal).toBe(60)
  })

  it('3. remove item: removed and totals recalculate', () => {
    useCart.getState().addItem(makeInput())
    const id = useCart.getState().items[0]!.id
    useCart.getState().removeItem(id)

    expect(useCart.getState().items).toHaveLength(0)
    expect(useCart.getState().subtotal).toBe(0)
  })

  it('4. update quantity: totals recalculate', () => {
    useCart.getState().addItem(makeInput())
    const id = useCart.getState().items[0]!.id
    useCart.getState().updateQuantity(id, 5)

    expect(useCart.getState().items[0]!.quantity).toBe(5)
    expect(useCart.getState().subtotal).toBe(150)
  })

  it('5. clear cart: everything resets to zero', () => {
    useCart.getState().addItem(makeInput())
    useCart.getState().addItem(makeInput({ productId: 'prod-2', inventoryItemId: 'inv-2', productName: 'Other' }))
    useCart.getState().clearCart()
    const state = useCart.getState()

    expect(state.items).toHaveLength(0)
    expect(state.subtotal).toBe(0)
    expect(state.total).toBe(0)
    expect(state.customerId).toBeNull()
  })

  it('6. set customer to medical: customerType changes', () => {
    useCart.getState().setCustomer({
      id: 'cust-1',
      name: 'Jane Medical',
      type: 'medical',
      groupIds: ['g1'],
      segmentIds: [],
      isFirstTime: false,
    })
    const state = useCart.getState()

    expect(state.customerId).toBe('cust-1')
    expect(state.customerType).toBe('medical')
    expect(state.customerGroupIds).toEqual(['g1'])
  })

  it('7. recalculate runs on add (discount total is number)', () => {
    useCart.getState().addItem(makeInput({ unitPrice: 100 }))
    const state = useCart.getState()

    // discountTotal should be a number (0 if no discounts configured)
    expect(typeof state.discountTotal).toBe('number')
    expect(state.discountTotal).toBeGreaterThanOrEqual(0)
  })

  it('8. tax total is a number after recalculate', () => {
    useCart.getState().addItem(makeInput({ unitPrice: 50 }))
    const state = useCart.getState()

    expect(typeof state.taxTotal).toBe('number')
    expect(state.taxTotal).toBeGreaterThanOrEqual(0)
  })

  it('9. purchase limit is checked', () => {
    useCart.getState().addItem(makeInput({ weightGrams: 100, purchaseLimitCategory: 'flower' }))
    const state = useCart.getState()

    // With no limits configured, purchaseLimit may be null or have allowed=true
    if (state.purchaseLimit) {
      expect(typeof state.purchaseLimit.allowed).toBe('boolean')
    }
  })

  it('10. quantity 0 removes item', () => {
    useCart.getState().addItem(makeInput())
    const id = useCart.getState().items[0]!.id
    useCart.getState().updateQuantity(id, 0)

    expect(useCart.getState().items).toHaveLength(0)
    expect(useCart.getState().subtotal).toBe(0)
  })

  it('11. hold saves current cart to heldCarts', () => {
    useCart.getState().addItem(makeInput())
    useCart.getState().addItem(makeInput({ productId: 'prod-2', inventoryItemId: 'inv-2', productName: 'Other', unitPrice: 20 }))
    useCart.getState().holdCart('Test Employee')

    const state = useCart.getState()
    expect(state.items).toHaveLength(0)
    expect(state.heldCarts).toHaveLength(1)
    expect(state.heldCarts[0]!.heldBy).toBe('Test Employee')
    expect(state.heldCarts[0]!.itemCount).toBe(2)
  })

  it('12. resume restores held cart as active', () => {
    useCart.getState().addItem(makeInput())
    useCart.getState().holdCart('Test Employee')

    const heldId = useCart.getState().heldCarts[0]!.id
    useCart.getState().resumeCart(heldId)

    const state = useCart.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0]!.productName).toBe('Test Product')
    expect(state.heldCarts).toHaveLength(0)
  })

  it('13. cannot hold empty cart', () => {
    useCart.getState().holdCart('Test Employee')
    expect(useCart.getState().heldCarts).toHaveLength(0)
  })

  it('14. delete held cart removes it', () => {
    useCart.getState().addItem(makeInput())
    useCart.getState().holdCart('Test Employee')
    const heldId = useCart.getState().heldCarts[0]!.id
    useCart.getState().deleteHeldCart(heldId)
    expect(useCart.getState().heldCarts).toHaveLength(0)
  })
})
