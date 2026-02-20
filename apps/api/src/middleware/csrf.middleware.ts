/**
 * CSRF Protection Middleware
 *
 * Implements token-based CSRF protection using the csrf package.
 * Tokens are generated for GET requests and validated for state-changing requests (POST, PUT, PATCH, DELETE).
 */

import Tokens from 'csrf'
import type { Request, Response, NextFunction } from 'express'
import { logSecurityEvent } from './logger.middleware.js'

const tokens = new Tokens()

/**
 * Generate CSRF secret and store in session
 */
function ensureCsrfSecret(req: Request): string {
  if (!(req.session as any).csrfSecret) {
    ;(req.session as any).csrfSecret = tokens.secretSync()
  }
  return (req.session as any).csrfSecret
}

/**
 * CSRF middleware that generates tokens for GET requests
 * and validates tokens for state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for health check endpoints
  if (req.path === '/api/v1/health' || req.path === '/api/v1/info') {
    return next()
  }

  // Skip CSRF for authentication callback endpoints (handled by auth providers)
  if (req.path.includes('/auth/callback')) {
    return next()
  }

  // Skip CSRF for public API routes (service-to-service uses Bearer tokens, not sessions)
  if (req.path.startsWith('/api/v1/public')) {
    return next()
  }

  const secret = ensureCsrfSecret(req)

  // For safe methods (GET, HEAD, OPTIONS), generate a new token and attach to response
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    const token = tokens.create(secret)
    res.locals.csrfToken = token
    // Set token in response header for frontend to retrieve
    res.setHeader('X-CSRF-Token', token)
    return next()
  }

  // For state-changing methods (POST, PUT, PATCH, DELETE), validate token
  const token = req.headers['x-csrf-token'] as string || req.body?._csrf

  if (!token) {
    logSecurityEvent('csrf.missing', (req.session as any)?.user?.id, {
      ip: req.ip,
      path: req.path,
      method: req.method,
    })
    res.status(403).json({
      success: false,
      error: {
        message: 'CSRF token missing',
        code: 'CSRF_MISSING',
      },
    })
    return
  }

  if (!tokens.verify(secret, token)) {
    logSecurityEvent('csrf.invalid', (req.session as any)?.user?.id, {
      ip: req.ip,
      path: req.path,
      method: req.method,
    })
    res.status(403).json({
      success: false,
      error: {
        message: 'Invalid CSRF token',
        code: 'CSRF_INVALID',
      },
    })
    return
  }

  next()
}

/**
 * Endpoint to retrieve CSRF token
 * Frontend can call this to get a token before making state-changing requests
 */
export function csrfTokenEndpoint(req: Request, res: Response): void {
  const secret = ensureCsrfSecret(req)
  const token = tokens.create(secret)

  res.json({
    success: true,
    data: {
      csrfToken: token,
    },
  })
}
