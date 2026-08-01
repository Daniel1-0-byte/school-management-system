import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/subjects
 * Fetch subjects for a specific class using the class_subjects junction table
 * Query parameters: class_id (required)
 */
export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    const classId = request.nextUrl.searchParams.get('class_id');

    if (typeof schoolId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    if (!classId) {
      return NextResponse.json(
        { error: 'class_id parameter is required' },
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

    // Fetch subjects for this class via class_subjects junction table
    const { data, error } = await getServerSupabaseClient()
      .from('class_subjects')
      .select('subject:subjects(id, name, code)')
      .eq('class_id', classId)
      .eq('school_id', schoolId);

    if (error) {
      console.error('[v0] Class subjects GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Extract subjects from the junction table results
    const subjects = (data || [])
      .map((item: any) => item.subject)
      .filter((subject: any) => subject !== null);

    return NextResponse.json({ data: subjects || [] });
  } catch (error) {
    console.error('[v0] Subjects GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
