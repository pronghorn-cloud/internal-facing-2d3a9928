/**
 * @template/config - Configuration validation and management
 *
 * Provides type-safe configuration loading and validation using Zod
 */

// Schemas
export {
  apiConfigSchema,
  parseApiConfig,
  safeParseApiConfig,
  type ApiConfig
} from './schemas/api.config.schema.js'

export {
  webConfigSchema,
  parseWebConfig,
  safeParseWebConfig,
  type WebConfig
} from './schemas/web.config.schema.js'

// Loader
export {
  loadEnv,
  loadApiConfig,
  loadWebConfig,
  validateConfig,
  getValidationErrors
} from './loader.js'

// Presets
export {
  internalPreset,
  developmentPreset,
  type ConfigPreset
} from './presets.js'
