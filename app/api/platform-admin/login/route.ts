import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECAPTCHA_SECRET_KEY } from '@/lib/env';
import { validatePlatformAdminLogin } from '@/lib/schemas';
import { getClientIp } from '@/lib/auth-utils';
import { verifyPassword, create2FASession } from '@/lib/platform-admin-auth.server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientIp = getClientIp(request.headers);

    // Validate input
    const validated = validatePlatformAdminLogin(body);
    if (!validated) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 400 }
      );
    }

    const { email, password, captchaToken } = validated;

    // Verify CAPTCHA if provided
    if (captchaToken) {
      const captchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
      });

      const captchaData = await captchaResponse.json() as { success: boolean; score?: number };
      if (!captchaData.success || (captchaData.score && captchaData.score < 0.5)) {
        return NextResponse.json(
          { success: false, error: 'CAPTCHA verification failed' },
          { status: 400 }
        );
      }
    }

    // Get Supabase client with service role
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up platform admin
    const { data: adminData, error: adminError } = await supabase
      .from('platform_admins')
      .select('id, email, password_hash, totp_enabled, status')
      .eq('email', email)
      .single();

    if (adminError || !adminData) {
      // Generic error to prevent email enumeration
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (adminData.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Account is not active' },
        { status: 403 }
      );
    }

    // Verify password
    if (!verifyPassword(password, adminData.password_hash)) {
      // Log failed login attempt
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: adminData.id,
          action: 'login_failed',
          target_type: 'platform_admin',
          target_id: adminData.id,
          ip_address: clientIp,
        });

      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // If TOTP is enabled, request 2FA
    if (adminData.totp_enabled) {
      // Create temporary 2FA session
      const sessionId = await create2FASession(adminData.id);

      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: 'Failed to create 2FA session' },
          { status: 500 }
        );
      }

      // Log 2FA request
      await supabase
        .from('audit_logs')
        .insert({
          actor_id: adminData.id,
          action: 'login_2fa_requested',
          target_type: 'platform_admin',
          target_id: adminData.id,
          ip_address: clientIp,
        });

      return NextResponse.json({
        success: true,
        requiresTwoFactor: true,
        sessionId,
      });
    }

    // No 2FA enabled, create session and issue token
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    const { generateSessionToken, storeSession } = await import('@/lib/platform-admin-auth.server');
    const token = generateSessionToken();

    const sessionStored = await storeSession(adminData.id, token, expiresAt);
    if (!sessionStored) {
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Log successful login
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: adminData.id,
        action: 'login_success',
        target_type: 'platform_admin',
        target_id: adminData.id,
        ip_address: clientIp,
      });

    // Update last login time
    await supabase
      .from('platform_admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', adminData.id);

    const response = NextResponse.json({
      success: true,
      requiresTwoFactor: false,
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
    console.error('[v0] Platform admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
