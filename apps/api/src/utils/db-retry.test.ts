/**
 * Database Retry Utility — Unit Tests
 *
 * Tests the retry logic for transient PostgreSQL errors.
 * Covers the SQLSTATE allowlist/denylist, exponential backoff,
 * and the transaction variant (BEGIN/COMMIT/ROLLBACK lifecycle).
 *
 * Uses real timers with maxRetries=1 so retry delays (~100ms + jitter)
 * are fast enough for tests without fake timer complications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { queryWithRetry, transactionWithRetry } from './db-retry.js'

// Mock the logger to suppress output and verify retry logging
vi.mock('./logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// ─── Mock helpers ──────────────────────────────────────────────────────

/** Create a mock pg.Pool */
function mockPool(queryImpl?: (...args: any[]) => any) {
  return {
    query: vi.fn(queryImpl || (() => Promise.resolve({ rows: [], rowCount: 0 }))),
    connect: vi.fn(),
  } as any
}

/** Create a mock pg.PoolClient */
function mockClient(queryImpl?: (...args: any[]) => any) {
  return {
    query: vi.fn(queryImpl || (() => Promise.resolve({ rows: [] }))),
    release: vi.fn(),
  } as any
}

/** Create a PostgreSQL error with a SQLSTATE code */
function pgError(code: string, message = 'db error'): Error & { code: string } {
  const err = new Error(message) as Error & { code: string }
  err.code = code
  return err
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── queryWithRetry ────────────────────────────────────────────────────

describe('queryWithRetry', () => {
  it('should return result on first success (no retry)', async () => {
    const pool = mockPool(() => Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 }))

    const result = await queryWithRetry(pool, 'SELECT 1')

    expect(result.rows).toEqual([{ id: 1 }])
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('should throw non-retryable errors immediately without retry', async () => {
    // 23505 = unique_violation (integrity constraint — not retryable)
    const pool = mockPool(() => Promise.reject(pgError('23505')))

    await expect(queryWithRetry(pool, 'INSERT ...')).rejects.toThrow()
    expect(pool.query).toHaveBeenCalledTimes(1) // no retry
  })

  it('should throw immediately for syntax errors (42xxx)', async () => {
    const pool = mockPool(() => Promise.reject(pgError('42601')))

    await expect(queryWithRetry(pool, 'BAD SQL')).rejects.toThrow()
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('should throw immediately for data exceptions (22xxx)', async () => {
    const pool = mockPool(() => Promise.reject(pgError('22003')))

    await expect(queryWithRetry(pool, 'SELECT ...')).rejects.toThrow()
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('should throw immediately when error has no sqlState code', async () => {
    const pool = mockPool(() => Promise.reject(new Error('generic error')))

    await expect(queryWithRetry(pool, 'SELECT 1')).rejects.toThrow('generic error')
    expect(pool.query).toHaveBeenCalledTimes(1)
  })

  it('should retry on retryable error then succeed', async () => {
    let attempt = 0
    const pool = mockPool(() => {
      attempt++
      if (attempt === 1) return Promise.reject(pgError('57P01')) // admin_shutdown
      return Promise.resolve({ rows: [{ ok: true }] })
    })

    const result = await queryWithRetry(pool, 'SELECT 1', undefined, 1)

    expect(result.rows).toEqual([{ ok: true }])
    expect(pool.query).toHaveBeenCalledTimes(2) // 1 failure + 1 success
  })

  it('should throw after all retries are exhausted', async () => {
    // Always fails with retryable error
    const pool = mockPool(() => Promise.reject(pgError('53300'))) // too_many_connections

    await expect(queryWithRetry(pool, 'SELECT 1', undefined, 1)).rejects.toThrow('db error')
    expect(pool.query).toHaveBeenCalledTimes(2) // initial + 1 retry
  })

  it.each([
    '57P01', '57P02', '57P03', // admin shutdown
    '40001', '40P01',          // serialization / deadlock
    '08006', '08001', '08004', // connection errors
    '53300',                   // too many connections
  ])('should treat SQLSTATE %s as retryable', async (code) => {
    let attempt = 0
    const pool = mockPool(() => {
      attempt++
      if (attempt === 1) return Promise.reject(pgError(code))
      return Promise.resolve({ rows: [] })
    })

    await queryWithRetry(pool, 'SELECT 1', undefined, 1)

    expect(pool.query).toHaveBeenCalledTimes(2)
  })
})

// ─── transactionWithRetry ──────────────────────────────────────────────

describe('transactionWithRetry', () => {
  it('should execute BEGIN → callback → COMMIT on success', async () => {
    const client = mockClient()
    const pool = mockPool()
    pool.connect.mockResolvedValue(client)

    await transactionWithRetry(pool, async (c) => {
      await c.query('INSERT INTO t VALUES (1)')
      return 'done'
    })

    // Verify transaction lifecycle
    expect(client.query).toHaveBeenCalledWith('BEGIN')
    expect(client.query).toHaveBeenCalledWith('INSERT INTO t VALUES (1)')
    expect(client.query).toHaveBeenCalledWith('COMMIT')
    expect(client.release).toHaveBeenCalled()
  })

  it('should ROLLBACK and release client on non-retryable error', async () => {
    const client = mockClient()
    const pool = mockPool()
    pool.connect.mockResolvedValue(client)

    await expect(
      transactionWithRetry(pool, async () => {
        throw pgError('23505') // unique violation — not retryable
      })
    ).rejects.toThrow()

    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
  })

  it('should retry on retryable error within a transaction', async () => {
    let attempt = 0
    const client = mockClient()
    const pool = mockPool()
    pool.connect.mockResolvedValue(client)

    const result = await transactionWithRetry(
      pool,
      async () => {
        attempt++
        if (attempt === 1) throw pgError('40001') // serialization failure
        return 'ok'
      },
      1
    )

    expect(result).toBe('ok')
    // connect called twice (one per attempt)
    expect(pool.connect).toHaveBeenCalledTimes(2)
  })

  it('should always release client even when ROLLBACK fails', async () => {
    const client = mockClient((text: string) => {
      if (text === 'ROLLBACK') return Promise.reject(new Error('rollback failed'))
      return Promise.resolve({ rows: [] })
    })
    const pool = mockPool()
    pool.connect.mockResolvedValue(client)

    await expect(
      transactionWithRetry(pool, async () => {
        throw pgError('23505')
      })
    ).rejects.toThrow()

    // Client should still be released despite ROLLBACK failure
    expect(client.release).toHaveBeenCalled()
  })
})
