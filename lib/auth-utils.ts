import type { Profile, SystemRole } from '@/types';
import { NextRequest } from 'next/server';
import { queryProfiles, querySchools } from './supabase';

/**
 * Extract school_id from request context and validate access
 * This is a simplified validation that assumes the school_id is passed as a query parameter
 * In a production system with proper Supabase auth integration, this would validate against auth.uid()
 */
export async function getSchoolIdFromRequest(
  request: NextRequest
): Promise<string | null> {
  try {
    // NOTE: In current implementation, school_id comes from query params
    // In production with Supabase auth, this would:
    // 1. Extract user ID from Supabase JWT (auth.uid())
    // 2. Look up user's school_id from profiles table
    // 3. Return that school_id
    // For now, APIs should validate school_id parameter matches an existing school
    const schoolId = request.nextUrl.searchParams.get('school_id');
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
