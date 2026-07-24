-- ============================================================================
-- MIGRATION 009: STREAMING ARCHITECTURE - COMPATIBLE WITH EXISTING SCHEMA
-- ============================================================================
-- This migration creates the minimal set of tables needed for stream-based
-- curriculum architecture while maintaining compatibility with existing data.
--
-- DOES NOT create school_class_stream_subjects (reuse existing subjects table)
-- DOES reuse school_classes structure where possible
-- PRESERVES all existing student, teacher, grade, attendance data
-- ============================================================================

-- ============================================================================
-- SYSTEM CURRICULUM TABLES (if not already created)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_curriculums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(name, version)
);

CREATE INDEX IF NOT EXISTS idx_system_curriculums_is_active ON public.system_curriculums(is_active);
CREATE INDEX IF NOT EXISTS idx_system_curriculums_created_at ON public.system_curriculums(created_at DESC);

-- ============================================================================
-- SYSTEM CLASSES TABLE (if not already created)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID NOT NULL REFERENCES public.system_curriculums(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(curriculum_id, code)
);

CREATE INDEX IF NOT EXISTS idx_system_classes_curriculum_id ON public.system_classes(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_system_classes_code ON public.system_classes(code);
CREATE INDEX IF NOT EXISTS idx_system_classes_display_order ON public.system_classes(display_order);

-- ============================================================================
-- SYSTEM SUBJECTS TABLE (if not already created)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  short_name VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(code)
);

CREATE INDEX IF NOT EXISTS idx_system_subjects_code ON public.system_subjects(code);
CREATE INDEX IF NOT EXISTS idx_system_subjects_name ON public.system_subjects(name);

