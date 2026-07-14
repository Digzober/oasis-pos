import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getLoyaltySnapshot: vi.fn(),
  loadDutchieConfig: vi.fn(),
  acquireSyncLease: vi.fn(),
  completeSyncLease: vi.fn(),
  heartbeatSyncLease: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('../configLoader', () => ({ loadDutchieConfig: mocks.loadDutchieConfig }))
vi.mock('../syncLease', () => ({
  acquireSyncLease: mocks.acquireSyncLease,
  completeSyncLease: mocks.completeSyncLease,
  heartbeatSyncLease: mocks.heartbeatSyncLease,
}))
vi.mock('../client', () => ({
  DutchieClient: class {
    getLoyaltySnapshot = mocks.getLoyaltySnapshot
  },
}))
vi.mock('@/lib/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

import { syncLoyalty } from '../loyaltySync'

const NOW = new Date('2026-07-14T12:00:00.000Z')

interface StagingRow {
  id: string
  organization_id: string
  run_id: string
  run_fingerprint: string
  dutchie_customer_id: number
  balance: number
  earned: number
  spent: number
  staging_complete: boolean
  applied_at: string | null
  created_at: string
}

type Filter = { column: string; operator: 'eq' | 'is' | 'lt' | 'gte' | 'not-is'; value: unknown }

function createSupabaseDouble(initialRows: StagingRow[]) {
  const stagingRows = [...initialRows]
  const deletes: Filter[][] = []
  let nextId = 1

  function matches(row: Record<string, unknown>, filters: Filter[]) {
    return filters.every(filter => {
      const value = row[filter.column]
      if (filter.operator === 'eq' || filter.operator === 'is') return value === filter.value
      if (filter.operator === 'lt') return String(value) < String(filter.value)
      if (filter.operator === 'gte') return String(value) >= String(filter.value)
      return value !== filter.value
    })
  }

  class Query {
    private operation: 'select' | 'delete' | 'insert' | 'update' = 'select'
    private filters: Filter[] = []
    private values: Record<string, unknown> | Array<Record<string, unknown>> | null = null
    private ascending = true
    private orderColumn: string | null = null

    constructor(private table: string) {}

    select() { this.operation = 'select'; return this }
    delete() { this.operation = 'delete'; return this }
    insert(values: Array<Record<string, unknown>>) { this.operation = 'insert'; this.values = values; return this }
    update(values: Record<string, unknown>) { this.operation = 'update'; this.values = values; return this }
    eq(column: string, value: unknown) { this.filters.push({ column, operator: 'eq', value }); return this }
    is(column: string, value: unknown) { this.filters.push({ column, operator: 'is', value }); return this }
    lt(column: string, value: unknown) { this.filters.push({ column, operator: 'lt', value }); return this }
    gte(column: string, value: unknown) { this.filters.push({ column, operator: 'gte', value }); return this }
    not(column: string, operator: string, value: unknown) {
      if (operator !== 'is') throw new Error(`Unsupported not operator: ${operator}`)
      this.filters.push({ column, operator: 'not-is', value })
      return this
    }
    order(column: string, options: { ascending: boolean }) {
      this.orderColumn = column
      this.ascending = options.ascending
      return this
    }
    limit() { return this }

    private execute() {
      if (this.table === 'dutchie_sync_state') {
        return { data: { is_enabled: true, last_synced_at: '2026-07-13T12:00:00.000Z' }, error: null }
      }
      if (this.table !== 'dutchie_loyalty_staging') return { data: null, error: null }

      if (this.operation === 'delete') {
        deletes.push([...this.filters])
        for (let index = stagingRows.length - 1; index >= 0; index--) {
          if (matches(stagingRows[index] as unknown as Record<string, unknown>, this.filters)) stagingRows.splice(index, 1)
        }
        return { data: null, error: null }
      }
      if (this.operation === 'insert') {
        for (const value of this.values as Array<Record<string, unknown>>) {
          stagingRows.push({
            ...value,
            id: `new-${nextId++}`,
            staging_complete: false,
            applied_at: null,
            created_at: NOW.toISOString(),
          } as unknown as StagingRow)
        }
        return { data: null, error: null }
      }
      if (this.operation === 'update') {
        for (const row of stagingRows) {
          if (matches(row as unknown as Record<string, unknown>, this.filters)) Object.assign(row, this.values)
        }
        return { data: null, error: null }
      }

      const rows = stagingRows.filter(row => matches(row as unknown as Record<string, unknown>, this.filters))
      if (this.orderColumn) {
        const direction = this.ascending ? 1 : -1
        rows.sort((a, b) => String(a[this.orderColumn as keyof StagingRow]).localeCompare(String(b[this.orderColumn as keyof StagingRow])) * direction)
      }
      return { data: rows, count: rows.length, error: null }
    }

    async maybeSingle() {
      const result = this.execute()
      const data = Array.isArray(result.data) ? result.data[0] ?? null : result.data
      return { ...result, data }
    }

    then<TResult1 = unknown, TResult2 = never>(
      onfulfilled?: ((value: ReturnType<Query['execute']>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
    }
  }

  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === 'count_dutchie_loyalty_matches') {
      const total = stagingRows.filter(row => row.run_id === args.p_run && row.applied_at === null).length
      return { data: [{ matched_count: total, total_count: total }], error: null }
    }
    if (name === 'apply_dutchie_loyalty_chunk') {
      const pending = stagingRows.find(row => row.run_id === args.p_run && row.applied_at === null)
      if (!pending) return { data: [{ processed: 0, journaled: 0, unmatched: 0 }], error: null }
      pending.applied_at = NOW.toISOString()
      return { data: [{ processed: 1, journaled: 1, unmatched: 0 }], error: null }
    }
    return { data: null, error: null }
  })

  return {
    client: { from: vi.fn((table: string) => new Query(table)), rpc },
    stagingRows,
    deletes,
  }
}

