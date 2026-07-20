import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { queryProfiles, getPaginatedResults, queryAuditLogs, formatSupabaseError } from '@/lib/supabase';

// GET /api/platform-admin/users - Fetch all users across all schools
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    console.log('[v0][ADMIN-USERS] GET request started:', { adminId });

    if (!adminId) {
      console.error('[v0][ADMIN-USERS] No admin ID in headers');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const schoolId = searchParams.get('schoolId') || '';

    console.log('[v0][ADMIN-USERS] Query parameters:', { page, pageSize, search, role, status, schoolId });

    let query = queryProfiles().select('*, schools(id, name)', { count: 'exact' });

    if (search) {
      console.log('[v0][ADMIN-USERS] Applying search filter:', { search });
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    if (role) {
      console.log('[v0][ADMIN-USERS] Applying role filter:', { role });
      query = query.eq('system_role', role);
    }

    if (status) {
      console.log('[v0][ADMIN-USERS] Applying status filter:', { status });
      query = query.eq('status', status);
    }

    if (schoolId) {
      console.log('[v0][ADMIN-USERS] Applying school filter:', { schoolId });
      query = query.eq('school_id', schoolId);
    }

    query = query.order('created_at', { ascending: false });

    console.log('[v0][ADMIN-USERS] About to execute query');
    const { data, error, count } = await getPaginatedResults(query, page, pageSize);

    console.log('[v0][ADMIN-USERS] Query result:', {
      hasError: !!error,
      errorMessage: error?.message,
      dataCount: data?.length,
      totalCount: count,
    });

    if (error) {
      console.error('[v0][ADMIN-USERS] ❌ Failed to fetch users:', {
        error: error.message,
        code: error.code,
        status: error.status,
        details: error.details,
      });
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    console.log('[v0][ADMIN-USERS] ✅ Successfully fetched users');
    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: page * pageSize < (count || 0),
    });
  } catch (error) {
    console.error('[v0][ADMIN-USERS] ❌ Unexpected error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/platform-admin/users - Bulk update users (deactivate, suspend, etc.)
export async function PUT(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userIds, action } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 });
    }

    let newStatus = 'active';
    if (action === 'suspend') newStatus = 'suspended';
    if (action === 'deactivate') newStatus = 'inactive';
    if (action === 'reactivate') newStatus = 'active';

    const { error } = await queryProfiles()
      .update({ status: newStatus })
      .in('id', userIds);

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Create audit logs for each user
    for (const userId of userIds) {
      await queryAuditLogs().insert({
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
