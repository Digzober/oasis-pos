import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getBioTrackClientForLocation: vi.fn(),
  isBioTrackEnabled: vi.fn(),
  call: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('../client', () => ({
  getBioTrackClientForLocation: mocks.getBioTrackClientForLocation,
}))
vi.mock('../configLoader', () => ({ isBioTrackEnabled: mocks.isBioTrackEnabled }))

import { processBioTrackRetryQueue } from '../retryQueue'

function mockRetryQueue(locationId = 'loc-1') {
  const entry = {
    id: 'log-1',
    location_id: locationId,
    status: 'failed',
    retry_count: 0,
    request_payload: { transaction_id: 'tx-1' },
    biotrack_endpoint: 'sales/dispense',
    entity_type: 'transaction_void',
    entity_id: 'tx-1',
  }
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    lt: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: [entry], error: null }),
    update: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.lt.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.update.mockReturnValue(query)
  mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) })
  return query
}

describe('BioTrack retry queue enablement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getBioTrackClientForLocation.mockResolvedValue({ call: mocks.call })
    mocks.call.mockResolvedValue({ success: true, data: {}, error: null })
  })

  it('leaves a queued retry untouched when the location explicitly disables BioTrack', async () => {
    const query = mockRetryQueue('loc-disabled')
    mocks.isBioTrackEnabled.mockResolvedValue(false)

    const result = await processBioTrackRetryQueue()

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 0 })
    expect(mocks.isBioTrackEnabled).toHaveBeenCalledWith('loc-disabled')
    expect(mocks.getBioTrackClientForLocation).not.toHaveBeenCalled()
    expect(query.update).not.toHaveBeenCalled()
  })

  it('processes a queued retry when enablement defaults on', async () => {
    mockRetryQueue('loc-unconfigured')
    mocks.isBioTrackEnabled.mockResolvedValue(true)

    const result = await processBioTrackRetryQueue()

    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0 })
    expect(mocks.getBioTrackClientForLocation).toHaveBeenCalledWith('loc-unconfigured')
    expect(mocks.call).toHaveBeenCalledWith('sales/dispense', { transaction_id: 'tx-1' })
  })
})
