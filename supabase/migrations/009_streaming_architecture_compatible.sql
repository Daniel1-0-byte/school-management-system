-- ============================================================================
-- MIGRATION 009: STREAMING ARCHITECTURE - GHANA CURRICULUM
-- ============================================================================
-- Creates system curriculum, classes, subjects, and school streams.
-- Fully PostgreSQL and Supabase compatible.
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ============================================================================
-- 1. SYSTEM CURRICULUMS TABLE
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

-- ============================================================================
-- 2. SYSTEM CLASSES TABLE
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

-- ============================================================================
-- 3. SYSTEM SUBJECTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  short_name VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_system_subjects_code ON public.system_subjects(code);

-- ============================================================================
-- 4. SYSTEM CLASS SUBJECTS MAPPING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.system_classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.system_subjects(id) ON DELETE CASCADE,
  subject_order INTEGER NOT NULL,
  is_core BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_system_class_subjects_class_id ON public.system_class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_system_class_subjects_subject_id ON public.system_class_subjects(subject_id);

-- ============================================================================
-- 5. SCHOOL CLASS STREAMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.school_class_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  system_class_id UUID NOT NULL REFERENCES public.system_classes(id) ON DELETE RESTRICT,
  stream_name VARCHAR(100) NOT NULL,
  capacity INTEGER,
  class_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(school_id, academic_year_id, system_class_id, stream_name)
);

CREATE INDEX IF NOT EXISTS idx_school_class_streams_school_id ON public.school_class_streams(school_id);
CREATE INDEX IF NOT EXISTS idx_school_class_streams_academic_year_id ON public.school_class_streams(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_school_class_streams_system_class_id ON public.school_class_streams(system_class_id);
CREATE INDEX IF NOT EXISTS idx_school_class_streams_status ON public.school_class_streams(status);

-- ============================================================================
-- 6. ADD STREAM REFERENCE COLUMNS TO EXISTING TABLES
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
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.system_curriculums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_class_streams ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. CREATE RLS POLICIES
-- ============================================================================

DO $$
BEGIN
  -- system_curriculums: read-only for all authenticated users
  DROP POLICY IF EXISTS "system_curriculums_select_all" ON public.system_curriculums;
  CREATE POLICY "system_curriculums_select_all" ON public.system_curriculums
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "system_curriculums_insert_blocked" ON public.system_curriculums;
  CREATE POLICY "system_curriculums_insert_blocked" ON public.system_curriculums
    FOR INSERT WITH CHECK (false);

  DROP POLICY IF EXISTS "system_curriculums_update_blocked" ON public.system_curriculums;
  CREATE POLICY "system_curriculums_update_blocked" ON public.system_curriculums
    FOR UPDATE USING (false) WITH CHECK (false);

  DROP POLICY IF EXISTS "system_curriculums_delete_blocked" ON public.system_curriculums;
  CREATE POLICY "system_curriculums_delete_blocked" ON public.system_curriculums
    FOR DELETE USING (false);

  -- system_classes: read-only for all authenticated users
  DROP POLICY IF EXISTS "system_classes_select_all" ON public.system_classes;
  CREATE POLICY "system_classes_select_all" ON public.system_classes
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "system_classes_insert_blocked" ON public.system_classes;
  CREATE POLICY "system_classes_insert_blocked" ON public.system_classes
    FOR INSERT WITH CHECK (false);

  DROP POLICY IF EXISTS "system_classes_update_blocked" ON public.system_classes;
  CREATE POLICY "system_classes_update_blocked" ON public.system_classes
    FOR UPDATE USING (false) WITH CHECK (false);

  DROP POLICY IF EXISTS "system_classes_delete_blocked" ON public.system_classes;
  CREATE POLICY "system_classes_delete_blocked" ON public.system_classes
    FOR DELETE USING (false);

  -- system_subjects: read-only for all authenticated users
  DROP POLICY IF EXISTS "system_subjects_select_all" ON public.system_subjects;
  CREATE POLICY "system_subjects_select_all" ON public.system_subjects
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "system_subjects_insert_blocked" ON public.system_subjects;
  CREATE POLICY "system_subjects_insert_blocked" ON public.system_subjects
    FOR INSERT WITH CHECK (false);

  DROP POLICY IF EXISTS "system_subjects_update_blocked" ON public.system_subjects;
  CREATE POLICY "system_subjects_update_blocked" ON public.system_subjects
    FOR UPDATE USING (false) WITH CHECK (false);

  DROP POLICY IF EXISTS "system_subjects_delete_blocked" ON public.system_subjects;
  CREATE POLICY "system_subjects_delete_blocked" ON public.system_subjects
    FOR DELETE USING (false);

  -- system_class_subjects: read-only for all authenticated users
  DROP POLICY IF EXISTS "system_class_subjects_select_all" ON public.system_class_subjects;
  CREATE POLICY "system_class_subjects_select_all" ON public.system_class_subjects
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "system_class_subjects_insert_blocked" ON public.system_class_subjects;
  CREATE POLICY "system_class_subjects_insert_blocked" ON public.system_class_subjects
    FOR INSERT WITH CHECK (false);

  DROP POLICY IF EXISTS "system_class_subjects_update_blocked" ON public.system_class_subjects;
  CREATE POLICY "system_class_subjects_update_blocked" ON public.system_class_subjects
    FOR UPDATE USING (false) WITH CHECK (false);

  DROP POLICY IF EXISTS "system_class_subjects_delete_blocked" ON public.system_class_subjects;
  CREATE POLICY "system_class_subjects_delete_blocked" ON public.system_class_subjects
    FOR DELETE USING (false);

  -- school_class_streams: school-scoped access
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
-- 9. SEED GHANA EDUCATION SERVICE CURRICULUM
-- ============================================================================

-- Insert curriculum
INSERT INTO public.system_curriculums (name, version, description, is_active)
VALUES (
  'Ghana Basic School Curriculum',
  '2.0',
  'Official curriculum for Ghana Basic Education Certificate (GBEC) programme',
  true
)
ON CONFLICT (name, version) DO NOTHING;

-- Insert system classes
WITH curriculum AS (
  SELECT id FROM public.system_curriculums
  WHERE name = 'Ghana Basic School Curriculum' AND version = '2.0'
)
INSERT INTO public.system_classes (curriculum_id, code, name, display_order)
SELECT c.id, class_data.code, class_data.name, class_data.display_order
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
) AS class_data(code, name, display_order)
ON CONFLICT (curriculum_id, code) DO NOTHING;

