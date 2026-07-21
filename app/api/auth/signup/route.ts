import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECAPTCHA_SECRET_KEY } from '@/lib/env';
import { RECAPTCHA_VERIFY_URL } from '@/lib/api-constants';
import { validateSignup } from '@/lib/schemas';
import { getClientIp, generateInviteToken, getInviteExpirationTime } from '@/lib/auth-utils';
import { SchoolStatus } from '@/types';
import { sendEmail } from '@/lib/email';


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

    // Initialize Supabase client with service role key (for admin operations)
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      return NextResponse.json(
        { success: false, error: 'Failed to create school' },
        { status: 500 }
      );
    }

    // Add school to school_requests for platform admin review
    const { error: requestError } = await supabase
      .from('school_requests')
      .insert({
        school_name: schoolName,
        contact_person: `${firstName} ${lastName}`,
        email,
        phone,
        location: '',
        requested_plan: 'basic',
        status: 'pending',
        submitted_at: new Date().toISOString(),
      });

    // Create auth user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      if (authError?.message?.includes('already exists') || authError?.status === 422) {
        return NextResponse.json(
          { success: false, error: 'Email already registered' },
          { status: 400 }
        );
      }
      
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

    // Send signup confirmation email
    const welcomeHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { background: #667eea; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block; margin: 20px 0; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
            .highlight { background: #fffbeb; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to School Management System</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>Thank you for signing up <strong>${schoolName}</strong>! Your account has been successfully created.</p>
              <div class="highlight">
                <p><strong>What's next?</strong></p>
                <p>Our platform administrators will review your school details and add your school information. You'll receive another email once your school is approved and ready to use.</p>
              </div>
              <p>In the meantime, you can:</p>
              <ul>
                <li>Log in to your account</li>
                <li>Update your profile information</li>
                <li>Prepare to invite staff and students once approved</li>
              </ul>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" class="button">Sign In to Your Account</a>
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
              <div class="footer">
                <p>© 2026 School Management System. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: `Welcome to School Management System - ${schoolName}`,
      html: welcomeHtml,
    });

    return NextResponse.json({
      success: true,
      data: {
        schoolId: schoolData.id,
        userId: authData.user.id,
        email: authData.user.email,
      },
      redirectTo: '/setup',
      message: 'Signup successful! Complete your school setup now.',
    });
  } catch (error) {
    console.error('[v0] Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
