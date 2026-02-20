/**
 * Rate Limiting Middleware
 *
 * Configures rate limiting for different endpoint types:
 * - General API: 100 requests per 15 minutes per IP
 * - Authentication: 5 attempts per 15 minutes per IP
 */

import rateLimit from 'express-rate-limit'
import { logSecurityEvent } from './logger.middleware.js'

/**
 * General API rate limiter
 * Allows 100 requests per 15 minutes per IP address
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logSecurityEvent('rate_limit.exceeded', (req.session as any)?.user?.id, {
      ip: req.ip,
      path: req.path,
      method: req.method,
      limiter: 'general',
    })
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    })
  },
  // Skip rate limiting for health checks
  skip: (req) => {
    return req.path === '/api/v1/health' || req.path === '/api/v1/info'
  },
})

/**
 * Strict authentication rate limiter
 * Allows 5 attempts per 15 minutes per IP address
 * Used for login and authentication endpoints to prevent brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10), // Default: 5 per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent('rate_limit.exceeded', undefined, {
      ip: req.ip,
      path: req.path,
      method: req.method,
      limiter: 'auth',
    })
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts, please try again later',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
      },
    })
  },
})

/**
 * Lenient rate limiter for production
 * Allows 1000 requests per 15 minutes per IP address
 * Used when RATE_LIMIT_MAX is set to a higher value via environment variable
 */
export function createCustomRateLimiter(max: number = 100, windowMinutes: number = 15) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSecurityEvent('rate_limit.exceeded', (req.session as any)?.user?.id, {
        ip: req.ip,
        path: req.path,
        method: req.method,
        limiter: 'custom',
      })
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
        },
      })
    },
    skip: (req) => {
      return req.path === '/api/v1/health' || req.path === '/api/v1/info'
    },
  })
}
