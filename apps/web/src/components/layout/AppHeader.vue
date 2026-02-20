<template>
  <goa-app-header :heading="serviceName" url="/">
    <!-- Navigation Links -->
    <a
      v-for="item in navigationItems"
      :key="item.path"
      :href="item.path"
      @click.prevent="navigateTo(item.path)"
    >
      {{ item.label }}
    </a>

    <!-- User Menu (when authenticated) -->
    <goa-app-header-menu v-if="user" :heading="user.name">
      <a href="/profile" @click.prevent="navigateTo('/profile')">Profile</a>
      <a href="#" @click.prevent="handleLogout">Sign Out</a>
    </goa-app-header-menu>

    <!-- Sign In Link (when not authenticated) -->
    <a v-else href="/login" @click.prevent="navigateTo('/login')">Sign In</a>
  </goa-app-header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

/**
 * AppHeader - GoA Design System compliant header
 *
 * Uses goa-app-header which automatically provides:
 * - Alberta Government logo
 * - Responsive navigation
 * - Proper styling
 *
 * Navigation is handled via click.prevent to use Vue Router
 * instead of full page reloads.
 */

interface User {
  name: string
  email?: string
}

interface NavigationItem {
  path: string
  label: string
}

withDefaults(
  defineProps<{
    serviceName?: string
    user?: User | null
    navigationItems?: NavigationItem[]
  }>(),
  {
    serviceName: 'Enterprise Template',
    navigationItems: () => []
  }
)

const router = useRouter()
const authStore = useAuthStore()

function navigateTo(path: string) {
  router.push(path)
}

async function handleLogout() {
  try {
    await authStore.logout()
    router.push('/')
  } catch (error) {
    console.error('Logout failed:', error)
    router.push('/')
  }
}
</script>
