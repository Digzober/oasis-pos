import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { loadLoyaltyAccrualRate } from '../transactionService'

interface LoyaltyRow {
  organization_id: string
  is_active: boolean
  accrual_rate: number
}

function loyaltyQuery(rows: LoyaltyRow[]) {
  const filters = new Map<string, unknown>()
  const query = {
    select: vi.fn(),
    eq: vi.fn((column: string, value: unknown) => {
      filters.set(column, value)
      return query
    }),
    limit: vi.fn(),
    maybeSingle: vi.fn(async () => ({
      data: rows.find((row) =>
        [...filters].every(([key, value]) => row[key as keyof LoyaltyRow] === value),
      ) ?? null,
      error: null,
    })),
  }
  query.select.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  return query
}

describe('loyalty accrual organization scope', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not use another organization\'s active loyalty configuration', async () => {
    const query = loyaltyQuery([
      { organization_id: 'org-a', is_active: true, accrual_rate: 3 },
    ])
    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    })

    await expect(loadLoyaltyAccrualRate('org-b')).resolves.toBeNull()
    expect(query.eq).toHaveBeenCalledWith('organization_id', 'org-b')
  })
})
