import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECAPTCHA_SECRET_KEY } from '@/lib/env';
import { validateSignup } from '@/lib/schemas';
import { getClientIp, generateInviteToken, getInviteExpirationTime } from '@/lib/auth-utils';
import { SchoolStatus } from '@/types';
import { sendEmail, getEmailVerificationTemplate } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request.headers);

    // Parse request body
    const body = await request.json();
    
    // Validate input data
    const validated = validateSignup(body);
    if (!validated) {
      return NextResponse.json(
        { success: false, error: 'Invalid signup data' },
        { status: 400 }
      );
    }

    const {
      schoolName,
      firstName,
      lastName,
      email,
      phone,
      password,
      captchaToken,
    } = validated;

    // Verify CAPTCHA token with Google
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

    // Initialize Supabase client with service role key (for admin operations)
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Create school first
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: schoolName,
        status: SchoolStatus.PendingVerification,
      })
      .select()
      .single();

    if (schoolError || !schoolData) {
      console.error('[v0] School creation error:', schoolError);
      return NextResponse.json(
        { success: false, error: 'Failed to create school' },
        { status: 500 }
      );
    }

    // Create auth user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email verification
    });

    if (authError || !authData.user) {
      console.error('[v0] Auth user creation error:', authError);
      return NextResponse.json(
        { success: false, error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Create profile linked to auth user and school
    const inviteToken = generateInviteToken();
    const inviteExpires = getInviteExpirationTime();

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        school_id: schoolData.id,
        system_role: 'Admin',
        first_name: firstName,
        last_name: lastName,
        phone,
        status: 'active',
        invite_token: inviteToken,
        invite_expires_at: inviteExpires.toISOString(),
      });

    if (profileError) {
      console.error('[v0] Profile creation error:', profileError);
      // Clean up: delete the auth user since profile creation failed
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { success: false, error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Log audit entry
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: authData.user.id,
        action: 'signup',
        target_type: 'school',
        target_id: schoolData.id,
        target_name: schoolName,
        school_id: schoolData.id,
        ip_address: clientIp,
      });

    // Send verification email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationToken = inviteToken; // Use the same token we created for the profile
    const verificationLink = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    console.log('[v0] Email verification setup:', {
      email,
      schoolName,
      verificationLink,
      appUrl,
      tokenExists: !!verificationToken,
      resendApiKeyExists: !!process.env.RESEND_API_KEY,
      resendFromEmail: process.env.RESEND_FROM_EMAIL,
    });
    
    const emailHtml = getEmailVerificationTemplate(verificationLink, schoolName);
    
    console.log('[v0] Generated email template, starting send...');
    
    const emailResult = await sendEmail({
      to: email,
      subject: `Verify your email - ${schoolName} School Management System`,
      html: emailHtml,
    });

    console.log('[v0] Email send result:', {
      success: emailResult.success,
      error: emailResult.error || null,
      email,
      schoolName,
      timestamp: new Date().toISOString(),
    });

    if (!emailResult.success) {
      console.error('[v0] Email send failed but continuing:', {
        error: emailResult.error,
        email,
        schoolName,
        verificationLink,
      });
      // Continue anyway - user can resend email
    } else {
      console.log('[v0] ✓ Verification email sent successfully to:', email);
    }

    return NextResponse.json({
      success: true,
      data: {
        schoolId: schoolData.id,
        userId: authData.user.id,
        message: 'Please check your email to verify your account',
      },
    });
  } catch (error) {
    console.error('[v0] Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
