import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient, queryProfiles, queryAuditLogs, formatSupabaseError } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    console.log('[v0] Email verification POST:', { tokenExists: !!token, email });

    if (!token || !email) {
      console.log('[v0] Missing verification parameters');
      return NextResponse.json({ error: 'Verification token and email required' }, { status: 400 });
    }

    // Find profile with matching invite token
    console.log('[v0] Looking up profile with invite token');
    const { data: profile, error: profileError } = await queryProfiles()
      .select('id, email, invite_token, invite_expires_at, email_verified, school_id')
      .eq('invite_token', token)
      .single();

    if (profileError || !profile) {
      console.error('[v0] Profile not found with token:', { profileError });
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    console.log('[v0] Profile found:', { profileId: profile.id, expiresAt: profile.invite_expires_at });

    // Check if token has expired
    if (profile.invite_expires_at && new Date(profile.invite_expires_at) < new Date()) {
      console.log('[v0] Token expired');
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
    }

    // Check if already verified
    if (profile.email_verified) {
      console.log('[v0] Email already verified');
      return NextResponse.json({ 
        success: true, 
        message: 'Email already verified',
        user: {
          id: profile.id,
          email: profile.email,
        },
      });
    }

    // Update profile to mark as verified
    console.log('[v0] Marking email as verified');
    const { error: updateError } = await queryProfiles()
      .update({ 
        email_verified: true,
        invite_token: null, // Clear token after use
        invite_expires_at: null,
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('[v0] Profile update error:', updateError);
      return NextResponse.json({ error: formatSupabaseError(updateError) }, { status: 500 });
    }

    console.log('[v0] Profile updated, logging verification');

    // Log the verification
    await queryAuditLogs().insert({
      actor_id: profile.id,
      school_id: profile.school_id,
      action: 'email_verified',
      target_type: 'user',
      target_id: profile.id,
      ip_address: 'email-verification',
    });

    console.log('[v0] Email verification successful');

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: profile.id,
        email: profile.email,
      },
    });
  } catch (error) {
    console.error('[v0] Email verification error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

// GET handler for email verification link clicks
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    console.log('[v0] Email verification GET handler:', { tokenExists: !!token, email });

    if (!token || !email) {
      console.log('[v0] Missing token or email in GET request');
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    // Call the POST endpoint to verify
    console.log('[v0] Calling verification API');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyResponse = await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      console.error('[v0] Verification API error:', { status: verifyResponse.status, data: verifyData });
      return NextResponse.redirect(new URL(`/login?error=${verifyData.error || 'verification_failed'}`, request.url));
    }

    console.log('[v0] Verification successful, redirecting to dashboard');

    // Redirect to login page with success message
    return NextResponse.redirect(
      new URL('/login?verified=true', request.url)
    );
  } catch (error) {
    console.error('[v0] Email verification GET error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.redirect(new URL('/login?error=verification_failed', request.url));
  }
}
