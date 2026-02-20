/**
 * BaseAuthDriver — Unit Tests
 *
 * Tests the abstract base class shared by all auth drivers.
 * Covers AuthUserSchema validation, session read/write/clear,
 * session regeneration with CSRF preservation, and role checking.
 *
 * A concrete stub class extends BaseAuthDriver for testing
 * the non-abstract (inherited) methods.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseAuthDriver, AuthUserSchema, type AuthUser, type AuthConfig } from './base.driver.js'
import type { Request, Response } from 'express'

/**
 * Minimal concrete subclass — only the abstract methods are stubbed
 * so we can test the inherited logic in BaseAuthDriver.
 */
class StubDriver extends BaseAuthDriver {
  getDriverName() { return 'stub' }
  async login(_req: Request, _res: Response) {}
  async callback(_req: Request, _res: Response): Promise<AuthUser> {
    return { id: '1', email: 'test@test.com', name: 'Test' }
  }
  async logout(_req: Request, _res: Response) {}

  // Expose protected methods for testing
  public testSaveUserToSession(req: Request, user: AuthUser) {
    return this.saveUserToSession(req, user)
  }
  public testClearUserFromSession(req: Request) {
    return this.clearUserFromSession(req)
  }
}

/** Helper: build a mock Express request with session support */
function mockRequest(sessionData: Record<string, any> = {}): Request {
  return {
    session: {
      ...sessionData,
      regenerate: vi.fn((cb: (err?: Error) => void) => cb()),
      save: vi.fn((cb: (err?: Error) => void) => cb()),
      destroy: vi.fn((cb: (err?: Error) => void) => cb()),
    },
  } as unknown as Request
}

const VALID_USER: AuthUser = {
  id: 'user-1',
  email: 'dev@gov.ab.ca',
  name: 'Dev User',
  roles: ['admin', 'user'],
  attributes: { department: 'IT' },
}

let driver: StubDriver

beforeEach(() => {
  driver = new StubDriver({ callbackUrl: 'http://localhost:3000/cb' })
})

// ─── AuthUserSchema ────────────────────────────────────────────────────

describe('AuthUserSchema', () => {
  it('should validate a complete user object', () => {
    const result = AuthUserSchema.safeParse(VALID_USER)
    expect(result.success).toBe(true)
  })

  it('should reject when required fields are missing', () => {
    expect(AuthUserSchema.safeParse({ email: 'a@b.c', name: 'A' }).success).toBe(false) // no id
    expect(AuthUserSchema.safeParse({ id: '1', name: 'A' }).success).toBe(false)         // no email
    expect(AuthUserSchema.safeParse({ id: '1', email: 'a@b.c' }).success).toBe(false)    // no name
  })

  it('should accept a user without optional roles and attributes', () => {
    const result = AuthUserSchema.safeParse({ id: '1', email: 'a@b.c', name: 'A' })
    expect(result.success).toBe(true)
  })

  it('should reject non-string values in the roles array', () => {
    const result = AuthUserSchema.safeParse({ ...VALID_USER, roles: [123] })
    expect(result.success).toBe(false)
  })
})

// ─── getUser ───────────────────────────────────────────────────────────

describe('getUser', () => {
  it('should return null when session has no user', () => {
    const req = mockRequest()
    expect(driver.getUser(req)).toBeNull()
  })

  it('should return null when session user fails schema validation', () => {
    // Invalid user: missing required "name" field
    const req = mockRequest({ user: { id: '1', email: 'x' } })
    expect(driver.getUser(req)).toBeNull()
  })

  it('should return validated user when session data is valid', () => {
    const req = mockRequest({ user: VALID_USER })
    const user = driver.getUser(req)

    expect(user).not.toBeNull()
    expect(user!.id).toBe(VALID_USER.id)
    expect(user!.email).toBe(VALID_USER.email)
  })
})

// ─── hasRole ───────────────────────────────────────────────────────────

describe('hasRole', () => {
  it('should return false for null user', () => {
    expect(driver.hasRole(null, 'admin')).toBe(false)
  })

  it('should return false when user has no roles array', () => {
    const noRoles = { id: '1', email: 'a@b.c', name: 'A' } as AuthUser
    expect(driver.hasRole(noRoles, 'admin')).toBe(false)
  })

  it('should return true when user has matching single role', () => {
    expect(driver.hasRole(VALID_USER, 'admin')).toBe(true)
  })

  it('should return true when any role in array matches (OR logic)', () => {
    expect(driver.hasRole(VALID_USER, ['super-admin', 'user'])).toBe(true)
  })

  it('should return false when no roles match', () => {
    expect(driver.hasRole(VALID_USER, ['super-admin', 'manager'])).toBe(false)
  })
})

// ─── saveUserToSession ─────────────────────────────────────────────────

describe('saveUserToSession', () => {
  it('should regenerate session and save user', async () => {
    const req = mockRequest()
    await driver.testSaveUserToSession(req, VALID_USER)

    expect(req.session.regenerate).toHaveBeenCalled()
    expect(req.session.save).toHaveBeenCalled()
    expect((req.session as any).user).toEqual(VALID_USER)
  })

  it('should preserve CSRF secret across session regeneration', async () => {
    const req = mockRequest({ csrfSecret: 'my-csrf-secret' })
    await driver.testSaveUserToSession(req, VALID_USER)

    expect((req.session as any).csrfSecret).toBe('my-csrf-secret')
  })

  it('should set lastAuthAt timestamp', async () => {
    const req = mockRequest()
    const before = Date.now()
    await driver.testSaveUserToSession(req, VALID_USER)
    const after = Date.now()

    const lastAuthAt = (req.session as any).lastAuthAt as number
    expect(lastAuthAt).toBeGreaterThanOrEqual(before)
    expect(lastAuthAt).toBeLessThanOrEqual(after)
  })

  it('should reject if session regeneration fails', async () => {
    const req = mockRequest()
    ;(req.session.regenerate as any).mockImplementation((cb: (err?: Error) => void) =>
      cb(new Error('regenerate failed'))
    )

    await expect(driver.testSaveUserToSession(req, VALID_USER)).rejects.toThrow('regenerate failed')
  })
})

// ─── clearUserFromSession ──────────────────────────────────────────────

describe('clearUserFromSession', () => {
  it('should remove user from session', () => {
    const req = mockRequest({ user: VALID_USER })
    driver.testClearUserFromSession(req)
    expect((req.session as any).user).toBeUndefined()
  })
})
