/**
 * Public API Routes
 *
 * Endpoints consumed by the public-facing application via service-to-service auth.
 * All routes require a valid Azure AD Bearer token (Client Credentials flow).
 *
 * The public-facing app authenticates with its own client_id + client_secret
 * to obtain a token, then passes it in the Authorization header.
 *
 * Route prefix: /api/v1/public
 */

import express from 'express'
import type { Request, Response } from 'express'
import { requireServiceAuth } from '../middleware/service-auth.middleware.js'

const router = express.Router()

// All public API routes require service authentication
router.use(requireServiceAuth)

/**
 * @route   GET /api/v1/public/health
 * @desc    Service health check (validates token + confirms connectivity)
 * @access  Service-to-service (Bearer token)
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  })
})

/**
 * @route   GET /api/v1/public/info
 * @desc    Public API metadata
 * @access  Service-to-service (Bearer token)
 */
router.get('/info', (req: Request, res: Response) => {
  const serviceClient = (req as any).serviceClient

  res.json({
    success: true,
    data: {
      name: process.env.APP_NAME || 'Alberta Government Internal API',
      version: 'v1',
      client: {
        clientId: serviceClient?.clientId,
        roles: serviceClient?.roles || [],
      },
    },
  })
})

// ---------------------------------------------------------------------------
// Add your public-facing API endpoints below.
// These are called by the public-facing frontend through its own backend.
//
// Example:
//
// router.get('/services', (req: Request, res: Response) => {
//   // Return list of public services
//   res.json({ success: true, data: { services: [] } })
// })
//
// router.post('/applications', (req: Request, res: Response) => {
//   // Handle public application submission
//   res.json({ success: true, data: { applicationId: '...' } })
// })
// ---------------------------------------------------------------------------

export default router
