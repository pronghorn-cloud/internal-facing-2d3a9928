<template>
  <div class="about-view">
    <h1 class="page-title">About This Template</h1>

    <goa-callout type="success" heading="Production Ready">
      <strong>Status:</strong> Core implementation phases complete. This template is documented and ready for production use in Alberta Government applications. E2E test files and GitHub Actions CI/CD pipeline are pending.
    </goa-callout>

    <goa-spacer vspacing="l"></goa-spacer>

    <goa-container>
      <h2 class="section-title">Enterprise-Grade Template</h2>
      <p class="lead-text">
        This template provides a production-ready foundation for Alberta Government internal applications with official GoA Design System integration, Entra ID authentication, service-to-service API layer for public-facing apps, comprehensive security features, and documentation.
      </p>

      <goa-spacer vspacing="l"></goa-spacer>

      <h3 class="subsection-title">Monorepo Structure</h3>
      <p>This template uses npm workspaces to organize code into reusable packages and applications:</p>
      <ul class="feature-list">
        <li><strong>apps/web:</strong> Vue 3 frontend with Vite and GoA components</li>
        <li><strong>apps/api:</strong> Express 5 backend with TypeScript</li>
        <li><strong>packages/auth:</strong> Pluggable authentication drivers (Mock, Entra ID)</li>
        <li><strong>packages/config:</strong> Type-safe configuration with Zod validation</li>
        <li><strong>packages/shared:</strong> Shared types, interfaces, and utilities</li>
      </ul>

      <goa-spacer vspacing="l"></goa-spacer>

      <h3 class="subsection-title">Key Features</h3>
      <ul class="feature-list">
        <li><strong>Type Safety:</strong> TypeScript strict mode throughout, Zod runtime validation</li>
        <li><strong>Modern Stack:</strong> Vue 3 Composition API, Express 5, PostgreSQL 16</li>
        <li><strong>GoA Design System:</strong> Official @abgov/web-components with Vue wrappers</li>
        <li><strong>Authentication:</strong> MS Entra ID (staff) + Mock (dev) + Azure AD Client Credentials (service-to-service)</li>
        <li><strong>Security Hardening:</strong> Helmet, CORS, rate limiting, CSRF protection (Phase 6)</li>
        <li><strong>Docker Ready:</strong> Multi-stage builds with docker-compose for local development</li>
        <li><strong>Production Ready:</strong> Session storage, error handling, health checks, logging</li>
      </ul>
    </goa-container>

    <goa-spacer vspacing="l"></goa-spacer>

    <!-- Technology Stack -->
    <section>
      <h2 class="section-title">Technology Stack</h2>
      <div class="card-grid">
        <goa-card>
          <h3>Frontend</h3>
          <p>Vue 3, Vite, TypeScript, Pinia, Vue Router, @abgov/web-components</p>
        </goa-card>

        <goa-card>
          <h3>Backend</h3>
          <p>Express 5, TypeScript, Node.js 24+, express-session</p>
        </goa-card>

        <goa-card>
          <h3>Database</h3>
          <p>PostgreSQL 16, connect-pg-simple</p>
        </goa-card>

        <goa-card>
          <h3>Authentication</h3>
          <p>openid-client v6 (Entra ID + service token validation)</p>
        </goa-card>

        <goa-card>
          <h3>Validation</h3>
          <p>Zod (runtime), TypeScript (compile-time)</p>
        </goa-card>

        <goa-card>
          <h3>Testing</h3>
          <p>Vitest, Playwright, Supertest</p>
        </goa-card>
      </div>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Implementation Phases -->
    <section>
      <h2 class="section-title">Implementation Phases</h2>

      <goa-callout type="success" heading="Phase 1: Foundation">
        <ul>
          <li>Monorepo structure with npm workspaces</li>
          <li>TypeScript configuration across all packages</li>
          <li>Vue 3 + Vite development server</li>
          <li>Express API with health endpoint</li>
          <li>Docker Compose for local development</li>
        </ul>
      </goa-callout>

      <goa-spacer vspacing="m"></goa-spacer>

      <goa-callout type="success" heading="Phase 2: GoA Components and UI Shell">
        <ul>
          <li>GoA web components registered and configured</li>
          <li>Vue wrapper components (Button, Input, Modal)</li>
          <li>TypeScript declarations for all components</li>
          <li>Layout system (AppLayout, AppHeader, AppFooter)</li>
          <li>Views (Home, Login, Profile, About)</li>
          <li>Vue Router with navigation and guards</li>
        </ul>
      </goa-callout>

      <goa-spacer vspacing="m"></goa-spacer>

      <goa-callout type="success" heading="Phase 3: Mock Authentication">
        <ul>
          <li>BFF authentication architecture implemented</li>
          <li>Mock driver with 3 test users (Developer, Admin, User)</li>
          <li>PostgreSQL session storage with connect-pg-simple</li>
          <li>Auth middleware (requireAuth, requireRole)</li>
          <li>Pinia auth store with Vue Router guards</li>
        </ul>
      </goa-callout>

      <goa-spacer vspacing="m"></goa-spacer>

      <goa-callout type="success" heading="Phase 4: Production Authentication">
        <ul>
          <li>MS Entra ID driver for internal staff (openid-client v6 with PKCE)</li>
          <li>Azure AD Client Credentials service-to-service auth for public-facing app</li>
          <li>BaseAuthDriver abstract class for pluggable drivers</li>
          <li>AUTH_DRIVER env var for switching drivers</li>
          <li>Unified /auth/callback endpoint</li>
        </ul>
      </goa-callout>

      <goa-spacer vspacing="m"></goa-spacer>

      <goa-callout type="success" heading="Phase 5: Configuration and Validation">
        <ul>
          <li>Zod schemas for 50+ API environment variables</li>
          <li>Zod schemas for 12+ Web environment variables</li>
          <li>Type-safe config loader with runtime validation</li>
          <li>Deployment presets (.env.internal)</li>
          <li>npm run validate-env script for CI/CD</li>
        </ul>
      </goa-callout>

      <goa-spacer vspacing="m"></goa-spacer>

      <goa-callout type="success" heading="Phase 6: Security Hardening">
        <ul>
          <li>Helmet.js with CSP configuration for GoA components</li>
          <li>CSRF token middleware with token-based protection</li>
          <li>Rate limiting (general + strict auth endpoints)</li>
          <li>Input validation middleware with Zod schemas</li>
          <li>Secure request logging (no PII in production logs)</li>
          <li>Security audit with npm audit (no high/critical issues)</li>
          <li>Azure compliance standards documented</li>
        </ul>
      </goa-callout>

      <goa-spacer vspacing="m"></goa-spacer>

      <goa-callout type="success" heading="Phase 7: Testing">
        <ul>
          <li>Vitest unit tests: 162 tests across 13 files (config, auth, API, web)</li>
          <li>Supertest configured for integration tests</li>
          <li>Playwright configured for E2E tests (test files pending)</li>
          <li>Test coverage reporting with V8 provider (text, JSON, HTML)</li>
          <li>CI/CD GitHub Actions workflow template in docs/TESTING.md</li>
          <li>Comprehensive TESTING.md guide with examples (920 lines)</li>
        </ul>
      </goa-callout>

      <goa-spacer vspacing="m"></goa-spacer>

      <goa-callout type="success" heading="Phase 8: Documentation">
        <p><strong>Root:</strong></p>
        <ul>
          <li><strong>README.md</strong> - Project overview, quick start, and setup instructions</li>
          <li><strong>CODEMAP.md</strong> - Code map, architecture diagrams, and conventions</li>
          <li><strong>PLACEHOLDERS.md</strong> - Placeholder tracking for template customization</li>
        </ul>
        <p><strong>docs/:</strong></p>
        <ul>
          <li><strong>AUTH-SETUP.md</strong> - Authentication driver setup (Entra ID, Mock)</li>
          <li><strong>AZURE_POSTGRESQL_COMPLIANCE.md</strong> - Azure PostgreSQL standards compliance</li>
          <li><strong>CONNECTION_BUDGET.md</strong> - Database connection pool budget and tuning</li>
          <li><strong>DEPLOYMENT.md</strong> - Azure, OpenShift, Kubernetes deployment</li>
          <li><strong>DEVELOPMENT.md</strong> - Developer workflow and best practices</li>
          <li><strong>GOA-COMPONENTS.md</strong> - GoA Design System integration guide</li>
          <li><strong>TESTING.md</strong> - Testing strategy (unit/integration/E2E)</li>
          <li><strong>TROUBLESHOOTING.md</strong> - Common issues and solutions</li>
        </ul>
        <p><strong>Total:</strong> 11 documentation files covering all aspects of the template.</p>
      </goa-callout>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Resources -->
    <section>
      <h2 class="section-title">Resources</h2>
      <div class="card-grid">
        <goa-card>
          <h3>Alberta Design System</h3>
          <p>Official GoA design guidelines and component documentation</p>
          <a href="https://design.alberta.ca" target="_blank" rel="noopener">
            <goa-button type="tertiary" trailingicon="open-outline">Visit Site</goa-button>
          </a>
        </goa-card>

        <goa-card>
          <h3>GoA UI Components</h3>
          <p>Source code for @abgov/web-components</p>
          <a href="https://github.com/GovAlta/ui-components" target="_blank" rel="noopener">
            <goa-button type="tertiary" trailingicon="logo-github">GitHub</goa-button>
          </a>
        </goa-card>

        <goa-card>
          <h3>API Health Check</h3>
          <p>Check the status of the backend API</p>
          <a href="/api/v1/health" target="_blank">
            <goa-button type="tertiary" trailingicon="pulse">Check Status</goa-button>
          </a>
        </goa-card>

        <goa-card>
          <h3>API Information</h3>
          <p>View API version and environment details</p>
          <a href="/api/v1/info" target="_blank">
            <goa-button type="tertiary" trailingicon="information-circle">View Info</goa-button>
          </a>
        </goa-card>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// No script setup needed for this view
</script>

<style scoped>
.about-view {
  max-width: 100%;
}

.page-title {
  font-size: var(--goa-font-size-7);
  font-weight: 700;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-l) 0;
  padding-bottom: var(--goa-space-s);
  border-bottom: 2px solid var(--goa-color-interactive-default);
}

.section-title {
  font-size: var(--goa-font-size-5);
  font-weight: 600;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-l) 0;
}

.subsection-title {
  font-size: var(--goa-font-size-4);
  font-weight: 600;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-m) 0;
}

.lead-text {
  color: var(--goa-color-greyscale-700);
  line-height: var(--goa-line-height-3);
  margin: 0;
}

.feature-list {
  margin: var(--goa-space-m) 0 0 var(--goa-space-l);
  color: var(--goa-color-greyscale-700);
  line-height: 1.8;
}

/* Cards */
.card-grid goa-card h3 {
  margin: 0 0 var(--goa-space-xs) 0;
  font-size: var(--goa-font-size-4);
  color: var(--goa-color-greyscale-black);
}

.card-grid goa-card p {
  margin: 0 0 var(--goa-space-m) 0;
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  line-height: var(--goa-line-height-3);
}
</style>
