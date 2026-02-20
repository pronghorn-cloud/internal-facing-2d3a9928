<template>
  <div class="home-view">
    <!-- Hero Banner -->
    <goa-hero-banner heading="Alberta Government Enterprise Template">
      <p>Production-ready Vue.js + Node.js + TypeScript internal-facing template with official GoA Design System, MS Entra ID authentication, service-to-service API layer, and type-safe configuration.</p>
    </goa-hero-banner>

    <goa-spacer vspacing="xl"></goa-spacer>

    <goa-callout type="success" heading="Production Ready">
      <p><strong>All 8 phases complete.</strong> This template is fully documented and ready for production use in Alberta Government applications.</p>
      <p>Visit the <router-link to="/about">About page</router-link> to see detailed implementation progress and technical achievements.</p>
    </goa-callout>

    <goa-spacer vspacing="l"></goa-spacer>

    <!-- Stats Section -->
    <section>
      <h2 class="section-title">Template Overview</h2>
      <div class="stats-grid">
        <goa-container accent="thin">
          <div class="stat-content">
            <strong class="stat-number">5</strong>
            <span class="stat-label">Packages</span>
          </div>
        </goa-container>

        <goa-container accent="thin">
          <div class="stat-content">
            <strong class="stat-number">2</strong>
            <span class="stat-label">Applications</span>
          </div>
        </goa-container>

        <goa-container accent="thin">
          <div class="stat-content">
            <strong class="stat-number">100%</strong>
            <span class="stat-label">TypeScript</span>
          </div>
        </goa-container>

        <goa-container accent="thin">
          <div class="stat-content">
            <strong class="stat-number">2</strong>
            <span class="stat-label">Auth Drivers</span>
          </div>
        </goa-container>
      </div>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Quick Links -->
    <section>
      <h2 class="section-title">Quick Links</h2>
      <div class="card-grid">
        <goa-card>
          <h3>Architecture</h3>
          <p>System design, BFF pattern, and driver architecture</p>
          <goa-button type="tertiary" trailingicon="arrow-forward">View Documentation</goa-button>
        </goa-card>

        <goa-card>
          <h3>Development</h3>
          <p>Getting started, workflow, and best practices</p>
          <goa-button type="tertiary" trailingicon="arrow-forward">View Documentation</goa-button>
        </goa-card>

        <goa-card>
          <h3>Authentication</h3>
          <p>MS Entra ID setup and service auth guide</p>
          <goa-button type="tertiary" trailingicon="arrow-forward">View Documentation</goa-button>
        </goa-card>

        <goa-card>
          <h3>Deployment</h3>
          <p>Azure, OpenShift, and Kubernetes guides</p>
          <goa-button type="tertiary" trailingicon="arrow-forward">View Documentation</goa-button>
        </goa-card>

        <goa-card>
          <h3>GoA Components</h3>
          <p>Design System integration and usage</p>
          <goa-button type="tertiary" trailingicon="arrow-forward">View Documentation</goa-button>
        </goa-card>

        <goa-card>
          <h3>Template Guide</h3>
          <p>Step-by-step customization instructions</p>
          <goa-button type="tertiary" trailingicon="arrow-forward">View Documentation</goa-button>
        </goa-card>
      </div>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Key Features -->
    <section>
      <h2 class="section-title">Key Features</h2>
      <div class="card-grid">
        <goa-card>
          <div class="feature-content">
            <goa-icon type="lock-closed" size="large"></goa-icon>
            <h3>Entra ID Authentication</h3>
            <p>MS Entra ID (staff) + Mock (development) + Service-to-service API auth</p>
          </div>
        </goa-card>

        <goa-card>
          <div class="feature-content">
            <goa-icon type="color-palette" size="large"></goa-icon>
            <h3>GoA Design System</h3>
            <p>Official @abgov/web-components with Vue wrappers and TypeScript support</p>
          </div>
        </goa-card>

        <goa-card>
          <div class="feature-content">
            <goa-icon type="shield-checkmark" size="large"></goa-icon>
            <h3>Security Hardened</h3>
            <p>Helmet CSP, CORS, rate limiting, CSRF protection, input validation</p>
          </div>
        </goa-card>

        <goa-card>
          <div class="feature-content">
            <goa-icon type="cube" size="large"></goa-icon>
            <h3>Platform Agnostic</h3>
            <p>Docker containerized, deploys to Azure, OpenShift, or Kubernetes</p>
          </div>
        </goa-card>

        <goa-card>
          <div class="feature-content">
            <goa-icon type="document-text" size="large"></goa-icon>
            <h3>Type-Safe Config</h3>
            <p>Zod validation with 50+ environment variables and runtime checks</p>
          </div>
        </goa-card>

        <goa-card>
          <div class="feature-content">
            <goa-icon type="flask" size="large"></goa-icon>
            <h3>Comprehensive Testing</h3>
            <p>Vitest (unit), Supertest (integration), Playwright (E2E)</p>
          </div>
        </goa-card>
      </div>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Component Demo -->
    <section>
      <h2 class="section-title">Component Demonstration</h2>
      <goa-container>
        <div class="demo-grid">
          <div class="demo-section">
            <h3>Buttons</h3>
            <goa-button-group gap="relaxed">
              <GoabButton type="primary">Primary</GoabButton>
              <GoabButton type="secondary">Secondary</GoabButton>
              <GoabButton type="tertiary">Tertiary</GoabButton>
            </goa-button-group>
          </div>

          <div class="demo-section">
            <h3>Input Field</h3>
            <goa-form-item label="Email Address" requirement="required">
              <GoabInput
                v-model="demoEmail"
                type="email"
                placeholder="Enter your email"
              />
            </goa-form-item>
            <p v-if="demoEmail" class="demo-value">Value: {{ demoEmail }}</p>
          </div>
        </div>
      </goa-container>
    </section>

    <goa-spacer vspacing="l"></goa-spacer>

    <!-- Action Buttons -->
    <goa-button-group gap="relaxed">
      <GoabButton type="primary" @click="openModal">
        Open Modal Demo
      </GoabButton>
      <a href="/api/v1/health" target="_blank" style="text-decoration: none;">
        <GoabButton type="secondary">
          Test API Health
        </GoabButton>
      </a>
    </goa-button-group>

    <!-- Modal Demo -->
    <GoabModal
      heading="Modal Demonstration"
      :open="showModal"
      :closable="true"
      @close="showModal = false"
    >
      <p>This is a GoA modal component wrapped in Vue with proper TypeScript support and event handling.</p>
      <goa-spacer vspacing="l"></goa-spacer>
      <GoabButton type="primary" @click="showModal = false">
        Close Modal
      </GoabButton>
    </GoabModal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GoabButton, GoabInput, GoabModal } from '../components/goa'

