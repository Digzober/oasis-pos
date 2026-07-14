import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const logger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({ logger }))

import { DutchieClient } from '../client'

describe('DutchieClient safe logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not log raw employee PII', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([
      {
        employeeId: 42,
        fullName: 'Sensitive Employee Name',
        email: 'private@example.com',
      },
    ]), { status: 200, headers: { 'Content-Type': 'application/json' } })))

    await new DutchieClient('test-key').fetchEmployees()

    const logged = JSON.stringify(logger.info.mock.calls)
    expect(logged).not.toContain('Sensitive Employee Name')
    expect(logged).not.toContain('private@example.com')
  })

  it('attempts the rate-limited loyalty snapshot exactly once', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 429 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(new DutchieClient('test-key').getLoyaltySnapshot()).rejects.toThrow('status 429')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('uses a 15-minute overlap for incremental customers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await new DutchieClient('test-key').fetchCustomers(new Date('2026-07-14T12:00:00.000Z'))

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(url.searchParams.get('fromLastModifiedDateUTC')).toBe('2026-07-14T11:45:00.000Z')
  })

  it('uses an exclusive transaction window end without duplicating the boundary day', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await new DutchieClient('test-key').fetchTransactions({
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-07-03T00:00:00.000Z',
      endExclusive: true,
    })

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(url.searchParams.get('FromDateUTC')).toBe('2026-07-01')
    expect(url.searchParams.get('ToDateUTC')).toBe('2026-07-02')
  })
})
