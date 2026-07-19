import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabaseClient, formatSupabaseError, queryAuditLogs } from '@/lib/supabase';

const acceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// GET handler to validate invitation token
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const supabase = getServerSupabaseClient();

    // Find the invitation
    const { data: invitation, error } = await supabase
      .from('staff_invitations')
      .select('*, schools(name)')
      .eq('invite_token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Check if already accepted
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation already used' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        system_role: invitation.system_role,
        department: invitation.department,
        school_id: invitation.school_id,
        school_name: invitation.schools?.name,
      },
    });
  } catch (error) {
    console.error('[v0] Invitation validation error:', error);
    return NextResponse.json({ error: 'Failed to validate invitation' }, { status: 500 });
  }
}

// POST handler to accept invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = acceptSchema.parse(body);

    const supabase = getServerSupabaseClient();

    // Find the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('invite_token', token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Check if already accepted
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation already used' }, { status: 400 });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Email already verified via invitation
    });

    if (authError || !authData.user) {
      console.error('[v0] Auth user creation error:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        school_id: invitation.school_id,
        email: invitation.email,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        system_role: invitation.system_role,
        department: invitation.department,
        status: 'active',
        email_verified: true,
      });

    if (profileError) {
      console.error('[v0] Profile creation error:', profileError);
      return NextResponse.json({ error: formatSupabaseError(profileError) }, { status: 400 });
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('staff_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        user_id: authData.user.id,
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('[v0] Invitation update error:', updateError);
    }

    // Log in audit logs
    await queryAuditLogs().insert({
      actor_id: authData.user.id,
      school_id: invitation.school_id,
      action: 'staff_account_created_via_invite',
      target_type: 'staff',
      target_id: authData.user.id,
      target_name: `${invitation.first_name} ${invitation.last_name}`,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    });
  } catch (error) {
    console.error('[v0] Invitation acceptance error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
