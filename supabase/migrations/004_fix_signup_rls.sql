-- ============================================================================
-- FIX SIGNUP RLS - Allow profile creation during signup flow
-- ============================================================================
-- This migration enables profiles to be created during signup without
-- hitting infinite recursion or permission errors

-- Drop problematic policies that check for existing profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_school" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- ============================================================================
-- PERMISSIVE SIGNUP POLICIES - Allow profile operations during signup
-- ============================================================================

-- Profiles: Allow authenticated users to create their own profile
-- This is safe because it's only during signup when profile doesn't exist yet
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND id = auth.uid()
  );

-- Profiles: Allow users to select their own profile
CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Profiles: Allow users to select other profiles in their school (if profile exists)
CREATE POLICY "profiles_select_school_members" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND school_id = (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() 
      LIMIT 1
    )
  );

-- Profiles: Allow users to update their own profile
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- SCHOOLS POLICIES - Allow access to schools
-- ============================================================================

-- Schools: Public read access for schools (needed during signup)
CREATE POLICY "schools_select_public" ON public.schools
  FOR SELECT
  USING (true);

-- Schools: Allow school admins to update their school
CREATE POLICY "schools_update_admin" ON public.schools
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() AND system_role = 'Admin'
      LIMIT 1
    )
  );

-- ============================================================================
-- IMPORTANT: SERVICE ROLE BYPASS
-- ============================================================================
-- The backend uses the service role key which automatically bypasses RLS.
-- This means:
-- 1. Schools can be created by backend without RLS restrictions
-- 2. Profiles can be created by backend without RLS restrictions
-- 3. Profile setup wizard can update profiles using service role
--
-- Client-side operations (if any) will be restricted by these policies.
