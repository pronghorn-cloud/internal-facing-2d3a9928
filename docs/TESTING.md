# Testing Documentation

## Overview

This template uses a comprehensive testing strategy with multiple test types to ensure code quality, reliability, and maintainability.

## Testing Stack

| Test Type | Tool | Purpose | Location |
|-----------|------|---------|----------|
| Unit | Vitest | Test individual functions/methods | `apps/*/src/**/__tests__/` |
| Integration | Supertest + Vitest | Test API endpoints | `tests/integration/` |
| E2E | Playwright | Test user flows | `tests/e2e/` |
| Type Checking | TypeScript | Compile-time type safety | All `.ts` files |
| Linting | ESLint | Code quality rules | All `.ts/.vue` files |
| Formatting | Prettier | Code style consistency | All files |

## Testing Pyramid

```
         /\
        /E2E\          Few (5-10)  - Slow, brittle, expensive
       /------\
      /Integr.\       Some (20-30) - Medium speed, API-level
     /----------\
    /   Unit     \    Many (100+)  - Fast, isolated, cheap
   /--------------\
```

**Strategy**: Write mostly unit tests, some integration tests, few E2E tests.

## Unit Testing

### Setup

**Framework**: Vitest (fast, Vite-powered test runner)

**Configuration**: [apps/api/vitest.config.ts](../apps/api/vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.test.ts']
    }
  }
})
```

### Running Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Watch mode (re-run on file changes)
npm run test:unit -- --watch

# Run specific test file
npm run test:unit -- apps/api/src/services/__tests__/auth.service.test.ts

# Run with coverage
npm run test:unit -- --coverage

# Run in specific workspace
npm run test --workspace=apps/api
```

### Writing Unit Tests

#### Example: Service Test

```typescript
// apps/api/src/services/__tests__/users.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usersService } from '../users.service.js'
import type { Pool } from 'pg'

// Mock database pool
const mockPool = {
  query: vi.fn()
} as unknown as Pool

beforeEach(() => {
  vi.clearAllMocks()
  usersService.setDbPool(mockPool)
})

describe('usersService', () => {
  describe('findAll', () => {
    it('should return all users', async () => {
      // Arrange
      const mockUsers = [
        { id: '1', name: 'John Doe', email: 'john@alberta.ca' },
        { id: '2', name: 'Jane Smith', email: 'jane@alberta.ca' }
      ]
      mockPool.query.mockResolvedValue({ rows: mockUsers })

      // Act
      const users = await usersService.findAll()

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM app.users ORDER BY name')
      expect(users).toEqual(mockUsers)
      expect(users).toHaveLength(2)
    })

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed')
      mockPool.query.mockRejectedValue(dbError)

      // Act & Assert
      await expect(usersService.findAll()).rejects.toThrow('Database connection failed')
    })
  })

  describe('findById', () => {
    it('should return user by ID', async () => {
      // Arrange
      const mockUser = { id: '1', name: 'John Doe', email: 'john@alberta.ca' }
      mockPool.query.mockResolvedValue({ rows: [mockUser] })

      // Act
      const user = await usersService.findById('1')

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM app.users WHERE id = $1',
        ['1']
      )
      expect(user).toEqual(mockUser)
    })

    it('should return undefined if user not found', async () => {
      // Arrange
      mockPool.query.mockResolvedValue({ rows: [] })

      // Act
      const user = await usersService.findById('999')

      // Assert
      expect(user).toBeUndefined()
    })
  })

  describe('create', () => {
    it('should create a new user', async () => {
      // Arrange
      const newUserData = { name: 'New User', email: 'new@alberta.ca' }
      const createdUser = { id: '3', ...newUserData, createdAt: new Date() }
      mockPool.query.mockResolvedValue({ rows: [createdUser] })

      // Act
      const user = await usersService.create(newUserData)

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO app.users (name, email) VALUES ($1, $2) RETURNING *',
        [newUserData.name, newUserData.email]
      )
      expect(user).toEqual(createdUser)
    })

    it('should handle duplicate email errors', async () => {
      // Arrange
      const duplicateError = new Error('duplicate key value violates unique constraint')
      duplicateError.code = '23505'
      mockPool.query.mockRejectedValue(duplicateError)

      // Act & Assert
      await expect(usersService.create({ name: 'Test', email: 'existing@alberta.ca' }))
        .rejects.toThrow('duplicate key')
    })
  })
})
```

#### Example: Utility Function Test

