# Development Guide

## Prerequisites

Before starting development, ensure you have the following installed:

- **Node.js** 24.x or higher ([nodejs.org](https://nodejs.org/))
- **npm** 10.x or higher (included with Node.js)
- **PostgreSQL** 16.x or higher ([postgresql.org](https://www.postgresql.org/download/))
- **Git** for version control
- **VS Code** (recommended) with extensions:
  - Vue - Official (Vue Language Features)
  - TypeScript Vue Plugin (Volar)
  - ESLint
  - Prettier

**Optional**:
- **Docker Desktop** for containerized development ([docker.com](https://www.docker.com/products/docker-desktop))
- **pgAdmin** or **DBeaver** for database management

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd vue-node-alberta-enterprise-template

# Install all dependencies (monorepo)
npm install
```

**What happens**:
- Installs dependencies for all workspaces (apps/web, apps/api, packages/*)
- Sets up Git hooks via Husky (pre-commit linting)
- Links workspace packages internally

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings (or use defaults)
nano .env
```

**Minimal required configuration**:
```bash
# Database connection (matches docker-compose.yml)
DB_CONNECTION_STRING=  # postgresql://username@localhost:5432/app_dev

# Session secret (generate with: openssl rand -base64 32)
SESSION_SECRET=  # openssl rand -base64 32

# Auth driver (mock for local dev)
AUTH_DRIVER=mock

# Frontend origin
CORS_ORIGIN=http://localhost:5173
```

### 3. Set Up Database

**Option A: Local PostgreSQL**

```bash
# Create database
createdb app_dev

# Run migrations (creates session table)
npm run migrate
```

**Option B: Docker PostgreSQL**

```bash
# Start PostgreSQL container
docker run -d \
  --name postgres-dev \
  -e POSTGRES_DB=app_dev \
  -e POSTGRES_USER -e POSTGRES_PASSWORD \
  -p 5432:5432 \
  postgres:16-alpine

# Run migrations
npm run migrate
```

### 4. Start Development Servers

**Option A: Run both servers** (recommended for full-stack development):

```bash
npm run dev
```

This starts:
- **API**: http://localhost:3000
- **Web**: http://localhost:5173

**Option B: Run servers separately** (better signal handling on Windows):

```bash
# Terminal 1: API server
npm run dev:api

# Terminal 2: Web server
npm run dev:web
```

### 5. Verify Setup

Open your browser:
- **Web App**: http://localhost:5173
- **API Documentation**: http://localhost:3000/api-docs (Swagger UI)
- **OpenAPI Spec**: http://localhost:3000/api/v1/openapi.json
- **API Health Check**: http://localhost:3000/api/v1/health
- **API Info**: http://localhost:3000/api/v1/info

Expected health check response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-01-30T...",
    "environment": "development",
    "version": "1.0.0",
    "pool": {
      "utilization": "20%",
      "connections": { "total": 2, "idle": 2, "active": 0 }
    }
  }
}
```

## Development Workflow

### Project Structure

```
vue-node-alberta-enterprise-template/
├── apps/
│   ├── web/              # Vue 3 frontend
│   │   ├── src/
│   │   │   ├── components/   # Reusable Vue components
│   │   │   ├── views/        # Page components
│   │   │   ├── router/       # Vue Router config
│   │   │   ├── stores/       # Pinia state management
│   │   │   ├── assets/       # Static assets
│   │   │   ├── types/        # TypeScript types
│   │   │   └── main.ts       # Entry point
│   │   ├── public/       # Public static files
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/              # Express backend
│       ├── src/
│       │   ├── routes/       # API route definitions
│       │   ├── controllers/  # Request handlers
│       │   ├── services/     # Business logic
│       │   ├── middleware/   # Express middleware
│       │   ├── config/       # Configuration
│       │   ├── types/        # TypeScript types
│       │   ├── utils/        # Utility functions
│       │   ├── app.ts        # Express app setup
│       │   └── server.ts     # Server entry point
│       ├── tests/        # API tests
│       └── package.json
│
├── packages/
│   ├── shared/           # Shared types and schemas
│   ├── config/           # Configuration validation (Zod)
│   └── auth/             # Authentication drivers
│
├── docker/               # Docker configuration
├── docs/                 # Documentation
├── scripts/              # Utility scripts
├── tests/                # Integration & E2E tests
├── .env                  # Local environment variables (git-ignored)
├── .env.example          # Environment template
├── package.json          # Root package.json (workspaces)
└── tsconfig.base.json    # Shared TypeScript config
```

### Making Changes

#### Frontend Development

**1. Create a new component**:

```bash
# Create component file
touch apps/web/src/components/UserCard.vue
```

```vue
<!-- apps/web/src/components/UserCard.vue -->
<template>
  <goa-card width="400px" elevation="2">
    <h3>{{ user.name }}</h3>
    <p>{{ user.email }}</p>
    <GoabButton type="primary" @click="handleEdit">
      Edit User
    </GoabButton>
  </goa-card>
</template>

<script setup lang="ts">
import { GoabButton } from '@/components/goa'

interface Props {
  user: {
    id: string
    name: string
    email: string
  }
}

const props = defineProps<Props>()

function handleEdit() {
  console.log('Editing user:', props.user.id)
}
</script>
```

**2. Create a new view**:

```bash
# Create view file
touch apps/web/src/views/UsersView.vue
```

```vue
<!-- apps/web/src/views/UsersView.vue -->
<template>
  <AppLayout>
    <h1>Users</h1>
    <div v-for="user in users" :key="user.id">
      <UserCard :user="user" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import UserCard from '@/components/UserCard.vue'

const users = ref([])

onMounted(async () => {
  const response = await fetch('/api/v1/users')
  users.value = await response.json()
})
</script>
```

**3. Add route**:

```typescript
// apps/web/src/router/index.ts
import UsersView from '@/views/UsersView.vue'

const router = createRouter({
  routes: [
    // ... existing routes
    {
      path: '/users',
      name: 'users',
      component: UsersView,
      meta: { requiresAuth: true }
    }
  ]
})
```

#### Backend Development

**1. Create a new API endpoint**:

```typescript
// apps/api/src/routes/users.routes.ts
import { Router } from 'express'
import { usersController } from '../controllers/users.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/', requireAuth, usersController.getAll)
router.get('/:id', requireAuth, usersController.getById)
router.post('/', requireAuth, usersController.create)
router.put('/:id', requireAuth, usersController.update)
router.delete('/:id', requireAuth, usersController.delete)

export default router
```

**2. Create controller**:

```typescript
// apps/api/src/controllers/users.controller.ts
import { Request, Response } from 'express'
import { usersService } from '../services/users.service.js'

export const usersController = {
  async getAll(req: Request, res: Response) {
    try {
      const users = await usersService.findAll()
      res.json({ success: true, data: users })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error.message, code: 'INTERNAL_ERROR' }
      })
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const user = await usersService.findById(req.params.id)
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found', code: 'NOT_FOUND' }
        })
      }
      res.json({ success: true, data: user })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error.message, code: 'INTERNAL_ERROR' }
      })
    }
  }

  // ... create, update, delete methods
}
```

**3. Create service**:

```typescript
// apps/api/src/services/users.service.ts
import type { Pool } from 'pg'

