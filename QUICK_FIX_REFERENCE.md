# Quick Fix Reference - Troubleshooting School Management System

## 🆘 Problem? Here's Where to Look

### "Emails Not Being Received"
**Go to**: Vercel Dashboard → Deployments → Logs
**Search for**: `[v0][EMAIL] ❌`
**Common cause**: Missing `RESEND_API_KEY` environment variable
**Fix**: Add `RESEND_API_KEY` to Vercel Environment Variables and redeploy

---

### "Can't Login After School Approved"
**Go to**: Vercel Dashboard → Deployments → Logs
**Search for**: `[v0][LOGIN] ❌ School not approved`
**Cause**: School status not updated to 'active'
**Fix**: 
1. Go to Platform Admin Dashboard
2. Find school in "School Requests"
3. Click "Approve"
4. Try login again

---

### "Approval Email Not Received"
**Go to**: Vercel Dashboard → Deployments → Logs
**Search for**: `[v0][APPROVAL] ❌`
**Possible causes**:
1. No admin profile email for the school
2. Missing `RESEND_API_KEY`
3. Wrong `RESEND_FROM_EMAIL`

**Quick check**:
- Does the school have an admin user in the `profiles` table?
- Is `RESEND_API_KEY` set in Vercel?

---

### "Getting 'Unauthorized' Error"
**Cause**: Missing or incorrect environment variables
**Go to**: Vercel Dashboard → Project → Settings → Environment Variables
**Verify these exist**:
- `RESEND_API_KEY` ✓
- `SUPABASE_SERVICE_ROLE_KEY` ✓
- `NEXT_PUBLIC_SUPABASE_URL` ✓
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓

---

## 🔧 Environment Variables Setup (2 minutes)

1. Go to **Vercel Dashboard**
2. Select your **Project**
3. Click **Settings** → **Environment Variables**
4. Add these (if not already there):

```
RESEND_API_KEY = [your-key-from-resend.com]
RESEND_FROM_EMAIL = noreply@yourdomain.com (optional)
```

5. Scroll down and click **Redeploy** on latest deployment
6. Wait for deployment to complete (~1 minute)

---

## 📋 Verification Checklist

After deployment, test:

```
☐ Signup - Create test account
☐ Email - Check signup email received
☐ Login (unapproved) - Try login → Should fail
☐ Approval - Admin approves school
☐ Email - Check approval email received  
☐ Login (approved) - Try login → Should succeed
☐ Logs - Check Vercel logs show ✅ for all steps
```

---

## 📊 How to Read the Logs

**Success Logs** (Everything is working):
```
[v0][EMAIL][email_xyz] ✅ Email sent SUCCESSFULLY
[v0][LOGIN] ✅ School approval verified
```

**Error Logs** (Something is wrong):
```
[v0][EMAIL][email_xyz] ❌ Email send FAILED
[v0][LOGIN] ❌ School not approved
```

**Warning Logs** (Configuration issue):
```
[v0][CONFIG] RESEND_API_KEY not configured
[v0][APPROVAL] ⚠️ No admin profile email found
```

---

## 🔍 Log Search in Vercel

**Path**: Deployments → [Select Deployment] → Logs

**Search for these to find issues**:
- `[v0][EMAIL]` - All email problems
- `[v0][LOGIN]` - All login problems  
- `❌` - Any error
- `resendApiKeyConfigured: false` - Missing Resend key
- Request ID like `email_1234567890_xyz` - Trace a specific email

---

## ❌ → ✅ Common Fixes

| Issue | Search For | Quick Fix |
|-------|-----------|----------|
| No emails sent | `resendApiKeyConfigured: false` | Add `RESEND_API_KEY` to Vercel |
| Wrong from email | `from: 'onboarding@resend.dev'` | Add `RESEND_FROM_EMAIL` to Vercel |
| Login fails | `schoolStatus: 'pending'` | Approve school in Platform Admin |
| 404 errors | `[v0][LOGIN] ❌ School fetch error` | Check school exists in database |
| Can't access dashboard | `status !== 'active'` | Check user/school status in DB |

---

## 🚀 Quick Deployment Checklist

```
☐ Commit changes to git
☐ Verify build: npm run build (should succeed)
☐ Push to your repository
☐ Vercel auto-deploys (or manually redeploy from dashboard)
☐ Wait for ✓ deployment complete
☐ Test: Try signup flow
☐ Check logs: Search for [v0][EMAIL] ✅
```

---

## 📞 Still Having Issues?

1. **Check the full debugging guide**:
   - See `DEBUGGING_GUIDE.md` in the project root

2. **Review what was fixed**:
   - See `FIXES_IMPLEMENTED.md` in the project root

3. **Verify environment variables**:
   - Go to Vercel Project Settings → Environment Variables
   - Verify all required variables are set

4. **Check recent logs**:
   - Vercel Dashboard → Deployments → [Latest] → Logs
   - Filter by `[v0]` to see only app logs

---

## 📝 Files That Were Changed/Created

**Modified** (contain new fixes):
- `lib/email.ts` - Fixed FROM_EMAIL, enhanced logging
- `app/api/auth/login/route.ts` - Added school approval check
- `app/api/auth/signup/route.ts` - Enhanced logging
- `app/api/platform-admin/school-requests/route.ts` - Enhanced approval logging

**Created** (for debugging):
- `lib/debug-logger.ts` - Debug logging utility
- `DEBUGGING_GUIDE.md` - Full debugging documentation
- `FIXES_IMPLEMENTED.md` - Detailed fixes breakdown
- `QUICK_FIX_REFERENCE.md` - This file

---

## 🎯 TL;DR (The Essentials)

**The main issue was**: `FROM_EMAIL` hardcoded to test email
**The fix**: Check environment variables for `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
**To test**: Signup → Check email → Approve in admin → Try login
**To debug**: Go to Vercel logs, search `[v0][EMAIL]` or `[v0][LOGIN]`

---

**Last updated**: 2026-07-20
**Status**: ✅ All issues identified and fixed with comprehensive logging
