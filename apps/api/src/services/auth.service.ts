/**
 * Authentication Service
 *
 * Business logic for authentication operations
 */

import {
  BaseAuthDriver,
  MockAuthDriver,
  EntraIdAuthDriver,
  type AuthUser
} from '@template/auth'
import type { Request, Response } from 'express'

export class AuthService {
  private driver: BaseAuthDriver

  /**
   * Construct the auth callback URL from environment variables
   * Priority: AUTH_CALLBACK_URL > API_URL > RENDER_EXTERNAL_URL > HOST/PORT derivation
   */
  private static getCallbackUrl(): string {
    // 1. If explicitly set, use it
    if (process.env.AUTH_CALLBACK_URL) {
      return process.env.AUTH_CALLBACK_URL
    }

    // 2. If API_URL is set, derive from it
    if (process.env.API_URL) {
      const apiUrl = process.env.API_URL.replace(/\/$/, '') // Remove trailing slash
      return `${apiUrl}/api/v1/auth/callback`
    }

    // 3. Render.com provides RENDER_EXTERNAL_URL automatically
    if (process.env.RENDER_EXTERNAL_URL) {
      const renderUrl = process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')
      return `${renderUrl}/api/v1/auth/callback`
    }

    // 4. Render.com also provides just the hostname
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
      return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/api/v1/auth/callback`
    }

    // 5. Derive from HOST and PORT (local development fallback)
    const host = process.env.HOST || 'localhost'
    const port = process.env.PORT || '3000'
    const isProduction = process.env.NODE_ENV === 'production'

    // Use HTTPS in production, HTTP otherwise
    const protocol = isProduction ? 'https' : 'http'

    // In production behind a proxy, don't include port (use standard 443/80)
    // For local development, include the port
    const hostWithPort = isProduction && (host !== 'localhost' && host !== '127.0.0.1')
      ? host
      : `${host}:${port}`

    return `${protocol}://${hostWithPort}/api/v1/auth/callback`
  }

  constructor() {
    // Initialize the appropriate driver based on environment
    const authDriver = process.env.AUTH_DRIVER || 'mock'
    const callbackUrl = AuthService.getCallbackUrl()

    switch (authDriver) {
      case 'mock':
        this.driver = new MockAuthDriver({
          callbackUrl
        })
        break

      case 'entra-id':
        this.driver = new EntraIdAuthDriver({
          callbackUrl
        })
        break

      default:
        throw new Error(`Unsupported auth driver: ${authDriver}. Valid options: mock, entra-id`)
    }
  }

  /**
   * Get the current driver
   */
  getDriver(): BaseAuthDriver {
    return this.driver
  }

  /**
   * Initiate login
   */
  async login(req: Request, res: Response): Promise<void> {
    return this.driver.login(req, res)
  }

  /**
   * Handle auth callback
   */
  async callback(req: Request, res: Response): Promise<AuthUser> {
    return this.driver.callback(req, res)
  }

  /**
   * Perform logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    return this.driver.logout(req, res)
  }

  /**
   * Get current user
   */
  getCurrentUser(req: Request): AuthUser | null {
    return this.driver.getUser(req)
  }

  /**
   * Check if user has role
   */
  hasRole(req: Request, role: string | string[]): boolean {
    const user = this.getCurrentUser(req)
    return this.driver.hasRole(user, role)
  }
}

// Singleton instance
export const authService = new AuthService()