function stagingRow(runId: string, ageHours: number): StagingRow {
  return {
    id: `${runId}-1`,
    organization_id: 'org-1',
    run_id: runId,
    run_fingerprint: `${runId}-fingerprint`,
    dutchie_customer_id: 42,
    balance: 100,
    earned: 120,
    spent: 20,
    staging_complete: true,
    applied_at: null,
    created_at: new Date(NOW.getTime() - ageHours * 60 * 60 * 1000).toISOString(),
  }
}

describe('loyalty staging resume freshness', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    vi.clearAllMocks()
    mocks.loadDutchieConfig.mockResolvedValue({ isEnabled: true, apiKey: 'test-key', syncLoyalty: true })
    mocks.acquireSyncLease.mockResolvedValue('lease-1')
    mocks.completeSyncLease.mockResolvedValue(undefined)
    mocks.heartbeatSyncLease.mockResolvedValue(undefined)
    mocks.getLoyaltySnapshot.mockResolvedValue([
      { customerId: 42, loyaltyBalance: 125, loyaltyEarned: 150, loyaltySpent: 25 },
    ])
  })

  afterEach(() => vi.useRealTimers())

  it('resumes a recent complete-unapplied run without fetching another snapshot', async () => {
    const database = createSupabaseDouble([stagingRow('recent-run', 1)])
    mocks.createSupabaseServerClient.mockResolvedValue(database.client)

    const result = await syncLoyalty('location-1', 'org-1')

    expect(result.errors).toEqual([])
    expect(result.fetched).toBe(1)
    expect(mocks.getLoyaltySnapshot).not.toHaveBeenCalled()
  })

  it('purges a stale complete-unapplied run and fetches a fresh snapshot', async () => {
    const database = createSupabaseDouble([stagingRow('stale-run', 21)])
    mocks.createSupabaseServerClient.mockResolvedValue(database.client)

    const result = await syncLoyalty('location-1', 'org-1')

    expect(result.errors).toEqual([])
    expect(mocks.getLoyaltySnapshot).toHaveBeenCalledOnce()
    expect(database.stagingRows.some(row => row.run_id === 'stale-run')).toBe(false)
    expect(database.deletes).toContainEqual(expect.arrayContaining([
      { column: 'staging_complete', operator: 'eq', value: true },
      { column: 'applied_at', operator: 'is', value: null },
      { column: 'created_at', operator: 'lt', value: '2026-07-13T16:00:00.000Z' },
    ]))
  })
})
