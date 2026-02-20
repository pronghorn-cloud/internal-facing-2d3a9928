<template>
  <div class="login-view">
    <div class="form-content">
      <h1 class="page-title">Sign In</h1>
      <p class="subtitle">Internal Staff Portal</p>

      <goa-spacer vspacing="l"></goa-spacer>

      <goa-callout type="information" heading="Authentication">
        <p>This application uses Microsoft Entra ID for Alberta Government employee authentication.</p>
        <ul>
          <li><strong>MS Entra ID:</strong> For internal government employees</li>
          <li><strong>Mock:</strong> For local development and testing</li>
        </ul>
      </goa-callout>

      <goa-spacer vspacing="l"></goa-spacer>

      <div class="auth-buttons">
        <GoabButton type="primary" leadingicon="log-in" @click="handleEntraIdLogin">
          Sign in with MS Entra ID
        </GoabButton>

        <GoabButton type="tertiary" leadingicon="person" @click="handleMockLogin">
          Mock Login (Development)
        </GoabButton>
      </div>

      <goa-spacer vspacing="xl"></goa-spacer>

      <goa-details heading="Development Mode">
        <p>Currently running with mock authentication. The auth package includes:</p>
        <ul>
          <li><strong>Mock Driver:</strong> 3 test users (Developer, Admin, User)</li>
          <li><strong>Entra ID Driver:</strong> For internal government employees</li>
          <li><strong>Session Storage:</strong> PostgreSQL-backed sessions</li>
          <li><strong>Security:</strong> Rate limiting, CSRF protection, secure cookies</li>
        </ul>
      </goa-details>

      <goa-spacer vspacing="m"></goa-spacer>

      <goa-callout type="important" heading="Configuration Note">
        <p>Switch authentication drivers by setting <code>AUTH_DRIVER</code> in your <code>.env</code> file to <code>mock</code> or <code>entra-id</code>.</p>
      </goa-callout>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth.store'
import { GoabButton } from '../components/goa'

const authStore = useAuthStore()

/**
 * MS Entra ID Login
 * Redirects to API endpoint which initiates Entra ID OIDC flow
 */
function handleEntraIdLogin() {
  console.log('Entra ID login initiated')
  window.location.href = '/api/v1/auth/login'
}

/**
 * Mock Login (Development)
 * Uses mock authentication driver with selectable test users
 */
async function handleMockLogin() {
  console.log('Mock login initiated')
  await authStore.login(0)
}
</script>

<style scoped>
.login-view {
  display: flex;
  justify-content: center;
  padding: var(--goa-space-xl) var(--goa-space-m);
}

.page-title {
  font-size: var(--goa-font-size-7);
  font-weight: 700;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-xs) 0;
  text-align: center;
}

.subtitle {
  color: var(--goa-color-greyscale-700);
  font-size: var(--goa-font-size-5);
  margin: 0;
  text-align: center;
}

.auth-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--goa-space-m);
}

code {
  background: var(--goa-color-greyscale-100);
  padding: 0.125rem var(--goa-space-xs);
  border-radius: var(--goa-border-radius-s);
  font-family: monospace;
  font-size: var(--goa-font-size-3);
}
</style>
