-- ============================================================================
-- FIX PROFILE ACCESS FOR AUTHENTICATED USERS
-- ============================================================================
-- This migration fixes profile access for authenticated users after login
-- Issue: Service role client should bypass RLS, but auth.uid() IS NULL check
-- may not be working as expected in all contexts

-- Drop the problematic policy
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Create a more permissive policy that explicitly allows profile access
-- When using service role key, this policy is bypassed entirely
-- When using authenticated session, user can see their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (
    -- Service role key bypass (auth.uid() returns NULL for service role)
    auth.uid() IS NULL 
    -- Authenticated user can see their own profile
    OR id = auth.uid()
  );

-- Additionally, ensure platform admins can access all profiles
-- This is needed for admin dashboards
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT
  USING (
    -- Only applies when there's an authenticated user
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Update policy for schools table
DROP POLICY IF EXISTS "schools_select_own" ON public.schools;

CREATE POLICY "schools_select_own" ON public.schools
  FOR SELECT
  USING (
    -- Service role bypasses RLS
    auth.uid() IS NULL 
    -- Admin users can see their own school
    OR id IN (
      SELECT school_id FROM public.profiles 
      WHERE id = auth.uid() 
      LIMIT 1
    )
    -- Platform admins can see all schools
    OR EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Add school_requests access for platform admins
CREATE POLICY "school_requests_select_admin" ON public.school_requests
  FOR SELECT
  USING (
    auth.uid() IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Add school_requests insert policy for platform admins
CREATE POLICY "school_requests_insert_admin" ON public.school_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- Add school_requests update policy for platform admins
CREATE POLICY "school_requests_update_admin" ON public.school_requests
  FOR UPDATE
  USING (
    auth.uid() IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

COMMIT;
