import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  querySchoolRequests,
  queryAuditLogs,
  queryProfiles,
  getPaginatedResults,
  formatSupabaseError,
} from '@/lib/supabase';
import { sendEmail, getSchoolApprovalNotificationTemplate } from '@/lib/email';
import { verifySession } from '@/lib/platform-admin-auth.edge';

// GET /api/platform-admin/school-requests - Fetch all school requests
export async function GET(request: NextRequest) {
  try {
    console.log('[v0] School requests GET called');
    
    const headersList = await headers();
    const token = headersList.get('x-platform-admin-token');

    console.log('[v0] Token check:', { tokenExists: !!token });

    if (!token) {
      console.log('[v0] No token provided - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the session token
    console.log('[v0] Verifying session token...');
    const session = await verifySession(token);
    console.log('[v0] Session verification result:', { sessionExists: !!session });
    
    if (!session) {
      console.log('[v0] Session verification failed - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = session.adminId;
    console.log('[v0] Admin ID extracted:', { adminId });

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    console.log('[v0] Query params:', { page, pageSize, status, search });

    console.log('[v0] Creating school requests query...');
    let query = querySchoolRequests().select('*', { count: 'exact' });

    if (status) {
      console.log('[v0] Adding status filter:', { status });
      query = query.eq('status', status);
    }

    if (search) {
      console.log('[v0] Adding search filter:', { search });
      query = query.or(
        `school_name.ilike.%${search}%,email.ilike.%${search}%,contact_person.ilike.%${search}%`
      );
    }

    query = query.order('submitted_at', { ascending: false });
    console.log('[v0] Query built successfully');

    console.log('[v0] Executing paginated query...');
    const { data, error, count } = await getPaginatedResults(query, page, pageSize);

    if (error) {
      console.error('[v0] Supabase query error:', { error, errorMessage: error?.message });
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    console.log('[v0] Query successful:', { dataLength: data?.length || 0, total: count });

    // Transform snake_case to camelCase for frontend
    const transformedData = (data || []).map((request: any) => ({
      id: request.id,
      schoolName: request.school_name,
      contactPerson: request.contact_person,
      email: request.email,
      phone: request.phone,
      location: request.location,
      requestedPlan: request.requested_plan || 'basic',
      status: request.status,
      notes: request.notes,
      submittedAt: request.submitted_at,
      reviewedAt: request.reviewed_at,
      rejectionReason: request.rejection_reason,
      rejectionNotes: request.rejection_notes,
    }));

    console.log('[v0] Data transformed:', { transformedCount: transformedData.length });

    return NextResponse.json({
      success: true,
      data: transformedData,
      total: count || 0,
      page,
      pageSize,
      hasMore: page * pageSize < (count || 0),
    });
  } catch (error) {
    console.error('[v0] Error in school requests GET:', { 
      error, 
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/platform-admin/school-requests - Approve or reject a school request
export async function POST(request: NextRequest) {
  try {
    console.log('[v0] School requests POST called');
    
    const headersList = await headers();
    const token = headersList.get('x-platform-admin-token');

    console.log('[v0] Token check:', { tokenExists: !!token });

    if (!token) {
      console.log('[v0] No token provided - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the session token
    console.log('[v0] Verifying session token...');
    const session = await verifySession(token);
    console.log('[v0] Session verification result:', { sessionExists: !!session });
    
    if (!session) {
      console.log('[v0] Session verification failed - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = session.adminId;
    console.log('[v0] Admin ID extracted:', { adminId });

    console.log('[v0] Parsing request body...');
    const body = await request.json();
    const { requestId, action, rejectionReason, rejectionNotes } = body;

    console.log('[v0] Request body parsed:', { requestId, action, rejectionReason: !!rejectionReason, rejectionNotes: !!rejectionNotes });

    if (!requestId || !action) {
      console.log('[v0] Missing required fields');
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    // Get the school request
    console.log('[v0] Fetching school request:', { requestId });
    const { data: schoolRequest, error: fetchError } = await querySchoolRequests()
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      console.error('[v0] Failed to fetch school request:', { fetchError, requestId });
      return NextResponse.json({ error: 'School request not found' }, { status: 404 });
    }

    console.log('[v0] School request fetched:', { schoolName: schoolRequest.school_name });

    if (action === 'reject') {
      console.log('[v0] Rejecting school request:', { requestId });
      
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
        console.error('[v0] Failed to reject school request:', { updateError, requestId });
        return NextResponse.json({ error: formatSupabaseError(updateError) }, { status: 400 });
      }

      console.log('[v0] School request rejected successfully');
      
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
      console.log('[v0] Approving school request:', { requestId, schoolId: schoolRequest.school_id });
      
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
        console.error('[v0] Failed to approve school request:', { updateError, requestId });
        return NextResponse.json({ error: formatSupabaseError(updateError) }, { status: 400 });
      }

      console.log('[v0] School request approved in database');

      // Get school admin email to send approval notification
      console.log('[v0] Fetching school admin profile for email...');
      const { data: adminProfile } = await queryProfiles()
        .select('email')
        .eq('school_id', schoolRequest.school_id)
        .eq('system_role', 'Admin')
        .single();

      console.log('[v0] Admin profile fetched:', { emailExists: !!adminProfile?.email });

      if (adminProfile?.email) {
        console.log('[v0] Sending approval email to:', { email: adminProfile.email });
        const emailHtml = getSchoolApprovalNotificationTemplate(
          schoolRequest.school_name,
          adminProfile.email
        );
        const emailResult = await sendEmail({
          to: adminProfile.email,
          subject: `Your school has been approved - ${schoolRequest.school_name}`,
          html: emailHtml,
        });

        if (!emailResult.success) {
          console.error('[v0] Approval email send failed:', { error: emailResult.error });
        } else {
          console.log('[v0] School approval email sent successfully');
        }
      }

      // Trigger auto-provisioning for the school
      if (schoolRequest.school_id) {
        try {
          console.log('[v0] Triggering auto-provisioning for school:', { schoolId: schoolRequest.school_id });
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const provisionResponse = await fetch(`${baseUrl}/api/school/setup/provision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: schoolRequest.school_id }),
          });
          console.log('[v0] Provisioning response:', { status: provisionResponse.status });
        } catch (provisionError) {
          console.error('[v0] Auto-provisioning error:', { error: provisionError instanceof Error ? provisionError.message : String(provisionError) });
        }
      }

      console.log('[v0] Recording audit log for approval');
      
      await queryAuditLogs().insert({
        actor_id: adminId,
        action: 'school_request_approved',
        target_type: 'school_request',
        target_id: requestId,
        target_name: schoolRequest.school_name,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

      console.log('[v0] School request approval completed successfully');

      return NextResponse.json({
        success: true,
        message: 'School request approved and approval email sent',
        data: updated,
      });
    }

    console.log('[v0] Invalid action provided:', { action });
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[v0] Error processing school request:', { 
      error, 
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
