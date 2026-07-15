// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/registers/configure/guestlist',
}))

import GuestlistStatusPage from '../page'

const pickupStatusId = '00000000-0000-4000-8000-000000000001'

describe('guestlist workflow mapping controls', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('writes only changed mappings to the typed workflow endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/guestlist-statuses')) {
        return Response.json({ statuses: [{
          id: pickupStatusId,
          name: 'Pickup Waiting',
          color: '#10b981',
          sort_order: 0,
        }] })
      }
      if (!init?.method && url.endsWith('/guestlist-workflow-mappings')) {
        return Response.json({ mappings: { default: null, online_pickup: null } })
      }
      return Response.json({ mappings: { online_pickup: pickupStatusId } })
    })

    render(<GuestlistStatusPage />)
    fireEvent.change(await screen.findByLabelText('Online Pickup'), {
      target: { value: pickupStatusId },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Mappings' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/registers/configure/guestlist-workflow-mappings',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ online_pickup: pickupStatusId }),
      }),
    ))
  })

  it('shows a mapping write failure instead of reporting success', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/guestlist-statuses')) return Response.json({ statuses: [{
        id: pickupStatusId,
        name: 'Pickup Waiting',
        color: '#10b981',
        sort_order: 0,
      }] })
      if (!init?.method) return Response.json({ mappings: { default: null } })
      return Response.json({ error: 'mapping write failed' }, { status: 500 })
    })

    render(<GuestlistStatusPage />)
    fireEvent.change(await screen.findByLabelText('Default Status'), {
      target: { value: pickupStatusId },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Mappings' }))

    expect(await screen.findByText('mapping write failed')).toBeInTheDocument()
  })
})
