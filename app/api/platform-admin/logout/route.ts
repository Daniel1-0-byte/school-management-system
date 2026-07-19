import { NextRequest, NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/platform-admin-auth.edge';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { getClientIp } from '@/lib/auth-utils';

// ============================================================================
// STRUCTURED LOGGING HELPER
// ============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR', action: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [ADMIN LOGOUT] [${level}] ${action}${detailsStr}`);
}

// ============================================================================
// MAIN LOGOUT HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIp = getClientIp(request.headers);
  const adminId = request.headers.get('x-admin-id');

  try {
    log('INFO', 'Logout request received', { ip: clientIp, hasAdminId: !!adminId });

    const token = request.cookies.get('platform-admin-token')?.value;

    if (!token) {
      log('WARN', 'No session token found in request');
    } else {
      log('INFO', 'Invalidating session token');
      const sessionInvalidated = await invalidateSession(token);
      if (sessionInvalidated) {
        log('INFO', 'Session token invalidated');
      } else {
        log('WARN', 'Failed to invalidate session token');
      }
    }

    // Log logout event if we have admin info from middleware
    if (adminId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      log('INFO', 'Logging logout event', { adminId });

      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminId,
            action: 'logout',
            target_type: 'platform_admin',
            target_id: adminId,
            ip_address: clientIp,
            created_at: new Date().toISOString(),
          });

        if (auditError) {
          log('WARN', 'Failed to log logout event', { error: auditError.message });
        } else {
          log('INFO', 'Logout event logged', { adminId });
        }
      } catch (error) {
        log('ERROR', 'Exception while logging logout', { 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    } else {
      log('WARN', 'Cannot log logout - missing admin context or Supabase config', { 
        hasAdminId: !!adminId,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY
      });
    }

    const response = NextResponse.json({
      success: true,
    });

    // Clear the session cookie
    response.cookies.delete('platform-admin-token');

    const duration = Date.now() - startTime;
    log('INFO', 'Logout completed successfully', { durationMs: duration });

    return response;

  } catch (error) {
    const duration = Date.now() - startTime;
    log('ERROR', 'Unhandled exception during logout', { 
      message: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration
    });

    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