-- Insert system subjects
INSERT INTO public.system_subjects (code, name, short_name, description)
VALUES
  ('NUM', 'Numeracy', 'Numeracy', 'Mathematical reasoning and number skills'),
  ('LIT', 'Literacy', 'Literacy', 'Reading and writing skills'),
  ('CA', 'Creative Arts', 'Creative Arts', 'Art, music, and creative expression'),
  ('OWOP', 'Our World and Our People', 'OWOP', 'Environmental and social studies'),
  ('ENG', 'English Language', 'English', 'Communication and literacy in English'),
  ('MATH', 'Mathematics', 'Math', 'Numeracy and mathematical reasoning'),
  ('SCI', 'Science', 'Science', 'Natural sciences and investigation'),
  ('SOCIAL', 'Social Studies', 'Social Studies', 'History, geography, and civic education'),
  ('HG', 'History of Ghana', 'History', 'Ghanaian history and heritage'),
  ('GHANA', 'Ghanaian Language', 'Ghanaian', 'Local language instruction'),
  ('RME', 'Religious and Moral Education', 'RME', 'Ethics and religious studies'),
  ('PE', 'Physical Education', 'PE', 'Sports and physical development'),
  ('FRE', 'French Language', 'French', 'Foreign language instruction'),
  ('ICT', 'Information and Communication Technology', 'ICT', 'Computer literacy and digital skills'),
  ('CT', 'Career Technology', 'Career Tech', 'Practical skills and career exploration')
ON CONFLICT (code) DO NOTHING;

-- Insert system_class_subjects mappings
WITH curriculum AS (
  SELECT id FROM public.system_curriculums
  WHERE name = 'Ghana Basic School Curriculum' AND version = '2.0'
),
subjects_map AS (
  SELECT code, id FROM public.system_subjects
)
INSERT INTO public.system_class_subjects (class_id, subject_id, subject_order, is_core)
SELECT 
  sc.id,
  sj.id,
  mapping.subject_order,
  mapping.is_core
