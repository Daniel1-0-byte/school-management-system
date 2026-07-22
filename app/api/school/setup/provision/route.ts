import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabaseClient, formatSupabaseError } from '@/lib/supabase';
import { validateSchoolIdAccess } from '@/lib/auth-utils';

/**
 * Auto-provision a school with default data when it's approved
 * This creates:
 * - Default academic years (current and next)
 * - Default terms for each academic year
 * - Default class structure
 */
export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await request.json();

    // Validate school_id access
    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();

    // Check if school exists
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Create current academic year
    const currentYear = new Date().getFullYear();
    const { data: academicYear, error: yearError } = await supabase
      .from('academic_years')
      .insert({
        school_id: schoolId,
        year: currentYear,
        start_date: new Date(`${currentYear}-01-15`).toISOString(),
        end_date: new Date(`${currentYear + 1}-12-15`).toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (yearError) {
      console.error('[v0] Academic year creation error:', yearError);
      return NextResponse.json({ error: formatSupabaseError(yearError) }, { status: 400 });
    }

    // Create default terms
    const terms = [
      {
        academic_year_id: academicYear.id,
        school_id: schoolId,
        name: 'Term 1',
        start_date: new Date(`${currentYear}-01-15`).toISOString(),
        end_date: new Date(`${currentYear}-04-15`).toISOString(),
      },
      {
        academic_year_id: academicYear.id,
        school_id: schoolId,
        name: 'Term 2',
        start_date: new Date(`${currentYear}-05-01`).toISOString(),
        end_date: new Date(`${currentYear}-08-15`).toISOString(),
      },
      {
        academic_year_id: academicYear.id,
        school_id: schoolId,
        name: 'Term 3',
        start_date: new Date(`${currentYear}-09-01`).toISOString(),
        end_date: new Date(`${currentYear}-12-15`).toISOString(),
      },
    ];

    const { error: termsError } = await supabase
      .from('terms')
      .insert(terms);

    if (termsError) {
      console.error('[v0] Terms creation error:', termsError);
      return NextResponse.json({ error: formatSupabaseError(termsError) }, { status: 400 });
    }

    // Create default class structure (grades 1-12)
    const defaultClasses = Array.from({ length: 12 }, (_, i) => ({
      school_id: schoolId,
      name: `Grade ${i + 1}`,
      section: 'A',
      capacity: 40,
    }));

    const { error: classesError } = await supabase
      .from('school_classes')
      .insert(defaultClasses);

    if (classesError) {
      console.error('[v0] Classes creation error:', classesError);
      return NextResponse.json({ error: formatSupabaseError(classesError) }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'School provisioned successfully',
      data: {
        schoolId,
        academicYearId: academicYear.id,
        academicYear: currentYear,
        termsCreated: 3,
        classesCreated: 12,
      },
    });
  } catch (error) {
    console.error('[v0] Provisioning error:', error);
    return NextResponse.json({ error: 'Provisioning failed' }, { status: 500 });
  }
}
