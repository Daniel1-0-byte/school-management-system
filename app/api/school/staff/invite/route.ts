import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSupabaseClient, queryProfiles, queryAuditLogs, queryStaffInvitations, querySchools, formatSupabaseError } from '@/lib/supabase';
import { sendEmail, getStaffInvitationTemplate } from '@/lib/email';

const invitationSchema = z.object({
  first_name: z.string().min(1, 'First name required'),
  last_name: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  system_role: z.enum(['Teacher', 'Admin', 'Accountant', 'BusCoordinator']),
  department: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = invitationSchema.parse(body);

    const schoolId = request.nextUrl.searchParams.get('school_id');
    const invitedBy = request.nextUrl.searchParams.get('invited_by');

    if (!schoolId || !invitedBy) {
      return NextResponse.json(
        { error: 'School ID and invited_by are required' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();

    // Check if email already exists in this school
    const { data: existingProfile } = await queryProfiles()
      .select('id')
      .eq('email', validated.email)
      .eq('school_id', schoolId)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'User already exists in this school' },
        { status: 400 }
      );
    }

    // Get school name
    const { data: school } = await querySchools()
      .select('name')
      .eq('id', schoolId)
      .single();

    // Create invitation record
    const inviteToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const { data: invitation, error: inviteError } = await queryStaffInvitations()
      .insert({
        school_id: schoolId,
        email: validated.email,
        first_name: validated.first_name,
        last_name: validated.last_name,
        system_role: validated.system_role,
        department: validated.department,
        invite_token: inviteToken,
        expires_at: expiresAt,
        status: 'pending',
        invited_by: invitedBy,
      })
      .select()
      .single();

    if (inviteError) {
      console.error('[v0] Invitation creation error:', inviteError);
      return NextResponse.json({ error: formatSupabaseError(inviteError) }, { status: 400 });
    }

    // Send invitation email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/staff?token=${inviteToken}`;
    const staffName = `${validated.first_name} ${validated.last_name}`;
    const schoolName = school?.name || 'Your School';
    const emailHtml = getStaffInvitationTemplate(staffName, schoolName, inviteLink, validated.system_role);

    const emailResult = await sendEmail({
      to: validated.email,
      subject: `You've been invited to ${schoolName}`,
      html: emailHtml,
    });

    if (!emailResult.success) {
      console.error('[v0] Staff invitation email failed:', emailResult.error);
      // Continue anyway - invitation is created, email can be resent
    } else {
      console.log('[v0] Staff invitation email sent to:', validated.email);
    }

    // Log in audit log
    await queryAuditLogs().insert({
      actor_id: invitedBy,
      school_id: schoolId,
      action: 'staff_invited',
      target_type: 'staff',
      target_id: invitation.id,
      target_name: `${validated.first_name} ${validated.last_name}`,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation sent successfully',
        data: {
          id: invitation.id,
          email: validated.email,
          inviteLink, // For development - in production, send via email
          expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Staff invitation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}

// GET handler to list pending invitations
export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('school_id');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const { data, error } = await getServerSupabaseClient()
      .from('staff_invitations')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[v0] Failed to fetch invitations:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('[v0] Error fetching invitations:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}
