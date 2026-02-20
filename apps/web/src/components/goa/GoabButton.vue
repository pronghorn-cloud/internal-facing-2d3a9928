<template>
  <goa-button
    :type="type"
    :variant="variant"
    :size="size"
    :disabled="disabled"
    :leading-icon="leadingIcon"
    :trailing-icon="trailingIcon"
    @_click="handleClick"
  >
    <slot />
  </goa-button>
</template>

<script setup lang="ts">
/**
 * GoabButton - Vue wrapper for goa-button web component
 *
 * Provides proper TypeScript support and event handling for the
 * Alberta Government Design System button component.
 *
 * @example
 * <GoabButton type="primary" @click="handleClick">
 *   Click Me
 * </GoabButton>
 */

defineProps<{
  type?: 'primary' | 'secondary' | 'tertiary' | 'submit'
  variant?: 'normal' | 'destructive'
  size?: 'compact' | 'normal'
  disabled?: boolean
  leadingIcon?: string
  trailingIcon?: string
}>()

const emit = defineEmits<{
  click: [event: Event]
}>()

function handleClick(event: Event) {
  emit('click', event)
}
</script>
