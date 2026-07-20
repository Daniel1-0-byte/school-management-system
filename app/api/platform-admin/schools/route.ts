import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { querySchools, getPaginatedResults, formatSupabaseError } from '@/lib/supabase';

// GET /api/platform-admin/schools - Fetch all schools with pagination, search, and filters
export async function GET(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    console.log('[v0][ADMIN-SCHOOLS] GET request started:', { adminId });

    if (!adminId) {
      console.error('[v0][ADMIN-SCHOOLS] No admin ID in headers');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    console.log('[v0][ADMIN-SCHOOLS] Query parameters:', { page, pageSize, search, status, sortBy, sortOrder });

    let query = querySchools().select('*', { count: 'exact' });

    if (search) {
      console.log('[v0][ADMIN-SCHOOLS] Applying search filter:', { search });
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,principal_email.ilike.%${search}%`
      );
    }

    if (status) {
      console.log('[v0][ADMIN-SCHOOLS] Applying status filter:', { status });
      query = query.eq('status', status);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    console.log('[v0][ADMIN-SCHOOLS] About to execute query');
    const { data, error, count } = await getPaginatedResults(query, page, pageSize);

    console.log('[v0][ADMIN-SCHOOLS] Query result:', {
      hasError: !!error,
      errorMessage: error?.message,
      dataCount: data?.length,
      totalCount: count,
    });

    if (error) {
      console.error('[v0][ADMIN-SCHOOLS] ❌ Failed to fetch schools:', {
        error: error.message,
        code: error.code,
        status: error.status,
        details: error.details,
      });
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    console.log('[v0][ADMIN-SCHOOLS] ✅ Successfully fetched schools');
    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      hasMore: page * pageSize < (count || 0),
    });
  } catch (error) {
    console.error('[v0][ADMIN-SCHOOLS] ❌ Unexpected error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/platform-admin/schools - Create a new school
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const adminId = headersList.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      address,
      city,
      state,
      postal_code,
      phone_number,
      email,
      website,
      principal_name,
      principal_email,
      established_year,
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'School name and email are required' },
        { status: 400 }
      );
    }

    const { data: schoolData, error: schoolError } = await querySchools()
      .insert({
        name,
        address,
        city,
        state,
        postal_code,
        phone_number,
        email,
        website,
        principal_name,
        principal_email,
        established_year,
        status: 'active',
        slug: name.toLowerCase().replace(/\s+/g, '-'),
      })
      .select()
      .single();

    if (schoolError) {
      console.error('[v0] Failed to create school:', schoolError);
      return NextResponse.json({ error: formatSupabaseError(schoolError) }, { status: 400 });
    }

    // Create audit log
    const { queryAuditLogs } = await import('@/lib/supabase');
    await queryAuditLogs().insert({
      actor_id: adminId,
      action: 'school_created',
      target_type: 'school',
      target_id: schoolData.id,
      target_name: schoolData.name,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, data: schoolData });
  } catch (error) {
    console.error('[v0] Error creating school:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
