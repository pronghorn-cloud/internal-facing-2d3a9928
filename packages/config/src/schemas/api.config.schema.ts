/**
 * API Configuration Schema
 *
 * Validates all environment variables required for the API application
 * Uses Zod for runtime validation and TypeScript type inference
 */

import { z } from 'zod'

/**
 * Node environment
 */
const nodeEnvSchema = z.enum(['development', 'production', 'test']).default('development')

/**
 * Authentication driver (internal staff auth)
 */
const authDriverSchema = z.enum(['mock', 'entra-id']).default('mock')

/**
 * Session store type
 */
const sessionStoreSchema = z.enum(['memory', 'postgres']).default('postgres')

/**
 * Log level
 */
const logLevelSchema = z.enum(['error', 'warn', 'info', 'debug']).default('info')

/**
 * Log format
 */
const logFormatSchema = z.enum(['combined', 'common', 'dev', 'short', 'tiny']).default('dev')

/**
 * Complete API Configuration Schema
 *
 * Covers environment variables for:
 * - Application settings
 * - Database connection
 * - Session management
 * - Authentication (Mock, Entra ID)
 * - Service-to-service auth (Azure AD Client Credentials for public-facing app)
 * - Security settings
 * - Logging
 */
export const apiConfigSchema = z.object({
  // Application
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_NAME: z.string().default('Alberta Government Internal Application'),

  // Database
  DB_CONNECTION_STRING: z.string().url().describe('PostgreSQL connection string'),
  DB_POOL_MIN: z.coerce.number().int().min(0).default(2),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(10),
  DB_IDLE_TIMEOUT: z.coerce.number().int().min(0).default(30000),
  DB_CONNECTION_TIMEOUT: z.coerce.number().int().min(0).default(5000),
  DB_SSL: z.enum(['true', 'false']).transform((val) => val === 'true').default('false'),

  // Session Management
  SESSION_SECRET: z.string().min(32).describe('Secret key for session encryption (min 32 characters)'),
  SESSION_SECRET_PREVIOUS: z.string().min(32).optional().describe('Previous session secret for graceful key rotation (FINDING-007)'),
  SESSION_STORE: sessionStoreSchema,
  SESSION_MAX_AGE: z.coerce.number().int().min(60000).default(28800000), // 8 hours default (Protected B)
  SESSION_COOKIE_SECURE: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  SESSION_COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  SESSION_COOKIE_NAME: z.string().default('connect.sid'),

  // Authentication - Staff (Entra ID / Mock)
  AUTH_DRIVER: authDriverSchema,
  AUTH_CALLBACK_URL: z.string().url().describe('Authentication callback URL'),

  // Authentication - Microsoft Entra ID (staff login)
  ENTRA_TENANT_ID: z.string().uuid().optional().describe('Azure AD Tenant ID'),
  ENTRA_CLIENT_ID: z.string().uuid().optional().describe('Azure AD Application (client) ID'),
  ENTRA_CLIENT_SECRET: z.string().optional().describe('Azure AD Client Secret'),
  ENTRA_AUTHORITY: z.string().url().optional().describe('Azure AD Authority URL'),
  ENTRA_SCOPE: z.string().default('openid profile email'),
  ENTRA_RESPONSE_TYPE: z.string().default('code'),
  ENTRA_RESPONSE_MODE: z.string().default('query'),
  ENTRA_DEFAULT_ROLE: z.string().optional().describe('Default role for Entra ID users'),
  ENTRA_LOGOUT_URL: z.string().url().optional().describe('Entra ID Logout URL'),
  ENTRA_POST_LOGOUT_REDIRECT_URI: z.string().url().optional().describe('Post-logout redirect URI'),

  // Service-to-Service Auth (Azure AD Client Credentials)
  // Used by the public-facing application to call internal APIs
  SERVICE_AUTH_ENABLED: z.enum(['true', 'false']).transform((val) => val === 'true').default('false')
    .describe('Enable Azure AD client credentials validation for /api/v1/public/* routes'),
  SERVICE_AUTH_TENANT_ID: z.string().uuid().optional()
    .describe('Azure AD Tenant ID for service auth (defaults to ENTRA_TENANT_ID)'),
  SERVICE_AUTH_AUDIENCE: z.string().optional()
    .describe('Expected audience (aud) claim in service tokens (defaults to api://{ENTRA_CLIENT_ID})'),
  SERVICE_AUTH_ALLOWED_CLIENT_IDS: z.string().optional()
    .describe('Comma-separated list of allowed client IDs (appid/azp claims) from public-facing apps'),

  // Frontend
  WEB_URL: z.string().url().describe('Frontend application URL'),

  // CORS
  CORS_ORIGIN: z.string().describe('Comma-separated CORS allowed origins (internal frontend + public-facing app)'),
  CORS_CREDENTIALS: z.enum(['true', 'false']).transform((val) => val === 'true').default('true'),

  // Security
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(1000).describe('Max requests per 15 minutes per IP'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10).describe('Max auth requests per 15 minutes'),
  SERVICE_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(500).describe('Max service-to-service requests per 15 minutes per IP'),
  HELMET_CSP: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  ALLOWED_HOSTS: z.string().optional().describe('Comma-separated list of allowed Host header values (REQ-P1-01)'),
  TOKEN_ENCRYPTION_KEY: z.string().min(32).optional().describe('AES-256-GCM key for encrypting OAuth tokens in session (REQ-P2-03)'),

  // Logging
  LOG_LEVEL: logLevelSchema,
  LOG_FORMAT: logFormatSchema,
  LOG_PII: z.enum(['true', 'false']).transform((val) => val === 'true').default('false').describe('Log personally identifiable information (not recommended for production)'),

  // Feature Flags (optional)
  FEATURE_ANALYTICS: z.enum(['true', 'false']).transform((val) => val === 'true').default('true'),
  FEATURE_HEALTH_CHECK: z.enum(['true', 'false']).transform((val) => val === 'true').default('true'),
})

/**
 * Inferred TypeScript type from schema
 */
export type ApiConfig = z.infer<typeof apiConfigSchema>

/**
 * Parse and validate API configuration
 *
 * @param env - Environment variables (defaults to process.env)
 * @returns Validated and type-safe configuration
 * @throws ZodError if validation fails
 */
export function parseApiConfig(env: Record<string, string | undefined> = process.env): ApiConfig {
  return apiConfigSchema.parse(env)
}

/**
 * Safe parse API configuration (returns result object instead of throwing)
 *
 * @param env - Environment variables (defaults to process.env)
 * @returns Success result with data or error result with issues
 */
export function safeParseApiConfig(env: Record<string, string | undefined> = process.env) {
  return apiConfigSchema.safeParse(env)
}
