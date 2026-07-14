import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  jwtVerify: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('jose', () => ({
  jwtVerify: mocks.jwtVerify,
  SignJWT: class {
    setProtectedHeader() { return this }
    setExpirationTime() { return this }
    sign() { return Promise.resolve('token') }
  },
}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { requireSession, type SessionPayload } from '../session'

const baseSession: SessionPayload = {
  employeeId: 'employee-1',
  organizationId: 'org-1',
  locationId: 'location-home',
  locationName: 'Home',
  employeeName: 'Test Employee',
  role: 'manager',
  permissions: [],
  registerId: 'register-1',
  registerName: 'Register 1',
  exp: 2_000_000_000,
}

function cookieStore(values: Record<string, string>) {
  return {
    get: vi.fn((name: string) => values[name] ? { value: values[name] } : undefined),
  }
}

function queryResult(data: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}

describe('requireSession location override authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SESSION_SECRET = 'test-secret'
    mocks.jwtVerify.mockResolvedValue({ payload: baseSession })
  })

  it('rejects a foreign-organization location override', async () => {
    mocks.cookies.mockResolvedValue(cookieStore({
      'oasis-session': 'valid-token',
      'oasis-location-id': 'foreign-location',
      'oasis-location-name': 'Spoofed Foreign Name',
    }))
    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn(() => queryResult(null)),
    })

    await expect(requireSession()).resolves.toMatchObject({
      locationId: 'location-home',
      locationName: 'Home',
    })
  })

  it('uses the database location name for an assigned manager override', async () => {
    mocks.cookies.mockResolvedValue(cookieStore({
      'oasis-session': 'valid-token',
      'oasis-location-id': 'location-assigned',
      'oasis-location-name': 'Spoofed Name',
    }))

    const from = vi.fn((table: string) => queryResult(
      table === 'locations'
        ? { id: 'location-assigned', name: 'Assigned Store' }
        : { location_id: 'location-assigned' },
    ))
    mocks.createSupabaseServerClient.mockResolvedValue({ from })

    await expect(requireSession()).resolves.toMatchObject({
      locationId: 'location-assigned',
      locationName: 'Assigned Store',
    })
  })
})
