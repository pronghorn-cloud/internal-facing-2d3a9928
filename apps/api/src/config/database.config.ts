/**
 * Database Configuration
 *
 * Implements Azure PostgreSQL - Node.js Application Standard requirements:
 * - Single connection pool per process
 * - Configurable pool size with connection budget
 * - TLS 1.2+ with certificate validation
 * - Explicit schema isolation (app schema)
 * - Proper timeout configuration
 * - Graceful shutdown support
 */

import pg from 'pg'
import { logger } from '../utils/logger.js'

const { Pool } = pg

/**
 * Create and configure PostgreSQL connection pool
 *
 * Environment Variables:
 * - DB_CONNECTION_STRING: PostgreSQL connection string (required)
 * - DB_POOL_MAX: Maximum pool size (default: 10)
 * - DB_POOL_MIN: Minimum pool size (default: 2)
 * - DB_CONNECTION_TIMEOUT: Connection timeout in ms (default: 5000)
 * - DB_IDLE_TIMEOUT: Idle connection timeout in ms (default: 30000)
 * - DB_STATEMENT_TIMEOUT: Statement timeout in ms (default: 30000)
 * - DB_SSL_REJECT_UNAUTHORIZED: Validate SSL certificates (default: true in production)
 * - NODE_ENV: Environment (production/development)
 */
export function createDatabasePool(): pg.Pool {
  const isProduction = process.env.NODE_ENV === 'production'

  // Validate required configuration
  if (!process.env.DB_CONNECTION_STRING) {
    throw new Error('DB_CONNECTION_STRING environment variable is required')
  }

  const poolConfig: pg.PoolConfig = {
    connectionString: process.env.DB_CONNECTION_STRING,

    // Pool sizing - MUST be configurable per standard
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),

    // Timeouts - MUST be configured per standard
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),

    // Allow process to exit when idle (important for serverless/containers)
    allowExitOnIdle: true,

    // SSL/TLS configuration - MUST use TLS 1.2+ with certificate validation
    ssl: isProduction
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
          // For Azure PostgreSQL Flexible Server, you may need to specify CA cert:
          // ca: fs.readFileSync('/path/to/ca-cert.pem').toString(),
        }
      : false, // Disable SSL for local development
  }

  const pool = new Pool(poolConfig)

  // Set explicit schema and statement timeout on each connection
  // Standard requirement: Applications MUST use schema 'app', not 'public'
  pool.on('connect', async (client) => {
    try {
      // Set search_path to app schema (standard requirement)
      await client.query('SET search_path TO app, public')

      // Set statement timeout (standard requirement)
      const statementTimeout = parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10)
      if (!Number.isFinite(statementTimeout) || statementTimeout < 0) {
        throw new Error('DB_STATEMENT_TIMEOUT must be a non-negative integer')
      }
      await client.query(`SET statement_timeout = '${statementTimeout}ms'`)

      // Set idle_in_transaction_session_timeout (recommended)
      await client.query("SET idle_in_transaction_session_timeout = '60000ms'")
    } catch (error) {
      logger.error({ err: error }, 'Error configuring database connection')
    }
  })

  // Log pool errors
  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected database pool error')
  })

  // Log pool configuration
  logger.info({
    max: poolConfig.max,
    min: poolConfig.min,
    connectionTimeout: poolConfig.connectionTimeoutMillis,
    idleTimeout: poolConfig.idleTimeoutMillis,
    ssl: isProduction ? 'enabled' : 'disabled',
  }, 'Database pool configured')

  return pool
}

/**
 * Gracefully close database pool
 *
 * Standard requirement: Applications MUST drain connections on shutdown
 */
export async function closeDatabasePool(pool: pg.Pool): Promise<void> {
  try {
    logger.info('Closing database pool')
    await pool.end()
    logger.info('Database pool closed successfully')
  } catch (error) {
    logger.error({ err: error }, 'Error closing database pool')
    throw error
  }
}

/**
 * Get pool statistics for monitoring
 *
 * Standard requirement: Applications SHOULD emit metrics for pool usage
 */
export function getPoolStats(pool: pg.Pool): {
  total: number
  idle: number
  waiting: number
} {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  }
}
