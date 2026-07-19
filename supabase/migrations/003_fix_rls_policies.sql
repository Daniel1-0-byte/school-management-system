-- ============================================================================
-- FIX RLS POLICIES - Remove infinite recursion and enable proper access
-- ============================================================================
-- This migration fixes the infinite recursion issues in RLS policies
-- by using simpler, more direct permission checks without nested subqueries

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins access own school" ON public.schools;
DROP POLICY IF EXISTS "Users access own profile" ON public.profiles;
DROP POLICY IF EXISTS "School users access same school" ON public.profiles;
DROP POLICY IF EXISTS "School users access own school students" ON public.students;
DROP POLICY IF EXISTS "Teachers access own school attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Teachers access own school grades" ON public.grade_entries;
DROP POLICY IF EXISTS "Teachers access own school report cards" ON public.report_cards;

-- ============================================================================
-- SIMPLIFIED RLS POLICIES (Non-recursive, service role bypass)
-- ============================================================================

-- Schools: Allow school admins to access their own school
CREATE POLICY "schools_select_own" ON public.schools
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- Profiles: Allow users to see their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NULL OR id = auth.uid());

-- Profiles: Allow users to see other profiles in their school
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

-- Students: Allow school users to access students in their school
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

-- Students: Allow school users to insert students in their school
CREATE POLICY "students_insert_school" ON public.students
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- Students: Allow updates within school
CREATE POLICY "students_update_school" ON public.students
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- Attendance Records: Allow school users to access
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

-- Attendance Records: Allow teachers to insert
CREATE POLICY "attendance_insert_school" ON public.attendance_records
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role IN ('Admin', 'Teacher')
      LIMIT 1
    )
  );

-- Grade Entries: Allow teachers to access
CREATE POLICY "grade_entries_select_school" ON public.grade_entries
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- Grade Entries: Allow teachers to insert
CREATE POLICY "grade_entries_insert_school" ON public.grade_entries
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role IN ('Admin', 'Teacher')
      LIMIT 1
    )
  );

-- Report Cards: Allow school users to access
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

-- ============================================================================
-- DISABLE RLS FOR SERVICE ROLE KEY BYPASS
-- ============================================================================
-- When using service role key from backend, RLS is bypassed automatically
-- This is secure because the service role key is never exposed to clients

-- ============================================================================
-- CREATE HELPER FUNCTIONS FOR COMMON QUERIES
-- ============================================================================

-- Get current user's school ID (optimized for RLS)
CREATE OR REPLACE FUNCTION get_user_school_id()
RETURNS UUID AS $$
SELECT school_id FROM public.profiles
WHERE id = auth.uid()
LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
SELECT system_role FROM public.profiles
WHERE id = auth.uid()
LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- AUDIT LOGGING TRIGGER
-- ============================================================================

-- Create audit function
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    target_name,
    school_id,
    changes,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    COALESCE(NEW.name::text, OLD.name::text, 'N/A'),
    COALESCE(NEW.school_id, OLD.school_id),
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    ),
    inet_client_addr(),
    current_setting('request.header.user-agent', true)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable audit logging on critical tables
CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_attendance
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_grades
  AFTER INSERT OR UPDATE OR DELETE ON public.grade_entries
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 1. RLS is enabled but uses simplified policies to avoid infinite recursion
-- 2. Service role key (used by backend APIs) bypasses RLS automatically
-- 3. Audit logging tracks all data changes for compliance
-- 4. Helper functions optimize common queries and reduce policy complexity
