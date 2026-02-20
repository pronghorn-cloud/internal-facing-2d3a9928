/**
 * Microsoft Entra ID (Azure AD) Configuration Schema
 *
 * Validates Entra ID authentication configuration using Zod
 */

import { z } from 'zod'

export const entraIdConfigSchema = z.object({
  // Required Entra ID settings
  callbackUrl: z.string().url(),
  tenantId: z.string().describe('Azure AD tenant ID (GUID)'),
  clientId: z.string().describe('Application (client) ID'),
  clientSecret: z.string().describe('Application client secret'),

  // Optional Entra ID settings
  authority: z.string().url().optional().describe('Authorization endpoint (auto-generated if not provided)'),
  scope: z.string().default('openid profile email').describe('OAuth scopes'),
  responseType: z.string().default('code').describe('OAuth response type'),
  responseMode: z.enum(['query', 'form_post']).default('query'),

  // Token validation
  validateIssuer: z.boolean().default(true),
  validateAudience: z.boolean().default(true),
  clockTolerance: z.number().default(300).describe('Clock skew tolerance in seconds'),

  // Logout settings
  logoutUrl: z.string().url().optional(),
  postLogoutRedirectUri: z.string().url().optional(),

  // User profile settings
  allowMultipleRoles: z.boolean().default(true),
  defaultRole: z.string().default('user')
})

export type EntraIdConfig = z.infer<typeof entraIdConfigSchema>

/**
 * Parse and validate Entra ID configuration from environment variables
 */
export function parseEntraIdConfig(): EntraIdConfig {
  const tenantId = process.env.ENTRA_TENANT_ID
  const config = {
    callbackUrl: process.env.ENTRA_CALLBACK_URL || process.env.AUTH_CALLBACK_URL,
    tenantId,
    clientId: process.env.ENTRA_CLIENT_ID,
    clientSecret: process.env.ENTRA_CLIENT_SECRET,
    authority: process.env.ENTRA_AUTHORITY || (tenantId ? `https://login.microsoftonline.com/${tenantId}` : undefined),
    scope: process.env.ENTRA_SCOPE || 'openid profile email',
    responseType: process.env.ENTRA_RESPONSE_TYPE || 'code',
    responseMode: (process.env.ENTRA_RESPONSE_MODE as 'query' | 'form_post') || 'query',
    validateIssuer: process.env.ENTRA_VALIDATE_ISSUER !== 'false',
    validateAudience: process.env.ENTRA_VALIDATE_AUDIENCE !== 'false',
    clockTolerance: process.env.ENTRA_CLOCK_TOLERANCE ? parseInt(process.env.ENTRA_CLOCK_TOLERANCE) : 300,
    logoutUrl: process.env.ENTRA_LOGOUT_URL,
    postLogoutRedirectUri: process.env.ENTRA_POST_LOGOUT_REDIRECT_URI,
    allowMultipleRoles: process.env.ENTRA_ALLOW_MULTIPLE_ROLES !== 'false',
    defaultRole: process.env.ENTRA_DEFAULT_ROLE || 'user'
  }

  return entraIdConfigSchema.parse(config)
}
