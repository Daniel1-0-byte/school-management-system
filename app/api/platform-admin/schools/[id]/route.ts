import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-admin-middleware';
import {
  querySchools,
  queryProfiles,
  queryStudents,
  queryAuditLogs,
  formatSupabaseError,
} from '@/lib/supabase';

// GET /api/platform-admin/schools/[id] - Get school details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: school, error } = await querySchools()
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Fetch related data in parallel
    const [
      { data: users },
      { data: students },
    ] = await Promise.all([
      queryProfiles()
        .select('id, system_role, status')
        .eq('school_id', params.id),
      queryStudents()
        .select('id')
        .eq('school_id', params.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        school,
        users: users || [],
        students: students || [],
        stats: {
          totalUsers: users?.length || 0,
          totalStudents: students?.length || 0,
        },
      },
    });
  } catch (error) {
    console.error('[v0] Error fetching school:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/platform-admin/schools/[id] - Update school
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminIdOrError = await requirePlatformAdmin('schools:update');
    if (adminIdOrError instanceof NextResponse) return adminIdOrError;
    const adminId = adminIdOrError;

    const body = await request.json();

    // Get current school for audit log
    const { data: currentSchool } = await querySchools()
      .select('*')
      .eq('id', params.id)
      .single();

    // Update school
    const { data: updatedSchool, error } = await querySchools()
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Create audit log for changes
    await queryAuditLogs().insert({
      actor_id: adminId,
      action: 'school_updated',
      target_type: 'school',
      target_id: params.id,
      target_name: updatedSchool.name,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, data: updatedSchool });
  } catch (error) {
    console.error('[v0] Error updating school:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/platform-admin/schools/[id] - Delete school
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminIdOrError = await requirePlatformAdmin('schools:delete');
    if (adminIdOrError instanceof NextResponse) return adminIdOrError;
    const adminId = adminIdOrError;

    // Get school for audit log
    const { data: school } = await querySchools()
      .select('name')
      .eq('id', params.id)
      .single();

    // Delete school
    const { error } = await querySchools()
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Create audit log
    await queryAuditLogs().insert({
      actor_id: adminId,
      action: 'school_deleted',
      target_type: 'school',
      target_id: params.id,
      target_name: school?.name,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, message: 'School deleted successfully' });
  } catch (error) {
    console.error('[v0] Error deleting school:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
