import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getMappings: vi.fn(),
  patchMappings: vi.fn(),
  requireSession: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/guestlist/workflowMappings', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/guestlist/workflowMappings')>()
  return {
    ...original,
    getGuestlistWorkflowMappings: mocks.getMappings,
    patchGuestlistWorkflowMappings: mocks.patchMappings,
  }
})
vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET, PATCH } from '../route'

describe('guestlist workflow mappings route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue({ locationId: 'location-1' })
    mocks.getMappings.mockResolvedValue({ default: 'status-default' })
    mocks.patchMappings.mockResolvedValue({ online_pickup: 'status-pickup' })
  })

  it('returns mappings for the authenticated employee location', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ mappings: { default: 'status-default' } })
    expect(mocks.getMappings).toHaveBeenCalledWith('location-1')
  })

  it('accepts only approved key-level mapping patches', async () => {
    const request = new Request('http://localhost/api/registers/configure/guestlist-workflow-mappings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online_pickup: '00000000-0000-4000-8000-000000000001' }),
    })

    const response = await PATCH(request as never)

    expect(response.status).toBe(200)
    expect(mocks.patchMappings).toHaveBeenCalledWith('location-1', {
      online_pickup: '00000000-0000-4000-8000-000000000001',
    })
  })

  it('rejects unknown mapping keys without writing', async () => {
    const request = new Request('http://localhost/api/registers/configure/guestlist-workflow-mappings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ made_up: null }),
    })

    const response = await PATCH(request as never)

    expect(response.status).toBe(400)
    expect(mocks.patchMappings).not.toHaveBeenCalled()
  })

  it('surfaces database write failures', async () => {
    mocks.patchMappings.mockRejectedValue(new Error('mapping write failed'))
    const request = new Request('http://localhost/api/registers/configure/guestlist-workflow-mappings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default: null }),
    })

    const response = await PATCH(request as never)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Server error' })
  })
})
