# Streaming Architecture Migration - Deployment Guide

## Overview

Migration 009 (`streaming_architecture_compatible.sql`) adds streaming architecture support to the production database while maintaining full compatibility with existing data.

## What This Migration Does

### Creates New Tables (if not present)
1. **system_curriculums** - Platform curriculum versions
2. **system_classes** - Official class definitions (KG1, B1-B9)
3. **system_subjects** - Official subjects (12 total)
4. **system_class_subjects** - Subject-class mappings
5. **school_class_streams** - School-specific stream variations

### Adds Columns (if not present)
- `stream_id` to student_enrollments
- `stream_id` to teacher_assignments
- `stream_id` to attendance_records
- `stream_id` to grade_entries

### Seeds Curriculum Data
- Ghana Basic School Curriculum (official)
- 11 system classes (KG1, KG2, B1-B9)
- 12 subjects (English, Math, Science, Social Studies, PE, Arts, Music, RME, ICT, French, Ghanaian, Career Guidance)
- All subject-class mappings (132 total across all classes)

### Enables Security
- Row-level security on all new tables
- Read-only curriculum tables for schools
- School-scoped streams access control

## Deployment Steps

### Step 1: Access Supabase Dashboard
1. Go to https://app.supabase.com
2. Select the school-management-system project
3. Navigate to SQL Editor

### Step 2: Run the Migration
1. Open `/supabase/migrations/009_streaming_architecture_compatible.sql`
2. Copy the entire file contents
3. In Supabase SQL Editor, paste and execute

### Step 3: Verify Success

Run these queries to confirm:

```sql
-- Check curriculum tables exist
SELECT COUNT(*) FROM system_curriculums;
SELECT COUNT(*) FROM system_classes;
SELECT COUNT(*) FROM system_subjects;
SELECT COUNT(*) FROM system_class_subjects;

-- Expected results:
-- system_curriculums: 1
-- system_classes: 11 (KG1, KG2, B1-B9)
-- system_subjects: 12
-- system_class_subjects: 132 (12 subjects × 11 classes)

-- Check stream columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'student_enrollments' AND column_name = 'stream_id';
-- Should return 1 row
```

### Step 4: Deploy Application Changes

The application code is already updated to use the new schema:

1. **APIs** - All school APIs work with both old (school_classes) and new (streams) patterns
2. **Services** - StreamService, CurriculumService ready
3. **UI** - Classes page displays streams, student form has stream selector
4. **Transformers** - All transformers handle stream data

Just deploy the current branch to Vercel:

```bash
git push origin master
```

## Backward Compatibility

This migration is fully backward compatible:

- **Existing data preserved** - All student, teacher, grade, attendance records remain unchanged
- **Nullable stream_id** - Stream columns are nullable (can be NULL for legacy data)
- **No table deletions** - All existing tables remain, no data loss
- **Optional usage** - New stream_id columns only used when explicitly set

## What's Not Included

Per requirements, this migration does NOT create:
- `school_class_stream_subjects` (reuse existing subjects table instead)

The application reuses the existing `subjects` table for stream subjects via queries.

## Rollback

If needed, you can manually remove the new tables:

```sql
DROP TABLE IF EXISTS school_class_streams CASCADE;
DROP TABLE IF EXISTS system_class_subjects CASCADE;
DROP TABLE IF EXISTS system_subjects CASCADE;
DROP TABLE IF EXISTS system_classes CASCADE;
DROP TABLE IF EXISTS system_curriculums CASCADE;

-- Remove stream_id columns (optional - can leave as NULL columns)
ALTER TABLE student_enrollments DROP COLUMN IF EXISTS stream_id;
ALTER TABLE teacher_assignments DROP COLUMN IF EXISTS stream_id;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS stream_id;
ALTER TABLE grade_entries DROP COLUMN IF EXISTS stream_id;
```

## Application Status After Migration

✓ **Deployable** - No code changes needed, all APIs updated
✓ **Build passing** - Zero TypeScript/runtime errors
✓ **Zero data loss** - All existing records preserved
✓ **RLS secured** - New tables have proper access control
✓ **Curriculum ready** - Ghana education official curriculum seeded

## Next Steps

After deployment, the application supports:

1. **Curriculum Management** - Platform admins manage curriculum (view via `/api/curriculum/curriculums`)
2. **Stream Creation** - Schools create streams via Classes page
3. **Student Enrollment** - Students enroll to streams via student form
4. **Subject Assignment** - Subjects auto-assigned from curriculum to streams
5. **Classes Display** - Classes page shows streams with subjects

## Support

If the migration fails:

1. Check Supabase logs for error details
2. Verify the SQL syntax (migration uses IF NOT EXISTS for safety)
3. Ensure all foreign key tables exist (schools, academic_years, profiles)
4. Contact support with the error message

The migration is idempotent - it's safe to run multiple times.
