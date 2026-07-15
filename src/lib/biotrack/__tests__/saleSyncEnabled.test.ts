import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getBioTrackClientForLocation: vi.fn(),
  isBioTrackEnabled: vi.fn(),
  loadBioTrackConfig: vi.fn(),
  call: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('../client', () => ({
  getBioTrackClientForLocation: mocks.getBioTrackClientForLocation,
}))
vi.mock('../configLoader', () => ({
  isBioTrackEnabled: mocks.isBioTrackEnabled,
  loadBioTrackConfig: mocks.loadBioTrackConfig,
}))

import { syncRefundToBioTrack, syncSaleToBioTrack, syncVoidToBioTrack } from '../saleSync'

function mockTransactions(...results: Array<{ data: Record<string, unknown> | null; error?: unknown }>) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.update.mockReturnValue(query)
  query.single.mockImplementation(async () => results.shift())
  mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) })
}

function saleTransaction() {
  return {
    id: 'tx-sale',
    location_id: 'loc-disabled',
    created_at: '2026-07-14T12:00:00Z',
    is_medical: false,
    total: 30,
    tax_amount: 5,
    transaction_lines: [{
      biotrack_barcode: '0123456789012345',
      quantity: 1,
      unit_price: 30,
      discount_amount: 0,
      line_total: 30,
    }],
  }
}

describe('BioTrack sale, void, and return enablement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getBioTrackClientForLocation.mockResolvedValue({ call: mocks.call })
    mocks.loadBioTrackConfig.mockResolvedValue({ licenseNumber: 'stored-license' })
    mocks.call.mockResolvedValue({ success: true, data: { sale_id: 'sale-1' }, error: null })
  })

  it('skips sale sync when the location explicitly disables BioTrack', async () => {
    mockTransactions({ data: saleTransaction(), error: null })
    mocks.isBioTrackEnabled.mockResolvedValue(false)

    await syncSaleToBioTrack('tx-sale')

    expect(mocks.isBioTrackEnabled).toHaveBeenCalledWith('loc-disabled')
    expect(mocks.getBioTrackClientForLocation).not.toHaveBeenCalled()
  })

  it('continues sale sync when enablement defaults on', async () => {
    mockTransactions({ data: saleTransaction(), error: null })
    mocks.isBioTrackEnabled.mockResolvedValue(true)

    await syncSaleToBioTrack('tx-sale')

    expect(mocks.getBioTrackClientForLocation).toHaveBeenCalledWith('loc-disabled')
    expect(mocks.call).toHaveBeenCalledWith(
      'sales/dispense',
      expect.objectContaining({ license_number: 'stored-license' }),
      expect.objectContaining({ locationId: 'loc-disabled' }),
    )
  })

  it('skips void sync when the location explicitly disables BioTrack', async () => {
    mockTransactions({
      data: {
        id: 'tx-void',
        location_id: 'loc-disabled',
        biotrack_transaction_id: 'sale-1',
        void_reason: 'Customer request',
      },
    })
    mocks.isBioTrackEnabled.mockResolvedValue(false)

    await syncVoidToBioTrack('tx-void')

    expect(mocks.isBioTrackEnabled).toHaveBeenCalledWith('loc-disabled')
    expect(mocks.getBioTrackClientForLocation).not.toHaveBeenCalled()
  })

  it('skips return sync when the location explicitly disables BioTrack', async () => {
    mockTransactions({
      data: { location_id: 'loc-disabled', biotrack_transaction_id: 'sale-1' },
    }, {
      data: {
        id: 'tx-return',
        notes: 'Customer return',
        transaction_lines: [{
          biotrack_barcode: '0123456789012345',
          quantity: 1,
          line_total: -30,
        }],
      },
    })
    mocks.isBioTrackEnabled.mockResolvedValue(false)

    await syncRefundToBioTrack('tx-return', 'tx-original')

    expect(mocks.isBioTrackEnabled).toHaveBeenCalledWith('loc-disabled')
    expect(mocks.getBioTrackClientForLocation).not.toHaveBeenCalled()
  })
})
