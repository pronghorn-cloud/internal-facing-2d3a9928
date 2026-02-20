# Database Connection Budget

## Overview

This document defines the connection budget for the Alberta Government Enterprise Template application when using PostgreSQL session storage. Proper connection budgeting prevents database connection exhaustion and ensures reliable application scaling.

## Azure PostgreSQL Standard Requirement

> **Standard Section 5.2**: Applications MUST document a connection budget using the formula:
> ```
> max_connections = pool_max × node_processes × max_instances_or_pods
> ```
> Budgets MUST reserve 5-10 connections for administrative and monitoring purposes.

---

## Connection Budget Formula

### Formula Components

```
Total Database Connections = (Pool Size × Processes × Instances) + Admin Reserve
```

Where:
- **Pool Size** (`DB_POOL_MAX`): Maximum connections per application process
- **Processes**: Number of Node.js processes per instance (typically 1)
- **Instances**: Number of application instances (pods/containers/VMs)
- **Admin Reserve**: Reserved connections for monitoring, backups, and administrative tasks

### Calculation Example

For a production deployment with:
- Pool size: `DB_POOL_MAX=10`
- Processes per instance: `1` (single Node.js process)
- Application instances: `3` (horizontal scaling)
- Admin reserve: `10` connections

```
Total = (10 × 1 × 3) + 10 = 40 connections required
```

---

## Default Configuration

### Development (Local)

```bash
# Single developer machine
DB_POOL_MAX=10
Processes: 1
Instances: 1
Admin Reserve: 5

Total Required: (10 × 1 × 1) + 5 = 15 connections
```

**PostgreSQL Configuration**: `max_connections = 100` (default PostgreSQL)

### Staging Environment

```bash
# 2 application instances for basic redundancy
DB_POOL_MAX=10
Processes: 1
Instances: 2
Admin Reserve: 10

Total Required: (10 × 1 × 2) + 10 = 30 connections
```

**PostgreSQL Configuration**: `max_connections = 50` (Azure Basic tier)

### Production Environment

```bash
# 5 application instances for high availability
DB_POOL_MAX=20
Processes: 1
Instances: 5
Admin Reserve: 10

Total Required: (20 × 1 × 5) + 10 = 110 connections
```

**PostgreSQL Configuration**: `max_connections = 150` (Azure Standard tier)

---

## Scaling Guidelines

### Vertical Scaling (Increasing Pool Size)

When increasing `DB_POOL_MAX`:

1. **Calculate new total**:
   ```
   New Total = (New Pool Size × Processes × Instances) + Admin Reserve
   ```

2. **Verify database capacity**:
   - Check current PostgreSQL `max_connections` setting
   - Ensure new total < `max_connections - admin_reserve`

3. **Update configuration**:
   ```bash
   # Update .env or environment variables
   DB_POOL_MAX=20  # Increased from 10
   ```

4. **Monitor pool utilization**:
   - Check `/api/v1/health` endpoint for pool statistics
   - Look for "Pool exhausted" warnings in logs

**When to increase pool size:**
- Pool utilization consistently > 80%
- Frequent "waiting for connection" messages in logs
- Health check reports waiting clients

**Risks of oversizing:**
- Database connection exhaustion
- Increased memory usage per instance
- Potential connection thrashing

### Horizontal Scaling (Adding Instances)

When adding application instances:

1. **Calculate new total**:
   ```
   New Total = (Pool Size × Processes × New Instance Count) + Admin Reserve
   ```

2. **Example: Scaling from 3 to 5 instances**:
   ```
   Before: (10 × 1 × 3) + 10 = 40 connections
   After:  (10 × 1 × 5) + 10 = 60 connections
   ```

3. **Verify database has capacity**:
   ```sql
   -- Check current max_connections
   SHOW max_connections;

   -- Check current active connections
   SELECT count(*) FROM pg_stat_activity;
   ```

4. **If needed, reduce pool size per instance**:
   ```bash
   # Reduce pool size to accommodate more instances
   DB_POOL_MAX=8  # Reduced from 10
   # New total: (8 × 1 × 5) + 10 = 50 connections
   ```

---

## Azure PostgreSQL Tier Limits

### Azure Database for PostgreSQL - Flexible Server

| Tier | vCores | RAM | Max Connections | Recommended Instances |
|------|--------|-----|-----------------|----------------------|
| Burstable B1ms | 1 | 2 GB | 50 | 1-2 (dev/test) |
| Burstable B2s | 2 | 4 GB | 100 | 2-4 (staging) |
| General Purpose D2s v3 | 2 | 8 GB | 212 | 5-10 (production) |
| General Purpose D4s v3 | 4 | 16 GB | 437 | 10-20 (high traffic) |
| General Purpose D8s v3 | 8 | 32 GB | 887 | 20-40 (enterprise) |

### Connection Budget by Tier

#### Burstable B1ms (50 connections)
```
Pool: 5 × Processes: 1 × Instances: 2 + Reserve: 10 = 20 connections
Safe scaling: Up to 8 instances @ pool size 5
```

#### Burstable B2s (100 connections)
```
Pool: 10 × Processes: 1 × Instances: 3 + Reserve: 10 = 40 connections
Safe scaling: Up to 9 instances @ pool size 10
```

