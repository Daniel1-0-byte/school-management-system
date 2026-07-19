# SchoolHub Deployment Guide

## Prerequisites

- Node.js 18+ and pnpm
- Supabase account (free tier available at https://supabase.com)
- Google reCAPTCHA v2/v3 keys (free at https://www.google.com/recaptcha/admin)
- Vercel account for deployment (optional, free tier available)

## Step-by-Step Setup

### 1. Create Supabase Project

1. Go to https://supabase.com and create a free account
2. Create a new project (select your preferred region)
3. Note down the following from your project settings:
   - Project URL (NEXT_PUBLIC_SUPABASE_URL)
   - Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Service Role Key (SUPABASE_SERVICE_ROLE_KEY)

### 2. Setup Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Database Migrations

Execute the SQL migration in your Supabase project:

1. Go to Supabase Dashboard → Your Project → SQL Editor
2. Click "New Query" and paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Click "Run" to execute all migrations

This will create:
- `schools` table
- `profiles` table (extends Supabase auth.users)
- `platform_admins` table
- `audit_log` table
- And all related tables for students, teachers, grades, attendance, etc.

### 4. Setup Platform Admin Account

After migrations are complete, you need to create your first Platform Admin:

1. In Supabase, go to Authentication → Users
2. Create a new user with your email (or use an existing one)
3. In the `platform_admins` table, insert a row:
   - `id`: UUID (auto-generated)
   - `user_id`: The UUID of the Supabase user
   - `email`: The admin's email
   - `totp_secret`: Generate with `openssl rand -base64 32`
   - `verified_2fa`: false (set to true after first login if you want 2FA)
   - `created_at`: Current timestamp
   - `updated_at`: Current timestamp

Alternatively, use the Supabase SQL editor:

```sql
INSERT INTO platform_admins (user_id, email, totp_secret)
VALUES (
  'user-uuid-here',
  'admin@example.com',
  'your-generated-secret'
);
```

### 5. Install Dependencies and Run Dev Server

```bash
pnpm install
pnpm dev
```

Visit http://localhost:3000 to see the landing page.

## Application Access

### For School Users (Admins, Teachers, Parents)

- **URL**: https://yourapp.com/login
- **Signup**: https://yourapp.com/signup (School Admins only)
- **Dashboard**: https://yourapp.com/dashboard (after login)

### For Platform Admins

- **Login**: https://yourapp.com/platform-admin-login
- **Dashboard**: https://yourapp.com/platform-admin (after 2FA verification)

## Deploying to Vercel

### 1. Connect GitHub Repository

1. Push your code to GitHub
2. Go to https://vercel.com and sign in
3. Click "Add New..." → "Project"
4. Select your GitHub repository
5. Click "Import"

### 2. Set Environment Variables

In Vercel project settings:

1. Go to Settings → Environment Variables
2. Add all variables from `.env.example`:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NEXT_PUBLIC_RECAPTCHA_SITE_KEY
   - RECAPTCHA_SECRET_KEY
   - NEXT_PUBLIC_APP_URL (use your Vercel domain)

### 3. Deploy

1. Click "Deploy"
2. Wait for deployment to complete
3. Your app is now live!

## Testing Workflow

### 1. Test Landing Page
- Visit home page
- Verify navigation links work
- Check Terms and Privacy pages

### 2. Test School Registration
- Click "Sign Up Your School"
- Fill in test school details
- Verify email verification works (check Supabase Auth)
- Complete First-Login Setup Wizard

### 3. Test Platform Admin Access
- Click login on landing page, then navigate to `/platform-admin-login`
- Enter platform admin credentials
- Verify 2FA code entry screen appears
- Access platform admin dashboard

### 4. Test Role-Based Access
- Create test users with different roles
- Verify access control works via middleware

## Database Schema Overview

### Core Tables
- **schools**: Store school information
- **profiles**: Extended user profiles (links to auth.users)
- **platform_admins**: Super admin accounts (separate from school users)
- **students**: Student records per school
- **teachers**: Teacher/staff records per school
- **academic_years**: Academic year configuration
- **terms**: Terms within academic years
- **grade_entries**: Student grades
- **attendance_records**: Attendance tracking
- **report_cards**: Generated report cards
- **audit_log**: Audit trail for security

## Security Notes

- All database queries use parameterized statements
- Platform admin routes are protected by middleware
- Row-level security (RLS) should be enabled on Supabase tables
- Service role key should only be used in backend (API routes/Server Actions)
- Never expose service role key to the client

## Support

For issues or questions:
1. Check the README.md for architecture overview
2. Review API route implementations in `app/api/`
3. Check middleware.ts for route protection logic
4. Verify all environment variables are set correctly

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
- Run `pnpm install` to ensure all dependencies are installed

### "Missing environment variable"
- Ensure all variables from `.env.example` are set in `.env.local`
- Restart dev server after changing env vars

### Platform admin login fails
- Verify user exists in `platform_admins` table
- Check that SUPABASE_SERVICE_ROLE_KEY is set correctly
- Ensure user's password hash matches

### Supabase connection errors
- Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are correct
- Check that project is not paused in Supabase dashboard
- Verify network connectivity

## Next Steps

After deployment, consider:
1. Setting up custom domain
2. Enabling 2FA for all platform admins
3. Setting up backup strategy for Supabase
4. Configuring email templates in Supabase Auth
5. Setting up monitoring and error tracking (Sentry, etc.)
