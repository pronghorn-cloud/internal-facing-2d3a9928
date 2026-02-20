/**
 * Configuration Loader
 *
 * Loads environment variables from .env files and validates them
 * Provides type-safe configuration access throughout the application
 */

import { config as dotenvConfig } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { parseApiConfig, safeParseApiConfig, type ApiConfig } from './schemas/api.config.schema.js'
import { parseWebConfig, safeParseWebConfig, type WebConfig } from './schemas/web.config.schema.js'

/**
 * Load environment variables from .env file
 *
 * @param envPath - Optional path to .env file (defaults to .env in project root)
 * @returns Whether .env file was loaded successfully
 */
export function loadEnv(envPath?: string): boolean {
  const path = envPath || resolve(process.cwd(), '.env')

  if (!existsSync(path)) {
    console.warn(`[Config] .env file not found at: ${path}`)
    return false
  }

  const result = dotenvConfig({ path })

  if (result.error) {
    console.error(`[Config] Failed to load .env file:`, result.error)
    return false
  }

  console.log(`[Config] Loaded environment variables from: ${path}`)
  return true
}

/**
 * Load and validate API configuration
 *
 * @param options - Options for loading configuration
 * @param options.autoLoad - Automatically load .env file (default: true)
 * @param options.envPath - Path to .env file
 * @param options.throwOnError - Throw error on validation failure (default: true)
 * @returns Validated API configuration or null if validation fails
 * @throws Error if validation fails and throwOnError is true
 */
export function loadApiConfig(options: {
  autoLoad?: boolean
  envPath?: string
  throwOnError?: boolean
} = {}): ApiConfig | null {
  const { autoLoad = true, envPath, throwOnError = true } = options

  // Load .env file if requested
  if (autoLoad) {
    loadEnv(envPath)
  }

  // Validate configuration
  if (throwOnError) {
    try {
      const config = parseApiConfig()
      console.log('[Config] API configuration validated successfully')
      return config
    } catch (error) {
      console.error('[Config] API configuration validation failed:')
      throw error
    }
  } else {
    const result = safeParseApiConfig()
    if (result.success) {
      console.log('[Config] API configuration validated successfully')
      return result.data
    } else {
      console.error('[Config] API configuration validation failed:')
      console.error(result.error.format())
      return null
    }
  }
}

/**
 * Load and validate Web configuration
 *
 * @param options - Options for loading configuration
 * @param options.autoLoad - Automatically load .env file (default: true)
 * @param options.envPath - Path to .env file
 * @param options.throwOnError - Throw error on validation failure (default: true)
 * @returns Validated Web configuration or null if validation fails
 * @throws Error if validation fails and throwOnError is true
 */
export function loadWebConfig(options: {
  autoLoad?: boolean
  envPath?: string
  throwOnError?: boolean
} = {}): WebConfig | null {
  const { autoLoad = true, envPath, throwOnError = true } = options

  // Load .env file if requested
  if (autoLoad) {
    loadEnv(envPath)
  }

  // Validate configuration
  if (throwOnError) {
    try {
      const config = parseWebConfig()
      console.log('[Config] Web configuration validated successfully')
      return config
    } catch (error) {
      console.error('[Config] Web configuration validation failed:')
      throw error
    }
  } else {
    const result = safeParseWebConfig()
    if (result.success) {
      console.log('[Config] Web configuration validated successfully')
      return result.data
    } else {
      console.error('[Config] Web configuration validation failed:')
      console.error(result.error.format())
      return null
    }
  }
}

/**
 * Validate configuration without loading .env
 * Useful for CI/CD where environment variables are injected
 *
 * @param type - Configuration type ('api' or 'web')
 * @returns Validation result with issues if any
 */
export function validateConfig(type: 'api' | 'web') {
  if (type === 'api') {
    return safeParseApiConfig()
  } else {
    return safeParseWebConfig()
  }
}

/**
 * Get formatted validation errors
 *
 * @param type - Configuration type ('api' or 'web')
 * @returns Formatted error messages or null if validation succeeds
 */
export function getValidationErrors(type: 'api' | 'web'): string[] | null {
  const result = validateConfig(type)

  if (result.success) {
    return null
  }

  const errors: string[] = []

  for (const [field, issue] of Object.entries(result.error.format())) {
    if (field === '_errors') continue
    const fieldIssues = (issue as any)._errors as string[]
    if (fieldIssues && fieldIssues.length > 0) {
      errors.push(`${field}: ${fieldIssues.join(', ')}`)
    }
  }

  return errors
}
