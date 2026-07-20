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

      const captchaData = await captchaResponse.json() as { success: boolean; score?: number };
      if (!captchaData.success || (captchaData.score && captchaData.score < 0.5)) {
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
      console.error('[v0] Login error:', authError);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profileData, error: profileError } = await queryProfiles()
      .select('system_role, status, school_id, setup_completed')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profileData) {
      console.error('[v0][LOGIN] ❌ Profile fetch error:', {
        email,
        userId: authData.user.id,
        profileError,
      });
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    console.log('[v0][LOGIN] Profile loaded:', {
      email,
      userId: authData.user.id,
      systemRole: profileData.system_role,
      userStatus: profileData.status,
      schoolId: profileData.school_id,
    });

    // Check if user is active
    if (profileData.status !== 'active') {
      console.error('[v0][LOGIN] ❌ User account not active:', {
        email,
        userId: authData.user.id,
        userStatus: profileData.status,
      });
      return NextResponse.json(
        { success: false, error: 'Your account is not active' },
        { status: 403 }
      );
    }

    // Check if school is approved
    console.log('[v0][LOGIN] Checking school approval status for school_id:', profileData.school_id);
    const { data: schoolCheckData, error: schoolCheckError } = await querySchools()
      .select('id, status, name')
      .eq('id', profileData.school_id)
      .single();

    if (schoolCheckError) {
      console.error('[v0][LOGIN] ❌ School fetch error:', {
        email,
        schoolId: profileData.school_id,
        error: schoolCheckError,
      });
      return NextResponse.json(
        { success: false, error: 'School information not found' },
        { status: 404 }
      );
    }

    console.log('[v0][LOGIN] School status retrieved:', {
      email,
      schoolId: profileData.school_id,
      schoolName: schoolCheckData?.name,
      schoolStatus: schoolCheckData?.status,
    });

    // Only allow login if school is approved (active)
    if (schoolCheckData?.status !== 'active') {
      console.error('[v0][LOGIN] ❌ School not approved (status is not active):', {
        email,
        schoolId: profileData.school_id,
        schoolName: schoolCheckData?.name,
        schoolStatus: schoolCheckData?.status,
      });
      return NextResponse.json(
        { success: false, error: 'Your school has not been approved yet. Please contact support.' },
        { status: 403 }
      );
    }

    console.log('[v0][LOGIN] ✅ School approval verified - proceeding with login');

    // Check if profile setup is completed
    const setupCompleted = profileData.setup_completed === true;
    console.log('[v0][LOGIN] Profile setup status:', {
      email,
      setupCompleted,
      schoolId: profileData.school_id,
    });

    // Get school details to send confirmation email
    const { data: schoolData } = await querySchools()
      .select('id, name')
      .eq('id', profileData.school_id)
      .single();

    // Send confirmation email to school (logged but user won't receive)
    if (schoolData) {
      const confirmationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">School Details Received</h2>
          <p>The following school details have been recorded and forwarded to our platform administrators for review:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>School Name:</strong> ${schoolData.name}</p>
            <p><strong>Contact Email:</strong> ${authData.user.email}</p>
            <p><strong>Status:</strong> Pending Admin Approval</p>
          </div>
          <p>Our administrators will review your school details and send you updates shortly.</p>
        </div>
      `;

      // Send email (logged but user won't receive it)
      const emailResult = await sendEmail({
        to: authData.user.email || '',
        subject: `School Registration Confirmation - ${schoolData.name}`,
        html: confirmationHtml,
      });

      console.log('[v0] Confirmation email sent (logged):', {
        success: emailResult.success,
        email: authData.user.email,
        schoolId: schoolData.id,
        schoolName: schoolData.name,
        note: 'Email logged but user may not receive it',
      });
    }

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
