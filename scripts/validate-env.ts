#!/usr/bin/env tsx
/**
 * Environment Variable Validation Script
 *
 * Validates environment variables against configuration schemas
 * Usage: npm run validate-env [api|web]
 */

import { loadEnv, getValidationErrors } from '@template/config'

// Get config type from command line arguments (default: api)
const configType = (process.argv[2] as 'api' | 'web') || 'api'

if (configType !== 'api' && configType !== 'web') {
  console.error(`\n❌ Invalid config type: ${configType}`)
  console.error('   Usage: npm run validate-env [api|web]\n')
  process.exit(1)
}

console.log(`\n🔍 Validating ${configType.toUpperCase()} environment variables...\n`)

// Load .env file
const loaded = loadEnv()
if (!loaded) {
  console.warn('⚠️  No .env file found, validating environment variables only\n')
}

// Validate configuration
const errors = getValidationErrors(configType)

if (errors === null) {
  console.log(`✅ ${configType.toUpperCase()} configuration is valid!\n`)
  console.log('   All required environment variables are present and valid.\n')
  process.exit(0)
} else {
  console.error(`❌ ${configType.toUpperCase()} configuration validation failed!\n`)
  console.error('   The following issues were found:\n')

  errors.forEach((error) => {
    console.error(`   • ${error}`)
  })

  console.error('\n   Please check your .env file and fix the issues above.\n')
  process.exit(1)
}
