/**
 * Type declarations for express-session
 *
 * Extends the session interface to include our custom properties
 */

import 'express-session'
import type { AuthUser } from '@template/auth'

declare module 'express-session' {
  interface SessionData {
    user?: AuthUser
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export {}
