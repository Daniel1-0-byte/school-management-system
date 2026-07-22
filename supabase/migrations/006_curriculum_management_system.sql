-- ============================================================================
-- CURRICULUM MANAGEMENT SYSTEM TABLES
-- ============================================================================
-- This migration creates the centralized curriculum engine that replaces
-- school-owned Classes and Subjects. All schools inherit the platform's
-- official curriculum (Ghana Basic School curriculum).
--
-- Tables:
-- 1. system_curriculums - Platform-wide curriculum versions
-- 2. system_classes - Standard class definitions (KG1, Basic1, etc.)
-- 3. system_subjects - Standard subject definitions
-- 4. system_class_subjects - Mappings between classes and subjects
-- ============================================================================

-- ============================================================================
-- SYSTEM CURRICULUMS TABLE
-- ============================================================================
CREATE TABLE public.system_curriculums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(name, version)
);

CREATE INDEX idx_system_curriculums_is_active ON public.system_curriculums(is_active);
CREATE INDEX idx_system_curriculums_created_at ON public.system_curriculums(created_at DESC);

-- ============================================================================
-- SYSTEM CLASSES TABLE
-- ============================================================================
CREATE TABLE public.system_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID NOT NULL REFERENCES public.system_curriculums(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(curriculum_id, code)
);

CREATE INDEX idx_system_classes_curriculum_id ON public.system_classes(curriculum_id);
CREATE INDEX idx_system_classes_code ON public.system_classes(code);
CREATE INDEX idx_system_classes_display_order ON public.system_classes(display_order);

-- ============================================================================
-- SYSTEM SUBJECTS TABLE
-- ============================================================================
CREATE TABLE public.system_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  short_name VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(code)
);

CREATE INDEX idx_system_subjects_code ON public.system_subjects(code);
CREATE INDEX idx_system_subjects_name ON public.system_subjects(name);

-- ============================================================================
-- SYSTEM CLASS SUBJECTS MAPPING TABLE
-- ============================================================================
CREATE TABLE public.system_class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.system_classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.system_subjects(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  is_core BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(class_id, subject_id)
);

CREATE INDEX idx_system_class_subjects_class_id ON public.system_class_subjects(class_id);
CREATE INDEX idx_system_class_subjects_subject_id ON public.system_class_subjects(subject_id);
CREATE INDEX idx_system_class_subjects_display_order ON public.system_class_subjects(display_order);

-- ============================================================================
-- RLS POLICIES FOR CURRICULUM TABLES
-- ============================================================================
-- All curriculum tables are read-only for schools
-- Only platform admins can write/modify curriculum data

-- system_curriculums - Platform admin only for write, all users can read
ALTER TABLE public.system_curriculums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_curriculums_select_all" ON public.system_curriculums
  FOR SELECT
  USING (true); -- All authenticated users can read curricula

CREATE POLICY "system_curriculums_insert_admin_only" ON public.system_curriculums
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL); -- Only service role (admin context) can insert

CREATE POLICY "system_curriculums_update_admin_only" ON public.system_curriculums
  FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "system_curriculums_delete_admin_only" ON public.system_curriculums
  FOR DELETE
  USING (auth.uid() IS NULL);

-- system_classes - Platform admin only for write, all users can read
ALTER TABLE public.system_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_classes_select_all" ON public.system_classes
  FOR SELECT
  USING (true); -- All authenticated users can read classes

CREATE POLICY "system_classes_insert_admin_only" ON public.system_classes
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "system_classes_update_admin_only" ON public.system_classes
  FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "system_classes_delete_admin_only" ON public.system_classes
  FOR DELETE
  USING (auth.uid() IS NULL);

-- system_subjects - Platform admin only for write, all users can read
ALTER TABLE public.system_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_subjects_select_all" ON public.system_subjects
  FOR SELECT
  USING (true); -- All authenticated users can read subjects

CREATE POLICY "system_subjects_insert_admin_only" ON public.system_subjects
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "system_subjects_update_admin_only" ON public.system_subjects
  FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "system_subjects_delete_admin_only" ON public.system_subjects
  FOR DELETE
  USING (auth.uid() IS NULL);

-- system_class_subjects - Platform admin only for write, all users can read
ALTER TABLE public.system_class_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_class_subjects_select_all" ON public.system_class_subjects
  FOR SELECT
  USING (true); -- All authenticated users can read mappings

CREATE POLICY "system_class_subjects_insert_admin_only" ON public.system_class_subjects
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "system_class_subjects_update_admin_only" ON public.system_class_subjects
  FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "system_class_subjects_delete_admin_only" ON public.system_class_subjects
  FOR DELETE
  USING (auth.uid() IS NULL);
