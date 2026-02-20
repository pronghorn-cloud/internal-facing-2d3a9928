/**
 * BaseAuthDriver - Abstract base class for authentication drivers
 *
 * All authentication drivers (Entra ID, Mock) must extend this class
 * and implement the required methods for login, callback, and logout flows.
 */

import type { Request, Response } from 'express'
import { z } from 'zod'

export interface AuthUser {
  id: string
  email: string
  name: string
  roles?: string[]
  attributes?: Record<string, any>
}

/**
 * REQ-P1-02: Zod schema for validating session user data on deserialization.
 * Prevents type confusion from manipulated session stores or compromised IdPs.
 */
export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  roles: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
})

export interface AuthConfig {
  callbackUrl: string
  [key: string]: any
}

export abstract class BaseAuthDriver {
  protected config: AuthConfig

  constructor(config: AuthConfig) {
    this.config = config
  }

  /**
   * Get the driver name (e.g., 'entra-id', 'mock')
   */
  abstract getDriverName(): string

  /**
   * Initiate the login flow
   * - For Entra ID: redirect to Microsoft login
   * - For Mock: directly create session
   */
  abstract login(req: Request, res: Response): Promise<void>

  /**
   * Handle the callback from the identity provider
   * - Parse and validate the response
   * - Extract user information
   * - Create session
   */
  abstract callback(req: Request, res: Response): Promise<AuthUser>

  /**
   * Perform logout
   * - Destroy local session
   * - Optionally redirect to IdP logout
   */
  abstract logout(req: Request, res: Response): Promise<void>

  /**
   * Get the current authenticated user from the session.
   * REQ-P1-02: Validates session data against Zod schema before use.
   */
  getUser(req: Request): AuthUser | null {
    const raw = (req.session as any)?.user
    if (!raw) return null
    const result = AuthUserSchema.safeParse(raw)
    return result.success ? (result.data as AuthUser) : null
  }

  /**
   * Save user to session with session regeneration (REQ-P0-02)
   * Regenerates the session ID to prevent session fixation attacks.
   * Preserves CSRF secret across regeneration.
   */
  protected saveUserToSession(req: Request, user: AuthUser): Promise<void> {
    return new Promise((resolve, reject) => {
      // Preserve CSRF secret across session regeneration
      const csrfSecret = (req.session as any).csrfSecret

      req.session.regenerate((err) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
          return
        }
        // Restore preserved data and set user
        if (csrfSecret) {
          ;(req.session as any).csrfSecret = csrfSecret
        }
        ;(req.session as any).user = user
        ;(req.session as any).lastAuthAt = Date.now() // REQ-P2-05: Track authentication timestamp
        req.session.save((saveErr) => {
          if (saveErr) reject(saveErr instanceof Error ? saveErr : new Error(String(saveErr)))
          else resolve()
        })
      })
    })
  }

  /**
   * Clear user from session
   */
  protected clearUserFromSession(req: Request): void {
    delete (req.session as any).user
  }

  /**
   * Validate that user has required role(s)
   */
  hasRole(user: AuthUser | null, role: string | string[]): boolean {
    if (!user || !user.roles) return false

    const requiredRoles = Array.isArray(role) ? role : [role]
    return requiredRoles.some((r) => user.roles?.includes(r))
  }
}
