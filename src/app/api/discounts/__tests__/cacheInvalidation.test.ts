import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  assertOrgOwnership: vi.fn(),
  createDiscount: vi.fn(),
  updateDiscount: vi.fn(),
  deactivateDiscount: vi.fn(),
  duplicateDiscount: vi.fn(),
  clearDiscountCache: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/auth/ownership', () => ({ assertOrgOwnership: mocks.assertOrgOwnership }))
vi.mock('@/lib/services/discountManagementService', () => ({
  listDiscounts: vi.fn(),
  getDiscountForEdit: vi.fn(),
  createDiscount: mocks.createDiscount,
  updateDiscount: mocks.updateDiscount,
  deactivateDiscount: mocks.deactivateDiscount,
  duplicateDiscount: mocks.duplicateDiscount,
}))
vi.mock('@/lib/calculations/discountLoader', () => ({
  clearDiscountCache: mocks.clearDiscountCache,
}))

import { POST as create } from '../route'
import { DELETE as deactivate, PATCH as update } from '../[id]/route'
import { POST as duplicate } from '../[id]/duplicate/route'

const context = { params: Promise.resolve({ id: 'discount-1' }) }

describe('discount mutation cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue({ organizationId: 'org-1' })
    mocks.assertOrgOwnership.mockResolvedValue(true)
    mocks.createDiscount.mockResolvedValue({ id: 'discount-1' })
    mocks.updateDiscount.mockResolvedValue({ id: 'discount-1' })
    mocks.deactivateDiscount.mockResolvedValue(undefined)
    mocks.duplicateDiscount.mockResolvedValue({ id: 'discount-2' })
  })

  it.each([
    ['create', () => create(new NextRequest('http://localhost/api/discounts', {
      method: 'POST', body: JSON.stringify({ discount: {}, constraints: [], rewards: [] }),
    }))],
    ['update', () => update(new NextRequest('http://localhost/api/discounts/discount-1', {
      method: 'PATCH', body: JSON.stringify({ discount: { name: 'Updated' } }),
    }), context)],
    ['deactivate', () => deactivate(new NextRequest('http://localhost/api/discounts/discount-1', {
      method: 'DELETE',
    }), context)],
    ['duplicate', () => duplicate(new NextRequest('http://localhost/api/discounts/discount-1/duplicate', {
      method: 'POST',
    }), context)],
  ])('clears the loader cache after %s', async (_name, mutate) => {
    const response = await mutate()
    expect(response.status).toBeLessThan(300)
    expect(mocks.clearDiscountCache).toHaveBeenCalledOnce()
  })
})
