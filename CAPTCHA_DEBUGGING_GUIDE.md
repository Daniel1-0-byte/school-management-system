# CAPTCHA Debugging Guide

## Overview

The Platform Admin login now includes comprehensive Google reCAPTCHA debugging instrumentation. This guide explains how to diagnose CAPTCHA verification failures.

## Enabling Debug Mode

Debug logging activates automatically in development, or you can enable it in production:

### Frontend (Browser Console)

```javascript
// Enable in browser console to see frontend CAPTCHA logs
localStorage.setItem('AUTH_DEBUG', 'true');
// Refresh page and try login
```

### Backend (Server Logs)

Set environment variable:

```bash
# In .env.local or Vercel environment
AUTH_DEBUG=true
```

## 10-Point Debugging Checklist

### TASK 1: Full CAPTCHA Response Logging

**Location:** Server logs after Google responds

**What to look for:**

```
[CAPTCHA DEBUG] Full Google Response | {
  "success": false,
  "score": 0.95,
  "action": "login",
  "hostname": "your-domain.com",
  "challenge_ts": "2024-01-20T10:30:45Z",
  "error-codes": ["invalid-input-secret"]
}
```

If `success: false`, check `error-codes` array for exact cause.

### TASK 2: Token Received from Frontend

**Location:** Server logs at start of CAPTCHA verification

**What to look for:**

```
[CAPTCHA DEBUG] Token received from frontend | {
  "exists": true,
  "length": 1643,
  "first20": "xxxxxxxxxxxxxxxxxxxx",
  "last20": "xxxxxxxxxxxxxxxxxxxx"
}
```

**What each means:**

- `exists: false` → Frontend didn't call `grecaptcha.execute()` or it failed silently
- `length: 0` → Token is empty (race condition)
- `length < 500` → Token is unusually short (malformed)
- Consistent truncation → Token was cut off in transit

### TASK 3: Request Sent to Google

**Location:** Server logs before fetch to Google

**What to look for:**

```
[CAPTCHA DEBUG] Request prepared for Google | {
  "secretExists": true,
  "secretLength": 40,
  "tokenLength": 1643
}
```

**Problems to detect:**

- `secretExists: false` → Environment variable `RECAPTCHA_SECRET_KEY` not set
- `secretLength !== 40` → Secret key is malformed
- `tokenLength` much shorter than expected → Token generation issue

### TASK 4: Frontend Token Generation

**Location:** Browser console (dev tools)

**What to look for:**

```javascript
[reCAPTCHA FRONTEND] Starting grecaptcha.execute | {
  "siteKeyExists": true,
  "siteKeyLength": 40,
  "action": "login"
}

[reCAPTCHA FRONTEND] Token received | {
  "exists": true,
  "length": 1643,
  "first20": "xxxx...",
  "last20": "...xxxx"
}
```

**If missing:**

1. reCAPTCHA script didn't load
2. `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` not set
3. Login form submission failed

### TASK 5: Action Verification

**Location:** Server logs if action doesn't match

**What to look for:**

```
[CAPTCHA DEBUG] Action mismatch | {
  "expectedAction": "login",
  "actualAction": "wrong-action"
}
```

**Why it matters:**

Google expects the server to verify the action matches. If they don't match, it indicates:

1. Frontend is using wrong action name
2. Different form is submitting the token
3. Token is being reused from different context

### TASK 6: Hostname Verification

