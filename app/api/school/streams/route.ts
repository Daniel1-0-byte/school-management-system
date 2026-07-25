import { NextRequest, NextResponse } from 'next/server';
import { querySchoolClassStreams, formatSupabaseError } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/streams
 * Fetch all class streams for a school (Phase 3)
 * Used during student admission to select stream enrollment
 */
export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    const activeOnly = request.nextUrl.searchParams.get('activeOnly') === 'true';

    if (typeof schoolId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

    let query = querySchoolClassStreams()
      .select('id, school_id, school_class_id, name, capacity, status, class_teacher_id, created_at, updated_at, school_classes:school_class_id(id, name, level)')
      .eq('school_id', schoolId);

    if (activeOnly) {
      query = query.eq('status', 'active');
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('[v0] Streams GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({
      data: data || [],
    });
  } catch (error) {
    console.error('[v0] Streams GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streams' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/school/streams
 * Create a new class stream for a school
 */
export async function POST(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, school_class_id, capacity } = body;

    if (!name || !school_class_id) {
      return NextResponse.json(
        { error: 'Stream name and class are required' },
        { status: 400 }
      );
    }

    const { data, error } = await querySchoolClassStreams()
      .insert({
        school_id: schoolId,
        school_class_id,
        name,
        capacity: capacity || null,
        status: 'active',
      })
      .select('id, school_id, school_class_id, name, capacity, status, class_teacher_id, created_at, updated_at, school_classes:school_class_id(id, name, level)')
      .single();

    if (error) {
      console.error('[v0] Stream POST error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('[v0] Stream POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create stream' },
      { status: 500 }
    );
  }
}
