/**
 * Database Migration Script
 *
 * Creates the app schema and session table for PostgreSQL session storage
 * Azure PostgreSQL Standard Compliant - uses dedicated 'app' schema
 *
 * Run with: npm run migrate
 */

import 'dotenv/config'
import { createDatabasePool, closeDatabasePool } from '../apps/api/src/config/database.config.js'

// Azure PostgreSQL Standard: Create 'app' schema and session table
const MIGRATION_SQL = `
-- Create app schema (Azure standard requirement)
CREATE SCHEMA IF NOT EXISTS app;

-- Move existing session table if it's in public schema
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'session'
  ) THEN
    ALTER TABLE public.session SET SCHEMA app;
    RAISE NOTICE 'Moved session table from public to app schema';
  END IF;
END
$$;

-- Create session table in app schema
CREATE TABLE IF NOT EXISTS app.session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

-- Create index on expire column for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_session_expire ON app.session (expire);
`

async function migrate() {
  let pool

  try {
    console.log('🔄 Connecting to database...')
    console.log(`📍 Database: ${process.env.DB_CONNECTION_STRING?.split('@')[1] || 'unknown'}`)

    pool = createDatabasePool()

    console.log('\n📊 Running migration...')
    console.log('   - Creating app schema (Azure PostgreSQL standard)')
    console.log('   - Creating/moving session table to app schema')

    await pool.query(MIGRATION_SQL)

    console.log('\n✅ Migration completed successfully!')

    // Verify schema and table
    console.log('\n🔍 Verifying migration...')

    const schemaCheck = await pool.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'app'"
    )

    if (schemaCheck.rows.length > 0) {
      console.log('   ✅ Schema "app" exists')
    } else {
      console.log('   ❌ Warning: Schema "app" not found')
    }

    const tableCheck = await pool.query(
      "SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'session'"
    )

    if (tableCheck.rows.length > 0) {
      const table = tableCheck.rows[0]
      if (table.schemaname === 'app') {
        console.log('   ✅ Session table in app schema')
      } else {
        console.log(`   ⚠️  Session table in ${table.schemaname} schema (expected: app)`)
      }
    } else {
      console.log('   ❌ Session table not found')
    }

    console.log('\n✨ Database is ready! You can now start the application.')
    console.log('   Run: npm run dev')

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    if (error.code) {
      console.error(`   SQL Error Code: ${error.code}`)
    }
    console.error('\nTroubleshooting:')
    console.error('   - Check DB_CONNECTION_STRING in .env')
    console.error('   - Ensure PostgreSQL is running')
    console.error('   - Verify database user has CREATE permissions')
    process.exit(1)
  } finally {
    if (pool) {
      await closeDatabasePool(pool)
    }
  }
}

// Run migration
migrate()
