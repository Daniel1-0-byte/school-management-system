import type { Profile, SystemRole } from '@/types';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient, queryProfiles, querySchools } from './supabase';

/**
 * Extract school_id from request context and validate access
 * Priority order:
 * 1. X-School-Id header (explicitly provided)
 * 2. school_id query parameter (backward compatibility)
 * 3. Extract from Supabase JWT auth token (user's school)
 */
export async function getSchoolIdFromRequest(
  request: NextRequest
): Promise<string | null> {
  try {
    // Try header first (modern pattern, explicitly provided)
    let schoolId = request.headers.get('X-School-Id');
    
    // Fall back to query parameter (legacy/backward compatibility)
    if (!schoolId) {
      schoolId = request.nextUrl.searchParams.get('school_id');
    }
    
    // If still no school_id, try to extract from authenticated user session
    if (!schoolId) {
      try {
        // Get auth token from cookies (set during login)
        const authToken = request.cookies.get('sb-auth-token')?.value;
        
        if (!authToken) {
          console.warn('[v0] No auth token found in request cookies');
          return null;
        }
        
        // Parse JWT to get user ID (without verifying, just extracting payload)
        const parts = authToken.split('.');
        if (parts.length !== 3) {
          console.warn('[v0] Invalid JWT format in auth token');
          return null;
        }
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const userId = payload.sub;
        
        if (!userId) {
          console.warn('[v0] No user ID found in auth token');
          return null;
        }
        
        // Look up user's profile to find their school_id using service role
        const { data: profile, error: profileError } = await queryProfiles()
          .select('school_id')
          .eq('id', userId)
          .single();
        
        if (profileError) {
          console.warn('[v0] Failed to get user profile:', profileError.message);
          return null;
        }
        
        if (!profile?.school_id) {
          console.warn('[v0] User profile has no school_id');
          return null;
        }
        
        schoolId = profile.school_id;
      } catch (err) {
        console.error('[v0] Error extracting school_id from auth:', err);
        return null;
      }
    }
    
    return schoolId;
  } catch (err) {
    console.error('[v0] Error extracting school ID:', err);
    return null;
  }
}

/**
 * Validate that school_id is provided and valid
 * This performs basic validation without auth integration
 * In production, this would also validate that the authenticated user has access to this school
 */
