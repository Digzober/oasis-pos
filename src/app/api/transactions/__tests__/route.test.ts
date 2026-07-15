import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { DEFAULT_SETTINGS } from '@/lib/settings/schema'
import { AppError } from '@/lib/utils/errors'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createSaleTransaction: vi.fn(),
  getEffectiveSettings: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/services/transactionService', () => ({
  createSaleTransaction: mocks.createSaleTransaction,
}))
vi.mock('@/lib/settings/service', () => ({
  getEffectiveSettings: mocks.getEffectiveSettings,
}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { POST } from '../route'

const locationId = '11111111-1111-4111-8111-111111111111'
const customerId = '22222222-2222-4222-8222-222222222222'
const registerId = '33333333-3333-4333-8333-333333333333'
const drawerId = '44444444-4444-4444-8444-444444444444'
const productId = '55555555-5555-4555-8555-555555555555'
const inventoryId = '66666666-6666-4666-8666-666666666666'
const session = {
  organizationId: 'org-1',
  locationId,
  employeeId: 'employee-1',
  role: 'budtender',
}

function request(customer_id: string | null) {
  return new NextRequest('http://localhost/api/transactions', {
    method: 'POST',
    body: JSON.stringify({
      location_id: locationId,
      register_id: registerId,
      cash_drawer_id: drawerId,
      customer_id,
      is_medical: false,
      items: [{ product_id: productId, inventory_item_id: inventoryId, quantity: 1 }],
      amount_tendered: 20,
      payment_method: 'cash',
      manual_discount_ids: [],
    }),
  })
}

function customerQuery(
  data: { id_type: string | null; id_number_hash: string | null } | null,
  error: { message: string } | null = null,
) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}

describe('transaction checkout settings gates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue(session)
    mocks.getEffectiveSettings.mockResolvedValue(DEFAULT_SETTINGS)
    mocks.createSaleTransaction.mockResolvedValue({ transactionNumber: 7 })
  })

  it('preserves authentication before loading effective settings', async () => {
    mocks.requireSession.mockRejectedValue(
      new AppError('UNAUTHORIZED', 'Authentication required', undefined, 401),
    )

    const response = await POST(request(null))

    expect(response.status).toBe(401)
    expect(mocks.getEffectiveSettings).not.toHaveBeenCalled()
  })

  it('rejects an anonymous checkout when checkout.require_customer is effective', async () => {
    mocks.getEffectiveSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      checkout: { ...DEFAULT_SETTINGS.checkout, require_customer: true },
    })

    const response = await POST(request(null))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe('CUSTOMER_REQUIRED')
    expect(mocks.getEffectiveSettings).toHaveBeenCalledWith(locationId)
    expect(mocks.createSaleTransaction).not.toHaveBeenCalled()
  })

  it('keeps anonymous checkout available when both effective gates are disabled', async () => {
    const response = await POST(request(null))

    expect(response.status).toBe(201)
    expect(mocks.createSaleTransaction).toHaveBeenCalledOnce()
  })

  it('rejects a selected customer without verified ID when compliance.require_id_scan is effective', async () => {
    mocks.getEffectiveSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      compliance: { require_id_scan: true },
    })
    const query = customerQuery({ id_type: 'drivers_license', id_number_hash: null })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    const response = await POST(request(customerId))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.code).toBe('VERIFIED_ID_REQUIRED')
    expect(query.eq).toHaveBeenCalledWith('id', customerId)
    expect(query.eq).toHaveBeenCalledWith('organization_id', session.organizationId)
    expect(mocks.createSaleTransaction).not.toHaveBeenCalled()
  })

  it('accepts a selected customer with verified ID when compliance.require_id_scan is effective', async () => {
    mocks.getEffectiveSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      compliance: { require_id_scan: true },
    })
    const query = customerQuery({ id_type: 'state_id', id_number_hash: 'sha256-value' })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    const response = await POST(request(customerId))

    expect(response.status).toBe(201)
    expect(mocks.createSaleTransaction).toHaveBeenCalledOnce()
  })

  it('does not expose database errors when the verified ID lookup fails', async () => {
    mocks.getEffectiveSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      compliance: { require_id_scan: true },
    })
    const query = customerQuery(null, { message: 'internal customers table detail' })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    const response = await POST(request(customerId))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({
      error: 'Unable to verify customer ID',
      code: 'CUSTOMER_ID_CHECK_FAILED',
    })
  })
})
