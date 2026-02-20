/**
 * Authentication Middleware
 *
 * Provides middleware functions for protecting routes and checking user roles
 */

import type { Request, Response, NextFunction } from 'express'
import { AuthUserSchema, type AuthUser } from '@template/auth'
import { logSecurityEvent } from './logger.middleware.js'

/**
 * Require authentication - user must be logged in.
 * FINDING-004: Validates session data against Zod schema to prevent
 * deserialization attacks from compromised session stores or IdPs.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const raw = (req.session as any)?.user

  if (!raw) {
    logSecurityEvent('authz.denied.unauthenticated', undefined, {
      ip: req.ip,
      path: req.path,
      method: req.method,
    })
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        details: 'You must be logged in to access this resource'
      }
    })
  }

  const result = AuthUserSchema.safeParse(raw)
  if (!result.success) {
    logSecurityEvent('authz.denied.invalid_session', undefined, {
      ip: req.ip,
      path: req.path,
      reason: 'Session user data failed schema validation',
    })
    req.session.destroy(() => {})
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        details: 'Session data is invalid or corrupted'
      }
    })
  }

  // Attach validated user to request for easy access
  ;(req as any).user = result.data as AuthUser
  next()
}

/**
 * Require specific role(s).
 * MUST be chained after requireAuth, which validates session data and sets req.user.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      })
    }

    const userRoles = user.roles || []
    const hasRequiredRole = roles.some((role) => userRoles.includes(role))

    if (!hasRequiredRole) {
      logSecurityEvent('authz.denied.insufficient_role', user.id, {
        ip: req.ip,
        path: req.path,
        method: req.method,
        requiredRoles: roles,
        userRoles,
      })
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: `Required role(s): ${roles.join(', ')}`
        }
      })
    }

    next()
  }
}

/**
 * REQ-P2-05: Require recent authentication for sensitive operations.
 * Returns 401 if the session's last authentication is older than maxAgeMinutes.
 * Pair with IdP re-auth (prompt=login / ForceAuthn=true) on the frontend.
 *
 * MUST be chained after requireAuth, which validates session data and sets req.user.
 */
export function requireRecentAuth(maxAgeMinutes: number = 15) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      })
    }

    const lastAuthAt = (req.session as any)?.lastAuthAt as number | undefined
    if (!lastAuthAt || Date.now() - lastAuthAt > maxAgeMinutes * 60 * 1000) {
      logSecurityEvent('authz.denied.stale_session', user.id, {
        ip: req.ip,
        path: req.path,
        lastAuthAt,
        maxAgeMinutes,
      })
      return res.status(401).json({
        success: false,
        error: {
          code: 'REAUTHENTICATION_REQUIRED',
          message: `Session authentication is older than ${maxAgeMinutes} minutes. Please re-authenticate.`,
        },
      })
    }

    next()
  }
}

/**
 * Optional authentication - doesn't fail if not authenticated
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const user = (req.session as any)?.user as AuthUser | undefined

  if (user) {
    ;(req as any).user = user
  }

  next()
}
