/**
 * Database Migration Runner
 *
 * Runs SQL migration files using the database connection from .env
 * Usage: tsx scripts/run-migration.ts scripts/migrations/001_create_app_schema.sql
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import pg from 'pg'

const { Client } = pg

async function runMigration(migrationFile: string) {
  const connectionString = process.env.DB_CONNECTION_STRING

  if (!connectionString) {
    console.error('❌ Error: DB_CONNECTION_STRING not found in environment variables')
    console.error('   Make sure you have a .env file with DB_CONNECTION_STRING configured')
    process.exit(1)
  }

  // Read migration SQL file
  let sql: string
  try {
    sql = readFileSync(migrationFile, 'utf-8')
    console.log(`📄 Reading migration file: ${migrationFile}`)
  } catch (error) {
    console.error(`❌ Error reading migration file: ${error}`)
    process.exit(1)
  }

  // Create database client
  const client = new Client({ connectionString })

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected to database')

    console.log('🚀 Running migration...')
    await client.query(sql)
    console.log('✅ Migration completed successfully!')

    // Verify schema was created
    const schemaCheck = await client.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'app'"
    )

    if (schemaCheck.rows.length > 0) {
      console.log('✅ Schema "app" exists')
    } else {
      console.log('⚠️  Warning: Schema "app" not found')
    }

    // Verify session table
    const tableCheck = await client.query(
      "SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'session'"
    )

    if (tableCheck.rows.length > 0) {
      const table = tableCheck.rows[0]
      console.log(`✅ Session table found in schema: ${table.schemaname}`)

      if (table.schemaname !== 'app') {
        console.log(`⚠️  Warning: Session table is in "${table.schemaname}" schema, not "app"`)
      }
    } else {
      console.log('⚠️  Warning: Session table not found')
    }

    console.log('\n✨ Migration complete! You can now start the application.')

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    if (error.code) {
      console.error(`   SQL Error Code: ${error.code}`)
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2]

if (!migrationFile) {
  console.error('Usage: tsx scripts/run-migration.ts <migration-file>')
  console.error('Example: tsx scripts/run-migration.ts scripts/migrations/001_create_app_schema.sql')
  process.exit(1)
}

runMigration(migrationFile)
