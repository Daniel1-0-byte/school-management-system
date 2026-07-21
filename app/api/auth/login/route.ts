import { NextRequest, NextResponse } from 'next/server';
import { RECAPTCHA_SECRET_KEY } from '@/lib/env';
import { RECAPTCHA_VERIFY_URL } from '@/lib/api-constants';
import { validateLogin } from '@/lib/schemas';
import { getClientIp } from '@/lib/auth-utils';
import { getServerSupabaseClient, queryProfiles, queryAuditLogs, querySchools } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientIp = getClientIp(request.headers);

    // Validate input
    const validated = validateLogin(body);
    if (!validated) {
      return NextResponse.json(
        { success: false, error: 'Invalid login credentials' },
        { status: 400 }
      );
    }

    const { email, password, captchaToken } = validated;

    // Verify CAPTCHA if token provided
    if (captchaToken) {
      const captchaResponse = await fetch(RECAPTCHA_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
      });

      const captchaData = await captchaResponse.json() as {
        success: boolean;
        score?: number;
      };

      if (!captchaData.success || (captchaData.score && captchaData.score < 0.5)) {
        console.error('[v0][LOGIN] CAPTCHA verification failed:', { email });
        return NextResponse.json(
          { success: false, error: 'CAPTCHA verification failed' },
          { status: 400 }
        );
      }
    }

    // Create Supabase client
    const supabase = getServerSupabaseClient();

    // Attempt login with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get user profile using service role client (bypasses RLS)
    console.log('[v0][LOGIN] Looking for profile:', { userId: authData.user.id, email });
    
    const { data: profileData, error: profileError } = await queryProfiles()
      .select('id, system_role, status, school_id, setup_completed')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('[v0][LOGIN] Profile query error:', { 
        error: profileError.message,
        code: profileError.code,
        status: profileError.status,
        userId: authData.user.id
      });
    }

    if (profileError || !profileData) {
      console.error('[v0][LOGIN] Profile not found for user:', { 
        userId: authData.user.id,
        email,
        profileExists: !!profileData,
        errorMessage: profileError?.message
      });
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if user is active
    if (profileData.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Your account is not active' },
        { status: 403 }
      );
    }

    // Check if school is approved
    const { data: schoolCheckData, error: schoolCheckError } = await querySchools()
      .select('id, status, name')
      .eq('id', profileData.school_id)
      .single();

    if (schoolCheckError) {
      return NextResponse.json(
        { success: false, error: 'School information not found' },
        { status: 404 }
      );
    }

    // Only allow login if school is approved (active)
    if (schoolCheckData?.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Your school has not been approved yet. Please contact support.' },
        { status: 403 }
      );
    }

    // Check if profile setup is completed
    const setupCompleted = profileData.setup_completed === true;

    // Log audit entry
    await queryAuditLogs().insert({
      actor_id: authData.user.id,
      school_id: profileData.school_id,
      action: 'login',
      target_type: 'user',
      target_id: authData.user.id,
      ip_address: clientIp,
    });

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      data: {
        userId: authData.user.id,
        email: authData.user.email,
        role: profileData.system_role,
        schoolId: profileData.school_id,
        setupCompleted: setupCompleted,
        needsSetup: !setupCompleted,
      },
    });

    // Set secure session cookie
    response.cookies.set({
      name: 'sb-auth-token',
      value: authData.session.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[v0] Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
