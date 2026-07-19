# SchoolHub Setup Checklist

Complete this checklist to get SchoolHub running locally and deployed to production.

## Pre-Setup

- [ ] Node.js 18+ installed (`node --version`)
- [ ] pnpm installed (`pnpm --version`)
- [ ] GitHub account (for deployment)
- [ ] Supabase account created (https://supabase.com)
- [ ] Google reCAPTCHA keys obtained (https://www.google.com/recaptcha/admin)

## Local Development Setup

### Step 1: Clone and Install
- [ ] Clone the repository
- [ ] Run `pnpm install` in project root
- [ ] Verify no TypeScript errors: `pnpm tsc --noEmit`

### Step 2: Supabase Setup
- [ ] Create new Supabase project (free tier)
- [ ] Note project URL and keys:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Environment Variables
- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill in Supabase credentials:
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] Add reCAPTCHA keys:
  - [ ] NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  - [ ] RECAPTCHA_SECRET_KEY
- [ ] Set NEXT_PUBLIC_APP_URL=http://localhost:3000

### Step 4: Database Setup
- [ ] Open Supabase SQL Editor
- [ ] Copy all SQL from `supabase/migrations/001_initial_schema.sql`
- [ ] Paste into Supabase SQL Editor
- [ ] Click "Run" and wait for completion
- [ ] Verify tables created:
  - [ ] schools
  - [ ] profiles
  - [ ] platform_admins
  - [ ] students
  - [ ] teachers
  - [ ] attendance_records
  - [ ] report_cards
  - [ ] audit_log

### Step 5: Platform Admin Setup
- [ ] Go to Supabase Authentication → Users
- [ ] Create a new user with your email
- [ ] Copy the user's UUID
- [ ] Go to SQL Editor and run:
```sql
INSERT INTO platform_admins (user_id, email, totp_secret)
VALUES (
  'YOUR_USER_UUID_HERE',
  'your-email@example.com',
  'generated-secret-here'
);
```
- [ ] Generate TOTP secret (if needed):
```bash
openssl rand -base64 32
```

### Step 6: Verify Local Development
- [ ] Start dev server: `pnpm dev`
- [ ] Visit http://localhost:3000
- [ ] Verify landing page loads
- [ ] Check navigation links work
- [ ] View Terms and Privacy pages
- [ ] Stop dev server: `Ctrl+C`

## Test Workflows

### Landing Page Testing
- [ ] Load http://localhost:3000 in browser
- [ ] Verify "SchoolHub" branding visible
- [ ] Click "Log In" button → goes to /login
- [ ] Click "Sign Up Your School" → goes to /signup
- [ ] Click footer "Terms of Service" → goes to /terms
- [ ] Click footer "Privacy Policy" → goes to /privacy

### School Registration Testing
- [ ] Start dev server: `pnpm dev`
- [ ] Go to http://localhost:3000/signup
- [ ] Fill form with test school info:
  - [ ] School Name: "Test School ABC"
  - [ ] Full Name: "John Principal"
  - [ ] Work Email: "admin@testschool.com"
  - [ ] Phone: "1234567890"
  - [ ] Password: "SecurePassword123!"
  - [ ] Confirm Password: "SecurePassword123!"
  - [ ] Accept Terms checkbox
- [ ] Complete reCAPTCHA
- [ ] Click "Create Account"
- [ ] You should see "Check Your Email" page
- [ ] Go to Supabase → Authentication → Users
- [ ] Verify new user created with your email

### School Login Testing
- [ ] Go to http://localhost:3000/login
- [ ] Try invalid credentials → should see "Invalid credentials"
- [ ] Use credentials from signup test:
  - [ ] Email: admin@testschool.com
  - [ ] Password: SecurePassword123!
- [ ] Should see login success and redirect to /dashboard

### Platform Admin Login Testing
- [ ] Go to http://localhost:3000/platform-admin-login
- [ ] Enter platform admin email
- [ ] Enter password (set in Supabase)
- [ ] Enter 2FA code (any 6 digits for now, as verification is simplified)
- [ ] Should redirect to /platform-admin
- [ ] Verify platform admin dashboard loads

## Production Deployment (Vercel)

### Step 1: GitHub Preparation
- [ ] Commit all local changes: `git add . && git commit -m "Initial commit"`
- [ ] Push to GitHub: `git push origin main`

### Step 2: Vercel Setup
- [ ] Go to https://vercel.com and sign in
- [ ] Click "Add New..." → "Project"
- [ ] Select GitHub repository containing SchoolHub
- [ ] Click "Import"

### Step 3: Environment Variables in Vercel
- [ ] Go to project Settings → Environment Variables
- [ ] Add all variables from `.env.example`:
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  - [ ] RECAPTCHA_SECRET_KEY
  - [ ] NEXT_PUBLIC_APP_URL (use your Vercel domain, e.g., https://schoolhub-xyz.vercel.app)

### Step 4: Deploy
- [ ] Click "Deploy" button
- [ ] Wait for deployment to complete
- [ ] Note the deployment URL

### Step 5: Production Verification
- [ ] Open deployment URL in browser
- [ ] Verify landing page loads
- [ ] Test login at {URL}/login
- [ ] Test signup at {URL}/signup
- [ ] Test platform admin login at {URL}/platform-admin-login

## Post-Deployment

### Security Hardening
- [ ] Enable Row-Level Security (RLS) in Supabase for all tables
- [ ] Create RLS policies for data isolation by school
- [ ] Enable 2FA enforcement for platform admins
- [ ] Configure email templates in Supabase Auth
- [ ] Setup CORS allowed origins in Supabase

### Monitoring & Logging
- [ ] Setup Sentry (or equivalent) for error tracking
- [ ] Setup monitoring for API rate limits
- [ ] Configure Supabase backup schedule
- [ ] Setup logs aggregation

### Customization
- [ ] Update school name/branding on landing page
- [ ] Customize email templates in Supabase
- [ ] Setup custom domain (optional)
- [ ] Configure analytics (optional)

### Documentation
- [ ] Provide admin with DEPLOYMENT.md
- [ ] Provide admin with ARCHITECTURE.md
- [ ] Create internal documentation for your school
- [ ] Document any customizations made

## Troubleshooting

### Common Issues

**Issue: "Cannot find module '@supabase/supabase-js'"**
- Solution: Run `pnpm install` to ensure all dependencies installed
- Verify `package.json` has @supabase/supabase-js

**Issue: "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"**
- Solution: Ensure `.env.local` exists with all variables from `.env.example`
- Restart dev server after adding env vars

**Issue: Landing page shows but signup/login pages blank**
- Solution: Check browser console for errors
- Verify all env vars are correct
- Check Supabase project is not paused

**Issue: Platform admin login fails**
- Solution: Verify user exists in `platform_admins` table
- Check password is correct
- Try resetting password in Supabase Auth

**Issue: Database migration fails**
- Solution: Check SQL syntax in editor
- Verify you're using correct Supabase project
- Try running migration statements one by one

### Getting Help

1. Check README.md for overview
2. Check DEPLOYMENT.md for setup details
3. Check ARCHITECTURE.md for system design
4. Review API route implementations
5. Check browser console for client-side errors
6. Check Vercel logs for server-side errors

## Verification Checklist (All Items Must Pass)

- [ ] Landing page loads successfully
- [ ] Navigation links work correctly
- [ ] Terms and Privacy pages accessible
- [ ] School signup form works
- [ ] School login works with valid credentials
- [ ] Invalid credentials show appropriate message
- [ ] Platform admin login accessible
- [ ] Platform admin login requires 2FA code
- [ ] Dashboard loads after login (logged-in users only)
- [ ] Logout functionality works
- [ ] All TypeScript files compile without errors
- [ ] No security warnings in console
- [ ] Production build completes successfully
- [ ] Vercel deployment succeeds
- [ ] Production app accessible and functional

## Done!

Once you've completed this checklist, SchoolHub is ready for use!

Next steps:
1. Invite first teacher through admin panel
2. Create sample students and classes
3. Configure academic year and terms
4. Start recording attendance
5. Setup fees and invoices

For additional features and modules, refer to ARCHITECTURE.md.
