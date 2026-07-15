import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { AppError } from '@/lib/utils/errors'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createZone: vi.fn(),
  saveDeliveryConfig: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/services/deliveryService', () => ({
  listZones: vi.fn(),
  createZone: mocks.createZone,
  getDeliveryConfig: vi.fn(),
  saveDeliveryConfig: mocks.saveDeliveryConfig,
}))

import { POST as createZone } from '../zones/route'
import { PUT as saveConfig } from '../config/route'

const session = { organizationId: 'org-1', locationId: 'location-1' }

function request(path: string, method: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    body: JSON.stringify(body),
  })
}

describe('organization-scoped delivery settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue(session)
    mocks.createZone.mockResolvedValue({ id: 'zone-1' })
    mocks.saveDeliveryConfig.mockResolvedValue({ organization_id: 'org-1' })
  })

  it('owns new delivery zones by the session organization', async () => {
    const response = await createZone(request('/api/delivery/zones', 'POST', {
      name: 'Metro',
      organization_id: 'attacker-org',
      delivery_fee: 5,
    }))

    expect(response.status).toBe(201)
    expect(mocks.createZone).toHaveBeenCalledWith({
      name: 'Metro',
      organization_id: 'org-1',
      delivery_fee: 5,
    })
  })

  it('saves schema-named delivery config fields', async () => {
    const response = await saveConfig(request('/api/delivery/config', 'PUT', {
      max_total_value: 500,
      max_total_weight_grams: 2000,
    }))

    expect(response.status).toBe(200)
    expect(mocks.saveDeliveryConfig).toHaveBeenCalledWith('org-1', {
      max_total_value: 500,
      max_total_weight_grams: 2000,
    })
  })

  it('surfaces delivery persistence failures', async () => {
    mocks.saveDeliveryConfig.mockRejectedValue(
      new AppError('UPDATE_FAILED', 'delivery config save failed', undefined, 500),
    )

    const response = await saveConfig(request('/api/delivery/config', 'PUT', {
      max_total_value: 500,
      max_total_weight_grams: null,
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'delivery config save failed' })
  })

  it('surfaces delivery-zone persistence failures', async () => {
    mocks.createZone.mockRejectedValue(
      new AppError('CREATE_FAILED', 'delivery zone save failed', undefined, 500),
    )

    const response = await createZone(request('/api/delivery/zones', 'POST', {
      name: 'Metro',
      delivery_fee: 5,
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'delivery zone save failed' })
  })
})
