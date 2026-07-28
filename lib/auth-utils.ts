import type { Profile, SystemRole } from '@/types';
import { NextRequest } from 'next/server';
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
