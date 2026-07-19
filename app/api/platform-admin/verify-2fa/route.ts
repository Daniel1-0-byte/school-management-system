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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, code } = body;
    const clientIp = getClientIp(request.headers);

    // Validate TOTP code format
    const validated = validateTwoFactorCode({ code });
    if (!validated) {
      return NextResponse.json(
        { success: false, error: 'Invalid code format' },
        { status: 400 }
      );
    }

    // Verify 2FA session exists and is not expired
    const adminId = await verify2FASession(sessionId);
    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Session expired. Please log in again.' },
        { status: 400 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get platform admin and TOTP secret
    const { data: adminData, error: adminError } = await supabase
      .from('platform_admins')
      .select('id, email, totp_secret')
      .eq('id', adminId)
      .single();

    if (adminError || !adminData || !adminData.totp_secret) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Verify TOTP code against stored secret
    if (!verifyTOTPCode(validated.code, adminData.totp_secret)) {
      // Log failed 2FA attempt
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: adminData.id,
          action: 'login_2fa_failed',
          target_type: 'platform_admin',
          target_id: adminData.id,
          ip_address: clientIp,
        });

      return NextResponse.json(
        { success: false, error: 'Invalid authentication code' },
        { status: 401 }
      );
    }

    // TOTP code verified, create session token
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    const token = generateSessionToken();

    const sessionStored = await storeSession(adminData.id, token, expiresAt);
    if (!sessionStored) {
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Consume the 2FA session
    await consume2FASession(sessionId);

    // Log successful 2FA
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: adminData.id,
        action: 'login_2fa_success',
        target_type: 'platform_admin',
        target_id: adminData.id,
        ip_address: clientIp,
      });

    // Update last login
    await supabase
      .from('platform_admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', adminData.id);

    const response = NextResponse.json({
      success: true,
    });

    // Set secure session cookie
    response.cookies.set({
      name: 'platform-admin-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return response;
  } catch (error) {
    console.error('[v0] 2FA verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
