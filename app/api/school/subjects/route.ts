import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/subjects
 * Fetch all subjects for a given stream
 * Filters by stream_id query parameter
 * Returns subjects with student enrollment count
 */
export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    const streamId = request.nextUrl.searchParams.get('stream_id');

    if (typeof schoolId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    if (!streamId) {
      return NextResponse.json(
        { error: 'stream_id parameter is required' },
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

    // Fetch subjects assigned to this stream via school_class_stream_subjects
    const { data: streamSubjects, error: streamSubjectsError } = await getServerSupabaseClient()
      .from('school_class_stream_subjects')
      .select(`
        id,
        subject_id,
        subjects:subject_id (
          id,
          name,
          code,
          description
        )
      `)
      .eq('school_class_stream_id', streamId);

    if (streamSubjectsError) {
      console.error('[v0] Stream subjects GET error:', streamSubjectsError);
      return NextResponse.json({ error: formatSupabaseError(streamSubjectsError) }, { status: 400 });
    }

    // Count enrolled students for each subject
    const { data: students, error: studentsError } = await getServerSupabaseClient()
      .from('students')
      .select('id, stream_id')
      .eq('stream_id', streamId);

    if (studentsError) {
      console.error('[v0] Students count error:', studentsError);
      // Continue anyway - just won't have student count
    }

    const studentCount = students?.length || 0;

    // Transform response to flatten subject data
    const transformedData = (streamSubjects || [])
      .filter((item: any) => item.subjects)
      .map((item: any) => ({
        id: item.subject_id,
        name: item.subjects.name,
        code: item.subjects.code,
        description: item.subjects.description,
        student_count: studentCount,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json({ data: transformedData || [] });
  } catch (error) {
    console.error('[v0] Subjects GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
