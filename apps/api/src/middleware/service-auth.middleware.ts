/**
 * Service-to-Service Authentication Middleware
 *
 * Validates Azure AD access tokens issued via the OAuth 2.0 Client Credentials flow.
 * Used by the public-facing application to call internal API endpoints at /api/v1/public/*.
 *
 * Flow:
 * 1. Public-facing app obtains a token from Azure AD using client_id + client_secret
 * 2. Public-facing app sends requests with Authorization: Bearer <token>
 * 3. This middleware validates the token signature, issuer, audience, and client ID
 *
 * Azure AD App Registration setup:
 * - Internal API must expose an API scope (e.g., api://{client-id})
 * - Public-facing app must have an app registration with client credentials
 * - Internal API must grant the public-facing app permission via "Application permissions"
 */

import type { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { logSecurityEvent } from './logger.middleware.js'
import { logger } from '../utils/logger.js'

interface ServiceAuthConfig {
  tenantId: string
  audience: string
  allowedClientIds: string[]
}

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null
let cachedTenantId: string | null = null

/**
 * Lazily create and cache a remote JWKS fetcher for the Azure AD tenant
 */
function getJwks(tenantId: string): ReturnType<typeof createRemoteJWKSet> {
  if (cachedJwks && cachedTenantId === tenantId) {
    return cachedJwks
  }

  const jwksUrl = new URL(
    `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
  )
  cachedJwks = createRemoteJWKSet(jwksUrl)
  cachedTenantId = tenantId

  return cachedJwks
}

/**
 * Read and validate service auth configuration from environment variables
 */
function getServiceAuthConfig(): ServiceAuthConfig | null {
  if (process.env.SERVICE_AUTH_ENABLED !== 'true') {
    return null
  }

  const tenantId = process.env.SERVICE_AUTH_TENANT_ID || process.env.ENTRA_TENANT_ID
  if (!tenantId) {
    logger.error('SERVICE_AUTH_ENABLED=true but no SERVICE_AUTH_TENANT_ID or ENTRA_TENANT_ID set')
    return null
  }

  const audience = process.env.SERVICE_AUTH_AUDIENCE
    || (process.env.ENTRA_CLIENT_ID ? `api://${process.env.ENTRA_CLIENT_ID}` : '')
  if (!audience) {
    logger.error('SERVICE_AUTH_ENABLED=true but no SERVICE_AUTH_AUDIENCE or ENTRA_CLIENT_ID set')
    return null
  }

  const allowedClientIds = process.env.SERVICE_AUTH_ALLOWED_CLIENT_IDS
    ? process.env.SERVICE_AUTH_ALLOWED_CLIENT_IDS.split(',').map(id => id.trim()).filter(Boolean)
    : []

  return { tenantId, audience, allowedClientIds }
}

/**
 * Middleware: Require a valid Azure AD service token (Client Credentials flow).
 *
 * Validates:
 * - Bearer token is present in Authorization header
 * - Token signature is valid (via JWKS)
 * - Token issuer matches the configured Azure AD tenant
 * - Token audience matches this API's expected audience
 * - Token client ID (appid/azp) is in the allowed list (if configured)
 * - Token is not expired
 */
export function requireServiceAuth(req: Request, res: Response, next: NextFunction): void {
  const config = getServiceAuthConfig()

  if (!config) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_AUTH_NOT_CONFIGURED',
        message: 'Service authentication is not configured',
      },
    })
    return
  }

  // Extract Bearer token
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logSecurityEvent('service_auth.denied.missing_token', undefined, {
      ip: req.ip,
      path: req.path,
    })
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Bearer token required',
      },
    })
    return
  }

  const token = authHeader.slice(7)

  // Validate asynchronously
  validateServiceToken(token, config)
    .then((claims) => {
      // Attach service client info to request for downstream use
      ;(req as any).serviceClient = {
        clientId: claims.azp || claims.appid,
        tenantId: claims.tid,
        roles: claims.roles || [],
      }
      next()
    })
    .catch((error) => {
      logSecurityEvent('service_auth.denied.invalid_token', undefined, {
        ip: req.ip,
        path: req.path,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired service token',
        },
      })
    })
}

/**
 * Validate an Azure AD access token (v2.0 endpoint)
 */
async function validateServiceToken(
  token: string,
  config: ServiceAuthConfig
): Promise<Record<string, any>> {
  const jwks = getJwks(config.tenantId)

  const expectedIssuer = `https://login.microsoftonline.com/${config.tenantId}/v2.0`

  // Verify JWT signature via JWKS, plus issuer and audience claims
  const { payload } = await jwtVerify(token, jwks, {
    issuer: expectedIssuer,
    audience: config.audience,
  })

  const claims = payload as Record<string, any>

  // Validate client ID if allowlist is configured
  if (config.allowedClientIds.length > 0) {
    const clientId = claims.azp || claims.appid
    if (!clientId || !config.allowedClientIds.includes(clientId)) {
      throw new Error(`Client ID "${clientId}" is not in the allowed list`)
    }
  }

  return claims
}

/**
 * Optional service auth - attaches service client info if valid token present,
 * but doesn't fail if no token. Useful for endpoints that serve both internal
 * and service clients.
 */
export function optionalServiceAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  const config = getServiceAuthConfig()
  if (!config) {
    return next()
  }

  const token = authHeader.slice(7)

  validateServiceToken(token, config)
    .then((claims) => {
      ;(req as any).serviceClient = {
        clientId: claims.azp || claims.appid,
        tenantId: claims.tid,
        roles: claims.roles || [],
      }
      next()
    })
    .catch(() => {
      // Token invalid, proceed without service client context
      next()
    })
}
