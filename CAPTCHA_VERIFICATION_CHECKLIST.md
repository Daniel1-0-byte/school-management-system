# reCAPTCHA Configuration Verification Checklist

## Debug Setup
Enable detailed logging by setting environment variables:
```
AUTH_DEBUG=true
NODE_ENV=development
```

Or in Vercel:
- Settings → Environment Variables
- Add `AUTH_DEBUG=true`

## What the Enhanced Logging Will Show

When login fails with CAPTCHA error, check Vercel logs for `[v0][CAPTCHA-DEBUG]` entries showing:

### Before Verification:
- Token length and existence
- Secret key configuration status
- Site key configuration status
- Verification URL being used
- Client IP address

### After Google Response:
- `success`: Boolean - did Google verify the token?
- `score`: Number 0-1 - bot likelihood (higher = human)
- `action`: String - the action sent from frontend
- `hostname`: String - domain where token was generated
- `challenge_ts`: Timestamp - when challenge was completed
- `error-codes`: Array - specific Google error codes

## Configuration Checks to Perform

### 1. Verify Keys Match Same Project
Run this in your Google Cloud Console:
```
1. Go to reCAPTCHA Admin Console: https://www.google.com/recaptcha/admin
2. Select your project
3. Settings → Sites
4. Copy the "Site Key" → paste to NEXT_PUBLIC_RECAPTCHA_SITE_KEY in Vercel
5. Copy the "Secret Key" → paste to RECAPTCHA_SECRET_KEY in Vercel
```

**Danger**: If site key and secret key are from different projects, verification ALWAYS fails.

### 2. Verify reCAPTCHA Type
Check in Google reCAPTCHA Admin:
- Should be "reCAPTCHA v3"
- Not v2 or Enterprise

### 3. Verify Allowed Domains
In reCAPTCHA Admin Console → Settings:
```
Domains that can use this key:
- localhost  (for development)
- yourdomain.vercel.app  (your Vercel domain)
- yourdomain.com  (if you have custom domain)
```

Add your current Vercel deployment domain if missing.

### 4. Verify Frontend Implementation
In `/app/components/login-form.tsx` or signup form:

```typescript
// Should look like:
grecaptcha.ready(() => {
  grecaptcha.execute(
    'YOUR_RECAPTCHA_SITE_KEY',  // This must match NEXT_PUBLIC_RECAPTCHA_SITE_KEY in env
    { action: 'login' }  // Action sent to backend
  ).then((token) => {
    // Send token to backend with form
  });
});
```

### 5. Verify Backend Implementation
In `/app/api/auth/login/route.ts`:

```typescript
// Backend verifies with:
const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `secret=${RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
});
```

The `RECAPTCHA_SECRET_KEY` MUST match the one in Google Console.

### 6. Verify Action Names Match
- Frontend sends: `{ action: 'login' }`
- Backend receives and logs action
- Google verification includes action in response
- Backend should verify they match (currently doesn't - but logs it)

## Common Error Codes from Google

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| `missing-input-secret` | Secret key not sent | Check RECAPTCHA_SECRET_KEY env var exists |
| `invalid-input-secret` | Secret key is wrong | Verify key matches Google Console exactly |
| `missing-input-response` | Token not sent | Frontend not sending captchaToken |
| `invalid-input-response` | Token invalid or expired | Token may have been used twice or is old |
| `bad-request` | Malformed request | Check URL and headers are correct |
| `timeout-or-duplicate` | Token used twice | Frontend reusing token across requests |

## Debugging Steps

1. **Enable debug logging:**
   ```
   Set AUTH_DEBUG=true in Vercel environment variables
   ```

2. **Trigger login failure:**
   - Go to login page
   - Try to login
   - Watch Vercel logs for `[v0][CAPTCHA-DEBUG]` messages

3. **Check logs for error-codes:**
   - Look for `errorCodes: [...]`
   - Find the error code above
   - Follow the solution

4. **If verification succeeds but score is low:**
   - Google thinks it's a bot (score < 0.5)
   - Could be: VPN/proxy, suspicious behavior, rate limiting
   - Lower threshold in env: `RECAPTCHA_SCORE_THRESHOLD=0.3`

## Environment Variables to Check

In Vercel Settings → Environment Variables:

```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc...  (starts with 6Lc, 40 chars, PUBLIC)
RECAPTCHA_SECRET_KEY=6Lc...             (starts with 6Lc, 40 chars, SECRET - not public)
AUTH_DEBUG=true                          (for development)
RECAPTCHA_SCORE_THRESHOLD=0.5            (lower = stricter, 0-1)
```

**Critical**: Site key should have `NEXT_PUBLIC_` prefix (visible to frontend)
**Critical**: Secret key should NOT have prefix (server-only)

## What Each Setting Does

- **Site Key**: Loaded in frontend HTML, identifies your website to Google
- **Secret Key**: Used server-side to verify tokens, must be kept secret
- **Score Threshold**: Minimum human probability (0.0-1.0) to allow login
- **Action**: Names different user actions for Google to track (login, signup, etc)
