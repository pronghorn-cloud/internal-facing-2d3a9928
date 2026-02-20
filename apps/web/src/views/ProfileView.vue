<template>
  <div class="profile-view">
    <h1 class="page-title">User Profile</h1>

    <goa-callout v-if="!user" type="important" heading="Not Authenticated">
      <p>You are not currently authenticated. Please <router-link to="/login">sign in</router-link> to view your profile.</p>
    </goa-callout>

    <template v-else>
      <goa-callout type="success" heading="Authenticated">
        <p>Your profile information is retrieved from the authentication provider and cannot be modified here.</p>
      </goa-callout>

      <goa-spacer vspacing="l"></goa-spacer>

      <goa-container accent="thin">
        <h2 class="section-title">Profile Information</h2>

        <dl class="info-list">
          <div class="info-row">
            <dt>User ID</dt>
            <dd>{{ user.id }}</dd>
          </div>

          <div class="info-row">
            <dt>Full Name</dt>
            <dd>{{ user.name }}</dd>
          </div>

          <div class="info-row">
            <dt>Email Address</dt>
            <dd>{{ user.email || 'Not provided' }}</dd>
          </div>

          <div class="info-row">
            <dt>Organization</dt>
            <dd>{{ user.organization || 'Alberta Government' }}</dd>
          </div>

          <div class="info-row">
            <dt>Roles</dt>
            <dd class="roles">
              <goa-badge
                v-for="role in user.roles"
                :key="role"
                type="information"
                :content="role"
              />
            </dd>
          </div>
        </dl>
      </goa-container>

      <goa-spacer vspacing="l"></goa-spacer>

      <goa-container>
        <h2 class="section-title">Session Information</h2>

        <dl class="info-list">
          <div class="info-row">
            <dt>Authentication Driver</dt>
            <dd>{{ authDriver }}</dd>
          </div>

          <div class="info-row">
            <dt>Session Status</dt>
            <dd>
              <goa-badge type="success" content="Active" />
            </dd>
          </div>

          <div class="info-row">
            <dt>Session Storage</dt>
            <dd>{{ sessionStore }}</dd>
          </div>
        </dl>
      </goa-container>

      <goa-spacer vspacing="l"></goa-spacer>

      <goa-container>
        <h2 class="section-title">Authentication Details</h2>
        <goa-callout type="information" heading="Authentication Drivers">
          <p>This template supports two authentication drivers that can be switched via the <code>AUTH_DRIVER</code> environment variable:</p>
          <ul>
            <li><strong>mock:</strong> Development mode with 3 test users (Developer, Admin, User)</li>
            <li><strong>entra-id:</strong> Microsoft Entra ID (Azure AD) for internal government employees</li>
          </ul>
          <p>The public-facing application accesses internal APIs via Azure AD Client Credentials (service-to-service auth).</p>
        </goa-callout>
      </goa-container>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.store'

const authStore = useAuthStore()

const user = computed(() => authStore.user)

const authDriver = computed(() => {
  return import.meta.env.VITE_AUTH_DRIVER || 'mock'
})

const sessionStore = computed(() => {
  return import.meta.env.VITE_SESSION_STORE || 'memory'
})

onMounted(async () => {
  if (!user.value) {
    await authStore.fetchUser()
  }
})
</script>

<style scoped>
.profile-view {
  max-width: 800px;
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

.info-list {
  margin: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--goa-space-m) 0;
  border-bottom: 1px solid var(--goa-color-greyscale-200);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row dt {
  font-weight: 600;
  color: var(--goa-color-greyscale-700);
}

.info-row dd {
  margin: 0;
  color: var(--goa-color-greyscale-black);
  text-transform: capitalize;
}

.roles {
  display: flex;
  gap: var(--goa-space-xs);
  flex-wrap: wrap;
}

code {
  background: var(--goa-color-greyscale-100);
  padding: 0.125rem var(--goa-space-xs);
  border-radius: var(--goa-border-radius-s);
  font-family: monospace;
  font-size: var(--goa-font-size-3);
}
</style>
