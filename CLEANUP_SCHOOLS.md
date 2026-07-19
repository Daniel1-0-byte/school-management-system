# Cleaning Up Test School Data

This guide explains how to remove all previously submitted school signup data so schools can retry registration with the same email addresses.

## Quick Start

### Option 1: Using the Interactive Script (Recommended)

```bash
# From the project root
npm run clean:schools
```

This will:
1. Prompt you for your Supabase credentials
2. Show you all schools, profiles, and requests to be deleted
3. Ask for confirmation before deleting
4. Remove all test data

### Option 2: Manual SQL (Direct Database Access)

If you have direct Supabase access via their dashboard:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a new query
3. Paste this SQL:

```sql
-- Delete all school data to allow retry signups
-- WARNING: This is irreversible!

-- Step 1: Delete profiles associated with schools
DELETE FROM profiles 
WHERE school_id IS NOT NULL;

-- Step 2: Delete school subscriptions
DELETE FROM school_subscriptions;

-- Step 3: Delete school admin invites
DELETE FROM school_admin_invites;

-- Step 4: Delete schools
DELETE FROM schools;

-- Step 5: Delete school requests
DELETE FROM school_requests;

-- Verify all deleted
SELECT 
  (SELECT COUNT(*) FROM schools) as schools_count,
  (SELECT COUNT(*) FROM school_requests) as requests_count,
  (SELECT COUNT(*) FROM profiles WHERE school_id IS NOT NULL) as school_profiles;
```

4. Click "Run"
5. Verify the counts show 0 for all three tables

## What Gets Deleted

The cleanup removes:

1. **Schools** - All school registrations
2. **School Requests** - All pending approval requests
3. **Profiles** - All users associated with schools
4. **School Subscriptions** - All subscription records
5. **School Admin Invites** - All pending admin invitations

## After Cleanup

- Schools can sign up again with the same email addresses
- All previous data is permanently removed
- No users or profiles remain connected to those schools
- The system is reset for fresh testing

## Environment Variables Needed

For the Node.js script, you'll need:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin access)

Set these in your shell before running:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npm run clean:schools
```

## Troubleshooting

### "Credentials not found"
- Make sure environment variables are set in your `.env` file
- Or use the interactive script which will prompt you for credentials

### "Foreign key constraint violation"
- The script is designed to delete in the correct order
- If you still get this error, you may have additional tables referencing schools
- Check the database schema for any custom tables

### "Cannot delete - data still references schools"
- There might be related data in other tables
- Contact support with the specific error message

## Logs

The cleanup script logs all actions with `[v0]` prefix for easy tracking:

```
[v0] Found 3 schools to delete:
  - Armed Forces Academy
  - Test School
  - Demo Institution

[v0] Found 15 profiles to delete
[v0] Found 3 school requests to delete
[v0] Deleting 3 schools...
[v0] ✓ Schools deleted
[v0] Cleanup completed successfully!
```

## More Information

- **Script Location**: `scripts/clean-schools-interactive.mjs`
- **Non-interactive Version**: `scripts/clean-test-schools.mjs`
- **Database**: Supabase PostgreSQL
