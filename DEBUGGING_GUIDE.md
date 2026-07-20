# Debugging Guide for School Management System

This guide helps you identify and resolve common issues with email sending, school approval, and login functionality.

## Common Issues and How to Debug

### 1. Emails Not Being Received (Signup & Approval)

#### Issue Symptoms:
- Signup confirmation email not received
- School approval notification email not received

#### Root Causes to Check:

1. **Missing or Incorrect Resend API Key**
   - **Log Pattern**: Look for `[v0][CONFIG]` logs mentioning `resendApiKeyConfigured: false`
   - **Fix**: 
     - Go to Vercel Dashboard → Project Settings → Environment Variables
     - Add `RESEND_API_KEY` with your actual Resend API key
     - Redeploy the application

2. **Incorrect From Email**
   - **Log Pattern**: Look for logs showing `from: 'onboarding@resend.dev'` or similar test email
   - **Log Message**: `[v0][EMAIL] ℹ️ Starting email send: from: 'onboarding@resend.dev'`
   - **Fix**:
     - The system now checks for `RESEND_FROM_EMAIL` environment variable
     - In Vercel, add `RESEND_FROM_EMAIL=noreply@yourdomain.com` (must be verified in Resend)
     - If not set, defaults to `noreply@schoolmanagementsystem.com` (update if needed)

3. **Resend API Call Failure**
   - **Log Pattern**: Look for `[v0][EMAIL]` logs with `❌ Email send FAILED`
   - **Example Log**:
     ```
     [v0][EMAIL][email_1234567890_xyz] ❌ Email send FAILED:
     error: {message: "Unauthorized", status: 401}
     ```
   - **Fix**: Verify your RESEND_API_KEY is correct and active in your Resend dashboard

4. **Email Service Not Initialized**
   - **Log Pattern**: Look for `[v0] Initializing Resend client: apiKeyExists: false`
   - **Fix**: Add RESEND_API_KEY environment variable

#### How to Check Email Logs in Vercel:

1. Go to Vercel Dashboard → Deployments → Select your deployment
2. Click "Logs" tab
3. Search for `[v0][EMAIL]` to see all email operations
4. Look for request IDs like `email_1234567890_xyz` to trace a specific email

#### Example Successful Email Logs:

```
[v0][EMAIL][email_1234567890_xyz] Starting email send:
to: 'admin@school.edu'
subject: 'Welcome to School Management System'
from: 'noreply@schoolmanagementsystem.com'
resendApiKeyConfigured: true

[v0][EMAIL][email_1234567890_xyz] ✅ Email sent SUCCESSFULLY:
messageId: 'abc123def456'
```

---

### 2. School Login Failing Despite Admin Approval

#### Issue Symptoms:
- User can signup but cannot login after school is approved
- Error message: "Your school has not been approved yet"
- Or: "Your account is not active"

#### Root Causes to Check:

1. **School Status Not Updated to 'active'**
   - **Log Pattern**: Look for `[v0][LOGIN] ❌ School not approved`
   - **Example Log**:
     ```
     [v0][LOGIN] ❌ School not approved (status is not active):
     schoolId: 'sch_123'
     schoolStatus: 'pending_verification'
     ```
   - **Fix**:
     - Go to Platform Admin Dashboard
     - Find the school in "School Requests"
     - Click "Approve" to set status to 'active'
     - The school should now update in the `schools` table with `status = 'active'`

2. **User Profile Status Not 'active'**
   - **Log Pattern**: Look for `[v0][LOGIN] ❌ User account not active`
   - **Example Log**:
     ```
     [v0][LOGIN] ❌ User account not active:
     userStatus: 'inactive'
     ```
   - **Fix**:
     - Check the `profiles` table for the user
     - Status should be 'active'
     - Contact support if it shows 'inactive'

3. **School Not Found in Database**
   - **Log Pattern**: Look for `[v0][LOGIN] ❌ School fetch error`
   - **Example Log**:
     ```
     [v0][LOGIN] ❌ School fetch error:
     schoolId: 'sch_123'
     error: {message: 'No rows found'}
     ```
   - **Fix**:
     - Verify school exists in Supabase `schools` table
     - Check the school_id in user's profile matches a school record

#### How to Check Login Logs in Vercel:

1. Go to Vercel Dashboard → Deployments → Select deployment
2. Click "Logs" tab
3. Search for `[v0][LOGIN]` to see all login attempts
4. Look for the email address in the logs to trace the specific user