-- ============================================================================
-- SYSTEM CLASS SUBJECTS MAPPING (if not already created)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.system_classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.system_subjects(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  is_core BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_system_class_subjects_class_id ON public.system_class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_system_class_subjects_subject_id ON public.system_class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_system_class_subjects_display_order ON public.system_class_subjects(display_order);

-- ============================================================================
-- SCHOOL CLASS STREAMS TABLE (if not already created)
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_school_class_streams_school_id ON public.school_class_streams(school_id);
CREATE INDEX IF NOT EXISTS idx_school_class_streams_academic_year_id ON public.school_class_streams(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_school_class_streams_system_class_id ON public.school_class_streams(system_class_id);
CREATE INDEX IF NOT EXISTS idx_school_class_streams_status ON public.school_class_streams(status);

-- ============================================================================
-- ADD STREAM REFERENCE COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add stream_id to student_enrollments (nullable for backward compatibility)
ALTER TABLE public.student_enrollments
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.school_class_streams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_enrollments_stream_id ON public.student_enrollments(stream_id);

-- Add stream_id to teacher_assignments (nullable for backward compatibility)
ALTER TABLE public.teacher_assignments
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.school_class_streams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_stream_id ON public.teacher_assignments(stream_id);

-- Add stream_id to attendance_records (nullable for backward compatibility)
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.school_class_streams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_records_stream_id ON public.attendance_records(stream_id);

-- Add stream_id to grade_entries (nullable for backward compatibility)
ALTER TABLE public.grade_entries
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.school_class_streams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grade_entries_stream_id ON public.grade_entries(stream_id);

-- ============================================================================
-- ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE public.system_curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_class_streams ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES (PostgreSQL-compatible with DROP/CREATE pattern)
-- ============================================================================

DO $$
BEGIN
  -- system_curriculums policies (read-only for authenticated users)
  DROP POLICY IF EXISTS "system_curriculums_select_all" ON public.system_curriculums;
  CREATE POLICY "system_curriculums_select_all" ON public.system_curriculums
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "system_curriculums_insert_admin_only" ON public.system_curriculums;
  CREATE POLICY "system_curriculums_insert_admin_only" ON public.system_curriculums
    FOR INSERT WITH CHECK (false);

  DROP POLICY IF EXISTS "system_curriculums_update_admin_only" ON public.system_curriculums;
  CREATE POLICY "system_curriculums_update_admin_only" ON public.system_curriculums
    FOR UPDATE USING (false) WITH CHECK (false);

  -- system_classes policies (read-only for authenticated users)
  DROP POLICY IF EXISTS "system_classes_select_all" ON public.system_classes;
  CREATE POLICY "system_classes_select_all" ON public.system_classes
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "system_classes_insert_admin_only" ON public.system_classes;
  CREATE POLICY "system_classes_insert_admin_only" ON public.system_classes
    FOR INSERT WITH CHECK (false);

  DROP POLICY IF EXISTS "system_classes_update_admin_only" ON public.system_classes;
  CREATE POLICY "system_classes_update_admin_only" ON public.system_classes
    FOR UPDATE USING (false) WITH CHECK (false);

  -- system_subjects policies (read-only for authenticated users)
  DROP POLICY IF EXISTS "system_subjects_select_all" ON public.system_subjects;
  CREATE POLICY "system_subjects_select_all" ON public.system_subjects
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "system_subjects_insert_admin_only" ON public.system_subjects;
  CREATE POLICY "system_subjects_insert_admin_only" ON public.system_subjects
    FOR INSERT WITH CHECK (false);

  DROP POLICY IF EXISTS "system_subjects_update_admin_only" ON public.system_subjects;
  CREATE POLICY "system_subjects_update_admin_only" ON public.system_subjects
    FOR UPDATE USING (false) WITH CHECK (false);

  -- system_class_subjects policies (read-only for authenticated users)
  DROP POLICY IF EXISTS "system_class_subjects_select_all" ON public.system_class_subjects;
  CREATE POLICY "system_class_subjects_select_all" ON public.system_class_subjects
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "system_class_subjects_insert_admin_only" ON public.system_class_subjects;
  CREATE POLICY "system_class_subjects_insert_admin_only" ON public.system_class_subjects
    FOR INSERT WITH CHECK (false);

  DROP POLICY IF EXISTS "system_class_subjects_update_admin_only" ON public.system_class_subjects;
  CREATE POLICY "system_class_subjects_update_admin_only" ON public.system_class_subjects
    FOR UPDATE USING (false) WITH CHECK (false);

  -- school_class_streams policies (school-scoped access)
  DROP POLICY IF EXISTS "school_class_streams_select" ON public.school_class_streams;
  CREATE POLICY "school_class_streams_select" ON public.school_class_streams
    FOR SELECT USING (
      auth.uid() IS NULL 
      OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    );

  DROP POLICY IF EXISTS "school_class_streams_insert" ON public.school_class_streams;
  CREATE POLICY "school_class_streams_insert" ON public.school_class_streams
    FOR INSERT WITH CHECK (
      auth.uid() IS NULL 
      OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    );

  DROP POLICY IF EXISTS "school_class_streams_update" ON public.school_class_streams;
  CREATE POLICY "school_class_streams_update" ON public.school_class_streams
    FOR UPDATE USING (
      auth.uid() IS NULL 
      OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    );

  DROP POLICY IF EXISTS "school_class_streams_delete" ON public.school_class_streams;
  CREATE POLICY "school_class_streams_delete" ON public.school_class_streams
    FOR DELETE USING (
      auth.uid() IS NULL 
      OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    );

EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- SEED GHANA EDUCATION SERVICE CURRICULUM
-- ============================================================================

-- Insert the official Ghana curriculum (if not already present)
INSERT INTO public.system_curriculums (name, version, description, is_active)
VALUES (
  'Ghana Basic School Curriculum',
  '2.0',
  'Official curriculum for Ghana Basic Education Certificate (GBEC) programme',
  true
)
ON CONFLICT (name, version) DO NOTHING;

-- Insert system classes (if not already present)
WITH curriculum AS (
  SELECT id FROM public.system_curriculums 
  WHERE name = 'Ghana Basic School Curriculum' AND version = '2.0'
)
INSERT INTO public.system_classes (curriculum_id, code, name, display_order)
SELECT 
  c.id, 
  class_code, 
  class_name, 
  class_order
FROM curriculum c,
(VALUES
  ('KG1', 'Kindergarten 1', 1),
  ('KG2', 'Kindergarten 2', 2),
  ('B1', 'Basic 1', 3),
  ('B2', 'Basic 2', 4),
  ('B3', 'Basic 3', 5),
  ('B4', 'Basic 4', 6),
  ('B5', 'Basic 5', 7),
  ('B6', 'Basic 6', 8),
  ('B7', 'Basic 7', 9),
  ('B8', 'Basic 8', 10),
  ('B9', 'Basic 9', 11)
) AS classes(class_code, class_name, class_order)
ON CONFLICT (curriculum_id, code) DO NOTHING;

-- Insert system subjects (if not already present)
INSERT INTO public.system_subjects (code, name, short_name, description)
VALUES
  ('ENG', 'English Language', 'English', 'Communication and literacy in English'),
  ('MATH', 'Mathematics', 'Math', 'Numeracy and mathematical reasoning'),
  ('SCI', 'Science', 'Science', 'Natural sciences and investigation'),
  ('SOCIAL', 'Social Studies', 'Social Studies', 'History, geography, and civic education'),
  ('PE', 'Physical Education', 'PE', 'Sports and physical development'),
  ('ART', 'Visual Arts', 'Arts', 'Drawing, painting, and art appreciation'),
  ('MUS', 'Music', 'Music', 'Musical theory and performance'),
  ('RME', 'Religious and Moral Education', 'RME', 'Ethics and religious studies'),
  ('ICT', 'Information and Communication Technology', 'ICT', 'Computer literacy and digital skills'),
  ('FRE', 'French Language', 'French', 'Foreign language instruction'),
  ('GHANA', 'Ghanaian Language', 'Ghanaian', 'Local language instruction'),
  ('CG', 'Career Guidance', 'Career', 'Career exploration and guidance')
ON CONFLICT (code) DO NOTHING;

-- Create system_class_subjects mappings (if not already present)
WITH curriculum AS (
  SELECT id FROM public.system_curriculums 
  WHERE name = 'Ghana Basic School Curriculum' AND version = '2.0'
),
subjects_by_code AS (
  SELECT code, id FROM public.system_subjects
)
INSERT INTO public.system_class_subjects (class_id, subject_id, display_order, is_core)
SELECT 
  sc.id,
  sb.id,
  mapping.order,
  mapping.is_core
FROM curriculum c
CROSS JOIN public.system_classes sc
CROSS JOIN (
  VALUES
    ('ENG', 1, true),
    ('MATH', 2, true),
    ('SCI', 3, true),
    ('SOCIAL', 4, true),
    ('PE', 5, false),
    ('ART', 6, false),
    ('MUS', 7, false),
    ('RME', 8, false),
    ('ICT', 9, false),
    ('FRE', 10, false),
    ('GHANA', 11, false),
    ('CG', 12, false)
) AS mapping(code, order, is_core)
CROSS JOIN subjects_by_code sb
WHERE 
  sc.curriculum_id = c.id
  AND sb.code = mapping.code
ON CONFLICT (class_id, subject_id) DO NOTHING;

-- ============================================================================
-- COMPLETION STATUS
-- ============================================================================

COMMENT ON TABLE public.system_curriculums IS 
  'Platform-wide curriculum definitions managed by admins';

COMMENT ON TABLE public.system_classes IS 
  'Standard class definitions from the official curriculum';

COMMENT ON TABLE public.system_subjects IS 
  'Standard subject definitions from the official curriculum';

COMMENT ON TABLE public.system_class_subjects IS 
  'Mappings between system classes and their official subjects';

COMMENT ON TABLE public.school_class_streams IS 
  'School-specific stream variations of system classes';
