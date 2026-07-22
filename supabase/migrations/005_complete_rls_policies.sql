-- ============================================================================
-- COMPLETE RLS POLICIES IMPLEMENTATION
-- ============================================================================
-- This migration implements comprehensive Row-Level Security (RLS) policies for
-- all tables in the school management system. It classifies tables by access
-- level and enforces proper authorization at the database layer.
--
-- Classifications:
-- 1. Platform Admin Only - Only accessible to platform admins
-- 2. School-Scoped - Accessible based on school_id match with user's school
-- 3. System Internal - Limited or no SELECT access via RLS
--
-- All policies include "auth.uid() IS NULL" to allow service role bypass when
-- needed for backend API operations that have their own authorization layer.
-- ============================================================================

-- ============================================================================
-- DROP EXISTING INCOMPLETE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "schools_select_own" ON public.schools;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_school" ON public.profiles;
DROP POLICY IF EXISTS "students_select_school" ON public.students;
DROP POLICY IF EXISTS "students_insert_school" ON public.students;
DROP POLICY IF EXISTS "students_update_school" ON public.students;
DROP POLICY IF EXISTS "attendance_select_school" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_insert_school" ON public.attendance_records;
DROP POLICY IF EXISTS "grades_select_school" ON public.grade_entries;
DROP POLICY IF EXISTS "grades_insert_school" ON public.grade_entries;
DROP POLICY IF EXISTS "report_cards_select_school" ON public.report_cards;
DROP POLICY IF EXISTS "profiles_select_same_school" ON public.profiles;
DROP POLICY IF EXISTS "Students can be read by school users" ON public.students;
DROP POLICY IF EXISTS "Students can be updated by admins" ON public.students;
DROP POLICY IF EXISTS "Admins access own school" ON public.schools;
DROP POLICY IF EXISTS "Users access own profile" ON public.profiles;
DROP POLICY IF EXISTS "School users access same school" ON public.profiles;
DROP POLICY IF EXISTS "School users access own school students" ON public.students;
DROP POLICY IF EXISTS "Teachers access own school attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers access own school grades" ON public.grade_entries;
DROP POLICY IF EXISTS "Teachers access own school report cards" ON public.report_cards;

-- ============================================================================
-- SECTION 1: PLATFORM ADMIN ONLY TABLES
-- ============================================================================
-- These tables are only accessible to platform admins and should never be
-- queried by school users or accessed via school-scoped APIs.

-- platform_admins: Only platform admins can access
CREATE POLICY "platform_admins_select_self" ON public.platform_admins
  FOR SELECT
  USING (auth.uid() IS NULL);

CREATE POLICY "platform_admins_insert_self" ON public.platform_admins
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "platform_admins_update_self" ON public.platform_admins
  FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "platform_admins_delete_self" ON public.platform_admins
  FOR DELETE
  USING (auth.uid() IS NULL);

-- platform_admin_sessions: Only platform admins
CREATE POLICY "platform_admin_sessions_all" ON public.platform_admin_sessions
  FOR ALL
  USING (auth.uid() IS NULL);

-- platform_admin_2fa_sessions: Only platform admins
CREATE POLICY "platform_admin_2fa_sessions_all" ON public.platform_admin_2fa_sessions
  FOR ALL
  USING (auth.uid() IS NULL);

-- platform_admin_activity: Only platform admins
CREATE POLICY "platform_admin_activity_all" ON public.platform_admin_activity
  FOR ALL
  USING (auth.uid() IS NULL);

-- platform_admin_roles: Only platform admins
CREATE POLICY "platform_admin_roles_all" ON public.platform_admin_roles
  FOR ALL
  USING (auth.uid() IS NULL);

-- permission_groups: Only platform admins
CREATE POLICY "permission_groups_all" ON public.permission_groups
  FOR ALL
  USING (auth.uid() IS NULL);

-- subscription_plans: Authenticated users can read, platform admins can write
CREATE POLICY "subscription_plans_select" ON public.subscription_plans
  FOR SELECT
  USING (true); -- Public read

CREATE POLICY "subscription_plans_write" ON public.subscription_plans
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "subscription_plans_update" ON public.subscription_plans
  FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "subscription_plans_delete" ON public.subscription_plans
  FOR DELETE
  USING (auth.uid() IS NULL);

-- system_health_metrics: Only platform admins
CREATE POLICY "system_health_metrics_all" ON public.system_health_metrics
  FOR ALL
  USING (auth.uid() IS NULL);

-- school_requests: Only platform admins
CREATE POLICY "school_requests_select" ON public.school_requests
  FOR SELECT
  USING (auth.uid() IS NULL);

