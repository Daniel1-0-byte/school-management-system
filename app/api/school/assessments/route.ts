import { NextRequest, NextResponse } from 'next/server';
import { queryAssessments, formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';
import { validateAssessment } from '@/lib/schemas';

/**
 * GET /api/school/assessments
 * Fetch assessments for the authenticated user's school
 * Supports filtering by: academic_year_id, term_id, stream_id, subject_id, status
 */
export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    // Get query parameters for filtering
    const academicYearId = request.nextUrl.searchParams.get('academic_year_id');
    const termId = request.nextUrl.searchParams.get('term_id');
    const streamId = request.nextUrl.searchParams.get('stream_id');
    const subjectId = request.nextUrl.searchParams.get('subject_id');
    const status = request.nextUrl.searchParams.get('status');

    // Build query
    let query = queryAssessments()
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    // Apply filters
    if (academicYearId) query = query.eq('academic_year_id', academicYearId);
    if (termId) query = query.eq('term_id', termId);
    if (streamId) query = query.eq('stream_id', streamId);
    if (subjectId) query = query.eq('subject_id', subjectId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      console.error('[v0] Assessments GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Enrich each assessment with progress count
    const enrichedData = await Promise.all(
      (data || []).map(async (assessment: any) => {
        const { count } = await getServerSupabaseClient()
          .from('grade_entries')
          .select('*', { count: 'exact', head: true })
          .eq('assessment_id', assessment.id)
          .eq('school_id', schoolId)
          .not('class_score', 'is', null)
          .not('exam_score', 'is', null);

        return {
          ...assessment,
          progress_count: count || 0,
        };
      })
    );

    return NextResponse.json({ data: enrichedData || [] });
  } catch (error) {
    console.error('[v0] Assessments GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
  }
}

/**
 * POST /api/school/assessments
 * Create a new assessment
 */
export async function POST(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid school access' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = validateAssessment(body);

    if (!validatedData) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Resolve school_class_id from stream
    const { data: stream, error: streamError } = await getServerSupabaseClient()
      .from('school_class_streams')
      .select('school_class_id')
      .eq('id', validatedData.stream_id)
      .eq('school_id', schoolId)
      .single();

    if (streamError || !stream?.school_class_id) {
      return NextResponse.json({ error: 'Stream does not have a class assigned' }, { status: 400 });
    }

    // Get enrolled student count for this class
    const { count: studentCount } = await getServerSupabaseClient()
      .from('student_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', stream.school_class_id)
      .eq('school_id', schoolId)
      .eq('status', 'active');

    const { data, error } = await getServerSupabaseClient()
      .from('assessments')
      .insert({
        school_id: schoolId,
        academic_year_id: validatedData.academic_year_id,
        stream_id: validatedData.stream_id,
        subject_id: validatedData.subject_id,
        name: validatedData.name,
        description: validatedData.description,
        assessment_type: validatedData.assessment_type,
        max_marks: validatedData.max_marks,
        status: 'not_started',
        total_students: studentCount || 0,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[v0] Assessment POST error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('[v0] Assessment POST error:', error);
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
  }
}
