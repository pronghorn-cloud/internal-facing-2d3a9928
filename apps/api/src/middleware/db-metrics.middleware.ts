/**
 * Database Metrics Middleware
 *
 * Implements observability requirements from Azure PostgreSQL standard:
 * - Pool usage metrics (total, idle, waiting connections)
 * - Query latency tracking
 * - Error rate monitoring
 *
 * Standard requirement: "Applications SHOULD emit metrics for pool usage,
 * query latency (p50/p95/p99), error rates, and transaction duration"
 */

import type pg from 'pg'
import { getPoolStats } from '../config/database.config.js'
import { logger } from '../utils/logger.js'

/**
 * Setup periodic metrics collection for database pool
 *
 * Logs pool statistics every 30 seconds to enable monitoring of:
 * - Connection pool exhaustion
 * - Connection leaks
 * - High connection wait times
 *
 * @param pool - PostgreSQL connection pool
 * @param intervalMs - Metrics collection interval in milliseconds (default: 30000)
 */
export function setupDbMetrics(pool: pg.Pool, intervalMs: number = 30000): NodeJS.Timeout {
  const metricsInterval = setInterval(() => {
    const stats = getPoolStats(pool)

    // Calculate pool utilization percentage
    const utilization = stats.total > 0 ? ((stats.total - stats.idle) / stats.total) * 100 : 0

    // Log metrics (in production, send to monitoring system like Prometheus, DataDog, etc.)
    logger.info({
      total: stats.total,
      idle: stats.idle,
      active: stats.total - stats.idle,
      waiting: stats.waiting,
      utilization: `${utilization.toFixed(1)}%`,
    }, 'Database pool metrics')

    // Alert if pool is exhausted (all connections in use + clients waiting)
    if (stats.idle === 0 && stats.waiting > 0) {
      logger.warn({ waiting: stats.waiting, total: stats.total }, 'Database pool exhausted, consider increasing DB_POOL_MAX')
    }

    // Alert if pool utilization is consistently high
    if (utilization > 80) {
      logger.warn({
        utilization: `${utilization.toFixed(1)}%`,
        active: stats.total - stats.idle,
        total: stats.total,
      }, 'Database pool utilization high')
    }

    // Example: Export to Prometheus (if using prom-client)
    // dbPoolTotalGauge.set(stats.total)
    // dbPoolIdleGauge.set(stats.idle)
    // dbPoolWaitingGauge.set(stats.waiting)
    // dbPoolUtilizationGauge.set(utilization)
  }, intervalMs)

  // Ensure interval is cleaned up (won't prevent process exit)
  metricsInterval.unref()

  return metricsInterval
}

/**
 * Query performance tracking wrapper
 *
 * Wraps database queries to track execution time and errors
 * Standard requirement: Track query latency (p50/p95/p99)
 *
 * @example
 * ```typescript
 * const result = await trackQueryPerformance(
 *   'getUserById',
 *   () => pool.query('SELECT * FROM users WHERE id = $1', [userId])
 * )
 * ```
 */
export async function trackQueryPerformance<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  let success = true

  try {
    const result = await queryFn()
    return result
  } catch (error) {
    success = false
    throw error
  } finally {
    const duration = Date.now() - startTime

    // Log slow queries (> 1 second)
    if (duration > 1000) {
      logger.warn({ query: queryName, duration: `${duration}ms`, success }, 'Slow query detected')
    }

    // Log query metrics at debug level
    logger.debug({ query: queryName, duration: `${duration}ms`, success }, 'Query executed')

    // Example: Export to Prometheus (if using prom-client)
    // queryDurationHistogram
    //   .labels({ query: queryName, success: success.toString() })
    //   .observe(duration / 1000) // Convert to seconds
  }
}

/**
 * Health check query with timeout
 *
 * Standard requirement: "Applications MUST expose a lightweight DB health check
 * (SELECT 1) with a short timeout"
 *
 * @param pool - PostgreSQL connection pool
 * @param timeoutMs - Health check timeout in milliseconds (default: 2000)
 * @returns true if healthy, false otherwise
 */
export async function checkDatabaseHealth(pool: pg.Pool, timeoutMs: number = 2000): Promise<boolean> {
  const client = await pool.connect()

  try {
    // Set statement timeout for this connection (validated to prevent injection)
    const safeTimeout = Math.max(0, Math.floor(timeoutMs))
    await client.query(`SET statement_timeout = '${safeTimeout}ms'`)

    // Simple health check query
    await client.query('SELECT 1')

    return true
  } catch (error) {
    logger.error({ err: error }, 'Database health check failed')
    return false
  } finally {
    client.release()
  }
}

/**
 * Get detailed pool health information
 *
 * Returns comprehensive pool statistics for health check endpoints
 */
export function getPoolHealth(pool: pg.Pool): {
  healthy: boolean
  stats: ReturnType<typeof getPoolStats>
  utilization: number
  warnings: string[]
} {
  const stats = getPoolStats(pool)
  const utilization = stats.total > 0 ? ((stats.total - stats.idle) / stats.total) * 100 : 0
  const warnings: string[] = []

  // Check for pool exhaustion
  if (stats.idle === 0 && stats.waiting > 0) {
    warnings.push(`Pool exhausted: ${stats.waiting} clients waiting`)
  }

  // Check for high utilization
  if (utilization > 90) {
    warnings.push(`High utilization: ${utilization.toFixed(1)}%`)
  }

  // Healthy if no waiting clients and utilization < 95%
  const healthy = stats.waiting === 0 && utilization < 95

  return {
    healthy,
    stats,
    utilization: parseFloat(utilization.toFixed(1)),
    warnings,
  }
}
