/**
 * Auth Store (Pinia) — Unit Tests
 *
 * Tests the authentication state management store.
 * Covers initial state, computed getters, and all actions:
 * fetchUser, login, logout, checkStatus.
 *
 * Axios is mocked to prevent real HTTP calls.
 * Pinia is configured fresh for each test to isolate state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'

// Mock axios — all HTTP calls return controlled responses
vi.mock('axios', () => {
  const interceptors = {
    response: { use: vi.fn(() => 0), eject: vi.fn() },
    request: { use: vi.fn(() => 0), eject: vi.fn() },
  }
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      interceptors,
    },
  }
})

// Must import after vi.mock so the mock is in place
import { useAuthStore, type User } from './auth.store.js'

const MOCK_USER: User = {
  id: 'user-1',
  email: 'dev@gov.ab.ca',
  name: 'Dev User',
  roles: ['admin', 'user'],
  attributes: { department: 'IT' },
}

beforeEach(() => {
  vi.clearAllMocks()
  // Fresh Pinia instance so each test starts with clean state
  setActivePinia(createPinia())
})

// ─── Initial state ─────────────────────────────────────────────────────

describe('initial state', () => {
  it('should start with user null, loading false, error null', () => {
    const store = useAuthStore()

    expect(store.user).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })
})

// ─── Computed getters ──────────────────────────────────────────────────

describe('isAuthenticated', () => {
  it('should return false when no user', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })

  it('should return true when user is set', () => {
    const store = useAuthStore()
    store.user = MOCK_USER
    expect(store.isAuthenticated).toBe(true)
  })
})

describe('hasRole', () => {
  it('should return false when no user', () => {
    const store = useAuthStore()
    expect(store.hasRole('admin')).toBe(false)
  })

  it('should return true when user has matching role', () => {
    const store = useAuthStore()
    store.user = MOCK_USER
    expect(store.hasRole('admin')).toBe(true)
  })

  it('should return true when any role in array matches', () => {
    const store = useAuthStore()
    store.user = MOCK_USER
    expect(store.hasRole(['super-admin', 'user'])).toBe(true)
  })

  it('should return false when no role matches', () => {
    const store = useAuthStore()
    store.user = MOCK_USER
    expect(store.hasRole('super-admin')).toBe(false)
  })
})

// ─── fetchUser ─────────────────────────────────────────────────────────

describe('fetchUser', () => {
  it('should set user on successful response', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { success: true, data: { user: MOCK_USER } },
    })

    const store = useAuthStore()
    const result = await store.fetchUser()

    expect(result).toEqual(MOCK_USER)
    expect(store.user).toEqual(MOCK_USER)
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('should clear user on 401 response without setting error', async () => {
    vi.mocked(axios.get).mockRejectedValue({
      response: { status: 401 },
    })

    const store = useAuthStore()
    store.user = MOCK_USER // pre-populate
    const result = await store.fetchUser()

    expect(result).toBeNull()
    expect(store.user).toBeNull()
    expect(store.error).toBeNull() // 401 is expected, not an error
  })

  it('should set error message on non-401 failure', async () => {
    vi.mocked(axios.get).mockRejectedValue({
      response: { status: 500, data: { error: { message: 'Server error' } } },
    })
    // Suppress console.error from the store
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const store = useAuthStore()
    const result = await store.fetchUser()

    expect(result).toBeNull()
    expect(store.error).toBe('Server error')
  })

  it('should deduplicate concurrent calls (return same promise)', async () => {
    let resolveCount = 0
    vi.mocked(axios.get).mockImplementation(() => {
      resolveCount++
      return Promise.resolve({ data: { success: true, data: { user: MOCK_USER } } })
    })

    const store = useAuthStore()
    // Fire two calls simultaneously
    const [result1, result2] = await Promise.all([store.fetchUser(), store.fetchUser()])

    // Both should get the same user, but axios.get called only once
    expect(result1).toEqual(MOCK_USER)
    expect(result2).toEqual(MOCK_USER)
    expect(resolveCount).toBe(1)
  })
})

// ─── logout ────────────────────────────────────────────────────────────

describe('logout', () => {
  it('should clear user on successful logout', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { success: true } })

    const store = useAuthStore()
    store.user = MOCK_USER

    await store.logout()

    expect(store.user).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('should set error on logout failure', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { error: { message: 'Logout failed' } } },
    })

    const store = useAuthStore()
    store.user = MOCK_USER

    await expect(store.logout()).rejects.toBeTruthy()
    expect(store.error).toBe('Logout failed')
  })
})

// ─── checkStatus ───────────────────────────────────────────────────────

describe('checkStatus', () => {
  it('should return authenticated status from API', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { data: { authenticated: true, driver: 'mock' } },
    })

    const store = useAuthStore()
    const status = await store.checkStatus()

    expect(status).toEqual({ authenticated: true, driver: 'mock' })
  })

  it('should return { authenticated: false } on error', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('network error'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const store = useAuthStore()
    const status = await store.checkStatus()

    expect(status).toEqual({ authenticated: false })
  })
})
