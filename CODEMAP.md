# Codemap — Alberta Government Internal-Facing Enterprise Template

> Architectural blueprint: execution flows, dependency graph, API surfaces, and component relationships.
> For developer onboarding and AI agent context. Reduces codebase to ~5% of tokens, ~90% of understanding.

---

## Project Tree

```
vue-node-alberta-enterprise-template/
├── apps/
│   ├── api/                       Express REST API server
│   │   ├── vitest.config.ts       Test config (node env)
│   │   └── src/
│   │       ├── server.ts          ← ENTRY POINT (production)
│   │       ├── app.ts             ← Middleware chain + route registration
│   │       ├── controllers/       HTTP request/response mapping
│   │       ├── services/          Business logic + driver orchestration
│   │       ├── routes/            Endpoint definitions
│   │       ├── middleware/        Auth, service-auth, CSRF, rate-limit, logger
│   │       ├── config/            DB pool + session store setup
│   │       ├── utils/             Helpers (db-retry, logger)
│   │       └── swagger.ts         Swagger UI setup (dev only)
│   │   └── openapi.json           OpenAPI 3.0.3 spec (all endpoints)
│   │
│   └── web/                       Vue 3 SPA (GoA Design System)
│       ├── vitest.config.ts       Test config (happy-dom env)
│       └── src/
│           ├── main.ts            ← ENTRY POINT (frontend)
│           ├── App.vue            Root component
│           ├── router/            Routes + nav guards
│           ├── stores/            Pinia auth state
│           ├── views/             Page components
│           ├── components/        Layout + GoA wrappers
│           └── assets/            Styles
│
├── packages/
│   ├── shared/                    Types, Zod schemas, constants
│   ├── config/                    Env loading, validation, presets
│   │   └── vitest.config.ts       Test config (node env)
│   └── auth/                      Auth drivers (Entra ID, Mock)
│       └── vitest.config.ts       Test config (node env)
│
├── scripts/
│   └── migrations/                SQL migrations (app schema)
├── docker/                        Dockerfiles (api, web)
├── docs/                          Auth, deployment, development, testing, troubleshooting, compliance
├── e2e/                           Playwright E2E tests
├── .env.example                   Dev config template
└── .env.internal.example          Entra ID config template
```

---

## Tech Stack (Required)

All code added to this template **must** use these technologies. Do not introduce alternatives.

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Language** | TypeScript (strict) | All application/library/test code in TS. JS allowed only for config/build tooling (e.g., `tailwind.config.js`, `postcss.config.js`, `node -e` scripts). |
| **Frontend** | Vue 3 (Composition API + `<script setup>`) | Single-file components only. |
| **State** | Pinia | Stores in `apps/web/src/stores/`. No Vuex, no raw composables for global state. |
| **Routing** | Vue Router 4 | Lazy-load views: `() => import('./views/X.vue')` |
| **Styling** | Tailwind CSS + GoA Design System | Use `@abgov/web-components` + `@abgov/design-tokens`. No custom color values. |
| **Backend** | Express 5 | Route → Controller → Service pattern. |
| **Auth** | Session-based (express-session) + Bearer (jose) | Staff: session via `BaseAuthDriver`. Service: Azure AD JWT via `jose` JWKS. **No custom JWT.** |
| **Validation** | Zod | Config schemas, shared types. No Joi, Yup, or class-validator. |
| **Database** | PostgreSQL (pg driver) | `app` schema only. Parameterized queries. No ORM. |
| **Build** | Vite (frontend), tsc (backend + packages) | Monorepo with npm workspaces. |
| **Testing** | Vitest (unit), Playwright (E2E), Supertest (API) | Colocated tests or dedicated `tests/` dirs. |
| **Linting** | ESLint 9 + Prettier | Flat config format. |

**Do NOT introduce**: Custom JWT auth (service-auth uses Azure AD tokens validated via `jose`), Vuex, ORMs (Prisma/TypeORM/Sequelize), Webpack, Joi/Yup, CSS-in-JS, Redux-style patterns.

---

## Dependency Flow