let dbPool: Pool

export function setDbPool(pool: Pool) {
  dbPool = pool
}

export const usersService = {
  async findAll() {
    const result = await dbPool.query('SELECT * FROM app.users ORDER BY name')
    return result.rows
  },

  async findById(id: string) {
    const result = await dbPool.query(
      'SELECT * FROM app.users WHERE id = $1',
      [id]
    )
    return result.rows[0]
  },

  async create(data: { name: string; email: string }) {
    const result = await dbPool.query(
      'INSERT INTO app.users (name, email) VALUES ($1, $2) RETURNING *',
      [data.name, data.email]
    )
    return result.rows[0]
  }

  // ... update, delete methods
}
```

**4. Register routes**:

```typescript
// apps/api/src/routes/index.ts
import usersRoutes from './users.routes.js'

export function registerRoutes(app: Express) {
  // ... existing routes
  app.use('/api/v1/users', usersRoutes)
}
```

### Hot Reload

**Frontend (Vite)**: Changes to `.vue`, `.ts`, `.css` files trigger instant hot module replacement (HMR).

**Backend (Node.js native watch)**: Changes to `.ts` files trigger server restart.

**Note**: The API server uses Node.js native `--watch` mode (not `tsx watch`) for proper signal handling during graceful shutdown.

## Database Migrations

### Creating a Migration

```bash
# Create new migration file
touch scripts/migrations/002_add_users_table.sql
```

```sql
-- scripts/migrations/002_add_users_table.sql

