import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/platform-admin/schools - Fetch all schools with pagination, search, and filters
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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let query = supabase.from('schools').select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,principal_email.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply sorting and pagination
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    const start = (page - 1) * pageSize;
    query = query.range(start, start + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[v0] Failed to fetch schools:', error);
      return NextResponse.json(
        { error: 'Failed to fetch schools' },
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
    console.error('[v0] Error fetching schools:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/platform-admin/schools - Create a new school
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
    const adminEmail = headersList.get('x-admin-email');

    if (!adminId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      address,
      phone,
      email,
      website,
      principalName,
      principalEmail,
      studentCapacity,
      foundedYear,
    } = body;

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: 'School name and email are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create the school
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name,
        address,
        phone,
        email,
        website,
        principal_name: principalName,
        principal_email: principalEmail,
        student_capacity: studentCapacity,
        founded_year: foundedYear,
        status: 'active',
        slug: name.toLowerCase().replace(/\s+/g, '-'),
      })
      .select()
      .single();

    if (schoolError) {
      console.error('[v0] Failed to create school:', schoolError);
      return NextResponse.json(
        { error: schoolError.message },
        { status: 400 }
      );
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      actor_id: adminId,
      action: 'school_created',
      target_type: 'school',
      target_id: schoolData.id,
      target_name: schoolData.name,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      data: schoolData,
    });

  } catch (error) {
    console.error('[v0] Error creating school:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
