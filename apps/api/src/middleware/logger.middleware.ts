/**
 * Logger Middleware (re-export shim)
 *
 * Preserves the original import contract so existing consumers
 * (app.ts, auth.controller.ts, auth.middleware.ts, csrf.middleware.ts,
 * rate-limit.middleware.ts) require no import changes.
 *
 * All logging is now backed by pino — see utils/logger.ts.
 */

export {
  httpLogger as devLogger,
  httpLogger as prodLogger,
  logSecurityEvent,
  logError,
} from '../utils/logger.js'
