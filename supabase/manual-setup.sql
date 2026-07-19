-- ============================================================================
-- MANUAL SETUP: Run this in Supabase SQL Editor if migrations haven't been applied
-- ============================================================================

-- ============================================================================
-- SCHOOL REQUESTS TABLE (Schools requesting access)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.school_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  location VARCHAR(255),
  requested_plan VARCHAR(50) NOT NULL DEFAULT 'standard', -- basic, standard, premium
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'provisioned')),
  rejection_reason TEXT,
  rejection_notes TEXT,
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_school_requests_status ON public.school_requests(status);
CREATE INDEX IF NOT EXISTS idx_school_requests_email ON public.school_requests(email);
CREATE INDEX IF NOT EXISTS idx_school_requests_submitted_at ON public.school_requests(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_requests_reviewed_by ON public.school_requests(reviewed_by);

-- ============================================================================
-- PLATFORM SETTINGS TABLE (For system settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB,
  setting_type VARCHAR(50), -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  updated_by UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(setting_key);

-- ============================================================================
-- ENABLE RLS FOR SCHOOL_REQUESTS TABLE
-- ============================================================================

ALTER TABLE public.school_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Platform admins can view all school requests
CREATE POLICY "Platform admins can view all school requests"
  ON public.school_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins 
      WHERE platform_admins.id = auth.uid()
    )
  );

-- Policy: Platform admins can update school requests
CREATE POLICY "Platform admins can update school requests"
  ON public.school_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins 
      WHERE platform_admins.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins 
      WHERE platform_admins.id = auth.uid()
    )
  );

-- Policy: Anyone can insert school requests
CREATE POLICY "Anyone can insert school requests"
  ON public.school_requests
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- ENABLE RLS FOR PLATFORM_SETTINGS TABLE
-- ============================================================================

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Platform admins can view settings
CREATE POLICY "Platform admins can view settings"
  ON public.platform_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins 
      WHERE platform_admins.id = auth.uid()
    )
  );

-- Policy: Platform admins can update settings
CREATE POLICY "Platform admins can update settings"
  ON public.platform_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins 
      WHERE platform_admins.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins 
      WHERE platform_admins.id = auth.uid()
    )
  );

-- ============================================================================
-- DONE: Verify tables exist with:
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public';
-- ============================================================================
