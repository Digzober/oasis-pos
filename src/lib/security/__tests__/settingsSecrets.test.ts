import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  decryptStoredSecret,
  encryptSecret,
  isEncryptedSecret,
  maskStoredSecret,
  prepareSecretForWrite,
} from '../settingsSecrets.server'

const HEX_KEY = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'

describe('settings secrets', () => {
  beforeEach(() => {
    process.env.SETTINGS_SECRET_KEY = HEX_KEY
  })

  afterEach(() => {
    delete process.env.SETTINGS_SECRET_KEY
  })

  it('round-trips a secret in a versioned AES-256-GCM envelope', () => {
    const encrypted = encryptSecret('super-secret-1234')

    expect(encrypted).not.toContain('super-secret-1234')
    expect(isEncryptedSecret(encrypted)).toBe(true)
    expect(decryptStoredSecret(encrypted)).toBe('super-secret-1234')
  })

  it('accepts a base64-encoded 32-byte key', () => {
    process.env.SETTINGS_SECRET_KEY = Buffer.from(HEX_KEY, 'hex').toString('base64')

    expect(decryptStoredSecret(encryptSecret('base64-key-secret'))).toBe('base64-key-secret')
  })

  it('returns legacy plaintext unchanged until the next save', () => {
    expect(decryptStoredSecret('legacy-plaintext')).toBe('legacy-plaintext')
    expect(isEncryptedSecret('legacy-plaintext')).toBe(false)
  })

  it('masks the decrypted value and never the ciphertext tail', () => {
    const encrypted = encryptSecret('credential-9876')

    expect(maskStoredSecret(encrypted)).toBe(`${String.fromCodePoint(0x2022).repeat(4)}9876`)
  })

  it('re-encrypts a legacy secret when a masked or blank placeholder is saved', () => {
    const fromMask = prepareSecretForWrite('••••text', 'legacy-1234')
    const fromBlank = prepareSecretForWrite('  ', 'legacy-1234')

    expect(isEncryptedSecret(fromMask)).toBe(true)
    expect(isEncryptedSecret(fromBlank)).toBe(true)
    expect(decryptStoredSecret(fromMask)).toBe('legacy-1234')
    expect(decryptStoredSecret(fromBlank)).toBe('legacy-1234')
  })

  it('encrypts a replacement and preserves an encrypted secret when omitted', () => {
    const stored = encryptSecret('stored-1234')
    const replacement = prepareSecretForWrite('replacement-5678', stored)
    const preserved = prepareSecretForWrite(undefined, stored)

    expect(decryptStoredSecret(replacement)).toBe('replacement-5678')
    expect(decryptStoredSecret(preserved)).toBe('stored-1234')
  })

  it('rejects malformed keys and authenticated ciphertext tampering', () => {
    process.env.SETTINGS_SECRET_KEY = 'too-short'
    expect(() => encryptSecret('secret')).toThrow(/32 bytes/)

    process.env.SETTINGS_SECRET_KEY = HEX_KEY
    const encrypted = encryptSecret('secret')
    const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('A') ? 'B' : 'A'}`
    expect(() => decryptStoredSecret(tampered)).toThrow()
  })
})
