import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/platform-admin/school-requests - Fetch all school requests
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    // Build query
    let query = supabase
      .from('school_requests')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`school_name.ilike.%${search}%,email.ilike.%${search}%,contact_person.ilike.%${search}%`);
    }

    query = query.order('submitted_at', { ascending: false });

    const start = (page - 1) * pageSize;
    query = query.range(start, start + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[v0] Failed to fetch school requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch school requests' },
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
    console.error('[v0] Error fetching school requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/platform-admin/school-requests - Approve or reject a school request
export async function POST(request: NextRequest) {
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
    const {
      requestId,
      action, // 'approve' or 'reject'
      rejectionReason,
      rejectionNotes,
    } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the school request
    const { data: schoolRequest, error: fetchError } = await supabase
      .from('school_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'School request not found' },
        { status: 404 }
      );
    }

    if (action === 'reject') {
      // Update request to rejected
      const { data: updated, error: updateError } = await supabase
        .from('school_requests')
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
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        );
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
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
      // Update request to approved (provisioning happens separately)
      const { data: updated, error: updateError } = await supabase
        .from('school_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        );
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
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

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[v0] Error processing school request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
