// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnlineCart } from '@/stores/onlineCartStore'

import MenuPage from '../page'

describe('storefront menu online-ordering gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useOnlineCart.setState({ locationId: null, items: [] })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('does not render the menu when the current location disables online orders', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ allows_online_orders: false, location_id: 'loc-1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<MenuPage />)

    await waitFor(() => expect(screen.getByText(/not accepting online orders/i)).toBeTruthy())
    expect(screen.queryByPlaceholderText('Search products...')).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith('/api/orders?availability=true')
  })

  it('renders the menu and selects the current location when online orders are enabled', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      return {
        ok: true,
        json: async () => url.includes('availability=true')
          ? { allows_online_orders: true, location_id: 'loc-1' }
          : { categories: [] },
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<MenuPage />)

    await waitFor(() => expect(screen.getByPlaceholderText('Search products...')).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledWith('/api/categories')
    expect(useOnlineCart.getState().locationId).toBe('loc-1')
  })
})