```typescript
// apps/api/src/utils/__tests__/validation.test.ts
import { describe, it, expect } from 'vitest'
import { validateEmail, validatePostalCode } from '../validation.js'

describe('validateEmail', () => {
  it('should validate correct email addresses', () => {
    expect(validateEmail('user@alberta.ca')).toBe(true)
    expect(validateEmail('user.name@sub.alberta.ca')).toBe(true)
    expect(validateEmail('user+tag@alberta.ca')).toBe(true)
  })

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false)
    expect(validateEmail('invalid@')).toBe(false)
    expect(validateEmail('@alberta.ca')).toBe(false)
    expect(validateEmail('user@')).toBe(false)
  })
})

describe('validatePostalCode', () => {
  it('should validate Canadian postal codes', () => {
    expect(validatePostalCode('T2P 1J9')).toBe(true)
    expect(validatePostalCode('T2P1J9')).toBe(true)
    expect(validatePostalCode('T2P 1j9')).toBe(true) // Case insensitive
  })

  it('should reject invalid postal codes', () => {
    expect(validatePostalCode('12345')).toBe(false)
    expect(validatePostalCode('ABCDEF')).toBe(false)
    expect(validatePostalCode('T2P')).toBe(false)
  })
})
```

#### Example: Vue Component Test

```typescript
// apps/web/src/components/__tests__/UserCard.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UserCard from '../UserCard.vue'

describe('UserCard', () => {
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@alberta.ca'
  }

  it('should render user information', () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser }
    })

    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('john@alberta.ca')
  })

  it('should emit edit event when button clicked', async () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser }
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')[0]).toEqual([mockUser.id])
  })

  it('should display placeholder when no email', () => {
    const userWithoutEmail = { id: '1', name: 'John Doe', email: '' }
    const wrapper = mount(UserCard, {
      props: { user: userWithoutEmail }
    })

    expect(wrapper.text()).toContain('No email provided')
  })
})
```

### Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **Test One Thing**: Each test should verify one behavior
3. **Descriptive Names**: `should return 404 when user not found`
4. **Mock External Dependencies**: Database, APIs, file system
5. **Test Edge Cases**: Empty arrays, null values, errors
6. **Avoid Testing Implementation Details**: Test behavior, not internals

## Integration Testing

### Setup

**Framework**: Supertest (HTTP assertions) + Vitest

**Configuration**: [tests/integration/vitest.config.ts](../tests/integration/vitest.config.ts)

### Running Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- tests/integration/auth.test.ts
```

### Writing Integration Tests

```typescript
// tests/integration/users.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../apps/api/src/app.js'
import type { Express } from 'express'

describe('Users API Integration Tests', () => {
  let app: Express

  beforeAll(() => {
    // Create Express app with test configuration
    process.env.NODE_ENV = 'test'
    process.env.DB_CONNECTION_STRING = 'postgresql://test@localhost:5432/test_db'
    app = createApp()
  })

  afterAll(async () => {
    // Clean up test database
    const pool = app.get('dbPool')
    await pool.query('TRUNCATE TABLE app.users CASCADE')
    await pool.end()
  })

  describe('GET /api/v1/users', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(401)

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED'
        }
      })
    })

    it('should return users when authenticated', async () => {
      // Create authenticated session
      const agent = request.agent(app)
      await agent.post('/api/v1/auth/login').send({ user: 'test-user' })

      const response = await agent
        .get('/api/v1/users')
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('data')
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should paginate results', async () => {
      const agent = request.agent(app)
      await agent.post('/api/v1/auth/login').send({ user: 'test-user' })

      const response = await agent
        .get('/api/v1/users?page=1&limit=10')
        .expect(200)

      expect(response.body.data.length).toBeLessThanOrEqual(10)
      expect(response.body).toHaveProperty('pagination')
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        pages: expect.any(Number)
      })
    })
  })

  describe('POST /api/v1/users', () => {
    it('should create a new user', async () => {
      const agent = request.agent(app)
      await agent.post('/api/v1/auth/login').send({ user: 'test-user' })

      const newUser = {
        name: 'Test User',
        email: 'test@alberta.ca'
      }

      const response = await agent
        .post('/api/v1/users')
        .send(newUser)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject(newUser)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data).toHaveProperty('createdAt')
    })

    it('should validate required fields', async () => {
      const agent = request.agent(app)
      await agent.post('/api/v1/auth/login').send({ user: 'test-user' })

      const invalidUser = { name: 'Test User' } // Missing email

      const response = await agent
        .post('/api/v1/users')
        .send(invalidUser)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'email' })
      )
    })

    it('should prevent duplicate emails', async () => {
      const agent = request.agent(app)
      await agent.post('/api/v1/auth/login').send({ user: 'test-user' })

      const user = { name: 'Test User', email: 'duplicate@alberta.ca' }

      // Create first user
      await agent.post('/api/v1/users').send(user).expect(201)

      // Try to create duplicate
      const response = await agent
        .post('/api/v1/users')
        .send(user)
        .expect(409)

      expect(response.body.error.code).toBe('DUPLICATE_ENTRY')
    })
  })

  describe('PUT /api/v1/users/:id', () => {
    it('should update an existing user', async () => {
      const agent = request.agent(app)
      await agent.post('/api/v1/auth/login').send({ user: 'test-user' })

      // Create user
      const createResponse = await agent
        .post('/api/v1/users')
        .send({ name: 'Original Name', email: 'original@alberta.ca' })

      const userId = createResponse.body.data.id

      // Update user
      const updateResponse = await agent
        .put(`/api/v1/users/${userId}`)
        .send({ name: 'Updated Name' })
        .expect(200)

      expect(updateResponse.body.data.name).toBe('Updated Name')
      expect(updateResponse.body.data.email).toBe('original@alberta.ca')
    })

    it('should return 404 for non-existent user', async () => {
      const agent = request.agent(app)
      await agent.post('/api/v1/auth/login').send({ user: 'test-user' })

      await agent
        .put('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Updated Name' })
        .expect(404)
    })
  })

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete an existing user', async () => {
      const agent = request.agent(app)
      await agent.post('/api/v1/auth/login').send({ user: 'test-user' })

      // Create user
      const createResponse = await agent
        .post('/api/v1/users')
        .send({ name: 'To Delete', email: 'delete@alberta.ca' })

      const userId = createResponse.body.data.id

      // Delete user
      await agent.delete(`/api/v1/users/${userId}`).expect(204)

      // Verify deletion
      await agent.get(`/api/v1/users/${userId}`).expect(404)
    })
  })
})
```

## End-to-End Testing

### Setup

**Framework**: Playwright (browser automation)

**Configuration**: [playwright.config.ts](../playwright.config.ts)

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
})
```

