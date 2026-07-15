// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  useCart: vi.fn(),
  useSession: vi.fn(),
  useCashDrawer: vi.fn(),
}))

vi.mock('@/hooks/useCart', () => ({ useCart: mocks.useCart }))
vi.mock('@/hooks/useSession', () => ({ useSession: mocks.useSession }))
vi.mock('@/hooks/useCashDrawer', () => ({ useCashDrawer: mocks.useCashDrawer }))

import CartSidebar from '../CartSidebar'

const cartState = {
  items: [{
    id: 'line-1',
    productName: 'Blue Dream',
    quantity: 1,
    unitPrice: 15,
    discountAmount: 0,
  }],
  customerId: null as string | null,
  customerName: 'Walk-in Customer',
  customerType: 'recreational' as const,
  subtotal: 15,
  discountTotal: 0,
  taxTotal: 1,
  total: 16,
  locationId: '11111111-1111-4111-8111-111111111111',
  registerId: '33333333-3333-4333-8333-333333333333',
  manualDiscountIds: [],
  purchaseLimit: null,
  discountResult: null,
  heldCarts: [],
  removeItem: vi.fn(),
  updateQuantity: vi.fn(),
  clearCart: vi.fn(),
  holdCart: vi.fn(),
  resumeCart: vi.fn(),
  deleteHeldCart: vi.fn(),
  setCustomer: vi.fn(),
}

describe('terminal checkout settings gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cartState.customerId = null
    cartState.customerName = 'Walk-in Customer'
    mocks.useCart.mockImplementation((selector?: (state: typeof cartState) => unknown) => (
      selector ? selector(cartState) : cartState
    ))
    mocks.useSession.mockReturnValue({
      session: {
        locationId: cartState.locationId,
        registerId: cartState.registerId,
        employeeName: 'Bud Tender',
      },
    })
    mocks.useCashDrawer.mockReturnValue({
      drawer: { id: '44444444-4444-4444-8444-444444444444', status: 'open' },
      openDrawer: vi.fn(),
    })
  })

  it('keeps tender closed when the effective setting requires a customer', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'A customer is required for checkout', code: 'CUSTOMER_REQUIRED' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<CartSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'PAY' }))

    await waitFor(() => expect(screen.getByText('A customer is required for checkout')).toBeTruthy())
    expect(screen.queryByRole('heading', { name: 'Complete Sale' })).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith('/api/terminal/checkout-gate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ customer_id: null }),
    }))
  })

  it('keeps tender closed when the selected customer lacks verified ID', async () => {
    cartState.customerId = '22222222-2222-4222-8222-222222222222'
    cartState.customerName = 'Jane Customer'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Customer must have verified ID before checkout', code: 'VERIFIED_ID_REQUIRED' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<CartSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'PAY' }))

    await waitFor(() => expect(screen.getByText('Customer must have verified ID before checkout')).toBeTruthy())
    expect(screen.queryByRole('heading', { name: 'Complete Sale' })).toBeNull()
  })

  it('opens tender after the server gate allows checkout', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ allowed: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<CartSidebar />)
    fireEvent.click(screen.getByRole('button', { name: 'PAY' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Complete Sale' })).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledWith('/api/terminal/checkout-gate', expect.any(Object))
  })
})
