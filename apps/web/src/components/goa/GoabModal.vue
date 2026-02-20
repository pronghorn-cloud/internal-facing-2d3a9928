<template>
  <goa-modal
    :heading="heading"
    :open="open"
    :closable="closable"
    :actions="actions"
    :callout-variant="calloutVariant"
    :width="width"
    @_close="handleClose"
  >
    <slot />
  </goa-modal>
</template>

<script setup lang="ts">
/**
 * GoabModal - Vue wrapper for goa-modal web component
 *
 * Provides dialog/modal functionality with the Alberta Government Design System.
 *
 * @example
 * <GoabModal
 *   heading="Confirm Action"
 *   :open="isOpen"
 *   @close="isOpen = false"
 * >
 *   <p>Are you sure?</p>
 *   <template #actions>
 *     <GoabButton type="primary">Confirm</GoabButton>
 *   </template>
 * </GoabModal>
 */

defineProps<{
  heading?: string
  open?: boolean
  closable?: boolean
  actions?: boolean
  calloutVariant?: 'information' | 'important' | 'emergency' | 'success'
  width?: string
}>()

const emit = defineEmits<{
  close: []
}>()

function handleClose() {
  emit('close')
}
</script>
