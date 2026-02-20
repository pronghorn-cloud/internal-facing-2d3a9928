/**
 * Validation Middleware Factory
 *
 * Creates Express middleware that validates request data (body, query, params) using Zod schemas.
 * Provides type-safe validation with detailed error messages.
 */

import type { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { logger } from '../utils/logger.js'

export type ValidationTarget = 'body' | 'query' | 'params'

/**
 * Validation error response format
 */
interface ValidationErrorDetail {
  field: string
  message: string
  code: string
}

/**
 * Creates validation middleware for a specific request part (body, query, or params)
 *
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate ('body', 'query', or 'params')
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const loginSchema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8)
 * })
 *
 * router.post('/login', validate(loginSchema, 'body'), loginController)
 * ```
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Get the data to validate based on target
      const dataToValidate = req[target]

      // Validate using Zod schema
      const validated = schema.parse(dataToValidate)

      // Replace request data with validated (and potentially transformed) data
      req[target] = validated

      next()
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a consistent structure
        const errors: ValidationErrorDetail[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }))

        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors,
          },
        })
        return
      }

      // Handle unexpected errors
      logger.error({ err: error }, 'Unexpected validation error')
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error during validation',
          code: 'INTERNAL_ERROR',
        },
      })
    }
  }
}

/**
 * Validates multiple parts of the request
 *
 * @param schemas - Object with schemas for body, query, and/or params
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const schemas = {
 *   params: z.object({ id: z.string().uuid() }),
 *   body: z.object({ name: z.string() })
 * }
 *
 * router.put('/users/:id', validateAll(schemas), updateUserController)
 * ```
 */
export function validateAll(schemas: Partial<Record<ValidationTarget, ZodSchema>>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: ValidationErrorDetail[] = []

      // Validate each specified part
      for (const [target, schema] of Object.entries(schemas)) {
        const dataToValidate = req[target as ValidationTarget]
        const result = schema.safeParse(dataToValidate)

        if (!result.success) {
          errors.push(
            ...result.error.errors.map((err) => ({
              field: `${target}.${err.path.join('.')}`,
              message: err.message,
              code: err.code,
            }))
          )
        } else {
          // Replace with validated data
          req[target as ValidationTarget] = result.data
        }
      }

      // If any validation errors occurred, return them
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors,
          },
        })
        return
      }

      next()
    } catch (error) {
      logger.error({ err: error }, 'Unexpected validation error')
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error during validation',
          code: 'INTERNAL_ERROR',
        },
      })
    }
  }
}