```
packages ═══════════════════════════════════════════════════════════════
  shared ───► config ───► auth

apps ═══════════════════════════════════════════════════════════════════
  auth ───► api/services ───► api/controllers ───► api/routes
  config ──────► api/server
  shared ──────► web/stores

middleware chain ═══════════════════════════════════════════════════════
  helmet ───► cors(multi-origin) ───► swagger(dev only) ───► rate-limit ───► pino-http
    ───► body-parser ───► public-routes(Bearer) ───► db-pool ───► session ───► csrf ───► routes ───► static/SPA

HUBS: app.ts (10←), auth.service.ts (4←), base.driver.ts (3←)
```

**Build order**: shared → config → auth → api + web (parallel)

---

## API Surface (Type Signatures)

```typescript
// === packages/auth/src/drivers/base.driver.ts ===
interface AuthUser {
  id: string
  email: string
  name: string
  roles?: string[]
  attributes?: Record<string, any>
}

abstract class BaseAuthDriver {
  abstract getDriverName(): string
  abstract login(req: Request, res: Response): Promise<void>
  abstract callback(req: Request, res: Response): Promise<AuthUser>
  abstract logout(req: Request, res: Response): Promise<void>
  getUser(req: Request): AuthUser | null
  hasRole(user: AuthUser | null, role: string | string[]): boolean
}

// === packages/config/src/loader.ts ===
function loadEnv(envPath?: string): boolean
function loadApiConfig(options?: { autoLoad?, envPath?, throwOnError? }): ApiConfig | null
function loadWebConfig(options?: { autoLoad?, envPath?, throwOnError? }): WebConfig | null
function validateConfig(type: 'api' | 'web'): SafeParseResult
function getValidationErrors(type: 'api' | 'web'): string[] | null

// === apps/api/src/middleware/auth.middleware.ts ===
function requireAuth(req, res, next): void        // 401 if no session
function requireRole(...roles: string[]): Middleware  // 403 if missing role
function optionalAuth(req, res, next): void       // Attaches user if present

// === apps/api/src/middleware/service-auth.middleware.ts ===
function requireServiceAuth(req, res, next): void  // 401 if no valid Bearer token
function optionalServiceAuth(req, res, next): void // Attaches serviceClient if present
// req.serviceClient = { clientId, tenantId, roles }  (set on success)

// === apps/web/src/stores/auth.store.ts (Pinia) ===
state: { user: User | null, loading: boolean, error: string | null }
getters: { isAuthenticated: boolean, hasRole(role): boolean }
actions: { fetchUser(), login(userIndex), logout(), checkStatus() }
```

---

## Execution Flows

### 1. HTTP Request → Response

```
Browser
  │
  ▼
server.ts                  Listen on HOST:PORT
  │
  ▼
app.ts                     createApp() → middleware chain:
  ├── helmet               Security headers, CSP (GoA CDN allowed)
  ├── cache-control         no-store on /api/* responses
  ├── host-validation      ALLOWED_HOSTS whitelist (optional)
  ├── cors                 Multi-origin callback (comma-separated CORS_ORIGIN)
  ├── swagger              Swagger UI at /api-docs (dev/test only, disabled in production)
  ├── rate-limit           General: RATE_LIMIT_MAX (default 100/15min)
  ├── pino-http            Structured request logging (PII-redacted)
  ├── body-parser          JSON + URL-encoded (10MB)
  ├── hpp                  HTTP Parameter Pollution protection
  ├── content-type-check   Reject unexpected Content-Types on POST/PUT/PATCH
  │
  ├── /api/v1/public/*     ───► service rate-limit (500/15min) ───► requireServiceAuth(Bearer)
  │                             ───► public.routes (service-to-service, no session/CSRF)
  │
  ├── db-pool              Conditional (only if SESSION_STORE=postgres)
  ├── session              Memory (dev) │ PostgreSQL (prod)
  ├── csrf                 Token validation on POST/PUT/PATCH/DELETE (skips /api/v1/public)
  │
  ├── /api/v1/csrf-token   ───► inline (token generation)
  ├── /api/v1/health       ───► inline (DB pool stats)
  ├── /api/v1/info         ───► inline (API metadata, reduced in prod)
  ├── /api/v1/auth/*       ───► auth.routes ───► auth.controller ───► auth.service ───► driver
  ├── /api/v1/admin/*      ───► requireAuth + requireRole (example)
  │
  ├── Static files         Production: serves apps/web/dist/
  ├── SPA fallback         Non-API routes → index.html
  └── 404 + error handler  JSON error responses
```

