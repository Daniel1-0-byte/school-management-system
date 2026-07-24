-- ============================================================================
-- MIGRATION 008: COMPLETE CURRICULUM ENGINE IMPLEMENTATION
-- ============================================================================
-- This is a comprehensive migration that:
-- 1. Creates all curriculum system tables (if not already present)
-- 2. Creates all stream architecture tables
-- 3. Seeds the Ghana Education Service curriculum
-- 4. Auto-creates default streams for every existing school
-- 5. Preserves all existing data
-- 6. Ensures subjects are not duplicated
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: ENSURE SYSTEM CURRICULUM TABLES EXIST
-- ============================================================================

-- System Curriculums (if not exists)
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

-- System Classes (if not exists)
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

-- System Subjects (if not exists)
CREATE TABLE IF NOT EXISTS public.system_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  short_name VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_system_subjects_code ON public.system_subjects(code);

-- System Class Subjects (if not exists)
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

-- ============================================================================
-- PART 2: CREATE SCHOOL STREAMS ARCHITECTURE
-- ============================================================================

-- School Class Streams (if not exists)
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

-- School Class Stream Subjects (if not exists)
CREATE TABLE IF NOT EXISTS public.school_class_stream_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.school_class_streams(id) ON DELETE CASCADE,
  system_subject_id UUID NOT NULL REFERENCES public.system_subjects(id) ON DELETE RESTRICT,
  is_core BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(stream_id, system_subject_id)
);

CREATE INDEX IF NOT EXISTS idx_school_class_stream_subjects_stream_id ON public.school_class_stream_subjects(stream_id);