FROM curriculum c
CROSS JOIN public.system_classes sc
CROSS JOIN (
  -- KG1: Numeracy, Literacy, Creative Arts, Our World and Our People
  SELECT 'KG1' AS class_code, 'NUM' AS subj_code, 1 AS subject_order, true AS is_core
  UNION ALL SELECT 'KG1', 'LIT', 2, true
  UNION ALL SELECT 'KG1', 'CA', 3, true
  UNION ALL SELECT 'KG1', 'OWOP', 4, true
  -- KG2: Same as KG1
  UNION ALL SELECT 'KG2', 'NUM', 1, true
  UNION ALL SELECT 'KG2', 'LIT', 2, true
  UNION ALL SELECT 'KG2', 'CA', 3, true
  UNION ALL SELECT 'KG2', 'OWOP', 4, true
  -- B1-B3: English, Math, Science, Social Studies, HG, Ghanaian, RME, Creative Arts, PE
  UNION ALL SELECT 'B1', 'ENG', 1, true
  UNION ALL SELECT 'B1', 'MATH', 2, true
  UNION ALL SELECT 'B1', 'SCI', 3, true
  UNION ALL SELECT 'B1', 'SOCIAL', 4, true
  UNION ALL SELECT 'B1', 'HG', 5, true
  UNION ALL SELECT 'B1', 'GHANA', 6, true
  UNION ALL SELECT 'B1', 'RME', 7, true
  UNION ALL SELECT 'B1', 'CA', 8, false
  UNION ALL SELECT 'B1', 'PE', 9, false
  -- B2: Same as B1
  UNION ALL SELECT 'B2', 'ENG', 1, true
  UNION ALL SELECT 'B2', 'MATH', 2, true
  UNION ALL SELECT 'B2', 'SCI', 3, true
  UNION ALL SELECT 'B2', 'SOCIAL', 4, true
  UNION ALL SELECT 'B2', 'HG', 5, true
  UNION ALL SELECT 'B2', 'GHANA', 6, true
  UNION ALL SELECT 'B2', 'RME', 7, true
  UNION ALL SELECT 'B2', 'CA', 8, false
  UNION ALL SELECT 'B2', 'PE', 9, false
  -- B3: Same as B1
  UNION ALL SELECT 'B3', 'ENG', 1, true
  UNION ALL SELECT 'B3', 'MATH', 2, true
  UNION ALL SELECT 'B3', 'SCI', 3, true
  UNION ALL SELECT 'B3', 'SOCIAL', 4, true
  UNION ALL SELECT 'B3', 'HG', 5, true
  UNION ALL SELECT 'B3', 'GHANA', 6, true
  UNION ALL SELECT 'B3', 'RME', 7, true
  UNION ALL SELECT 'B3', 'CA', 8, false
  UNION ALL SELECT 'B3', 'PE', 9, false
  -- B4-B6: English, Math, Science, Social Studies, HG, Ghanaian, RME, Creative Arts, PE, French, ICT
  UNION ALL SELECT 'B4', 'ENG', 1, true
  UNION ALL SELECT 'B4', 'MATH', 2, true
  UNION ALL SELECT 'B4', 'SCI', 3, true
  UNION ALL SELECT 'B4', 'SOCIAL', 4, true
  UNION ALL SELECT 'B4', 'HG', 5, true
  UNION ALL SELECT 'B4', 'GHANA', 6, true
  UNION ALL SELECT 'B4', 'RME', 7, true
  UNION ALL SELECT 'B4', 'CA', 8, false
  UNION ALL SELECT 'B4', 'PE', 9, false
  UNION ALL SELECT 'B4', 'FRE', 10, false
  UNION ALL SELECT 'B4', 'ICT', 11, false
  -- B5: Same as B4
  UNION ALL SELECT 'B5', 'ENG', 1, true
  UNION ALL SELECT 'B5', 'MATH', 2, true
  UNION ALL SELECT 'B5', 'SCI', 3, true
  UNION ALL SELECT 'B5', 'SOCIAL', 4, true
  UNION ALL SELECT 'B5', 'HG', 5, true
  UNION ALL SELECT 'B5', 'GHANA', 6, true
  UNION ALL SELECT 'B5', 'RME', 7, true
  UNION ALL SELECT 'B5', 'CA', 8, false
  UNION ALL SELECT 'B5', 'PE', 9, false
  UNION ALL SELECT 'B5', 'FRE', 10, false
  UNION ALL SELECT 'B5', 'ICT', 11, false
  -- B6: Same as B4
  UNION ALL SELECT 'B6', 'ENG', 1, true
  UNION ALL SELECT 'B6', 'MATH', 2, true
  UNION ALL SELECT 'B6', 'SCI', 3, true
  UNION ALL SELECT 'B6', 'SOCIAL', 4, true
  UNION ALL SELECT 'B6', 'HG', 5, true
  UNION ALL SELECT 'B6', 'GHANA', 6, true
  UNION ALL SELECT 'B6', 'RME', 7, true
  UNION ALL SELECT 'B6', 'CA', 8, false
  UNION ALL SELECT 'B6', 'PE', 9, false
  UNION ALL SELECT 'B6', 'FRE', 10, false
  UNION ALL SELECT 'B6', 'ICT', 11, false
  -- B7-B9: English, Math, Science, Social Studies, ICT, Creative Arts, Career Tech, RME, Ghanaian, PE
  UNION ALL SELECT 'B7', 'ENG', 1, true
  UNION ALL SELECT 'B7', 'MATH', 2, true
  UNION ALL SELECT 'B7', 'SCI', 3, true
  UNION ALL SELECT 'B7', 'SOCIAL', 4, true
  UNION ALL SELECT 'B7', 'ICT', 5, true
  UNION ALL SELECT 'B7', 'CA', 6, false
  UNION ALL SELECT 'B7', 'CT', 7, false
  UNION ALL SELECT 'B7', 'RME', 8, false
  UNION ALL SELECT 'B7', 'GHANA', 9, false
  UNION ALL SELECT 'B7', 'PE', 10, false
  -- B8: Same as B7
  UNION ALL SELECT 'B8', 'ENG', 1, true
  UNION ALL SELECT 'B8', 'MATH', 2, true
  UNION ALL SELECT 'B8', 'SCI', 3, true
  UNION ALL SELECT 'B8', 'SOCIAL', 4, true
  UNION ALL SELECT 'B8', 'ICT', 5, true
  UNION ALL SELECT 'B8', 'CA', 6, false
  UNION ALL SELECT 'B8', 'CT', 7, false
  UNION ALL SELECT 'B8', 'RME', 8, false
  UNION ALL SELECT 'B8', 'GHANA', 9, false
  UNION ALL SELECT 'B8', 'PE', 10, false
  -- B9: Same as B7
  UNION ALL SELECT 'B9', 'ENG', 1, true
  UNION ALL SELECT 'B9', 'MATH', 2, true
  UNION ALL SELECT 'B9', 'SCI', 3, true
  UNION ALL SELECT 'B9', 'SOCIAL', 4, true
  UNION ALL SELECT 'B9', 'ICT', 5, true
  UNION ALL SELECT 'B9', 'CA', 6, false
  UNION ALL SELECT 'B9', 'CT', 7, false
  UNION ALL SELECT 'B9', 'RME', 8, false
  UNION ALL SELECT 'B9', 'GHANA', 9, false
  UNION ALL SELECT 'B9', 'PE', 10, false
) AS mapping(class_code, subj_code, subject_order, is_core)
CROSS JOIN subjects_map sj
WHERE 
  sc.curriculum_id = c.id
  AND sc.code = mapping.class_code
  AND sj.code = mapping.subj_code