### Running E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run with UI (interactive)
npm run test:e2e -- --ui

# Run specific test
npm run test:e2e -- tests/e2e/login.spec.ts

# Run in specific browser
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

### Writing E2E Tests

```typescript
// tests/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/profile')

    // Should redirect to login page
    await expect(page).toHaveURL('/login')
    await expect(page.locator('h1')).toHaveText('Sign In')
  })

  test('should complete mock auth flow', async ({ page }) => {
    await page.goto('/login')

    // Click "Sign In" button
    await page.click('goa-button[type="primary"]')

    // Should redirect to home page
    await expect(page).toHaveURL('/')
    await expect(page.locator('h1')).toHaveText('Welcome')

    // Should show user menu
    const userMenu = page.locator('[data-testid="user-menu"]')
    await expect(userMenu).toBeVisible()
  })

  test('should allow logout', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.click('goa-button[type="primary"]')
    await expect(page).toHaveURL('/')

    // Click logout
    await page.click('[data-testid="logout-button"]')

    // Should redirect to login
    await expect(page).toHaveURL('/login')

    // User menu should not be visible
    const userMenu = page.locator('[data-testid="user-menu"]')
    await expect(userMenu).not.toBeVisible()
  })

  test('should persist session across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.click('goa-button[type="primary"]')
    await expect(page).toHaveURL('/')

    // Refresh page
    await page.reload()

    // Should still be logged in
    await expect(page).toHaveURL('/')
    const userMenu = page.locator('[data-testid="user-menu"]')
    await expect(userMenu).toBeVisible()
  })
})
```

