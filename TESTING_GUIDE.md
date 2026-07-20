# Complete Auth Flow Testing Guide

This guide walks through testing all the new authentication flows end-to-end after deployment to Vercel.

## Prerequisites

1. Vercel deployment is complete
2. Supabase RLS migration (004_fix_signup_rls.sql) has been applied
3. Environment variables are set:
   - `RESEND_API_KEY` = your actual Resend API key
   - `RESEND_FROM_EMAIL` = noreply@yourdomain.com or noreply@resend.dev
   - `NEXT_PUBLIC_APP_URL` = your deployed app URL

## Test Scenario 1: Complete Signup & Setup Flow (Happy Path)

### Step 1: Sign Up a New School
1. Go to: `https://your-app.vercel.app/signup`
2. Fill in the form:
   - **School Name**: "Test Academy"
   - **First Name**: "John"
   - **Last Name**: "Doe"
   - **Email**: "testschool@example.com" (use a real email you can check)
   - **Phone**: "+1-555-000-0000"
   - **Password**: "SecurePassword123!"
3. Complete CAPTCHA
4. Click "Sign Up"

**Expected Result:**
- Redirect to login page with success message
- School created in database with status: "pending_verification"
- Profile created with setup_completed: false
- Welcome email sent to testschool@example.com

**Verify in Vercel Logs:**
Search for: `[v0][SIGNUP]`
Look for these logs in order:
```
[v0][SIGNUP] Checking if email already registered: {email}
[v0][SIGNUP] Starting school creation
[v0][SIGNUP] Creating profile
[v0][SIGNUP] About to send confirmation email
[v0][EMAIL][request_id] ✅ Email sent SUCCESSFULLY
[v0][SIGNUP] ✅ Signup confirmation email SENT
```

### Step 2: Try Login Before Approval
1. Go to: `https://your-app.vercel.app/login`
2. Enter credentials:
   - **Email**: testschool@example.com
   - **Password**: SecurePassword123!
3. Click "Sign In"

**Expected Result:**
- Error message: "Your school has not been approved yet. Please contact support."
- NOT redirected to setup (because school must be approved first)

**Verify in Vercel Logs:**
Search for: `[v0][LOGIN]`
Look for:
```
[v0][LOGIN] School status retrieved: {schoolStatus: "pending_verification"}
[v0][LOGIN] ❌ School not approved (status is not active)
```

### Step 3: Approve School (Admin Task)
1. Go to platform admin dashboard
2. Navigate to "School Requests" or "Pending Schools"
3. Find "Test Academy" 
4. Click "Approve"

**Expected Result:**
- School status changes from "pending_verification" to "active"
- Approval email sent to testschool@example.com
- Admin sees confirmation that approval was sent

**Verify in Vercel Logs:**
Search for: `[v0][APPROVAL]`
Look for:
```
[v0][APPROVAL] About to send approval email: {schoolName: "Test Academy"}
[v0][APPROVAL] ✅ School approval email SENT
```

### Step 4: Login After Approval
1. Go to: `https://your-app.vercel.app/login`
2. Enter credentials:
   - **Email**: testschool@example.com
   - **Password**: SecurePassword123!
3. Click "Sign In"

**Expected Result:**
- Successfully authenticated
- Redirected to: `/setup` (because setup_completed is false)
- Profile setup wizard displayed

**Verify in Vercel Logs:**
Search for: `[v0][LOGIN]`
Look for:
```
[v0][LOGIN] ✅ School approval verified - proceeding with login
[v0][LOGIN] Profile setup status: {setupCompleted: false}
```

Then search for `[v0][LAYOUT]`:
```
[v0][LAYOUT] Setup not completed, redirecting to setup
```

### Step 5: Complete Profile Setup Wizard
1. On setup page, fill in:

**Step 1: School Information**
- School Name: "Test Academy" (should prefill)
- Address: "123 Main St, City, State 12345"
- Principal Name: "John Doe"
- Principal Email: "john@testacademy.edu"
- Phone: "+1-555-000-0000"
- Website: "https://testacademy.edu" (optional)
- Logo: (skip - optional)
- Click "Next"

**Step 2: Academic Year**
- Year: 2024
- Start Date: 2024-01-15
- End Date: 2024-12-15
- Click "Next"

**Step 3: School Terms**
- Term 1: 2024-01-15 to 2024-04-15
- Term 2: 2024-05-01 to 2024-08-15
- Term 3: 2024-09-01 to 2024-12-15
- Click "Next"

**Step 4: Invite First Teacher (Optional)**
- Can skip or fill in:
  - First Name: "Jane"
  - Last Name: "Smith"
  - Email: "jane@testacademy.edu"
  - Subject: "Mathematics"
