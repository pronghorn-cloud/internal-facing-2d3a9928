/**
 * @template/auth - Authentication package
 *
 * Provides authentication drivers and utilities for the internal-facing template.
 * Supports Entra ID (staff auth) and Mock (development) drivers.
 */

export { BaseAuthDriver, type AuthUser, type AuthConfig, AuthUserSchema } from './drivers/base.driver.js'
export { MockAuthDriver, type MockAuthConfig } from './drivers/mock.driver.js'
export { EntraIdAuthDriver } from './drivers/entra-id.driver.js'

// Configuration exports
export { parseEntraIdConfig, type EntraIdConfig } from './config/entra-id.config.js'

// Utility exports (REQ-P2-03: Token encryption for downstream API calls)
export { encryptToken, decryptToken } from './utils/token-encryption.js'
