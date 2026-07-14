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
})