- Click "Next"

**Step 5: Complete**
- Click "Go to Dashboard"

**Expected Result:**
- All data saved successfully
- Redirected to dashboard: `/dashboard`
- Dashboard loads without errors

**Verify in Vercel Logs:**
Search for: `[v0][SETUP]`
Look for:
```
[v0][SETUP] Starting profile setup for user
[v0][SETUP] Updating school details
[v0][SETUP] School updated successfully
[v0][SETUP] Creating academic year
[v0][SETUP] Creating school terms
[v0][SETUP] Marking profile setup as complete
[v0][SETUP] ✅ Profile setup COMPLETED successfully
```

### Step 6: Verify Persistent Session
1. Go to dashboard: `https://your-app.vercel.app/dashboard`
2. Should see dashboard (no redirect to setup)
3. Close browser, wait 1 minute
4. Go to app again
5. Should still be logged in (session persists)

**Verify in Vercel Logs:**
Search for: `[v0][SESSION]`
Look for:
```
[v0][SESSION] Session verified: {userId, email, role, setupCompleted: true}
```

Then search for `[v0][LAYOUT]`:
```
[v0][LAYOUT] Auth check result: {hasSession: true, setupCompleted: true}
```

## Test Scenario 2: Email Delivery Issues (Debugging)

### Debug Missing Welcome Email
1. Complete signup
2. Email NOT received

**In Vercel Logs:**
1. Search: `[v0][EMAIL]`
2. Find the request ID from signup: `email_[timestamp]_[chars]`
3. Search for that full request ID
4. Look for either:
   - ✅ "Email sent SUCCESSFULLY" = Resend accepted it, check spam folder
   - ❌ "Email send FAILED" = Check error details

**Common Issues:**
- `FROM_EMAIL` not set = emails won't send
- `RESEND_API_KEY` invalid = API will reject request
- Domain not verified = emails go to spam
- Email address in request is null/empty

### Fix Steps
1. Verify `RESEND_FROM_EMAIL` is set to valid email
2. Verify `RESEND_API_KEY` is valid Resend key
3. If using custom domain, verify it's verified in Resend dashboard
4. Check email spam folder
5. Redeploy after fixing env vars

## Test Scenario 3: Session & Auth Edge Cases

### Test: Expired Session
1. Login successfully to get session cookie
2. Wait 7 days (or manually delete `sb-auth-token` cookie)
3. Go to dashboard
4. Should redirect to login with message "Not authenticated"

**Verify in Vercel Logs:**
```
[v0][LAYOUT] Not authenticated, redirecting to login
```

### Test: Profile Not Found
1. Directly access an API that requires profile (e.g., `/api/auth/setup-profile`)
2. Make request without valid profile
3. Should get error 404 "Profile not found"

**Verify in Vercel Logs:**
```
[v0][SETUP] ❌ Profile not found
```

### Test: School Not Yet Approved
1. Create new school via signup
2. Try to login immediately (before admin approval)
3. Should get error: "Your school has not been approved yet"

**Verify in Vercel Logs:**
```
[v0][LOGIN] ❌ School not approved (status is not active)
```

## Performance Checklist

- [ ] Signup completes in < 2 seconds
- [ ] Login completes in < 1 second (after school approval)
- [ ] Setup wizard saves without delays
- [ ] Dashboard loads without spinner
- [ ] Session check is instant

If any are slow, check Vercel analytics and database query performance.

## Common Failure Points & Fixes

| Issue | Logs to Search | Fix |
|-------|---|---|
| Email not sent | `[v0][EMAIL]` FAILED | Check RESEND_API_KEY and RESEND_FROM_EMAIL |
| Can't login | `[v0][LOGIN]` error | Check if profile exists and school is approved |
| Setup not saving | `[v0][SETUP]` error | Check database permissions and RLS policies |
| Redirect loop | `[v0][LAYOUT]` | Check if setup_completed field exists in profiles table |
| Session expires | `[v0][SESSION]` error | Check session cookie settings and auth token |

## Success Criteria

All of these must pass:
1. ✅ Signup creates school and profile
2. ✅ Welcome email sent after signup
3. ✅ Can't login until school is approved
4. ✅ Approval email sent when school approved
5. ✅ Login redirects to setup wizard
6. ✅ Setup wizard saves all data
7. ✅ After setup, can access dashboard
8. ✅ Session persists across page reloads
9. ✅ All logs visible in Vercel function logs
10. ✅ No errors in browser console

If any fail, use the AUTH_LOGGING_REFERENCE.md to find relevant logs and debug.
