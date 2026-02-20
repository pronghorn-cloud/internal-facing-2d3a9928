<template>
  <goa-input
    :type="type"
    :name="name"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :error="error"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledBy"
    :width="width"
    :maxlength="maxLength"
    @_change="handleChange"
  />
</template>

<script setup lang="ts">
/**
 * GoabInput - Vue wrapper for goa-input web component with v-model support
 *
 * Provides proper v-model binding for two-way data binding with the
 * Alberta Government Design System input component.
 *
 * @example
 * <GoabInput v-model="email" type="email" placeholder="Enter email" />
 */

defineProps<{
  modelValue?: string | number
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url' | 'date'
  name?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  error?: boolean
  ariaLabel?: string
  ariaLabelledBy?: string
  width?: string
  maxLength?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

function handleChange(event: CustomEvent) {
  const value = event.detail?.value ?? (event.target as HTMLInputElement)?.value
  emit('update:modelValue', value)
}
</script>
