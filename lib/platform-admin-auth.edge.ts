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
    if (!token) {
      console.error('[v0] Session verification: missing token');
      return null;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('[v0] Session verification: Supabase client not available');
      return null;
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from('platform_admin_sessions')
      .select('admin_id, expires_at')
      .eq('token', token)
      .single();

    if (sessionError) {
      console.error('[v0] Session verification: lookup failed', {
        error: sessionError.message,
        code: sessionError.code
      });
      return null;
    }

    if (!sessionData) {
      console.error('[v0] Session verification: session not found');
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const expiresAt = new Date(sessionData.expires_at);

    if (expiresAt < now) {
      console.log('[v0] Session verification: session expired - cleaning up');
      
      const { error: deleteError } = await supabase
        .from('platform_admin_sessions')
        .delete()
        .eq('token', token);

      if (deleteError) {
        console.error('[v0] Session verification: failed to delete expired session', {
          error: deleteError.message
        });
      }

      return null;
    }

    // Fetch admin details
    const { data: adminData, error: adminError } = await supabase
      .from('platform_admins')
      .select('id, email, first_name, last_name')
      .eq('id', sessionData.admin_id)
      .single();

    if (adminError) {
      console.error('[v0] Session verification: admin lookup failed', {
        error: adminError.message,
        adminId: sessionData.admin_id
      });
      return null;
    }

    if (!adminData) {
      console.error('[v0] Session verification: admin not found', {
        adminId: sessionData.admin_id
      });
      return null;
    }

    console.log('[v0] Session verification: success', {
      adminId: adminData.id,
      expiresIn: Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
    });

    return {
      adminId: adminData.id,
      email: adminData.email,
      firstName: adminData.first_name,
      lastName: adminData.last_name,
      createdAt: new Date().toISOString(),
      expiresAt: sessionData.expires_at,
    };

  } catch (error) {
    console.error('[v0] Session verification: unexpected exception', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Invalidate a session (delete it from database)
 * EDGE SAFE: Only database deletion, no crypto operations
 */
export async function invalidateSession(token: string): Promise<boolean> {
  try {
    if (!token) {
      console.error('[v0] Session invalidation: missing token');
      return false;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('[v0] Session invalidation: Supabase client not available');
      return false;
    }

    const { data, error } = await supabase
      .from('platform_admin_sessions')
      .delete()
      .eq('token', token)
      .select();

    if (error) {
      console.error('[v0] Session invalidation: delete failed', {
        error: error.message,
        code: error.code
      });
      return false;
    }

    if (!data || data.length === 0) {
      console.warn('[v0] Session invalidation: no session found to delete');
      return false;
    }

    console.log('[v0] Session invalidation: success');
    return true;

  } catch (error) {
    console.error('[v0] Session invalidation: unexpected exception', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
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
      console.error('[v0] Session cleanup: Supabase client not available');
      return 0;
    }

    const now = new Date().toISOString();
    const { data: deletedSessions, error } = await supabase
      .from('platform_admin_sessions')
      .delete()
      .lt('expires_at', now)
      .select();

    if (error) {
      console.error('[v0] Session cleanup: delete failed', {
        error: error.message,
        code: error.code
      });
      return 0;
    }

    const deletedCount = deletedSessions?.length || 0;
    if (deletedCount > 0) {
      console.log('[v0] Session cleanup: success', { deletedCount });
    }

    return deletedCount;

  } catch (error) {
    console.error('[v0] Session cleanup: unexpected exception', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    return 0;
  }
}
