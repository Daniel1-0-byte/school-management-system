import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/subjects
 * Fetch subjects for a specific stream (class)
 * Subjects are linked to streams via school_class_stream_subjects table
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

    // Fetch subjects assigned to this stream via school_class_stream_subjects
    const { data: streamSubjects, error: streamSubjectsError } = await getServerSupabaseClient()
      .from('school_class_stream_subjects')
      .select(`
        id,
        is_core,
        system_subjects:system_subject_id (
          id,
          name,
          code,
          short_name
        )
      `)
      .eq('stream_id', streamId)
      .order('is_core', { ascending: false })
      .order('system_subjects(name)', { foreignTable: 'system_subjects' });

    if (streamSubjectsError) {
      console.error('[v0] Stream subjects GET error:', streamSubjectsError);
      return NextResponse.json({ error: formatSupabaseError(streamSubjectsError) }, { status: 400 });
    }

    // Transform response to flatten subject data
    const subjects = (streamSubjects || [])
      .filter((item: any) => item.system_subjects)
      .map((item: any) => ({
        id: item.system_subjects.id,
        name: item.system_subjects.name,
        code: item.system_subjects.code,
        short_name: item.system_subjects.short_name,
        is_core: item.is_core,
      }));

    return NextResponse.json({ data: subjects || [] });
  } catch (error) {
    console.error('[v0] Subjects GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
