import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  assertOrgOwnership: vi.fn(),
  createTaxRate: vi.fn(),
  updateTaxRate: vi.fn(),
  deactivateTaxRate: vi.fn(),
  clearTaxRateCache: vi.fn(),
  withAccessibleLocation: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/auth/ownership', () => ({ assertOrgOwnership: mocks.assertOrgOwnership }))
vi.mock('@/lib/services/settingsService', () => ({
  listTaxRates: vi.fn(),
  createTaxRate: mocks.createTaxRate,
  updateTaxRate: mocks.updateTaxRate,
  deactivateTaxRate: mocks.deactivateTaxRate,
}))
vi.mock('@/lib/calculations/taxRateLoader', () => ({
  clearTaxRateCache: mocks.clearTaxRateCache,
}))
vi.mock('@/lib/settings/entityScope', () => ({
  withAccessibleLocation: mocks.withAccessibleLocation,
}))

import { POST } from '../route'
import { DELETE, PATCH } from '../[id]/route'

const session = {
  organizationId: 'org-1',
  locationId: 'loc-1',
}

describe('tax mutation cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue(session)
    mocks.assertOrgOwnership.mockResolvedValue(true)
    mocks.createTaxRate.mockResolvedValue({ id: 'tax-1' })
    mocks.updateTaxRate.mockResolvedValue({ id: 'tax-1' })
    mocks.deactivateTaxRate.mockResolvedValue(undefined)
    mocks.withAccessibleLocation.mockImplementation(async (
      _session: unknown,
      input: Record<string, unknown>,
    ) => ({
      ...input,
      location_id: input.location_id ?? 'loc-1',
    }))
  })

  it('clears the tax cache after creating a tax rate', async () => {
    const request = new NextRequest('http://localhost/api/tax-rates', {
      method: 'POST',
      body: JSON.stringify({ location_id: 'loc-1', name: 'GRT', rate_percent: 7 }),
    })

    expect((await POST(request)).status).toBe(201)
    expect(mocks.clearTaxRateCache).toHaveBeenCalledOnce()
  })

  it('clears the tax cache after updating a tax rate', async () => {
    const request = new NextRequest('http://localhost/api/tax-rates/tax-1', {
      method: 'PATCH',
      body: JSON.stringify({ rate_percent: 8 }),
    })

    expect((await PATCH(request, { params: Promise.resolve({ id: 'tax-1' }) })).status).toBe(200)
    expect(mocks.clearTaxRateCache).toHaveBeenCalledOnce()
  })

  it('clears the tax cache after deactivating a tax rate', async () => {
    const request = new NextRequest('http://localhost/api/tax-rates/tax-1', {
      method: 'DELETE',
    })

    expect((await DELETE(request, { params: Promise.resolve({ id: 'tax-1' }) })).status).toBe(200)
    expect(mocks.clearTaxRateCache).toHaveBeenCalledOnce()
  })
})
