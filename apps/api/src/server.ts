import { config } from 'dotenv'
import { findUpSync } from 'find-up'
import { createApp } from './app.js'
import { closeDatabasePool } from './config/database.config.js'
import { logger } from './utils/logger.js'
import os from 'os'

// Load .env from monorepo root (automatically searches up directory tree)
// Production-safe: Only loads if .env file exists (Azure/OpenShift use platform env vars)
const envPath = findUpSync('.env')
if (envPath) {
  config({ path: envPath })
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
const HOST = process.env.HOST || 'localhost'
const app = createApp()

// Get server URL based on environment
function getServerUrl(): string {
  // In production, use configured HOST or try to detect
  if (process.env.NODE_ENV === 'production') {
    // If HOST is set, use it
    if (process.env.HOST) {
      return `http://${process.env.HOST}:${PORT}`
    }
    // Otherwise, try to get hostname
    const hostname = os.hostname()
    return `http://${hostname}:${PORT}`
  }
  // In development, use localhost
  return `http://${HOST}:${PORT}`
}

const server = app.listen(PORT, () => {
  const serverUrl = getServerUrl()
  const address = server.address()
  const env = process.env.NODE_ENV || 'development'
  const telemetry = process.env.OTEL_ENABLED === 'true' ? 'OpenTelemetry (OTLP)' : 'disabled'

  logger.info(
    {
      port: PORT,
      env,
      telemetry,
      healthCheck: `${serverUrl}/api/v1/health`,
      apiInfo: `${serverUrl}/api/v1/info`,
      address: address && typeof address !== 'string' ? `${address.address}:${address.port}` : undefined,
    },
    'Server started'
  )
})

/**
 * Graceful shutdown handler
 *
 * Azure PostgreSQL Standard requirement:
 * - Applications MUST drain in-flight requests and close the pool on SIGTERM/SIGINT
 * - Kubernetes deployments MUST configure terminationGracePeriodSeconds appropriately
 */
let isShuttingDown = false

async function shutdown(signal: string) {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress')
    return
  }
  isShuttingDown = true

  logger.info({ signal }, 'Graceful shutdown started')

  // Force close after 10 seconds
  const forceShutdownTimer = setTimeout(() => {
    logger.error('Forced shutdown after 10 second timeout')
    process.exit(1)
  }, 10000)

  try {
    // Stop accepting new connections
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
    logger.info('HTTP server closed')

    // Drain database pool
    const pool = app.get('dbPool')
    if (pool) {
      logger.info('Closing database pool')
      await closeDatabasePool(pool)
      logger.info('Graceful shutdown complete')
    } else {
      logger.info('Graceful shutdown complete (no database pool)')
    }

    // Clear the force shutdown timer
    clearTimeout(forceShutdownTimer)

    // Exit cleanly
    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, 'Error during graceful shutdown')
    clearTimeout(forceShutdownTimer)
    process.exit(1)
  }
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((error) => {
    logger.fatal({ err: error }, 'Fatal error during SIGTERM handler')
    process.exit(1)
  })
})

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((error) => {
    logger.fatal({ err: error }, 'Fatal error during SIGINT handler')
    process.exit(1)
  })
})
