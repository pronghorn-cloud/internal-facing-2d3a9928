/**
 * MockAuthDriver — Unit Tests
 *
 * Tests the mock authentication driver used for local development.
 * Covers the production guard, default/custom user lists,
 * login redirect, callback user lookup, session handling, and logout.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MockAuthDriver } from './mock.driver.js'
import type { AuthUser } from './base.driver.js'
import type { Request, Response } from 'express'

/** Helper: build a mock Express request */
function mockRequest(overrides: Record<string, any> = {}): Request {
  return {
    query: {},
    session: {
      regenerate: vi.fn((cb: (err?: Error) => void) => cb()),
      save: vi.fn((cb: (err?: Error) => void) => cb()),
      destroy: vi.fn((cb: (err?: Error) => void) => cb()),
    },
    ...overrides,
  } as unknown as Request
}

/** Helper: build a mock Express response */
function mockResponse(): Response {
  return {
    redirect: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response
}

const CALLBACK_URL = 'http://localhost:3000/api/v1/auth/callback'

let originalNodeEnv: string | undefined

beforeEach(() => {
  originalNodeEnv = process.env.NODE_ENV
  // Ensure we're not in production for most tests
  process.env.NODE_ENV = 'development'
})

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
})

// ─── Constructor ───────────────────────────────────────────────────────

describe('MockAuthDriver constructor', () => {
  it('should throw when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production'

    expect(() => new MockAuthDriver({ callbackUrl: CALLBACK_URL })).toThrow(
      'MockAuthDriver cannot be used in production'
    )
  })

  it('should create 3 default mock users when none provided', () => {
    const driver = new MockAuthDriver({ callbackUrl: CALLBACK_URL })
    expect(driver.getMockUsers()).toHaveLength(3)
  })

  it('should use custom mock users when provided', () => {
    const customUsers: AuthUser[] = [
      { id: 'custom-1', email: 'custom@test.com', name: 'Custom User' },
    ]
    const driver = new MockAuthDriver({ callbackUrl: CALLBACK_URL, mockUsers: customUsers })

    expect(driver.getMockUsers()).toHaveLength(1)
    expect(driver.getMockUsers()[0].id).toBe('custom-1')
  })
})

// ─── getDriverName ─────────────────────────────────────────────────────

describe('getDriverName', () => {
  it('should return "mock"', () => {
    const driver = new MockAuthDriver({ callbackUrl: CALLBACK_URL })
    expect(driver.getDriverName()).toBe('mock')
  })
})

// ─── login ─────────────────────────────────────────────────────────────

describe('login', () => {
  it('should redirect to callback URL with first user ID by default', async () => {
    const driver = new MockAuthDriver({ callbackUrl: CALLBACK_URL })
    const req = mockRequest({ query: {} })
    const res = mockResponse()

    await driver.login(req, res)

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining(`${CALLBACK_URL}?mockUserId=`)
    )
  })

  it('should use the user index from query parameter', async () => {
    const driver = new MockAuthDriver({ callbackUrl: CALLBACK_URL })
    const req = mockRequest({ query: { user: '1' } })
    const res = mockResponse()

    await driver.login(req, res)

    // User at index 1 is the admin user (mock-user-2)
    const redirectUrl = (res.redirect as any).mock.calls[0][0] as string
    expect(redirectUrl).toContain('mockUserId=mock-user-2')
  })
})

// ─── callback ──────────────────────────────────────────────────────────

describe('callback', () => {
  it('should find user by mockUserId query param', async () => {
    const driver = new MockAuthDriver({ callbackUrl: CALLBACK_URL })
    const req = mockRequest({ query: { mockUserId: 'mock-user-2' } })
    const res = mockResponse()

    const user = await driver.callback(req, res)

    expect(user.id).toBe('mock-user-2')
    expect(user.name).toBe('Mock Admin')
  })

  it('should default to first user when mockUserId is not found', async () => {
    const driver = new MockAuthDriver({ callbackUrl: CALLBACK_URL })
    const req = mockRequest({ query: { mockUserId: 'nonexistent' } })
    const res = mockResponse()

    const user = await driver.callback(req, res)

    expect(user.id).toBe('mock-user-1')
  })

  it('should save user to session', async () => {
    const driver = new MockAuthDriver({ callbackUrl: CALLBACK_URL })
    const req = mockRequest({ query: { mockUserId: 'mock-user-1' } })
    const res = mockResponse()

    await driver.callback(req, res)

    // saveUserToSession calls regenerate then save
    expect(req.session.regenerate).toHaveBeenCalled()
    expect(req.session.save).toHaveBeenCalled()
  })
})

// ─── logout ────────────────────────────────────────────────────────────

describe('logout', () => {
  it('should destroy session and clear cookie', async () => {
    const driver = new MockAuthDriver({ callbackUrl: CALLBACK_URL })
    const req = mockRequest()
    const res = mockResponse()

    await driver.logout(req, res)

    expect(req.session.destroy).toHaveBeenCalled()
    expect(res.clearCookie).toHaveBeenCalledWith('connect.sid')
  })
})

// ─── getMockUsers ──────────────────────────────────────────────────────

describe('getMockUsers', () => {
  it('should return default users with expected roles', () => {
    const driver = new MockAuthDriver({ callbackUrl: CALLBACK_URL })
    const users = driver.getMockUsers()

    expect(users[0].roles).toContain('developer')
    expect(users[1].roles).toContain('admin')
    expect(users[2].roles).toContain('user')
  })
})