#### General Purpose D2s v3 (212 connections)
```
Pool: 20 × Processes: 1 × Instances: 5 + Reserve: 10 = 110 connections
Safe scaling: Up to 10 instances @ pool size 20
```

---

## Monitoring Connection Usage

### Health Check Endpoint

The `/api/v1/health` endpoint provides real-time pool statistics:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "pool": {
      "utilization": "65.0%",
      "connections": {
        "total": 10,
        "idle": 4,
        "active": 6,
        "waiting": 0
      },
      "warnings": []
    }
  }
}
```

### Key Metrics to Monitor

1. **Pool Utilization**: Should be < 80% average, < 90% peak
2. **Waiting Connections**: Should be 0 under normal load
3. **Idle Connections**: Should have some idle capacity for bursts

### Database Query

Check actual database connections:

```sql
-- Current connection count
SELECT count(*) as current_connections
FROM pg_stat_activity;

-- Connections by application
SELECT application_name, count(*)
FROM pg_stat_activity
GROUP BY application_name;

-- Maximum connections configured
SHOW max_connections;

-- Connection usage percentage
SELECT
  (SELECT count(*) FROM pg_stat_activity) as current,
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max,
  round(100.0 * (SELECT count(*) FROM pg_stat_activity) /
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 1) as usage_pct;
```

---

## Troubleshooting

### Problem: "too_many_connections" Error

**Symptom**:
```
Error: SQLSTATE 53300: too_many_connections
```

**Diagnosis**:
1. Check health endpoint: `curl http://localhost:3000/api/v1/health`
2. Check database connections:
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   SHOW max_connections;
   ```

**Solutions**:

1. **Reduce pool size per instance**:
   ```bash
   # Reduce from 10 to 5
   DB_POOL_MAX=5
   ```

2. **Upgrade database tier** (if at capacity):
   - Azure: Scale up to tier with higher `max_connections`

3. **Scale down application instances** (temporarily):
   - Reduce number of pods/containers

4. **Terminate idle connections** (emergency):
   ```sql
   -- View idle connections
   SELECT pid, usename, application_name, state, state_change
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND state_change < now() - interval '10 minutes';

   -- Terminate specific connection (use with caution)
   SELECT pg_terminate_backend(pid) WHERE ...;
   ```

### Problem: High Pool Utilization

**Symptom**: Health check shows > 80% utilization consistently

**Solutions**:

1. **Increase pool size**:
   ```bash
   # Increase from 10 to 15
   DB_POOL_MAX=15
   ```

2. **Investigate slow queries**:
   - Check application logs for slow query warnings
   - Review PostgreSQL slow query log

3. **Optimize connection usage**:
   - Ensure connections are properly released
   - Check for connection leaks (connections not returned to pool)

### Problem: Connection Pool Exhausted

**Symptom**:
```
⚠️  Database pool exhausted! Consider increasing DB_POOL_MAX
```

**Diagnosis**:
- Health check shows `waiting > 0`
- Application experiencing delays acquiring connections

**Solutions**:

1. **Short term**: Increase pool size
   ```bash
   DB_POOL_MAX=20  # Increase capacity
   ```

2. **Long term**: Optimize application code
   - Reduce transaction duration
   - Implement connection pooling at external pooler level (PgBouncer)
   - Add caching layer to reduce database queries

---

## External Pooling (PgBouncer)

When using Azure Flexible Server's built-in PgBouncer:

### Configuration Changes

```bash
# Reduce application-side pool size
DB_POOL_MAX=5  # Down from 10

# Connection string points to PgBouncer
DB_CONNECTION_STRING=postgresql://user@host:6432/database?sslmode=require
```

### Connection Budget with PgBouncer

```
Application Pools: (5 × 1 × 5) = 25 connections to PgBouncer
PgBouncer Pool: 50 connections to PostgreSQL
Database max_connections: 100
```

**Benefits**:
- More efficient connection usage
- Lower memory footprint per application instance
- Better burst handling

**Tradeoffs**:
- Cannot use session-level features (SET commands, temp tables)
- Prepared statements may not work as expected

---

## Best Practices

1. **Start Conservative**:
   - Begin with `DB_POOL_MAX=10` for production
   - Scale up based on monitoring data

2. **Monitor Continuously**:
   - Check `/api/v1/health` regularly
   - Set up alerts for pool exhaustion

3. **Reserve Capacity**:
   - Keep 10-20% connection headroom
   - Reserve admin connections (10 minimum)

4. **Document Changes**:
   - Update this document when changing pool sizes
   - Record scaling decisions and rationale

5. **Test at Scale**:
   - Load test with realistic connection patterns
   - Verify budget before production deployment

6. **Plan for Growth**:
   - Review budget quarterly
   - Adjust as traffic patterns change

---

## Environment-Specific Budgets

### Development

```bash
DB_POOL_MAX=10
Max Instances=1
Total Required: 15 connections
Database max_connections: 100 (local PostgreSQL)
```

### Staging

```bash
DB_POOL_MAX=10
Max Instances=2
Total Required: 30 connections
Database max_connections: 100 (Azure Burstable B2s)
```

### Production

```bash
DB_POOL_MAX=20
Max Instances=5
Total Required: 110 connections
Database max_connections: 212 (Azure General Purpose D2s v3)
```

---

**Last Updated**: January 30, 2026
**Template Version**: 1.0.0
**Compliance**: Azure PostgreSQL - Node.js Application Standard Section 5.2
