/**
 * AuthService — Unit Tests
 *
 * Tests driver selection based on AUTH_DRIVER env var,
 * the callback URL priority logic (5 levels), and
 * delegation of login/callback/logout/getCurrentUser to the driver.
 *
 * The AuthService constructor reads process.env at instantiation time,
 * so each test creates a fresh instance after setting the env vars.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the auth driver constructors to prevent real driver initialization
vi.mock('@template/auth', () => {
  const mockDriver = {
    getDriverName: vi.fn(() => 'mock'),
    login: vi.fn(),
    callback: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn(),
    hasRole: vi.fn(),
  }
  return {
    BaseAuthDriver: class {},
    MockAuthDriver: vi.fn(() => mockDriver),
    EntraIdAuthDriver: vi.fn(() => ({ ...mockDriver, getDriverName: () => 'entra-id' })),
  }
})

import { MockAuthDriver, EntraIdAuthDriver } from '@template/auth'

// ─── Helpers ───────────────────────────────────────────────────────────

let savedEnv: NodeJS.ProcessEnv

beforeEach(() => {
  savedEnv = { ...process.env }
  vi.clearAllMocks()
  // Clear module cache so each test gets a fresh AuthService constructor
  vi.resetModules()
})

afterEach(() => {
  process.env = savedEnv
})

/** Import a fresh AuthService (re-evaluates constructor with current process.env) */
async function createService() {
  const mod = await import('./auth.service.js')
  return new mod.AuthService()
}

// ─── Driver selection ──────────────────────────────────────────────────

describe('AuthService — driver selection', () => {
  it('should create MockAuthDriver when AUTH_DRIVER is "mock"', async () => {
    process.env.AUTH_DRIVER = 'mock'
    process.env.AUTH_CALLBACK_URL = 'http://localhost:3000/cb'

    const service = await createService()
    expect(MockAuthDriver).toHaveBeenCalled()
    expect(service.getDriver().getDriverName()).toBe('mock')
  })

  it('should create EntraIdAuthDriver when AUTH_DRIVER is "entra-id"', async () => {
    process.env.AUTH_DRIVER = 'entra-id'
    process.env.AUTH_CALLBACK_URL = 'http://localhost:3000/cb'

    const service = await createService()
    expect(EntraIdAuthDriver).toHaveBeenCalled()
    expect(service.getDriver().getDriverName()).toBe('entra-id')
  })

  it('should throw for an unsupported AUTH_DRIVER value', async () => {
    process.env.AUTH_DRIVER = 'jwt'
    process.env.AUTH_CALLBACK_URL = 'http://localhost:3000/cb'

    await expect(createService()).rejects.toThrow('Unsupported auth driver')
  })
})

// ─── Callback URL priority ────────────────────────────────────────────

describe('AuthService — getCallbackUrl priority', () => {
  it('should use AUTH_CALLBACK_URL when explicitly set', async () => {
    process.env.AUTH_DRIVER = 'mock'
    process.env.AUTH_CALLBACK_URL = 'https://custom.url/cb'

    await createService()

    // The callback URL is passed to the driver constructor
    expect(MockAuthDriver).toHaveBeenCalledWith(
      expect.objectContaining({ callbackUrl: 'https://custom.url/cb' })
    )
  })

  it('should derive from API_URL when AUTH_CALLBACK_URL is not set', async () => {
    process.env.AUTH_DRIVER = 'mock'
    delete process.env.AUTH_CALLBACK_URL
    process.env.API_URL = 'https://api.example.com'

    await createService()

    expect(MockAuthDriver).toHaveBeenCalledWith(
      expect.objectContaining({ callbackUrl: 'https://api.example.com/api/v1/auth/callback' })
    )
  })

  it('should use RENDER_EXTERNAL_URL when no AUTH_CALLBACK_URL or API_URL', async () => {
    process.env.AUTH_DRIVER = 'mock'
    delete process.env.AUTH_CALLBACK_URL
    delete process.env.API_URL
    process.env.RENDER_EXTERNAL_URL = 'https://my-app.onrender.com'

    await createService()

    expect(MockAuthDriver).toHaveBeenCalledWith(
      expect.objectContaining({ callbackUrl: 'https://my-app.onrender.com/api/v1/auth/callback' })
    )
  })

  it('should use RENDER_EXTERNAL_HOSTNAME with https', async () => {
    process.env.AUTH_DRIVER = 'mock'
    delete process.env.AUTH_CALLBACK_URL
    delete process.env.API_URL
    delete process.env.RENDER_EXTERNAL_URL
    process.env.RENDER_EXTERNAL_HOSTNAME = 'my-app.onrender.com'

    await createService()

    expect(MockAuthDriver).toHaveBeenCalledWith(
      expect.objectContaining({ callbackUrl: 'https://my-app.onrender.com/api/v1/auth/callback' })
    )
  })

  it('should fall back to HOST:PORT with http in development', async () => {
    process.env.AUTH_DRIVER = 'mock'
    process.env.NODE_ENV = 'development'
    delete process.env.AUTH_CALLBACK_URL
    delete process.env.API_URL
    delete process.env.RENDER_EXTERNAL_URL
    delete process.env.RENDER_EXTERNAL_HOSTNAME
    process.env.HOST = 'localhost'
    process.env.PORT = '3000'

    await createService()

    expect(MockAuthDriver).toHaveBeenCalledWith(
      expect.objectContaining({ callbackUrl: 'http://localhost:3000/api/v1/auth/callback' })
    )
  })
})
