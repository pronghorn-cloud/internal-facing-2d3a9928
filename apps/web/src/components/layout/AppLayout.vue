<template>
  <div class="app-layout">
    <AppHeader
      :service-name="serviceName"
      :user="user"
      :navigation-items="navigationItems"
    />

    <main>
      <div class="page-content">
        <slot />
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'

/**
 * AppLayout - Main application layout wrapper
 *
 * Provides consistent page structure with:
 * - GoA-compliant header (with navigation)
 * - Centered content area
 * - GoA-compliant footer (sticky at bottom)
 *
 * Navigation has been moved into the header per GoA design patterns.
 */

interface NavigationItem {
  path: string
  label: string
}

interface User {
  name: string
  email?: string
}

withDefaults(
  defineProps<{
    serviceName?: string
    user?: User | null
    navigationItems?: NavigationItem[]
  }>(),
  {
    serviceName: 'Enterprise Template',
    navigationItems: () => [
      { path: '/', label: 'Home' },
      { path: '/about', label: 'About' }
    ]
  }
)
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
