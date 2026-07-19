import { NextRequest, NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/platform-admin-auth.edge';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { getClientIp } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('platform-admin-token')?.value;
    const clientIp = getClientIp(request.headers);

    if (token) {
      // Invalidate the session
      await invalidateSession(token);
    }

    // Log logout event if we have admin info from middleware
    const adminId = request.headers.get('x-admin-id');
    if (adminId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminId,
            action: 'logout',
            target_type: 'platform_admin',
            target_id: adminId,
            ip_address: clientIp,
          });
      } catch (error) {
        console.error('[v0] Failed to log logout event:', error);
      }
    }

    const response = NextResponse.json({
      success: true,
    });

    // Clear the session cookie
    response.cookies.delete('platform-admin-token');

    return response;
  } catch (error) {
    console.error('[v0] Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
