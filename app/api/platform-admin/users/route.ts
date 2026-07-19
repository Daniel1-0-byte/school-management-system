import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/platform-admin/users - Fetch all users across all schools
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const schoolId = searchParams.get('schoolId') || '';

    let query = supabase
      .from('profiles')
      .select(
        '*, schools(id, name)',
        { count: 'exact' }
      );

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('system_role', role);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    query = query.order('created_at', { ascending: false });

    const start = (page - 1) * pageSize;
    query = query.range(start, start + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[v0] Failed to fetch users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: (page * pageSize) < (count || 0),
    });

  } catch (error) {
    console.error('[v0] Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/platform-admin/users - Bulk update users (deactivate, suspend, etc.)
export async function PUT(request: NextRequest) {
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
    const { userIds, action } = body; // action: 'suspend', 'deactivate', 'reactivate'

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Determine new status based on action
    let newStatus = 'active';
    if (action === 'suspend') newStatus = 'suspended';
    if (action === 'deactivate') newStatus = 'inactive';
    if (action === 'reactivate') newStatus = 'active';

    // Update all users
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .in('id', userIds);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Create audit logs for each user
    for (const userId of userIds) {
      await supabase.from('audit_logs').insert({
        actor_id: adminId,
        action: `user_${action}`,
        target_type: 'user',
        target_id: userId,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Users ${action}ed successfully`,
      count: userIds.length,
    });

  } catch (error) {
    console.error('[v0] Error updating users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
