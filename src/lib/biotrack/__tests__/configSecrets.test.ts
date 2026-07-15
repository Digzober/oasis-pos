import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))

import { encryptSecret } from '@/lib/security/settingsSecrets.server'
import { clearBioTrackConfigCache, loadBioTrackConfig, seedBioTrackConfig } from '../configLoader'
import { decryptStoredSecret, isEncryptedSecret } from '@/lib/security/settingsSecrets.server'

const KEY = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'

describe('BioTrack stored credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearBioTrackConfigCache()
    process.env.SETTINGS_SECRET_KEY = KEY
  })

  afterEach(() => {
    delete process.env.SETTINGS_SECRET_KEY
  })

  it('decrypts stored credentials for runtime clients', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'config-1',
          location_id: 'loc-1',
          is_enabled: true,
          state_code: 'NM',
          xml_api_url: 'https://xml.example.test',
          rest_api_url: 'https://rest.example.test',
          username_encrypted: encryptSecret('runtime-user'),
          password_encrypted: encryptSecret('runtime-password'),
          ubi: 'license-1',
          biotrack_location_id: 'bt-loc-1',
          use_training_mode: false,
          use_other_plant_material: false,
          use_allotment_check: true,
          report_discounted_prices: false,
          enable_deliveries: false,
          use_lab_data: true,
          default_labs_in_receive: true,
          display_approval_date: false,
          schedule_returns_for_destruction: false,
        },
        error: null,
      }),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) })

    const config = await loadBioTrackConfig('loc-1')

    expect(config).toMatchObject({ username: 'runtime-user', password: 'runtime-password' })
  })

  it('encrypts credentials written by the BioTrack seed path', async () => {
    let saved: Record<string, unknown> = {}
    const upsert = vi.fn().mockImplementation((row: Record<string, unknown>) => {
      saved = row
      return Promise.resolve({ error: null })
    })
    mocks.createSupabaseServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({ upsert }),
    })

    await seedBioTrackConfig({
      locationId: 'loc-1',
      xmlApiUrl: 'https://xml.example.test',
      restApiUrl: 'https://rest.example.test',
      username: 'seed-user',
      password: 'seed-password',
      ubi: 'license-1',
      biotrackLocationId: 'bt-loc-1',
    })

    expect(isEncryptedSecret(saved.username_encrypted as string)).toBe(true)
    expect(isEncryptedSecret(saved.password_encrypted as string)).toBe(true)
    expect(decryptStoredSecret(saved.username_encrypted as string)).toBe('seed-user')
    expect(decryptStoredSecret(saved.password_encrypted as string)).toBe('seed-password')
  })
})