-- Class Migration Map (for tracking)
CREATE TABLE IF NOT EXISTS public.class_migration_map (
  old_class_id UUID PRIMARY KEY,
  new_stream_id UUID NOT NULL,
  school_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ============================================================================
-- PART 3: ADD STREAM COLUMNS TO ENROLLMENT TABLES
-- ============================================================================

ALTER TABLE public.student_enrollments
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.school_class_streams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_enrollments_stream_id ON public.student_enrollments(stream_id);

ALTER TABLE public.teacher_assignments
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.school_class_streams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_stream_id ON public.teacher_assignments(stream_id);

ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.school_class_streams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_records_stream_id ON public.attendance_records(stream_id);

ALTER TABLE public.grade_entries
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES public.school_class_streams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grade_entries_stream_id ON public.grade_entries(stream_id);

-- ============================================================================
-- PART 4: SEED GHANA EDUCATION SERVICE CURRICULUM
-- ============================================================================

-- Insert curriculum (only if it doesn't exist)
INSERT INTO public.system_curriculums (name, version, description, is_active)
SELECT 'Ghana Basic School Curriculum', 'v1.0', 'Official Ghana Education Service curriculum', true
WHERE NOT EXISTS (SELECT 1 FROM public.system_curriculums WHERE name = 'Ghana Basic School Curriculum' AND version = 'v1.0');

-- Get curriculum ID for use in class insertion
DO $$
DECLARE
  v_curriculum_id UUID;
  v_kg1_id UUID;
  v_kg2_id UUID;
  v_basic1_id UUID;
  v_basic2_id UUID;
  v_basic3_id UUID;
  v_basic4_id UUID;
  v_basic5_id UUID;
  v_basic6_id UUID;
  v_basic7_id UUID;
  v_basic8_id UUID;
  v_basic9_id UUID;
BEGIN
  -- Get curriculum ID
  SELECT id INTO v_curriculum_id FROM public.system_curriculums 
  WHERE name = 'Ghana Basic School Curriculum' AND version = 'v1.0' LIMIT 1;

  IF v_curriculum_id IS NULL THEN
    INSERT INTO public.system_curriculums (name, version, description, is_active)
    VALUES ('Ghana Basic School Curriculum', 'v1.0', 'Official Ghana Education Service curriculum', true)
    RETURNING id INTO v_curriculum_id;
  END IF;

  -- Insert system classes (if not exists)
  INSERT INTO public.system_classes (curriculum_id, code, name, display_order)
  VALUES 
    (v_curriculum_id, 'KG1', 'Kindergarten 1', 1),
    (v_curriculum_id, 'KG2', 'Kindergarten 2', 2),
    (v_curriculum_id, 'B1', 'Basic 1', 3),
    (v_curriculum_id, 'B2', 'Basic 2', 4),
    (v_curriculum_id, 'B3', 'Basic 3', 5),
    (v_curriculum_id, 'B4', 'Basic 4', 6),
    (v_curriculum_id, 'B5', 'Basic 5', 7),
    (v_curriculum_id, 'B6', 'Basic 6', 8),
    (v_curriculum_id, 'B7', 'Basic 7', 9),
    (v_curriculum_id, 'B8', 'Basic 8', 10),
    (v_curriculum_id, 'B9', 'Basic 9', 11)
  ON CONFLICT (curriculum_id, code) DO NOTHING;

  -- Insert subjects (if not exists)
  INSERT INTO public.system_subjects (code, name, short_name, description)
  VALUES
    ('ENGLISH', 'English Language', 'ENG', 'Communication and literacy'),
    ('MATHEMATICS', 'Mathematics', 'MATH', 'Numeracy and problem solving'),
    ('SCIENCE', 'Integrated Science', 'SCI', 'Sciences and technology'),
    ('SOCIAL_STUDIES', 'Social Studies', 'SS', 'Society and environment'),
    ('PE', 'Physical Education', 'PE', 'Sports and fitness'),
    ('VISUAL_ARTS', 'Visual Arts', 'VA', 'Art and creativity'),
    ('MUSIC', 'Music', 'MUS', 'Music and performing arts'),
    ('RELIGION', 'Religious and Moral Education', 'RME', 'Values and ethics'),
    ('ICT', 'Information and Communication Technology', 'ICT', 'Digital literacy'),
    ('FRENCH', 'French Language', 'FR', 'Foreign language'),
    ('GHANAIAN_LANGUAGE', 'Ghanaian Language', 'GL', 'Local language'),
    ('CAREER_GUIDANCE', 'Career Guidance', 'CG', 'Life skills and guidance')
  ON CONFLICT (code) DO NOTHING;

  -- Map subjects to each class (get IDs and create mappings)
  FOR v_kg1_id, v_kg2_id, v_basic1_id, v_basic2_id, v_basic3_id, v_basic4_id, v_basic5_id, v_basic6_id, v_basic7_id, v_basic8_id, v_basic9_id IN
    SELECT 
      (SELECT id FROM public.system_classes WHERE curriculum_id = v_curriculum_id AND code = 'KG1'),
      (SELECT id FROM public.system_classes WHERE curriculum_id = v_curriculum_id AND code = 'KG2'),
      (SELECT id FROM public.system_classes WHERE curriculum_id = v_curriculum_id AND code = 'B1'),
      (SELECT id FROM public.system_classes WHERE curriculum_id = v_curriculum_id AND code = 'B2'),
      (SELECT id FROM public.system_classes WHERE curriculum_id = v_curriculum_id AND code = 'B3'),
      (SELECT id FROM public.system_classes WHERE curriculum_id = v_curriculum_id AND code = 'B4'),
      (SELECT id FROM public.system_classes WHERE curriculum_id = v_curriculum_id AND code = 'B5'),
      (SELECT id FROM public.system_classes WHERE curriculum_id = v_curriculum_id AND code = 'B6'),
      (SELECT id FROM public.system_classes WHERE curriculum_id = v_curriculum_id AND code = 'B7'),
      (SELECT id FROM public.system_classes WHERE curriculum_id = v_curriculum_id AND code = 'B8'),
      (SELECT id FROM public.system_classes WHERE curriculum_id = v_curriculum_id AND code = 'B9')
  LOOP
    EXIT;
  END LOOP;

  -- Insert system_class_subjects mappings for all classes
  INSERT INTO public.system_class_subjects (class_id, subject_id, display_order, is_core)
  SELECT c.id, s.id, ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY s.code), 
    CASE WHEN s.code IN ('ENGLISH', 'MATHEMATICS', 'SCIENCE', 'SOCIAL_STUDIES') THEN true ELSE false END
  FROM public.system_classes c
  CROSS JOIN public.system_subjects s
  WHERE c.curriculum_id = v_curriculum_id
  ON CONFLICT (class_id, subject_id) DO NOTHING;

END $$;

-- ============================================================================
-- PART 5: CREATE DEFAULT STREAMS FOR EXISTING SCHOOLS
-- ============================================================================

DO $$
DECLARE
  v_school RECORD;
  v_academic_year_id UUID;
  v_system_class RECORD;
  v_stream_id UUID;
  v_stream_name VARCHAR(100);
BEGIN
  -- For each school, create streams for all system classes in current/default academic year
  FOR v_school IN SELECT id FROM public.schools WHERE status = 'active' LOOP
    
    -- Get or use the first academic year for the school
    SELECT id INTO v_academic_year_id 
    FROM public.academic_years 
    WHERE school_id = v_school.id 
    AND status = 'active'
    LIMIT 1;

    -- If no academic year exists, skip this school
    IF v_academic_year_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Create a stream for each system class
    FOR v_system_class IN
      SELECT id, name FROM public.system_classes 
      WHERE curriculum_id = (
        SELECT id FROM public.system_curriculums 
        WHERE name = 'Ghana Basic School Curriculum' AND is_active = true LIMIT 1
      )
      ORDER BY display_order
    LOOP
      v_stream_name := v_system_class.name || ' - Stream A';
      
      -- Create stream if it doesn't already exist
      INSERT INTO public.school_class_streams (
        school_id, 
        academic_year_id, 
        system_class_id, 
        stream_name, 
        capacity, 
        status
      )
      VALUES (
        v_school.id,
        v_academic_year_id,
        v_system_class.id,
        v_stream_name,
        40,
        'active'
      )
      ON CONFLICT (school_id, academic_year_id, system_class_id, stream_name) DO NOTHING
      RETURNING id INTO v_stream_id;

      -- Populate subjects for this stream (if stream was created)
      IF v_stream_id IS NOT NULL THEN
        INSERT INTO public.school_class_stream_subjects (stream_id, system_subject_id, is_core)
        SELECT v_stream_id, subject_id, is_core
        FROM public.system_class_subjects
        WHERE class_id = v_system_class.id
        ON CONFLICT (stream_id, system_subject_id) DO NOTHING;
      END IF;

    END LOOP;

  END LOOP;

END $$;

-- ============================================================================
-- PART 6: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on curriculum tables (read-only for all, write for service role only)
ALTER TABLE public.system_curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_class_subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system tables (read-only for all authenticated users)
CREATE POLICY IF NOT EXISTS "system_curriculums_select_all" ON public.system_curriculums
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "system_classes_select_all" ON public.system_classes
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "system_subjects_select_all" ON public.system_subjects
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "system_class_subjects_select_all" ON public.system_class_subjects
  FOR SELECT USING (true);

-- Enable RLS on stream tables
ALTER TABLE public.school_class_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_class_stream_subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school stream tables (school-scoped access)
CREATE POLICY IF NOT EXISTS "school_class_streams_select" ON public.school_class_streams
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY IF NOT EXISTS "school_class_streams_insert" ON public.school_class_streams
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY IF NOT EXISTS "school_class_streams_update" ON public.school_class_streams
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

CREATE POLICY IF NOT EXISTS "school_class_stream_subjects_select" ON public.school_class_stream_subjects
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR stream_id IN (
      SELECT id FROM public.school_class_streams 
      WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY IF NOT EXISTS "school_class_stream_subjects_insert" ON public.school_class_stream_subjects
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR stream_id IN (
      SELECT id FROM public.school_class_streams 
      WHERE school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

-- ============================================================================
-- PART 7: MIGRATION VERIFICATION
-- ============================================================================

-- Verify tables exist
CREATE OR REPLACE FUNCTION verify_curriculum_engine_setup()
RETURNS TABLE(
  table_name TEXT,
  exists BOOLEAN,
  row_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'system_curriculums'::TEXT, 
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'system_curriculums'),
    (SELECT COUNT(*) FROM public.system_curriculums)::BIGINT;
  
  RETURN QUERY
  SELECT 'system_classes'::TEXT,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'system_classes'),
    (SELECT COUNT(*) FROM public.system_classes)::BIGINT;
  
  RETURN QUERY
  SELECT 'system_subjects'::TEXT,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'system_subjects'),
    (SELECT COUNT(*) FROM public.system_subjects)::BIGINT;
  
  RETURN QUERY
  SELECT 'school_class_streams'::TEXT,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'school_class_streams'),
    (SELECT COUNT(*) FROM public.school_class_streams)::BIGINT;
  
  RETURN QUERY
  SELECT 'school_class_stream_subjects'::TEXT,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'school_class_stream_subjects'),
    (SELECT COUNT(*) FROM public.school_class_stream_subjects)::BIGINT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.school_class_streams IS 
  'Streams are variations of system classes created by schools within the curriculum engine.';

COMMENT ON TABLE public.school_class_stream_subjects IS 
  'Auto-generated subject assignments for streams, inherited from Ghana Education Service curriculum.';

COMMIT;