#### Example Successful Login Logs:

```
[v0][LOGIN] Profile loaded:
email: 'admin@school.edu'
userId: 'usr_123'
schoolId: 'sch_456'
userStatus: 'active'

[v0][LOGIN] School status retrieved:
schoolName: 'Lincoln High School'
schoolStatus: 'active'

[v0][LOGIN] ✅ School approval verified - proceeding with login
```

---

### 3. School Approval Emails Not Sent

#### Issue Symptoms:
- Admin clicks "Approve" on school request
- School is approved in database but admin never receives email
- No error shown to admin in UI

#### Root Causes to Check:

1. **No Admin Profile Email Found**
   - **Log Pattern**: Look for `[v0][APPROVAL] ⚠️ No admin profile email found`
   - **Fix**:
     - Check the `profiles` table for the school's admin user
     - Verify the user has an email address set
     - The system finds the admin via `system_role = 'Admin'` for that school

2. **Resend Not Configured**
   - **Log Pattern**: Same as "Emails Not Being Received" section above
   - **Fix**: Follow steps in section 1 above

3. **Email Send Failed**
   - **Log Pattern**: Look for `[v0][APPROVAL] ❌ Approval email send FAILED`
   - **Example Log**:
     ```
     [v0][APPROVAL] ❌ Approval email send FAILED:
     to: 'admin@school.edu'
     error: {message: 'Invalid API key'}
     ```
   - **Fix**: Verify RESEND_API_KEY is correct

#### How to Check Approval Logs in Vercel:

1. Go to Vercel Dashboard → Deployments
2. Click "Logs" tab
3. Search for `[v0][APPROVAL]` to see all approval operations
4. Look for the school name in the logs

---

### 4. Configuration Issues

#### How to View Current Configuration:

The system logs configuration status on first request. Look for logs like:

```
[v0][CONFIG] ℹ️ Configuration Status
resendApiKeyConfigured: true
resendFromEmailConfigured: false
supabaseUrlConfigured: true
supabaseAnonKeyConfigured: true
supabaseServiceRoleConfigured: true
```

#### Required Environment Variables:

For **Vercel Production**:
```
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com (optional, defaults to noreply@schoolmanagementsystem.com)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-production-url.com
```

#### How to Add Environment Variables in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click "Settings" tab
4. Go to "Environment Variables" section
5. Add each variable with the "production" scope
6. Redeploy by going to Deployments and clicking the three dots on latest deployment → "Redeploy"

---

## Accessing Vercel Logs

### Method 1: Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Deployments tab
4. Click on the latest deployment
5. Click "Logs" tab
6. Use the search box to filter logs (e.g., `[v0][EMAIL]`, `[v0][LOGIN]`)

### Method 2: Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Link to your project
vercel link

# View logs in real-time
vercel logs --follow

# View logs for specific time period
vercel logs --since 1h

# Filter logs
vercel logs | grep "[v0][EMAIL]"
```

### Method 3: Streaming Logs

For the latest logs during active requests:

```bash
# Watch logs as they come in
vercel logs --follow --tail
```

---

## Debugging Checklist

Before reaching out to support, verify:

- [ ] `RESEND_API_KEY` is set in Vercel Environment Variables
- [ ] `RESEND_FROM_EMAIL` is set to a verified sender email (or remove it to use default)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel Environment Variables
- [ ] School status is 'active' in `schools` table after approval
- [ ] User profile status is 'active' in `profiles` table
- [ ] User has a school_id in their profile
- [ ] Admin user record exists for the school with `system_role = 'Admin'`
- [ ] Check Vercel logs for errors matching patterns above
- [ ] Redeploy after adding/changing environment variables

---

## Log Patterns Reference

| Pattern | Meaning | Action |
|---------|---------|--------|
| `✅` in logs | Success operation | No action needed |
| `❌` in logs | Failed operation | Check error details in logs |
| `⚠️` in logs | Warning / potential issue | Review but may still work |
| `[v0][EMAIL]` | Email operation | Check Resend configuration |
| `[v0][LOGIN]` | Login attempt | Check school approval status |
| `[v0][APPROVAL]` | School approval | Check admin email exists |
| `[v0][SIGNUP]` | New signup | Check Resend API key |
| `[v0][CONFIG]` | Configuration check | Verify all env vars set |

---

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel Logs Documentation](https://vercel.com/docs/observability/logs)
