/**
 * CSRF Middleware — Unit Tests
 *
 * Tests token generation for safe methods (GET/HEAD/OPTIONS),
 * token validation for state-changing methods (POST/PUT/PATCH/DELETE),
 * endpoint skip logic, and the dedicated CSRF token endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { csrfProtection, csrfTokenEndpoint } from './csrf.middleware.js'
import type { Request, Response, NextFunction } from 'express'

// Mock security event logger
vi.mock('./logger.middleware.js', () => ({
  logSecurityEvent: vi.fn(),
}))

// ─── Test helpers ──────────────────────────────────────────────────────

function mockRequest(overrides: Record<string, any> = {}): Request {
  return {
    method: 'GET',
    path: '/test',
    headers: {},
    body: {},
    session: {},
    ...overrides,
  } as unknown as Request
}

function mockResponse(): Response {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    locals: {},
  }
  return res as Response
}

let next: NextFunction

beforeEach(() => {
  vi.clearAllMocks()
  next = vi.fn()
})

// ─── Skip logic ────────────────────────────────────────────────────────

describe('csrfProtection — skip paths', () => {
  it('should skip CSRF for /api/v1/health', () => {
    const req = mockRequest({ path: '/api/v1/health', method: 'POST' })
    const res = mockResponse()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should skip CSRF for /api/v1/info', () => {
    const req = mockRequest({ path: '/api/v1/info', method: 'POST' })
    const res = mockResponse()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('should skip CSRF for auth callback paths', () => {
    const req = mockRequest({ path: '/api/v1/auth/callback', method: 'POST' })
    const res = mockResponse()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})

// ─── Token generation (GET/HEAD/OPTIONS) ───────────────────────────────

describe('csrfProtection — safe methods', () => {
  it('should generate a token and set X-CSRF-Token header on GET', () => {
    const req = mockRequest({ method: 'GET', session: {} })
    const res = mockResponse()

    csrfProtection(req, res, next)

    // Token should be set in response header
    expect(res.setHeader).toHaveBeenCalledWith('X-CSRF-Token', expect.any(String))
    expect(next).toHaveBeenCalled()
  })

  it('should store CSRF secret in session on first request', () => {
    const session: any = {}
    const req = mockRequest({ method: 'GET', session })
    const res = mockResponse()

    csrfProtection(req, res, next)

    // Session should now contain a csrfSecret
    expect(session.csrfSecret).toBeTruthy()
  })
})

// ─── Token validation (POST/PUT/PATCH/DELETE) ──────────────────────────

describe('csrfProtection — state-changing methods', () => {
  /**
   * Helper: perform a GET first to generate a valid token,
   * then use that token for a subsequent POST.
   */
  function getValidToken(): { token: string; session: any } {
    const session: any = {}
    const getReq = mockRequest({ method: 'GET', session })
    const getRes = mockResponse()

    csrfProtection(getReq, getRes, vi.fn())

    // Extract the token that was set in the header
    const token = (getRes.setHeader as any).mock.calls[0][1] as string
    return { token, session }
  }

  it('should return 403 CSRF_MISSING when no token provided on POST', () => {
    const session: any = { csrfSecret: 'some-secret' }
    const req = mockRequest({ method: 'POST', session, headers: {}, body: {} })
    const res = mockResponse()

    csrfProtection(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'CSRF_MISSING' }) })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should return 403 CSRF_INVALID when token is wrong', () => {
    const session: any = { csrfSecret: 'some-secret' }
    const req = mockRequest({
      method: 'POST',
      session,
      headers: { 'x-csrf-token': 'totally-invalid-token' },
    })
    const res = mockResponse()

    csrfProtection(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'CSRF_INVALID' }) })
    )
  })

  it('should call next() when a valid token is provided in the header', () => {
    const { token, session } = getValidToken()
    const req = mockRequest({
      method: 'POST',
      session,
      headers: { 'x-csrf-token': token },
    })
    const res = mockResponse()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should accept token from request body _csrf field', () => {
    const { token, session } = getValidToken()
    const req = mockRequest({
      method: 'POST',
      session,
      headers: {},
      body: { _csrf: token },
    })
    const res = mockResponse()

    csrfProtection(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})

// ─── csrfTokenEndpoint ─────────────────────────────────────────────────

describe('csrfTokenEndpoint', () => {
  it('should return JSON with a csrfToken', () => {
    const req = mockRequest({ session: {} })
    const res = mockResponse()

    csrfTokenEndpoint(req, res)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { csrfToken: expect.any(String) },
    })
  })
})
