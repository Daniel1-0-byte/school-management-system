import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, queryTerms } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/terms
 * Fetch all terms for an academic year
 * Query params: academic_year_id (required)
 */
export async function GET(request: NextRequest) {
  try {
    const schoolId = await getSchoolIdFromRequest(request);
    const academicYearId = request.nextUrl.searchParams.get('academic_year_id');

    if (typeof schoolId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    if (!academicYearId) {
      return NextResponse.json(
        { error: 'academic_year_id parameter is required' },
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

    // Fetch terms for the academic year from public.terms table
    const { data: terms, error: termsError } = await queryTerms()
      .select('id, academic_year_id, type, start_date, end_date, report_card_deadline, created_at, updated_at')
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYearId)
      .order('start_date', { ascending: true });

    if (termsError) {
      console.error('[v0] Terms GET error:', termsError);
      return NextResponse.json({ error: formatSupabaseError(termsError) }, { status: 400 });
    }

    return NextResponse.json({ data: terms || [] });
  } catch (error) {
    console.error('[v0] Terms GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch terms' },
      { status: 500 }
    );
  }
}