### 2. Authentication (Strategy Pattern)

```
AUTH_DRIVER env var
  │
  ├── "mock"      ───► MockDriver      ───► ?user=0|1|2 query param ───► instant callback
  └── "entra-id"  ───► EntraIdDriver   ───► OIDC + PKCE to Microsoft ───► code exchange
                                                                              │
                                                              ┌───────────────┘
                                                              ▼
                                                  req.session.user = AuthUser
                                                  redirect → /profile
```

**Driver files**: `packages/auth/src/drivers/{mock,entra-id}.driver.ts`
**Selection**: `apps/api/src/services/auth.service.ts` (switch on AUTH_DRIVER)

### 3. Service-to-Service Authentication (Client Credentials)

```
Public-facing app                        Azure AD                           Internal API
      │                                     │                                   │
      ├── POST /oauth2/v2.0/token ─────────►│                                   │
      │   client_id + client_secret          │                                   │
      │   scope = api://{internal-id}        │                                   │
      │                                      │                                   │
      │◄── Bearer access_token ──────────────┤                                   │
      │                                      │                                   │
      ├── GET /api/v1/public/* ─────────────────────────────────────────────────►│
      │   Authorization: Bearer <token>      │                                   │
      │                                      │     requireServiceAuth middleware: │
      │                                      │     ├── Extract Bearer token       │
      │                                      │     ├── Verify signature (JWKS)    │
      │                                      │     ├── Check issuer, audience     │
      │                                      │     ├── Check client ID allowlist  │
      │                                      │     └── Attach req.serviceClient   │
      │                                      │                                   │
      │◄── JSON response ───────────────────────────────────────────────────────┤
```

**Middleware**: `apps/api/src/middleware/service-auth.middleware.ts`
**Routes**: `apps/api/src/routes/public.routes.ts` (all require Bearer token)
**JWT validation**: `jose` library — `createRemoteJWKSet()` + `jwtVerify()`
**Config**: `SERVICE_AUTH_ENABLED`, `SERVICE_AUTH_TENANT_ID`, `SERVICE_AUTH_AUDIENCE`, `SERVICE_AUTH_ALLOWED_CLIENT_IDS`

### 4. Frontend Navigation

```
URL change
  │
  ▼
router/index.ts            beforeEach guard:
  ├── First visit?         fetchUser() → GET /api/v1/auth/me
  ├── requiresAuth?        No session → redirect /login
  ├── guestOnly?           Has session → redirect /profile
  └── Set document title
  │
  ▼
  /              ───► HomeView.vue       (public)
  /about         ───► AboutView.vue      (public)
  /login         ───► LoginView.vue      (guestOnly)
  /profile       ───► ProfileView.vue    (requiresAuth)
  /*             ───► 404 → redirect /
```

### 5. Build Pipeline

```
npm run build
  │
  ▼
clean:build                Remove all dist/ + .tsbuildinfo
  │
  ▼
build:packages             Sequential:
  ├── @template/shared     tsc --build → packages/shared/dist/
  ├── @template/config     tsc --build → packages/config/dist/
  └── @template/auth       tsc --build → packages/auth/dist/
  │
  ▼
build:apps                 Parallel:
  ├── @template/api        tsc → apps/api/dist/
  └── @template/web        vue-tsc + vite build → apps/web/dist/
```

### 6. Test Pipeline

