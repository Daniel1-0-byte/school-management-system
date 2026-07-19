-- ============================================================================
-- PLATFORM ADMIN ADDITIONAL TABLES FOR SCHOOL ONBOARDING & MANAGEMENT
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

CREATE INDEX idx_school_requests_status ON public.school_requests(status);
CREATE INDEX idx_school_requests_email ON public.school_requests(email);
CREATE INDEX idx_school_requests_submitted_at ON public.school_requests(submitted_at DESC);
CREATE INDEX idx_school_requests_reviewed_by ON public.school_requests(reviewed_by);

-- ============================================================================
-- PLATFORM ADMIN ROLES TABLE (For granular permissions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.platform_admins(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'read_only', 'support')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  assigned_by UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_platform_admin_roles_admin_id ON public.platform_admin_roles(admin_id);
CREATE INDEX idx_platform_admin_roles_role ON public.platform_admin_roles(role);
CREATE UNIQUE INDEX idx_platform_admin_single_role ON public.platform_admin_roles(admin_id) WHERE role IS NOT NULL;

-- ============================================================================
-- NOTIFICATIONS TABLE (For platform admins and schools)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_admin_id UUID REFERENCES public.platform_admins(id) ON DELETE CASCADE,
  recipient_school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- school_request, approval, rejection, provisioning_complete, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data like school_id, request_id, etc.
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_notifications_recipient_admin_id ON public.notifications(recipient_admin_id);
CREATE INDEX idx_notifications_recipient_school_id ON public.notifications(recipient_school_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- ============================================================================
-- SUBSCRIPTION PLANS TABLE (For managing school subscriptions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- basic, standard, premium
  description TEXT,
  max_students INTEGER,
  max_teachers INTEGER,
  max_classes INTEGER,
  features TEXT[], -- Array of feature names
  price DECIMAL(10, 2),
  billing_cycle VARCHAR(20), -- monthly, annual
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, max_students, max_teachers, max_classes, billing_cycle, price)
VALUES 
  ('Basic', 'Entry level plan for small schools', 200, 10, 5, 'monthly', 99.99),
  ('Standard', 'Standard plan for medium schools', 1000, 50, 25, 'monthly', 299.99),
  ('Premium', 'Premium plan for large schools', 5000, 250, 125, 'monthly', 999.99)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SCHOOL SUBSCRIPTIONS TABLE (Track school subscriptions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'expired')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  expires_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_school_subscriptions_school_id ON public.school_subscriptions(school_id);
CREATE INDEX idx_school_subscriptions_plan_id ON public.school_subscriptions(plan_id);
CREATE INDEX idx_school_subscriptions_status ON public.school_subscriptions(status);
CREATE INDEX idx_school_subscriptions_expires_at ON public.school_subscriptions(expires_at);

-- ============================================================================
-- SYSTEM HEALTH METRICS TABLE (For dashboard statistics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_system_health_metrics_metric_name ON public.system_health_metrics(metric_name);
CREATE INDEX idx_system_health_metrics_recorded_at ON public.system_health_metrics(recorded_at DESC);

-- ============================================================================
-- PERMISSION GROUPS TABLE (For role-based permissions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT[] NOT NULL, -- Array of permission strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Insert default permission groups
INSERT INTO public.permission_groups (name, description, permissions)
VALUES 
  ('Super Admin', 'Full system access', ARRAY['schools:read', 'schools:write', 'schools:delete', 'users:read', 'users:write', 'users:delete', 'admins:read', 'admins:write', 'admins:delete', 'settings:read', 'settings:write', 'reports:read', 'audit:read']),
  ('Platform Admin', 'Manage schools and basic users', ARRAY['schools:read', 'schools:write', 'users:read', 'users:write', 'admins:read', 'settings:read', 'reports:read', 'audit:read']),
  ('Read Only', 'View-only access', ARRAY['schools:read', 'users:read', 'admins:read', 'reports:read', 'audit:read']),
  ('Support', 'Support team access', ARRAY['schools:read', 'users:read', 'users:write', 'reports:read', 'audit:read'])
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PLATFORM ADMIN ACTIVITY TABLE (Track admin actions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_admin_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.platform_admins(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_platform_admin_activity_admin_id ON public.platform_admin_activity(admin_id);
CREATE INDEX idx_platform_admin_activity_created_at ON public.platform_admin_activity(created_at DESC);

-- ============================================================================
-- SCHOOL ADMIN INVITES TABLE (For provisioning new school admin accounts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.school_admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  invite_token VARCHAR(255) NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_school_admin_invites_school_id ON public.school_admin_invites(school_id);
CREATE INDEX idx_school_admin_invites_email ON public.school_admin_invites(email);
CREATE INDEX idx_school_admin_invites_status ON public.school_admin_invites(status);
CREATE INDEX idx_school_admin_invites_expires_at ON public.school_admin_invites(expires_at);