ON CONFLICT (class_id, subject_id) DO NOTHING;

-- ============================================================================
-- 10. AUTO-CREATE DEFAULT STREAMS FOR EXISTING SCHOOLS AND ACADEMIC YEARS
-- ============================================================================

WITH curriculum AS (
  SELECT id FROM public.system_curriculums
  WHERE name = 'Ghana Basic School Curriculum' AND version = '2.0'
),
active_schools AS (
  SELECT id FROM public.schools
  WHERE status = 'active'
),
active_years AS (
  SELECT school_id, id FROM public.academic_years
  WHERE status = 'active'
)
INSERT INTO public.school_class_streams (
  school_id,
  academic_year_id,
  system_class_id,
  stream_name,
  capacity,
  status
)
SELECT 
  ay.school_id,
  ay.id,
  sc.id,
  'Stream A',
  NULL,
  'active'
FROM active_schools acs
CROSS JOIN active_years ay
CROSS JOIN curriculum c
CROSS JOIN public.system_classes sc
WHERE ay.school_id = acs.id
  AND sc.curriculum_id = c.id
ON CONFLICT (school_id, academic_year_id, system_class_id, stream_name) DO NOTHING;

-- ============================================================================
-- 11. MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE public.system_curriculums IS
  'Platform-wide curriculum definitions - Ghana Basic School Curriculum';

COMMENT ON TABLE public.system_classes IS
  'Standard class definitions (KG1-B9) from the official Ghana curriculum';

COMMENT ON TABLE public.system_subjects IS
  'Standard subject definitions from the official Ghana curriculum';

COMMENT ON TABLE public.system_class_subjects IS
  'Official mappings between system classes and their required subjects';

COMMENT ON TABLE public.school_class_streams IS
  'School-specific stream variations of system classes for managing multiple sections';
