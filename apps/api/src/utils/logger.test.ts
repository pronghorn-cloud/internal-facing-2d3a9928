/**
 * Logger Utilities — Unit Tests
 *
 * Tests the sanitizeObject() function that redacts sensitive fields
 * from objects before logging. This is a critical security function
 * that prevents PII from appearing in application logs.
 *
 * Pino and pino-http are mocked because they rely on native stream
 * bindings that don't load cleanly in vitest's module resolver.
 */

import { describe, it, expect, vi } from 'vitest'

// Mock pino and pino-http before importing logger
vi.mock('pino', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => mockLogger),
  }
  const pino = vi.fn(() => mockLogger)
  ;(pino as any).stdTimeFunctions = { isoTime: vi.fn() }
  return { default: pino }
})

vi.mock('pino-http', () => ({
  pinoHttp: vi.fn(() => vi.fn((_req: any, _res: any, next: any) => next?.())),
}))

import { sanitizeObject } from './logger.js'

describe('sanitizeObject', () => {
  // ─── Primitives (pass-through) ─────────────────────────────────────

  it('should return primitives unchanged', () => {
    expect(sanitizeObject(null)).toBeNull()
    expect(sanitizeObject(undefined)).toBeUndefined()
    expect(sanitizeObject(42)).toBe(42)
    expect(sanitizeObject('hello')).toBe('hello')
    expect(sanitizeObject(true)).toBe(true)
  })

  // ─── Sensitive field redaction ─────────────────────────────────────

  it('should redact "password" field', () => {
    const result = sanitizeObject({ password: 'secret123' })
    expect(result.password).toBe('[REDACTED]')
  })

  it('should redact "email" field', () => {
    const result = sanitizeObject({ email: 'user@gov.ab.ca' })
    expect(result.email).toBe('[REDACTED]')
  })

  it('should redact "token" field', () => {
    const result = sanitizeObject({ token: 'eyJhbGciOi...' })
    expect(result.token).toBe('[REDACTED]')
  })

  it('should redact "ssn" and "sin" fields', () => {
    const result = sanitizeObject({ ssn: '123-45-6789', sin: '123-456-789' })
    expect(result.ssn).toBe('[REDACTED]')
    expect(result.sin).toBe('[REDACTED]')
  })

  it('should redact "credit_card" and "cvv" fields', () => {
    const result = sanitizeObject({ credit_card: '4111-1111-1111-1111', cvv: '123' })
    expect(result.credit_card).toBe('[REDACTED]')
    expect(result.cvv).toBe('[REDACTED]')
  })

  // ─── Case-insensitive matching ────────────────────────────────────

  it('should match sensitive fields case-insensitively', () => {
    const result = sanitizeObject({
      userEmail: 'user@test.com',      // contains "email"
      Authorization: 'Bearer xyz',     // contains "authorization"
      apiKey: 'sk-1234',               // contains "apikey"
    })
    expect(result.userEmail).toBe('[REDACTED]')
    expect(result.Authorization).toBe('[REDACTED]')
    expect(result.apiKey).toBe('[REDACTED]')
  })

  // ─── Nested objects ───────────────────────────────────────────────

  it('should recursively sanitize nested objects', () => {
    const result = sanitizeObject({
      user: {
        name: 'Alice',
        email: 'alice@gov.ab.ca',
        profile: {
          phone: '555-1234',
        },
      },
    })

    expect(result.user.name).toBe('Alice')               // safe field preserved
    expect(result.user.email).toBe('[REDACTED]')          // sensitive redacted
    expect(result.user.profile.phone).toBe('[REDACTED]')  // nested sensitive redacted
  })

  // ─── Arrays ───────────────────────────────────────────────────────

  it('should sanitize objects within arrays', () => {
    const result = sanitizeObject([
      { name: 'Alice', password: 'pass1' },
      { name: 'Bob', password: 'pass2' },
    ])

    expect(result[0].name).toBe('Alice')
    expect(result[0].password).toBe('[REDACTED]')
    expect(result[1].password).toBe('[REDACTED]')
  })

  // ─── Non-sensitive fields preserved ───────────────────────────────

  it('should preserve non-sensitive fields unchanged', () => {
    const result = sanitizeObject({
      id: 'user-1',
      method: 'GET',
      path: '/api/v1/health',
      statusCode: 200,
      duration: 42,
    })

    expect(result).toEqual({
      id: 'user-1',
      method: 'GET',
      path: '/api/v1/health',
      statusCode: 200,
      duration: 42,
    })
  })
})
