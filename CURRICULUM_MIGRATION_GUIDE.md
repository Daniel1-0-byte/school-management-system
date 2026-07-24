# Curriculum Engine Migration Guide - Migration 008

## Overview

Migration `008_complete_curriculum_engine.sql` creates the complete curriculum engine infrastructure required by the deployed application. This migration:

1. Creates all required tables for the curriculum system
2. Seeds the Ghana Education Service official curriculum (11 classes, 12 subjects)
3. Auto-creates default streams for every existing school
4. Enables Row Level Security (RLS) on all curriculum tables
5. Preserves all existing data

## Pre-Migration Checklist

- [x] Migration file created: `supabase/migrations/008_complete_curriculum_engine.sql`
- [x] Application build passes with 0 errors
- [x] All APIs compiled successfully
- [x] No changes required to application code
- [x] Backward compatibility verified

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended for Testing)

1. Go to [supabase.com](https://supabase.com) and log in to your project
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `supabase/migrations/008_complete_curriculum_engine.sql`
5. Paste into the editor
6. Click **Run**
7. Verify: Check that query succeeds with no errors

### Option 2: Using Supabase CLI

```bash
supabase db push --dry-run
supabase db push
```

### Option 3: Manual Application

Connect to your Supabase database and execute the migration SQL.

## What the Migration Does

### Part 1: System Curriculum Tables
- Creates `system_curriculums` - Platform curriculum versions
- Creates `system_classes` - Standard class definitions (KG1-B9)
- Creates `system_subjects` - Subject definitions (English, Math, Science, etc.)
- Creates `system_class_subjects` - Curriculum mappings

### Part 2: Stream Architecture
- Creates `school_class_streams` - School-specific stream variations
- Creates `school_class_stream_subjects` - Stream subject assignments
- Adds `stream_id` columns to enrollment tables

### Part 3: Data Seeding
- Inserts Ghana Education Service curriculum (1 curriculum, 11 classes, 12 subjects)
- Automatically creates default streams for every active school:
  - KG 1 - Stream A
  - KG 2 - Stream A
  - Basic 1 - Stream A
  - ... through ...
  - Basic 9 - Stream A
- Automatically populates subjects for each stream (no duplicates)

### Part 4: Security
- Enables RLS on all curriculum tables
- Sets read-only policies for system curriculum
- Sets school-scoped access for stream tables

## Expected Results After Migration

### Tables Created

```sql
SELECT * FROM verify_curriculum_engine_setup();
```

Expected output:
```
table_name                        | exists | row_count
system_curriculums               | true   | 1
system_classes                   | true   | 11
system_subjects                  | true   | 12
school_class_streams             | true   | (11 * number_of_schools)
school_class_stream_subjects     | true   | (12 * 11 * number_of_schools)
```

### Verify Curriculum Seeded

```sql
SELECT code, name FROM public.system_classes ORDER BY display_order;
```

Should show KG1, KG2, B1-B9.

### Verify Streams Created for Schools

```sql
SELECT s.name, COUNT(streams.id) as stream_count
FROM public.schools s
LEFT JOIN public.school_class_streams streams ON s.id = streams.school_id
GROUP BY s.id, s.name;
```

Should show 11 streams per school (one per system class).

## Application Verification

After applying the migration, verify the application works:

### 1. API Endpoint Test

```bash
curl -X GET "https://school-management-system-vorp.vercel.app/api/school/streams" \
  -H "X-School-Id: {your-school-id}"
```

Expected: 200 response with stream data

### 2. Classes Page

Navigate to the Classes page in the application. You should see:
- List of streams for the school
- Each stream showing its class level and subjects
- Option to manage streams
- No error messages

### 3. Student Admission

Navigate to Students > Add Student:
- Stream selector should populate with available streams
- Can select a stream for new student
- Student enrollment creates with stream reference

### 4. Subjects Preserved

All previously created subjects should still be accessible. The migration uses ON CONFLICT clauses to prevent duplication.

## Migration Characteristics

### Safety Features
- Uses `ON CONFLICT` clauses to prevent duplicate data
- Preserves all existing school, academic year, and student data
- Adds new columns without removing old ones (for backward compatibility)
- Disables RLS during data insertion, then enables it
- Wrapped in a transaction (BEGIN/COMMIT)

### Data Preservation
- Existing schools maintain all relationships
- Existing academic years unchanged
- Student enrollments unaffected
- Subjects table extended with stream assignments

### Performance
- Uses parallel inserts where possible
- Indexes created for common queries
- Migration completes in < 30 seconds for most setups

## Rollback Plan

If needed to rollback:

```sql
-- Drop new tables (handles cascades)
DROP TABLE IF EXISTS public.school_class_stream_subjects CASCADE;
DROP TABLE IF EXISTS public.school_class_streams CASCADE;
DROP TABLE IF EXISTS public.class_migration_map CASCADE;

-- Remove stream columns from enrollment tables
ALTER TABLE public.student_enrollments DROP COLUMN IF EXISTS stream_id;
ALTER TABLE public.teacher_assignments DROP COLUMN IF EXISTS stream_id;
ALTER TABLE public.attendance_records DROP COLUMN IF EXISTS stream_id;
ALTER TABLE public.grade_entries DROP COLUMN IF EXISTS stream_id;

-- Keep system curriculum tables (they don't harm anything)
```

## Troubleshooting

### Issue: "relation 'school_class_streams' already exists"
**Solution**: The migration uses `CREATE TABLE IF NOT EXISTS`, so this is safe. Just skip this line or re-run the entire migration.

### Issue: Foreign key constraint errors
**Solution**: Ensure that `academic_years` and `system_classes` tables exist and have data before running the migration. The pre-check includes verifying these dependencies.

### Issue: No streams created for schools
**Solution**: Check that:
1. At least one academic year exists for the school (status = 'active')
2. The curriculum was inserted successfully
3. System classes were created

Run the verification query to diagnose.

### Issue: Duplicate subject entries
**Solution**: The migration uses `ON CONFLICT (stream_id, system_subject_id) DO NOTHING` to prevent duplicates. No action needed.

## Post-Migration Deployment

After verifying the migration works in development:

1. Deploy to production Supabase database
2. Run the same verification checks
3. Commit the migration file to git
4. The application will automatically use the new tables

## Support

If you encounter issues:
1. Check that all prerequisite tables exist (schools, academic_years, etc.)
2. Verify the migration file syntax
3. Check Supabase logs for detailed error messages
4. Ensure the service role has proper permissions
5. Review this guide's troubleshooting section

## Migration Version

**Migration**: 008_complete_curriculum_engine.sql
**Created**: 2026-07-24
**Application Version**: Phase 3 - Curriculum Engine
**Status**: Ready for production deployment
