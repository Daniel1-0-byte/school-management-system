import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryClasses, getPaginatedResults, formatSupabaseError } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

const classSchema = z.object({
  name: z.string().min(1, 'Class name required'),
  section: z.string().min(1, 'Section required'),
  teacher_id: z.string().uuid().optional(),
  room_number: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  academic_year_id: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('pageSize') || '20');
    const search = request.nextUrl.searchParams.get('search') || '';
    const schoolId = getSchoolIdFromRequest(request);

    // Validate school_id access
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

    let query = queryClasses()
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId);

    if (search) {
      query = query.or(`name.ilike.%${search}%,section.ilike.%${search}%`);
    }

    query = query.order('name', { ascending: true });

    const { data, error, count } = await getPaginatedResults(query, page, pageSize);

    if (error) {
      console.error('[v0] Classes GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[v0] Classes GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = classSchema.parse(body);
    const schoolId = getSchoolIdFromRequest(request);

    // Validate school_id access
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

    const { data, error } = await queryClasses()
      .insert({
        ...validatedData,
        school_id: schoolId,
      })
      .select()
      .single();

    if (error) {
      console.error('[v0] Classes POST error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('[v0] Classes POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
  }
}
