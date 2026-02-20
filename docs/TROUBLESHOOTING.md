# Troubleshooting Guide

## Common Issues and Solutions

### Development Server Issues

#### Hot Reload and Signal Handling

**Implementation:** The template uses Node.js native `--watch` mode with `--import tsx` for development. This ensures proper signal handling and graceful shutdown while maintaining hot reload functionality.

**Why Not tsx watch?** When `tsx watch` is run via `npm run dev`, npm v10.3.0+ intercepts SIGINT/SIGTERM signals and force-kills the tsx process before graceful shutdown can complete. Node.js native watch mode eliminates this issue by providing a direct signal path to the application.

**Expected Behavior:** After pressing Ctrl+C once, you should see:
```
📡 SIGINT received, starting graceful shutdown...
✅ HTTP server closed (no longer accepting connections)
🔌 Closing database pool...
✅ Database pool closed
✅ Graceful shutdown complete
```

The port should be freed immediately, allowing you to restart the server without any "EADDRINUSE" errors.

**If Port 3000 is Still Occupied:**

This indicates an unexpected issue. To diagnose:

```bash
# On Windows:
netstat -ano | findstr :3000
taskkill /F /PID <process_id>

# On Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

Then report the issue, as graceful shutdown should work correctly in both development and production.

---

### Database Migration Errors

#### Error: "schema app does not exist"

**Solution:** Run the migration:
```bash
npm run migrate
```

#### Error: "permission denied for schema app"

**Solution:** Grant permissions to your database user:
```sql
-- As superuser
GRANT USAGE ON SCHEMA app TO your_app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO your_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO your_app_user;
```

#### Error: "relation session does not exist"

**Solution:** Re-run the migration:
```bash
# Drop and recreate
psql $DB_CONNECTION_STRING -c "DROP TABLE IF EXISTS app.session CASCADE;"
npm run migrate
```

---

### TypeScript Compilation Errors

#### Error: Pre-existing TypeScript errors preventing build

**Current Known Issues:**
- `unused variable` warnings in controllers and middleware
- `Property 'rateLimit' does not exist on type 'Request'` in rate-limit.middleware.ts
- Missing type declarations for some Express extensions

**Solution:** These are pre-existing issues that don't affect development mode. To fix:

1. **Add type declarations:**
   ```typescript
   // In apps/api/src/types/express.d.ts
   import 'express'

   declare module 'express' {
     interface Request {
       rateLimit?: {
         limit: number
         current: number
         remaining: number
         resetTime: Date
       }
     }
   }
   ```

2. **Fix unused variables:**
   - Prefix with underscore: `_user`, `_res`
   - Or remove if truly unused

---

### Database Connection Issues

#### Error: "too_many_connections"

**Cause:** Database has reached `max_connections` limit.

**Solution:**

1. **Check current connections:**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   SHOW max_connections;
   ```

2. **Reduce pool size:**
   ```bash
   # In .env
   DB_POOL_MAX=5  # Reduce from 10
   ```

3. **Upgrade database tier** (Azure):
   - Scale to tier with higher `max_connections`
   - See [CONNECTION_BUDGET.md](./CONNECTION_BUDGET.md)

#### Error: "Connection timeout"

**Cause:** Database is unreachable or slow to respond.

**Solution:**

1. **Check database is running:**
   ```bash
   psql $DB_CONNECTION_STRING -c "SELECT 1"
   ```

2. **Increase timeout:**
   ```bash
   # In .env
   DB_CONNECTION_TIMEOUT=10000  # 10 seconds
   ```

3. **Check network connectivity:**
   - Firewall rules
   - SSL/TLS configuration
   - VPN connection (if required)

---

### Session Storage Issues

#### Sessions not persisting across restarts

**Cause:** Using memory session store instead of PostgreSQL.

**Solution:**

```bash
# In .env
SESSION_STORE=postgres  # Change from memory
```

Then restart the server.

#### Error: "Session table not found"

