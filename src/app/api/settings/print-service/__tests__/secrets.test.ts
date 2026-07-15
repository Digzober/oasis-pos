import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import {
  decryptStoredSecret,
  encryptSecret,
  isEncryptedSecret,
} from '@/lib/security/settingsSecrets.server'
import { GET, PATCH } from '../route'

const KEY = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'

function chain(result: { data: Record<string, unknown> | null; error: null }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    upsert: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.upsert.mockReturnValue(query)
  return query
}

describe('print service secret storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SETTINGS_SECRET_KEY = KEY
    mocks.requireSession.mockResolvedValue({ locationId: 'loc-1' })
  })

  afterEach(() => {
    delete process.env.SETTINGS_SECRET_KEY
  })

  it('masks the decrypted API key in GET responses', async () => {
    const encrypted = encryptSecret('print-service-2468')
    const query = chain({
      data: { location_id: 'loc-1', api_key_encrypted: encrypted },
      error: null,
    })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    const response = await GET()
    const body = await response.json()

    expect(body.config).toMatchObject({ hasApiKey: true, apiKeyTail: '••••2468' })
    expect(JSON.stringify(body)).not.toContain(encrypted)
    expect(JSON.stringify(body)).not.toContain('print-service-2468')
  })

  it('treats blank input as a placeholder and re-encrypts the stored legacy key', async () => {
    let saved: Record<string, unknown> = {}
    const existing = chain({
      data: { api_key_encrypted: 'legacy-print-2468' },
      error: null,
    })
    const upsert = chain({ data: null, error: null })
    upsert.upsert.mockImplementation((row: Record<string, unknown>) => {
      saved = row
      upsert.single.mockResolvedValue({ data: row, error: null })
      return upsert
    })
    const from = vi.fn()
      .mockReturnValueOnce(existing)
      .mockReturnValueOnce(upsert)
    mocks.createSupabaseServerClient.mockResolvedValue({ from })

    const response = await PATCH(new NextRequest('http://localhost/api/settings/print-service', {
      method: 'PATCH',
      body: JSON.stringify({ apiKey: '' }),
    }))

    expect(response.status).toBe(200)
    expect(isEncryptedSecret(saved.api_key_encrypted as string)).toBe(true)
    expect(decryptStoredSecret(saved.api_key_encrypted as string)).toBe('legacy-print-2468')
  })

  it('persists a cleared account email as null', async () => {
    let saved: Record<string, unknown> = {}
    const existing = chain({ data: { api_key_encrypted: null }, error: null })
    const upsert = chain({ data: null, error: null })
    upsert.upsert.mockImplementation((row: Record<string, unknown>) => {
      saved = row
      upsert.single.mockResolvedValue({ data: row, error: null })
      return upsert
    })
    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValueOnce(existing).mockReturnValueOnce(upsert),
    })

    const response = await PATCH(new NextRequest('http://localhost/api/settings/print-service', {
      method: 'PATCH',
      body: JSON.stringify({ account_email: '' }),
    }))

    expect(response.status).toBe(200)
    expect(saved.account_email).toBeNull()
  })
})
