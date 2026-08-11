import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSchoolIdFromRequest, validateSchoolIdAccess, requireRole } from '@/lib/auth-utils';
import { formatSupabaseError, getServerSupabaseClient } from '@/lib/supabase';
import { seedDefaultCurriculum } from '@/lib/seed-curriculum';
import { DEFAULT_CURRICULUM } from '@/lib/default-curriculum';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '@/lib/env';

export async function POST(_request: NextRequest) {
  const roleError = await requireRole(_request, ['Admin']);
  if (roleError) return roleError;
  try {
    const schoolId = await getSchoolIdFromRequest(_request);

    if (typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    const validation = await validateSchoolIdAccess(schoolId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid school access' },
        { status: 403 }
      );
    }

    const client = getServerSupabaseClient();
    const { data: academicYear, error: academicYearError } = await client
      .from('academic_years')
      .select('id, year, start_date')
      .eq('school_id', schoolId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (academicYearError) {
      console.error('[v0] Default classes academic year lookup error:', academicYearError);
      return NextResponse.json(
        { error: formatSupabaseError(academicYearError) },
        { status: 400 }
      );
    }

    if (!academicYear) {
      return NextResponse.json(
        { error: 'Create an academic year before loading default classes' },
        { status: 400 }
      );
    }

    const { count, error: classesError } = await client
      .from('school_classes')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('academic_year_id', academicYear.id);

    if (classesError) {
      console.error('[v0] Default classes existing-class lookup error:', classesError);
      return NextResponse.json(
        { error: formatSupabaseError(classesError) },
        { status: 400 }
      );
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Default classes can only be loaded when this academic year has no classes' },
        { status: 409 }
      );
    }

    const seedClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const result = await seedDefaultCurriculum(seedClient, schoolId, academicYear.id);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Some default classes could not be loaded',
          errors: result.errors,
          academicYear,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { academicYear, classCount: DEFAULT_CURRICULUM.length },
      message: 'Default classes and subjects loaded successfully',
    });
  } catch (error) {
    console.error('[v0] Default classes seed error:', error);
    return NextResponse.json(
      { error: 'Failed to load default classes' },
      { status: 500 }
    );
  }
}
