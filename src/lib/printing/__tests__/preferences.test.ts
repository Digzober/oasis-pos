import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getEffectiveSettings: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('@/lib/settings/service', () => ({
  getEffectiveSettings: mocks.getEffectiveSettings,
}))

import { getEffectivePrintPreferences } from '../preferences'

function registerQuery(data: unknown) {
  const query = {
    select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}

describe('effective print preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getEffectiveSettings.mockResolvedValue({
      printing: { auto_print_receipt_default: true, auto_print_label_default: false },
    })
  })

  it('uses nullable register values as explicit overrides', async () => {
    const query = registerQuery({ auto_print_receipts: false, auto_print_labels: true })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    await expect(getEffectivePrintPreferences('loc-1', 'reg-1')).resolves.toEqual({
      autoPrintReceipt: false,
      autoPrintLabels: true,
    })
  })

  it('inherits location defaults when register values are null', async () => {
    const query = registerQuery({ auto_print_receipts: null, auto_print_labels: null })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    await expect(getEffectivePrintPreferences('loc-1', 'reg-1')).resolves.toEqual({
      autoPrintReceipt: true,
      autoPrintLabels: false,
    })
  })

  it('inherits location defaults when a register row is unavailable', async () => {
    const query = registerQuery(null)
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    await expect(getEffectivePrintPreferences('loc-1', 'reg-1')).resolves.toEqual({
      autoPrintReceipt: true,
      autoPrintLabels: false,
    })
  })
})
