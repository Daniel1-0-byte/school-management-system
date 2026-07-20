# Authentication Logging Reference

This document describes all the logging points added throughout the authentication and profile setup flow for easy debugging post-deployment on Vercel.

## Logging Pattern

All logs follow this pattern for easy searching:
- `[v0][CONTEXT] ✅/❌/⚠️ Message: {details}`

Where:
- `[v0]` = v0 application marker
- `[CONTEXT]` = Auth flow step (SIGNUP, LOGIN, APPROVAL, SETUP, SESSION, LAYOUT)
- `✅` = Success
- `❌` = Error/Failure
- `⚠️` = Warning

## Authentication Flows

### 1. SIGNUP Flow (`/api/auth/signup`)

**Key Log Points:**
```
[v0][SIGNUP] Checking if email already registered: {email}
[v0][SIGNUP] Starting school creation: {schoolName}
[v0][SIGNUP] Creating auth user: {email}
[v0][SIGNUP] Creating profile: {userId, schoolId}
[v0][SIGNUP] About to send confirmation email: {email, schoolName, ...config}
[v0][EMAIL][REQUEST_ID] Starting email send: {to, subject, ...config}
[v0][EMAIL][REQUEST_ID] ✅/❌ Email sent SUCCESSFULLY/FAILED: {details}
[v0][SIGNUP] ✅ Signup confirmation email SENT: {email, messageId}
[v0][SIGNUP] ❌ Signup confirmation email send FAILED: {email, error}
[v0] School signup successful, awaiting platform admin approval
```

**Search in Vercel Logs:**
```
[v0][SIGNUP]
[v0][EMAIL]
```

### 2. LOGIN Flow (`/api/auth/login`)

**Key Log Points:**
```
[v0][LOGIN] Profile loaded: {email, userId, role, schoolId}
[v0][LOGIN] Checking school approval status for school_id: {schoolId}
[v0][LOGIN] School status retrieved: {schoolName, schoolStatus}
[v0][LOGIN] ❌ School not approved: {email, schoolStatus}
[v0][LOGIN] ✅ School approval verified - proceeding with login
[v0][LOGIN] Profile setup status: {email, setupCompleted}
[v0] Confirmation email sent (logged): {success, email, schoolId}
```

**Search in Vercel Logs:**
```
[v0][LOGIN]
School approval verified
School not approved
```

### 3. SCHOOL APPROVAL Flow (`/api/platform-admin/school-requests`)

**Key Log Points:**
```
[v0][APPROVAL] About to send approval email: {to, schoolName, ...config}
[v0][APPROVAL] ✅ School approval email SENT: {to, schoolName, messageId}
[v0][APPROVAL] ❌ Approval email send FAILED: {to, schoolName, error}
[v0][APPROVAL] ⚠️ No admin profile email found: {schoolName}
```

**Search in Vercel Logs:**
```
[v0][APPROVAL]
School approval
```

### 4. PROFILE SETUP Flow (`/api/auth/setup-profile`)

**Key Log Points:**
```
[v0][SETUP] Starting profile setup for user: {userId}
[v0][SETUP] Updating school details: {schoolId, schoolName}
[v0][SETUP] School updated successfully
[v0][SETUP] Creating academic year: {schoolId, year}
[v0][SETUP] Creating school terms: {schoolId, termCount}
[v0][SETUP] Marking profile setup as complete: {userId}
[v0][SETUP] ✅ Profile setup COMPLETED successfully: {userId, schoolId, schoolName}
[v0][SETUP] ❌ Setup error: {error}
```

**Search in Vercel Logs:**
```
[v0][SETUP]
Profile setup COMPLETED
```

### 5. SESSION Flow (`/api/auth/session`)

**Key Log Points:**
```
[v0][SESSION] Session verified: {userId, email, role, setupCompleted}
```

**Search in Vercel Logs:**
```
[v0][SESSION]
```

### 6. SCHOOL LAYOUT (`app/(school)/layout.tsx`)

**Key Log Points:**
```
[v0][LAYOUT] Checking authentication...
[v0][LAYOUT] Auth check result: {hasSession, setupCompleted}
[v0][LAYOUT] Not authenticated, redirecting to login
[v0][LAYOUT] Setup not completed, redirecting to setup
```

**Search in Vercel Logs:**
```
[v0][LAYOUT]
```

### 7. EMAIL SERVICE (`lib/email.ts`)

**Key Log Points:**
```
[v0][EMAIL][REQUEST_ID] Starting email send: {to, subject, from, configs}
[v0][EMAIL][REQUEST_ID] Resend client initialized, calling API...
[v0][EMAIL][REQUEST_ID] Resend API response: {hasError, errorDetails, messageId}
[v0][EMAIL][REQUEST_ID] ✅ Email sent SUCCESSFULLY: {to, messageId}
[v0][EMAIL][REQUEST_ID] ❌ Email send FAILED: {to, error}
[v0][EMAIL] ❌ Unexpected email service error: {error, errorType, stack}
```

**Search in Vercel Logs:**
```
[v0][EMAIL]
Email sent SUCCESSFULLY
Email send FAILED
```

## Common Debugging Scenarios

### Problem: Emails not being received

1. Search for: `[v0][EMAIL]`
2. Look for: `Email sent SUCCESSFULLY` (means Resend API accepted it)
3. Check: `RESEND_FROM_EMAIL` and `RESEND_API_KEY` environment variables
4. If status is `FAILED`, check the error details in the logs

**Example success log:**
```json
{
  "messageId": "..." ,
  "to": "user@example.com",
  "from": "noreply@yourdomain.com"
}
```

### Problem: Can't login after signup

1. Search for: `[v0][LOGIN]`
2. Look for: "School not approved" or "Profile not found"
3. If "School not approved": Admin needs to approve the school
4. If "Profile not found": Check if signup completed successfully - search for `[v0][SIGNUP]`

### Problem: Can't access school dashboard after login

1. Search for: `[v0][LAYOUT]`
2. Look for: "Setup not completed, redirecting to setup" or "Not authenticated"
3. If redirecting to setup: User needs to complete profile setup wizard
4. If not authenticated: Session cookie may have expired - need to login again

### Problem: Setup wizard not saving data

1. Search for: `[v0][SETUP]`
2. Look for error messages with details
3. Check database permissions and RLS policies
4. Check if academic_years and school_terms tables exist

## Request ID Tracking

Each email send operation gets a unique request ID:
```
email_[timestamp]_[random9chars]
```

Example: `email_1721481902_a3f9k2m1p`

Use this to trace a single email through the entire flow:
1. Starting send
2. Resend API call
3. API response
4. Final success/failure status

## Environment Variables Required

For logging to work properly, ensure these are set in Vercel:
- `RESEND_API_KEY` - Must be valid
- `RESEND_FROM_EMAIL` - Email sending will fail silently if not set
- `NEXT_PUBLIC_APP_URL` - Used in email links

## How to View Logs on Vercel

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment
3. Click "View Function Logs"
4. Search for any log pattern (e.g., `[v0][LOGIN]`)
5. Filter by time if needed

All logs will appear in real-time as requests are made.
