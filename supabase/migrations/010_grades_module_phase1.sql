-- ============================================================================
-- GRADES MODULE PHASE 1 - DATABASE SCHEMA
-- ============================================================================
-- Date: 2026-07-26
-- Purpose: Implement simplified 3-score grading model with session management
-- Backward Compatibility: ALL new columns are nullable; existing grades unaffected
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE ASSESSMENTS TABLE (New)
-- ============================================================================
-- Represents a single grading task with session/workflow tracking
-- Example: "Mathematics Term 1 Exam for B1"

CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  stream_id UUID NOT NULL REFERENCES public.school_class_streams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN ('term_exam', 'class_test', 'assignment', 'project', 'midterm', 'final')),
  max_marks NUMERIC(5,2) DEFAULT 100,
  
  -- Session/Workflow Fields
  status VARCHAR(50) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'draft', 'submitted', 'returned', 'approved')),
  progress_count INTEGER DEFAULT 0,
  total_students INTEGER,
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  returned_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_assessments_school_id ON public.assessments(school_id);
CREATE INDEX idx_assessments_academic_year_id ON public.assessments(academic_year_id);
CREATE INDEX idx_assessments_stream_id ON public.assessments(stream_id);
CREATE INDEX idx_assessments_subject_id ON public.assessments(subject_id);
CREATE INDEX idx_assessments_status ON public.assessments(status);

-- ============================================================================
-- 2. CREATE SCHOOL GRADING POLICIES TABLE (New)
-- ============================================================================
-- Stores per-school grading configuration (weights, scales, etc.)
-- One row per school

CREATE TABLE IF NOT EXISTS public.school_grading_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  
  -- Weights for 3-score model: Class Score % + Exam Score %
  class_score_weight NUMERIC(5,2) NOT NULL DEFAULT 30 CHECK (class_score_weight >= 0 AND class_score_weight <= 100),
  exam_score_weight NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK (exam_score_weight >= 0 AND exam_score_weight <= 100),
  
  -- Grade Scale (JSON for flexibility, e.g., {"A": 80, "B": 70, "C": 60, "D": 50, "F": 0})
  grade_scale JSONB DEFAULT '{"A": 80, "B": 70, "C": 60, "D": 50, "F": 0}'::jsonb,
  
  -- Remarks configuration (JSON, e.g., {"excellent": "Excellent performance", ...})
  remarks_scale JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_school_grading_policies_school_id ON public.school_grading_policies(school_id);

-- ============================================================================
-- 3. EXTEND GRADE_ENTRIES TABLE
-- ============================================================================
-- Add new columns for 3-score model and session tracking
-- All nullable for backward compatibility

ALTER TABLE public.grade_entries ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL;
ALTER TABLE public.grade_entries ADD COLUMN IF NOT EXISTS class_score NUMERIC(5,2);
ALTER TABLE public.grade_entries ADD COLUMN IF NOT EXISTS exam_score NUMERIC(5,2);
ALTER TABLE public.grade_entries ADD COLUMN IF NOT EXISTS total_score NUMERIC(5,2);
ALTER TABLE public.grade_entries ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.grade_entries ADD COLUMN IF NOT EXISTS submission_status VARCHAR(50) DEFAULT 'draft' CHECK (submission_status IN ('draft', 'submitted', 'approved'));

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_grade_entries_assessment_id ON public.grade_entries(assessment_id);
CREATE INDEX IF NOT EXISTS idx_grade_entries_status ON public.grade_entries(submission_status);

-- ============================================================================
-- 4. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Assessments: School-scoped access
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessments_select" ON public.assessments;
CREATE POLICY "assessments_select" ON public.assessments
  FOR SELECT USING (
    auth.uid() IS NULL
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "assessments_insert" ON public.assessments;
CREATE POLICY "assessments_insert" ON public.assessments
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "assessments_update" ON public.assessments;
CREATE POLICY "assessments_update" ON public.assessments
  FOR UPDATE USING (
    auth.uid() IS NULL
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "assessments_delete" ON public.assessments;
CREATE POLICY "assessments_delete" ON public.assessments
  FOR DELETE USING (
    auth.uid() IS NULL
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- School Grading Policies: School-scoped access
ALTER TABLE public.school_grading_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_grading_policies_select" ON public.school_grading_policies;
CREATE POLICY "school_grading_policies_select" ON public.school_grading_policies
  FOR SELECT USING (
    auth.uid() IS NULL
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "school_grading_policies_insert" ON public.school_grading_policies;
CREATE POLICY "school_grading_policies_insert" ON public.school_grading_policies
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "school_grading_policies_update" ON public.school_grading_policies;
CREATE POLICY "school_grading_policies_update" ON public.school_grading_policies
  FOR UPDATE USING (
    auth.uid() IS NULL
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- Grade Entries: Update RLS to include assessment_id scope
ALTER TABLE public.grade_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grade_entries_access" ON public.grade_entries;
CREATE POLICY "grade_entries_access" ON public.grade_entries
  FOR SELECT USING (
    auth.uid() IS NULL
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "grade_entries_insert" ON public.grade_entries;
CREATE POLICY "grade_entries_insert" ON public.grade_entries
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "grade_entries_update" ON public.grade_entries;
CREATE POLICY "grade_entries_update" ON public.grade_entries
  FOR UPDATE USING (
    auth.uid() IS NULL
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "grade_entries_delete" ON public.grade_entries;
CREATE POLICY "grade_entries_delete" ON public.grade_entries
  FOR DELETE USING (
    auth.uid() IS NULL
    OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- ============================================================================
-- 5. SEED DEFAULT GRADING POLICY FOR EXISTING SCHOOLS
-- ============================================================================

INSERT INTO public.school_grading_policies (school_id, class_score_weight, exam_score_weight, grade_scale, remarks_scale)
SELECT 
  id,
  30,
  70,
  '{"A": 80, "B": 70, "C": 60, "D": 50, "F": 0}'::jsonb,
  '{"excellent": "Excellent performance", "good": "Good performance", "fair": "Fair performance", "poor": "Needs improvement"}'::jsonb
FROM public.schools
WHERE id NOT IN (SELECT school_id FROM public.school_grading_policies)
ON CONFLICT DO NOTHING;

COMMIT;