```
npm test                   Runs "vitest run" in all workspaces:
  │
  ├── packages/shared      (no tests yet — passWithNoTests)
  ├── packages/config      4 test files │ 47 tests
  │   ├── schemas/api.config.schema.test.ts   Zod coercion, enums, required fields, defaults
  │   ├── schemas/web.config.schema.test.ts   Timeout bounds, feature flags, URL validation
  │   ├── presets.test.ts                     getPreset(), generateEnvFile()
  │   └── loader.test.ts                     loadEnv(), loadApiConfig(), validateConfig()
  │
  ├── packages/auth        3 test files │ 34 tests
  │   ├── drivers/base.driver.test.ts         AuthUserSchema, getUser(), hasRole(), session lifecycle
  │   ├── drivers/mock.driver.test.ts         Production guard, login redirect, callback lookup
  │   └── utils/token-encryption.test.ts      AES-256-GCM round-trip, IV randomness, tamper detection
  │
  ├── apps/api             5 test files │ 63 tests
  │   ├── middleware/auth.middleware.test.ts   requireAuth, requireRole, optionalAuth
  │   ├── middleware/csrf.middleware.test.ts   Token generation, validation, skip paths
  │   ├── services/auth.service.test.ts       Driver selection, callback URL priority chain
  │   ├── utils/db-retry.test.ts              SQLSTATE allowlist, retry backoff, transaction lifecycle
  │   └── utils/logger.test.ts                PII sanitization (recursive, case-insensitive)
  │
  └── apps/web             1 test file  │ 15 tests
      └── stores/auth.store.test.ts           Pinia state, getters, fetchUser dedup, logout
                                              ─────────────────────────────────────
                                              Total: 13 files │ 159 tests
```

**Test co-location**: Each `*.test.ts` sits next to the source file it tests.
**Environments**: Backend tests run in `node`; frontend tests run in `happy-dom` (browser simulation).

**Mocking patterns**:
- **Pure functions** (schemas, encryption): No mocks — call and assert directly.
- **Express middleware**: Mock `req`/`res`/`next` objects with `vi.fn()` spies.
- **Workspace packages** (`@template/auth` in api tests): `vi.mock()` with inline Zod schema (avoids needing built artifacts).
- **Native modules** (pino in api tests): `vi.mock('pino')` since native bindings can't load in vitest.
- **Pinia stores**: Fresh `createPinia()` + `setActivePinia()` per test; `vi.mock('axios')` for API calls.

---

## Component Map

### API: Route → Controller → Service → Driver

```
Staff authentication (session-based):
  auth.routes.ts
    │  defines endpoints, applies auth rate limiting
    ▼
  auth.controller.ts
    │  HTTP ↔ service mapping, error handling, redirects
    ▼
  auth.service.ts
    │  selects driver, orchestrates login/callback/logout
    ▼
  {mock|entra-id}.driver.ts
    │  provider-specific authentication logic
    ▼
  External IdP or mock user list

Service-to-service (Bearer token):
  public.routes.ts
    │  all routes protected by requireServiceAuth
    │  access req.serviceClient for caller identity
    ▼
  Business logic handlers (inline or via services)
```

### Web: Component Hierarchy

```
App.vue
└── AppLayout.vue
    ├── AppHeader.vue              GoA nav bar + user menu
    ├── <router-view />
    │   ├── HomeView.vue           Landing page
    │   ├── LoginView.vue          Auth method selection
    │   ├── ProfileView.vue        User info (protected)
    │   └── AboutView.vue          App info
    └── AppFooter.vue              Alberta Government footer

GoA wrappers:  GoabButton.vue │ GoabInput.vue │ GoabModal.vue
```

### Config: Environment → Validation → App

```
.env (monorepo root)
  │  find-up locates, dotenv loads
  ▼
loader.ts                  loadApiConfig() / loadWebConfig()
  │
  ▼
schemas/
  ├── api.config.schema.ts    Zod validates 50+ env vars (DB, auth, session, security)
  └── web.config.schema.ts    Zod validates frontend config (API URL, features)
  │
  ▼
presets.ts                 Development │ Internal defaults
```

---

## Endpoints

