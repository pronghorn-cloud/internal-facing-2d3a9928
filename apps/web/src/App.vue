<template>
  <AppLayout
    service-name="Enterprise Template"
    :user="user"
    :navigation-items="navigationItems"
  >
    <router-view />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from './stores/auth.store'
import AppLayout from './components/layout/AppLayout.vue'

/**
 * App - Root application component
 *
 * Provides:
 * - Main layout structure via AppLayout
 * - User authentication state
 * - Navigation configuration
 *
 * Health status indicator has been removed per GoA design system compliance.
 */

const authStore = useAuthStore()

// Get user from auth store
const user = computed(() => authStore.user)

const navigationItems = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About' }
]

onMounted(async () => {
  // Fetch current user from API
  await authStore.fetchUser()
})
</script>
