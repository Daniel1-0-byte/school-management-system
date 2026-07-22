import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryProfiles, getPaginatedResults, formatSupabaseError } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

const staffSchema = z.object({
  first_name: z.string().min(1, 'First name required'),
  last_name: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  phone_number: z.string().optional(),
  system_role: z.enum(['Teacher', 'Admin', 'Accountant', 'BusCoordinator']),
  department: z.string().optional(),
  join_date: z.string().date(),
});

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const role = request.nextUrl.searchParams.get('role') || '';
    const schoolId = getSchoolIdFromRequest(request);
    const status = request.nextUrl.searchParams.get('status') || 'active';

    // Validate school_id access
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

    let query = queryProfiles()
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)
      .neq('system_role', 'Parent');

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    if (role) {
      query = query.eq('system_role', role);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await getPaginatedResults(query, page, pageSize);

    if (error) {
      console.error('[v0] Staff GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[v0] Staff GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = staffSchema.parse(body);
    const schoolId = getSchoolIdFromRequest(request);

    // Validate school_id access
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

    const { data, error } = await queryProfiles()
      .insert({
        ...validatedData,
        school_id: schoolId,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('[v0] Staff POST error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[v0] Staff POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create staff' }, { status: 500 });
  }
}
