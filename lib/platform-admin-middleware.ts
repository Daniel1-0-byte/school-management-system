import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Reusable helper to extract and verify authenticated platform admin ID
 * Use this in all protected platform admin API endpoints
 * 
 * Example usage:
 * ```
 * const adminId = await getAuthenticatedPlatformAdmin('schools:read');
 * if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * ```
 */
export async function getAuthenticatedPlatformAdmin(action?: string): Promise<string | null> {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');
    const token = headersList.get('x-platform-admin-token');

    console.log('[v0][AUTH-HELPER] Admin authentication check:', {
      action,
      hasAdminId: !!adminId,
      hasToken: !!token,
    });

    if (!adminId) {
      console.warn('[v0][AUTH-HELPER] x-admin-id header missing');
      return null;
    }

    if (!token) {
      console.warn('[v0][AUTH-HELPER] x-platform-admin-token header missing');
      return null;
    }

    console.log('[v0][AUTH-HELPER] Admin authenticated:', { adminId, action });
    return adminId;

  } catch (error) {
    console.error('[v0][AUTH-HELPER] Exception during auth check:', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Middleware-style response helper for protecting endpoints
 * Returns error response if not authenticated
 * 
 * Example usage:
 * ```
 * const adminIdOrError = await requirePlatformAdmin('schools:read');
 * if (adminIdOrError instanceof NextResponse) return adminIdOrError;
 * const adminId = adminIdOrError;
 * ```
 */
export async function requirePlatformAdmin(action?: string): Promise<string | NextResponse> {
  const adminId = await getAuthenticatedPlatformAdmin(action);
  
  if (!adminId) {
    console.error('[v0][AUTH-HELPER] Authentication required:', { action });
    return NextResponse.json(
      { error: 'Unauthorized', details: 'Platform admin authentication required' },
      { status: 401 }
    );
  }

  return adminId;
}
