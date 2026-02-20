/**
 * Configuration Loader — Unit Tests
 *
 * Tests the .env file loading, configuration validation, and error formatting.
 * File system and dotenv are mocked to isolate logic from the environment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadEnv, loadApiConfig, loadWebConfig, validateConfig, getValidationErrors } from './loader.js'

// Mock file system and dotenv to prevent real file access
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}))
vi.mock('dotenv', () => ({
  config: vi.fn(),
}))

// Import mocked modules to control return values
import { existsSync } from 'fs'
import { config as dotenvConfig } from 'dotenv'

const mockedExistsSync = vi.mocked(existsSync)
const mockedDotenvConfig = vi.mocked(dotenvConfig)

beforeEach(() => {
  vi.clearAllMocks()
  // Suppress console output during tests
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('loadEnv', () => {
  it('should return false when .env file does not exist', () => {
    mockedExistsSync.mockReturnValue(false)

    const result = loadEnv('/nonexistent/.env')
    expect(result).toBe(false)
  })

  it('should return false when dotenv fails to parse', () => {
    mockedExistsSync.mockReturnValue(true)
    mockedDotenvConfig.mockReturnValue({ error: new Error('parse error') } as any)

    const result = loadEnv('/some/.env')
    expect(result).toBe(false)
  })

  it('should return true when .env loads successfully', () => {
    mockedExistsSync.mockReturnValue(true)
    mockedDotenvConfig.mockReturnValue({ parsed: { PORT: '3000' } })

    const result = loadEnv('/some/.env')
    expect(result).toBe(true)
  })
})

describe('loadApiConfig', () => {
  it('should return null when validation fails and throwOnError is false', () => {
    // Provide no env vars — required fields will be missing
    mockedExistsSync.mockReturnValue(false)

    const result = loadApiConfig({ autoLoad: false, throwOnError: false })
    expect(result).toBeNull()
  })

  it('should throw when validation fails and throwOnError is true', () => {
    mockedExistsSync.mockReturnValue(false)

    expect(() => loadApiConfig({ autoLoad: false, throwOnError: true })).toThrow()
  })
})

describe('loadWebConfig', () => {
  it('should return valid config when all defaults apply', () => {
    // Web config has defaults for all fields, so empty env should pass
    mockedExistsSync.mockReturnValue(false)

    const result = loadWebConfig({ autoLoad: false, throwOnError: false })
    expect(result).not.toBeNull()
    expect(result?.VITE_APP_NAME).toBe('Alberta Government Enterprise Template')
  })
})

describe('validateConfig', () => {
  it('should delegate to API schema when type is "api"', () => {
    const result = validateConfig('api')
    // With no env vars set, API validation should fail (required fields missing)
    expect(result.success).toBe(false)
  })

  it('should delegate to Web schema when type is "web"', () => {
    const result = validateConfig('web')
    // Web schema has all defaults, so should succeed
    expect(result.success).toBe(true)
  })
})

describe('getValidationErrors', () => {
  it('should return null for valid web config', () => {
    const errors = getValidationErrors('web')
    expect(errors).toBeNull()
  })

  it('should return error strings for invalid api config', () => {
    const errors = getValidationErrors('api')
    expect(errors).not.toBeNull()
    expect(Array.isArray(errors)).toBe(true)
    expect(errors!.length).toBeGreaterThan(0)
    // Errors should be formatted as "FIELD: message"
    expect(errors![0]).toMatch(/.+: .+/)
  })
})
