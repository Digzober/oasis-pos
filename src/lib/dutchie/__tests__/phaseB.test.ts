import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  computeLoyaltyFingerprint,
  normalizeLoyaltySnapshot,
  passesLoyaltyMatchGuard,
  runAfterLoyaltyMatchGuard,
} from '../loyaltySync'
import {
  ENTITY_ENABLED_KEY,
  ORG_WIDE_ENTITIES,
  checkpointAfterRun,
  incrementalSince,
  utcDayEndExclusive,
  utcDayStart,
} from '../syncPolicy'
import { upsertWithBisection } from '../batchIsolation'
import { buildCronWorkQueue } from '../cronRunner'

describe('Phase B Dutchie acceptance contracts', () => {
  it('preserves loyalty decimals, maps earned/spent, and never supplies enrolled_at', () => {
    const rows = normalizeLoyaltySnapshot([
      { customerId: 42, loyaltyBalance: 162.27, loyaltyEarned: 200.5, loyaltySpent: 38.23 },
    ])

    expect(rows).toEqual([{
      dutchieCustomerId: 42,
      balance: 162.27,
      earned: 200.5,
      spent: 38.23,
    }])
    expect(rows[0]).not.toHaveProperty('enrolled_at')
  })

  it('uses a canonically sorted, value-sensitive loyalty fingerprint', () => {
    const a = normalizeLoyaltySnapshot([
      { customerId: 2, loyaltyBalance: 20, loyaltyEarned: 25, loyaltySpent: 5 },
      { customerId: 1, loyaltyBalance: 10, loyaltyEarned: 10, loyaltySpent: 0 },
    ])
    const reordered = [a[1]!, a[0]!]
    const changed = [{ ...a[0]!, balance: 20.01 }, a[1]!]

    expect(computeLoyaltyFingerprint(a)).toBe(computeLoyaltyFingerprint(reordered))
    expect(computeLoyaltyFingerprint(a)).not.toBe(computeLoyaltyFingerprint(changed))
  })

  it('enforces the 30% match-rate guard before apply eligibility', () => {
    expect(passesLoyaltyMatchGuard(29, 100)).toBe(false)
    expect(passesLoyaltyMatchGuard(30, 100)).toBe(true)
    expect(passesLoyaltyMatchGuard(0, 0)).toBe(false)
  })

  it('performs zero balance application when the loyalty match guard fails', async () => {
    const apply = vi.fn()
    await expect(runAfterLoyaltyMatchGuard(2, 10, apply)).rejects.toThrow('match-rate guard')
    expect(apply).not.toHaveBeenCalled()
  })

  it('maps every entity to its own enable flag and correct scope', () => {
    expect(ENTITY_ENABLED_KEY).toMatchObject({
      employees: 'syncEmployees',
      customers: 'syncCustomers',
      products: 'syncProducts',
      inventory: 'syncInventory',
      registers: 'isEnabled',
      rooms: 'syncRooms',
      transactions: 'syncTransactions',
      loyalty: 'syncLoyalty',
    })
    expect(ORG_WIDE_ENTITIES).toEqual(new Set(['reference', 'customers', 'loyalty']))
  })

  it('advances checkpoints only on complete success, including zero-fetch success', () => {
    const prior = new Date('2026-01-01T00:00:00.000Z')
    const started = new Date('2026-01-02T00:00:00.000Z')

    expect(checkpointAfterRun(prior, started, { errored: 0, completed: true })).toEqual(started)
    expect(checkpointAfterRun(prior, started, { errored: 1, completed: true })).toEqual(prior)
    expect(checkpointAfterRun(prior, started, { errored: 0, completed: false })).toEqual(prior)
    expect(incrementalSince(started).toISOString()).toBe('2026-01-01T23:45:00.000Z')
    expect(utcDayStart(new Date('2026-01-02T12:34:56.000Z')).toISOString()).toBe('2026-01-02T00:00:00.000Z')
    expect(utcDayEndExclusive(new Date('2026-01-02T12:34:56.000Z')).toISOString()).toBe('2026-01-03T00:00:00.000Z')
  })

  it('isolates one poisoned record and persists the other 999', async () => {
    const rows = Array.from({ length: 1000 }, (_, id) => ({ id }))
    const persist = vi.fn(async (batch: Array<{ id: number }>) => {
      if (batch.some(row => row.id === 417)) throw new Error('poisoned 417')
    })

    const result = await upsertWithBisection(rows, persist, row => String(row.id))

    expect(result.persisted).toBe(999)
    expect(result.failed).toEqual([{ key: '417', error: 'poisoned 417' }])
  })

  it('creates one org-wide work item per org and location work per enabled location', () => {
    const queue = buildCronWorkQueue({
      now: new Date('2026-07-14T12:00:00.000Z'),
      locations: [
        { organizationId: 'org-a', locationId: 'loc-a1', enabled: true },
        { organizationId: 'org-a', locationId: 'loc-a2', enabled: true },
        { organizationId: 'org-b', locationId: 'loc-b1', enabled: true },
      ],
      states: [],
    })

    for (const entity of ['reference', 'customers', 'loyalty'] as const) {
      expect(queue.filter(item => item.entityType === entity)).toHaveLength(2)
    }
    expect(queue.filter(item => item.entityType === 'products')).toHaveLength(3)
  })

  it('skips virgin cron entities, rate-limits loyalty, but resumes pending staging', () => {
    const now = new Date('2026-07-14T12:00:00.000Z')
    const locations = [{ organizationId: 'org-a', locationId: 'loc-a', enabled: true }]
    const recentLoyalty = {
      organizationId: 'org-a',
      locationId: null,
      entityType: 'loyalty' as const,
      lastSyncedAt: '2026-07-14T08:00:00.000Z',
    }
    const virgin = buildCronWorkQueue({ now, locations, states: [recentLoyalty] })
    expect(virgin.find(item => item.entityType === 'products')?.skipReason).toBe('needs initial manual sync')
    expect(virgin.some(item => item.entityType === 'loyalty')).toBe(false)

    const pending = buildCronWorkQueue({
      now,
      locations,
      states: [recentLoyalty],
      pendingLoyaltyOrganizations: new Set(['org-a']),
    })
    expect(pending.some(item => item.entityType === 'loyalty')).toBe(true)
  })

  it('routes every non-SQL loyalty mutation through adjust_loyalty_points', () => {
    const files = [
      'src/lib/services/loyaltyAdjustmentService.ts',
      'src/lib/services/referralService.ts',
      'src/app/api/customers/[id]/loyalty/adjust/route.ts',
      'src/app/api/customers/duplicates/merge/route.ts',
    ]

    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8')
      expect(source, file).toContain("rpc('adjust_loyalty_points'")
      expect(source, file).not.toMatch(/from\(['"]loyalty_balances['"]\)[\s\S]{0,180}select\(['"][^'"]*current_points/)
    }
  })

  it('persists each transaction window cursor and configures four daily cron runs', () => {
    const engine = readFileSync(resolve(process.cwd(), 'src/lib/dutchie/syncEngine.ts'), 'utf8')
    expect(engine).toMatch(/while \(windowStart < rangeEnd\)[\s\S]*saveSyncCursor/)
    expect(engine).toContain('endExclusive: true')

    const vercel = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
      crons: Array<{ path: string; schedule: string }>
      functions: Record<string, { maxDuration: number }>
    }
    expect(vercel.crons.filter(cron => cron.path === '/api/dutchie/cron').map(cron => cron.schedule).sort())
      .toEqual(['0 12 * * *', '0 18 * * *', '0 23 * * *', '0 4 * * *'].sort())
    expect(vercel.functions['src/app/api/dutchie/**/*.ts']?.maxDuration).toBe(300)
  })

  it('resumes unapplied loyalty staging before making a new snapshot run', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/lib/dutchie/loyaltySync.ts'), 'utf8')
    const pendingLookup = source.indexOf(".from('dutchie_loyalty_staging')")
    const snapshotFetch = source.indexOf('.getLoyaltySnapshot()')
    expect(pendingLookup).toBeGreaterThan(-1)
    expect(snapshotFetch).toBeGreaterThan(pendingLookup)
    expect(source).toContain(".eq('run_fingerprint', fingerprint)")
    expect(source).toContain(".is('applied_at', null)")
  })
})
