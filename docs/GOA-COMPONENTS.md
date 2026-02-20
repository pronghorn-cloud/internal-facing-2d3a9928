# GoA Design System Integration Guide

## Overview

This template uses the **Alberta Government Design System (GoA)** through official web components from [@abgov/web-components](https://www.npmjs.com/package/@abgov/web-components). This guide explains how to use GoA components effectively in Vue 3 applications.

## Official Resources

- **Design System Documentation**: [design.alberta.ca](https://design.alberta.ca/)
- **Component Library**: [components.design.alberta.ca](https://components.design.alberta.ca/)
- **npm Package**: [@abgov/web-components](https://www.npmjs.com/package/@abgov/web-components)
- **GitHub Repository**: [github.com/GovAlta/ui-components](https://github.com/GovAlta/ui-components)

## Architecture

### Web Components Approach

GoA components are built as **technology-agnostic web components** (Custom Elements), making them compatible with any frontend framework.

**Benefits**:
- Framework-independent (works with Vue, React, Angular, vanilla JS)
- Consistent styling across all Alberta Government applications
- Regular updates from the design system team
- Accessibility baked in (WCAG 2.1 AA compliant)

**Integration Strategy**:
```
@abgov/web-components (official package)
           ↓
    Web Components (Custom Elements)
           ↓
    Vue Wrapper Components (thin layer)
           ↓
    Your Application (using v-model, @click, etc.)
```

### Why Wrapper Components?

While GoA web components work directly in Vue templates, thin wrapper components provide:

1. **v-model Support**: Two-way data binding for inputs
2. **TypeScript Types**: Full IDE autocomplete and type checking
3. **Vue-Native Events**: Standard `@click` instead of `@_click`
4. **Consistent API**: Vue-style props and events

## Configuration

### 1. Vite Configuration

**File**: [apps/web/vite.config.ts](../apps/web/vite.config.ts#L8-L14)

```typescript
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Tell Vue to treat GoA tags as custom elements (don't compile as Vue components)
          isCustomElement: (tag) => tag.startsWith('goa-') || tag.startsWith('goab-')
        }
      }
    })
  ]
})
```

**Critical**: Without this configuration, Vue will treat GoA components as missing Vue components and throw warnings.

### 2. TypeScript Declarations

**File**: [apps/web/src/types/goa-components.d.ts](../apps/web/src/types/goa-components.d.ts)

```typescript
declare module 'vue' {
  export interface GlobalComponents {
    'goa-button': DefineComponent<{
      type?: 'primary' | 'secondary' | 'tertiary'
      // ... all props
    }>
    // ... all GoA components
  }
}
```

**Purpose**: Provides TypeScript autocomplete and type checking for GoA components used directly in templates.

### 3. Component Registration

**File**: [apps/web/src/main.ts](../apps/web/src/main.ts)

```typescript
import '@abgov/web-components' // Import and register all GoA web components
import '@abgov/web-components/index.css' // Import GoA styles

const app = createApp(App)
app.mount('#app')
```

**Note**: Web components are self-registering when imported.

## Wrapper Components

### Available Wrappers

This template includes Vue wrapper components in [apps/web/src/components/goa/](../apps/web/src/components/goa/):

| Wrapper Component | GoA Component | Purpose |
|-------------------|---------------|---------|
| `GoabButton` | `goa-button` | Buttons with click events |
| `GoabInput` | `goa-input` | Text inputs with v-model |
| `GoabModal` | `goa-modal` | Dialogs and modals |
| `GoabCallout` | `goa-callout` | Alerts and notifications |

**Naming Convention**: `Goab*` (GoA + "b" for "bridged" wrapper)

### GoabButton - Button Component

**File**: [apps/web/src/components/goa/GoabButton.vue](../apps/web/src/components/goa/GoabButton.vue)

**Usage**:
```vue
<template>
  <!-- Primary button -->
  <GoabButton type="primary" @click="handleSave">
    Save Changes
  </GoabButton>

  <!-- Secondary button with icon -->
  <GoabButton type="secondary" leading-icon="download">
    Export
  </GoabButton>

  <!-- Destructive action -->
  <GoabButton type="primary" variant="destructive" @click="handleDelete">
    Delete
  </GoabButton>

  <!-- Disabled button -->
  <GoabButton type="tertiary" :disabled="isProcessing">
    Submit
  </GoabButton>
</template>

<script setup lang="ts">
import { GoabButton } from '@/components/goa'

function handleSave() {
  console.log('Saving...')
}
</script>
```

**Props**:
- `type`: `'primary' | 'secondary' | 'tertiary' | 'submit'` - Button styling
- `variant`: `'normal' | 'destructive'` - Use `destructive` for delete actions
- `size`: `'compact' | 'normal'` - Button size
- `disabled`: `boolean` - Disable interaction
- `leadingIcon`: `string` - Icon name (before text)
- `trailingIcon`: `string` - Icon name (after text)

**Events**:
- `@click`: Fired when button is clicked

### GoabInput - Text Input with v-model

**File**: [apps/web/src/components/goa/GoabInput.vue](../apps/web/src/components/goa/GoabInput.vue)

**Usage**:
```vue
<template>
  <goa-form-item label="Email Address" requirement="required">
    <GoabInput
      v-model="email"
      type="email"
      placeholder="user@alberta.ca"
      :error="hasError"
      @input="validateEmail"
    />
  </goa-form-item>

  <goa-form-item label="Phone Number">
    <GoabInput
      v-model="phone"
      type="tel"
      placeholder="(123) 456-7890"
      width="300px"
    />
  </goa-form-item>

  <!-- Password input -->
  <GoabInput
    v-model="password"
    type="password"
    placeholder="Enter password"
  />

  <!-- Read-only input -->
  <GoabInput
    :model-value="userId"
    readonly
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GoabInput } from '@/components/goa'

const email = ref('')
const phone = ref('')
const password = ref('')
const hasError = ref(false)

function validateEmail() {
  hasError.value = !email.value.includes('@')
}
</script>
```

**Props**:
- `modelValue`: `string | number` - Value for v-model binding
- `type`: `'text' | 'number' | 'email' | 'password' | 'tel' | 'url' | 'date'` - Input type
- `placeholder`: `string` - Placeholder text
- `disabled`: `boolean` - Disable input
- `readonly`: `boolean` - Make read-only
- `error`: `boolean` - Show error styling
- `width`: `string` - Custom width (e.g., '300px', '100%')
- `maxLength`: `number` - Maximum character length

**Events**:
- `@update:modelValue`: Fired when value changes (v-model)

### GoabModal - Dialog/Modal

**File**: [apps/web/src/components/goa/GoabModal.vue](../apps/web/src/components/goa/GoabModal.vue)

**Usage**:
```vue
<template>
  <GoabButton type="primary" @click="showModal = true">
    Open Modal
  </GoabButton>

  <!-- Simple modal -->
  <GoabModal
    heading="Confirm Action"
    :open="showModal"
    @close="showModal = false"
  >
    <p>Are you sure you want to proceed?</p>

    <template #actions>
      <GoabButton type="secondary" @click="showModal = false">
        Cancel
      </GoabButton>
      <GoabButton type="primary" @click="handleConfirm">
        Confirm
      </GoabButton>
    </template>
  </GoabModal>

  <!-- Warning modal -->
  <GoabModal
    heading="Warning"
    :open="showWarning"
    callout-variant="important"
    closable
    @close="showWarning = false"
  >
    <p>This action cannot be undone.</p>
  </GoabModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GoabButton, GoabModal } from '@/components/goa'

const showModal = ref(false)
const showWarning = ref(false)

function handleConfirm() {
  console.log('Confirmed!')
  showModal.value = false
}
</script>
```

**Props**:
- `heading`: `string` - Modal title
- `open`: `boolean` - Show/hide modal
- `closable`: `boolean` - Show close button (X)
- `calloutVariant`: `'information' | 'important' | 'emergency' | 'success'` - Header style
- `width`: `string` - Custom width

**Events**:
- `@close`: Fired when modal is closed (via X button or backdrop click)

### GoabCallout - Alerts & Notifications

**File**: [apps/web/src/components/goa/GoabCallout.vue](../apps/web/src/components/goa/GoabCallout.vue)

**Usage**:
```vue
<template>
  <!-- Success message -->
  <GoabCallout type="success" heading="Success!">
    Your changes have been saved successfully.
  </GoabCallout>

  <!-- Error message -->
  <GoabCallout type="emergency" heading="Error">
    Failed to save changes. Please try again.
  </GoabCallout>

  <!-- Information -->
  <GoabCallout type="information" heading="Note">
    This form must be completed within 30 days.
  </GoabCallout>

  <!-- Important notice (large) -->
  <GoabCallout type="important" heading="Maintenance Notice" size="large">
    System maintenance scheduled for Saturday 2:00 AM - 6:00 AM MST.
  </GoabCallout>
</template>

<script setup lang="ts">
import { GoabCallout } from '@/components/goa'
</script>
```

**Props**:
- `type`: `'information' | 'important' | 'emergency' | 'success' | 'event'` - Visual style
- `heading`: `string` - Callout title
- `size`: `'medium' | 'large'` - Callout size

## Using GoA Components Directly

For components **without wrappers**, use the underlying `goa-*` components directly.

### Form Layout with goa-form-item

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <!-- Text input with label -->
    <goa-form-item
      label="Full Name"
      requirement="required"
      help-text="Enter your legal name"
    >
      <GoabInput v-model="fullName" />
    </goa-form-item>

    <!-- Input with error -->
    <goa-form-item
      label="Email Address"
      requirement="required"
      :error="emailError"
    >
      <GoabInput v-model="email" type="email" :error="!!emailError" />
    </goa-form-item>

    <!-- Dropdown -->
    <goa-form-item label="Province" requirement="required">
      <goa-dropdown v-model="province" @_change="handleProvinceChange">
        <goa-dropdown-item value="">Select province</goa-dropdown-item>
        <goa-dropdown-item value="AB">Alberta</goa-dropdown-item>
        <goa-dropdown-item value="BC">British Columbia</goa-dropdown-item>
        <goa-dropdown-item value="ON">Ontario</goa-dropdown-item>
      </goa-dropdown>
    </goa-form-item>

    <!-- Checkbox -->
    <goa-form-item>
      <goa-checkbox
        v-model="acceptTerms"
        text="I agree to the terms and conditions"
        @_change="handleCheckboxChange"
      />
    </goa-form-item>

    <GoabButton type="submit" :disabled="!isValid">
      Submit
    </GoabButton>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { GoabButton, GoabInput } from '@/components/goa'

const fullName = ref('')
const email = ref('')
const province = ref('')
const acceptTerms = ref(false)
const emailError = ref('')

const isValid = computed(() =>
  fullName.value && email.value && province.value && acceptTerms.value
)

function handleProvinceChange(e: CustomEvent) {
  province.value = e.detail.value
}

function handleCheckboxChange(e: CustomEvent) {
  acceptTerms.value = e.detail.checked
}

function handleSubmit() {
  if (!email.value.includes('@')) {
    emailError.value = 'Please enter a valid email address'
    return
  }
  console.log('Form submitted:', { fullName, email, province, acceptTerms })
}
</script>
```

### Layout Components

**goa-container** - Card-like container:
```vue
<goa-container type="non-interactive" accent="thin" padding="relaxed">
  <h2>User Profile</h2>
  <p>Manage your account settings</p>
</goa-container>
```

**goa-block** - Flexbox layout:
```vue
<!-- Horizontal buttons -->
<goa-block direction="row" gap="m" alignment="start">
  <GoabButton type="primary">Save</GoabButton>
  <GoabButton type="secondary">Cancel</GoabButton>
</goa-block>

<!-- Vertical stack -->
<goa-block direction="column" gap="l">
  <GoabInput v-model="field1" />
  <GoabInput v-model="field2" />
  <GoabInput v-model="field3" />
</goa-block>
```

**goa-spacer** - Spacing utility:
```vue
<div>
  <p>First paragraph</p>
  <goa-spacer vSpacing="xl" />
  <p>Second paragraph with extra spacing</p>
</div>
```

### Navigation Components

**goa-tabs** - Tabbed interface:
```vue
<goa-tabs>
  <goa-tab heading="Overview" :open="activeTab === 'overview'">
    <p>Overview content</p>
  </goa-tab>
  <goa-tab heading="Settings" :open="activeTab === 'settings'">
    <p>Settings content</p>
  </goa-tab>
  <goa-tab heading="History" :open="activeTab === 'history'">
    <p>History content</p>
  </goa-tab>
</goa-tabs>
```

**goa-pagination** - Page navigation:
```vue
<goa-pagination
  :item-count="totalItems"
  :per-page="itemsPerPage"
  :page="currentPage"
  @_change="handlePageChange"
/>

<script setup>
function handlePageChange(e: CustomEvent) {
  currentPage.value = e.detail.page
  // Fetch new page data
}
</script>
```

### Data Display Components

**goa-table** - Data tables:
```vue
<goa-table width="100%">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="user in users" :key="user.id">
      <td>{{ user.name }}</td>
      <td>{{ user.email }}</td>
      <td>
        <goa-badge :type="user.active ? 'success' : 'warning'">
          {{ user.active ? 'Active' : 'Inactive' }}
        </goa-badge>
      </td>
      <td>
        <GoabButton type="tertiary" size="compact" @click="editUser(user)">
          Edit
        </GoabButton>
      </td>
    </tr>
  </tbody>
</goa-table>
```

**goa-card** - Card container:
```vue
<goa-card width="400px" elevation="2">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
  <GoabButton type="primary">Action</GoabButton>
</goa-card>
```

**goa-badge** - Status indicators:
```vue
<goa-badge type="success">Active</goa-badge>
<goa-badge type="warning">Pending</goa-badge>
<goa-badge type="emergency">Error</goa-badge>
<goa-badge type="information" icon>3</goa-badge>
```

### Icons

**goa-icon** - Icon component:
```vue
<goa-icon type="checkmark" size="medium" theme="filled" />
<goa-icon type="warning" size="large" theme="outline" />
<goa-icon type="information" size="small" />
```

**Available icons**: See [GoA Design System - Icons](https://components.design.alberta.ca/?path=/docs/utility-icons--docs)

## Event Handling

### Custom Event Pattern

GoA web components emit **Custom Events** with an underscore prefix (e.g., `_click`, `_change`).

**Direct Usage** (without wrapper):
```vue
<goa-button @_click="handleClick">Click Me</goa-button>
<goa-input :value="text" @_change="handleChange" />
```

**With Wrapper** (standard Vue events):
```vue
<GoabButton @click="handleClick">Click Me</GoabButton>
<GoabInput v-model="text" />
```

### Extracting Event Data

```vue
<script setup>
function handleChange(event: CustomEvent) {
  // GoA components pass data in event.detail
  const newValue = event.detail.value
  console.log('Changed to:', newValue)
}

function handlePageChange(event: CustomEvent) {
  const { page, itemsPerPage } = event.detail
  console.log(`Page ${page}, ${itemsPerPage} items per page`)
}
</script>
```

## Styling and Theming

### Alberta Government Theme

GoA components automatically apply the official Alberta Government design tokens:

- **Colors**: Alberta Blue (#0070C4), accent colors
- **Typography**: Alberta sans-serif font stack
- **Spacing**: Consistent spacing scale
- **Shadows**: Elevation system

**No custom styling required** - components are ready to use.

### Custom Styling

**⚠️ Avoid overriding GoA component styles** - this breaks design consistency.

**Allowed**:
- Layout spacing (margins, padding on parent elements)
- Component-specific width props (e.g., `width="400px"` on inputs)

**Not Allowed**:
- Changing component colors via CSS
- Overriding internal component styles
- Custom fonts

### Dark Mode

GoA Design System **does not support dark mode** as per Alberta Government brand guidelines.

## Accessibility

All GoA components are **WCAG 2.1 AA compliant** out of the box.

### Best Practices

1. **Use semantic HTML**: GoA components wrap native elements properly
2. **Provide labels**: Always use `goa-form-item` labels for inputs
3. **ARIA attributes**: Pass `aria-label` or `aria-labelledby` when needed
4. **Keyboard navigation**: All components support keyboard interaction
5. **Screen reader testing**: Test with NVDA/JAWS on Windows, VoiceOver on Mac

### Example: Accessible Form

```vue
<template>
  <form @submit.prevent="handleSubmit" aria-labelledby="form-heading">
    <h1 id="form-heading">User Registration</h1>

    <goa-form-item
      label="Email Address"
      requirement="required"
      help-text="We'll never share your email"
    >
      <GoabInput
        v-model="email"
        type="email"
        aria-describedby="email-help"
        :error="!!emailError"
      />
      <span id="email-help" class="sr-only">Enter a valid email address</span>
    </goa-form-item>

    <goa-form-item>
      <goa-checkbox
        v-model="acceptTerms"
        text="I agree to the terms"
        aria-label="Accept terms and conditions"
      />
    </goa-form-item>

    <GoabButton type="submit" :disabled="!isValid">
      Register
    </GoabButton>
  </form>
</template>
```

## Creating New Wrapper Components

If you need a wrapper for a GoA component not yet included:

### Template

```vue
<!-- apps/web/src/components/goa/GoabDropdown.vue -->
<template>
  <goa-dropdown
    :name="name"
    :value="modelValue"
    :disabled="disabled"
    :error="error"
    :width="width"
    @_change="handleChange"
  >
    <slot />
  </goa-dropdown>
</template>

<script setup lang="ts">
/**
 * GoabDropdown - Vue wrapper for goa-dropdown with v-model support
 */

defineProps<{
  modelValue?: string
  name?: string
  disabled?: boolean
  error?: boolean
  width?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function handleChange(event: CustomEvent) {
  emit('update:modelValue', event.detail.value)
}
</script>
```

### Registration

Add to [apps/web/src/components/goa/index.ts](../apps/web/src/components/goa/index.ts):

```typescript
export { default as GoabButton } from './GoabButton.vue'
export { default as GoabInput } from './GoabInput.vue'
export { default as GoabModal } from './GoabModal.vue'
export { default as GoabCallout } from './GoabCallout.vue'
export { default as GoabDropdown } from './GoabDropdown.vue' // Add new wrapper
```

## Troubleshooting

### Components Not Rendering

**Symptom**: `<goa-button>` appears as plain HTML, no styling

**Solutions**:
1. Verify `@abgov/web-components` is imported in [main.ts](../apps/web/src/main.ts)
2. Check browser console for JavaScript errors
3. Ensure `isCustomElement` config in [vite.config.ts](../apps/web/vite.config.ts)

### TypeScript Errors

**Symptom**: "Property 'goa-button' does not exist on type 'JSX.IntrinsicElements'"

**Solutions**:
1. Verify [goa-components.d.ts](../apps/web/src/types/goa-components.d.ts) exists
2. Restart TypeScript server in VS Code (`Cmd+Shift+P` → "Restart TS Server")
3. Check `tsconfig.json` includes `src/types/**/*.d.ts`

### v-model Not Working

**Symptom**: Two-way binding doesn't update

**Solutions**:
1. Use wrapper components (`GoabInput`) instead of direct `<goa-input>`
2. Verify wrapper emits `update:modelValue` event
3. Check event handler extracts `event.detail.value` correctly

### Styling Issues

**Symptom**: Components look unstyled or incorrect

**Solutions**:
1. Verify CSS import: `import '@abgov/web-components/index.css'`
2. Check for CSS conflicts with global styles
3. Ensure no CSS overrides targeting `.goa-*` classes

## Examples

### Complete Form Example

See [apps/web/src/views/ProfileView.vue](../apps/web/src/views/ProfileView.vue) for a full form implementation with:
- Form validation
- Error handling
- Success messages
- Loading states

### Layout Example

See [apps/web/src/components/layout/AppLayout.vue](../apps/web/src/components/layout/AppLayout.vue) for page layout using:
- `goa-app-header`
- `goa-container`
- `goa-block` for spacing

## Resources

### Official Documentation
- [GoA Design System](https://design.alberta.ca/)
- [Component Storybook](https://components.design.alberta.ca/)
- [npm Package](https://www.npmjs.com/package/@abgov/web-components)

### Template Files
- Wrapper components: [apps/web/src/components/goa/](../apps/web/src/components/goa/)
- Type declarations: [apps/web/src/types/goa-components.d.ts](../apps/web/src/types/goa-components.d.ts)
- Configuration: [apps/web/vite.config.ts](../apps/web/vite.config.ts)

### Support
- Design System Team: [design@alberta.ca](mailto:design@alberta.ca)
- Component Issues: [GitHub Issues](https://github.com/GovAlta/ui-components/issues)

---

**Last Updated**: 2026-01-30
