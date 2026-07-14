import { describe, expect, it, vi } from 'vitest'
import { acquireSyncLease } from '../syncLease'
import { SyncConflictError } from '../syncPolicy'

function thenableBuilder(result: unknown = { data: null, error: null }) {
  const builder = {
    update: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    eq: vi.fn(),
    lt: vi.fn(),
    then: (() => undefined) as unknown as Promise<unknown>['then'],
  }
  builder.update.mockReturnValue(builder)
  builder.insert.mockReturnValue(builder)
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.lt.mockReturnValue(builder)
  builder.single.mockResolvedValue(result)
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  return builder
}

describe('Dutchie database sync leases', () => {
  it('reaps a five-minute orphan before acquiring the replacement lease', async () => {
    const stale = thenableBuilder()
    const insert = thenableBuilder({ data: { id: 'lease-new' }, error: null })
    const from = vi.fn()
      .mockReturnValueOnce(stale)
      .mockReturnValueOnce(insert)

    const lease = await acquireSyncLease({ from } as never, {
      organizationId: 'org-1',
      locationId: 'loc-1',
      entityType: 'inventory',
      syncType: 'incremental',
      now: new Date('2026-07-14T12:05:00.000Z'),
    })

    expect(lease).toBe('lease-new')
    expect(stale.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
    expect(stale.lt).toHaveBeenCalledWith('heartbeat_at', '2026-07-14T12:00:00.000Z')
  })

  it('surfaces a location single-flight constraint collision as 409', async () => {
    const stale = thenableBuilder()
    const insert = thenableBuilder({
      data: null,
      error: { code: '23505', message: 'dutchie_sync_log_location_running_uniq' },
    })
    const from = vi.fn().mockReturnValueOnce(stale).mockReturnValueOnce(insert)

    await expect(acquireSyncLease({ from } as never, {
      organizationId: 'org-1',
      locationId: 'loc-1',
      entityType: 'inventory',
      syncType: 'incremental',
    })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('uses the organization scope for org-wide lock collisions', async () => {
    const stale = thenableBuilder()
    const insert = thenableBuilder({
      data: null,
      error: { code: '23505', message: 'dutchie_sync_log_org_running_uniq' },
    })
    const from = vi.fn().mockReturnValueOnce(stale).mockReturnValueOnce(insert)

    const promise = acquireSyncLease({ from } as never, {
      organizationId: 'org-1',
      locationId: 'designated-location',
      entityType: 'customers',
      syncType: 'incremental',
    })
    await expect(promise).rejects.toBeInstanceOf(SyncConflictError)
    expect(stale.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  })
})