const demoEmail = ref('')
const showModal = ref(false)

function openModal() {
  showModal.value = true
}
</script>

<style scoped>
.home-view {
  max-width: 100%;
}

.section-title {
  font-size: var(--goa-font-size-6);
  font-weight: 600;
  color: var(--goa-color-greyscale-black);
  margin-bottom: var(--goa-space-l);
}

/* Stats */
.stat-content {
  text-align: center;
  padding: var(--goa-space-m);
}

.stat-number {
  display: block;
  font-size: var(--goa-font-size-8);
  font-weight: 700;
  color: var(--goa-color-interactive-default);
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  margin-top: var(--goa-space-xs);
}

/* Features */
.feature-content {
  text-align: center;
  padding: var(--goa-space-m);
}

.feature-content goa-icon {
  margin-bottom: var(--goa-space-m);
  color: var(--goa-color-interactive-default);
}

.feature-content h3 {
  margin: 0 0 var(--goa-space-xs) 0;
  font-size: var(--goa-font-size-4);
  color: var(--goa-color-greyscale-black);
}

.feature-content p {
  margin: 0;
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  line-height: var(--goa-line-height-3);
}

/* Demo */
.demo-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--goa-space-xl);
}

@media (min-width: 640px) {
  .demo-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.demo-section h3 {
  margin: 0 0 var(--goa-space-m) 0;
  font-size: var(--goa-font-size-4);
  color: var(--goa-color-greyscale-black);
}

.demo-value {
  margin-top: var(--goa-space-s);
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-interactive-default);
  font-weight: 600;
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