**Location:** Server logs for debugging (info only, doesn't fail)

**What to look for:**

```
[CAPTCHA DEBUG] Hostname mismatch (warning only) | {
  "expected": "admin.schoolhub.com",
  "actual": "192.168.1.1"
}
```

**Why it's a warning:**

- Local development may show different hostnames
- Reverse proxies may report different hostnames
- This is informational, not a failure condition

### TASK 7: Environment Variable Startup Verification

**Location:** Server logs at application startup

**What to look for:**

```
[CAPTCHA CONFIG] Startup verification | {
  "siteKeyExists": true,
  "siteKeyLength": 40,
  "secretKeyExists": true,
  "secretKeyLength": 40,
  "scoreThreshold": 0.5
}
```

**If keys missing:**

1. `.env.local` doesn't have RECAPTCHA variables
2. Vercel environment variables not configured
3. Check Console in Vercel dashboard → Settings → Environment Variables

### TASK 8: Google Error Codes

**Location:** Server logs when `success: false`

**Common error codes and solutions:**

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| `invalid-input-secret` | Secret key is wrong or expired | Verify `RECAPTCHA_SECRET_KEY` in `.env.local` |
| `invalid-input-response` | Token is malformed or expired | Frontend should regenerate token |
| `missing-input-response` | No token submitted to Google | Check Task 2 logging |
| `missing-input-secret` | Secret key not provided to Google | Check env var configuration |
| `timeout-or-duplicate` | Token already used or took too long | Don't reuse tokens; they expire quickly |
| `bad-request` | Malformed request to Google | Check request format in code |

### TASK 9: Password Verification Debugging

**Location:** Server logs during STEP 5

**What to look for:**

```
[ADMIN LOGIN] INFO | Starting password verification | {
  "adminId": "uuid-here",
  "hashLength": 96
}

[ADMIN LOGIN] INFO | Password verification complete | {
  "adminId": "uuid-here",
  "matches": true
}
```

**These logs confirm:**

1. Admin was found (before password check)
2. Hash is correct length (96 for PBKDF2-SHA512)
3. Password verification completed successfully

**If `matches: false`:**

1. Typed password is wrong
2. Hash is corrupted in database
3. Hashing algorithm changed

### TASK 10: Production Safety

**Debug logs are automatically disabled in production** unless `AUTH_DEBUG=true`.

**To enable in production:**

1. Vercel Dashboard → Settings → Environment Variables
2. Add: `AUTH_DEBUG` = `true`
3. Redeploy or use "Redeploy" button (env vars take effect immediately)
4. After debugging: remove the variable and redeploy

## Complete Debug Flow

Here's what a successful login flow looks like in logs:

### Frontend Logs (Browser Console)
```
[reCAPTCHA FRONTEND] Starting grecaptcha.execute
[reCAPTCHA FRONTEND] Token received { exists: true, length: 1643, ... }
```

### Server Logs (Vercel)
```
[CAPTCHA CONFIG] Startup verification { siteKeyExists: true, ... }

[ADMIN LOGIN] Request received { ip: "1.2.3.4" }
[ADMIN LOGIN] Starting CAPTCHA verification

[CAPTCHA DEBUG] Token received from frontend { exists: true, length: 1643, ... }
[CAPTCHA DEBUG] Request prepared for Google { secretExists: true, secretLength: 40, tokenLength: 1643 }
[CAPTCHA DEBUG] Full Google Response { success: true, score: 0.95, action: "login", ... }
[CAPTCHA DEBUG] CAPTCHA verification successful { score: 0.95, action: "login" }

[ADMIN LOGIN] INFO | Looking up platform admin | { email: "adm***" }
[ADMIN LOGIN] INFO | Admin lookup success | { adminId: "...", status: "active", totpEnabled: false }
[ADMIN LOGIN] INFO | Starting password verification | { adminId: "...", hashLength: 96 }
[ADMIN LOGIN] INFO | Password verification complete | { adminId: "...", matches: true }
[ADMIN LOGIN] INFO | 2FA not enabled - creating permanent session | { adminId: "..." }
[ADMIN LOGIN] INFO | Session created and stored | { adminId: "..." }
[ADMIN LOGIN] INFO | Last login timestamp updated | { adminId: "..." }
[ADMIN LOGIN] INFO | Login success - session created | { adminId: "...", durationMs: 245 }
```

## Common Failure Scenarios

### Scenario 1: "CAPTCHA verification failed" - No Details

**Problem:** Debug logging disabled

**Solution:**

1. Set `AUTH_DEBUG=true` in `.env.local`
2. Restart dev server
3. Try login again
4. Check console output

### Scenario 2: Error Code: "invalid-input-secret"

**Problem:** Secret key is wrong

**Solution:**

1. Go to Google reCAPTCHA console (cloud.google.com)
2. Find your reCAPTCHA v3 key
3. Copy SECRET KEY
4. Update `RECAPTCHA_SECRET_KEY` in `.env.local`
5. Restart server

### Scenario 3: Token is always empty

**Problem:** Frontend reCAPTCHA script didn't load

**Solution:**

1. Check browser console for errors
2. Verify `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set
3. Check firewall/proxy isn't blocking Google domains
4. Try incognito mode (clear cache)

### Scenario 4: Action mismatch (expected: "login", actual: "contact-us")

**Problem:** Wrong form is submitting

**Solution:**

1. Verify login form calls `grecaptcha.execute(..., { action: 'login' })`
2. Check no other forms reuse the token
3. Verify only login form has the token field

### Scenario 5: Timeout-or-duplicate error

**Problem:** Token already used or expired

**Solution:**

1. Don't retry with same token
2. Generate new token for each attempt
3. Frontend automatically does this on retry
4. If still failing, check clock skew on server

## Testing CAPTCHA Locally

### With Real reCAPTCHA Keys

1. Add `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY` to `.env.local`
2. Set `AUTH_DEBUG=true`
3. Run `pnpm dev`
4. Go to http://localhost:3000/platform-admin-login
5. Open browser developer console
6. Try login
7. Check console for `[reCAPTCHA FRONTEND]` logs
8. Check server terminal for `[CAPTCHA DEBUG]` logs

### Without reCAPTCHA Keys (Testing Auth Only)

The login form works without reCAPTCHA (token is optional):

1. Leave `RECAPTCHA_SECRET_KEY` empty
2. Login will skip CAPTCHA verification
3. Useful for testing auth flow without keys

## Files Modified

1. **lib/env.ts**
   - Added startup logging for reCAPTCHA configuration
   - Logs only in development or when `AUTH_DEBUG=true`

2. **app/api/platform-admin/login/route.ts**
   - Added `debugLog()` helper function
   - Task 1: Log full Google response
   - Task 2: Log token from frontend
   - Task 3: Log request to Google
   - Task 5: Verify action matches
   - Task 6: Verify hostname
   - Task 8: Log error codes
   - Task 9: Kept password verification logs

3. **app/platform-admin-login/page.tsx**
   - Task 4: Added frontend logging
   - Verifies token exists before submission
   - Logs siteKey, token length, first/last 20 chars
   - Detects and reports reCAPTCHA errors

## Support

If CAPTCHA still fails after checking this guide:

1. Enable `AUTH_DEBUG=true`
2. Capture complete logs (frontend + server)
3. Check Google reCAPTCHA console for activity
4. Verify keys haven't been regenerated
5. Check Vercel logs for any errors
6. Contact support with logs
