# Placeholder Pattern Reference

## Overview

This template uses a **consistent placeholder pattern** to indicate values that must be replaced with actual configuration. This helps avoid false positives from GitHub secret detection while making it clear what needs to be customized.

## Pattern

All placeholders follow this format:

```
{{VARIABLE_NAME}}
```

**Example**:
```bash
# Before (placeholder)
ENTRA_CLIENT_ID={{YOUR_AZURE_CLIENT_ID}}

# After (actual value)
ENTRA_CLIENT_ID=abc123-def456-ghi789
```

## Common Placeholders

### Database Configuration

| Placeholder | Description | Example Value |
|-------------|-------------|---------------|
| `{{DATABASE_CONNECTION_STRING}}` | Full PostgreSQL connection string | `postgresql://username@hostname:5432/dbname?sslmode=require` |
| `{{DB_USER}}` | Database username | `myappuser` |
| `{{DB_PASSWORD}}` | Database password | (use a password manager) |

### Authentication - Azure (Entra ID)

| Placeholder | Description | Where to Find |
|-------------|-------------|---------------|
| `{{YOUR_AZURE_TENANT_ID}}` | Azure AD Tenant ID | Azure Portal → Azure Active Directory → Overview |
| `{{YOUR_AZURE_CLIENT_ID}}` | Application (client) ID | Azure Portal → App registrations → Your app → Overview |
| `{{YOUR_AZURE_CLIENT_SECRET}}` | Client secret value | Azure Portal → App registrations → Your app → Certificates & secrets |

### Service-to-Service Authentication (Azure AD Client Credentials)

| Placeholder | Description | Where to Find |
|-------------|-------------|---------------|
| `{{PUBLIC_APP_CLIENT_ID}}` | Client ID of the public-facing app | Azure Portal → App registrations → Public app → Overview |
| `{{SERVICE_AUTH_AUDIENCE}}` | Expected audience (api:// URI) | Defaults to `api://{{YOUR_AZURE_CLIENT_ID}}` |

### Security & Secrets

| Placeholder | Description | How to Generate |
|-------------|-------------|-----------------|
| (generate session secret) | Session secret (32+ characters) | `openssl rand -base64 32` |
| `{{YOUR_SECURE_PASSWORD}}` | Generic secure password | Use password manager |
| `{{YOUR_DATABASE_PASSWORD}}` | Database user password | Azure-generated or custom |

### Azure Resources

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{YOUR_APPINSIGHTS_INSTRUMENTATION_KEY}}` | Application Insights key | `abcd1234-ef56-7890-gh12-ijklmnop3456` |

## Files Using Placeholders

### Environment Configuration

- [.env.example](.env.example) - Development with mock auth
- [.env.internal.example](.env.internal.example) - Internal (Entra ID)

### Documentation

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment examples
- [docs/AUTH-SETUP.md](docs/AUTH-SETUP.md) - Authentication setup
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - Development guide

## Usage Instructions

### 1. Identify Placeholders

Look for values wrapped in `{{...}}`:

```bash
# .env.internal.example
ENTRA_TENANT_ID = {{YOUR_AZURE_TENANT_ID}}
ENTRA_CLIENT_ID = {{YOUR_AZURE_CLIENT_ID}}
ENTRA_CLIENT_SECRET =   # from Azure Portal
```

### 2. Replace with Actual Values

Remove the `{{` and `}}` brackets and insert your real values:

```bash
# .env (your actual config)
ENTRA_TENANT_ID=abc123-def456-ghi789-012345
ENTRA_CLIENT_ID=xyz789-uvw456-rst123-456789
ENTRA_CLIENT_SECRET=   # from Azure Portal
```

### 3. Verify No Placeholders Remain

Before deploying, ensure no `{{...}}` patterns remain:

```bash
# Search for unreplaced placeholders
grep -r "{{" .env

# Should return nothing if all placeholders are replaced
```

## Why This Pattern?

### Problem

GitHub's secret detection can flag example values as potential secrets:

- `your-client-secret-here` ❌ Flagged as potential secret
- `<CLIENT_SECRET>` ❌ Flagged as potential secret
- `CHANGE_THIS` ❌ Flagged as potential secret

### Solution

Using `{{VARIABLE_NAME}}` avoids false positives:

- `{{YOUR_AZURE_CLIENT_SECRET}}` ✅ Recognized as placeholder
- Clear indication that value must be replaced
- Consistent pattern across all files
- Easy to search and validate

## Best Practices

### For Template Users

1. **Never commit actual secrets** - Only use placeholders in example files
2. **Use .gitignore** - Ensure `.env` is ignored (not `.env.example`)
3. **Search before deploy** - Run `grep "{{" .env` to find unreplaced placeholders
4. **Use secret managers** - Store production secrets in Azure Key Vault, not files

### For Template Maintainers

1. **Always use `{{VARIABLE_NAME}}` format** - Never use `<VAR>`, `$VAR`, or descriptive text
2. **Document all placeholders** - Add to this file when introducing new ones
3. **Include examples** - Show format in comments above placeholder
4. **Test detection** - Verify GitHub doesn't flag placeholders as secrets

## Examples

### Good Examples ✅

```bash
# Clear placeholder with descriptive name
SESSION_SECRET =   # openssl rand -base64 32

# With example showing format
# With generation instructions
# Generate with: openssl rand -base64 32
SESSION_SECRET =   # openssl rand -base64 32
```

### Bad Examples ❌

```bash
# These patterns will be flagged by GitHub secret scanning:
# SECRET_KEY with any value assigned after the equals sign
# PASSWORD with any value assigned after the equals sign
# API_KEY with any value assigned after the equals sign

# Not clear enough
TENANT_ID=xxx
SECRET=
```

## Troubleshooting

### GitHub Still Flags My Commit

**Cause**: Old placeholder pattern or actual secret accidentally committed

**Solution**:
1. Revert the commit
2. Replace with `{{PLACEHOLDER}}` pattern
3. If actual secret was committed, rotate it immediately
4. Add to `.gitignore` if needed

### Can't Find What to Replace

**Cause**: Placeholder name not clear enough

**Solution**:
1. Check this document for placeholder definitions
2. Check inline comments in the file
3. Refer to related documentation (AUTH-SETUP.md, DEPLOYMENT.md)

### Forgot to Replace Placeholder

**Cause**: Deployed with `{{...}}` still in config

**Solution**:
1. Application will likely fail to start (good!)
2. Error message will indicate which variable
3. Replace and redeploy

## Related Documentation

- [AUTH-SETUP.md](docs/AUTH-SETUP.md) - Detailed authentication configuration
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment-specific configuration

---

**Last Updated**: 2026-01-30
