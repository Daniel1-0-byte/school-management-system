# Database Setup Guide

## Overview

The application requires certain tables to be created in Supabase. These tables are defined in migration files but may not have been applied to your database yet.

## Missing Tables Error

If you see this error:
```
Could not find the table 'public.school_requests' in the schema cache
```

It means the `school_requests` table (and possibly `platform_settings`) need to be created.

## Solution: Run SQL Setup

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the SQL from `/supabase/manual-setup.sql` in this project
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl+Enter)

### Option 2: Using Node Script (if env vars are set)

```bash
# Make sure your environment variables are set
export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Run the setup script
node scripts/setup-database.js
```

### Option 3: Manual SQL

Copy and run this SQL in your Supabase SQL Editor:

```sql
-- Create school_requests table
CREATE TABLE IF NOT EXISTS public.school_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  location VARCHAR(255),
  requested_plan VARCHAR(50) NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'provisioned')),
  rejection_reason TEXT,
  rejection_notes TEXT,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_school_requests_status ON public.school_requests(status);
CREATE INDEX IF NOT EXISTS idx_school_requests_email ON public.school_requests(email);
CREATE INDEX IF NOT EXISTS idx_school_requests_submitted_at ON public.school_requests(submitted_at DESC);

-- Create platform_settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB,
  setting_type VARCHAR(50),
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(setting_key);
```

## What These Tables Do

### school_requests
- Stores incoming school signup requests
- Platform admins review and approve/reject requests
- Data populated when users sign up
- Status: `pending`, `approved`, `rejected`, `provisioned`

### platform_settings
- Stores system-wide settings managed by platform admins
- Persists platform configuration (site name, maintenance mode, etc.)
- Used by the Platform Admin Settings page

## Verification

After running the SQL, verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema='public' 
AND table_name IN ('school_requests', 'platform_settings');
```

You should see:
```
table_name
─────────────────────
school_requests
platform_settings
```

## Next Steps

1. Run the SQL setup above
2. Restart your application
3. Test signup - school request should now appear in platform admin dashboard
4. Platform admin can view and approve/reject schools

## Troubleshooting

### Still getting PGRST205 error?
- Refresh your browser (Ctrl+F5)
- Clear browser cache
- Wait 30 seconds for Supabase to cache the schema

### Permission denied error?
- Make sure you're using `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- This key is secret - only use in backend/scripts, never in frontend

### Column already exists error?
- This is normal if you already have partial tables
- The `CREATE TABLE IF NOT EXISTS` prevents duplicates
- Just proceed - the indexes will be created if missing

## For Production

Once you have a stable schema, you should:
1. Keep migration files in `/supabase/migrations/` updated
2. Use a migration tool for proper version control
3. Test migrations in staging before production
