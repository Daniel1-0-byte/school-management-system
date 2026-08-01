import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/subjects
 * Fetch subjects available for a specific stream (class)
 * Returns subjects that have been assigned to the stream through assessments
 * Query parameter: stream_id (required)
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

    // Fetch unique subjects that exist in assessments for this stream
    const { data: subjectIds, error: subjectIdsError } = await getServerSupabaseClient()
      .from('assessments')
      .select('subject_id')
      .eq('school_id', schoolId)
      .eq('stream_id', streamId)
      .not('subject_id', 'is', null);

    if (subjectIdsError) {
      console.error('[v0] Assessment subjects GET error:', subjectIdsError);
      return NextResponse.json({ error: formatSupabaseError(subjectIdsError) }, { status: 400 });
    }

    // Get unique subject IDs
    const uniqueSubjectIds = Array.from(
      new Set((subjectIds || []).map((a: any) => a.subject_id).filter(Boolean))
    );

    if (uniqueSubjectIds.length === 0) {
      // No assessments yet, return all school subjects
      const { data: subjects, error: subjectsError } = await getServerSupabaseClient()
        .from('subjects')
        .select('id, name, code')
        .eq('school_id', schoolId)
        .order('name');

      if (subjectsError) {
        console.error('[v0] Subjects GET error:', subjectsError);
        return NextResponse.json({ error: formatSupabaseError(subjectsError) }, { status: 400 });
      }

      return NextResponse.json({ data: subjects || [] });
    }

    // Fetch the full subject details for these IDs
    const { data: subjects, error: subjectsError } = await getServerSupabaseClient()
      .from('subjects')
      .select('id, name, code')
      .in('id', uniqueSubjectIds)
      .order('name');

    if (subjectsError) {
      console.error('[v0] Subjects GET error:', subjectsError);
      return NextResponse.json({ error: formatSupabaseError(subjectsError) }, { status: 400 });
    }

    return NextResponse.json({ data: subjects || [] });
  } catch (error) {
    console.error('[v0] Subjects GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
