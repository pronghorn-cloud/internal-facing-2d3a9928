import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import cors from 'cors'
import helmet from 'helmet'
import hpp from 'hpp'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.routes.js'
import publicRoutes from './routes/public.routes.js'
import { generalRateLimiter, createCustomRateLimiter } from './middleware/rate-limit.middleware.js'
import { csrfProtection, csrfTokenEndpoint } from './middleware/csrf.middleware.js'
import { logError, logSecurityEvent } from './middleware/logger.middleware.js'
import { logger, httpLogger } from './utils/logger.js'
import { requireAuth, requireRole } from './middleware/auth.middleware.js'
import { createDatabasePool } from './config/database.config.js'
import { setupDbMetrics, checkDatabaseHealth, getPoolHealth } from './middleware/db-metrics.middleware.js'
import { setupSwagger } from './swagger.js'

const PgSession = connectPgSimple(session)

export function createApp(): Express {
  const app = express()

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for GoA web components
            'https://cdn.jsdelivr.net', // GoA components CDN
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for GoA web components
            'https://fonts.googleapis.com',
            'https://cdn.jsdelivr.net',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      // HDR-001: HSTS max-age must be at least 365 days per GoA standard
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      crossOriginEmbedderPolicy: false, // Required for GoA web components
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  )

  // REQ-P0-04: Prevent caching of API responses containing sensitive data
  app.use('/api/', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    next()
  })

  // REQ-P1-01: Validate Host header against whitelist to prevent host header injection
  const allowedHosts = process.env.ALLOWED_HOSTS
    ? process.env.ALLOWED_HOSTS.split(',').map((h) => h.trim().toLowerCase())
    : null

  if (allowedHosts) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      // req.hostname handles IPv6 and strips the port correctly
      const hostname = req.hostname?.toLowerCase()
      if (!hostname || !allowedHosts.includes(hostname)) {
        logSecurityEvent('request.blocked.invalid_host', undefined, {
          ip: req.ip,
          host: req.headers.host,
          path: req.path,
        })
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_HOST', message: 'Invalid Host header' },
        })
      }
      next()
    })
  }

  // CORS - supports multiple origins (internal frontend + public-facing app)
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN environment variable is required in production')
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, health checks)
        if (!origin) return callback(null, true)
        if (corsOrigins.includes(origin)) return callback(null, true)
        callback(new Error(`CORS: origin ${origin} not allowed`))
      },
      credentials: true,
    })
  )

  // Swagger UI — dev/test only (T-I4: disabled in production)
  // Mounted before rate limiter and session to avoid consuming quota or creating sessions
  setupSwagger(app)

  // Rate limiting - apply based on environment
  const rateLimit = process.env.RATE_LIMIT_MAX
    ? createCustomRateLimiter(parseInt(process.env.RATE_LIMIT_MAX, 10))
    : generalRateLimiter
  app.use(rateLimit)

  // Request logging — pino-http (structured JSON in prod, pretty in dev)
  app.use(httpLogger)

  // Body parsers
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // FINDING-014: HTTP Parameter Pollution protection
  app.use(hpp())

  // FINDING-016: Reject unexpected Content-Types on state-changing requests
  app.use('/api/', (req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-length'] !== '0') {
      if (req.headers['content-type'] && !req.is('json') && !req.is('urlencoded')) {
        return res.status(415).json({
          success: false,
          error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json or application/x-www-form-urlencoded' }
        })
      }
    }
    next()
  })

  // ---------------------------------------------------------------------------
  // Public API routes (service-to-service) — registered BEFORE session/CSRF
  // These routes use Bearer token auth, not session cookies or CSRF tokens.
  // ---------------------------------------------------------------------------
  const serviceRateLimit = process.env.SERVICE_RATE_LIMIT_MAX
    ? createCustomRateLimiter(parseInt(process.env.SERVICE_RATE_LIMIT_MAX, 10))
    : createCustomRateLimiter(500)
  app.use('/api/v1/public', serviceRateLimit, publicRoutes)

  // Database pool configuration (Azure PostgreSQL standard compliant)
  // Create pool only if using PostgreSQL session store
  let dbPool = null
  const sessionStore = process.env.SESSION_STORE === 'postgres'
    ? (() => {
        dbPool = createDatabasePool()

        // Setup metrics collection (every 30 seconds)
        if (process.env.NODE_ENV === 'production' || process.env.DB_ENABLE_METRICS === 'true') {
          setupDbMetrics(dbPool)
        }

        return new PgSession({
          pool: dbPool,
          tableName: 'session',
          schemaName: 'app', // Azure standard: use 'app' schema, not 'public'
          createTableIfMissing: false, // We create it via migration
          pruneSessionInterval: 900, // REQ-P2-02: Prune expired sessions every 15 minutes
        })
      })()
    : undefined // Use default memory store

  // Store pool reference for health checks and graceful shutdown
  if (dbPool) {
    app.set('dbPool', dbPool)
  }

  app.use(
    session({
      store: sessionStore,
      // SEC-001: Require SESSION_SECRET in production; allow dev fallback otherwise
      // FINDING-007: Support secret rotation via SESSION_SECRET_PREVIOUS
      secret: (() => {
        const secrets: string[] = []
        if (process.env.SESSION_SECRET) {
          secrets.push(process.env.SESSION_SECRET)
        } else if (process.env.NODE_ENV === 'production') {
          throw new Error('SESSION_SECRET environment variable is required in production')
        } else {
          secrets.push('insecure-dev-fallback-replace-me')
        }
        if (process.env.SESSION_SECRET_PREVIOUS) {
          secrets.push(process.env.SESSION_SECRET_PREVIOUS)
        }
        return secrets
      })(),
      resave: false,
      saveUninitialized: false,
      rolling: true, // REQ-P2-02: Reset maxAge on each request (activity-based expiry)
      cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: (() => {
          const parsed = parseInt(process.env.SESSION_MAX_AGE || '28800000', 10)
          if (Number.isNaN(parsed) || parsed <= 0) {
            logger.warn(
              { raw: process.env.SESSION_MAX_AGE },
              'Invalid SESSION_MAX_AGE, falling back to 28800000 (8 hours)'
            )
            return 28800000
          }
          return parsed
        })(), // REQ-P2-02: 8 hours default for Protected B
        sameSite: 'lax',
      },
      name: 'connect.sid',
    })
  )

  // Log session store type
  logger.info({ store: process.env.SESSION_STORE || 'memory' }, 'Session store configured')

  // CSRF protection - must be after session
  app.use(csrfProtection)

  // CSRF token endpoint
  app.get('/api/v1/csrf-token', csrfTokenEndpoint)

  // Health check endpoint with database connectivity check
  // Azure standard: Applications MUST expose a lightweight DB health check with short timeout
  app.get('/api/v1/health', async (_req: Request, res: Response) => {
    const pool = app.get('dbPool')
    let dbHealthy = true
    let dbStatus = 'not_configured'
    let poolHealth = null

    // Check database health if pool is configured
    if (pool && process.env.SESSION_STORE === 'postgres') {
      try {
        dbHealthy = await checkDatabaseHealth(pool, 2000) // 2 second timeout
        dbStatus = dbHealthy ? 'connected' : 'disconnected'

        // Get detailed pool statistics
        poolHealth = getPoolHealth(pool)
      } catch (error) {
        dbHealthy = false
        dbStatus = 'error'
        logger.error({ err: error }, 'Health check database query failed')
      }
    }

    // Overall status: degraded if database is unhealthy
    const overallStatus = dbHealthy ? 'healthy' : 'degraded'
    const statusCode = dbHealthy ? 200 : 503

    res.status(statusCode).json({
      success: dbHealthy,
      data: {
        status: overallStatus,
        database: dbStatus,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        pool: poolHealth
          ? {
              utilization: `${poolHealth.utilization}%`,
              connections: {
                total: poolHealth.stats.total,
                idle: poolHealth.stats.idle,
                active: poolHealth.stats.total - poolHealth.stats.idle,
                waiting: poolHealth.stats.waiting,
              },
              warnings: poolHealth.warnings,
            }
          : undefined,
      },
    })
  })

  // API info endpoint
  // T-I4: Reduce disclosed information in production to prevent fingerprinting
  app.get('/api/v1/info', (_req: Request, res: Response) => {
    const data: Record<string, any> = {
      name: process.env.APP_NAME || 'Alberta Government Internal Application',
      version: 'v1',
    }

    // Only expose implementation details in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      data.description = 'Internal-facing template with GoA Design System and Entra ID authentication'
      data.features = {
        authentication: ['Mock', 'MS Entra ID'],
        serviceAuth: 'Azure AD Client Credentials (for public-facing app)',
        security: ['Helmet CSP', 'CSRF Protection', 'Rate Limiting', 'Input Validation', 'Secure Logging'],
        design: 'Alberta Government Design System (GoA)',
      }
      data.endpoints = {
        health: '/api/v1/health',
        info: '/api/v1/info',
        csrfToken: '/api/v1/csrf-token',
        auth: '/api/v1/auth',
        publicApi: '/api/v1/public',
        documentation: '/api-docs',
        openApiSpec: '/api/v1/openapi.json',
      }
    }

    res.json({ success: true, data })
  })

  // Auth routes (internal staff - Entra ID / Mock)
  app.use('/api/v1/auth', authRoutes)

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const webDistPath = path.resolve(currentDir, '../../web/dist')

    // Serve static assets
    app.use(express.static(webDistPath))

    // SPA fallback - serve index.html for all non-API routes
    // Note: Express 5 requires named wildcard parameters
    app.get('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next()
      }
      res.sendFile(path.join(webDistPath, 'index.html'))
    })
  }

  // REQ-P1-03: Example role-protected admin route
  // Demonstrates requireRole() pattern for template consumers
  app.get('/api/v1/admin/users', requireAuth, requireRole('admin'), (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        message: 'This endpoint requires the "admin" role. Replace with your admin logic.',
      },
    })
  })

  // 404 handler (for API routes only in production)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Endpoint not found',
        code: 'NOT_FOUND',
      },
    })
  })

  // Global error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    // Log error securely without PII
    logError(err, req)

    res.status(500).json({
      success: false,
      error: {
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    })
  })

  return app
}
