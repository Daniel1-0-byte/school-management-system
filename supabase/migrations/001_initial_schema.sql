CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- SCHOOLS TABLE
-- ============================================================================

CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'active', 'suspended', 'inactive')),
  logo_url TEXT,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  website TEXT,
  principal_name VARCHAR(255),
  principal_email VARCHAR(255),
  student_capacity INTEGER,
  founded_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_schools_status ON public.schools(status);
CREATE INDEX idx_schools_created_at ON public.schools(created_at DESC);

-- ============================================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  system_role TEXT NOT NULL CHECK (system_role IN ('Admin', 'Teacher', 'Accountant', 'BusCoordinator', 'Parent')),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive')),
  invite_token VARCHAR(255),
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX idx_profiles_system_role ON public.profiles(system_role);
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- ============================================================================
-- PLATFORM ADMINS TABLE
-- ============================================================================

CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  totp_secret TEXT, -- Encrypted TOTP secret for 2FA
  totp_enabled BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_platform_admins_email ON public.platform_admins(email);
CREATE INDEX idx_platform_admins_status ON public.platform_admins(status);

-- ============================================================================
-- STUDENTS TABLE (NO PHOTO URL)
-- ============================================================================

CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  admission_number VARCHAR(50),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  current_class_name VARCHAR(100),
  current_class_id UUID,
  parental_status VARCHAR(100),
  medical_notes TEXT,
  allergies TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_students_school_id ON public.students(school_id);
CREATE INDEX idx_students_admission_number ON public.students(admission_number);
CREATE INDEX idx_students_status ON public.students(status);

-- ============================================================================
-- GUARDIANS TABLE (NO PHOTO URL)
-- ============================================================================

CREATE TABLE public.guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_guardians_school_id ON public.guardians(school_id);
CREATE INDEX idx_guardians_email ON public.guardians(email);

-- ============================================================================
-- STUDENT-GUARDIAN RELATIONSHIP TABLE
-- ============================================================================

CREATE TABLE public.student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(student_id, guardian_id)
);

CREATE INDEX idx_student_guardians_student_id ON public.student_guardians(student_id);
CREATE INDEX idx_student_guardians_guardian_id ON public.student_guardians(guardian_id);

-- ============================================================================
-- PICKUP PERSONS TABLE (NO PHOTO URL)
-- ============================================================================

CREATE TABLE public.pickup_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_pickup_persons_school_id ON public.pickup_persons(school_id);
CREATE INDEX idx_pickup_persons_guardian_id ON public.pickup_persons(guardian_id);

-- ============================================================================
-- ACADEMIC YEARS TABLE
-- ============================================================================

CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(school_id, year)
);

CREATE INDEX idx_academic_years_school_id ON public.academic_years(school_id);
CREATE INDEX idx_academic_years_is_active ON public.academic_years(is_active);

-- ============================================================================
-- TERMS TABLE
-- ============================================================================

CREATE TABLE public.terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('term_1', 'term_2', 'term_3')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  report_card_deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_terms_school_id ON public.terms(school_id);
CREATE INDEX idx_terms_academic_year_id ON public.terms(academic_year_id);

-- ============================================================================
-- SCHOOL CLASSES TABLE
-- ============================================================================

CREATE TABLE public.school_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  level VARCHAR(50),
  capacity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_school_classes_school_id ON public.school_classes(school_id);
CREATE INDEX idx_school_classes_academic_year_id ON public.school_classes(academic_year_id);

-- ============================================================================
-- TEACHER ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  subjects TEXT[] NOT NULL, -- Array of subject names
  is_primary_teacher BOOLEAN DEFAULT FALSE,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_teacher_assignments_school_id ON public.teacher_assignments(school_id);
CREATE INDEX idx_teacher_assignments_teacher_id ON public.teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_class_id ON public.teacher_assignments(class_id);

-- ============================================================================
-- STUDENT ENROLLMENTS TABLE
-- ============================================================================

