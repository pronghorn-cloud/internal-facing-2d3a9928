# Vue.js + Node.js Alberta Internal-Facing Template

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.4-green)](https://vuejs.org/)
[![Node 24](https://img.shields.io/badge/Node-24.x-green)](https://nodejs.org/)
[![GoA Design System](https://img.shields.io/badge/GoA-Design%20System-blue)](https://design.alberta.ca/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](https://github.com)

**Production-ready, internal-facing monorepo template** for Alberta Government applications with official GoA Design System web components, MS Entra ID authentication (staff), Azure AD Client Credentials service-to-service API layer (for public-facing apps), TypeScript throughout, and Docker containerization.

> **Template Status**: Fully documented and ready for production use. All core features implemented and tested.

## Features

### Core Stack
- **Monorepo Structure** - npm workspaces with shared packages
- **TypeScript Everywhere** - Strict mode, type-safe configuration
- **Vue 3 + Vite** - Modern frontend with hot module replacement
- **Express 5 + TypeScript** - Backend API with full type safety
- **Node.js Native Watch** - Proper signal handling and graceful shutdown

### Authentication & Security
- **MS Entra ID** - Microsoft Entra ID authentication for government staff
- **Service-to-Service Auth** - Azure AD Client Credentials for public-facing app API access
- **Security Hardened** - Helmet CSP, CORS, rate limiting, CSRF protection
- **Session Management** - PostgreSQL-backed sessions with connection pooling
- **Azure Compliance** - Follows Azure PostgreSQL and App Service standards

### Design & Frontend
- **GoA Design System** - Official @abgov/web-components integration
- **Vue Wrapper Components** - v-model support for GoA components
- **TypeScript Declarations** - Full IDE autocomplete for all components

### Infrastructure & Deployment
- **Docker Ready** - Multi-stage Dockerfiles and docker-compose
- **Platform Agnostic** - Azure App Service, OpenShift, Kubernetes support
- **PostgreSQL** - Connection pooling, health checks, graceful shutdown
- **Environment Discovery** - Automatic .env loading with find-up

### Quality & Testing
- **Testing Setup** - Vitest (unit) + Supertest (integration) + Playwright (E2E)
- **Code Quality** - ESLint, Prettier, TypeScript strict mode
- **CI/CD Ready** - GitHub Actions workflow templates

### Documentation
- **Comprehensive Docs** - Detailed guides covering all aspects
- **Template Guide** - Step-by-step customization instructions
- **Placeholder Pattern** - Consistent {{VARIABLE_NAME}} format (GitHub-safe)

## Prerequisites

- **Node.js** 24.x or higher (LTS)
- **npm** 10.x or higher
- **PostgreSQL** 16.x or higher (local or Docker)
- **Docker** (optional, for containerized development)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings (default values work for local dev)
```

### 3. Start Development Servers

**Option A: Local Development** (without Docker)

```bash
# Terminal 1: Start PostgreSQL (if not using Docker)
# (or connect to your existing PostgreSQL instance)

# Terminal 2: Start API
npm run dev:api

# Terminal 3: Start Web
npm run dev:web
```

- **Web App**: http://localhost:5173
- **API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/api/v1/health

**Option B: Docker Development**

```bash
# Start all services (postgres + api + web)
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

## Project Structure

```
vue-node-alberta-enterprise-template/
├── apps/
│   ├── web/                      # Vue 3 + Vite + TypeScript frontend (staff portal)
│   │   ├── src/
│   │   │   ├── components/       # Vue components
│   │   │   │   ├── goa/          # GoA wrapper components
│   │   │   │   └── layout/       # Layout components
│   │   │   ├── views/            # Page views
│   │   │   ├── router/           # Vue Router configuration
│   │   │   ├── stores/           # Pinia state stores
│   │   │   ├── types/            # TypeScript type definitions
│   │   │   ├── assets/           # Static assets
│   │   │   └── main.ts           # Application entry point
│   │   └── vite.config.ts        # Vite configuration
│   │
│   └── api/                      # Express 5 + TypeScript backend
│       ├── src/
│       │   ├── routes/           # API route definitions (auth + public)
│       │   ├── controllers/      # HTTP request handlers
│       │   ├── services/         # Business logic layer
│       │   ├── middleware/       # Express middleware (auth, CSRF, rate limit, service-auth)
│       │   ├── config/           # Database & environment config
│       │   ├── types/            # TypeScript types
│       │   ├── utils/            # Utility functions
│       │   ├── app.ts            # Express app setup
│       │   └── server.ts         # Server entry point (with graceful shutdown)
│       └── tsconfig.json         # TypeScript configuration
│
├── packages/                     # Shared monorepo packages
│   ├── shared/                   # Shared types & schemas (cross-app)
│   ├── config/                   # Zod configuration validation
│   └── auth/                     # Auth driver implementations
│       ├── drivers/              # MockAuthDriver, EntraIdAuthDriver
│       └── config/               # Auth-specific configuration
│
├── docker/                       # Docker configuration
│   ├── api.Dockerfile            # Multi-stage Node.js API build
│   ├── web.Dockerfile            # Multi-stage Nginx + Vue build
│   └── nginx.conf                # Nginx configuration for SPA routing
│
├── docs/                         # Comprehensive documentation
├── scripts/                      # Utility scripts (migrations, validation)
├── tests/                        # Integration & E2E tests
│   ├── integration/              # API integration tests (Supertest)
│   └── e2e/                      # End-to-end tests (Playwright)
│
├── .env.example                  # Development environment template
├── .env.internal.example         # Internal (Entra ID) production template
├── PLACEHOLDERS.md               # Placeholder pattern reference
└── docker-compose.yml            # Local development orchestration
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

## Authentication

The template supports two authentication modes for staff, plus service-to-service auth for the public-facing application:

### Mock Authentication (Local Development)
Set `AUTH_DRIVER=mock` in `.env` - no real IdP required

### MS Entra ID (Internal Staff)
Set `AUTH_DRIVER=entra-id` and configure:
- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET`

### Service-to-Service API (Public-Facing App)
The public-facing application accesses internal APIs at `/api/v1/public/*` using Azure AD Client Credentials:
- `SERVICE_AUTH_ENABLED=true`
- `SERVICE_AUTH_ALLOWED_CLIENT_IDS` - the public-facing app's Azure AD client ID
- The public-facing app obtains a Bearer token via `client_id` + `client_secret` from Azure AD

See [docs/AUTH-SETUP.md](docs/AUTH-SETUP.md) for detailed configuration instructions.

## Building for Production

```bash
# Build all apps
npm run build

# Build specific app
npm run build:api
npm run build:web

# Run production build locally
npm start --workspace=apps/api
```

## Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Run production containers
docker-compose -f docker-compose.yml up
```

## Documentation

### Essential Guides
| Document | Description | Status |
|----------|-------------|--------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, BFF pattern, driver architecture | Complete |
| [TEMPLATE-GUIDE.md](TEMPLATE-GUIDE.md) | Step-by-step customization instructions | Complete |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Development workflow and best practices | Complete |
| [AUTH-SETUP.md](docs/AUTH-SETUP.md) | Entra ID & service auth configuration | Complete |

### Technical Documentation
| Document | Description | Status |
|----------|-------------|--------|
| [GOA-COMPONENTS.md](docs/GOA-COMPONENTS.md) | GoA Design System integration guide | Complete |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Azure, OpenShift, Docker deployment | Complete |
| [SECURITY.md](docs/SECURITY.md) | Security features and best practices | Complete |
| [TESTING.md](docs/TESTING.md) | Testing strategy (unit/integration/E2E) | Complete |

### Reference
| Document | Description | Status |
|----------|-------------|--------|
| [PLACEHOLDERS.md](PLACEHOLDERS.md) | Placeholder pattern reference | Complete |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and solutions | Complete |
| [AZURE_POSTGRESQL_COMPLIANCE.md](docs/AZURE_POSTGRESQL_COMPLIANCE.md) | Azure PostgreSQL standards | Complete |
| [CONNECTION_BUDGET.md](docs/CONNECTION_BUDGET.md) | Database connection management | Complete |

## GoA Design System

This template uses the official Government of Alberta Design System:

- **Package**: [@abgov/web-components](https://www.npmjs.com/package/@abgov/web-components)
- **Documentation**: [design.alberta.ca](https://design.alberta.ca/)
- **Web Components**: Technology-agnostic custom elements
- **Vue Wrappers**: Thin wrapper layer for v-model support

## Configuration

All configuration is managed through environment variables with Zod schema validation:

```bash
# Required
NODE_ENV = development|production
DB_CONNECTION_STRING = {{DATABASE_CONNECTION_STRING}}
SESSION_SECRET =   # openssl rand -base64 32

# Staff auth (choose one driver)
AUTH_DRIVER = mock|entra-id

# Entra ID (if using Entra ID driver)
ENTRA_TENANT_ID = {{YOUR_AZURE_TENANT_ID}}
ENTRA_CLIENT_ID = {{YOUR_AZURE_CLIENT_ID}}
ENTRA_CLIENT_SECRET =   # from Azure Portal

# Service-to-service auth (for public-facing app)
SERVICE_AUTH_ENABLED = true|false
SERVICE_AUTH_ALLOWED_CLIENT_IDS = {{PUBLIC_APP_CLIENT_ID}}

# Optional
PORT = 3000
CORS_ORIGIN = https://internal.app.alberta.ca,https://public.app.alberta.ca
LOG_LEVEL = debug|info|warn|error
```

**Placeholder Pattern**: Values in `{{VARIABLE_NAME}}` format are placeholders. Replace with actual values (remove the `{{` `}}` brackets). See [PLACEHOLDERS.md](PLACEHOLDERS.md) for complete reference.

**Configuration Files**:
- [`.env.example`](.env.example) - Development with mock auth
- [`.env.internal.example`](.env.internal.example) - Internal (Entra ID) production

## Getting Started

### For New Projects

1. **Clone the template**
   ```bash
   git clone <repository-url> my-alberta-app
   cd my-alberta-app
   ```

2. **Follow the customization guide**
   - Read [TEMPLATE-GUIDE.md](TEMPLATE-GUIDE.md) for step-by-step instructions
   - Update project metadata (package.json, branding)
   - Configure authentication (Entra ID)
   - Configure service auth for public-facing app
   - Customize for your use case

3. **Start development**
   ```bash
   npm install
   cp .env.example .env
   npm run dev
   ```

## Architecture: Two-Template Model

This internal-facing template is designed to work with a separate public-facing template:

```
Citizens/Public  →  Public-Facing Template (separate repo)
                         │
                         │ REST API calls (Azure AD Client Credentials)
                         ▼
                    ┌─────────────────────────────┐
                    │  Internal-Facing Template    │  ← THIS REPO
                    │  (backend = source of truth) │
                    │  (frontend = staff portal)   │
                    └─────────────────────────────┘
                         ▲
Gov Staff/Internal  ─────┘  (Entra ID auth)
```

**Route groups:**
- `/api/v1/auth/*` - Staff authentication (Entra ID / Mock)
- `/api/v1/public/*` - Public API surface (service-to-service Bearer token auth)
- `/api/v1/health` - Health check
- `/api/v1/admin/*` - Admin endpoints (requireAuth + requireRole)
- `/api-docs` - Interactive API documentation (Swagger UI, dev/test only)

## Technical Specifications

| Category | Technology | Version |
|----------|-----------|---------|
| **Runtime** | Node.js | 24.x LTS |
| **Package Manager** | npm | 10.x |
| **Frontend Framework** | Vue.js | 3.4.x |
| **Build Tool** | Vite | 5.4.x |
| **Backend Framework** | Express | 5.2.x |
| **Language** | TypeScript | 5.7.x |
| **Database** | PostgreSQL | 16.x |
| **Design System** | @abgov/web-components | Latest |
| **Container Runtime** | Docker | 24.x+ |
| **Testing - Unit** | Vitest | 2.1.x |
| **Testing - E2E** | Playwright | 1.49.x |

## License

ISC

---

**Built for Alberta Government**
