import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const ENVELOPE_PREFIX = 'settings:v1'
const IV_BYTES = 12
const MASK_PREFIX = '••••'

function getEncryptionKey(): Buffer {
  const configured = process.env.SETTINGS_SECRET_KEY?.trim() ?? ''
  const key = /^[a-f\d]{64}$/i.test(configured)
    ? Buffer.from(configured, 'hex')
    : decodeBase64Key(configured)

  if (key.length !== 32) {
    throw new Error('SETTINGS_SECRET_KEY must encode exactly 32 bytes')
  }
  return key
}

function decodeBase64Key(configured: string): Buffer {
  if (!/^[A-Za-z\d+/]+={0,2}$/.test(configured) || configured.length % 4 !== 0) {
    return Buffer.alloc(0)
  }
  return Buffer.from(configured, 'base64')
}

export function isEncryptedSecret(value: string | null | undefined): value is string {
  return value?.startsWith(`${ENVELOPE_PREFIX}:`) ?? false
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  cipher.setAAD(Buffer.from(ENVELOPE_PREFIX))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [ENVELOPE_PREFIX, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':')
}

export function decryptStoredSecret(stored: string | null | undefined): string {
  if (!stored || !isEncryptedSecret(stored)) return stored ?? ''
  const parts = stored.split(':')
  if (parts.length !== 5) throw new Error('Invalid encrypted settings secret')

  const [, , ivValue, tagValue, ciphertextValue] = parts
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivValue!, 'base64'))
  decipher.setAAD(Buffer.from(ENVELOPE_PREFIX))
  decipher.setAuthTag(Buffer.from(tagValue!, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue!, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function maskStoredSecret(stored: string | null | undefined): string {
  const plaintext = decryptStoredSecret(stored)
  return plaintext ? `${MASK_PREFIX}${plaintext.slice(-4)}` : ''
}

function isPlaceholder(value: string): boolean {
  const trimmed = value.trim()
  return trimmed === '' || trimmed.startsWith(MASK_PREFIX) || trimmed.startsWith('****')
}

export function prepareSecretForWrite(
  submitted: string | null | undefined,
  stored: string | null | undefined,
): string | undefined {
  const plaintext = submitted != null && !isPlaceholder(submitted)
    ? submitted
    : decryptStoredSecret(stored)
  return plaintext ? encryptSecret(plaintext) : undefined
}
