# Database Migrations

This directory contains SQL migration scripts for setting up the PostgreSQL database schema.

## Overview

The application follows the **Azure PostgreSQL - Node.js Application Standard** which requires:
- All application tables must use a dedicated schema named `app`
- The `public` schema must not be used for application data
- Schema isolation via `search_path` configuration

## Running Migrations

### Prerequisites

1. PostgreSQL database created
2. Database connection string in `.env`:
   ```bash
   DB_CONNECTION_STRING=postgresql://username@host:port/database
   ```

### Run All Migrations

#### Using psql (Recommended)

```bash
# Linux/macOS
psql $DB_CONNECTION_STRING -f scripts/migrations/001_create_app_schema.sql

# Windows PowerShell
psql "$env:DB_CONNECTION_STRING" -f scripts/migrations/001_create_app_schema.sql
```

#### Using Docker

```bash
# If using Docker Compose for local PostgreSQL
docker-compose exec postgres psql -U postgres -d app_dev -f /migrations/001_create_app_schema.sql
```

### Migration Order

Migrations must be run in order:

1. **001_create_app_schema.sql** - Creates `app` schema and session table
   - Creates `app` schema
   - Moves existing `session` table from `public` to `app` (if exists)
   - Creates `session` table in `app` schema (if doesn't exist)

## Verification

After running migrations, verify the setup:

```sql
-- Check that app schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'app';

-- Check that session table is in app schema
SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'session';

-- Verify session table structure
\d app.session
```

Expected output:
```
 schemaname | tablename
------------+-----------
 app        | session
```

## Local Development Setup

### Docker Compose (Recommended)

If using Docker Compose for local development:

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
docker-compose exec postgres pg_isready

# Run migration
docker-compose exec postgres psql -U postgres -d app_dev << EOF
-- Create app schema
CREATE SCHEMA IF NOT EXISTS app;

-- Create session table
CREATE TABLE IF NOT EXISTS app.session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON app.session (expire);
EOF
```

### Manual PostgreSQL Setup

```bash
# Create database
createdb app_dev

# Run migration
psql app_dev -f scripts/migrations/001_create_app_schema.sql
```

## Azure PostgreSQL Flexible Server

### Using Azure CLI

```bash
# Get connection string from Azure
az postgres flexible-server show-connection-string \
  --server-name <server-name> \
  --database-name <database-name> \
  --admin-user <admin-user> \
  --admin-password <admin-password>

# Run migration
psql "<connection-string>" -f scripts/migrations/001_create_app_schema.sql
```

### Using Azure Portal Cloud Shell

1. Open Azure Portal
2. Navigate to your PostgreSQL Flexible Server
3. Click "Cloud Shell" icon
4. Upload migration file or paste SQL
5. Run: `psql -h <server>.postgres.database.azure.com -U <user> -d <database> -f 001_create_app_schema.sql`

## Production Deployment

### Best Practices

1. **Test migrations in staging first**
   ```bash
   # Staging
   psql $STAGING_DB_CONNECTION_STRING -f scripts/migrations/001_create_app_schema.sql

   # Verify
   psql $STAGING_DB_CONNECTION_STRING -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'app';"
   ```

2. **Backup before migration**
   ```bash
   # Create backup
   pg_dump $DB_CONNECTION_STRING > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Run during maintenance window**
   - Schedule migration during low-traffic period
   - Notify users of potential downtime
   - Have rollback plan ready

4. **Monitor after migration**
   ```bash
   # Check application logs
   kubectl logs -f deployment/api

   # Check database health
   curl https://your-app.alberta.ca/api/v1/health
   ```

### Rollback Plan

If migration fails:

```sql
-- Drop app schema (WARNING: This will delete all data in app schema)
DROP SCHEMA IF EXISTS app CASCADE;

-- Restore from backup
psql $DB_CONNECTION_STRING < backup_20260130_120000.sql
```

## Adding New Migrations

When adding new migrations:

1. Create a new file with sequential numbering:
   ```
   002_add_users_table.sql
   003_add_audit_log.sql
   ```

2. Follow the template:
   ```sql
   -- Migration: [Description]
   -- Date: YYYY-MM-DD
   -- Author: [Your Name]

   -- Use app schema
   SET search_path TO app, public;

   -- Your migration SQL here
   CREATE TABLE app.users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) NOT NULL UNIQUE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );

   -- Verification
   \d app.users
   ```

3. Update this README with the new migration
4. Test locally before committing

## Migration Tracking (Future Enhancement)

Currently, migrations are run manually. For production systems, consider implementing:

- **Migration tracking table** to record which migrations have been applied
- **Automated migration runner** as part of deployment pipeline
- **Migration rollback scripts** for each forward migration
- **Database versioning** to match application versions

Example migration tracking table:

```sql
CREATE TABLE IF NOT EXISTS app.schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT
);

INSERT INTO app.schema_migrations (version, description)
VALUES ('001', 'Create app schema and session table');
```

## Troubleshooting

### Error: "schema app does not exist"

**Solution:** Run migration `001_create_app_schema.sql`

```bash
psql $DB_CONNECTION_STRING -f scripts/migrations/001_create_app_schema.sql
```

### Error: "relation session does not exist"

**Solution:** The session table wasn't created properly. Re-run migration:

```bash
psql $DB_CONNECTION_STRING -c "DROP TABLE IF EXISTS app.session CASCADE;"
psql $DB_CONNECTION_STRING -f scripts/migrations/001_create_app_schema.sql
```

### Error: "permission denied for schema app"

**Solution:** Grant permissions to application user:

```sql
-- As superuser
GRANT USAGE ON SCHEMA app TO <your_app_user>;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO <your_app_user>;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO <your_app_user>;
```

### Application can't find session table

**Solution:** Verify `search_path` is configured:

```sql
-- Check current search_path
SHOW search_path;

-- Should return: app, public
```

If not set, the application automatically sets it on connection (see [apps/api/src/config/database.config.ts](../../apps/api/src/config/database.config.ts)).

## References

- [Azure PostgreSQL - Node.js Application Standard](../docs/SECURITY.md#database-security-azure-postgresql-compliance)
- [Connection Budget Documentation](../docs/CONNECTION_BUDGET.md)
- [Security Documentation](../docs/SECURITY.md)