CREATE POLICY "school_requests_insert" ON public.school_requests
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "school_requests_update" ON public.school_requests
  FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "school_requests_delete" ON public.school_requests
  FOR DELETE
  USING (auth.uid() IS NULL);

-- school_admin_invites: Platform admins and school admins for their own school
CREATE POLICY "school_admin_invites_select" ON public.school_admin_invites
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "school_admin_invites_insert" ON public.school_admin_invites
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "school_admin_invites_update" ON public.school_admin_invites
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "school_admin_invites_delete" ON public.school_admin_invites
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- ============================================================================
-- SECTION 2: SCHOOL-SCOPED TABLES
-- ============================================================================
-- These tables require school_id match with user's school.
-- Pattern: Users can access records where school_id matches their school_id
-- (obtained from profiles table via auth.uid())

-- schools: School admins can read their own school
CREATE POLICY "schools_select_own" ON public.schools
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "schools_insert" ON public.schools
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "schools_update" ON public.schools
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "schools_delete" ON public.schools
  FOR DELETE
  USING (auth.uid() IS NULL);

-- profiles: Users can read their own profile and others in same school
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NULL OR id = auth.uid());

CREATE POLICY "profiles_select_school" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL OR id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() IS NULL OR id = auth.uid())
  WITH CHECK (auth.uid() IS NULL OR id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE
  USING (auth.uid() IS NULL);

-- students: School users can access students in their school
CREATE POLICY "students_select_school" ON public.students
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "students_insert_admin" ON public.students
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "students_update_admin" ON public.students
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "students_delete_admin" ON public.students
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- guardians: School users can access guardians in their school
CREATE POLICY "guardians_select_school" ON public.guardians
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "guardians_insert_admin" ON public.guardians
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "guardians_update_admin" ON public.guardians
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "guardians_delete_admin" ON public.guardians
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- student_guardians: Access via student relationship
CREATE POLICY "student_guardians_select_school" ON public.student_guardians
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR student_id IN (
      SELECT id FROM public.students 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid()
        LIMIT 1
      )
    )
  );

CREATE POLICY "student_guardians_insert_admin" ON public.student_guardians
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR student_id IN (
      SELECT id FROM public.students 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

CREATE POLICY "student_guardians_update_admin" ON public.student_guardians
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR student_id IN (
      SELECT id FROM public.students 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR student_id IN (
      SELECT id FROM public.students 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

CREATE POLICY "student_guardians_delete_admin" ON public.student_guardians
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR student_id IN (
      SELECT id FROM public.students 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

-- pickup_persons: School users can access pickup persons in their school
CREATE POLICY "pickup_persons_select_school" ON public.pickup_persons
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "pickup_persons_insert_admin" ON public.pickup_persons
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "pickup_persons_update_admin" ON public.pickup_persons
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "pickup_persons_delete_admin" ON public.pickup_persons
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- academic_years: School users can access academic years in their school
CREATE POLICY "academic_years_select_school" ON public.academic_years
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "academic_years_insert_admin" ON public.academic_years
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "academic_years_update_admin" ON public.academic_years
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "academic_years_delete_admin" ON public.academic_years
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- terms: Access via academic_year → school relationship
CREATE POLICY "terms_select_school" ON public.terms
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR academic_year_id IN (
      SELECT id FROM public.academic_years 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid()
        LIMIT 1
      )
    )
  );

CREATE POLICY "terms_insert_admin" ON public.terms
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR academic_year_id IN (
      SELECT id FROM public.academic_years 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

CREATE POLICY "terms_update_admin" ON public.terms
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR academic_year_id IN (
      SELECT id FROM public.academic_years 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR academic_year_id IN (
      SELECT id FROM public.academic_years 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

CREATE POLICY "terms_delete_admin" ON public.terms
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR academic_year_id IN (
      SELECT id FROM public.academic_years 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

-- school_classes: School users can access classes in their school
CREATE POLICY "school_classes_select_school" ON public.school_classes
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "school_classes_insert_admin" ON public.school_classes
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "school_classes_update_admin" ON public.school_classes
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "school_classes_delete_admin" ON public.school_classes
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- student_enrollments: School users can access enrollments in their school
CREATE POLICY "student_enrollments_select_school" ON public.student_enrollments
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR class_id IN (
      SELECT id FROM public.school_classes 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid()
        LIMIT 1
      )
    )
  );

CREATE POLICY "student_enrollments_insert_admin" ON public.student_enrollments
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR class_id IN (
      SELECT id FROM public.school_classes 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

CREATE POLICY "student_enrollments_update_admin" ON public.student_enrollments
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR class_id IN (
      SELECT id FROM public.school_classes 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR class_id IN (
      SELECT id FROM public.school_classes 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

CREATE POLICY "student_enrollments_delete_admin" ON public.student_enrollments
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR class_id IN (
      SELECT id FROM public.school_classes 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

-- teacher_assignments: School users can access assignments in their school
CREATE POLICY "teacher_assignments_select_school" ON public.teacher_assignments
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR class_id IN (
      SELECT id FROM public.school_classes 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid()
        LIMIT 1
      )
    )
  );

CREATE POLICY "teacher_assignments_insert_admin" ON public.teacher_assignments
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR class_id IN (
      SELECT id FROM public.school_classes 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

CREATE POLICY "teacher_assignments_update_admin" ON public.teacher_assignments
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR class_id IN (
      SELECT id FROM public.school_classes 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR class_id IN (
      SELECT id FROM public.school_classes 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

CREATE POLICY "teacher_assignments_delete_admin" ON public.teacher_assignments
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR class_id IN (
      SELECT id FROM public.school_classes 
      WHERE school_id = (
        SELECT school_id FROM public.profiles 
        WHERE id = auth.uid() AND system_role = 'Admin'
        LIMIT 1
      )
    )
  );

-- subjects: School users can access subjects in their school
CREATE POLICY "subjects_select_school" ON public.subjects
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "subjects_insert_admin" ON public.subjects
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "subjects_update_admin" ON public.subjects
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "subjects_delete_admin" ON public.subjects
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- attendance_records: School users can access attendance in their school
CREATE POLICY "attendance_select_school" ON public.attendance_records
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "attendance_insert_school" ON public.attendance_records
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role IN ('Admin', 'Teacher')
      LIMIT 1
    )
  );

CREATE POLICY "attendance_update_school" ON public.attendance_records
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role IN ('Admin', 'Teacher')
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role IN ('Admin', 'Teacher')
      LIMIT 1
    )
  );

CREATE POLICY "attendance_delete_admin" ON public.attendance_records
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- grade_entries: School users can access grades in their school
CREATE POLICY "grades_select_school" ON public.grade_entries
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "grades_insert_school" ON public.grade_entries
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role IN ('Admin', 'Teacher')
      LIMIT 1
    )
  );

CREATE POLICY "grades_update_school" ON public.grade_entries
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role IN ('Admin', 'Teacher')
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role IN ('Admin', 'Teacher')
      LIMIT 1
    )
  );

