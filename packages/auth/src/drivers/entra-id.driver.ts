/**
 * EntraIdAuthDriver - Microsoft Entra ID (Azure AD) authentication for internal users
 *
 * Implements OpenID Connect authentication flow using openid-client
 * Suitable for internal government employees with Microsoft 365 accounts
 */

import type { Request, Response } from 'express'
import * as oauth from 'openid-client'
import { BaseAuthDriver, type AuthUser, type AuthConfig } from './base.driver.js'
import { parseEntraIdConfig, type EntraIdConfig } from '../config/entra-id.config.js'
import { encryptToken } from '../utils/token-encryption.js'

export class EntraIdAuthDriver extends BaseAuthDriver {
  private config_?: Awaited<ReturnType<typeof oauth.discovery>>
  private entraConfig: EntraIdConfig
  private initialized: boolean = false

  constructor(config: AuthConfig) {
    super(config)
    this.entraConfig = parseEntraIdConfig()
  }

  getDriverName(): string {
    return 'entra-id'
  }

  /**
   * Initialize OpenID Connect client (lazy initialization)
   */
  private async initialize(): Promise<Awaited<ReturnType<typeof oauth.discovery>>> {
    if (this.initialized && this.config_) {
      return this.config_
    }

    try {
      const issuer = new URL(
        this.entraConfig.authority || `https://login.microsoftonline.com/${this.entraConfig.tenantId}/v2.0`
      )

      // Discover Entra ID OpenID configuration using v6 API
      this.config_ = await oauth.discovery(
        issuer,
        this.entraConfig.clientId,
        this.entraConfig.clientSecret
      )

      this.initialized = true
      return this.config_
    } catch (error) {
      console.error('Failed to initialize Entra ID client:', error)
      throw new Error('Entra ID initialization failed')
    }
  }

  /**
   * Initiate Entra ID authentication - redirect to Microsoft login
   */
  async login(req: Request, res: Response): Promise<void> {
    const config = await this.initialize()

    // Generate PKCE code verifier and challenge (recommended for security)
    const codeVerifier = oauth.randomPKCECodeVerifier()
    const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier)

    // Store code verifier in session for callback
    ;(req.session as any).codeVerifier = codeVerifier

    // Build authorization URL using v6 API
    const authorizationUrl = oauth.buildAuthorizationUrl(config, {
      redirect_uri: this.entraConfig.callbackUrl,
      scope: this.entraConfig.scope,
      response_mode: this.entraConfig.responseMode,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    res.redirect(authorizationUrl.toString())
  }

  /**
   * Handle Entra ID callback - exchange code for tokens
   */
  async callback(req: Request, _res: Response): Promise<AuthUser> {
    const config = await this.initialize()

    // Get code verifier from session
    const codeVerifier = (req.session as any)?.codeVerifier
    if (!codeVerifier) {
      throw new Error('Code verifier not found in session')
    }

    // Clear code verifier from session
    delete (req.session as any).codeVerifier

    // Build the current URL that includes the authorization response
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'
    const currentUrl = new URL(req.originalUrl || req.url, `${protocol}://${req.headers.host}`)

    // Exchange authorization code for tokens using v6 API
    const tokenSet = await oauth.authorizationCodeGrant(
      config,
      currentUrl,
      {
        pkceCodeVerifier: codeVerifier
      }
    )

    // Get user info from ID token claims
    // In v6, the tokenSet response includes a claims() method
    const claims = (tokenSet as any).claims()

    // Map claims to AuthUser
    const authUser = this.mapClaimsToUser(claims, tokenSet)

    // Save to session (async due to session regeneration)
    await this.saveUserToSession(req, authUser)

    return authUser
  }

  /**
   * Perform Entra ID logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    const user = this.getUser(req)

    // Clear local session
    this.clearUserFromSession(req)

    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
          return
        }

        res.clearCookie('connect.sid')

        // If Entra ID logout URL is configured, redirect to Microsoft logout
        if (this.entraConfig.logoutUrl && user) {
          const logoutUrl = new URL(this.entraConfig.logoutUrl)

          // Add post-logout redirect URI if configured
          if (this.entraConfig.postLogoutRedirectUri) {
            logoutUrl.searchParams.set('post_logout_redirect_uri', this.entraConfig.postLogoutRedirectUri)
          }

          res.redirect(logoutUrl.toString())
        }

        resolve()
      })
    })
  }

  /**
   * Map OIDC claims to AuthUser
   */
  private mapClaimsToUser(claims: any, tokenSet: Awaited<ReturnType<typeof oauth.authorizationCodeGrant>>): AuthUser {
    // Standard OIDC claims
    const id = claims.sub || claims.oid || claims.objectId || ''
    const email = claims.email || claims.preferred_username || claims.upn || ''
    const name = claims.name || email
    const firstName = claims.given_name || ''
    const lastName = claims.family_name || ''

    // Extract roles from claims
    let roles: string[] = []

    // Try different role claim formats
    if (claims.roles) {
      roles = Array.isArray(claims.roles) ? claims.roles : [claims.roles]
    } else if (claims.role) {
      roles = Array.isArray(claims.role) ? claims.role : [claims.role]
    } else if (claims.groups) {
      // Group IDs can be mapped to roles in your application
      roles = Array.isArray(claims.groups) ? claims.groups : [claims.groups]
    }

    // Add default role if no roles found and configured
    if (roles.length === 0 && this.entraConfig.defaultRole) {
      roles = [this.entraConfig.defaultRole]
    }

    return {
      id,
      email,
      name,
      roles: roles.filter(Boolean),
      // REQ-P1-02: Explicit attribute whitelist (no ...claims spread)
      // REQ-P2-03: Encrypt tokens if TOKEN_ENCRYPTION_KEY is set
      // Use null (not undefined) for missing values — AuthUserSchema z.record rejects undefined
      attributes: Object.fromEntries(
        Object.entries({
          firstName,
          lastName,
          tenantId: claims.tid ?? null,
          objectId: claims.oid ?? null,
          upn: claims.upn ?? null,
          idp: claims.idp ?? null,
          // Store tokens (optional — for downstream API calls)
          accessToken: tokenSet.access_token ? this.maybeEncryptToken(tokenSet.access_token) : null,
          refreshToken: tokenSet.refresh_token ? this.maybeEncryptToken(tokenSet.refresh_token) : null,
          idToken: tokenSet.id_token ? this.maybeEncryptToken(tokenSet.id_token) : null,
          expiresAt: tokenSet.expires_at ?? null,
          tokensEncrypted: !!process.env.TOKEN_ENCRYPTION_KEY,
        }).filter(([_, v]) => v !== undefined)
      )
    }
  }

  /**
   * REQ-P2-03: Encrypt token if TOKEN_ENCRYPTION_KEY is set, otherwise return plaintext.
   */
  private maybeEncryptToken(token: string): string {
    const key = process.env.TOKEN_ENCRYPTION_KEY
    if (!key) return token
    return encryptToken(token, key)
  }
}