| Method | Path | Auth | Rate | Handler |
|--------|------|:----:|------|---------|
| GET | `/api/v1/auth/login` | - | 5/15m | `authController.login` |
| GET | `/api/v1/auth/callback` | - | 5/15m | `authController.callback` |
| POST | `/api/v1/auth/logout` | Y | general | `authController.logout` |
| GET | `/api/v1/auth/me` | Y | general | `authController.me` |
| GET | `/api/v1/auth/status` | - | general | `authController.status` |
| GET | `/api/v1/public/health` | Bearer | service | `public.routes` |
| GET | `/api/v1/public/info` | Bearer | service | `public.routes` |
| GET | `/api/v1/health` | - | general | inline |
| GET | `/api/v1/info` | - | general | inline |
| GET | `/api/v1/csrf-token` | - | general | inline |
| GET | `/api/v1/admin/users` | Y+role | general | inline (example) |
| GET | `/api-docs` | - | none | Swagger UI (dev only) |
| GET | `/api/v1/openapi.json` | - | none | Raw OpenAPI spec (dev only) |

**Response shape**: `{ success: boolean, data?: {}, error?: { code, message, details? } }`

---

## Database

```
PostgreSQL (Azure Standard)
├── Schema: app (NEVER public)
│   ├── app.session        sid VARCHAR PK │ sess JSON │ expire TIMESTAMP
│   └── [your tables]     Add via scripts/migrations/
│
└── Pool: min 2 │ max 10 │ connect 5s │ idle 30s │ statement 30s │ SSL in prod

SESSION_STORE=memory    → MemoryStore     (dev, lost on restart)
SESSION_STORE=postgres  → connect-pg-simple (prod, survives restart)
```

---

## Security Stack

```
Staff (session-based):
  Request ───► Helmet ───► CORS ───► Rate Limit ───► Session ───► CSRF ───► Auth ───► Handler
                 │          │           │                            │         │
                 │          │           │                            │         ├── requireAuth()  → 401
                 │          │           │                            │         ├── requireRole()  → 403
                 │          │           │                            │         └── optionalAuth()
                 │          │           │                            │
                 │          │           │                            └── Token on POST/PUT/PATCH/DELETE
                 │          │           └── 100 general │ 5 auth per 15min/IP
                 │          └── Multi-origin callback (comma-separated CORS_ORIGIN)
                 └── CSP, X-Frame-Options, HSTS, cache-control

Service-to-service (Bearer token):
  Request ───► Helmet ───► CORS ───► Service Rate Limit ───► requireServiceAuth ───► Handler
                                         │                        │
                                         │                        ├── JWT signature (JWKS)
                                         │                        ├── Issuer + audience check
                                         │                        └── Client ID allowlist
                                         └── 500/15min (SERVICE_RATE_LIMIT_MAX)
  (no session, no CSRF — /api/v1/public/* routes registered before session middleware)

Cookies:  httpOnly │ secure (prod) │ sameSite=lax
Logging:  PII redaction (passwords, emails, tokens, SSNs, credit cards)
```

---

## Invariants

1. **Single process** — Express serves API + static SPA. No separate web server.
2. **Pluggable staff auth** — Swap `AUTH_DRIVER` env var. All drivers extend `BaseAuthDriver`.
3. **Dual auth model** — Staff: session-based (Entra ID/Mock). Service: Bearer token (Azure AD Client Credentials). Never mixed.
4. **Public routes before session** — `/api/v1/public/*` registered before session/CSRF middleware. Uses Bearer tokens, not cookies.
5. **All features optional** — Runs without DB, IdP, or cloud. Degrades gracefully.
6. **`app` schema only** — Azure PostgreSQL compliance. Never `public`.
7. **Session-based for staff, not JWT** — Server-side state. Frontend reads via `GET /auth/me`.
8. **Packages before apps** — `build:packages && build:apps`. Never reversed.
9. **No sticky connections** — Pool with `allowExitOnIdle: true`. Serverless-safe.
10. **PII never logged** — Middleware redacts sensitive data before writing logs.
11. **GoA Design System** — All UI uses `@abgov/web-components` via Vue wrappers.

---

## Quick Reference: Adding Features

**New API endpoint**:
`routes/*.ts` → `controllers/*.ts` → `services/*.ts` → register in `app.ts`

**New frontend page**:
`views/*.vue` → add route in `router/index.ts` → add nav link in `AppHeader.vue`

**New shared type**:
`packages/shared/src/` → export from `index.ts` → `npm run build -w packages/shared`

