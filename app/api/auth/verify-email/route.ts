import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient, queryProfiles, queryAuditLogs, formatSupabaseError } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Verification token required' }, { status: 400 });
    }

    const supabase = getServerSupabaseClient();

    // Verify the email using Supabase Auth
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error) {
      console.error('[v0] Email verification error:', error);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    if (!data.user?.id) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    // Update profile status to verified
    const { error: updateError } = await queryProfiles()
      .update({ email_verified: true })
      .eq('id', data.user.id);

    if (updateError) {
      console.error('[v0] Profile update error:', updateError);
      return NextResponse.json({ error: formatSupabaseError(updateError) }, { status: 400 });
    }

    // Log the verification
    const { data: profile } = await queryProfiles()
      .select('school_id')
      .eq('id', data.user.id)
      .single();

    await queryAuditLogs().insert({
      actor_id: data.user.id,
      school_id: profile?.school_id,
      action: 'email_verified',
      target_type: 'user',
      target_id: data.user.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error('[v0] Email verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

// GET handler for email verification link clicks
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (!token || type !== 'email') {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    // Redirect to verification page with token
    return NextResponse.redirect(
      new URL(`/verify-email?token=${encodeURIComponent(token)}`, request.url)
    );
  } catch (error) {
    console.error('[v0] Email verification GET error:', error);
    return NextResponse.redirect(new URL('/login?error=verification_failed', request.url));
  }
}
