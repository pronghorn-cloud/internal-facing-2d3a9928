/**
 * Auth Middleware — Unit Tests
 *
 * Tests the four middleware functions that protect API routes:
 *   requireAuth     — enforces authenticated session with Zod validation
 *   requireRole     — enforces one or more roles (chained after requireAuth)
 *   requireRecentAuth — enforces recent authentication timestamp
 *   optionalAuth    — attaches user if present, never rejects
 *
 * Express req/res/next are mocked. logSecurityEvent is mocked to verify
 * that security-relevant events are logged without hitting real I/O.
 *
 * @template/auth is mocked to provide AuthUserSchema (workspace package
 * resolution can fail in vitest without build artifacts).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'

// Mock @template/auth — provide the real Zod schema used by the middleware
vi.mock('@template/auth', () => ({
  AuthUserSchema: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    roles: z.array(z.string()).optional(),
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  }),
}))

// Mock the logger middleware to spy on security event logging
vi.mock('./logger.middleware.js', () => ({
  logSecurityEvent: vi.fn(),
}))

import { requireAuth, requireRole, requireRecentAuth, optionalAuth } from './auth.middleware.js'
import { logSecurityEvent } from './logger.middleware.js'

// ─── Test helpers ──────────────────────────────────────────────────────

const VALID_USER = {
  id: 'user-1',
  email: 'dev@gov.ab.ca',
  name: 'Dev User',
  roles: ['admin', 'user'],
}

function mockRequest(overrides: Record<string, any> = {}): Request {
  return {
    session: { user: undefined, destroy: vi.fn((cb: Function) => cb()) },
    ip: '127.0.0.1',
    path: '/test',
    method: 'GET',
    ...overrides,
  } as unknown as Request
}

function mockResponse(): Response {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res as Response
}

let next: NextFunction

beforeEach(() => {
  vi.clearAllMocks()
  next = vi.fn()
})

// ─── requireAuth ───────────────────────────────────────────────────────

describe('requireAuth', () => {
  it('should return 401 when session has no user', () => {
    const req = mockRequest()
    const res = mockResponse()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should log "authz.denied.unauthenticated" when no user present', () => {
    const req = mockRequest()
    const res = mockResponse()

    requireAuth(req, res, next)

    expect(logSecurityEvent).toHaveBeenCalledWith(
      'authz.denied.unauthenticated',
      undefined,
      expect.objectContaining({ ip: '127.0.0.1' })
    )
  })

  it('should return 401 and destroy session when user data fails schema validation', () => {
    // Invalid: missing "name" field
    const req = mockRequest({ session: { user: { id: '1', email: 'x' }, destroy: vi.fn((cb: Function) => cb()) } })
    const res = mockResponse()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(req.session.destroy).toHaveBeenCalled()
    expect(logSecurityEvent).toHaveBeenCalledWith(
      'authz.denied.invalid_session',
      undefined,
      expect.any(Object)
    )
  })

  it('should set req.user and call next() for a valid session user', () => {
    const req = mockRequest({ session: { user: VALID_USER } })
    const res = mockResponse()

    requireAuth(req, res, next)

    expect((req as any).user).toMatchObject({ id: VALID_USER.id })
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})

// ─── requireRole ───────────────────────────────────────────────────────

describe('requireRole', () => {
  it('should return 401 when req.user is not set (requireAuth not called)', () => {
    const req = mockRequest()
    const res = mockResponse()
    const middleware = requireRole('admin')

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 403 when user lacks the required role', () => {
    const req = mockRequest()
    ;(req as any).user = { ...VALID_USER, roles: ['user'] }
    const res = mockResponse()
    const middleware = requireRole('super-admin')

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    )
  })

  it('should log security event with required and user roles on denial', () => {
    const req = mockRequest()
    ;(req as any).user = { ...VALID_USER, roles: ['user'] }
    const res = mockResponse()

    requireRole('super-admin')(req, res, next)

    expect(logSecurityEvent).toHaveBeenCalledWith(
      'authz.denied.insufficient_role',
      VALID_USER.id,
      expect.objectContaining({ requiredRoles: ['super-admin'], userRoles: ['user'] })
    )
  })

  it('should call next() when user has the required role', () => {
    const req = mockRequest()
    ;(req as any).user = VALID_USER
    const res = mockResponse()

    requireRole('admin')(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should succeed when any one of multiple roles matches (OR logic)', () => {
    const req = mockRequest()
    ;(req as any).user = { ...VALID_USER, roles: ['user'] }
    const res = mockResponse()

    requireRole('admin', 'user')(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})

// ─── requireRecentAuth ─────────────────────────────────────────────────

describe('requireRecentAuth', () => {
  it('should return 401 when req.user is not set', () => {
    const req = mockRequest()
    const res = mockResponse()

    requireRecentAuth(15)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('should return 401 when lastAuthAt is missing from session', () => {
    const req = mockRequest({ session: {} })
    ;(req as any).user = VALID_USER
    const res = mockResponse()

    requireRecentAuth(15)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'REAUTHENTICATION_REQUIRED' }),
      })
    )
  })

  it('should return 401 when session is older than maxAgeMinutes', () => {
    const twentyMinutesAgo = Date.now() - 20 * 60 * 1000
    const req = mockRequest({ session: { lastAuthAt: twentyMinutesAgo } })
    ;(req as any).user = VALID_USER
    const res = mockResponse()

    requireRecentAuth(15)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('should call next() when session is recent enough', () => {
    const req = mockRequest({ session: { lastAuthAt: Date.now() } })
    ;(req as any).user = VALID_USER
    const res = mockResponse()

    requireRecentAuth(15)(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})

// ─── optionalAuth ──────────────────────────────────────────────────────

describe('optionalAuth', () => {
  it('should attach user to req when session user is present', () => {
    const req = mockRequest({ session: { user: VALID_USER } })
    const res = mockResponse()

    optionalAuth(req, res, next)

    expect((req as any).user).toMatchObject({ id: VALID_USER.id })
    expect(next).toHaveBeenCalled()
  })

  it('should call next() without error when no user present', () => {
    const req = mockRequest()
    const res = mockResponse()

    optionalAuth(req, res, next)

    expect((req as any).user).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })
})