**New public API endpoint** (service-to-service):
Add route in `routes/public.routes.ts` → all routes auto-protected by `requireServiceAuth` → access `req.serviceClient` for caller identity

**New auth driver**:
extend `BaseAuthDriver` → register in `auth.service.ts` switch → add config schema

**New database table**:
`scripts/migrations/NNN_*.sql` (use `app` schema) → types in `packages/shared/`

**New unit test**:
Create `foo.test.ts` next to `foo.ts` → mock external deps with `vi.mock()` → run `npm run test -w <workspace>`

---

## Conventions

**TypeScript**:
- Strict mode enabled. No `any` unless unavoidable (mark with `// eslint-disable-line` + comment why).
- Use `interface` for object shapes, `type` for unions/intersections.
- Shared types go in `packages/shared/`, app-local types stay in the app.

**Frontend**:
- `<script setup>` for all components. No Options API.
- Prefer GoA web components via Vue wrappers (`components/goa/`), especially when you need `v-model`/event bridging.
- Raw `<goa-*>` tags may be used directly in views where no wrapper behavior is required (some existing views do this).
- Lazy-load all views in router: `component: () => import('../views/X.vue')`
- Pinia stores for any state shared across components. Local `ref()`/`reactive()` for component-only state.

**Backend**:
- Controllers handle HTTP only (req/res). Business logic lives in services.
- Controller error handling: controllers may either forward errors with `next(error)` to shared middleware or catch errors and send HTTP responses directly (e.g., `auth.controller.ts`).
- Database queries use parameterized `$1, $2` placeholders. Never string interpolation.
- All tables in `app` schema. Migrations are plain SQL files, not ORM-generated.

**Security**:
- Staff routes: `requireAuth` or `requireRole()` middleware. CSRF tokens on POST/PUT/PATCH/DELETE.
- Service routes (`/api/v1/public/*`): `requireServiceAuth` middleware. Bearer tokens, no CSRF.
- Never mix session and Bearer auth on the same endpoint.
- Never log PII. The logger middleware redacts automatically, but don't bypass it.
- Environment secrets via `process.env` — never hardcode credentials.

**Testing**:
- Unit tests colocated with source: `foo.ts` → `foo.test.ts` in the same directory.
- Each workspace has its own `vitest.config.ts` with appropriate environment (node or happy-dom).
- Run all: `npm test` from root. Run one: `npm run test -w packages/config`.
- Express middleware tests use mock `req`/`res`/`next` objects (not Supertest).
- Pinia store tests use fresh `createPinia()` per test with mocked axios.
- Workspace cross-references (e.g., `@template/auth` in api) must be mocked with `vi.mock()`.
- API integration tests use Supertest against the Express app (not running server).
- E2E tests in `e2e/` with Playwright.

---

## Further Reading

> **For coding agents**: This codemap is the single source of truth for architecture, security posture, and template structure.
> Only read the docs below when you need **operational how-to details** for a specific task.

| Doc | When to read |
|-----|-------------|
| `CODEMAP.md` | Architectural overview, security model, and template customization map (start here) |
| `README.md` | First-time project setup and quick start |
| `PLACEHOLDERS.md` | Replacing `{{VARIABLE}}` placeholders when customizing the template |
| `docs/AUTH-SETUP.md` | Configuring Entra ID, Mock drivers, or service-to-service auth |
| `docs/DEPLOYMENT.md` | Deploying to Azure, OpenShift, Docker, or Render |
| `docs/DEVELOPMENT.md` | Local dev setup, debugging, hot reload, IDE config |
| `docs/GOA-COMPONENTS.md` | Using GoA Design System components with code examples |
| `docs/TESTING.md` | Writing and running unit, integration, and E2E tests |
| `docs/TROUBLESHOOTING.md` | Diagnosing common errors and issues |
| `docs/AZURE_POSTGRESQL_COMPLIANCE.md` | Azure PostgreSQL compliance audit details |
| `docs/CONNECTION_BUDGET.md` | Database connection pool capacity planning |
| `scripts/migrations/README.md` | Running and writing database migrations |