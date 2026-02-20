/**
 * Token Encryption Utility — Unit Tests
 *
 * Tests AES-256-GCM encrypt/decrypt round-trips, key mismatch handling,
 * IV randomness, and tamper detection via the authentication tag.
 */

import { describe, it, expect } from 'vitest'
import { encryptToken, decryptToken } from './token-encryption.js'

const TEST_KEY = 'my-super-secret-encryption-key-1234'

describe('encryptToken / decryptToken', () => {
  it('should round-trip: encrypt then decrypt returns original plaintext', () => {
    const plaintext = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test-token'
    const encrypted = encryptToken(plaintext, TEST_KEY)
    const decrypted = decryptToken(encrypted, TEST_KEY)

    expect(decrypted).toBe(plaintext)
  })

  it('should fail decryption with a different key', () => {
    const encrypted = encryptToken('secret-data', TEST_KEY)

    expect(() => decryptToken(encrypted, 'wrong-key-that-is-also-long-enough')).toThrow()
  })

  it('should produce different ciphertext for the same plaintext (random IV)', () => {
    const plaintext = 'same-input'
    const encrypted1 = encryptToken(plaintext, TEST_KEY)
    const encrypted2 = encryptToken(plaintext, TEST_KEY)

    // Different IVs → different ciphertext, but both decrypt correctly
    expect(encrypted1).not.toBe(encrypted2)
    expect(decryptToken(encrypted1, TEST_KEY)).toBe(plaintext)
    expect(decryptToken(encrypted2, TEST_KEY)).toBe(plaintext)
  })

  it('should handle empty string encryption/decryption', () => {
    const encrypted = encryptToken('', TEST_KEY)
    const decrypted = decryptToken(encrypted, TEST_KEY)
    expect(decrypted).toBe('')
  })

  it('should handle long plaintext', () => {
    const long = 'x'.repeat(10000)
    const encrypted = encryptToken(long, TEST_KEY)
    const decrypted = decryptToken(encrypted, TEST_KEY)
    expect(decrypted).toBe(long)
  })

  it('should detect tampered ciphertext via auth tag mismatch', () => {
    const encrypted = encryptToken('sensitive', TEST_KEY)
    // Flip a character in the middle of the base64 string
    const tampered = encrypted.slice(0, 20) + 'X' + encrypted.slice(21)

    expect(() => decryptToken(tampered, TEST_KEY)).toThrow()
  })
})
