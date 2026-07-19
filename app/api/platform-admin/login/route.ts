import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECAPTCHA_SECRET_KEY, RECAPTCHA_SCORE_THRESHOLD } from '@/lib/env';
import { validatePlatformAdminLogin } from '@/lib/schemas';
import { getClientIp } from '@/lib/auth-utils';
import { verifyPassword, create2FASession, generateSessionToken, storeSession } from '@/lib/platform-admin-auth.server';

// ============================================================================
// STRUCTURED LOGGING HELPER
// ============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR', action: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` | ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [ADMIN LOGIN] [${level}] ${action}${detailsStr}`);
}

// ============================================================================
// MAIN LOGIN HANDLER
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

    const validated = validatePlatformAdminLogin(body);
    if (!validated) {
      log('WARN', 'Validation failed - invalid input format');
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 400 }
      );
    }

    const { email, password, captchaToken } = validated;

    // ========================================================================
    // STEP 1: VERIFY CAPTCHA
    // ========================================================================

    if (captchaToken) {
      log('INFO', 'Starting CAPTCHA verification');

      try {
        const captchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!captchaResponse.ok) {
          log('ERROR', 'CAPTCHA API error', { status: captchaResponse.status });
          return NextResponse.json(
            { success: false, error: 'CAPTCHA verification failed' },
            { status: 400 }
          );
        }

        const captchaData = await captchaResponse.json() as { success: boolean; score?: number; action?: string; hostname?: string };
        log('INFO', 'CAPTCHA response received', { 
          success: captchaData.success, 
          score: captchaData.score, 
          action: captchaData.action,
          hostname: captchaData.hostname 
        });

        if (!captchaData.success) {
          log('WARN', 'CAPTCHA verification failed - response.success = false');
          return NextResponse.json(
            { success: false, error: 'CAPTCHA verification failed' },
            { status: 400 }
          );
        }

        // Check score against configurable threshold
        if (captchaData.score !== undefined && captchaData.score < RECAPTCHA_SCORE_THRESHOLD) {
          log('WARN', 'CAPTCHA score below threshold', { 
            score: captchaData.score, 
            threshold: RECAPTCHA_SCORE_THRESHOLD 
          });
          return NextResponse.json(
            { success: false, error: 'CAPTCHA verification failed' },
            { status: 400 }
          );
        }
      } catch (error) {
        log('ERROR', 'CAPTCHA verification exception', { 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
        return NextResponse.json(
          { success: false, error: 'CAPTCHA verification failed' },
          { status: 400 }
        );
      }
    }

    // ========================================================================
    // STEP 2: INITIALIZE SUPABASE CLIENT
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
    // STEP 3: LOOKUP PLATFORM ADMIN
    // ========================================================================

    log('INFO', 'Looking up platform admin', { email: email.substring(0, 3) + '***' });

    const { data: adminData, error: adminLookupError } = await supabase
      .from('platform_admins')
      .select('id, email, password_hash, totp_enabled, status')
      .eq('email', email)
      .single();

    if (adminLookupError || !adminData) {
      log('WARN', 'Admin lookup failed', { error: adminLookupError?.message });
      // Generic error to prevent email enumeration attacks
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    log('INFO', 'Admin lookup success', { 
      adminId: adminData.id, 
      status: adminData.status, 
      totpEnabled: adminData.totp_enabled 
    });

    // ========================================================================
    // STEP 4: CHECK ADMIN STATUS
    // ========================================================================

    if (adminData.status !== 'active') {
      log('WARN', 'Admin account not active', { status: adminData.status, adminId: adminData.id });

      // Log failed login
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          actor_id: adminData.id,
          action: 'login_failed_inactive_account',
          target_type: 'platform_admin',
          target_id: adminData.id,
          ip_address: clientIp,
          created_at: new Date().toISOString(),
        });

      if (auditError) {
        log('WARN', 'Failed to log inactive account attempt', { error: auditError.message });
      }

      return NextResponse.json(
        { success: false, error: 'Account is not active' },
        { status: 403 }
      );
    }

    // ========================================================================
    // STEP 5: VERIFY PASSWORD
    // ========================================================================

    log('INFO', 'Starting password verification', { 
      adminId: adminData.id,
      hashLength: adminData.password_hash?.length || 0
    });

    const passwordMatches = verifyPassword(password, adminData.password_hash);
    log('INFO', 'Password verification complete', { 
      adminId: adminData.id,
      matches: passwordMatches 
    });

    if (!passwordMatches) {
      log('WARN', 'Password verification failed', { adminId: adminData.id });

      // Log failed login attempt
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          actor_id: adminData.id,
          action: 'login_failed_invalid_password',
          target_type: 'platform_admin',
          target_id: adminData.id,
          ip_address: clientIp,
          created_at: new Date().toISOString(),
        });

      if (auditError) {
        log('WARN', 'Failed to log password failure', { error: auditError.message });
      }

      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // ========================================================================
    // STEP 6: CHECK IF 2FA IS ENABLED
    // ========================================================================

    if (adminData.totp_enabled) {
      log('INFO', '2FA enabled - creating temporary session', { adminId: adminData.id });

      const sessionId = await create2FASession(adminData.id);

      if (!sessionId) {
        log('ERROR', 'Failed to create 2FA session', { adminId: adminData.id });
        return NextResponse.json(
          { success: false, error: 'Failed to create 2FA session' },
          { status: 500 }
        );
      }

      log('INFO', '2FA session created', { adminId: adminData.id, sessionId });

      // Log 2FA request
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          actor_id: adminData.id,
          action: 'login_2fa_requested',
          target_type: 'platform_admin',
          target_id: adminData.id,
          ip_address: clientIp,
          created_at: new Date().toISOString(),
        });

      if (auditError) {
        log('WARN', 'Failed to log 2FA request', { error: auditError.message });
      }

      return NextResponse.json({
        success: true,
        requiresTwoFactor: true,
        sessionId,
      });
    }

    // ========================================================================
    // STEP 7: CREATE PERMANENT SESSION (NO 2FA)
    // ========================================================================

    log('INFO', '2FA not enabled - creating permanent session', { adminId: adminData.id });

    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    const token = generateSessionToken();

    const sessionStored = await storeSession(adminData.id, token, expiresAt);
    if (!sessionStored) {
      log('ERROR', 'Failed to store session', { adminId: adminData.id });
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    log('INFO', 'Session created and stored', { adminId: adminData.id });

    // ========================================================================
    // STEP 8: UPDATE LAST LOGIN
    // ========================================================================

    const { error: updateError } = await supabase
      .from('platform_admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', adminData.id);

    if (updateError) {
      log('WARN', 'Failed to update last_login_at', { 
        adminId: adminData.id, 
        error: updateError.message 
      });
    } else {
      log('INFO', 'Last login timestamp updated', { adminId: adminData.id });
    }

    // ========================================================================
    // STEP 9: LOG SUCCESSFUL LOGIN
    // ========================================================================

    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: adminData.id,
        action: 'login_success',
        target_type: 'platform_admin',
        target_id: adminData.id,
        ip_address: clientIp,
        created_at: new Date().toISOString(),
      });

    if (auditError) {
      log('WARN', 'Failed to log successful login', { error: auditError.message });
    } else {
      log('INFO', 'Login success audit logged', { adminId: adminData.id });
    }

    // ========================================================================
    // STEP 10: ISSUE SECURE COOKIE AND RESPOND
    // ========================================================================

    const response = NextResponse.json({
      success: true,
      requiresTwoFactor: false,
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
    log('INFO', 'Login success - session created', { 
      adminId: adminData.id, 
      durationMs: duration 
    });

    return response;

  } catch (error) {
    const duration = Date.now() - startTime;
    log('ERROR', 'Unhandled exception during login', { 
      message: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration
    });

    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
