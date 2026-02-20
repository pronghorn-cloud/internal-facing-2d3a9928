-- Migration: Create app schema and move session table
-- Azure PostgreSQL Standard requirement: Applications MUST use a dedicated schema named 'app'
--
-- Run this migration before starting the application:
-- psql $DB_CONNECTION_STRING -f scripts/migrations/001_create_app_schema.sql

-- Create app schema
CREATE SCHEMA IF NOT EXISTS app;

-- Grant usage on app schema to application user
-- Replace 'app_user' with your actual database user
-- GRANT USAGE ON SCHEMA app TO app_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO app_user;

-- Set default privileges for future tables
-- ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO app_user;

-- Move session table to app schema (if it exists in public schema)
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

-- Create session table in app schema (if it doesn't exist)
-- This is the standard connect-pg-simple schema
CREATE TABLE IF NOT EXISTS app.session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

-- Create index on expire column for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_session_expire ON app.session (expire);

-- Verify schema setup
DO $$
BEGIN
  RAISE NOTICE 'Schema setup complete!';
  RAISE NOTICE 'Session table location: %', (
    SELECT schemaname || '.' || tablename
    FROM pg_tables
    WHERE tablename = 'session'
  );
END
$$;
