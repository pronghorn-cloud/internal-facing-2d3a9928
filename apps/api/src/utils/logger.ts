/**
 * Structured Logger (FINDING-009)
 *
 * Pino-based structured logging for 12-factor app pattern.
 * - Production: JSON to stdout (machine-parseable for SIEM ingestion)
 * - Development: Pretty-printed with pino-pretty
 *
 * Also provides logSecurityEvent() and logError() helpers that were
 * previously in logger.middleware.ts — now backed by pino.
 */

import pino from 'pino'
import type { Request } from 'express'
import type { IncomingMessage, ServerResponse } from 'http'
import { pinoHttp } from 'pino-http'

const isProduction = process.env.NODE_ENV === 'production'

/**
 * List of sensitive field names that should be redacted from logs.
 * Used by sanitizeObject() for recursive deep-scan redaction.
 */
const SENSITIVE_FIELDS = [
  // Authentication and security
  'password',
  'token',
  'secret',
  'api_key',
  'apikey',
  'authorization',
  'cookie',
  'csrf',
  // Personal information
  'email',
  'phone',
  'ssn',
  'sin', // Social Insurance Number (Canada)
  'credit_card',
  'card_number',
  'cvv',
  'address',
  'postal_code',
  'zip_code',
  // Business numbers (can be sensitive)
  'business_number',
  'tax_id',
]

/**
 * Recursively sanitize an object by redacting sensitive fields.
 * Handles nested objects and arrays. Complements pino's built-in
 * `redact` option (which only handles fixed JSON paths).
 */
export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  const sanitized: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))

    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

/**
 * Root pino logger instance.
 *
 * - Level controlled by LOG_LEVEL env var (default: 'info')
 * - In development: pretty-printed via pino-pretty transport
 * - In production: raw JSON to stdout with ISO timestamps
 * - Fixed-path redaction for known sensitive headers
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:mm:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
})

/**
 * HTTP request logger middleware (replaces morgan).
 *
 * - Automatically logs every request/response with method, url, status, responseTime
 * - Skips health check endpoint logging to reduce noise
 * - Assigns appropriate log levels based on status codes
 * - Includes userId from session when available
 */
export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore(req: IncomingMessage) {
      return req.url === '/api/v1/health'
    },
  },
  customLogLevel(_req: IncomingMessage, res: ServerResponse, err?: Error) {
    if (err || (res.statusCode >= 500)) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
  customSuccessMessage(req: IncomingMessage, res: ServerResponse) {
    return `${req.method} ${req.url} ${res.statusCode}`
  },
  customErrorMessage(req: IncomingMessage, _res: ServerResponse, err: Error) {
    return `${req.method} ${req.url} ${err.message}`
  },
  customProps(req: IncomingMessage) {
    const userId = ((req as any).session as any)?.user?.id
    return { userId: userId || undefined }
  },
})

/**
 * Security event logger for authentication and authorization events.
 * Logs important security events without exposing credentials.
 */
export function logSecurityEvent(
  event: string,
  userId: string | undefined,
  details: Record<string, any>
): void {
  const sanitizedDetails = sanitizeObject(details)
  logger.info(
    { type: 'security', event, userId: userId || 'anonymous', details: sanitizedDetails },
    'security_event'
  )
}

/**
 * Error logger that sanitizes error details.
 * Logs errors without exposing sensitive data from error messages.
 */
export function logError(error: Error, req: Request): void {
  const userId = (req.session as any)?.user?.id || 'anonymous'

  // Sanitize error message to remove potential PII
  let sanitizedMessage = error.message
  for (const field of SENSITIVE_FIELDS) {
    const regex = new RegExp(field, 'gi')
    sanitizedMessage = sanitizedMessage.replace(regex, '[REDACTED]')
  }

  logger.error(
    {
      type: 'error',
      userId,
      method: req.method,
      path: req.path,
      err: {
        name: error.name,
        message: sanitizedMessage,
        stack: isProduction ? undefined : error.stack,
      },
    },
    'request_error'
  )
}
