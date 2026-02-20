/**
 * Token Encryption Utility (REQ-P2-03)
 *
 * AES-256-GCM encryption for OAuth tokens stored in session.
 * Protects tokens at rest in PostgreSQL session storage.
 * Key MUST be separate from SESSION_SECRET (use TOKEN_ENCRYPTION_KEY env var).
 */

import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

/**
 * Derive a 256-bit key from the provided key string using SHA-256.
 */
function deriveKey(key: string): Buffer {
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: IV (12 bytes) + Auth Tag (16 bytes) + Ciphertext.
 */
export function encryptToken(plaintext: string, key: string): string {
  const keyBuffer = deriveKey(key)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

/**
 * Decrypt a base64-encoded AES-256-GCM ciphertext.
 * Expects the format produced by encryptToken(): IV + Auth Tag + Ciphertext.
 */
export function decryptToken(encoded: string, key: string): string {
  const keyBuffer = deriveKey(key)
  const data = Buffer.from(encoded, 'base64')
  const iv = data.subarray(0, IV_LENGTH)
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8')
}
