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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');
    const { id } = await params;

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: school, error } = await querySchools()
      .select('*')
      .eq('id', id)
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
        .eq('school_id', id),
      queryStudents()
        .select('id')
        .eq('school_id', id),
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminIdOrError = await requirePlatformAdmin('schools:update');
    if (adminIdOrError instanceof NextResponse) return adminIdOrError;
    const adminId = adminIdOrError;
    const { id } = await params;

    const body = await request.json();

    // If only updating status, allow that without requiring all fields
    if (body.status && !body.name && !body.email) {
      const { data: updatedSchool, error } = await querySchools()
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[v0] School status update error:', { error: error.message, code: error.code });
        return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data: updatedSchool,
      });
    }

    // For full updates, require name and email
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'School name and email are required' },
        { status: 400 }
      );
    }

    // Prepare update data - only include fields that are in the database
    const updateData: any = {
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      address: body.address || null,
      website: body.website || null,
      principal_name: body.principal_name || null,
      principal_email: body.principal_email || null,
      student_capacity: body.student_capacity ? parseInt(body.student_capacity) : null,
      founded_year: body.founded_year ? parseInt(body.founded_year) : null,
      status: body.status || 'pending_verification',
      updated_at: new Date().toISOString(),
    };

    // Get current school for audit log
    const { data: currentSchool } = await querySchools()
      .select('*')
      .eq('id', id)
      .single();

    // Update school
    const { data: updatedSchool, error } = await querySchools()
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[v0] School update error:', { error: error.message, code: error.code });
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Create audit log for changes
    await queryAuditLogs().insert({
      actor_id: adminId,
      action: 'school_updated',
      target_type: 'school',
      target_id: id,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminIdOrError = await requirePlatformAdmin('schools:delete');
    if (adminIdOrError instanceof NextResponse) return adminIdOrError;
    const adminId = adminIdOrError;
    const { id } = await params;

    // Get school for audit log
    const { data: school } = await querySchools()
      .select('name')
      .eq('id', id)
      .single();

    // Delete school
    const { error } = await querySchools()
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Create audit log
    await queryAuditLogs().insert({
      actor_id: adminId,
      action: 'school_deleted',
      target_type: 'school',
      target_id: id,
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
