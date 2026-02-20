/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication endpoints
 */

import type { Request, Response } from 'express'
import { authService } from '../services/auth.service.js'
import { logSecurityEvent } from '../middleware/logger.middleware.js'
import { logger } from '../utils/logger.js'

export class AuthController {
  /**
   * GET /api/v1/auth/login
   * Initiate authentication flow
   */
  async login(req: Request, res: Response) {
    try {
      logSecurityEvent('auth.login.initiated', undefined, {
        driver: authService.getDriver().getDriverName(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })
      await authService.login(req, res)
    } catch (error) {
      logSecurityEvent('auth.login.failed', undefined, {
        driver: authService.getDriver().getDriverName(),
        ip: req.ip,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'Failed to initiate login',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * GET /api/v1/auth/callback
   * Handle authentication callback from IdP
   */
  async callback(req: Request, res: Response) {
    try {
      const user = await authService.callback(req, res)

      logSecurityEvent('auth.callback.success', user?.id, {
        driver: authService.getDriver().getDriverName(),
        ip: req.ip,
      })

      // Redirect to frontend after successful authentication
      const redirectUrl = process.env.WEB_URL || 'http://localhost:5173'
      res.redirect(`${redirectUrl}/profile`)
    } catch (error) {
      logSecurityEvent('auth.callback.failed', undefined, {
        driver: authService.getDriver().getDriverName(),
        ip: req.ip,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })

      // Redirect to login page with error
      const redirectUrl = process.env.WEB_URL || 'http://localhost:5173'
      res.redirect(`${redirectUrl}/login?error=auth_failed`)
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Logout and destroy session
   */
  async logout(req: Request, res: Response) {
    const user = authService.getCurrentUser(req)
    try {
      await authService.logout(req, res)

      logSecurityEvent('auth.logout.success', user?.id, {
        ip: req.ip,
      })

      // Driver may have already sent a response (e.g. Entra ID redirect to IdP logout)
      if (!res.headersSent) {
        res.json({
          success: true,
          message: 'Logged out successfully'
        })
      }
    } catch (error) {
      logSecurityEvent('auth.logout.failed', user?.id, {
        ip: req.ip,
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'LOGOUT_ERROR',
            message: 'Failed to logout',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user
   */
  async me(req: Request, res: Response) {
    try {
      const user = authService.getCurrentUser(req)

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Not authenticated'
          }
        })
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles || [],
            attributes: user.attributes || {}
          }
        }
      })
    } catch (error) {
      logger.error({ err: error }, 'Get user error')
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_ERROR',
          message: 'Failed to get user information'
        }
      })
    }
  }

  /**
   * GET /api/v1/auth/status
   * Check authentication status
   */
  async status(req: Request, res: Response) {
    const user = authService.getCurrentUser(req)

    res.json({
      success: true,
      data: {
        authenticated: !!user,
        driver: authService.getDriver().getDriverName()
      }
    })
  }
}

export const authController = new AuthController()
