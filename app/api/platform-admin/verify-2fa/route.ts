import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { validateTwoFactorCode } from '@/lib/schemas';
import { getClientIp } from '@/lib/auth-utils';
import {
  verifyTOTPCode,
  verify2FASession,
  consume2FASession,
  generateSessionToken,
  storeSession,
} from '@/lib/platform-admin-auth.server';

// ============================================================================
// STRUCTURED LOGGING HELPER
// ============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR', action: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [2FA VERIFY] [${level}] ${action}${detailsStr}`);
}

// ============================================================================
// MAIN 2FA VERIFICATION HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIp = getClientIp(request.headers);

  try {
    log('INFO', 'Request received', { ip: clientIp });

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      log('ERROR', 'Invalid JSON payload');
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { sessionId, code } = body as { sessionId?: string; code?: string };

    if (!sessionId || !code) {
      log('WARN', 'Missing required fields', { hasSessionId: !!sessionId, hasCode: !!code });
      return NextResponse.json(
        { success: false, error: 'Missing sessionId or code' },
        { status: 400 }
      );
    }

    // ========================================================================
    // STEP 1: VALIDATE TOTP CODE FORMAT
    // ========================================================================

    log('INFO', 'Validating TOTP code format');

    const validated = validateTwoFactorCode({ code });
    if (!validated) {
      log('WARN', 'TOTP code validation failed - invalid format');
      return NextResponse.json(
        { success: false, error: 'Invalid code format' },
        { status: 400 }
      );
    }

    // ========================================================================
    // STEP 2: VERIFY 2FA SESSION
    // ========================================================================

    log('INFO', 'Verifying 2FA session', { sessionId: sessionId.substring(0, 8) + '***' });

    const adminId = await verify2FASession(sessionId);
    if (!adminId) {
      log('WARN', 'Invalid or expired 2FA session', { sessionId: sessionId.substring(0, 8) + '***' });
      return NextResponse.json(
        { success: false, error: 'Session expired. Please log in again.' },
        { status: 400 }
      );
    }

    log('INFO', '2FA session verified', { adminId });

    // ========================================================================
    // STEP 3: INITIALIZE SUPABASE CLIENT
    // ========================================================================

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      log('ERROR', 'Missing Supabase configuration');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ========================================================================
    // STEP 4: FETCH ADMIN AND TOTP SECRET
    // ========================================================================

    log('INFO', 'Fetching admin and TOTP secret', { adminId });

    const { data: adminData, error: adminError } = await supabase
      .from('platform_admins')
      .select('id, email, totp_secret')
      .eq('id', adminId)
      .single();

    if (adminError || !adminData) {
      log('ERROR', 'Admin lookup failed', { error: adminError?.message, adminId });
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    if (!adminData.totp_secret) {
      log('ERROR', 'TOTP secret not configured', { adminId });
      return NextResponse.json(
        { success: false, error: 'TOTP not configured' },
        { status: 500 }
      );
    }

    log('INFO', 'Admin and TOTP secret retrieved', { adminId });

    // ========================================================================
    // STEP 5: VERIFY TOTP CODE
    // ========================================================================

    log('INFO', 'Verifying TOTP code', { adminId });

    const codeValid = verifyTOTPCode(validated.code, adminData.totp_secret);
    log('INFO', 'TOTP code verification complete', { adminId, valid: codeValid });

    if (!codeValid) {
      log('WARN', 'TOTP code verification failed', { adminId });

      // Log failed 2FA attempt
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          actor_id: adminData.id,
          action: 'login_2fa_failed',
          target_type: 'platform_admin',
          target_id: adminData.id,
          ip_address: clientIp,
          created_at: new Date().toISOString(),
        });

      if (auditError) {
        log('WARN', 'Failed to log 2FA failure', { error: auditError.message });
      }

      return NextResponse.json(
        { success: false, error: 'Invalid authentication code' },
        { status: 401 }
      );
    }

    // ========================================================================
    // STEP 6: CREATE PERMANENT SESSION
    // ========================================================================

    log('INFO', 'Creating permanent session', { adminId });

    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    const token = generateSessionToken();

    const sessionStored = await storeSession(adminData.id, token, expiresAt);
    if (!sessionStored) {
      log('ERROR', 'Failed to store permanent session', { adminId });
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    log('INFO', 'Permanent session created', { adminId });

    // ========================================================================
    // STEP 7: CONSUME 2FA SESSION
    // ========================================================================

    log('INFO', 'Consuming 2FA session', { adminId });

    const sessionConsumed = await consume2FASession(sessionId);
    if (!sessionConsumed) {
      log('WARN', 'Failed to consume 2FA session', { adminId });
    } else {
      log('INFO', '2FA session consumed', { adminId });
    }

    // ========================================================================
    // STEP 8: UPDATE LAST LOGIN
    // ========================================================================

    const { error: updateError } = await supabase
      .from('platform_admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', adminData.id);

    if (updateError) {
      log('WARN', 'Failed to update last_login_at', { adminId, error: updateError.message });
    } else {
      log('INFO', 'Last login timestamp updated', { adminId });
    }

    // ========================================================================
    // STEP 9: LOG SUCCESSFUL 2FA
    // ========================================================================

    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: adminData.id,
        action: 'login_2fa_success',
        target_type: 'platform_admin',
        target_id: adminData.id,
        ip_address: clientIp,
        created_at: new Date().toISOString(),
      });

    if (auditError) {
      log('WARN', 'Failed to log 2FA success', { error: auditError.message });
    } else {
      log('INFO', '2FA success audit logged', { adminId });
    }

    // ========================================================================
    // STEP 10: ISSUE SECURE COOKIE AND RESPOND
    // ========================================================================

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set({
      name: 'platform-admin-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    const duration = Date.now() - startTime;
    log('INFO', '2FA verification success - session created', { 
      adminId, 
      durationMs: duration 
    });

    return response;

  } catch (error) {
    const duration = Date.now() - startTime;
    log('ERROR', 'Unhandled exception during 2FA verification', { 
      message: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration
    });

    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
