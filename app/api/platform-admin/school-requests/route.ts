import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  querySchoolRequests,
  queryAuditLogs,
  getPaginatedResults,
  formatSupabaseError,
} from '@/lib/supabase';

// GET /api/platform-admin/school-requests - Fetch all school requests
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    let query = querySchoolRequests().select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(
        `school_name.ilike.%${search}%,email.ilike.%${search}%,contact_person.ilike.%${search}%`
      );
    }

    query = query.order('submitted_at', { ascending: false });

    const { data, error, count } = await getPaginatedResults(query, page, pageSize);

    if (error) {
      console.error('[v0] Failed to fetch school requests:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: page * pageSize < (count || 0),
    });
  } catch (error) {
    console.error('[v0] Error fetching school requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/platform-admin/school-requests - Approve or reject a school request
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, action, rejectionReason, rejectionNotes } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    // Get the school request
    const { data: schoolRequest, error: fetchError } = await querySchoolRequests()
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'School request not found' }, { status: 404 });
    }

    if (action === 'reject') {
      const { data: updated, error: updateError } = await querySchoolRequests()
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          rejection_notes: rejectionNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: formatSupabaseError(updateError) }, { status: 400 });
      }

      await queryAuditLogs().insert({
        actor_id: adminId,
        action: 'school_request_rejected',
        target_type: 'school_request',
        target_id: requestId,
        target_name: schoolRequest.school_name,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

      return NextResponse.json({
        success: true,
        message: 'School request rejected',
        data: updated,
      });
    } else if (action === 'approve') {
      const { data: updated, error: updateError } = await querySchoolRequests()
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: formatSupabaseError(updateError) }, { status: 400 });
      }

      await queryAuditLogs().insert({
        actor_id: adminId,
        action: 'school_request_approved',
        target_type: 'school_request',
        target_id: requestId,
        target_name: schoolRequest.school_name,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

      return NextResponse.json({
        success: true,
        message: 'School request approved',
        data: updated,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[v0] Error processing school request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
