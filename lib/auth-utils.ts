import type { Profile, SystemRole } from '@/types';

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