CREATE TABLE public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_student_enrollments_school_id ON public.student_enrollments(school_id);
CREATE INDEX idx_student_enrollments_student_id ON public.student_enrollments(student_id);
CREATE INDEX idx_student_enrollments_class_id ON public.student_enrollments(class_id);

-- ============================================================================
-- SUBJECTS TABLE
-- ============================================================================

CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_subjects_school_id ON public.subjects(school_id);

-- ============================================================================
-- ATTENDANCE RECORDS TABLE
-- ============================================================================

CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  remarks TEXT,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_attendance_records_school_id ON public.attendance_records(school_id);
CREATE INDEX idx_attendance_records_student_id ON public.attendance_records(student_id);
CREATE INDEX idx_attendance_records_date ON public.attendance_records(date);

-- ============================================================================
-- GRADE ENTRIES TABLE
-- ============================================================================

CREATE TABLE public.grade_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  score NUMERIC(5,2) NOT NULL,
  grade_type TEXT NOT NULL CHECK (grade_type IN ('percentage', 'letter', 'point')),
  letter_grade VARCHAR(2),
  remarks TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_grade_entries_school_id ON public.grade_entries(school_id);
CREATE INDEX idx_grade_entries_student_id ON public.grade_entries(student_id);
CREATE INDEX idx_grade_entries_term_id ON public.grade_entries(term_id);

-- ============================================================================
-- REPORT CARDS TABLE
-- ============================================================================

CREATE TABLE public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  total_score NUMERIC(5,2),
  average_score NUMERIC(5,2),
  letter_grade VARCHAR(2),
  ranking INTEGER,
  class_size INTEGER,
  teacher_comment TEXT,
  principal_signature BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_report_cards_school_id ON public.report_cards(school_id);
CREATE INDEX idx_report_cards_student_id ON public.report_cards(student_id);
CREATE INDEX idx_report_cards_term_id ON public.report_cards(term_id);

-- ============================================================================
-- PLATFORM ADMIN SESSIONS TABLE
-- ============================================================================

CREATE TABLE public.platform_admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.platform_admins(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_platform_admin_sessions_admin_id ON public.platform_admin_sessions(admin_id);
CREATE INDEX idx_platform_admin_sessions_token ON public.platform_admin_sessions(token);
CREATE INDEX idx_platform_admin_sessions_expires_at ON public.platform_admin_sessions(expires_at);

-- ============================================================================
-- PLATFORM ADMIN 2FA SESSIONS TABLE
-- ============================================================================

CREATE TABLE public.platform_admin_2fa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.platform_admins(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_platform_admin_2fa_sessions_admin_id ON public.platform_admin_2fa_sessions(admin_id);
CREATE INDEX idx_platform_admin_2fa_sessions_expires_at ON public.platform_admin_2fa_sessions(expires_at);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID, -- Can be from profiles or platform_admins
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  target_name VARCHAR(255),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_school_id ON public.audit_logs(school_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target_type ON public.audit_logs(target_type);

-- ============================================================================
-- RATE LIMITS TABLE
-- ============================================================================

CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  action VARCHAR(50) NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(ip_address, action)
);

CREATE INDEX idx_rate_limits_ip_action ON public.rate_limits(ip_address, action);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) - MINIMAL POLICIES ONLY
-- ============================================================================
-- NOTE: Complex RLS policies with nested SELECTs cause PostgreSQL error 42P17
-- (infinite recursion detected). Instead, we handle authorization at the 
-- application level using service role key (backend only) and manual checks.
-- See migration 003_fix_rls_policies.sql for the corrected approach.

-- Enable RLS for all tables but with minimal/no policies initially
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards DISABLE ROW LEVEL SECURITY;

-- ONLY policy: Users can see their own profile
CREATE POLICY "Users access own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('school-logos', 'school-logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('report-card-pdfs', 'report-card-pdfs', false);

-- Storage policies disabled - authorization handled at application level
-- Avoid nested SELECT queries that can cause infinite recursion
