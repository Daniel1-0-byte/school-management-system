import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import type { PlatformAdminSession } from '@/lib/platform-admin-auth.types';

/**
 * Platform Admin Authentication - Edge Runtime Safe
 * Contains only functions that are compatible with Next.js Edge Runtime
 * No crypto, fs, or other Node-only modules imported
 */

export type { PlatformAdminSession } from '@/lib/platform-admin-auth.types';

// ============================================================================
// SUPABASE CLIENT HELPER (Edge-safe)
// ============================================================================

/**
 * Get a Supabase client with service role key
 * Returns null if credentials are not available
 * EDGE SAFE: Only uses @supabase/supabase-js which supports Edge Runtime
 */
function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ============================================================================
// SESSION VERIFICATION (Edge-safe)
// ============================================================================

/**
 * Verify and retrieve a session from the database
 * EDGE SAFE: Only database queries, no crypto operations
 */
export async function verifySession(token: string): Promise<PlatformAdminSession | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return null;
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from('platform_admin_sessions')
      .select('admin_id, expires_at')
      .eq('token', token)
      .single();

    if (sessionError || !sessionData) {
      return null;
    }

    // Check if session has expired
    if (new Date(sessionData.expires_at) < new Date()) {
      // Delete expired session
      await supabase
        .from('platform_admin_sessions')
        .delete()
        .eq('token', token);
      return null;
    }

    // Fetch admin details
    const { data: adminData, error: adminError } = await supabase
      .from('platform_admins')
      .select('id, email, first_name, last_name')
      .eq('id', sessionData.admin_id)
      .single();

    if (adminError || !adminData) {
      return null;
    }

    return {
      adminId: adminData.id,
      email: adminData.email,
      firstName: adminData.first_name,
      lastName: adminData.last_name,
      createdAt: new Date().toISOString(),
      expiresAt: sessionData.expires_at,
    };
  } catch (error) {
    console.error('[v0] Session verification error:', error);
    return null;
  }
}

/**
 * Invalidate a session (delete it from database)
 * EDGE SAFE: Only database deletion, no crypto operations
 */
export async function invalidateSession(token: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return false;
    }

    const { error } = await supabase
      .from('platform_admin_sessions')
      .delete()
      .eq('token', token);

    if (error) {
      console.error('[v0] Failed to invalidate session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[v0] Session invalidation error:', error);
    return false;
  }
}

/**
 * Clean up expired sessions from the database
 * EDGE SAFE: Only database queries, no crypto operations
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return 0;
    }

    const { data: deletedSessions, error } = await supabase
      .from('platform_admin_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      console.error('[v0] Failed to cleanup expired sessions:', error);
      return 0;
    }

    return deletedSessions?.length || 0;
  } catch (error) {
    console.error('[v0] Cleanup error:', error);
    return 0;
  }
}