**Solution:** Run migration:
```bash
npm run migrate
```

---

### Health Check Failures

#### Health check returns 503 (Service Unavailable)

**Cause:** Database connection failed.

**Check:**
```bash
curl http://localhost:3000/api/v1/health
```

**Solution:**

1. **Verify database is running:**
   ```bash
   psql $DB_CONNECTION_STRING -c "SELECT 1"
   ```

2. **Check pool statistics:**
   ```bash
   curl http://localhost:3000/api/v1/health | jq '.data.pool'
   ```

3. **Look for pool exhaustion:**
   - `waiting > 0`: Pool is exhausted
   - `utilization > 90%`: Increase `DB_POOL_MAX`

---

### Docker Issues

#### Error: "port is already allocated"

**Solution:**
```bash
# Stop all containers
docker-compose down

# Remove orphaned containers
docker-compose down --remove-orphans

# Start fresh
docker-compose up -d
```

#### Error: "network not found"

**Solution:**
```bash
# Remove and recreate network
docker network rm template-network
docker-compose up -d
```

---

### SSL/TLS Issues

#### Error: "certificate verification failed"

**Cause:** `DB_SSL_REJECT_UNAUTHORIZED=true` but certificate is invalid.

**Solutions:**

1. **For development (local PostgreSQL):**
   ```bash
   DB_SSL_REJECT_UNAUTHORIZED=false
   ```

2. **For production (Azure PostgreSQL):**
   - Ensure correct certificate chain
   - Use `sslmode=require` in connection string
   - Download and specify CA certificate if needed

---

### Performance Issues

#### Slow queries (> 1 second)

**Check logs:**
```
🐌 Slow query detected: { query: 'getUserById', duration: '1234ms' }
```

**Solutions:**

1. **Add indexes:**
   ```sql
   CREATE INDEX idx_users_email ON app.users(email);
   ```

2. **Optimize queries:**
   - Use `EXPLAIN ANALYZE`
   - Avoid N+1 queries
   - Use pagination

3. **Check pool utilization:**
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

#### High pool utilization (> 80%)

**Solution:**

```bash
# In .env
DB_POOL_MAX=20  # Increase from 10
```

But verify database tier can handle increased connections. See [CONNECTION_BUDGET.md](./CONNECTION_BUDGET.md).

---

### Development Environment

#### tsx watch not detecting changes

**Solution:**

1. **Restart dev server:**
   ```bash
   npm run kill-port 3000
   npm run dev
   ```

2. **Clear tsx cache:**
   ```bash
   rm -rf node_modules/.cache
   ```

#### Hot reload causing issues

**Solution:** Use production build mode:
```bash
npm run build:api
node apps/api/dist/server.js
```

---

## Getting Help

### Check Logs

**Development:**
```bash
npm run dev
# Logs appear in console
```

**Production:**
```bash
# Docker
docker-compose logs -f api

# Kubernetes
kubectl logs -f deployment/api
```

### Enable Debug Logging

```bash
# In .env
LOG_LEVEL=debug
NODE_ENV=development
```

### Verify Configuration

```bash
# Check environment variables
npm run validate-env

# Test database connection
npm run migrate

# Check health endpoint
curl http://localhost:3000/api/v1/health
```

### Report Issues

If you're still experiencing issues:

1. Check existing documentation:
   - [SECURITY.md](./SECURITY.md)
   - [CONNECTION_BUDGET.md](./CONNECTION_BUDGET.md)
   - [AZURE_POSTGRESQL_COMPLIANCE.md](./AZURE_POSTGRESQL_COMPLIANCE.md)

2. Gather diagnostic information:
   ```bash
   # Environment
   node --version
   npm --version

   # Database
   psql $DB_CONNECTION_STRING -c "SELECT version();"

   # Health check
   curl http://localhost:3000/api/v1/health
   ```

3. Create an issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Logs (sanitize sensitive information)

---

**Last Updated:** January 30, 2026
