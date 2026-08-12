import { NextRequest, NextResponse } from 'next/server';
import { querySchoolClassStreams, formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getAuthenticatedProfile, getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/streams
 * Fetch all class streams for a school (Phase 3)
 * Used during student admission to select stream enrollment
 */
export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    const activeOnly = request.nextUrl.searchParams.get('activeOnly') === 'true';
    const academicYearId = request.nextUrl.searchParams.get('academic_year_id');

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

    const { profile, error: profileAccessError } = await getAuthenticatedProfile(request);
    if (profileAccessError || !profile || profile.school_id !== schoolId || profile.status !== 'active') {
      return NextResponse.json({ error: profileAccessError || 'Forbidden' }, { status: profileAccessError ? 401 : 403 });
    }

    // Fetch streams
    let query = querySchoolClassStreams()
      .select('id, school_id, school_class_id, academic_year_id, name, capacity, status, class_teacher_id, created_at, updated_at')
      .eq('school_id', schoolId);

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }

    if (activeOnly) {
      query = query.eq('status', 'active');
    }

    query = query.order('name', { ascending: true });

    const { data: streams, error: streamsError } = await query;

    if (streamsError) {
      console.error('[v0] Streams GET error:', streamsError);
      return NextResponse.json({ error: formatSupabaseError(streamsError) }, { status: 400 });
    }

    // If no streams, return empty
    if (!streams || streams.length === 0) {
      return NextResponse.json({ data: [] });
    }

    let visibleStreams = streams;
    if (profile.system_role === 'Teacher') {
      const { data: assignments, error: assignmentError } = await getServerSupabaseClient()
        .from('teacher_assignments')
        .select('class_id')
        .eq('school_id', schoolId)
        .eq('teacher_id', profile.id)
        .eq('academic_year_id', academicYearId || streams[0].academic_year_id);

      if (assignmentError) {
        console.error('[v0] Teacher stream assignment lookup error:', assignmentError);
        return NextResponse.json({ error: 'Failed to resolve teacher assignments' }, { status: 500 });
      }

      const assignedClassIds = new Set((assignments || []).map((assignment: { class_id: string }) => assignment.class_id));
      visibleStreams = streams.filter((stream: any) => assignedClassIds.has(stream.school_class_id));
    }

    if (visibleStreams.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get unique school_class_ids from streams
    const classIds = [...new Set(visibleStreams.map((s: any) => s.school_class_id).filter(Boolean))];

    // Fetch school_classes data
    let classesData: any[] = [];
    if (classIds.length > 0) {
      const { data: classes, error: classesError } = await getServerSupabaseClient()
        .from('school_classes')
        .select('id, name, level')
        .in('id', classIds)
        .eq('school_id', schoolId);

      if (classesError) {
        console.error('[v0] School classes fetch error:', classesError);
        // Don't fail, just proceed without class data
      } else {
        classesData = classes || [];
      }
    }

    // Create a map of class_id -> class data for efficient lookup
    const classesMap = new Map();
    classesData.forEach((cls: any) => {
      classesMap.set(cls.id, cls);
    });

    // Fetch the primary active teacher for each class in this academic year.
    const { data: primaryAssignments, error: primaryAssignmentsError } = await getServerSupabaseClient()
      .from('teacher_assignments')
      .select('class_id, teacher_id')
      .in('class_id', classIds)
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId || visibleStreams[0].academic_year_id)
      .eq('is_primary_teacher', true)
      .is('end_date', null);

    if (primaryAssignmentsError) {
      console.error('[v0] Primary class teacher fetch error:', primaryAssignmentsError);
    }

    const teacherIds = [...new Set((primaryAssignments || []).map((assignment: { teacher_id: string }) => assignment.teacher_id).filter(Boolean))];
    const teachersMap = new Map<string, { id: string; first_name: string | null; last_name: string | null }>();
    if (teacherIds.length > 0) {
      const { data: teachers, error: teachersError } = await getServerSupabaseClient()
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', teacherIds)
        .eq('school_id', schoolId)
        .eq('system_role', 'Teacher')
        .eq('status', 'active');

      if (teachersError) {
        console.error('[v0] Primary teacher profile fetch error:', teachersError);
      } else {
        (teachers || []).forEach((teacher) => teachersMap.set(teacher.id, teacher));
      }
    }

    const primaryTeacherMap = new Map<string, { id: string; first_name: string | null; last_name: string | null }>();
    (primaryAssignments || []).forEach((assignment: { class_id: string; teacher_id: string }) => {
      const teacher = teachersMap.get(assignment.teacher_id);
      if (teacher && !primaryTeacherMap.has(assignment.class_id)) primaryTeacherMap.set(assignment.class_id, teacher);
    });

    // Merge streams with school_classes and the primary active teacher.
    const mergedData = visibleStreams.map((stream: any) => ({
      ...stream,
      school_classes: classesMap.get(stream.school_class_id) || null,
      primary_teacher: primaryTeacherMap.get(stream.school_class_id) || null,
    }));

    return NextResponse.json({
      data: mergedData,
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

    const { data: stream, error: insertError } = await querySchoolClassStreams()
      .insert({
        school_id: schoolId,
        school_class_id,
        name,
        capacity: capacity || null,
        status: 'active',
      })
      .select('id, school_id, school_class_id, academic_year_id, name, capacity, status, class_teacher_id, created_at, updated_at')
      .single();

    if (insertError) {
      console.error('[v0] Stream POST error:', insertError);
      return NextResponse.json({ error: formatSupabaseError(insertError) }, { status: 400 });
    }

    // Fetch the school_classes data separately
    let schoolClass = null;
    if (stream?.school_class_id) {
      const { data: classData } = await getServerSupabaseClient()
        .from('school_classes')
        .select('id, name, level')
        .eq('id', stream.school_class_id)
        .eq('school_id', schoolId)
        .single();
      schoolClass = classData;
    }

    const mergedStream = {
      ...stream,
      school_classes: schoolClass,
    };

    return NextResponse.json({ data: mergedStream }, { status: 201 });
  } catch (error) {
    console.error('[v0] Stream POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create stream' },
      { status: 500 }
    );
  }
}
