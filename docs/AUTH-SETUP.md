# Authentication Setup Guide

This document provides detailed instructions for configuring authentication in the Alberta Government Internal-Facing Enterprise Template. The template supports two authentication drivers for staff login plus service-to-service authentication for public-facing applications:

1. **Mock Driver** - For local development (no real Identity Provider needed)
2. **MS Entra ID (Azure AD)** - For internal government employee applications
3. **Service-to-Service Auth** - Azure AD Client Credentials for public-facing apps accessing internal APIs

## Table of Contents

- [Quick Start (Development)](#quick-start-development)
- [MS Entra ID Setup (Internal)](#ms-entra-id-setup-internal)
- [Service-to-Service Auth Setup](#service-to-service-auth-setup)
- [Configuration Reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

---

## Quick Start (Development)

For local development, use the mock authentication driver. No external Identity Provider is required.

### 1. Copy Environment File

```bash
cp .env.example .env
```

### 2. Configure Mock Driver

Edit `.env`:

```bash
AUTH_DRIVER=mock
AUTH_CALLBACK_URL=http://localhost:3000/api/v1/auth/callback
WEB_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

### 3. Start Application

```bash
npm install
docker-compose up -d postgres
npm run migrate
npm run dev
```

### 4. Test Authentication

1. Navigate to http://localhost:5173
2. Click "Sign In"
3. Choose from 3 mock users:
   - User 0: Developer (admin + developer roles)
   - User 1: Administrator (admin role)
   - User 2: Standard User (user role)

The mock driver simulates a complete authentication flow without requiring an external Identity Provider.

---

## MS Entra ID Setup (Internal)

Use Microsoft Entra ID (formerly Azure AD) for internal government applications where users authenticate with their Microsoft 365 accounts.

### Prerequisites

- Azure subscription with Azure Active Directory
- Administrator access to Azure AD tenant
- App registration permissions

### Step 1: Create Azure AD App Registration

1. Sign in to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure the application:
   - **Name**: `Alberta Gov App - Internal` (or your app name)
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Select "Web" and enter `https://your-app.alberta.ca/api/v1/auth/callback`
5. Click **Register**

### Step 2: Note Application Details

After registration, note the following from the **Overview** page:

- **Application (client) ID**: `abc12345-...`
- **Directory (tenant) ID**: `xyz98765-...`

### Step 3: Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description: `Production Secret`
4. Choose expiration period (recommend: 24 months)
5. Click **Add**
6. **IMPORTANT**: Copy the secret **Value** immediately (it won't be shown again)
7. Store securely (Azure Key Vault recommended for production)

### Step 4: Configure API Permissions

1. Navigate to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add the following permissions:
   - `User.Read` (sign in and read user profile)
   - `email`
   - `openid`
   - `profile`
6. Click **Add permissions**
7. **(Optional)** Click **Grant admin consent** if required by your organization

### Step 5: Configure Authentication Settings

1. Navigate to **Authentication**
2. Under **Implicit grant and hybrid flows**, ensure both are **unchecked** (we use authorization code flow)
3. Under **Advanced settings**:
   - **Allow public client flows**: No
   - **Enable the following mobile and desktop flows**: No
4. Click **Save**

### Step 6: Configure Application Environment

Copy `.env.internal.example` to `.env`:

```bash
cp .env.internal.example .env
```

Edit `.env` with your Azure AD details:

```bash
NODE_ENV=production
AUTH_DRIVER=entra-id

# From Azure AD App Registration
ENTRA_TENANT_ID={{YOUR_AZURE_TENANT_ID}}
ENTRA_CLIENT_ID={{YOUR_AZURE_CLIENT_ID}}
ENTRA_CLIENT_SECRET=   # from Azure Portal > Certificates & secrets

# Your application URLs
AUTH_CALLBACK_URL=https://your-app.alberta.ca/api/v1/auth/callback
WEB_URL=https://your-app.alberta.ca
CORS_ORIGIN=https://your-app.alberta.ca

# Optional: Logout configuration
ENTRA_LOGOUT_URL=https://login.microsoftonline.com/{{YOUR_AZURE_TENANT_ID}}/oauth2/v2.0/logout
ENTRA_POST_LOGOUT_REDIRECT_URI=https://your-app.alberta.ca

# Database and session secrets
DB_CONNECTION_STRING=your-database-connection-string
SESSION_SECRET=   # openssl rand -base64 32
```

### Step 7: Test Authentication

1. Deploy your application
2. Navigate to your application URL
3. Click "Sign In"
4. You should be redirected to Microsoft login
5. After authentication, verify you're redirected back to your app

### Entra ID Role Mapping

The template maps Azure AD roles to application roles. To assign roles:

1. In Azure Portal, go to **Enterprise Applications**
2. Find your application
3. Navigate to **Users and groups**
4. Assign users and specify app roles

Roles are available in the ID token via the `roles` claim.

---

## Service-to-Service Auth Setup

Use Azure AD Client Credentials for public-facing applications that need to call this internal template's API endpoints. The public-facing app authenticates with its own `client_id` + `client_secret`, receives a Bearer token from Azure AD, and sends it to `/api/v1/public/*` endpoints.

### Prerequisites

- Azure subscription with Azure Active Directory
- An existing Azure AD App Registration for the **internal** app (from the Entra ID setup above)
- A separate Azure AD App Registration for the **public-facing** app

### Step 1: Expose an API on the Internal App

1. In Azure Portal, go to your **internal** app registration
2. Navigate to **Expose an API**
3. Click **Set** next to "Application ID URI" (defaults to `api://{client-id}`)
4. Add a scope (optional) or use the default `/.default`
5. Note the **Application ID URI** — this is the `SERVICE_AUTH_AUDIENCE`

### Step 2: Create the Public-Facing App Registration

1. Navigate to **Azure Active Directory** > **App registrations**
2. Click **New registration**
3. Configure:
   - **Name**: `Alberta Gov App - Public Facing`
   - **Supported account types**: Accounts in this organizational directory only
4. Click **Register**
5. Note the **Application (client) ID** — this is the allowed client ID

### Step 3: Create a Client Secret for the Public App

1. In the public app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and expiration
4. Copy the secret **Value** immediately

### Step 4: Grant API Permission

1. In the **public** app registration, go to **API permissions**
2. Click **Add a permission** > **My APIs**
3. Select your **internal** app
4. Choose **Application permissions** (not delegated)
5. Select the permissions/scopes you exposed
6. Click **Grant admin consent**

### Step 5: Configure Internal App Environment

Add these variables to the internal app's `.env`:

```bash
# Service-to-Service Authentication
SERVICE_AUTH_ENABLED=true
SERVICE_AUTH_TENANT_ID={{YOUR_AZURE_TENANT_ID}}       # defaults to ENTRA_TENANT_ID
SERVICE_AUTH_AUDIENCE=api://{{YOUR_AZURE_CLIENT_ID}}   # defaults to api://{ENTRA_CLIENT_ID}
SERVICE_AUTH_ALLOWED_CLIENT_IDS={{PUBLIC_APP_CLIENT_ID}}  # comma-separated if multiple

# Rate limit for service endpoints (separate from staff endpoints)
SERVICE_RATE_LIMIT_MAX=500

# CORS must include the public-facing app's origin
CORS_ORIGIN=https://internal.app.alberta.ca,https://public.app.alberta.ca
```

### Step 6: Test Service Authentication

From the public-facing app (or using curl):

**Request a token** from Azure AD (OAuth 2.0 Client Credentials):

```
POST https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded
```

| Form Parameter | Value |
|---------------|-------|
| `grant_type` | `client_credentials` |
| `client_id` | Your public-facing app's Azure AD client ID |
| `client_secret` | Your public-facing app's Azure AD client secret |
| `scope` | `api://<INTERNAL_APP_CLIENT_ID>/.default` |

**Call the internal API** with the returned access token:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  https://internal.app.alberta.ca/api/v1/public/health

# Expected response:
# { "success": true, "data": { "status": "healthy", "timestamp": "..." } }
```

### Adding Public API Endpoints

Add business endpoints in `apps/api/src/routes/public.routes.ts`:

```typescript
// All routes are already protected by requireServiceAuth middleware
router.get('/users', (req, res) => {
  const client = (req as any).serviceClient
  // client.clientId, client.tenantId, client.roles available
  res.json({ success: true, data: { users: [] } })
})
```

---

## Configuration Reference

### Common Environment Variables

All authentication drivers use these base variables:

```bash
# Required
AUTH_DRIVER=mock|entra-id
AUTH_CALLBACK_URL=https://your-app.alberta.ca/api/v1/auth/callback
WEB_URL=https://your-app.alberta.ca
CORS_ORIGIN=https://your-app.alberta.ca

# Session Management
SESSION_SECRET=   # openssl rand -base64 32
SESSION_STORE=postgres
DB_CONNECTION_STRING=   # postgresql://username@host:port/database

# Security
RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_MAX=10
```

### Mock Driver Variables

```bash
AUTH_DRIVER=mock
# No additional configuration required
```

### Entra ID Driver Variables

```bash
AUTH_DRIVER=entra-id
ENTRA_TENANT_ID={{YOUR_AZURE_TENANT_ID}}
ENTRA_CLIENT_ID={{YOUR_AZURE_CLIENT_ID}}
ENTRA_CLIENT_SECRET=   # from Azure Portal > Certificates & secrets

# Optional
ENTRA_AUTHORITY=https://login.microsoftonline.com/{tenant}/v2.0
ENTRA_SCOPE=openid profile email
ENTRA_RESPONSE_TYPE=code
ENTRA_RESPONSE_MODE=query
ENTRA_DEFAULT_ROLE=employee
ENTRA_LOGOUT_URL=https://login.microsoftonline.com/{tenant}/oauth2/v2.0/logout
ENTRA_POST_LOGOUT_REDIRECT_URI=https://your-app.alberta.ca
```

### Service Auth Variables (for public-facing app access)

```bash
SERVICE_AUTH_ENABLED=true
SERVICE_AUTH_TENANT_ID={{YOUR_AZURE_TENANT_ID}}       # defaults to ENTRA_TENANT_ID
SERVICE_AUTH_AUDIENCE=api://{{YOUR_AZURE_CLIENT_ID}}   # defaults to api://{ENTRA_CLIENT_ID}
SERVICE_AUTH_ALLOWED_CLIENT_IDS={{PUBLIC_APP_CLIENT_ID}}
SERVICE_RATE_LIMIT_MAX=500
```

---

## Troubleshooting

### Entra ID Issues

**Problem**: "AADSTS50011: The redirect URI specified in the request does not match the redirect URIs configured for the application"

**Solution**: Ensure `AUTH_CALLBACK_URL` in `.env` exactly matches the Redirect URI in Azure AD App Registration (including https vs http, trailing slash, etc.)

---

**Problem**: "AADSTS700016: Application with identifier was not found in the directory"

**Solution**: Verify `ENTRA_CLIENT_ID` and `ENTRA_TENANT_ID` are correct. Check you're signing in with the correct Azure AD tenant.

---

**Problem**: User authenticated but has no roles

**Solution**:
1. Check if roles are configured in Azure AD Enterprise Application
2. Ensure users are assigned roles in "Users and groups"
3. Set `ENTRA_DEFAULT_ROLE` for a fallback role

---

### Service Auth Issues

**Problem**: "SERVICE_AUTH_NOT_CONFIGURED" error on `/api/v1/public/*`

**Solution**:
1. Ensure `SERVICE_AUTH_ENABLED=true` in `.env`
2. Verify `SERVICE_AUTH_ALLOWED_CLIENT_IDS` contains the public app's client ID
3. Check that `ENTRA_TENANT_ID` or `SERVICE_AUTH_TENANT_ID` is set

---

**Problem**: "Invalid service token" or 401 on public endpoints

**Solution**:
1. Verify the Bearer token is from the correct Azure AD tenant
2. Check the token audience matches `SERVICE_AUTH_AUDIENCE` (defaults to `api://{ENTRA_CLIENT_ID}`)
3. Ensure the public app's client ID is in `SERVICE_AUTH_ALLOWED_CLIENT_IDS`
4. Verify admin consent was granted for the API permissions

---

### General Issues

**Problem**: "Session not found" or "User not authenticated" after login

**Solution**:
1. Check `SESSION_SECRET` is set and consistent across app restarts
2. Verify PostgreSQL session table exists (`npm run migrate`)
3. Ensure `CORS_ORIGIN` matches `WEB_URL`
4. Check browser allows cookies (not in incognito/private mode)
5. Verify cookie settings in [app.ts](../apps/api/src/app.ts):
   - `secure: true` requires HTTPS
   - `sameSite: 'lax'` should work for most scenarios

---

**Problem**: "Invalid redirect" or CORS errors

**Solution**:
1. Ensure `WEB_URL` and `CORS_ORIGIN` match exactly
2. Check `AUTH_CALLBACK_URL` uses the correct protocol (https in production)
3. Verify API and web app are on same domain (or CORS is properly configured)

---

## Security Best Practices

### 1. Secrets Management

**Development**:
- Use `.env` file (excluded from git via `.gitignore`)
- Never commit real secrets to version control

**Production**:
- Use Azure Key Vault or similar secret management service
- Inject secrets as environment variables at runtime
- Rotate secrets regularly (client secrets, session secrets)

### 2. Session Security

```bash
# Generate strong session secret
openssl rand -base64 32

# Session configuration (in production)
SESSION_SECRET=<strong-random-string>
NODE_ENV=production  # Enables secure cookies (HTTPS only)
```

### 3. HTTPS Requirements

- **Always use HTTPS in production**
- `secure: true` cookie flag requires HTTPS
- Many Identity Providers require HTTPS callback URLs

### 4. Rate Limiting

Protect authentication endpoints from brute force attacks:

```bash
RATE_LIMIT_MAX=1000        # General API rate limit
AUTH_RATE_LIMIT_MAX=10     # Stricter for auth endpoints
```

### 5. Audit Logging

Enable comprehensive logging for security monitoring:

```bash
LOG_LEVEL=info
LOG_FORMAT=combined
```

Monitor logs for:
- Failed authentication attempts
- Unusual access patterns
- Session anomalies
- Configuration errors

### 6. Multi-Factor Authentication (MFA)

**Entra ID**: Enable MFA in Azure AD Conditional Access policies

### 7. Principle of Least Privilege

- Assign minimum necessary roles to users
- Use role-based access control (RBAC)
- Regularly review user permissions

### 8. Security Headers

The template includes Helmet.js for security headers. Verify in production:

```typescript
// apps/api/src/app.ts
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
}))
```

### 9. Regular Updates

- Keep dependencies updated (`npm audit`)
- Monitor security advisories
- Test updates in staging before production

---

## Additional Resources

### Microsoft Entra ID
- [Azure AD Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- [App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [OpenID Connect on Azure AD](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc)

### Azure AD Client Credentials
- [OAuth 2.0 Client Credentials Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Expose an API in Azure AD](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-expose-web-apis)

### Government of Alberta
- [Digital Service Standard](https://www.alberta.ca/digital-service-standard)
- [Security and Privacy Guidelines](https://www.alberta.ca/security-and-privacy)

---

## Support

For issues or questions:

1. Check this documentation
2. Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Check application logs
4. Contact your Identity Provider administrator
5. Consult your organization's IT security team

---

**Last Updated**: 2025-01-29
**Template Version**: 1.0.0