export async function validateSchoolIdAccess(
  schoolId: string | null
): Promise<{ valid: boolean; error?: string }> {
  if (!schoolId) {
    return {
      valid: false,
      error: 'School ID is required',
    };
  }

  try {
    // Verify that the school exists in the schools table
    const { data: school, error } = await querySchools()
      .select('id')
      .eq('id', schoolId)
      .limit(1);

    if (error) {
      return {
        valid: false,
        error: 'Error validating school ID',
      };
    }

    if (!school || school.length === 0) {
      return {
        valid: false,
        error: 'Invalid school ID',
      };
    }

    return { valid: true };
  } catch (err) {
    console.error('[v0] Error validating school ID:', err);
    return {
      valid: false,
      error: 'Error validating school access',
    };
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(headers: HeadersInit | Headers): string {
  const headerObj = headers instanceof Headers ? headers : new Headers(headers);
  
  return (
    headerObj.get('x-forwarded-for')?.split(',')[0].trim() ||
    headerObj.get('x-real-ip') ||
    headerObj.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(headers: HeadersInit | Headers): string {
  const headerObj = headers instanceof Headers ? headers : new Headers(headers);
  return headerObj.get('user-agent') || 'unknown';
}

/**
 * Determine if a role has admin privileges
 */
export function isAdmin(role: SystemRole): boolean {
  return role === 'Admin';
}

/**
 * Determine if a role is teacher or staff
 */
export function isTeacherOrStaff(role: SystemRole): boolean {
  return ['Teacher', 'Accountant', 'BusCoordinator'].includes(role);
}

/**
 * Determine if a role is a parent
 */
export function isParent(role: SystemRole): boolean {
  return role === 'Parent';
}

/**
 * Check if user can manage academic content
 */
export function canManageAcademics(role: SystemRole): boolean {
  return role === 'Admin' || role === 'Teacher';
}

/**
 * Check if user can manage finances
 */
export function canManageFinances(role: SystemRole): boolean {
  return role === 'Admin' || role === 'Accountant';
}

/**
 * Check if user can manage attendance
 */
export function canManageAttendance(role: SystemRole): boolean {
  return role === 'Admin' || role === 'Teacher' || role === 'BusCoordinator';
}

/**
 * Get display name from profile
 */
export function getDisplayName(profile: Profile): string {
  return `${profile.firstName} ${profile.lastName}`.trim();
}

/**
 * Generate a random invite token
 */
export function generateInviteToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate invite token expiration (48 hours from now)
 */
export function getInviteExpirationTime(): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);
  return expiresAt;
}

/**
 * Check if invite token is expired
 */
export function isInviteTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Require one of the allowed roles for the authenticated request.
 * The user identity is verified from the session token, then the role is
 * read fresh from that user's profiles row; client-supplied role values are ignored.
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: readonly SystemRole[]
): Promise<NextResponse | null> {
  const authToken = request.cookies.get('sb-auth-token')?.value;
  let userId: string | null = null;
  let userErrorMessage: string | null = null;
  let resolvedRole: string | null = null;

  if (!authToken) {
    console.log('[v0][AUTH] requireRole:', {
      tokenPrefix: null,
      authSucceeded: false,
      userId,
      systemRole: resolvedRole,
    });
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Always create a fresh service-role client; this helper never reuses a
  // client that has been used for auth state changes elsewhere in the request.
  const supabase = getServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
  userId = user?.id ?? null;
  userErrorMessage = userError?.message ?? null;

  const { data: profile, error: profileError } = user
    ? await supabase
        .from('profiles')
        .select('system_role')
        .eq('id', user.id)
        .single()
    : { data: null, error: null };
  resolvedRole = profile?.system_role ?? null;

  console.log('[v0][AUTH] requireRole:', {
    tokenPrefix: authToken.slice(0, 15),
    authSucceeded: !userError && !!user,
    userId,
    systemRole: resolvedRole,
    authError: userErrorMessage,
    profileError: profileError?.message ?? null,
  });

  if (userError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (profileError || !profile?.system_role) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
  }

  if (!allowedRoles.includes(profile.system_role as SystemRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

/**
 * Resolve the verified session user and current profile without trusting client claims.
 */
export async function getAuthenticatedProfile(request: NextRequest) {
  const authToken = request.cookies.get('sb-auth-token')?.value;
  if (!authToken) return { user: null, profile: null, error: 'Authentication required' };

  const supabase = getServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
  if (userError || !user) return { user: null, profile: null, error: 'Authentication required' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, school_id, system_role, status')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) return { user, profile: null, error: 'User profile not found' };

  return { user, profile, error: null };
}

/**
 * Authorize a grade operation for a class and academic year.
 * Admins are unrestricted; Teachers must have an active assignment for the
 * exact school, class, teacher, and academic year. Subject names are not used
 * for authorization so one class assignment unlocks every subject in that class.
 */
export async function requireGradeClassAccess(
  request: NextRequest,
  schoolId: string,
  classId: string,
  academicYearId: string
): Promise<NextResponse | null> {
  const authToken = request.cookies.get('sb-auth-token')?.value;
  if (!authToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
  if (userError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('system_role, school_id, status')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.school_id !== schoolId || profile.status !== 'active') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (profile.system_role === 'Admin') {
    return null;
  }

  if (profile.system_role !== 'Teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from('teacher_assignments')
    .select('id')
    .eq('school_id', schoolId)
    .eq('teacher_id', user.id)
    .eq('class_id', classId)
    .eq('academic_year_id', academicYearId)
    .limit(1)
    .maybeSingle();

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: 'You are not assigned to this class' }, { status: 403 });
  }

  return null;
}

/**
 * Resolve a stream to its class/year and authorize a grade operation.
 */
export async function requireGradeStreamAccess(
  request: NextRequest,
  schoolId: string,
  streamId: string,
  academicYearId: string
): Promise<NextResponse | null> {
  const supabase = getServerSupabaseClient();
  const { data: stream, error } = await supabase
    .from('school_class_streams')
    .select('school_class_id, academic_year_id')
    .eq('id', streamId)
    .eq('school_id', schoolId)
    .eq('academic_year_id', academicYearId)
    .single();

  if (error || !stream?.school_class_id) {
    return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
  }

  return requireGradeClassAccess(
    request,
    schoolId,
    stream.school_class_id,
    stream.academic_year_id
  );
}

/**
 * Authorize a grade operation through an assessment's stream and academic year.
 */
export async function requireGradeAssessmentAccess(
  request: NextRequest,
  schoolId: string,
  assessmentId: string
): Promise<NextResponse | null> {
  const supabase = getServerSupabaseClient();
  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('stream_id, academic_year_id')
    .eq('id', assessmentId)
    .eq('school_id', schoolId)
    .single();

  if (error || !assessment?.stream_id || !assessment.academic_year_id) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  return requireGradeStreamAccess(request, schoolId, assessment.stream_id, assessment.academic_year_id);
}

/**
 * Extract authenticated user ID from request
 * Returns the UUID of the authenticated user from Supabase JWT auth token
 * Returns null if user is not authenticated or token is invalid
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    // Get auth token from cookies (set during login)
    const authToken = request.cookies.get('sb-auth-token')?.value;
    
    if (!authToken) {
      console.warn('[v0] No auth token found in request cookies');
      return null;
    }
    
    // Parse JWT to get user ID (without verifying, just extracting payload)
    const parts = authToken.split('.');
    if (parts.length !== 3) {
      console.warn('[v0] Invalid JWT format in auth token');
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const userId = payload.sub;
    
    if (!userId) {
      console.warn('[v0] No user ID found in auth token');
      return null;
    }
    
    return userId;
  } catch (err) {
    console.error('[v0] Error extracting user ID from request:', err);
    return null;
  }
}
