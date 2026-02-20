/**
 * TypeScript declarations for @abgov/web-components
 * Alberta Government Design System Web Components
 *
 * These declarations allow TypeScript to recognize GoA web components
 * and provide basic type checking for their properties and events.
 */

declare module 'vue' {
  export interface GlobalComponents {
    // Buttons
    'goa-button': DefineComponent<{
      type?: 'primary' | 'secondary' | 'tertiary' | 'submit'
      variant?: 'normal' | 'destructive'
      size?: 'compact' | 'normal'
      disabled?: boolean
      leadingIcon?: string
      trailingIcon?: string
    }>

    // Form Inputs
    'goa-input': DefineComponent<{
      type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url' | 'date'
      name?: string
      value?: string | number
      placeholder?: string
      disabled?: boolean
      readonly?: boolean
      error?: boolean
      ariaLabel?: string
      ariaLabelledBy?: string
      width?: string
      maxLength?: number
      onChange?: (event: CustomEvent) => void
      onInput?: (event: CustomEvent) => void
    }>

    'goa-textarea': DefineComponent<{
      name?: string
      value?: string
      placeholder?: string
      disabled?: boolean
      readonly?: boolean
      error?: boolean
      rows?: number
      maxLength?: number
      width?: string
      onChange?: (event: CustomEvent) => void
    }>

    'goa-dropdown': DefineComponent<{
      name?: string
      value?: string
      placeholder?: string
      disabled?: boolean
      error?: boolean
      width?: string
      onChange?: (event: CustomEvent) => void
    }>

    'goa-checkbox': DefineComponent<{
      name?: string
      value?: string
      checked?: boolean
      disabled?: boolean
      error?: boolean
      text?: string
      ariaLabel?: string
      onChange?: (event: CustomEvent) => void
    }>

    'goa-radio': DefineComponent<{
      name?: string
      value?: string
      checked?: boolean
      disabled?: boolean
      error?: boolean
      ariaLabel?: string
      onChange?: (event: CustomEvent) => void
    }>

    // Layout & Container
    'goa-container': DefineComponent<{
      type?: 'non-interactive' | 'interactive'
      accent?: 'thick' | 'thin' | 'filled'
      padding?: 'relaxed' | 'compact'
    }>

    'goa-block': DefineComponent<{
      gap?: 'none' | 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl'
      direction?: 'row' | 'column'
      alignment?: 'start' | 'end' | 'center' | 'baseline'
    }>

    'goa-spacer': DefineComponent<{
      hSpacing?: 'none' | 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl'
      vSpacing?: 'none' | 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl'
    }>

    // Notifications & Feedback
    'goa-callout': DefineComponent<{
      type?: 'information' | 'important' | 'emergency' | 'success' | 'event'
      heading?: string
      size?: 'medium' | 'large'
    }>

    'goa-notification': DefineComponent<{
      type?: 'information' | 'important' | 'emergency' | 'success' | 'event'
      ariaLive?: 'polite' | 'assertive'
    }>

    'goa-badge': DefineComponent<{
      type?: 'information' | 'success' | 'warning' | 'emergency' | 'dark' | 'midtone' | 'light'
      content?: string
      icon?: boolean
    }>

    // Modal & Overlay
    'goa-modal': DefineComponent<{
      heading?: string
      open?: boolean
      closable?: boolean
      actions?: boolean
      calloutVariant?: 'information' | 'important' | 'emergency' | 'success'
      width?: string
      onClose?: () => void
    }>

    // Table
    'goa-table': DefineComponent<{
      width?: string
      variant?: 'normal' | 'relaxed'
    }>

    // Navigation
    'goa-tabs': DefineComponent<{}>
    'goa-tab': DefineComponent<{
      heading?: string
      open?: boolean
    }>

    'goa-pagination': DefineComponent<{
      itemCount?: number
      perPage?: number
      page?: number
      onChange?: (event: CustomEvent) => void
    }>

    // Cards
    'goa-card': DefineComponent<{
      width?: string
      elevation?: 'none' | '1' | '2'
    }>

    // Icons
    'goa-icon': DefineComponent<{
      type?: string
      size?: 'small' | 'medium' | 'large'
      theme?: 'outline' | 'filled'
    }>

    // Form Item
    'goa-form-item': DefineComponent<{
      label?: string
      labelSize?: 'regular' | 'large'
      helpText?: string
      error?: string
      requirement?: 'required' | 'optional'
    }>

    // Microsite Header
    'goa-microsite-header': DefineComponent<{
      type?: 'alpha' | 'beta' | 'live'
      version?: string
    }>

    // App Header
    'goa-app-header': DefineComponent<{
      url?: string
      heading?: string
      maxcontentwidth?: string
    }>

    'goa-app-header-menu': DefineComponent<{
      heading?: string
    }>

    // App Footer
    'goa-app-footer': DefineComponent<{}>

    'goa-app-footer-nav-section': DefineComponent<{
      heading?: string
      slot?: string
      maxcolumncount?: number
    }>

    'goa-app-footer-meta-section': DefineComponent<{
      slot?: string
    }>

    // Hero Banner
    'goa-hero-banner': DefineComponent<{
      heading?: string
      backgroundurl?: string
      minheight?: string
      maxcontentwidth?: string
    }>

    // Button Group
    'goa-button-group': DefineComponent<{
      alignment?: 'start' | 'center' | 'end'
      gap?: 'relaxed' | 'compact'
    }>

    // Text
    'goa-text': DefineComponent<{
      as?: 'p' | 'span' | 'div'
      size?: 'heading-xl' | 'heading-l' | 'heading-m' | 'heading-s' | 'body-l' | 'body-m' | 'body-s' | 'body-xs'
    }>

    // Grid
    'goa-grid': DefineComponent<{
      gap?: 'none' | '3xs' | '2xs' | 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl'
      minchildwidth?: string
    }>

    // Divider
    'goa-divider': DefineComponent<{
      mt?: 'none' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl'
      mb?: 'none' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl'
    }>

    // Link
    'goa-link': DefineComponent<{
      href?: string
      external?: boolean
      nounderline?: boolean
    }>

    // Details & Accordion
    'goa-details': DefineComponent<{
      heading?: string
      open?: boolean
      mt?: 'none' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl'
      mb?: 'none' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl'
    }>

    'goa-accordion': DefineComponent<{
      headingSize?: 'small' | 'medium' | 'large'
      headingContent?: string
      open?: boolean
    }>
  }
}

export {}
