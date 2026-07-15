import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  assertOrgOwnership: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/auth/ownership', () => ({ assertOrgOwnership: mocks.assertOrgOwnership }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { POST } from '../route'
import { PATCH } from '../[id]/route'

function writeChain() {
  let written: Record<string, unknown> | undefined
  const chain = {
    insert: vi.fn((value: Record<string, unknown>) => { written = value; return chain }),
    update: vi.fn((value: Record<string, unknown>) => { written = value; return chain }),
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: written, error: null })),
  }
  return { chain, written: () => written }
}

describe('printer nullable fields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue({
      organizationId: 'org-1',
      locationId: 'location-1',
    })
    mocks.assertOrgOwnership.mockResolvedValue(true)
  })

  it('persists blank IP and port as null when creating a printer', async () => {
    const database = writeChain()
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => database.chain) })

    const response = await POST(new NextRequest('http://localhost/api/settings/printers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Front', ip_address: '', port: '' }),
    }))

    expect(response.status).toBe(201)
    expect(database.written()).toMatchObject({ ip_address: null, port: null })
  })

  it('round-trips explicit null when clearing an existing printer', async () => {
    const database = writeChain()
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => database.chain) })

    const response = await PATCH(new NextRequest('http://localhost/api/settings/printers/printer-1', {
      method: 'PATCH',
      body: JSON.stringify({ ip_address: null, port: null }),
    }), { params: Promise.resolve({ id: 'printer-1' }) })

    expect(response.status).toBe(200)
    expect(database.written()).toEqual({ ip_address: null, port: null })
  })
})
