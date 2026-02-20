/**
 * Swagger/OpenAPI Documentation Setup
 *
 * Loads the OpenAPI spec and serves Swagger UI at /api-docs.
 * Only active in non-production environments (T-I4: prevent info disclosure).
 */

import swaggerUi from 'swagger-ui-express'
import type { Express } from 'express'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { logger } from './utils/logger.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * Mount Swagger UI at /api-docs (dev/test only).
 * Returns true if mounted, false if skipped.
 */
export function setupSwagger(app: Express): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  try {
    const specPath = path.resolve(currentDir, '../openapi.json')
    const specContent = readFileSync(specPath, 'utf-8')
    const swaggerDocument = JSON.parse(specContent)

    // Serve raw spec for tooling (client generation, linting, etc.)
    // Registered before swagger-ui serve middleware so it isn't intercepted
    app.get('/api/v1/openapi.json', (_req, res) => {
      res.json(swaggerDocument)
    })

    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, {
        customSiteTitle: 'Alberta Gov API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
        swaggerOptions: {
          persistAuthorization: true,
        },
      })
    )

    logger.info('Swagger UI mounted at /api-docs')
    return true
  } catch (error) {
    logger.warn({ err: error }, 'Failed to load OpenAPI spec; Swagger UI not mounted')
    return false
  }
}
