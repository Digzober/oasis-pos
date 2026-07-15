import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  clearBioTrackConfigCache: vi.fn(),
  clearBioTrackClientCache: vi.fn(),
}))

vi.mock('@/lib/auth/session', () => ({ requireSession: mocks.requireSession }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.mock('@/lib/biotrack/configLoader', () => ({
  clearBioTrackConfigCache: mocks.clearBioTrackConfigCache,
}))
vi.mock('@/lib/biotrack/client', () => ({
  clearBioTrackClientCache: mocks.clearBioTrackClientCache,
}))

import { decryptStoredSecret, isEncryptedSecret } from '@/lib/security/settingsSecrets.server'
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

describe('BioTrack secret storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SETTINGS_SECRET_KEY = KEY
    mocks.requireSession.mockResolvedValue({ locationId: 'loc-1' })
  })

  afterEach(() => {
    delete process.env.SETTINGS_SECRET_KEY
  })

  it('masks legacy credentials in GET responses', async () => {
    const query = chain({
      data: {
        location_id: 'loc-1',
        username_encrypted: 'legacy-user-1234',
        password_encrypted: 'legacy-password-5678',
      },
      error: null,
    })
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => query) })

    const response = await GET()
    const body = await response.json()

    expect(body.config).toMatchObject({ username: '••••1234', password: '••••5678' })
    expect(JSON.stringify(body)).not.toContain('legacy-user-1234')
    expect(JSON.stringify(body)).not.toContain('legacy-password-5678')
  })

  it('preserves masked and blank credentials while re-encrypting legacy storage', async () => {
    let saved: Record<string, unknown> = {}
    const existing = chain({
      data: {
        location_id: 'loc-1',
        username_encrypted: 'legacy-user-1234',
        password_encrypted: 'legacy-password-5678',
      },
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

    const response = await PATCH(new NextRequest('http://localhost/api/settings/biotrack-config', {
      method: 'PATCH',
      body: JSON.stringify({ username: '••••1234', password: '' }),
    }))

    expect(response.status).toBe(200)
    expect(isEncryptedSecret(saved.username_encrypted as string)).toBe(true)
    expect(isEncryptedSecret(saved.password_encrypted as string)).toBe(true)
    expect(decryptStoredSecret(saved.username_encrypted as string)).toBe('legacy-user-1234')
    expect(decryptStoredSecret(saved.password_encrypted as string)).toBe('legacy-password-5678')
  })
})