-- Up migration
CREATE TABLE app.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON app.users(email);

-- Down migration (optional, for rollback)
-- DROP TABLE app.users;
```

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Or manually with psql
psql $DB_CONNECTION_STRING < scripts/migrations/002_add_users_table.sql
```

### Migration Best Practices

1. **Naming**: Use sequential numbers `001_`, `002_`, etc.
2. **Idempotency**: Use `IF NOT EXISTS` for safe re-runs
3. **Schema**: Always use `app` schema (not `public`)
4. **Indexes**: Add indexes for frequently queried columns
5. **Rollback**: Include `-- Down migration` comments for reversibility

## Testing

### Unit Tests

**API Unit Tests** (Vitest):

```bash
# Run all unit tests
npm run test:unit

# Watch mode
npm run test:unit -- --watch

# Coverage
npm run test:unit -- --coverage
```

**Writing unit tests**:

```typescript
// apps/api/src/services/__tests__/users.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usersService } from '../users.service.js'

describe('usersService', () => {
  beforeEach(() => {
    // Setup test database or mocks
  })

  it('should find all users', async () => {
    const users = await usersService.findAll()
    expect(users).toBeInstanceOf(Array)
  })

  it('should find user by ID', async () => {
    const user = await usersService.findById('test-id')
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('email')
  })
})
```

### Integration Tests

**API Integration Tests** (Supertest):

```bash
# Run integration tests
npm run test:integration
```

**Writing integration tests**:

```typescript
// tests/integration/users.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../apps/api/src/app.js'

describe('Users API', () => {
  const app = createApp()

  it('GET /api/v1/users should return users', async () => {
    const response = await request(app)
      .get('/api/v1/users')
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body).toHaveProperty('data')
    expect(response.body.data).toBeInstanceOf(Array)
  })

  it('POST /api/v1/users should create user', async () => {
    const newUser = { name: 'Test User', email: 'test@alberta.ca' }

    const response = await request(app)
      .post('/api/v1/users')
      .send(newUser)
      .expect(201)

    expect(response.body.data).toMatchObject(newUser)
  })
})
```

### E2E Tests

**End-to-End Tests** (Playwright):

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e -- --ui

# Run specific test
npm run test:e2e -- tests/e2e/login.spec.ts
```

**Writing E2E tests**:

```typescript
// tests/e2e/users.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Users Page', () => {
  test('should display users list', async ({ page }) => {
    await page.goto('http://localhost:5173/users')

    // Check page title
    await expect(page.locator('h1')).toHaveText('Users')

    // Check users are rendered
    const userCards = page.locator('.user-card')
    await expect(userCards).toHaveCount(3)
  })

  test('should navigate to user profile', async ({ page }) => {
    await page.goto('http://localhost:5173/users')

    // Click first user
    await page.locator('.user-card').first().click()

    // Verify navigation
    await expect(page).toHaveURL(/\/users\/[a-zA-Z0-9-]+/)
  })
})
```

## Linting and Formatting

### ESLint

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

**Configuration**: [.eslintrc.cjs](.eslintrc.cjs)

### Prettier

```bash
# Format all files
npm run format

# Check formatting (CI)
npm run format:check
```

**Configuration**: [.prettierrc.json](.prettierrc.json)

### Pre-commit Hooks

Husky runs linting and formatting automatically on commit:

```bash
# Husky pre-commit hook runs:
# 1. ESLint on staged files
# 2. Prettier on staged files
# 3. TypeScript type checking
```

**Bypass (not recommended)**:
```bash
git commit --no-verify
```

## Type Checking

### TypeScript

```bash
# Type check all workspaces
npm run typecheck

