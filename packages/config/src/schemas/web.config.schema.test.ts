/**
 * Web Config Schema — Unit Tests
 *
 * Validates the Zod schema for frontend environment variables.
 * Tests cover default values, type coercion, URL validation,
 * feature flag transforms, and port bounds.
 */

import { describe, it, expect } from 'vitest'
import { webConfigSchema, parseWebConfig, safeParseWebConfig } from './web.config.schema.js'

describe('webConfigSchema', () => {
  // --- Defaults ---

  it('should apply all defaults when given an empty env', () => {
    // Web schema has defaults for every field, so an empty object should parse
    const result = webConfigSchema.parse({})

    expect(result.NODE_ENV).toBe('development')
    expect(result.VITE_APP_NAME).toBe('Alberta Government Enterprise Template')
    expect(result.VITE_APP_VERSION).toBe('1.0.0')
    expect(result.VITE_API_BASE_URL).toBe('http://localhost:3000/api/v1')
    expect(result.VITE_API_TIMEOUT).toBe(30000)
    expect(result.VITE_DEV_PORT).toBe(5173)
    expect(result.VITE_DEV_OPEN).toBe(false)
    expect(result.VITE_FEATURE_ANALYTICS).toBe(false)
    expect(result.VITE_FEATURE_DEBUG).toBe(false)
  })

  // --- Type coercion ---

  it('should coerce VITE_API_TIMEOUT from string to number', () => {
    const result = webConfigSchema.parse({ VITE_API_TIMEOUT: '5000' })
    expect(result.VITE_API_TIMEOUT).toBe(5000)
    expect(typeof result.VITE_API_TIMEOUT).toBe('number')
  })

  it('should reject VITE_API_TIMEOUT below 1000ms', () => {
    expect(() => webConfigSchema.parse({ VITE_API_TIMEOUT: '500' })).toThrow()
  })

  it('should coerce VITE_DEV_PORT from string to number', () => {
    const result = webConfigSchema.parse({ VITE_DEV_PORT: '4000' })
    expect(result.VITE_DEV_PORT).toBe(4000)
  })

  it('should reject VITE_DEV_PORT outside valid range', () => {
    expect(() => webConfigSchema.parse({ VITE_DEV_PORT: '0' })).toThrow()
    expect(() => webConfigSchema.parse({ VITE_DEV_PORT: '70000' })).toThrow()
  })

  // --- Boolean transforms ---

  it('should transform feature flag strings to booleans', () => {
    const result = webConfigSchema.parse({
      VITE_FEATURE_ANALYTICS: 'true',
      VITE_FEATURE_DEBUG: 'true',
      VITE_DEV_OPEN: 'true',
    })
    expect(result.VITE_FEATURE_ANALYTICS).toBe(true)
    expect(result.VITE_FEATURE_DEBUG).toBe(true)
    expect(result.VITE_DEV_OPEN).toBe(true)
  })

  // --- URL validation ---

  it('should accept a valid VITE_API_BASE_URL', () => {
    const result = webConfigSchema.parse({ VITE_API_BASE_URL: 'https://api.example.com/v1' })
    expect(result.VITE_API_BASE_URL).toBe('https://api.example.com/v1')
  })

  it('should reject an invalid VITE_API_BASE_URL', () => {
    expect(() => webConfigSchema.parse({ VITE_API_BASE_URL: 'not-a-url' })).toThrow()
  })

  // --- safeParseWebConfig ---

  it('should return success:false for invalid config without throwing', () => {
    const result = safeParseWebConfig({ VITE_API_BASE_URL: 'bad' })
    expect(result.success).toBe(false)
  })
})
