import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/platform-admin/schools/[id] - Get school details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch school
    const { data: school, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Fetch related data
    const [
      { data: users },
      { data: students },
      { data: subscription },
      { data: academicYears },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, system_role, status')
        .eq('school_id', params.id),
      supabase
        .from('students')
        .select('id')
        .eq('school_id', params.id),
      supabase
        .from('school_subscriptions')
        .select('*, subscription_plans(name)')
        .eq('school_id', params.id)
        .single(),
      supabase
        .from('academic_years')
        .select('id, year, is_active')
        .eq('school_id', params.id)
        .order('year', { ascending: false }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        school,
        users: users || [],
        students: students || [],
        subscription,
        academicYears: academicYears || [],
        stats: {
          totalUsers: users?.length || 0,
          totalStudents: students?.length || 0,
        },
      },
    });

  } catch (error) {
    console.error('[v0] Error fetching school:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/platform-admin/schools/[id] - Update school
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current school for audit log
    const { data: currentSchool } = await supabase
      .from('schools')
      .select('*')
      .eq('id', params.id)
      .single();

    // Update school
    const { data: updatedSchool, error } = await supabase
      .from('schools')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Create audit log for changes
    await supabase.from('audit_logs').insert({
      actor_id: adminId,
      action: 'school_updated',
      target_type: 'school',
      target_id: params.id,
      target_name: updatedSchool.name,
      changes: { before: currentSchool, after: updatedSchool },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      data: updatedSchool,
    });

  } catch (error) {
    console.error('[v0] Error updating school:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/platform-admin/schools/[id] - Delete school
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get school for audit log
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', params.id)
      .single();

    // Delete school
    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      actor_id: adminId,
      action: 'school_deleted',
      target_type: 'school',
      target_id: params.id,
      target_name: school?.name,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: 'School deleted successfully',
    });

  } catch (error) {
    console.error('[v0] Error deleting school:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
