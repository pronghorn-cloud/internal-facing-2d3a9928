/**
 * Database Retry Utility
 *
 * Implements retry logic for transient PostgreSQL errors per Azure standard.
 *
 * Standard Requirements:
 * - Only retry specific SQLSTATE codes (allowlist)
 * - Never retry data/integrity/syntax errors (denylist)
 * - Use exponential backoff with jitter
 * - Maximum 3-5 retries
 */

import type pg from 'pg'
import { logger } from './logger.js'

/**
 * Retryable PostgreSQL SQLSTATE codes (allowlist)
 *
 * Standard requirement: "Only the following PostgreSQL SQLSTATE codes MAY be retried"
 */
const RETRYABLE_CODES = new Set([
  // Admin shutdown errors
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now

  // Transaction serialization errors
  '40001', // serialization_failure (deadlock)
  '40P01', // deadlock_detected

  // Connection errors
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection

  // Resource errors
  '53300', // too_many_connections
])

/**
 * Non-retryable error prefixes (denylist)
 *
 * Standard requirement: "The following SQLSTATE classes MUST NOT be retried"
 */
const NON_RETRYABLE_PREFIXES = [
  '22', // data_exception (invalid data type, division by zero, etc.)
  '23', // integrity_constraint_violation (unique, foreign key, check, etc.)
  '42', // syntax_error_or_access_rule_violation
]

/**
 * Check if a database error is retryable
 */
function isRetryableError(error: any): boolean {
  const sqlState = error?.code as string | undefined

  if (!sqlState) {
    return false
  }

  // Check if error is explicitly non-retryable
  if (NON_RETRYABLE_PREFIXES.some((prefix) => sqlState.startsWith(prefix))) {
    return false
  }

  // Check if error is in retryable allowlist
  return RETRYABLE_CODES.has(sqlState)
}

/**
 * Execute a query with retry logic for transient errors
 *
 * @param pool - PostgreSQL connection pool
 * @param text - SQL query text
 * @param params - Query parameters
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Query result
 *
 * @example
 * ```typescript
 * const result = await queryWithRetry(
 *   pool,
 *   'SELECT * FROM users WHERE id = $1',
 *   [userId],
 *   3
 * )
 * ```
 */
export async function queryWithRetry(
  pool: pg.Pool,
  text: string,
  params?: any[],
  maxRetries: number = 3
): Promise<pg.QueryResult<any>> {
  let lastError: Error
  let delay = 100 // Initial delay in milliseconds

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await pool.query(text, params)
    } catch (error: any) {
      lastError = error

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        // Non-retryable error, throw immediately
        throw error
      }

      // Log retry attempt
      logger.warn(
        { attempt: attempt + 1, maxAttempts: maxRetries + 1, sqlState: error.code, delay },
        'Database query failed, retrying'
      )

      // Wait with exponential backoff and jitter
      // Standard requirement: "Retries MUST use exponential backoff with jitter"
      const jitter = Math.random() * delay * 0.3
      await new Promise((resolve) => setTimeout(resolve, delay + jitter))

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * 2, 5000) // Cap at 5 seconds
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!
}

/**
 * Execute a transaction with retry logic
 *
 * Standard requirement: Transactions must be short-lived and rollback on error
 *
 * @param pool - PostgreSQL connection pool
 * @param callback - Transaction callback function
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Transaction result
 *
 * @example
 * ```typescript
 * const result = await transactionWithRetry(pool, async (client) => {
 *   await client.query('UPDATE orders SET status = $1 WHERE id = $2', ['PAID', orderId])
 *   await client.query('INSERT INTO payments (order_id, amount) VALUES ($1, $2)', [orderId, amount])
 *   return { success: true }
 * })
 * ```
 */
export async function transactionWithRetry<T = any>(
  pool: pg.Pool,
  callback: (client: pg.PoolClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error
  let delay = 100

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error: any) {
      lastError = error

      // Always rollback on error
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        logger.error({ err: rollbackError }, 'Error during rollback')
      }

      // Release client back to pool
      client.release()

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error
      }

      // Log retry attempt
      logger.warn(
        { attempt: attempt + 1, maxAttempts: maxRetries + 1, sqlState: error.code, delay },
        'Transaction failed, retrying'
      )

      // Wait with exponential backoff and jitter
      const jitter = Math.random() * delay * 0.3
      await new Promise((resolve) => setTimeout(resolve, delay + jitter))
      delay = Math.min(delay * 2, 5000)

      continue
    } finally {
      // Ensure client is always released if not already done
      if (client) {
        client.release()
      }
    }
  }

  throw lastError!
}
