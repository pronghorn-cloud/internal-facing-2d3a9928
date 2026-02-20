/**
 * API Config Schema — Unit Tests
 *
 * Validates the Zod schema that governs all API environment variables.
 * Tests cover type coercion, enum constraints, default values,
 * required-field enforcement, and the safe-parse variant.
 */

import { describe, it, expect } from 'vitest'
import { apiConfigSchema, parseApiConfig, safeParseApiConfig } from './api.config.schema.js'

/**
 * Minimal valid environment: only the fields that have no defaults
 * and are required by the schema.
 */
const VALID_ENV = {
  DB_CONNECTION_STRING: 'postgresql://user@localhost:5432/db',
  SESSION_SECRET: 'test-session-secret-for-unit-tests-only-32chars', // 32+ chars
  AUTH_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/callback',
  WEB_URL: 'http://localhost:5173',
  CORS_ORIGIN: 'http://localhost:5173',
}

describe('apiConfigSchema', () => {
  // --- Happy path ---

  it('should parse a valid minimal config and apply defaults', () => {
    const result = apiConfigSchema.parse(VALID_ENV)

    // Defaults applied
    expect(result.NODE_ENV).toBe('development')
    expect(result.PORT).toBe(3000)
    expect(result.AUTH_DRIVER).toBe('mock')
    expect(result.SESSION_STORE).toBe('postgres')
    expect(result.LOG_LEVEL).toBe('info')
    expect(result.DB_POOL_MIN).toBe(2)
    expect(result.DB_POOL_MAX).toBe(10)
    expect(result.SESSION_MAX_AGE).toBe(28800000) // 8 hours
  })

  // --- Type coercion ---

  it('should coerce PORT from string to number', () => {
    const result = apiConfigSchema.parse({ ...VALID_ENV, PORT: '8080' })
    expect(result.PORT).toBe(8080)
    expect(typeof result.PORT).toBe('number')
  })

  it('should reject PORT outside valid range (1–65535)', () => {
    expect(() => apiConfigSchema.parse({ ...VALID_ENV, PORT: '0' })).toThrow()
    expect(() => apiConfigSchema.parse({ ...VALID_ENV, PORT: '70000' })).toThrow()
  })

  it('should coerce pool sizes from strings to numbers', () => {
    const result = apiConfigSchema.parse({ ...VALID_ENV, DB_POOL_MIN: '5', DB_POOL_MAX: '20' })
    expect(result.DB_POOL_MIN).toBe(5)
    expect(result.DB_POOL_MAX).toBe(20)
  })

  // --- Boolean transforms ---

  it('should transform string booleans to real booleans', () => {
    const result = apiConfigSchema.parse({
      ...VALID_ENV,
      DB_SSL: 'true',
      CORS_CREDENTIALS: 'false',
      LOG_PII: 'true',
    })
    expect(result.DB_SSL).toBe(true)
    expect(result.CORS_CREDENTIALS).toBe(false)
    expect(result.LOG_PII).toBe(true)
  })

  it('should default DB_SSL to false and LOG_PII to false', () => {
    const result = apiConfigSchema.parse(VALID_ENV)
    expect(result.DB_SSL).toBe(false)
    expect(result.LOG_PII).toBe(false)
  })

  // --- Enum validation ---

  it('should accept valid NODE_ENV values', () => {
    for (const env of ['development', 'production', 'test']) {
      const result = apiConfigSchema.parse({ ...VALID_ENV, NODE_ENV: env })
      expect(result.NODE_ENV).toBe(env)
    }
  })

  it('should reject invalid NODE_ENV', () => {
    expect(() => apiConfigSchema.parse({ ...VALID_ENV, NODE_ENV: 'staging' })).toThrow()
  })

  it('should accept valid AUTH_DRIVER values', () => {
    for (const driver of ['mock', 'entra-id']) {
      const result = apiConfigSchema.parse({ ...VALID_ENV, AUTH_DRIVER: driver })
      expect(result.AUTH_DRIVER).toBe(driver)
    }
  })

  it('should reject invalid AUTH_DRIVER', () => {
    expect(() => apiConfigSchema.parse({ ...VALID_ENV, AUTH_DRIVER: 'jwt' })).toThrow()
  })

  it('should accept valid LOG_LEVEL values', () => {
    for (const level of ['error', 'warn', 'info', 'debug']) {
      const result = apiConfigSchema.parse({ ...VALID_ENV, LOG_LEVEL: level })
      expect(result.LOG_LEVEL).toBe(level)
    }
  })

  // --- Required fields ---

  it('should reject missing DB_CONNECTION_STRING', () => {
    const { DB_CONNECTION_STRING, ...env } = VALID_ENV
    expect(() => apiConfigSchema.parse(env)).toThrow()
  })

  it('should reject missing SESSION_SECRET', () => {
    const { SESSION_SECRET, ...env } = VALID_ENV
    expect(() => apiConfigSchema.parse(env)).toThrow()
  })

  it('should reject SESSION_SECRET shorter than 32 characters', () => {
    expect(() => apiConfigSchema.parse({ ...VALID_ENV, SESSION_SECRET: 'too-short' })).toThrow()
  })

  it('should reject invalid URL for DB_CONNECTION_STRING', () => {
    expect(() =>
      apiConfigSchema.parse({ ...VALID_ENV, DB_CONNECTION_STRING: 'not-a-url' })
    ).toThrow()
  })

  // --- safeParseApiConfig ---

  it('should return success:true with data for valid config', () => {
    const result = safeParseApiConfig(VALID_ENV)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.PORT).toBe(3000)
    }
  })

  it('should return success:false with error for invalid config', () => {
    const result = safeParseApiConfig({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })
})
