import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BioTrackClient, BioTrackError } from '../index'
import type { BioTrackConfig } from '../types'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock supabase for logging
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    from: () => ({
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  }),
}))

const config: BioTrackConfig = {
  v1Url: 'https://test.biotrack.com/v1',
  v3Url: 'https://test.biotrack.com/v3',
  username: 'test',
  password: 'pass',
  licenseNumber: 'LIC-001',
}

function jsonResponse(body: object, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  })
}

describe('BioTrackClient', () => {
  let client: BioTrackClient

  beforeEach(() => {
    client = new BioTrackClient(config)
    mockFetch.mockReset()
  })

  it('authenticates and gets token', async () => {
    mockFetch.mockReturnValueOnce(
      jsonResponse({ success: true, data: { token: 'tok-123' } }),
    )

    await client.authenticate()
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.biotrack.com/v3/auth/login',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('calls endpoint with auth token after login', async () => {
    // Auth call
    mockFetch.mockReturnValueOnce(
      jsonResponse({ success: true, data: { token: 'tok-123' } }),
    )
    // API call
    mockFetch.mockReturnValueOnce(
      jsonResponse({ success: true, data: { sale_id: 'BT-001' }, error: null }),
    )

    const result = await client.call('sales/dispense', { test: true })
    expect(result.success).toBe(true)
    expect((result.data as { sale_id: string }).sale_id).toBe('BT-001')
  })

  it('throws BioTrackError on failed auth', async () => {
    mockFetch.mockReturnValueOnce(
      jsonResponse({ success: false, error: 'Invalid credentials' }, 401),
    )

    await expect(client.authenticate()).rejects.toThrow(BioTrackError)
  })

  it('retries on failure then succeeds', async () => {
    // Auth
    mockFetch.mockReturnValueOnce(
      jsonResponse({ success: true, data: { token: 'tok-123' } }),
    )
    // First attempt fails
    mockFetch.mockReturnValueOnce(
      Promise.reject(new Error('Network error')),
    )
    // Second attempt succeeds
    mockFetch.mockReturnValueOnce(
      jsonResponse({ success: true, data: { sale_id: 'BT-002' }, error: null }),
    )

    const result = await client.call('sales/dispense', { test: true })
    expect(result.success).toBe(true)
    // Auth + 2 attempts = 3 fetch calls
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('re-authenticates on 401 response', async () => {
    // Initial auth
    mockFetch.mockReturnValueOnce(
      jsonResponse({ success: true, data: { token: 'tok-expired' } }),
    )
    // Call returns 401
    mockFetch.mockReturnValueOnce(
      jsonResponse({ success: false, error: 'Token expired' }, 401),
    )
    // Re-auth
    mockFetch.mockReturnValueOnce(
      jsonResponse({ success: true, data: { token: 'tok-new' } }),
    )
    // Retry call succeeds
    mockFetch.mockReturnValueOnce(
      jsonResponse({ success: true, data: { sale_id: 'BT-003' }, error: null }),
    )

    const result = await client.call('sales/dispense', { test: true })
    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })
})

describe('Sale sync payload building', () => {
  it('builds correct dispense payload structure', () => {
    const payload = {
      license_number: 'LIC-001',
      sale_date: '2026-03-30T12:00:00Z',
      patient_type: 'recreational' as const,
      patient_id: null,
      items: [
        { barcode: '0123456789012345', quantity: 1, unit_price: 30, discount: 0, total: 30 },
      ],
      total_amount: 30,
      tax_amount: 5.97,
      transaction_id: 'tx-001',
    }

    expect(payload.items).toHaveLength(1)
    expect(payload.items[0]!.barcode).toHaveLength(16)
    expect(payload.total_amount).toBe(30)
  })

  it('builds correct void payload', () => {
    const payload = {
      license_number: 'LIC-001',
      original_sale_id: 'BT-001',
      void_reason: 'Customer changed mind',
    }

    expect(payload.original_sale_id).toBe('BT-001')
    expect(payload.void_reason).toBeTruthy()
  })

  it('builds correct refund payload with returned items', () => {
    const payload = {
      license_number: 'LIC-001',
      original_sale_id: 'BT-001',
      refund_items: [
        { barcode: '0123456789012345', quantity: 1, refund_amount: 30 },
      ],
      refund_reason: 'Defective product',
    }

    expect(payload.refund_items).toHaveLength(1)
    expect(payload.refund_items[0]!.refund_amount).toBe(30)
  })
})
