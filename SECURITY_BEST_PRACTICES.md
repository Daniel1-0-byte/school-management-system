# Security Best Practices

## API Key Management

### ⚠️ CRITICAL: API Keys Should Never Be Committed

This project had exposed API keys in git history. Here's how to prevent this:

### What Happened
- Old Resend API key was committed to `.env.development.local`
- Git history retained the key even after deletion
- Key was exposed on GitHub and had to be rotated

### Solution Implemented
1. **Removed all API keys** from tracked files
2. **Updated `.gitignore`** to exclude `.env*.local`
3. **Created `.env.example`** with placeholders instead of real values
4. **All production secrets** managed exclusively via Vercel environment variables

### How to Manage Secrets Correctly

#### For Local Development
1. Create `.env.local` (automatically ignored by git):
   ```bash
   RESEND_API_KEY=re_your_actual_key_here
   ```

2. Never add real keys to `.env.development.local` or any tracked file

3. Always add sensitive files to `.gitignore`:
   ```
   .env*.local
   .secrets
   *.key
   ```

#### For Production (Vercel)
1. Use Vercel Dashboard → Settings → Environment Variables
2. Add sensitive variables only there
3. Never use `.env` files in production
4. Vercel automatically makes `NEXT_PUBLIC_*` variables available to the browser (public) and others remain server-side (private)

### Current Implementation

**Environment Variables Used:**
- `RESEND_API_KEY` - Server-side only, loaded via `process.env.RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side only
- `RECAPTCHA_SECRET_KEY` - Server-side only
- `NEXT_PUBLIC_SUPABASE_URL` - Public, safe for browser
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - Public, safe for browser
- `NEXT_PUBLIC_APP_URL` - Public, safe for browser

### Verified: No Hardcoded Secrets

The following have been verified:
- ✅ No hardcoded API keys in source code
- ✅ No credentials in email sending functions
- ✅ All API keys loaded from environment variables
- ✅ Bearer tokens dynamically generated from cookies
- ✅ `.env*.local` files are git-ignored
- ✅ `.env.example` contains only placeholders

### Email Service (Resend)

**Correct Implementation:**
```typescript
// lib/email.ts
function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY; // ✅ Loaded from env
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(apiKey);
}
```

**Incorrect (Do Not Use):**
```typescript
// ❌ WRONG - Never do this
const resend = new Resend('re_actualKeyHere');
```

### If an API Key is Exposed

1. **Immediately rotate** the key in the service provider (Resend, Supabase, etc.)
2. **Update** Vercel environment variables with the new key
3. **Verify** no other services are using the old key
4. **Document** the incident in your security log
5. **Review** git history to ensure it's removed (consider git filter-branch if needed)

### Git Security

If a secret was accidentally committed:

```bash
# View history with the secret
git log -p --all -- .env.development.local | grep re_

# Remove from git history (destructive - use with caution)
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env.development.local' --prune-empty --tag-name-filter cat -- --all
```

## Summary

All API keys are now properly managed through Vercel environment variables. The codebase loads all secrets from `process.env.*` at runtime, ensuring they never appear in source code or git history.