# Type check specific workspace
npm run typecheck:api
npm run typecheck:web
```

### Shared Types

**Define shared types** in [packages/shared/](../packages/shared/):

```typescript
// packages/shared/src/types/user.types.ts
export interface User {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserDto {
  name: string
  email: string
}
```

**Use in frontend**:
```typescript
import type { User } from '@template/shared'
```

**Use in backend**:
```typescript
import type { User } from '@template/shared'
```

## Debugging

### VS Code Debugging

**Frontend (Chrome DevTools)**:

1. Press F12 in browser
2. Sources tab → Open file
3. Set breakpoints
4. Trigger code execution

**Backend (Node.js Inspector)**:

[.vscode/launch.json](.vscode/launch.json):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/apps/api",
      "runtimeExecutable": "node",
      "runtimeArgs": ["--import", "tsx", "--inspect", "src/server.ts"],
      "console": "integratedTerminal"
    }
  ]
}
```

**Usage**:
1. Open VS Code
2. Press F5 or click "Run and Debug"
3. Select "Debug API"
4. Set breakpoints in `.ts` files
5. Trigger API requests

### Logging

**Development logging**:

```typescript
// API logs (Morgan)
console.log('Debug info:', data) // Shows in terminal

// Frontend logs
console.log('Component mounted:', componentName)
```

**Production logging**: See [docs/SECURITY.md](SECURITY.md#logging) for PII-safe logging patterns.

## Environment Variables

### Loading Behavior

**Development** ([apps/api/src/server.ts:1-11](../apps/api/src/server.ts#L1-L11)):
- Uses `find-up` to locate `.env` file in monorepo root
- Falls back to process.env if no `.env` file

**Production**:
- Reads from platform environment variables (Azure App Service, OpenShift)
- No `.env` file required

### Validation

```bash
# Validate environment configuration
npm run validate-env
```

**Validation schema**: [packages/config/src/schemas/api.config.schema.ts](../packages/config/src/schemas/api.config.schema.ts)

### Adding New Variables

**1. Add to schema**:

```typescript
// packages/config/src/schemas/api.config.schema.ts
export const ApiConfigSchema = z.object({
  // ... existing fields
  NEW_FEATURE_ENABLED: z.coerce.boolean().default(false)
})
```

**2. Add to .env.example**:

```bash
# Feature Flags
NEW_FEATURE_ENABLED=true
```

**3. Use in code**:

```typescript
import { getConfig } from '@template/config'

const config = getConfig()
if (config.NEW_FEATURE_ENABLED) {
  // Feature code
}
```

## Common Tasks

### Reset Database

```bash
# Drop and recreate database
dropdb app_dev
createdb app_dev

# Re-run migrations
npm run migrate
```

### Clear Node Modules

```bash
# Clean all node_modules (root + workspaces)
npm run clean

# Reinstall
npm install
```

### Update Dependencies

```bash
# Check for outdated packages
npm outdated

# Update all packages
npm update

# Update specific package
npm update <package-name> --workspace=apps/api
```

### Generate CSRF Token

```bash
# For testing API endpoints
curl http://localhost:3000/api/v1/csrf-token
```

**Response**:
```json
{
  "token": "abc123..."
}
```

**Use in requests**:
```bash
curl -X POST http://localhost:3000/api/v1/resource \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: abc123..." \
  -d '{"data":"value"}'
```

## Troubleshooting

See [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed troubleshooting guides.

**Quick fixes**:

| Issue | Solution |
|-------|----------|
| Port 3000 already in use | `lsof -ti:3000 \| xargs kill` (Mac/Linux) or check TROUBLESHOOTING.md for Windows |
| Database connection failed | Verify PostgreSQL is running, check `DB_CONNECTION_STRING` in `.env` |
| Frontend can't reach API | Check CORS_ORIGIN matches web dev server URL |
| TypeScript errors | Run `npm run typecheck` to see all errors |
| Hot reload not working | Restart dev servers with `npm run dev` |

## Additional Resources

- [Architecture Documentation](ARCHITECTURE.md)
- [Authentication Setup](AUTH-SETUP.md)
- [GoA Components Guide](GOA-COMPONENTS.md)
- [Security Documentation](SECURITY.md)
- [Testing Documentation](TESTING.md)
- [Deployment Guide](DEPLOYMENT.md)

---

**Last Updated**: 2026-01-30
