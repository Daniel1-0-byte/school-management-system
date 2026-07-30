import { NextRequest, NextResponse } from 'next/server';
import { formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { getSchoolIdFromRequest, validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * GET /api/school/academic-years
 * Fetch all academic years with terms count for the authenticated user's school
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

    const { data, error } = await getServerSupabaseClient()
      .from('academic_years')
      .select('id, year, start_date, end_date, is_active, created_at, updated_at')
      .eq('school_id', schoolId)
      .order('year', { ascending: false });

    if (error) {
      console.error('[v0] Academic years GET error:', error);
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 400 });
    }

    // Fetch terms count for each year
    const yearsWithTermsCount = await Promise.all(
      (data || []).map(async (year: any) => {
        const { count } = await getServerSupabaseClient()
          .from('terms')
          .select('*', { count: 'exact', head: true })
          .eq('academic_year_id', year.id);

        return {
          ...year,
          terms_count: count || 0,
        };
      })
    );

    return NextResponse.json({ data: yearsWithTermsCount || [] });
  } catch (error) {
    console.error('[v0] Academic years GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch academic years' }, { status: 500 });
  }
}

/**
 * POST /api/school/academic-years
 * Create a new academic year and auto-create 3 terms
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
    const { year, start_date, end_date, is_active } = body;

    // Validation
    if (!year || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    const client = getServerSupabaseClient();

    // If making active, deactivate all other years for this school
    if (is_active) {
      await client
        .from('academic_years')
        .update({ is_active: false })
        .eq('school_id', schoolId);
    }

    // Create academic year
    const { data: academicYear, error: yearError } = await client
      .from('academic_years')
      .insert({
        school_id: schoolId,
        year,
        start_date,
        end_date,
        is_active: is_active || false,
      })
      .select()
      .single();

    if (yearError) {
      console.error('[v0] Academic year creation error:', yearError);
      return NextResponse.json({ error: formatSupabaseError(yearError) }, { status: 400 });
    }

    // Auto-create 3 terms with evenly divided dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysPerTerm = totalDays / 3;

    const terms = [
      {
        academic_year_id: academicYear.id,
        type: 'term_1',
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date(startDate.getTime() + daysPerTerm * (1000 * 60 * 60 * 24))
          .toISOString()
          .split('T')[0],
        report_card_deadline: new Date(startDate.getTime() + daysPerTerm * (1000 * 60 * 60 * 24) + 7 * (1000 * 60 * 60 * 24))
          .toISOString()
          .split('T')[0],
      },
      {
        academic_year_id: academicYear.id,
        type: 'term_2',
        start_date: new Date(startDate.getTime() + daysPerTerm * (1000 * 60 * 60 * 24))
          .toISOString()
          .split('T')[0],
        end_date: new Date(startDate.getTime() + daysPerTerm * 2 * (1000 * 60 * 60 * 24))
          .toISOString()
          .split('T')[0],
        report_card_deadline: new Date(startDate.getTime() + daysPerTerm * 2 * (1000 * 60 * 60 * 24) + 7 * (1000 * 60 * 60 * 24))
          .toISOString()
          .split('T')[0],
      },
      {
        academic_year_id: academicYear.id,
        type: 'term_3',
        start_date: new Date(startDate.getTime() + daysPerTerm * 2 * (1000 * 60 * 60 * 24))
          .toISOString()
          .split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        report_card_deadline: new Date(endDate.getTime() + 7 * (1000 * 60 * 60 * 24))
          .toISOString()
          .split('T')[0],
      },
    ];

    await client.from('terms').insert(terms);

    return NextResponse.json({ data: academicYear }, { status: 201 });
  } catch (error) {
    console.error('[v0] Academic year POST error:', error);
    return NextResponse.json({ error: 'Failed to create academic year' }, { status: 500 });
  }
}
