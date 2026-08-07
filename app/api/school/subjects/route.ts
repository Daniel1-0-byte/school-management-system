import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';
import { fetchClassSubjects, fetchSubjectsForStream } from '@/lib/class-subjects-utils';

/**
 * GET /api/school/subjects
 * Fetch subjects for a specific class using the class_subjects junction table
 * Query parameters: class_id OR stream_id (one required)
 * If stream_id is provided, resolves to class_id via school_class_streams table
 */
export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    const classIdParam = request.nextUrl.searchParams.get('class_id');
    const streamId = request.nextUrl.searchParams.get('stream_id');

    if (typeof schoolId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    if (!classIdParam && !streamId) {
      return NextResponse.json(
        { error: 'class_id or stream_id parameter is required' },
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

    const supabase = getServerSupabaseClient();
    let subjects;

    try {
      if (streamId) {
        ({ subjects } = await fetchSubjectsForStream(supabase, streamId, schoolId));
      } else {
        subjects = await fetchClassSubjects(supabase, classIdParam as string, schoolId);
      }
    } catch (error) {
      console.error('[v0] Class subjects GET error:', error);
      return NextResponse.json(
        { error: formatSupabaseError(error) },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: subjects });
  } catch (error) {
    console.error('[v0] Subjects GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