```typescript
// tests/e2e/users-crud.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Users CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.click('goa-button[type="primary"]')
    await expect(page).toHaveURL('/')
  })

  test('should display users list', async ({ page }) => {
    await page.goto('/users')

    await expect(page.locator('h1')).toHaveText('Users')

    // Check table headers
    const table = page.locator('goa-table')
    await expect(table.locator('th:has-text("Name")')).toBeVisible()
    await expect(table.locator('th:has-text("Email")')).toBeVisible()
    await expect(table.locator('th:has-text("Status")')).toBeVisible()
  })

  test('should create a new user', async ({ page }) => {
    await page.goto('/users')

    // Click "Add User" button
    await page.click('button:has-text("Add User")')

    // Fill form
    await page.fill('goa-input[name="name"]', 'Test User')
    await page.fill('goa-input[name="email"]', 'test@alberta.ca')

    // Submit
    await page.click('button[type="submit"]')

    // Should show success message
    const callout = page.locator('goa-callout[type="success"]')
    await expect(callout).toBeVisible()
    await expect(callout).toContainText('User created successfully')

    // Should redirect to users list
    await expect(page).toHaveURL('/users')

    // New user should appear in table
    const row = page.locator('tr:has-text("Test User")')
    await expect(row).toBeVisible()
    await expect(row.locator('td:has-text("test@alberta.ca")')).toBeVisible()
  })

  test('should validate form fields', async ({ page }) => {
    await page.goto('/users')

    // Click "Add User" button
    await page.click('button:has-text("Add User")')

    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Should show validation errors
    const nameError = page.locator('goa-form-item:has-text("Name") >> .error')
    await expect(nameError).toBeVisible()

    const emailError = page.locator('goa-form-item:has-text("Email") >> .error')
    await expect(emailError).toBeVisible()
  })

  test('should edit an existing user', async ({ page }) => {
    await page.goto('/users')

    // Click edit button on first user
    await page.locator('tr').first().locator('button:has-text("Edit")').click()

    // Wait for form to load
    await page.waitForSelector('goa-input[name="name"]')

    // Update name
    await page.fill('goa-input[name="name"]', 'Updated Name')

    // Submit
    await page.click('button[type="submit"]')

    // Should show success message
    const callout = page.locator('goa-callout[type="success"]')
    await expect(callout).toContainText('User updated successfully')

    // Updated name should appear in table
    const row = page.locator('tr:has-text("Updated Name")')
    await expect(row).toBeVisible()
  })

  test('should delete a user with confirmation', async ({ page }) => {
    await page.goto('/users')

    // Click delete button on first user
    await page.locator('tr').first().locator('button:has-text("Delete")').click()

    // Should show confirmation modal
    const modal = page.locator('goa-modal[open]')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Are you sure')

    // Confirm deletion
    await page.click('button:has-text("Confirm")')

    // Should show success message
    const callout = page.locator('goa-callout[type="success"]')
    await expect(callout).toContainText('User deleted successfully')
  })
})
```

### Visual Regression Testing

**Playwright Snapshots**:

```typescript
// tests/e2e/visual.spec.ts
import { test, expect } from '@playwright/test'

test('login page visual regression', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveScreenshot('login-page.png')
})

test('users list visual regression', async ({ page }) => {
  await page.goto('/login')
  await page.click('goa-button[type="primary"]')
  await page.goto('/users')
  await expect(page).toHaveScreenshot('users-list.png')
})
```

**Generate baseline**:
```bash
npm run test:e2e -- --update-snapshots
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test
          POSTGRES_HOST_AUTH_METHOD: trust
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Unit tests
        run: npm run test:unit -- --coverage

      - name: Integration tests
        run: npm run test:integration
        env:
          DB_CONNECTION_STRING: ${{ secrets.TEST_DB_CONNECTION_STRING }}

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: E2E tests
        run: npm run test:e2e
        env:
          CI: true

      - name: Upload test coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| API Services | > 80% | TBD |
| API Controllers | > 70% | TBD |
| API Middleware | > 90% | TBD |
| Vue Components | > 60% | TBD |
| **Overall** | **> 70%** | **TBD** |

**Check coverage**:
```bash
npm run test:unit -- --coverage
open coverage/index.html
```

## Testing Best Practices

### General

1. **Test Behavior, Not Implementation**: Don't test private methods
2. **Descriptive Names**: `should return 404 when user not found`
3. **One Assertion Per Concept**: Test one thing at a time
4. **Avoid Test Interdependence**: Each test should be independent
5. **Use Factories/Fixtures**: Avoid hardcoded test data
6. **Clean Up**: Reset state between tests

### Unit Tests

1. **Mock External Dependencies**: Database, APIs, file system
2. **Test Edge Cases**: Empty arrays, null values, boundary conditions
3. **Test Error Handling**: What happens when things go wrong?
4. **Fast**: Unit tests should run in milliseconds

### Integration Tests

1. **Test Happy Path**: Most common user flows
2. **Test Error Scenarios**: 400, 404, 500 responses
3. **Test Authentication**: Authorized vs unauthorized access
4. **Use Test Database**: Never use production data

### E2E Tests

1. **Test Critical User Flows**: Login, CRUD operations, checkout
2. **Keep Tests Simple**: Avoid complex assertions
3. **Use Data Attributes**: `data-testid` for reliable selectors
4. **Handle Async**: Wait for elements before interacting
5. **Minimize Brittleness**: Avoid testing implementation details

## Troubleshooting

### Tests Timeout

```bash
# Increase timeout (Playwright)
test('slow test', async ({ page }) => {
  test.setTimeout(60000) // 60 seconds
})

# Increase timeout (Vitest)
describe('slow tests', () => {
  it('takes forever', { timeout: 10000 }, async () => {
    // test code
  })
})
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DB_CONNECTION_STRING
```

### Flaky E2E Tests

```bash
# Run test multiple times
npm run test:e2e -- --repeat-each=5

# Run with traces
npm run test:e2e -- --trace=on

# View trace
npx playwright show-trace trace.zip
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)

---

**Last Updated**: 2026-01-30
