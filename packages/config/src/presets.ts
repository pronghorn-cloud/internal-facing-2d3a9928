/**
 * Configuration Presets
 *
 * Provides pre-configured environment variable templates for different deployment scenarios
 */

export interface ConfigPreset {
  name: string
  description: string
  variables: Record<string, string>
}

/**
 * Internal Deployment Preset (Microsoft Entra ID)
 *
 * For internal government applications where staff authenticate with Microsoft 365
 */
export const internalPreset: ConfigPreset = {
  name: 'Internal (Entra ID)',
  description: 'Configuration for internal government employee applications using Microsoft Entra ID authentication',
  variables: {
    // Application
    NODE_ENV: 'production',
    PORT: '3000',
    APP_NAME: 'Alberta Government Internal Application',

    // Authentication
    AUTH_DRIVER: 'entra-id',
    AUTH_CALLBACK_URL: 'https://internal.app.alberta.ca/api/v1/auth/callback',

    // Entra ID (requires additional variables in actual .env)
    // ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET must be provided
    ENTRA_SCOPE: 'openid profile email',
    ENTRA_RESPONSE_TYPE: 'code',
    ENTRA_RESPONSE_MODE: 'query',

    // Service-to-service auth (for public-facing app)
    SERVICE_AUTH_ENABLED: 'true',
    // SERVICE_AUTH_TENANT_ID defaults to ENTRA_TENANT_ID
    // SERVICE_AUTH_AUDIENCE defaults to api://{ENTRA_CLIENT_ID}
    // SERVICE_AUTH_ALLOWED_CLIENT_IDS must be set to the public-facing app's client ID

    // Frontend
    WEB_URL: 'https://internal.app.alberta.ca',
    CORS_ORIGIN: 'https://internal.app.alberta.ca',

    // Session
    SESSION_STORE: 'postgres',
    SESSION_MAX_AGE: '86400000', // 24 hours
    SESSION_COOKIE_SAME_SITE: 'lax',

    // Security (higher limits for internal users)
    RATE_LIMIT_MAX: '1000',
    AUTH_RATE_LIMIT_MAX: '10',
    SERVICE_RATE_LIMIT_MAX: '500',

    // Logging
    LOG_LEVEL: 'info',
    LOG_FORMAT: 'combined',
    LOG_PII: 'false'
  }
}

/**
 * Development Preset (Mock Authentication)
 *
 * For local development without requiring real IdP
 */
export const developmentPreset: ConfigPreset = {
  name: 'Development (Mock)',
  description: 'Configuration for local development with mock authentication',
  variables: {
    // Application
    NODE_ENV: 'development',
    PORT: '3000',
    APP_NAME: 'Alberta Government Internal Application',

    // Database
    DB_CONNECTION_STRING: '',  // Set via .env (see .env.example for format)
    DB_SSL: 'false',

    // Authentication
    AUTH_DRIVER: 'mock',
    AUTH_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/callback',

    // Service-to-service auth (disabled in dev by default)
    SERVICE_AUTH_ENABLED: 'false',

    // Frontend
    WEB_URL: 'http://localhost:5173',
    CORS_ORIGIN: 'http://localhost:5173',

    // Session
    SESSION_SECRET: '',  // Set via .env: openssl rand -base64 32
    SESSION_STORE: 'postgres',
    SESSION_MAX_AGE: '86400000', // 24 hours
    SESSION_COOKIE_SAME_SITE: 'lax',
    SESSION_COOKIE_SECURE: 'false', // HTTP allowed in development

    // Security (relaxed for development)
    RATE_LIMIT_MAX: '10000',
    AUTH_RATE_LIMIT_MAX: '100',
    SERVICE_RATE_LIMIT_MAX: '10000',

    // Logging
    LOG_LEVEL: 'debug',
    LOG_FORMAT: 'dev',
    LOG_PII: 'true', // Allowed in development for debugging

    // Feature Flags
    FEATURE_ANALYTICS: 'true',
    FEATURE_HEALTH_CHECK: 'true'
  }
}

/**
 * Get preset by name
 */
export function getPreset(name: 'internal' | 'development'): ConfigPreset {
  switch (name) {
    case 'internal':
      return internalPreset
    case 'development':
      return developmentPreset
    default:
      throw new Error(`Unknown preset: ${name}`)
  }
}

/**
 * Generate .env file content from preset
 *
 * @param preset - Configuration preset
 * @param includeComments - Include descriptive comments (default: true)
 * @returns .env file content as string
 */
export function generateEnvFile(preset: ConfigPreset, includeComments = true): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push('# =============================================================================')
    lines.push(`# ${preset.name}`)
    lines.push('# =============================================================================')
    lines.push(`# ${preset.description}`)
    lines.push('# =============================================================================')
    lines.push('')
  }

  for (const [key, value] of Object.entries(preset.variables)) {
    lines.push(`${key}=${value}`)
  }

  return lines.join('\n')
}
