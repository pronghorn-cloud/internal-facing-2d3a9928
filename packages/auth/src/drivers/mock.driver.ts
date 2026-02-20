/**
 * MockAuthDriver - Mock authentication for local development
 *
 * Provides a simple authentication flow without requiring a real IdP.
 * Useful for local development and testing.
 */

import type { Request, Response } from 'express'
import { BaseAuthDriver, type AuthUser, type AuthConfig } from './base.driver.js'

export interface MockAuthConfig extends AuthConfig {
  mockUsers?: AuthUser[]
}

export class MockAuthDriver extends BaseAuthDriver {
  private mockUsers: AuthUser[]

  constructor(config: MockAuthConfig) {
    super(config)

    // REQ-P2-04: Prevent mock auth driver from being used in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'MockAuthDriver cannot be used in production. Set AUTH_DRIVER to "entra-id".'
      )
    }

    // Default mock users for development
    this.mockUsers = config.mockUsers || [
      {
        id: 'mock-user-1',
        email: 'developer@gov.ab.ca',
        name: 'Mock Developer',
        roles: ['developer', 'user'],
        attributes: {
          department: 'Technology Services',
          employeeId: 'EMP001'
        }
      },
      {
        id: 'mock-user-2',
        email: 'admin@gov.ab.ca',
        name: 'Mock Admin',
        roles: ['admin', 'user'],
        attributes: {
          department: 'Administration',
          employeeId: 'EMP002'
        }
      },
      {
        id: 'mock-user-3',
        email: 'user@gov.ab.ca',
        name: 'Mock User',
        roles: ['user'],
        attributes: {
          department: 'Operations',
          employeeId: 'EMP003'
        }
      }
    ]
  }

  getDriverName(): string {
    return 'mock'
  }

  /**
   * Mock login - just redirect to callback with a user selection
   */
  async login(req: Request, res: Response): Promise<void> {
    // For mock auth, we'll use query params to select a user
    // In a real app, this would redirect to an IdP
    const userIndex = parseInt(req.query.user as string) || 0
    const selectedUser = this.mockUsers[userIndex] || this.mockUsers[0]!

    // Store user ID in query for callback
    const callbackUrl = `${this.config.callbackUrl}?mockUserId=${selectedUser.id}`
    res.redirect(callbackUrl)
  }

  /**
   * Mock callback - authenticate the user from query params
   */
  async callback(req: Request, _res: Response): Promise<AuthUser> {
    const mockUserId = req.query.mockUserId as string

    // Find the user by ID - default to first user if not found
    const user = this.mockUsers.find((u) => u.id === mockUserId) || this.mockUsers[0]!

    // Save to session (async due to session regeneration)
    await this.saveUserToSession(req, user)

    return user
  }

  /**
   * Mock logout - just clear the session
   */
  async logout(req: Request, res: Response): Promise<void> {
    this.clearUserFromSession(req)

    // Destroy the entire session
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
        } else {
          res.clearCookie('connect.sid')
          resolve()
        }
      })
    })
  }

  /**
   * Get list of mock users (for development UI)
   */
  getMockUsers(): AuthUser[] {
    return this.mockUsers
  }
}
