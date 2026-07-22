-- ============================================================================
-- PHASE 2: CURRICULUM ADOPTION - CENTRALIZED CURRICULUM FOR ALL SCHOOLS
-- ============================================================================
-- This migration implements the second phase of curriculum management:
-- - Schools move away from managing classes and subjects directly
-- - Instead, schools create "streams" which are variations of system classes
-- - Subjects are inherited from the system curriculum (no manual creation)
-- - Existing school data is preserved during migration
-- ============================================================================

-- Add curriculum tracking to schools
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS active_curriculum_id UUID REFERENCES public.system_curriculums(id) ON DELETE SET NULL;

-- Add status tracking to schools
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS curriculum_status TEXT DEFAULT 'not_setup' CHECK (curriculum_status IN ('not_setup', 'setup_in_progress', 'active'));

-- ============================================================================
-- SCHOOL CLASS STREAMS TABLE - NEW STRUCTURE
-- ============================================================================
-- Schools create streams, not classes
-- A stream is a variation of a system class (e.g., "Basic 1 Stream A", "Basic 1 Stream B")

CREATE TABLE IF NOT EXISTS public.school_class_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  system_class_id UUID NOT NULL REFERENCES public.system_classes(id) ON DELETE RESTRICT,
  stream_name VARCHAR(100) NOT NULL,
  capacity INTEGER,
  class_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(school_id, academic_year_id, system_class_id, stream_name)
);

CREATE INDEX idx_school_class_streams_school_id ON public.school_class_streams(school_id);
CREATE INDEX idx_school_class_streams_academic_year_id ON public.school_class_streams(academic_year_id);
CREATE INDEX idx_school_class_streams_system_class_id ON public.school_class_streams(system_class_id);
CREATE INDEX idx_school_class_streams_status ON public.school_class_streams(status);

-- ============================================================================
-- SCHOOL SUBJECT ASSIGNMENTS - AUTO-GENERATED FROM CURRICULUM
-- ============================================================================
-- Schools don't create subjects anymore - they inherit from system_class_subjects

CREATE TABLE IF NOT EXISTS public.school_class_stream_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.school_class_streams(id) ON DELETE CASCADE,
  system_subject_id UUID NOT NULL REFERENCES public.system_subjects(id) ON DELETE RESTRICT,
  is_core BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(stream_id, system_subject_id)
);

CREATE INDEX idx_school_class_stream_subjects_stream_id ON public.school_class_stream_subjects(stream_id);
CREATE INDEX idx_school_class_stream_subjects_system_subject_id ON public.school_class_stream_subjects(system_subject_id);

-- ============================================================================
-- MIGRATION: Map old school_classes to new streams (preserve data)
-- ============================================================================

-- Create mapping table to track old → new IDs
CREATE TABLE IF NOT EXISTS public.class_migration_map (
  old_class_id UUID PRIMARY KEY,
  new_stream_id UUID NOT NULL,
  school_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Disable RLS during migration, will re-enable after data is migrated
ALTER TABLE public.school_class_streams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_class_stream_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_migration_map DISABLE ROW LEVEL SECURITY;

-- Enable after migration:
ALTER TABLE public.school_class_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_class_streams_select" ON public.school_class_streams
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY "school_class_streams_insert_admin" ON public.school_class_streams
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY "school_class_streams_update_admin" ON public.school_class_streams
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY "school_class_streams_delete_admin" ON public.school_class_streams
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

ALTER TABLE public.school_class_stream_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_class_stream_subjects_select" ON public.school_class_stream_subjects
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR stream_id IN (
      SELECT id FROM public.school_class_streams 
      WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "school_class_stream_subjects_insert_admin" ON public.school_class_stream_subjects
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR stream_id IN (
      SELECT id FROM public.school_class_streams 
      WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

-- ============================================================================
-- UPDATE FOREIGN KEY REFERENCES
-- ============================================================================
-- These tables need to reference streams instead of classes now:
-- - student_enrollments
-- - teacher_assignments  
-- - attendance_records
-- - grade_entries
-- These will be updated via data migration script, not in this migration

-- ============================================================================
-- MIGRATION STATUS AND NOTES
-- ============================================================================
-- This migration creates the new schema but does NOT migrate data
-- A separate data migration script will:
-- 1. Insert all active_curriculum_id for schools
-- 2. Map old school_classes to new school_class_streams
-- 3. Create school_class_stream_subjects from system_class_subjects
-- 4. Update foreign keys in student_enrollments, teacher_assignments, etc.
-- 5. Remove old school_classes and school_subjects records

COMMENT ON TABLE public.school_class_streams IS 
  'Streams are variations of system classes created by schools. Schools no longer own classes.';

COMMENT ON TABLE public.school_class_stream_subjects IS 
  'Auto-generated subject assignments for streams, inherited from system curriculum.';
