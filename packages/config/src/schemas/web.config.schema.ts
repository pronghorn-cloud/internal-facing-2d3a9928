/**
 * Web Configuration Schema
 *
 * Validates environment variables for the frontend Vue.js application
 * Note: Only public, non-sensitive variables should be exposed to the frontend
 */

import { z } from 'zod'

/**
 * Node environment
 */
const nodeEnvSchema = z.enum(['development', 'production', 'test']).default('development')

/**
 * Complete Web Configuration Schema
 *
 * Covers environment variables for:
 * - Application settings
 * - API connection
 * - Feature flags
 * - Development settings
 */
export const webConfigSchema = z.object({
  // Application
  NODE_ENV: nodeEnvSchema,

  // Vite-specific (prefixed with VITE_ to be exposed to browser)
  VITE_APP_NAME: z.string().default('Alberta Government Enterprise Template'),
  VITE_APP_VERSION: z.string().default('1.0.0'),

  // API Connection
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3000/api/v1').describe('Base URL for API calls'),
  VITE_API_TIMEOUT: z.coerce.number().int().min(1000).default(30000).describe('API request timeout in milliseconds'),

  // Authentication
  VITE_AUTH_LOGIN_URL: z.string().default('/api/v1/auth/login').describe('Relative path to login endpoint'),
  VITE_AUTH_LOGOUT_URL: z.string().default('/api/v1/auth/logout').describe('Relative path to logout endpoint'),
  VITE_AUTH_ME_URL: z.string().default('/api/v1/auth/me').describe('Relative path to current user endpoint'),

  // Feature Flags
  VITE_FEATURE_ANALYTICS: z.enum(['true', 'false']).transform((val) => val === 'true').default('false'),
  VITE_FEATURE_DEBUG: z.enum(['true', 'false']).transform((val) => val === 'true').default('false'),

  // Development
  VITE_DEV_PORT: z.coerce.number().int().min(1).max(65535).default(5173),
  VITE_DEV_OPEN: z.enum(['true', 'false']).transform((val) => val === 'true').default('false').describe('Auto-open browser on dev server start'),
})

/**
 * Inferred TypeScript type from schema
 */
export type WebConfig = z.infer<typeof webConfigSchema>

/**
 * Parse and validate Web configuration
 *
 * @param env - Environment variables (defaults to process.env)
 * @returns Validated and type-safe configuration
 * @throws ZodError if validation fails
 */
export function parseWebConfig(env: Record<string, string | undefined> = process.env): WebConfig {
  return webConfigSchema.parse(env)
}

/**
 * Safe parse Web configuration (returns result object instead of throwing)
 *
 * @param env - Environment variables (defaults to process.env)
 * @returns Success result with data or error result with issues
 */
export function safeParseWebConfig(env: Record<string, string | undefined> = process.env) {
  return webConfigSchema.safeParse(env)
}