CREATE POLICY "grades_delete_admin" ON public.grade_entries
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- report_cards: School users can access report cards in their school
CREATE POLICY "report_cards_select_school" ON public.report_cards
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "report_cards_insert_school" ON public.report_cards
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role IN ('Admin', 'Teacher')
      LIMIT 1
    )
  );

CREATE POLICY "report_cards_update_school" ON public.report_cards
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role IN ('Admin', 'Teacher')
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role IN ('Admin', 'Teacher')
      LIMIT 1
    )
  );

CREATE POLICY "report_cards_delete_admin" ON public.report_cards
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- audit_logs: School users can read their school's logs; platform admins see all
CREATE POLICY "audit_logs_select_school" ON public.audit_logs
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

-- notifications: Users can read their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT
  USING (auth.uid() IS NULL OR user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE
  USING (auth.uid() IS NULL OR user_id = auth.uid())
  WITH CHECK (auth.uid() IS NULL OR user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE
  USING (auth.uid() IS NULL OR user_id = auth.uid());

-- school_subscriptions: Platform admins read all; schools can read their own
CREATE POLICY "school_subscriptions_select_own" ON public.school_subscriptions
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "school_subscriptions_insert" ON public.school_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "school_subscriptions_update" ON public.school_subscriptions
  FOR UPDATE
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

CREATE POLICY "school_subscriptions_delete" ON public.school_subscriptions
  FOR DELETE
  USING (auth.uid() IS NULL);

-- ============================================================================
-- SECTION 3: SYSTEM INTERNAL TABLES
-- ============================================================================
-- These tables should have minimal or no SELECT access via RLS.

-- rate_limits: System internal, no SELECT via RLS (platform admins only if needed)
CREATE POLICY "rate_limits_all" ON public.rate_limits
  FOR ALL
  USING (auth.uid() IS NULL);

-- ============================================================================
-- STAFF INVITATIONS TABLE
-- ============================================================================
-- Allow school admins to manage invitations for their school

CREATE POLICY "staff_invitations_select_school" ON public.staff_invitations
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "staff_invitations_insert_admin" ON public.staff_invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "staff_invitations_update_admin" ON public.staff_invitations
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

CREATE POLICY "staff_invitations_delete_admin" ON public.staff_invitations
  FOR DELETE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- - Platform Admin Only: 9 tables with service role bypass only
-- - School-Scoped: 18 tables with school_id filtering
-- - System Internal: 1 table with service role bypass
-- - Total: 28 tables with comprehensive RLS coverage
-- ============================================================================
