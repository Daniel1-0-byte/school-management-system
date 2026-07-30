import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, queryTerms, getServerSupabaseClient } from '@/lib/supabase';
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

    // Verify academic year belongs to this school
    const { data: academicYear, error: yearError } = await getServerSupabaseClient()
      .from('academic_years')
      .select('id')
      .eq('id', academicYearId)
      .eq('school_id', schoolId)
      .single();

    if (yearError || !academicYear) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 });
    }

    // Fetch terms for the academic year
    const { data: terms, error: termsError } = await queryTerms()
      .select('id, academic_year_id, type, start_date, end_date, report_card_deadline, created_at, updated_at')
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

/**
 * POST /api/school/terms
 * Create a new term
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
    const { academic_year_id, type, start_date, end_date, report_card_deadline } = body;

    // Validation
    if (!academic_year_id || !type || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: 'Term end date must be after start date' }, { status: 400 });
    }

    if (report_card_deadline && new Date(report_card_deadline) <= new Date(end_date)) {
      return NextResponse.json({ error: 'Report card deadline must be after term end date' }, { status: 400 });
    }

    const client = getServerSupabaseClient();

    // Verify academic year belongs to this school
    const { data: academicYear, error: yearError } = await client
      .from('academic_years')
      .select('start_date, end_date')
      .eq('id', academic_year_id)
      .eq('school_id', schoolId)
      .single();

    if (yearError || !academicYear) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 });
    }

    // Validate term dates fall within academic year
    if (new Date(start_date) < new Date(academicYear.start_date)) {
      return NextResponse.json({ error: 'Term start date must be after academic year start' }, { status: 400 });
    }

    if (new Date(end_date) > new Date(academicYear.end_date)) {
      return NextResponse.json({ error: 'Term end date must be before academic year end' }, { status: 400 });
    }

    // Check for overlapping terms
    const { data: overlappingTerms } = await client
      .from('terms')
      .select('id')
      .eq('academic_year_id', academic_year_id)
      .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`);

    if (overlappingTerms && overlappingTerms.length > 0) {
      return NextResponse.json({ error: 'Term overlaps with existing terms' }, { status: 400 });
    }

    // Create term
    const { data, error } = await client
      .from('terms')
      .insert({
        academic_year_id,
        type,
        start_date,
        end_date,
        report_card_deadline: report_card_deadline || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[v0] Term POST error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('[v0] Term POST error:', error);
    return NextResponse.json({ error: 'Failed to create term' }, { status: 500 });
  }
}
