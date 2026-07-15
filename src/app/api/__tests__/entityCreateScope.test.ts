import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  requireAccessibleLocation: vi.fn(),
  createRoom: vi.fn(),
  createRegister: vi.fn(),
  createFeeDonation: vi.fn(),
  createTaxRate: vi.fn(),
  clearTaxRateCache: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/settings/access', () => ({
  requireAccessibleLocation: mocks.requireAccessibleLocation,
}))
vi.mock('@/lib/services/settingsService', () => ({
  listRooms: vi.fn(),
  createRoom: mocks.createRoom,
  createSubroom: vi.fn(),
  listRegisters: vi.fn(),
  createRegister: mocks.createRegister,
  listFeesDonations: vi.fn(),
  createFeeDonation: mocks.createFeeDonation,
  updateFeeDonation: vi.fn(),
  listTaxRates: vi.fn(),
  createTaxRate: mocks.createTaxRate,
}))
vi.mock('@/lib/calculations/taxRateLoader', () => ({
  clearTaxRateCache: mocks.clearTaxRateCache,
}))

import { POST as createRoom } from '@/app/api/rooms/route'
import { POST as createRegister } from '@/app/api/registers/route'
import { POST as createFee } from '@/app/api/fees-donations/route'
import { POST as createTax } from '@/app/api/tax-rates/route'

const session = {
  employeeId: 'employee-1',
  organizationId: 'org-1',
  locationId: 'location-1',
  role: 'admin',
}

function request(path: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('location-scoped entity creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue(session)
    mocks.requireAccessibleLocation.mockResolvedValue({ id: 'location-1' })
    mocks.createRoom.mockResolvedValue({ id: 'room-1' })
    mocks.createRegister.mockResolvedValue({ id: 'register-1' })
    mocks.createFeeDonation.mockResolvedValue({ id: 'fee-1' })
    mocks.createTaxRate.mockResolvedValue({ id: 'tax-1' })
  })

  it.each([
    ['room', '/api/rooms', createRoom, mocks.createRoom, { name: 'Vault' }],
    ['register', '/api/registers', createRegister, mocks.createRegister, { name: 'Front' }],
    ['fee', '/api/fees-donations', createFee, mocks.createFeeDonation, { name: 'Bag fee' }],
    ['tax', '/api/tax-rates', createTax, mocks.createTaxRate, { name: 'GRT', rate_percent: 7 }],
  ])('sets the session location when creating a %s', async (_name, path, handler, service, body) => {
    const response = await handler(request(path, body))

    expect(response.status).toBe(201)
    expect(mocks.requireAccessibleLocation).toHaveBeenCalledWith(session, 'location-1')
    expect(service).toHaveBeenCalledWith({ ...body, location_id: 'location-1' })
  })

  it('uses an explicitly requested accessible location', async () => {
    mocks.requireAccessibleLocation.mockResolvedValue({ id: 'location-2' })

    await createRoom(request('/api/rooms', { name: 'Vault', location_id: 'location-2' }))

    expect(mocks.requireAccessibleLocation).toHaveBeenCalledWith(session, 'location-2')
    expect(mocks.createRoom).toHaveBeenCalledWith({ name: 'Vault', location_id: 'location-2' })
  })
})
