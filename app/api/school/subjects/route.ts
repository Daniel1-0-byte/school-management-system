import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/subjects
 * Fetch all subjects for the authenticated school
 * Subjects belong to a school, not to streams
 * Streams are used only for assessment and grade entry context
 */
export async function GET(request: NextRequest) {
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

    // Fetch all subjects for this school
    const { data: subjects, error: subjectsError } = await getServerSupabaseClient()
      .from('subjects')
      .select('id, name, code')
      .eq('school_id', schoolId)
      .order('name');

    if (subjectsError) {
      console.error('[v0] Subjects GET error:', subjectsError);
      return NextResponse.json({ error: formatSupabaseError(subjectsError) }, { status: 400 });
    }

    // Return subjects sorted by name
    return NextResponse.json({ data: subjects || [] });
  } catch (error) {
    console.error('[v0] Subjects GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}
