import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

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

    let resolvedClassId = classIdParam;

    // If stream_id is provided, resolve to school_class_id
    if (streamId) {
      const { data: stream, error: streamError } = await getServerSupabaseClient()
        .from('school_class_streams')
        .select('school_class_id')
        .eq('id', streamId)
        .eq('school_id', schoolId)
        .single();

      if (streamError) {
        console.error('[v0] Stream lookup error:', streamError);
        return NextResponse.json(
          { error: 'Stream not found or does not belong to this school' },
          { status: 404 }
        );
      }

      if (!stream?.school_class_id) {
        return NextResponse.json(
          { error: 'Stream does not have a class assigned' },
          { status: 400 }
        );
      }

      resolvedClassId = stream.school_class_id;
    }

    // Fetch subjects for this class via system_class_subjects junction table
    const supabaseQuery = getServerSupabaseClient()
      .from('system_class_subjects')
      .select('id, subject_id, subject_order, system_subjects(id, name, code)')
      .eq('class_id', resolvedClassId)
      .order('subject_order');

    const { data, error } = await supabaseQuery;

    if (error) {
      console.error('[v0] Class subjects GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Extract subjects from the system_class_subjects junction table
    const subjects = (data || [])
      .map((item: any) => {
        const subject = item.system_subjects;
        return {
          id: subject?.id,
          name: subject?.name,
          code: subject?.code,
        };
      })
      .filter((subject: any) => subject.id !== null && subject.id !== undefined);

    return NextResponse.json({ data: subjects || [] });
  } catch (error) {
    console.error('[v0] Subjects GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
